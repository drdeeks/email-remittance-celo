# EmailRemittanceVerifier — Smart Contracts

EVM-compatible identity-gated escrow contract for Email Remittance Pro.
Deployed separately on Celo, Base, and Monad.

## Architecture

```
Sender → createEscrow(recipientEmailHash, claimTokenHash, token, amount, requireAuth)
                          ↓
                   EmailRemittanceVerifier
                          ↓
        ┌─────────────────┴─────────────────────┐
        │ Celo (Self Hub live)                   │ Base / Monad (admin-attestation)
        │ claimWithSelfProof(escrowId, zkProof)  │ claimWithAdminAttestation(escrowId, secret)
        │   → Hub verifies ZK passport proof     │   → Attester backend verified off-chain
        │   → Hub calls onVerificationSuccess    │   → postAdminAttestation(escrowId)
        │   → Tokens released to recipient       │   → Tokens released to recipient
        └────────────────────────────────────────┘
```

## Chain Configuration

| Chain  | Chain ID | Self Hub | Mode |
|--------|----------|----------|------|
| Celo mainnet  | 42220 | `0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF` | ZK passport proof |
| Celo testnet  | 44787 | `0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74` | Mock passport proof |
| Base mainnet  | 8453  | none — `address(0)` | Admin attestation |
| Monad mainnet | 143   | none — `address(0)` | Admin attestation |

## Key Features

- **Self Protocol ZK verification** (Celo): passport proof, nullifier replay protection, age gate
- **Admin attestation fallback** (Base/Monad): attester backend signs off-chain Self SDK verification
- **Native + ERC-20 support**: send CELO, ETH, USDC, MON, or any ERC-20
- **Configurable fee**: 0–5% protocol fee in basis points
- **Expiry + reclaim**: sender reclaims after 30 days if unclaimed
- **Emergency pause**: owner can halt new claims, emergency withdraw if needed
- **Reentrancy protection**: all state-changing external functions guarded

## Deploy

### Prerequisites

```bash
# Install dependencies
npm install ethers ts-node typescript

# Compile contract (requires solc 0.8.28+)
mkdir -p contracts/artifacts
solc --combined-json abi,bin \
     --include-path node_modules/ \
     --base-path . \
     contracts/EmailRemittanceVerifier.sol \
     -o contracts/artifacts/

# Or with Foundry:
forge build --contracts contracts/ --out contracts/artifacts/
```

### Environment

```bash
# Required
DEPLOYER_PRIVATE_KEY=0x...
FEE_RECIPIENT=0x...        # wallet receiving protocol fees

# Optional
FEE_BPS=100                # 1% fee (default)
MIN_AGE=18                 # minimum age for Celo Self ZK (default)
CELO_RPC_URL=https://forno.celo.org
BASE_RPC_URL=https://mainnet.base.org
MONAD_RPC_URL=https://rpc.monad.xyz
```

### Run

```bash
# Deploy to single chain
npx ts-node contracts/deploy.ts --chain celo
npx ts-node contracts/deploy.ts --chain base
npx ts-node contracts/deploy.ts --chain monad

# Deploy to all 3
npx ts-node contracts/deploy.ts --chain all
```

Deployment addresses are written to `contracts/deployments.json`.

### Post-deploy

1. Add deployed addresses to `.env`:
   ```
   CELO_CONTRACT_ADDRESS=0x...
   BASE_CONTRACT_ADDRESS=0x...
   MONAD_CONTRACT_ADDRESS=0x...
   ```

2. For Base/Monad, authorise your backend wallet as attester:
   ```ts
   await contract.setAttester(BACKEND_WALLET_ADDRESS, true);
   ```

3. Transfer ownership if needed:
   ```ts
   await contract.transferOwnership(MULTISIG_ADDRESS);
   ```

## Contract Functions

### Sender

| Function | Description |
|----------|-------------|
| `createEscrow(recipientHash, claimTokenHash, token, amount, requireAuth)` | Deposit funds into escrow |
| `reclaimExpired(escrowId)` | Reclaim after 30 days if unclaimed |

### Recipient (Celo — Self ZK)

| Function | Description |
|----------|-------------|
| `claimWithSelfProof(escrowId, proofPayload, userContextData)` | Claim with ZK passport proof |

### Recipient (Base/Monad — admin attestation)

| Function | Description |
|----------|-------------|
| `claimWithAdminAttestation(escrowId, claimSecret, recipient)` | Claim after admin posts attestation |

### Recipient (no auth required)

| Function | Description |
|----------|-------------|
| `claimOpen(escrowId, claimSecret, recipient)` | Claim open escrow with secret |

### Admin/Attester

| Function | Description |
|----------|-------------|
| `postAdminAttestation(escrowId)` | Attest identity for Base/Monad escrow |
| `setFeeConfig(feeBps, feeRecipient)` | Update protocol fee |
| `setAttester(address, enabled)` | Add/remove attester |
| `setPaused(bool)` | Pause/unpause contract |
| `emergencyWithdraw(token, amount, to)` | Emergency withdrawal (paused only) |

## Security Notes

- **No proxy pattern** — contract is immutable after deploy; upgrade = new deploy + migration
- **Nullifier replay protection** — each Self ZK proof can only be used once per contract
- **Scope binding** — Self proofs are scope-bound to this contract address; cannot be replayed on another contract
- **Fee hard cap** — feeBps cannot exceed 500 (5%)
- **Only Self hub can call `onVerificationSuccess`** — checked with `msg.sender == address(selfHub)`
- **Reentrancy guard** on all external state-changing functions
- **Self Hub address is immutable** — set at deploy, cannot be changed (prevents hub swap attack)

## Audit Checklist

- [ ] Verify SELF_HUB address matches official Self Protocol deployment for each chain
- [ ] Confirm `scopeSeed` matches frontend SelfAppBuilder config exactly
- [ ] Confirm `verificationConfigId` matches frontend disclosure config
- [ ] Test nullifier replay protection
- [ ] Test expired escrow reclaim
- [ ] Test emergency withdrawal flow
- [ ] Test fee calculation rounding (use basis points, not percentage)
- [ ] Fuzz test `createEscrow` with native ETH and ERC-20 amounts
