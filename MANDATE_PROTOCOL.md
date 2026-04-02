# MANDATE Protocol — Agent-Controlled Wallet Workflows

## LIT Protocol Integration Guide

### Overview
All agent-controlled wallet workflows are governed by the MANDATE protocol, which consists of:
1. **Policy validation** via Mandate.md API
2. **Identity verification** via Self Protocol (ZK proofs)
3. **Transaction signing** via LIT Protocol (threshold cryptography)

### How It Works

```
Sender → [Identity Check: Self Protocol] 
       → [Policy Check: Mandate.md] 
       → [Signing: LIT Protocol] 
       → [On-chain: Celo/Base/Monad]
```

### LIT Protocol Setup Steps

1. **Install LIT SDK**
   ```bash
   npm install @lit-protocol/lit-node-client @lit-protocol/auth-helpers @lit-protocol/constants
   ```

2. **Configure LIT Node Client**
   ```typescript
   import { LitNodeClient } from '@lit-protocol/lit-node-client';
   import { LIT_NETWORK } from '@lit-protocol/constants';

   const litNodeClient = new LitNodeClient({
     litNetwork: LIT_NETWORK.DatilDev, // or Datil for production
     debug: false,
   });
   await litNodeClient.connect();
   ```

3. **Generate Agent-Controlled Wallet via LIT**
   ```typescript
   import { createSiweMessage, generateAuthSig } from '@lit-protocol/auth-helpers';

   // Auth via Ethereum wallet
   const authSig = await generateAuthSig({
     signer: ethersSigner,
     expiration: '24 hours',
   });

   // Derive key from access control conditions
   const pkp = await litNodeClient.createWithEthEoa({
     authSig,
     litActionCode: `
       const go = async () => {
         // Agent-controlled signing logic
       };
       go();
     `,
   });
   ```

4. **Agent Escrow Wallet (LIT-Signed)**
   - Server wallet private key is split via threshold cryptography across LIT nodes
   - No single node can spend — requires policy conditions + valid session
   - Each transaction must pass:
     a. Mandate.md policy validation
     b. Self Protocol identity verification
     c. Time-based access controls

5. **Transaction Flow**
   ```
   1. Sender initiates remittance
   2. Mandate.md validates: amount, frequency, recipient, purpose
   3. Self Protocol verifies: identity, age, OFAC
   4. LIT Protocol signs transaction via access control conditions
   5. Transaction submitted to chain (Celo/Base/Monad)
   6. All TX hashes recorded in cross_chain_tx_hashes
   ```

### Access Control Conditions

```typescript
const accessControlConditions = [
  {
    conditionType: 'evmBasic',
    contractAddress: '',
    standardContractType: '',
    chain: 'ethereum',
    method: '',
    parameters: [
      ':userAddress',
    ],
    returnValueTest: {
      comparator: '=',
      value: '0xYOUR_AGENT_ADDRESS',
    },
  },
  {
    conditionType: 'evmBasic',
    contractAddress: MANDATE_POLICY_CONTRACT,
    standardContractType: 'erc20',
    chain: 'celo',
    method: 'isSenderVerified',
    parameters: [':userAddress'],
    returnValueTest: {
      comparator: '=',
      value: 'true',
    },
  },
];
```

### Security Model

- **Sender Identity**: ZK proof via Self Protocol (no PII transmitted)
- **Policy Enforcement**: Mandate.md circuit breakers + rate limits
- **Key Management**: LIT threshold signatures (no single point of failure)
- **Audit Trail**: All actions logged with agent IDs and operator wallets
- **Auto-Disconnect**: Wallet sessions expire on browser close

### Verification Requirements

**Service Wallet Mode (Agent Escrow):**
- ✅ Self Protocol verification (name, age, nationality, OFAC)
- ✅ Mandate.md policy validation
- ✅ LIT Protocol signing

**Personal Wallet Mode:**
- ✅ MetaMask signature verification (proves wallet ownership)
- ✅ Mandate.md policy validation
- Direct on-chain transfer to escrow address

---

## Cross-Chain Transaction Tracking

All cross-chain operations display the complete chain of events:
1. Initial deposit TX hash
2. Swap TX hash (if on-chain swap)
3. Bridge TX hash (if cross-chain)
4. Final delivery TX hash

Each hash is clickable and opens the respective block explorer.

## Supported Chains

| Chain | Chain ID | Native Token | Explorer |
|-------|----------|--------------|----------|
| Celo | 42220 | CELO | celoscan.io |
| Base | 8453 | ETH | basescan.org |  
| Monad | 143 | MON | monadscan.com |

## Token Registry

Each chain supports native + ERC-20 tokens. See `src/config/tokens.ts` for full registry.
