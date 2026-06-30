# Email Remittance Pro — Definitive Project Specification

> Absolute source of truth. Every feature, flow, and attribute. This document describes the complete system.

---

## 1. Product Overview

Email-native crypto remittance platform. Send cryptocurrency to anyone via email. Recipients don't need a wallet — one can be auto-generated. Built for the Synthesis Hackathon 2026 by Titan Agent (autonomous) + Dr Deeks (operator).

**Chains:** Celo (42220), Base (8453), Monad (143)
**Fee:** 1.5% flat protocol fee on all transfers
**Identity:** Self Protocol (ZK passport), World ID, admin attestation
**Email:** Resend API with HTML + text templates

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js 14)                        │
│   SendForm (816 LOC)  │  ClaimPage (502 LOC)  │  SelfVerificationQR  │
│   ChainSelector       │  AuthToggle           │  Providers (wagmi)    │
└──────────────────────────┬────────────────────────────────────────────┘
                           │ REST API (JSON)
┌──────────────────────────┴────────────────────────────────────────────┐
│                          BACKEND (Express.js)                          │
│   transactionController (675 LOC)  │  remittanceController (324 LOC)  │
│   feeService │ remittanceService │ walletService │ emailNotifier      │
│   celoService │ swapService │ uniswapService │ selfVerification      │
│   mandateService │ selfSessionStore │ feeEngine                      │
│   SQLite (better-sqlite3) — remittances table                         │
└──────────────────────────┬────────────────────────────────────────────┘
                           │ viem / ethers.js
┌──────────────────────────┴────────────────────────────────────────────┐
│                    SMART CONTRACTS (Solidity)                           │
│   EmailRemittanceVerifier.sol — DEPLOYED (3 chains)                   │
│   WorldIDRemittanceVerifier.sol — NOT DEPLOYED (design doc)           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Smart Contracts

### 3.1 EmailRemittanceVerifier.sol

**Status:** Deployed to Celo, Base, Monad. Verified on Celoscan and Basescan.

**Inheritance:** `ReentrancyGuard` (inline), `Ownable` (inline)

**Constants:**
- `EXPIRY_PERIOD = 30 days` (2,592,000 seconds)
- `MAX_FEE_BPS = 500` (5% hard cap)
- `NATIVE_TOKEN = address(0)`
- `SCOPE_SEED = "email-remittance"`

**Escrow Struct:**
```solidity
struct Escrow {
    address sender;
    address token;           // address(0) = native
    uint256 amount;          // gross amount deposited
    uint256 fee;             // protocol fee (deducted on claim)
    bytes32 recipientHash;   // keccak256(recipientEmail)
    bytes32 claimToken;      // keccak256(secret)
    bool    requireAuth;     // true = Self ZK required
    uint40  expiresAt;       // block.timestamp + 30 days
    EscrowStatus status;     // PENDING → CLAIMED | RECLAIMED
    address claimedBy;
}
```

**Functions:**

| Function | Caller | Modifiers | Description |
|----------|--------|-----------|-------------|
| `constructor(hub, owner, feeRecipient, feeBps, minAge)` | — | — | Deploy. Sets immutables. Validates feeBps ≤ 500 |
| `createEscrow(recipientHash, claimTokenHash, token, amount, requireAuth)` | Sender | `payable whenNotPaused nonReentrant` | Deposit native/ERC-20. Fee computed inline. Returns escrowId |
| `claimOpen(escrowId, claimSecret, recipient)` | Recipient | `whenNotPaused nonReentrant` | Claim with plain secret (no auth) |
| `claimWithSelfProof(escrowId, proofPayload, userContextData)` | Recipient (Celo) | `whenNotPaused nonReentrant` | ZK proof → Self Hub → callback `onVerificationSuccess` |
| `onVerificationSuccess(output, userData)` | Self Hub only | — | Callback: decode output, check nullifier, execute claim |
| `claimWithAdminAttestation(escrowId, claimSecret, recipient)` | Recipient (Base/Monad) | `whenNotPaused nonReentrant` | Requires `adminAttested[escrowId]` when requireAuth=true |
| `postAdminAttestation(escrowId)` | Attester | — | Records that attester verified identity off-chain |
| `reclaimExpired(escrowId)` | Sender | `nonReentrant` | Full refund after 30 days, no fee deducted |
| `registerVerificationConfig(minAge, ofac)` | Owner | — | Register Self ZK config with hub (Celo only) |
| `setFeeConfig(feeBps, feeRecipient)` | Owner | — | Update fee (0–500 BPS). Affects future escrows |
| `setAttester(attester, enabled)` | Owner | — | Add/remove authorized attesters |
| `setPaused(paused)` | Owner | — | Pause/unpause state-changing functions |
| `emergencyWithdraw(token, amount, to)` | Owner | — | Emergency withdrawal. Requires paused=true |

**View Functions:**
- `getEscrow(escrowId)` → full Escrow struct
- `escrowIdFromClaimToken(claimTokenHash)` → escrowId
- `isClaimable(escrowId)` → PENDING + not expired

**Events:**
- `EscrowCreated(escrowId, sender, token, amount, recipientHash, requireAuth, expiresAt)`
- `EscrowClaimed(escrowId, claimedBy, netAmount, fee)`
- `EscrowReclaimed(escrowId, sender, amount)`
- `AdminAttestationPosted(escrowId, attester)`
- `AttesterUpdated(attester, enabled)`
- `FeeConfigUpdated(feeBps, feeRecipient)`
- `Paused(paused)`

**Security:**
- ReentrancyGuard on createEscrow, all claim functions, reclaimExpired
- Nullifier replay protection (Self nullifiers stored in `usedNullifiers`)
- Immutable Self Hub address (prevents hub swap attack)
- Collision check on deterministic escrowId
- Emergency pause + withdraw (only when paused)

**Deployments:**

| Chain | Address | Fee BPS | Self Hub | Verified |
|-------|---------|---------|----------|----------|
| Celo (42220) | `0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0` | 100 (1%) | `0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF` | Yes |
| Base (8453) | `0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0` | 100 (1%) | `address(0)` | Yes |
| Monad (143) | `0x7BC66eD8285b51F84D170F158aD162cA144F32c1` | 100 (1%) | `address(0)` | Pending |

**Deployer/Owner:** `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`

### 3.2 WorldIDRemittanceVerifier.sol

**Status:** Not deployed. Design document/prototype. No compiled artifacts.

**Additional vs EmailRemittanceVerifier:**
- `VerificationMethod` enum: NONE, WORLD_ID, HUMAN_PASSPORT, EMAIL_ONLY
- `verificationScore` field on escrow
- World ID ZK proof verification via `IWorldID.verifyProof()`
- Human Passport score-based verification (min score 20)
- Email-only rate-limited fallback (5/day per address)

### 3.3 Deploy Script

```
npx ts-node contracts/deploy.ts --chain celo|base|monad|all
```

**Required env:** `DEPLOYER_PRIVATE_KEY`, `FEE_RECIPIENT`
**Optional:** `FEE_BPS` (default 100), `MIN_AGE` (default 18)

---

## 4. Backend Services

### 4.1 Core Remittance

| Service | File | Role |
|---------|------|------|
| **FeeService** | `feeService.ts` | Per-remittance throwaway escrow wallets, 1.5% fee quotes, deposit watching (polls every 5s, 5min timeout), fund forwarding |
| **FeeEngine** | `feeEngine.ts` | Database-driven fee config. Formula: `base_fee_usd + (percentage_fee_bps / 10000) * amount_usd`, clamped to min/max. Per chain/token. |
| **RemittanceService** | `remittanceService.ts` | Create remittances, claim remittances, generate claim tokens/secrets, handle expired, idempotency keys |
| **WalletService** | `walletService.ts` | Generate throwaway wallets via `viem/accounts`. Returns address, private key, step-by-step import instructions for MetaMask, Valora, etc. |
| **EmailNotifier** | `emailNotifier.ts` | Claim, expired, confirmation emails via Resend API with HTML + plain text templates |

### 4.2 Blockchain

| Service | File | Role |
|---------|------|------|
| **ChainService** | `celoService.ts` | Multi-chain (Celo/Base/Monad) via viem. Native transfers, balance queries, transaction lookups, LI.FI cross-chain bridging, token registry |
| **CeloService** | `celo.service.ts` | Celo-only via ethers.js. Mandate.md policy validation for all transfers |
| **SwapService** | `swapService.ts` | Same-chain Uniswap swaps via SwapRouter02. Native→Token, Token→Token, Token→Native |
| **UniswapQuoteService** | `uniswapQuoteService.ts` | On-chain swap quotes via Quoter V2 (no API key needed). Tries fee tiers 0.05%, 0.3%, 1% |
| **UniswapService** | `uniswapService.ts` | Uniswap Trading API (with key) + LI.FI public fallback (no key). Cross-chain bridges |

### 4.3 Identity Verification

| Service | File | Role |
|---------|------|------|
| **SelfVerificationService** | `selfVerification.service.ts` | Self Protocol ZK passport verification via `@selfxyz/core` |
| **SelfSenderVerificationService** | `selfSenderVerification.service.ts` | Sender-side identity verification. Requires name, DOB, nationality, OFAC screening |
| **SelfEnterpriseEnhancedService** | `selfEnterpriseEnhancedService.ts` | Enterprise verification routing. Processes NONE/SELF/WORLDID methods with dry-run mode |
| **SelfSessionStore** | `selfSessionStore.ts` | In-memory session store. Issues 30-minute server-side session tokens after successful ZK verification |

### 4.4 Policy & Compliance

| Service | File | Role |
|---------|------|------|
| **MandateService** | `mandateService.ts` | Mandate.md policy validation. Validates all transfers against user-defined policies. 10s timeout, fail-open on timeout/unreachable |

---

## 5. Frontend

### 5.1 Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Send form page |
| `/claim/[token]` | `src/app/claim/[token]/page.tsx` | Recipient claim page (dynamic) |

### 5.2 Components

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **SendForm** | `components/SendForm.tsx` | 816 | Main send interface — wallet mode, chain, tokens, verification, send |
| **ChainSelector** | `components/ChainSelector.tsx` | ~40 | Chain picker buttons (Celo/Base/Monad) |
| **AuthToggle** | `components/AuthToggle.tsx` | ~30 | Secure vs Open auth mode toggle |
| **SelfVerificationQR** | `components/SelfVerificationQR.tsx` | ~150 | Self Protocol QR verification modal |
| **Providers** | `components/Providers.tsx` | ~30 | Wagmi + RainbowKit + React Query wrapper |

### 5.3 Token Configuration

**Sender Tokens:**

| Chain | Tokens |
|-------|--------|
| Celo (42220) | CELO (native), USDC (`0xceba9300f2b948710d2653dd7b07f33a8b32118c`, 6 decimals), cUSD (`0x765de816845861e75a25fca122bb6898b8b1282a`, 18 decimals) |
| Base (8453) | ETH (native), USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, 6 decimals) |
| Monad (143) | MON (native) |

**Recipient Tokens:**

| Chain | Same-Chain | Cross-Chain |
|-------|------------|-------------|
| Celo | CELO, cUSD, USDC | base→ETH, base→USDC |
| Base | ETH, USDC, USDT | celo→CELO, celo→cUSD |
| Monad | MON | celo→CELO |

### 5.4 SwapRouter02 Addresses

| Chain | Address |
|-------|---------|
| Base | `0x2626664c2603336E57B271c5C0b26F421741e481` |
| Celo | `0x5615CDAb10dc425a742d643d949a7F474C01abc4` |

---

## 6. Two Operating Modes

### 6.1 Service Wallet Mode (`walletMode === 'service'`)

**End State:**
1. Owner/admin registers and configures the system (verification required, recipient defaults)
2. Owner can appoint managers — managers must verify identity AND sign a message with their wallet (dual identity)
3. Employee/sender submits send request → logged in system
4. Admin/manager reviews submission → signs off on verified submissions
5. Funds deposited to escrow smart contract (1.5% fee taken immediately)
6. Claim email sent to recipient ONLY AFTER admin/manager approval
7. Recipient verifies (if required), selects token, claims

**Current Implementation:**
- Sender verifies via Self Protocol (ZK passport) → 30-min session token
- Backend validates session token server-side
- Server wallet funds the escrow
- Email sent immediately (no admin review step)
- `requireAuth` controls recipient verification requirement

### 6.2 Personal Wallet Mode (`walletMode === 'personal'`)

**End State:**
1. User connects wallet via RainbowKit
2. User signs ownership confirmation message
3. User fills form, selects tokens, optionally requires recipient verification
4. Funds sent to escrow from user's wallet
5. Email sent IMMEDIATELY on deposit confirmation (no review)
6. Recipient verifies (if required), selects token, claims

**Current Implementation:**
- Wallet connection via RainbowKit
- Ownership signature: "Confirm ownership for Email Remittance Pro"
- Frontend sends TX to escrow, backend verifies on-chain
- Email sent immediately
- Optional `requireAuth` per-send

### 6.3 Comparison

| Aspect | Service Mode | Personal Mode |
|--------|-------------|---------------|
| Who funds | Server wallet | Sender's wallet |
| Sender identity | Self Protocol ZK | Wallet signature |
| Admin review | Required (manual approval) | Not needed |
| Manager system | Yes (dual identity) | No |
| Email timing | After admin approval | After deposit confirmed |
| Gas paid by | Sender (deposit) + Recipient (claim) | Sender (deposit) + Recipient (claim) |
| Use case | Payroll, business | Individual remittances |

---

## 7. Fee Structure

### 7.1 Protocol Fee (1.5%)

```
On Deposit:
  protocolFee = amount × 0.015
  senderDeposits = amount + protocolFee
  escrowHolds = amount
  platformKeeps = protocolFee

On Claim:
  recipientGets = amount (full — pays own withdrawal gas)
  platformKeeps = protocolFee (retained from deposit)

On Refund (7 days expired):
  storageFee = amount × 0.015 (additional)
  refundAmount = amount − storageFee − gasFeesForReturn
  platformKeeps = protocolFee + storageFee = amount × 0.03 total
```

### 7.2 Gas Model

- **Deposit:** Sender pays gas to send funds TO escrow
- **Claim:** Recipient pays gas to withdraw FROM escrow
- **Platform:** NEVER pays gas
- **Estimates:** Celo ~$0.001, Base ~$0.05, Monad ~$0.002

### 7.3 Fee Engine (Database-Driven)

Per chain/token configuration:
```
fee = base_fee_usd + (percentage_fee_bps / 10000) × amount_usd
clamped to [min_fee_usd, max_fee_usd]
```

Default: base=$0.50, 150 BPS (1.5%), gas_sponsor_limit=$5

---

## 8. Swap and Bridge System

### 8.1 Same-Chain Swaps (SwapService)

- Uniswap SwapRouter02 via ethers.js
- Supports: Native→Token, Token→Token, Token→Native
- Quoter V2 on-chain quotes (no API key needed)
- Auto-approval for ERC-20 inputs
- Default slippage: 0.5%
- Platform fee: 1.5% deducted from output when `deductFee: true`

### 8.2 Cross-Chain Bridges (LI.FI)

- Routes: Celo↔Base, Celo↔Monad, Base↔Monad
- LI.FI API (`li.quest/v1/quote`) aggregates Squid, Stargate, Axelar
- Backend executes bridge using server wallet
- Bridge TX hash stored in remittance record

### 8.3 Uniswap Trading API

- With `UNISWAP_API_KEY`: Full quote + order execution
- Without API key: Falls back to LI.FI public API for quotes only

---

## 9. Identity Verification

### 9.1 Three Methods

| Method | Status | Use |
|--------|--------|-----|
| NONE | Implemented | No verification, anyone with link can claim |
| SELF | Implemented | Self Protocol ZK passport proof |
| WORLDID | Mock only | World ID ZK proof (no real SDK) |

### 9.2 Sender Verification (Service Mode)

1. Frontend builds Self App: `appName="Email Remittance Pro"`, `scope="email-remittance-sender"`, disclosures: name, DOB, nationality, OFAC
2. User scans passport/ID via Self mobile app
3. ZK proof generated on device, sent to callback endpoint
4. Backend verifies, creates session (30-min TTL)
5. Session token sent with `/send` payload, validated server-side

### 9.3 Recipient Verification (Claim Side)

**On Celo (Self Hub):**
1. Recipient clicks claim link → Self QR code displayed
2. User completes ZK proof in Self app
3. Frontend calls `claimWithSelfProof()` on contract
4. Contract forwards to Self Hub → callback → funds released

**On Base/Monad (Admin Attestation):**
1. Backend verifies identity off-chain via Self SDK
2. Backend wallet calls `postAdminAttestation(escrowId)` on contract
3. Recipient calls `claimWithAdminAttestation()` on contract
4. Contract checks `adminAttested` → funds released

### 9.4 Dual Identity for Managers

- Verification: Self Protocol ZK proof (identity)
- Wallet signature: Signs message with personal wallet (ownership)
- Both required for manager operations
- Manager appointments require owner approval

---

## 10. Transaction Flows

### 10.1 Send Flow

```
1. Frontend → POST /api/remittance/send
   Body: { senderEmail, recipientEmail, amount, chain, walletMode,
           senderSessionToken, senderWallet, fundingTxHash,
           receiverToken, senderToken, requireAuth, sender_message }

2. Backend validates:
   - Email format (RFC 5322)
   - Amount > 0
   - Service mode: validates session token (30-min TTL)
   - Personal mode: verifies on-chain TX (destination, amount, sender)

3. FeeService generates:
   - Throwaway escrow wallet (per-remittance)
   - Fee quote: amount + 1.5% = sendAmount

4. RemittanceService creates record:
   - status: 'pending'
   - escrow_address, escrow_private_key stored
   - claim_token (UUID) generated
   - expires_at: 7 days from now

5. EmailNotifier sends claim email to recipient

6. Response: { remittanceId, claimToken, claimUrl, escrowAddress, sendAmount }
```

### 10.2 Claim Flow

```
1. Recipient clicks claim link → /claim/{token}
2. Frontend → GET /api/remittance/status/{token}
   Returns: { amount, chain, sender, status, expiry, requireAuth }

3. If requireAuth=true → Self Protocol verification

4. Recipient selects wallet option:
   - Connect wallet (RainbowKit)
   - Paste address
   - "Generate wallet for me"

5. Recipient selects output token (may differ from sender token/chain)

6. Frontend → GET /api/remittance/claim/{token}?recipientWallet={address}

7. Backend:
   - Validates claim token, expiry, status
   - If no wallet provided: generates via walletService
   - If cross-chain token: executes bridge via LI.FI
   - If different token: executes swap via Uniswap
   - Transfers funds from escrow → recipient
   - Sends claim confirmation email to sender

8. Response: { txHash, wallet (if generated), privateKey (if generated) }
```

### 10.3 Refund/Expiry Flow

```
1. 7 days pass without claim
2. handleExpiredRemittances() detects expired remittances
3. Additional 1.5% storage fee deducted
4. Gas fees for return transfer deducted
5. Remaining funds returned to sender
6. Expired notification email sent to sender
```

### 10.4 Gift Card Flow (Intended)

```
1. Sender or recipient selects "gift card" as payout method
2. Recipient selects gift card provider on claim page
3. System shows: provider fee, total amount after fees, estimated delivery time
4. Recipient confirms selection
5. Backend swaps crypto to gift card via provider API
6. Confirmation email with gift card code + instructions
```

---

## 11. Wallet Generation

### 11.1 Throwaway Escrow Wallets

- Generated per-remittance by `feeService.generateEscrowWallet()`
- Fresh random private key via `viem/accounts/generatePrivateKey()`
- Address derived via `privateKeyToAccount()`
- Private key stored with remittance record
- Abandoned after claim or refund

### 11.2 Auto-Generated Recipient Wallets

- Triggered when recipient selects "Generate wallet for me"
- Same `viem/accounts` generation
- Returns: address, private key, import instructions
- Instructions for: MetaMask, Valora, general wallets
- **Private key shown ONCE** with prominent "SAVE THIS" warning
- User must confirm they've written it down before proceeding
- Works in both SendForm (sender-side) and ClaimPage (recipient-side)

### 11.3 Server Wallet

- `WALLET_PRIVATE_KEY` environment variable
- `0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A`
- Used for: service mode funding, bridge execution, swap execution
- Multi-chain wallet clients via viem

---

## 12. Email Notifications

### 12.1 Claim Email (to Recipient)

**Trigger:** Personal: immediately on deposit confirmed. Service: after admin/manager approval.
**Subject:** `You've received {amount} {token} on {chain}!`
**Contents:** Gradient header, amount box, sender name, memo, details table (sender, network, token, expiry), CTA "Claim Your Funds", security notice, claim secret, claim link.

### 12.2 Claim Confirmation (to Sender)

**Trigger:** When recipient successfully claims.
**Subject:** `Remittance claimed - {amount} {token} delivered`
**Contents:** Confirmation of delivery, TX hash, block explorer link.

### 12.3 Expiration Notification (to Sender)

**Trigger:** After 7 days without claim.
**Subject:** `Remittance expired - {amount} {token} returned`
**Contents:** Notification of return, storage fee deducted, no action required.

### 12.4 Recovery Email

**Trigger:** On demand (`POST /api/remittance/recover/:id`).
**Action:** Re-sends claim email for pending remittances.

---

## 13. Database

### 13.1 Active Schema (SQLite)

```sql
CREATE TABLE remittances (
  id TEXT PRIMARY KEY,
  claim_token TEXT UNIQUE NOT NULL,
  sender_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  amount_celo TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  escrow_tx_hash TEXT,
  claim_tx_hash TEXT,
  recipient_wallet TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  claimed_at INTEGER,
  require_auth INTEGER DEFAULT 0,
  chain TEXT DEFAULT 'celo',
  self_verification_id TEXT,
  self_verified INTEGER DEFAULT 0,
  email_sent INTEGER DEFAULT 0,
  fee_model TEXT DEFAULT 'standard',
  escrow_address TEXT,
  sender_wallet TEXT,
  fee_amount TEXT DEFAULT '0',
  deposit_tx_hash TEXT,
  deposit_confirmed INTEGER DEFAULT 0,
  receiver_token TEXT DEFAULT NULL,
  sender_token TEXT DEFAULT NULL,
  sender_message TEXT DEFAULT NULL,
  sender_verification_type TEXT DEFAULT NULL,
  sender_verified_name TEXT DEFAULT NULL,
  sender_verified_nationality TEXT DEFAULT NULL,
  sender_verified_ethnicity TEXT DEFAULT NULL,
  escrow_agent_wallet TEXT DEFAULT NULL,
  cross_chain_tx_hashes TEXT DEFAULT NULL,
  storage_fee TEXT DEFAULT '0',
  returned_to_sender INTEGER DEFAULT 0
);
```

### 13.2 Planned PostgreSQL Schema (scripts/schema.sql)

Normalized tables: users, email_verifications, transactions, self_verifications, email_logs, audit_logs.

---

## 14. API Routes

### 14.1 Transaction Routes (Primary — used by frontend)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/remittance/send` | Create remittance |
| `GET` | `/api/remittance/claim/:token` | Claim remittance |
| `GET` | `/api/remittance/service-wallet` | Server wallet address + balance |
| `GET` | `/api/remittance/:id` | Remittance status by ID |
| `POST` | `/api/remittance/demo` | Create demo remittance |
| `GET` | `/api/remittance/fee-quote` | Fee quote |
| `GET` | `/api/remittance/status/:token` | Pre-claim info (no auth) |
| `POST` | `/api/remittance/verify/:token` | Mark as Self-verified |
| `POST` | `/api/remittance/recover/:id` | Re-send claim email |
| `GET` | `/api/remittance/bridge/routes` | Supported bridge paths |
| `GET` | `/api/remittance/bridge/quote` | Bridge quote |
| `POST` | `/api/remittance/bridge` | Execute bridge |
| `POST` | `/api/remittance/uniswap/quote` | Uniswap swap quote |
| `POST` | `/api/remittance/uniswap/swap` | Execute Uniswap swap |
| `POST` | `/api/remittance/uniswap/bridge` | Cross-chain via Uniswap |
| `GET` | `/api/remittance/quote` | On-chain swap quote (Quoter V2) |
| `GET` | `/api/remittance/tokens` | Supported tokens for chain |
| `POST` | `/api/remittance/swap/execute` | Execute swap (server-side) |

### 14.2 Remittance Routes (Newer — DB-backed)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/remittances/create` | Create remittance |
| `GET` | `/api/remittances/preview-fee` | Preview fee |
| `GET` | `/api/remittances/claim/:claimToken` | Get by claim token |
| `POST` | `/api/remittances/claim` | Claim remittance |
| `GET` | `/api/remittances/sender/:email` | Get by sender |
| `GET` | `/api/remittances/recipient/:email` | Get by recipient |
| `DELETE` | `/api/remittances/:id/cancel` | Cancel pending |

### 14.3 Verification Routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/verification/select` | Verification method selector |
| `POST` | `/api/verification/` | Enterprise verification |
| `GET` | `/api/verification/status/:token` | Verification status |
| `POST` | `/api/verification/webhooks/self` | Self Enterprise webhook |

### 14.4 Self Routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/self/initialize` | Initialize Self on chain |
| `GET` | `/api/self/status` | Self status |
| `GET` | `/api/self/config` | Frontend config for Self |
| `POST` | `/api/self/verify-proof` | Verify ZK proof |

### 14.5 Health Routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health/` | Basic health |
| `GET` | `/health/integrations` | Full integration status |
| `GET` | `/health/ready` | Readiness |
| `GET` | `/health/live` | Liveness |

---

## 15. Deployment

### 15.1 Smart Contract

```
npx ts-node contracts/deploy.ts --chain celo|base|monad|all
```

Post-deploy: set attester (Base/Monad), register verification config (Celo), update .env, verify on explorers, transfer ownership to multisig.

### 15.2 Backend

- Railway (backend URL: `https://email-remittance-pro.up.railway.app`)
- Env vars: WALLET_PRIVATE_KEY, RESEND_API_KEY, SELF_APP_ID, SELF_APP_SECRET, VENICE_API_KEY, BASE_URL, FRONTEND_URL

### 15.3 Frontend

- Vercel (frontend URL: `https://email-remittance-pro.vercel.app`)
- Backend rewrites configured in vercel.json
- WalletConnect Project ID: `517a14b6d4785b327159fecafa4dd240`

---

## 16. Environment Variables

```
# Core
NODE_ENV=production
PORT=3000
DATABASE_URL=sqlite:./remittance.db

# Blockchain
CELO_PROVIDER_URL=https://forno.celo.org
WALLET_PRIVATE_KEY=0x...
SERVER_WALLET_ADDRESS=0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A

# Fees
PLATFORM_FEE_PERCENTAGE=1.5
STORAGE_FEE_PERCENTAGE=1.5

# Email
RESEND_API_KEY=...
DEFAULT_FROM_EMAIL=no-reply@yourdomain.com

# Self Protocol
BASE_SELF_CONTRACT=0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0
MONAD_SELF_CONTRACT=0x7BC66eD8285b51F84D170F158aD162cA144F32c1
CELO_SELF_CONTRACT=0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0
SELF_ATTESTER_ADDRESS=0x38be03139523EE998952D21110115f23AE54b1f7
SELF_APP_ID=...
SELF_APP_SECRET=...
SELF_API_KEY=... (Enterprise SDK)
SELF_FLOW_ID=... (Enterprise SDK)

# Uniswap & LI.FI
UNISWAP_API_KEY=...
LI_FI_API_KEY=...

# World ID
WORLDID_APP_ID=...
WORLDID_APP_SECRET=...

# Security
SESSION_SECRET=...
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 17. Live Infrastructure

| Service | URL | Branch |
|---------|-----|--------|
| Backend | `https://email-remittance-pro.up.railway.app` | afterwork |
| Frontend | `https://email-remittance-pro.vercel.app` | afterwork |

### Live Proof (Celo Mainnet)

| TX | Hash |
|----|------|
| Send to escrow | `0x835a196c2f623fb7255cfb744226683697c4b7b8a0b7c3b448f3c47d49011f96` |
| Claim by Dr Deeks | `0x286065753240aac433f3c69f7af57d94fb4d73ad507cd088ff5a230807a1bb02` |
| Bridge TX (Base→Celo) | 0.000758 ETH → 19.5 CELO via LI.FI/Squid in 16s |

### Agent Identity (ERC-8004)

| Chain | Token ID | Address |
|-------|----------|---------|
| Base | 30260 | `0x12F1B38DC35AA65B50E5849d02559078953aE24b` (drdeeks.base.eth) |
| Monad | 8368 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |

---

## 18. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, wagmi, RainbowKit, viem |
| Backend | Node.js 22, Express.js, TypeScript, SQLite (better-sqlite3) |
| Blockchain | Celo + Base + Monad (viem primary, ethers.js secondary) |
| Email | Resend API |
| Identity | Self Protocol (ZK passport via `@selfxyz/core`, `@selfxyz/enterprise-sdk`), World ID (mock) |
| Policy | Mandate.md (transaction validation) |
| Swaps | Uniswap SwapRouter02 + Quoter V2, Uniswap Trading API |
| Bridges | LI.FI (aggregates Squid, Stargate, Axelar) |
| Testing | Jest (backend), Vitest (frontend), Playwright (E2E) |
| Deployment | Railway (backend), Vercel (frontend) |
