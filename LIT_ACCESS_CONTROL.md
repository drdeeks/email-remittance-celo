# LIT Protocol — MANDATE Integration

## Overview

**MANDATE** (Multi-chain Access with Necessary Disclosure And Transaction Enforcement) uses LIT Protocol to gate agent wallet access behind verified identity proofs. Only users who pass Self Protocol or World ID verification can trigger sends from the escrow agent wallet.

## How It Works

1. **Identity Gate**: User verifies via Self Protocol or World ID
2. **LIT Access Control Condition**: The verification result forms an ACC
3. **Encrypted Key Shards**: The escrow wallet's signing key is encrypted via LIT
4. **Conditional Decrypt**: Only users meeting the ACC can decrypt + sign
5. **Tamper-Proof**: No single party controls the wallet — LIT nodes enforce the policy

## Setup Instructions

### Step 1: Install LIT Protocol SDK

```bash
npm install @lit-protocol/lit-node-client @lit-protocol/auth-helpers @lit-protocol/constants @lit-protocol/types
```

### Step 2: Obtain LIT Access Controls

1. Go to https://litentry.com
2. Create a project
3. Obtain your `LIT_API_KEY` and `LIT_PROJECT_ID`

### Step 3: Configure Environment

Add to your `.env`:

```env
# LIT Protocol
LIT_API_KEY=your_lit_api_key
LIT_PROJECT_ID=your_project_id
LIT_NETWORK=datil-dev  # Use 'datil' for production
# Escrow wallet (the agent-controlled wallet)
ESCROW_PRIVATE_KEY=0x...
```

### Step 4: Create Access Control Conditions

Access Control Conditions define WHO can decrypt. Example for Self Protocol:

```typescript
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK } from '@lit-protocol/constants';

const litNodeClient = new LitNodeClient({
  litNetwork: LIT_NETWORK.DatilDev,
  debug: false,
});
await litNodeClient.connect();

// Self Protocol: nationality must match verified value
const selfAcc = [
  {
    conditionType: 'evmBasic',
    contractAddress: '',
    standardContractType: '',
    chain: 'ethereum',
    method: '',
    parameters: [':userAddress'],
    returnValueTest: {
      comparator: '=',
      value: '<verified_wallet_address>',
    },
  },
];

// World ID: must have valid ZK proof
const worldIdAcc = [
  {
    conditionType: 'evmBasic',
    contractAddress: '0x11e4610640EA283c25d304b19dB519F8B3c456eD', // World ID verifier
    standardContractType: 'ERC20',
    chain: 'optimism',
    method: 'balanceOf',
    parameters: [':userAddress'],
    returnValueTest: {
      comparator: '>',
      value: '0',
    },
  },
];
```

### Step 5: Encrypt Escrow Wallet Key

```typescript
import { encryptToString } from '@lit-protocol/encryption';

const escrowPrivateKey = process.env.ESCROW_PRIVATE_KEY;
const accessControlConditions = selfAcc; // or worldIdAcc

const encryptedKey = await encryptToString(
  litNodeClient,
  accessControlConditions,
  escrowPrivateKey
);

// Store encrypted key in database (safe — only verifiable users can decrypt)
await db.prepare('UPDATE settings SET value = ? WHERE key = ?')
  .run(encryptedKey, 'encrypted_escrow_key');
```

### Step 6: Decrypt & Sign (When User Claims)

```typescript
import { decryptToString } from '@lit-protocol/encryption';

const encryptedKey = await db.prepare('SELECT value FROM settings WHERE key = ?')
  .get('encrypted_escrow_key');

const decryptedKey = await decryptToString(
  litNodeClient,
  accessControlConditions,
  encryptedKey
);

// Now use decrypted key to sign transaction
const wallet = new ethers.Wallet(decryptedKey, provider);
const tx = await wallet.sendTransaction({
  to: recipientAddress,
  value: ethers.parseEther(amount),
});
```

## MANDATE Protocol Flow

```
┌─────────────────────────────────────────────────────────┐
│                    MANDATE Protocol                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. User Verifies (Self/World ID)                        │
│     ↓                                                     │
│  2. LIT Access Control Condition Generated                │
│     ↓                                                     │
│  3. Encrypted Signing Key Sharded to LIT Nodes            │
│     ↓                                                     │
│  4. User Presents Verification Proof                      │
│     ↓                                                     │
│  5. LIT Nodes Validate Proof → Return Key Shards          │
│     ↓                                                     │
│  6. User Reconstructs Signing Key → Signs Transaction     │
│     ↓                                                     │
│  7. Transaction Broadcast to Target Chain                 │
│                                                          │
│  Result: Only verified users can access escrow funds     │
└─────────────────────────────────────────────────────────┘
```

## Integration with Current Send Flow

The current `/api/remittance/send` endpoint should:

1. Verify Self Protocol session (already done via `validateSenderSession`)
2. Generate LIT Access Control Condition from verification result
3. Encrypt the per-remittance escrow private key with that ACC
4. Store the encrypted key with the remittance record
5. When recipient claims: decrypt escrow key → sign release transaction

**Current state**: The per-remittance escrow key is generated by `feeService.generateEscrowWallet()`. To add LIT gating:

```typescript
// In remittanceService.createRemittance(), after generating escrowPrivateKey:

const { litNodeClient } = require('../services/litClient');
const { encryptToString } = require('@lit-protocol/encryption');

// Build ACC based on the verification type used
const acc = verificationType === 'self'
  ? buildSelfAcc(verificationData)
  : buildWorldIdAcc();

const encryptedKey = await encryptToString(
  litNodeClient,
  acc,
  escrowPrivateKey
);

// Store encrypted key
db.prepare('UPDATE remittances SET encrypted_escrow_key = ? WHERE id = ?')
  .run(encryptedKey, remittanceId);
```

## Production Deployment Checklist

- [ ] LIT API key obtained and stored in `.env`
- [ ] `LIT_NETWORK` set to `datil` (production)
- [ ] Access Control Conditions tested on testnet
- [ ] Encrypted escrow key storage in place
- [ ] Decrypt-and-sign flow tested end-to-end
- [ ] Fallback flow documented (what if LIT nodes are slow?)
- [ ] Key rotation plan (what if escrow key is compromised?)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Error: LitNodeClient not ready` | Ensure `await litNodeClient.connect()` completes before using |
| `Access denied` | Verify the ACC matches exactly the user's verification state |
| `Invalid ciphertext` | Check that the same ACC is used for encrypt and decrypt |
| `Timeout` | LIT network may be under load — implement retry with backoff |

## References

- LIT Protocol Docs: https://developer.litprotocol.com
- LIT JS SDK: https://github.com/LIT-Protocol/js-sdk
- LIT Access Control Conditions: https://developer.litprotocol.com/accesscontrol/conditiontypes
