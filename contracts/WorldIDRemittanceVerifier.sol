// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WorldIDRemittanceVerifier
 * @notice Identity-gated escrow release for Email Remittance Pro.
 *         Primary: World ID verification (orb or device level)
 *         Fallback: Human Passport score-based verification
 *         Last resort: Rate-limited email-only mode
 * 
 * @dev Architecture:
 *   1. Sender calls `createEscrow(recipientEmailHash, token, amount, requireAuth)`
 *   2. Tokens/native sit in this contract keyed by escrowId
 *   3. Recipient claims via:
 *      - `claimWithWorldID(escrowId, proof, signalHash, nullifierHash, recipient)` (World ID primary)
 *      - `claimWithHumanPassport(escrowId, attestation, score, recipient)` (Human Passport fallback)
 *      - `claimEmailOnly(escrowId, claimSecret, recipient)` (email-only last resort)
 *   4. Verified identity releases escrow to recipient wallet
 *   5. Sender can `reclaimExpired` after `EXPIRY_PERIOD` if unclaimed
 * 
 * Chains:
 *   - World ID: Mainnet (orb), Polygon/Arbitrum/Optimism (device), Celo (device)
 *   - Human Passport: API-based off-chain verification with on-chain attestation
 *   - Email-only: All chains with rate limiting
 */

// ── Minimal interfaces ────────────────────────────────────────────────────────

interface IWorldID {
    function verifyProof(
        uint256 merkleRoot,
        uint256 nullifierHash,
        uint256[8] calldata proof,
        uint256 signalHash
    ) external view returns (bool);
    
    function getMerkleRoot(uint256 groupId) external view returns (uint256);
    
    event RootUpdated(uint256 indexed groupId, uint256 merkleRoot);
}

interface IHumanPassportAttester {
    function verifyAttestation(
        address attester,
        bytes calldata attestation,
        uint256 score
    ) external view returns (bool);
    
    function getAttesters() external view returns (address[] memory);
    
    event AttesterAdded(address indexed attester);
    event AttesterRemoved(address indexed attester);
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// ── ReentrancyGuard ──────────────────────────────────────────────────────────

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

// ── Ownable ──────────────────────────────────────────────────────────────────

abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        require(initialOwner != address(0), "Ownable: zero address");
        _owner = initialOwner;
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

// ── Pausable ─────────────────────────────────────────────────────────────────

abstract contract Pausable {
    bool private _paused = false;

    event Paused(address account);
    event Unpaused(address account);

    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }

    function paused() public view returns (bool) { return _paused; }

    function _pause() internal virtual {
        require(!_paused, "Pausable: not paused");
        _paused = true;
        emit Paused(msg.sender);
    }

    function _unpause() internal virtual {
        require(_paused, "Pausable: not paused");
        _paused = false;
        emit Unpaused(msg.sender);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WorldIDRemittanceVerifier
// ═══════════════════════════════════════════════════════════════════════════════

contract WorldIDRemittanceVerifier is ReentrancyGuard, Ownable, Pausable {

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant EXPIRY_PERIOD       = 30 days;
    uint256 public constant MAX_FEE_BPS         = 500;   // 5% hard cap
    uint256 public constant MIN_PASSPORT_SCORE  = 20;    // Human Passport minimum score
    address public constant NATIVE_TOKEN        = address(0);
    uint256 public constant EMAIL_ONLY_DAILY_LIMIT = 5;  // Rate limit for email-only mode

    // ── World ID ──────────────────────────────────────────────────────────────

    /// @notice World ID verifier contract address. address(0) if not deployed on this chain.
    IWorldID public immutable worldId;

    /// @notice Whether World ID is available on this chain.
    bool public immutable worldIdEnabled;

    /// @notice Current merkle root for World ID verification.
    uint256 public currentMerkleRoot;

    /// @notice Group ID for World ID (0 = orb, 1 = device).
    uint256 public worldIdGroupId;

    // ── Human Passport ────────────────────────────────────────────────────────

    /// @notice Human Passport attester contract address. address(0) if not deployed.
    IHumanPassportAttester public immutable humanPassportAttester;

    /// @notice Whether Human Passport is available on this chain.
    bool public immutable humanPassportEnabled;

    // ── Escrow Storage ────────────────────────────────────────────────────────

    enum EscrowStatus { PENDING, CLAIMED, RECLAIMED, EXPIRED }

    enum VerificationMethod { NONE, WORLD_ID, HUMAN_PASSPORT, EMAIL_ONLY }

    struct Escrow {
        address sender;
        address token;          // address(0) = native
        uint256 amount;         // gross amount deposited
        uint256 fee;            // protocol fee (deducted on claim)
        bytes32 recipientHash;  // keccak256(email) — off-chain linkage
        bytes32 claimToken;     // keccak256(secret) — presented to claim
        bool    requireAuth;    // if true, identity verification required to claim
        uint40  expiresAt;
        EscrowStatus status;
        address claimedBy;      // set on successful claim
        VerificationMethod verificationMethod;
        uint256 verificationScore; // passport score or World ID verification level
    }

    mapping(bytes32 => Escrow) public escrows;

    /// @dev World ID nullifier → used (replay protection)
    mapping(uint256 => bool) public usedWorldIdNullifiers;

    /// @dev Human Passport attestation hash → used
    mapping(bytes32 => bool) public usedPassportAttestations;

    /// @dev claimToken hash → escrowId (for fast lookup from backend)
    mapping(bytes32 => bytes32) public claimTokenIndex;

    /// @dev Email-only rate limiting: address → daily claim count
    mapping(address => mapping(uint256 => uint256)) public emailOnlyDailyClaims;

    // ── Fee Config ────────────────────────────────────────────────────────────

    uint256 public feeBps;
    address public feeRecipient;

    // ── Admin Attestation (for Human Passport) ────────────────────────────────

    mapping(address => bool) public passportAttesters;

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
        uint256 fee,
        VerificationMethod verificationMethod
    );
    event EscrowReclaimed(bytes32 indexed escrowId, address indexed sender, uint256 amount);
    event FeeConfigUpdated(uint256 feeBps, address feeRecipient);
    event Paused(bool paused);
    event WorldIdMerkleRootUpdated(uint256 merkleRoot, uint256 groupId);
    event HumanPassportAttesterUpdated(address indexed attester, bool enabled);
    event EmailOnlyRateLimitExceeded(address indexed user, uint256 dailyCount);

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
    error WorldIdNotEnabled();
    error WorldIdVerificationFailed();
    error HumanPassportNotEnabled();
    error HumanPassportVerificationFailed();
    error InsufficientPassportScore();
    error AttestationAlreadyUsed();
    error NullifierAlreadyUsed();
    error EmailOnlyRateLimitExceededError();
    error FeeTooHigh();
    error ContractPaused();
    error NotAttester();
    error TransferFailed();
    error NativeAmountMismatch();
    error InvalidMerkleRoot();
    error InvalidGroupId();

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier whenNotPaused() {
        if (paused()) revert ContractPaused();
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param _worldId                World ID verifier address. Pass address(0) for chains without World ID.
     * @param _humanPassportAttester  Human Passport attester address. Pass address(0) if not available.
     * @param _owner                  Contract owner / admin.
     * @param _feeRecipient           Where protocol fees are sent.
     * @param _feeBps                 Protocol fee in basis points (0–500).
     * @param _worldIdGroupId         World ID group ID (0 = orb, 1 = device).
     */
    constructor(
        address _worldId,
        address _humanPassportAttester,
        address _owner,
        address _feeRecipient,
        uint256 _feeBps,
        uint256 _worldIdGroupId
    ) Ownable(_owner) {
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (_worldIdGroupId > 1) revert InvalidGroupId();

        worldId = IWorldID(_worldId);
        worldIdEnabled = (_worldId != address(0));
        
        humanPassportAttester = IHumanPassportAttester(_humanPassportAttester);
        humanPassportEnabled = (_humanPassportAttester != address(0));
        
        worldIdGroupId = _worldIdGroupId;
        feeBps = _feeBps;
        feeRecipient = _feeRecipient;

        // Initialize current merkle root if World ID enabled
        if (worldIdEnabled) {
            currentMerkleRoot = worldId.getMerkleRoot(worldIdGroupId);
        }
    }

    // ── World ID Merkle Root Updates ──────────────────────────────────────────

    /**
     * @notice Update the World ID merkle root (called by off-chain oracle/relayer).
     * @dev    Only callable by owner or authorized relayer.
     */
    function updateWorldIdMerkleRoot(uint256 newMerkleRoot, uint256 groupId) external onlyOwner {
        if (groupId > 1) revert InvalidGroupId();
        currentMerkleRoot = newMerkleRoot;
        worldIdGroupId = groupId;
        emit WorldIdMerkleRootUpdated(newMerkleRoot, groupId);
    }

    // ── Human Passport Attester Management ────────────────────────────────────

    function setPassportAttester(address attester, bool enabled) external onlyOwner {
        if (attester == address(0)) revert ZeroAddress();
        passportAttesters[attester] = enabled;
        emit HumanPassportAttesterUpdated(attester, enabled);
    }

    // ── Escrow Creation ───────────────────────────────────────────────────────

    /**
     * @notice Create a new escrow. Caller deposits tokens/native here.
     * @param recipientHash  keccak256(recipientEmail) — links to off-chain claim link.
     * @param claimTokenHash keccak256(secret) — the secret is emailed to recipient.
     * @param token          ERC-20 token address, or address(0) for native.
     * @param amount         Token amount (ignored for native; use msg.value).
     * @param requireAuth    If true, identity verification required to claim.
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

        uint256 fee = (deposited * feeBps) / 10_000;

        escrowId = keccak256(abi.encodePacked(
            msg.sender, recipientHash, claimTokenHash, block.timestamp, block.chainid
        ));

        require(escrows[escrowId].sender == address(0), "escrow id collision");

        uint40 expiresAt = uint40(block.timestamp + EXPIRY_PERIOD);

        escrows[escrowId] = Escrow({
            sender:            msg.sender,
            token:             token,
            amount:            deposited,
            fee:               fee,
            recipientHash:     recipientHash,
            claimToken:        claimTokenHash,
            requireAuth:       requireAuth,
            expiresAt:         expiresAt,
            status:            EscrowStatus.PENDING,
            claimedBy:         address(0),
            verificationMethod: VerificationMethod.NONE,
            verificationScore: 0
        });

        claimTokenIndex[claimTokenHash] = escrowId;

        emit EscrowCreated(escrowId, msg.sender, token, deposited, recipientHash, requireAuth, expiresAt);
    }

    // ── Claiming: World ID (Primary) ──────────────────────────────────────────

    /**
     * @notice Claim an escrow using World ID zero-knowledge proof.
     * @param escrowId       The escrow to claim.
     * @param proof          The World ID ZK proof (8 uint256 values).
     * @param signalHash     The signal hash (hash of the action + nullifier).
     * @param nullifierHash  The nullifier hash (prevents double-claims).
     * @param recipient      The recipient wallet address.
     */
    function claimWithWorldID(
        bytes32 escrowId,
        uint256[8] calldata proof,
        uint256 signalHash,
        uint256 nullifierHash,
        address recipient
    ) external whenNotPaused nonReentrant {
        if (!worldIdEnabled) revert WorldIdNotEnabled();
        _assertEscrowClaimable(escrowId);
        
        Escrow storage e = escrows[escrowId];
        if (!e.requireAuth) revert AuthRequired(); // use claimOpen for non-auth escrows

        // Verify the World ID proof
        bool isValid = worldId.verifyProof(currentMerkleRoot, nullifierHash, proof, signalHash);
        if (!isValid) revert WorldIdVerificationFailed();

        // Replay protection
        if (usedWorldIdNullifiers[nullifierHash]) revert NullifierAlreadyUsed();
        usedWorldIdNullifiers[nullifierHash] = true;

        e.verificationMethod = VerificationMethod.WORLD_ID;
        e.verificationScore = worldIdGroupId; // 0 = orb, 1 = device

        _executeClaim(escrowId, recipient, VerificationMethod.WORLD_ID);
    }

    // ── Claiming: Human Passport (Fallback) ───────────────────────────────────

    /**
     * @notice Claim an escrow using Human Passport attestation.
     * @param escrowId       The escrow to claim.
     * @param attestation    The signed attestation from authorized attester.
     * @param score          The Human Passport score (must be >= MIN_PASSPORT_SCORE).
     * @param recipient      The recipient wallet address.
     */
    function claimWithHumanPassport(
        bytes32 escrowId,
        bytes calldata attestation,
        uint256 score,
        address recipient
    ) external whenNotPaused nonReentrant {
        if (!humanPassportEnabled) revert HumanPassportNotEnabled();
        _assertEscrowClaimable(escrowId);
        
        Escrow storage e = escrows[escrowId];
        if (!e.requireAuth) revert AuthRequired();

        if (score < MIN_PASSPORT_SCORE) revert InsufficientPassportScore();

        // Verify attestation hash not used
        bytes32 attestationHash = keccak256(attestation);
        if (usedPassportAttestations[attestationHash]) revert AttestationAlreadyUsed();

        // Verify attestation signature via attester contract
        // This would check the attester's signature on the attestation
        bool isValid = humanPassportAttester.verifyAttestation(
            msg.sender, // The attester calling this
            attestation,
            score
        );
        if (!isValid) revert HumanPassportVerificationFailed();

        usedPassportAttestations[attestationHash] = true;

        e.verificationMethod = VerificationMethod.HUMAN_PASSPORT;
        e.verificationScore = score;

        _executeClaim(escrowId, recipient, VerificationMethod.HUMAN_PASSPORT);
    }

    // ── Claiming: Email-Only (Last Resort) ────────────────────────────────────

    /**
     * @notice Claim an escrow without identity verification (rate-limited).
     * @dev    Only available when requireAuth=false or as configured fallback.
     * @param escrowId       The escrow to claim.
     * @param claimSecret    The plain-text claim secret (not hashed).
     * @param recipient      The recipient wallet address.
     */
    function claimEmailOnly(
        bytes32 escrowId,
        bytes32 claimSecret,
        address recipient
    ) external whenNotPaused nonReentrant {
        _assertEscrowClaimable(escrowId);
        
        Escrow storage e = escrows[escrowId];
        
        // If auth required, check if fallback is allowed (configurable)
        if (e.requireAuth) {
            // Rate limiting check
            uint256 today = block.timestamp / 1 days;
            uint256 dailyCount = emailOnlyDailyClaims[recipient][today];
            if (dailyCount >= EMAIL_ONLY_DAILY_LIMIT) {
                emit EmailOnlyRateLimitExceeded(recipient, dailyCount);
                revert EmailOnlyRateLimitExceededError();
            }
            emailOnlyDailyClaims[recipient][today] = dailyCount + 1;
        } else {
            // Non-auth escrows don't count against rate limit
        }

        bytes32 claimTokenHash = keccak256(abi.encodePacked(claimSecret));
        if (e.claimToken != claimTokenHash) revert InvalidClaimToken();

        e.verificationMethod = VerificationMethod.EMAIL_ONLY;
        e.verificationScore = 0;

        _executeClaim(escrowId, recipient, VerificationMethod.EMAIL_ONLY);
    }

    // ── Claiming: Open (No Auth Required) ────────────────────────────────────

    /**
     * @notice Claim an escrow that does NOT require identity verification.
     *         Presents the plain-text claim secret. Works on all chains.
     */
    function claimOpen(
        bytes32 escrowId,
        bytes32 claimSecret,
        address recipient
    ) external whenNotPaused nonReentrant {
        _assertEscrowClaimable(escrowId);

        Escrow storage e = escrows[escrowId];
        if (e.requireAuth) revert AuthRequired();

        bytes32 claimTokenHash = keccak256(abi.encodePacked(claimSecret));
        if (e.claimToken != claimTokenHash) revert InvalidClaimToken();

        e.verificationMethod = VerificationMethod.NONE;
        e.verificationScore = 0;

        _executeClaim(escrowId, recipient, VerificationMethod.NONE);
    }

    // ── Expiry Reclaim ────────────────────────────────────────────────────────

    function reclaimExpired(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (e.sender == address(0)) revert EscrowNotFound();
        if (e.status != EscrowStatus.PENDING) revert EscrowNotPending();
        if (msg.sender != e.sender) revert NotSender();
        if (block.timestamp < e.expiresAt) revert NotExpired();

        e.status = EscrowStatus.RECLAIMED;
        _transfer(e.token, e.sender, e.amount);

        emit EscrowReclaimed(escrowId, e.sender, e.amount);
    }

    // ── Owner Admin ───────────────────────────────────────────────────────────

    function setFeeConfig(uint256 _feeBps, address _feeRecipient) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        feeBps = _feeBps;
        feeRecipient = _feeRecipient;
        emit FeeConfigUpdated(_feeBps, _feeRecipient);
    }

    function setPaused(bool _paused) external onlyOwner {
        if (_paused) _pause(); else _unpause();
    }

    function emergencyWithdraw(address token, uint256 amount, address to) external onlyOwner {
        require(paused(), "not paused");
        if (to == address(0)) revert ZeroAddress();
        _transfer(token, to, amount);
    }

    // ── View Helpers ──────────────────────────────────────────────────────────

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

    function getWorldIdConfig() external view returns (bool enabled, uint256 merkleRoot, uint256 groupId) {
        return (worldIdEnabled, currentMerkleRoot, worldIdGroupId);
    }

    function getHumanPassportConfig() external view returns (bool enabled, uint256 minScore) {
        return (humanPassportEnabled, MIN_PASSPORT_SCORE);
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
        address recipient,
        VerificationMethod method
    ) internal {
        if (recipient == address(0)) revert ZeroAddress();

        Escrow storage e = escrows[escrowId];

        e.status    = EscrowStatus.CLAIMED;
        e.claimedBy = recipient;
        e.verificationMethod = method;

        uint256 net = e.amount - e.fee;

        if (e.fee > 0) {
            _transfer(e.token, feeRecipient, e.fee);
        }

        _transfer(e.token, recipient, net);

        emit EscrowClaimed(escrowId, recipient, net, e.fee, method);
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

    receive() external payable {}
}