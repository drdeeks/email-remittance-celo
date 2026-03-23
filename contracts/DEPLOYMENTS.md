# EmailRemittanceVerifier — Deployment Record

Generated: 2026-03-23 01:11 UTC  
Deployer: `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`  
Contract: `EmailRemittanceVerifier.sol` (compiler: `solcjs v0.8.34`, optimizer: 200 runs)

---

## Deployed Contracts

### Base Mainnet (chainId: 8453) ✅ LIVE

| Field | Value |
|-------|-------|
| **Contract Address** | `0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0` |
| **Deploy TX** | `0x38e0d55e1a14920466f8f141ec99e2a9daf95551035cc0218dfc58fadc59f807` |
| **Block** | `43719474` |
| **Gas Used** | `2,063,724` |
| **Self Hub** | `address(0)` — admin-attestation mode |
| **Self Enabled** | `false` |
| **Fee BPS** | `100` (1%) |
| **Owner** | `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A` |
| **Explorer** | https://basescan.org/address/0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0 |
| **TX Explorer** | https://basescan.org/tx/0x38e0d55e1a14920466f8f141ec99e2a9daf95551035cc0218dfc58fadc59f807 |
| **Verified** | ⏳ Pending (requires Etherscan API key) |

Constructor ABI args (Base):
```
0000000000000000000000000000000000000000000000000000000000000000  // hub = address(0)
0000000000000000000000009d65433b3fe597c15a46d2365f8f2c1701eb9e4a  // owner
0000000000000000000000009d65433b3fe597c15a46d2365f8f2c1701eb9e4a  // feeRecipient
0000000000000000000000000000000000000000000000000000000000000064  // feeBps = 100
0000000000000000000000000000000000000000000000000000000000000000  // minAge = 0
```

---

### Monad Mainnet (chainId: 143) ✅ LIVE

| Field | Value |
|-------|-------|
| **Contract Address** | `0x7BC66eD8285b51F84D170F158aD162cA144F32c1` |
| **Deploy TX** | `0xba942effc328ba8e5bf2d0f3e28bbc3717ae5705566d8ed2dff4e50158585766` |
| **Block** | `63210858` |
| **Gas Used** | `2,525,534` |
| **Self Hub** | `address(0)` — admin-attestation mode |
| **Self Enabled** | `false` |
| **Fee BPS** | `100` (1%) |
| **Owner** | `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A` |
| **Explorer** | https://explorer.monad.xyz/address/0x7BC66eD8285b51F84D170F158aD162cA144F32c1 |
| **TX Explorer** | https://explorer.monad.xyz/tx/0xba942effc328ba8e5bf2d0f3e28bbc3717ae5705566d8ed2dff4e50158585766 |
| **Verified** | ⏳ Pending (Monad explorer verification TBD) |

Constructor ABI args (Monad):
```
0000000000000000000000000000000000000000000000000000000000000000  // hub = address(0)
0000000000000000000000009d65433b3fe597c15a46d2365f8f2c1701eb9e4a  // owner
0000000000000000000000009d65433b3fe597c15a46d2365f8f2c1701eb9e4a  // feeRecipient
0000000000000000000000000000000000000000000000000000000000000064  // feeBps = 100
0000000000000000000000000000000000000000000000000000000000000000  // minAge = 0
```

---

### Celo Mainnet (chainId: 42220) ⏳ PENDING FUNDING

| Field | Value |
|-------|-------|
| **Contract Address** | TBD — awaiting deployment |
| **Self Hub** | `0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF` (official) |
| **Self Enabled** | `true` — ZK passport proof mode |
| **Blocking** | Need ~0.04 more CELO at `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A` |
| **Explorer** | https://celoscan.io |

Constructor ABI args (Celo — once deployed):
```
000000000000000000000000e57f4773bd9c9d8b6cd70431117d353298b9f5bf  // hub = Self Hub
0000000000000000000000009d65433b3fe597c15a46d2365f8f2c1701eb9e4a  // owner
0000000000000000000000009d65433b3fe597c15a46d2365f8f2c1701eb9e4a  // feeRecipient
0000000000000000000000000000000000000000000000000000000000000064  // feeBps = 100
0000000000000000000000000000000000000000000000000000000000000012  // minAge = 18
```

---

## Contract Verification Instructions

### Base (via Etherscan V2 API)

Requires free Etherscan API key from https://etherscan.io/register

```bash
# Set your API key
export ETHERSCAN_API_KEY=YourKeyHere

# Run verification
npx ts-node contracts/verify.ts --chain base
```

Or manually on Basescan:
1. Go to https://basescan.org/address/0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0#code
2. Click "Verify and Publish"
3. Select: **Solidity (Standard-JSON-Input)**
4. Compiler: `v0.8.34+commit.80d5c536`
5. Optimization: **Yes**, 200 runs
6. Upload `contracts/EmailRemittanceVerifier.sol` as source
7. Constructor args: paste Base args above

### Celo (via Celoscan)

Same process at https://celoscan.io once deployed.

### Monad (via Monad Explorer)

Explorer: https://explorer.monad.xyz — check if they support source verification.

---

## Post-Deploy Configuration

### Set Attester for Base + Monad (admin-attestation mode)

```bash
# The backend wallet that will post identity attestations
# Call setAttester on each contract:
cast send 0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0 \
  "setAttester(address,bool)" \
  $BACKEND_WALLET true \
  --rpc-url https://mainnet.base.org \
  --private-key $WALLET_PRIVATE_KEY

cast send 0x7BC66eD8285b51F84D170F158aD162cA144F32c1 \
  "setAttester(address,bool)" \
  $BACKEND_WALLET true \
  --rpc-url https://rpc.monad.xyz \
  --private-key $WALLET_PRIVATE_KEY
```

### Register Self Verification Config (Celo only — after deploy)

```bash
# After Celo deployment, call registerVerificationConfig:
cast send $CELO_CONTRACT_ADDRESS \
  "registerVerificationConfig(uint8,bool)" \
  18 true \
  --rpc-url https://forno.celo.org \
  --private-key $WALLET_PRIVATE_KEY
```

### Update .env

```bash
BASE_CONTRACT_ADDRESS=0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0
MONAD_CONTRACT_ADDRESS=0x7BC66eD8285b51F84D170F158aD162cA144F32c1
CELO_CONTRACT_ADDRESS=<TBD>
```

---

## Security Notes

- All contracts deployed from `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`
- Owner = deployer. Transfer ownership to multisig when ready.
- Self Hub address is `immutable` — cannot be changed post-deploy
- Fee hard cap: 5% (MAX_FEE_BPS = 500)
- Emergency pause available via `setPaused(true)` from owner

---

*This file is the authoritative deployment record. Update when Celo deploys and when verification completes.*
