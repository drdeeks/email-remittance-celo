// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title EmailRemittanceVerifier
 * @notice Identity-gated escrow release for Email Remittance Pro.
 *         On Celo mainnet: verifies passport ZK proofs via Self Protocol IdentityVerificationHubV2.
 *         On Base / Monad: falls back to admin-signed attestations (Self Hub not yet deployed there).
 *
 * @dev Inherits SelfVerificationRoot when deployed on a chain where the hub is live.
 *      For chains without a hub (Base, Monad) deploy the standalone AdminVerifier variant below.
 *
 * Architecture:
 *   1. Sender calls `createEscrow(recipientEmailHash, token, amount, requireAuth)`
 *   2. Tokens/native sit in this contract keyed by escrowId
 *   3. Recipient claims via `claimWithProof(escrowId, proofPayload, userContextData)`
 *      - Self ZK proof is forwarded to Hub → Hub calls back `onVerificationSuccess`
 *      - Verified address is stored; escrow is released to recipient wallet
 *   4. Sender can `reclaimExpired` after `EXPIRY_PERIOD` if unclaimed
 *
 * Chains:
 *   - Celo mainnet  : hub = 0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
 *   - Celo testnet  : hub = 0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74
 *   - Base / Monad  : hub = address(0) → admin-attestation path
 */

// ── Minimal interfaces so we don't need npm in a raw .sol file ──────────────

interface IIdentityVerificationHubV2 {
    struct VerificationConfigV2 {
        bytes32 olderThan;          // packed age requirement
        bytes32 forbiddenCountries; // packed ISO-3166 bitfield
        bool    ofacEnabled;
    }
    function setVerificationConfigV2(VerificationConfigV2 calldata cfg) external returns (bytes32 configId);
    function verifySelfProof(bytes calldata proofPayload, bytes calldata userContextData) external;
}

interface ISelfVerificationRoot {
    struct GenericDiscloseOutputV2 {
        uint256 attestationId;
        uint256 userIdentifier;
        uint256 nullifier;
        uint256 olderThan;
        bool    ofac;
        uint256 forbiddenCountriesListPacked;
        // optional disclosed fields (non-zero if disclosed)
        bytes32 issuingState;
        bytes32 name;
        bytes32 idNumber;
        bytes32 nationality;
        bytes32 dateOfBirth;
        bytes32 gender;
        bytes32 expiryDate;
    }
}

// ── IERC20 minimal ────────────────────────────────────────────────────────────

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// ── ReentrancyGuard (inline, no OZ dep required for raw deploy) ──────────────

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

// ── Ownable (inline) ─────────────────────────────────────────────────────────

abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        require(initialOwner != address(0), "Ownable: zero address");
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function owner() public view returns (address) { return _owner; }

    modifier onlyOwner() {
        require(msg.sender == _owner, "Ownable: caller is not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EmailRemittanceVerifier
// ═══════════════════════════════════════════════════════════════════════════════

contract EmailRemittanceVerifier is ReentrancyGuard, Ownable {

    // ── Constants ────────────────────────────────────────────���───────────────

    uint256 public constant EXPIRY_PERIOD   = 30 days;
    uint256 public constant MAX_FEE_BPS     = 500;   // 5% hard cap
    address public constant NATIVE_TOKEN    = address(0); // sentinel for ETH/CELO/MON

    // ── Self Protocol ─────────────────────────────────────────────────────────

    /// @notice Hub address. address(0) on chains where Self is not deployed.
    IIdentityVerificationHubV2 public immutable selfHub;

    /// @notice Whether this chain has a live Self hub.
    bool public immutable selfEnabled;

    /// @notice Verification config ID registered with the hub on construction.
    bytes32 public verificationConfigId;

    /// @notice scope seed used to compute the Self proof scope. Must match frontend.
    string  public constant SCOPE_SEED = "email-remittance";

    // ── Escrow storage ────────────────────────────────────────────────────────

    enum EscrowStatus { PENDING, CLAIMED, RECLAIMED, EXPIRED }

    struct Escrow {
        address sender;
        address token;          // address(0) = native
        uint256 amount;         // gross amount deposited
        uint256 fee;            // protocol fee (deducted on claim)
        bytes32 recipientHash;  // keccak256(email) — off-chain linkage
        bytes32 claimToken;     // keccak256(secret) — presented to claim
        bool    requireAuth;    // if true, Self ZK proof required to claim
        uint40  expiresAt;
        EscrowStatus status;
        address claimedBy;      // set on successful claim
    }

    /// @dev escrowId → Escrow
    mapping(bytes32 => Escrow) public escrows;

    /// @dev Self nullifier → used (replay protection)
    mapping(uint256 => bool) public usedNullifiers;

    /// @dev claimToken hash → escrowId (for fast lookup from backend)
    mapping(bytes32 => bytes32) public claimTokenIndex;

    // ── Fee config ────────────────────────────────────────────────────────────

    uint256 public feeBps;          // protocol fee in basis points (default 0)
    address public feeRecipient;    // where fees go

    // ── Admin attestation (Base / Monad fallback) ─────────────────────────────

    /// @dev Addresses authorised to post attestations when Self hub is unavailable.
    mapping(address => bool) public attesters;

    /// @dev escrowId → attested (admin-signed verification accepted)
    mapping(bytes32 => bool) public adminAttested;

    // ── Pausing ───────────────────────────────────────────────────────────────

    bool public paused;

    // ── Events ────────────────────────────────────────────────────────────────

    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed sender,
        address token,
        uint256 amount,
        bytes32 recipientHash,
        bool    requireAuth,
        uint40  expiresAt
    );
    event EscrowClaimed(
        bytes32 indexed escrowId,
        address indexed claimedBy,
        uint256 netAmount,
        uint256 fee
    );
    event EscrowReclaimed(bytes32 indexed escrowId, address indexed sender, uint256 amount);
    event AdminAttestationPosted(bytes32 indexed escrowId, address indexed attester);
    event AttesterUpdated(address indexed attester, bool enabled);
    event FeeConfigUpdated(uint256 feeBps, address feeRecipient);
    event Paused(bool paused);

    // ── Errors ────────────────────────────────────────────────────────────────

    error ZeroAmount();
    error ZeroAddress();
    error InvalidToken();
    error EscrowNotFound();
    error EscrowNotPending();
    error NotExpired();
    error NotSender();
    error InvalidClaimToken();
    error AuthRequired();
    error SelfNotEnabled();
    error NullifierUsed();
    error FeeTooHigh();
    error ContractPaused();
    error NotAttester();
    error TransferFailed();
    error NativeAmountMismatch();

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param _hub           Self IdentityVerificationHubV2 address. Pass address(0) for Base/Monad.
     * @param _owner         Contract owner / admin.
     * @param _feeRecipient  Where protocol fees are sent.
     * @param _feeBps        Protocol fee in basis points (0–500).
     * @param _minAge        Minimum age for Self ZK verification (e.g. 18). Ignored if hub==0.
     */
    constructor(
        address _hub,
        address _owner,
        address _feeRecipient,
        uint256 _feeBps,
        uint8   _minAge
    ) Ownable(_owner) {
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (_feeRecipient == address(0)) revert ZeroAddress();

        selfHub     = IIdentityVerificationHubV2(_hub);
        selfEnabled = (_hub != address(0));
        feeBps      = _feeBps;
        feeRecipient = _feeRecipient;

        // Register verification config with hub on Celo
        if (selfEnabled && _minAge > 0) {
            IIdentityVerificationHubV2.VerificationConfigV2 memory cfg;
            // Pack age into bytes32 as the hub expects
            cfg.olderThan = bytes32(uint256(_minAge));
            cfg.ofacEnabled = true;
            verificationConfigId = selfHub.setVerificationConfigV2(cfg);
        }
    }

    // ── Escrow creation ───────────────────────────────────────────────────────

    /**
     * @notice Create a new escrow. Caller deposits tokens/native here.
     * @param recipientHash  keccak256(recipientEmail) — links to off-chain claim link.
     * @param claimTokenHash keccak256(secret) — the secret is emailed to recipient.
     * @param token          ERC-20 token address, or address(0) for native.
     * @param amount         Token amount (ignored for native; use msg.value).
     * @param requireAuth    If true, recipient must complete Self ZK verification.
     * @return escrowId      Unique identifier for this escrow.
     */
    function createEscrow(
        bytes32 recipientHash,
        bytes32 claimTokenHash,
        address token,
        uint256 amount,
        bool    requireAuth
    ) external payable whenNotPaused nonReentrant returns (bytes32 escrowId) {
        if (recipientHash == bytes32(0)) revert ZeroAddress();
        if (claimTokenHash == bytes32(0)) revert InvalidClaimToken();

        // Handle native vs ERC-20
        uint256 deposited;
        if (token == NATIVE_TOKEN) {
            if (msg.value == 0) revert ZeroAmount();
            deposited = msg.value;
        } else {
            if (amount == 0) revert ZeroAmount();
            if (msg.value != 0) revert NativeAmountMismatch();
            bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
            if (!ok) revert TransferFailed();
            deposited = amount;
        }

        // Compute fee
        uint256 fee = (deposited * feeBps) / 10_000;

        // Derive escrow ID deterministically
        escrowId = keccak256(abi.encodePacked(
            msg.sender, recipientHash, claimTokenHash, block.timestamp, block.chainid
        ));

        // Ensure no collision (astronomically unlikely but defensive)
        require(escrows[escrowId].sender == address(0), "escrow id collision");

        uint40 expiresAt = uint40(block.timestamp + EXPIRY_PERIOD);

        escrows[escrowId] = Escrow({
            sender:        msg.sender,
            token:         token,
            amount:        deposited,
            fee:           fee,
            recipientHash: recipientHash,
            claimToken:    claimTokenHash,
            requireAuth:   requireAuth,
            expiresAt:     expiresAt,
            status:        EscrowStatus.PENDING,
            claimedBy:     address(0)
        });

        claimTokenIndex[claimTokenHash] = escrowId;

        emit EscrowCreated(escrowId, msg.sender, token, deposited, recipientHash, requireAuth, expiresAt);
    }

    // ── Claiming (Self ZK path — Celo) ────────────────────────────────────────

    /**
     * @notice Claim an escrow by presenting a Self ZK proof.
     *         Only available on chains where selfEnabled == true.
     *         The hub will call back `_onVerificationSuccess` upon success.
     *
     * @dev    proofPayload and userContextData are passed straight through to the hub.
     *         userContextData must encode: abi.encode(escrowId, claimTokenHash, recipientAddress)
     */
    function claimWithSelfProof(
        bytes32 escrowId,
        bytes calldata proofPayload,
        bytes calldata userContextData
    ) external whenNotPaused nonReentrant {
        if (!selfEnabled) revert SelfNotEnabled();
        _assertEscrowClaimable(escrowId);

        Escrow storage e = escrows[escrowId];
        if (!e.requireAuth) revert AuthRequired(); // use claimOpen for non-auth escrows

        // Forward to hub. Hub will call back _onSelfVerificationSuccess on success.
        // userContextData encodes (escrowId, claimTokenHash, recipient)
        selfHub.verifySelfProof(proofPayload, userContextData);
    }

    /**
     * @notice Callback from Self Hub after successful ZK proof verification.
     * @dev    Only callable by the Self hub. Decode escrowId + recipient from userData.
     */
    function onVerificationSuccess(
        bytes calldata output,
        bytes calldata userData
    ) external {
        require(msg.sender == address(selfHub), "only Self hub");

        // Decode the verified output
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory disclosed = abi.decode(
            output, (ISelfVerificationRoot.GenericDiscloseOutputV2)
        );

        // Replay protection
        if (usedNullifiers[disclosed.nullifier]) revert NullifierUsed();
        usedNullifiers[disclosed.nullifier] = true;

        // Decode caller data
        (bytes32 escrowId, bytes32 claimTokenHash, address recipient) = abi.decode(
            userData, (bytes32, bytes32, address)
        );

        _executeClaim(escrowId, claimTokenHash, recipient);
    }

    // ── Claiming (open / admin-attested path) ─────────────────────────────────

    /**
     * @notice Claim an escrow that does NOT require Self ZK auth.
     *         Presents the plain-text claim secret. Works on all chains.
     */
    function claimOpen(
        bytes32 escrowId,
        bytes32 claimSecret,   // plain secret, not hashed
        address recipient
    ) external whenNotPaused nonReentrant {
        _assertEscrowClaimable(escrowId);

        Escrow storage e = escrows[escrowId];
        if (e.requireAuth) revert AuthRequired(); // must use Self proof path

        bytes32 claimTokenHash = keccak256(abi.encodePacked(claimSecret));
        if (e.claimToken != claimTokenHash) revert InvalidClaimToken();

        _executeClaim(escrowId, claimTokenHash, recipient);
    }

    /**
     * @notice Claim an escrow with requireAuth=true on chains without Self Hub,
     *         after an authorised attester has posted an off-chain attestation.
     */
    function claimWithAdminAttestation(
        bytes32 escrowId,
        bytes32 claimSecret,
        address recipient
    ) external whenNotPaused nonReentrant {
        if (selfEnabled) revert SelfNotEnabled(); // use Self path on Celo

        _assertEscrowClaimable(escrowId);
        Escrow storage e = escrows[escrowId];

        if (e.requireAuth && !adminAttested[escrowId]) revert AuthRequired();

        bytes32 claimTokenHash = keccak256(abi.encodePacked(claimSecret));
        if (e.claimToken != claimTokenHash) revert InvalidClaimToken();

        _executeClaim(escrowId, claimTokenHash, recipient);
    }

    // ── Admin attestation posting ─────────────────────────────────────────────

    /**
     * @notice Authorised attester posts an off-chain identity attestation for Base/Monad.
     * @dev    Only trusted attesters (set by owner) can call this.
     *         Off-chain: attester backend verifies Self backend SDK, then posts here.
     */
    function postAdminAttestation(bytes32 escrowId) external {
        if (!attesters[msg.sender]) revert NotAttester();
        Escrow storage e = escrows[escrowId];
        if (e.sender == address(0)) revert EscrowNotFound();
        if (e.status != EscrowStatus.PENDING) revert EscrowNotPending();

        adminAttested[escrowId] = true;
        emit AdminAttestationPosted(escrowId, msg.sender);
    }

    // ── Expiry reclaim ────────────────────────────────────────────────────────

    /**
     * @notice Sender reclaims funds after EXPIRY_PERIOD if escrow was never claimed.
     */
    function reclaimExpired(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (e.sender == address(0)) revert EscrowNotFound();
        if (e.status != EscrowStatus.PENDING) revert EscrowNotPending();
        if (msg.sender != e.sender) revert NotSender();
        if (block.timestamp < e.expiresAt) revert NotExpired();

        e.status = EscrowStatus.RECLAIMED;
        _transfer(e.token, e.sender, e.amount); // full refund, no fee

        emit EscrowReclaimed(escrowId, e.sender, e.amount);
    }

    // ── Owner admin ───────────────────────────────────────────────────────────

    function setFeeConfig(uint256 _feeBps, address _feeRecipient) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        feeBps = _feeBps;
        feeRecipient = _feeRecipient;
        emit FeeConfigUpdated(_feeBps, _feeRecipient);
    }

    function setAttester(address attester, bool enabled) external onlyOwner {
        if (attester == address(0)) revert ZeroAddress();
        attesters[attester] = enabled;
        emit AttesterUpdated(attester, enabled);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    /// @notice Emergency withdrawal — only callable by owner, only if paused.
    function emergencyWithdraw(address token, uint256 amount, address to) external onlyOwner {
        require(paused, "not paused");
        if (to == address(0)) revert ZeroAddress();
        _transfer(token, to, amount);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getEscrow(bytes32 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    function escrowIdFromClaimToken(bytes32 claimTokenHash) external view returns (bytes32) {
        return claimTokenIndex[claimTokenHash];
    }

    function isClaimable(bytes32 escrowId) external view returns (bool) {
        Escrow storage e = escrows[escrowId];
        return e.status == EscrowStatus.PENDING && block.timestamp < e.expiresAt;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _assertEscrowClaimable(bytes32 escrowId) internal view {
        Escrow storage e = escrows[escrowId];
        if (e.sender == address(0)) revert EscrowNotFound();
        if (e.status != EscrowStatus.PENDING) revert EscrowNotPending();
        if (block.timestamp >= e.expiresAt) revert NotExpired();
    }

    function _executeClaim(
        bytes32 escrowId,
        bytes32 claimTokenHash,
        address recipient
    ) internal {
        if (recipient == address(0)) revert ZeroAddress();

        Escrow storage e = escrows[escrowId];
        if (e.claimToken != claimTokenHash) revert InvalidClaimToken();

        e.status    = EscrowStatus.CLAIMED;
        e.claimedBy = recipient;

        uint256 net = e.amount - e.fee;

        // Send fee to protocol
        if (e.fee > 0) {
            _transfer(e.token, feeRecipient, e.fee);
        }

        // Send net to recipient
        _transfer(e.token, recipient, net);

        emit EscrowClaimed(escrowId, recipient, net, e.fee);
    }

    function _transfer(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == NATIVE_TOKEN) {
            (bool ok, ) = to.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            bool ok = IERC20(token).transfer(to, amount);
            if (!ok) revert TransferFailed();
        }
    }

    /// @dev Accept native token deposits
    receive() external payable {}
}
