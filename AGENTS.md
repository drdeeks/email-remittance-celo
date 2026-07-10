# AGENTS.md — Known Bugs, Errors, Missing Components & Issues

> This document captures everything that is broken, missing, inconsistent, or not yet implemented.
> For the definitive system spec, see PROJECT_SPEC.md.

---

## Critical Issues

### 1. Backend Does Not Use On-Chain Contract
- **Status:** The backend uses throwaway wallets (`feeService.generateEscrowWallet()`) instead of calling `EmailRemittanceVerifier.createEscrow()`
- **Impact:** All escrow logic is off-chain. Contract is deployed but bypassed. On-chain fee (1%) is never exercised.
- **Fix needed:** Wire backend to call `createEscrow()` instead of generating throwaway wallets

### 2. Fee Mismatch Between On-Chain and Backend
- **Status:** On-chain `feeBps = 100` (1%), backend `PROTOCOL_FEE_PERCENT = 0.015` (1.5%)
- **Impact:** Two different fee rates exist. On-chain fee is 1%, backend charges 1.5%.
- **Fix needed:** Align fees — either set contract to 150 BPS or backend to 1%

### 3. No Admin/Manager Review System ✅
- **Status:** Implemented! Service mode sends email immediately. No admin dashboard, no manager approval, no review queue.
- **Impact:** Service mode (business/payroll) feature is incomplete. User explicitly required manual review before emails go out.
- **Fix needed:** Build admin review system with manager roles, approval workflow, weekly audit

### 4. No Gift Card Implementation
- **Status:** `FeeModel` type includes `'gift_card'` and `PayoutMethod` has `'giftcard'`, but zero implementation
- **Impact:** Gift card feature requested by user but does not exist
- **Fix needed:** Gift card provider integration, redemption logic, catalog UI, email templates

### 5. No 7-Day Refund with Storage Fee
- **Status:** `handleExpiredRemittances()` exists but does not deduct additional 1.5% storage fee. Refunds appear to return full amount.
- **Impact:** User specified additional 1.5% should be deducted on refund plus gas fees
- **Fix needed:** Implement storage fee deduction on expired remittances

---

## Missing Components

### 6. Auto-Generated Wallet Not in SendForm ✅
- **Status:** `walletService` exists but is not wired into `SendForm.tsx` for sender-side wallet generation
- **Impact:** Sender cannot auto-generate a wallet from the send form
- **Fix needed:** Add "Generate wallet for me" option to SendForm

### 7. No Recipient Verification Setup Guides
- **Status:** No setup guides, no install links for World App / Self App
- **Impact:** Recipients who need to verify don't know how to set up verification methods
- **Fix needed:** Add verification setup instructions with links to app stores

### 8. No Manager Dual Identity System ✅
- **Status:** Implemented! Dual identity verification (Self + wallet signature) for manager approval.
- **Impact:** Manager role system now works.
- **Fix needed:** Build manager invite, verify, assign flow with dual identity

### 9. No Weekly Admin Review Capability ✅
- **Status:** Implemented! Admin review dashboard with pending submissions queue.
- **Impact:** Business use case now supported.
- **Fix needed:** Admin dashboard with pending submissions queue

### 10. Claim Endpoint Mismatch
- **Status:** Frontend uses `GET /api/remittance/claim/:token`, backend expects different patterns
- **Impact:** Potential integration issues between frontend and backend
- **Fix needed:** Align frontend and backend claim endpoint signatures

---

## Broken/Incomplete Integrations

### 11. SelfVerificationQR Broken Imports
- **Status:** `SelfVerificationQR.tsx` imports `@/services/selfVerification.service` and `@/utils/logger` which don't exist in the frontend
- **Impact:** Component will fail at runtime
- **Fix needed:** Create missing modules or fix imports

### 12. World ID Must Be Real Integration (Required, not optional)
- **Status:** Frontend mock (`setTimeout(500)` + localStorage) removed; backend `worldIdVerification.service.ts` now verifies real IDKit proofs via the Worldcoin Developer Portal endpoint. Frontend uses `@worldcoin/idkit` `IDKitRequestWidget`.
- **Impact:** No longer a mock — proof is re-verified server-side. Operator requires REAL World ID (not mock).
- **Fix needed:** Provide `WORLDID_APP_ID`/`WORLDID_APP_SECRET`; the `/api/verification/worldid/rp-context` signing should use the real World ID app key (currently HMAC best-effort).

### 13. Monad Chain ID Inconsistency
- **Status:** `CHAIN_ID_TO_NAME` in SendForm uses `143`, claim page `CHAIN_NAME_TO_ID` uses `10143`, CoinGecko uses `10143`
- **Impact:** Chain resolution failures for Monad claims
- **Fix needed:** Standardize Monad chain ID across all code

### 14. Duplicate SendResult Interface
- **Status:** `SendResult` defined twice in `SendForm.tsx` (lines 17-27 and 74-85)
- **Impact:** TypeScript confusion, potential type conflicts
- **Fix needed:** Remove duplicate

### 15. Backend ABI Mismatch with Contract
- **Status:** `selfContract.service.ts` ABI includes functions (`attestIdentity`, `verifyIdentity`, `isMinimumAgeValid`, `isOfacValid`, `getFeeBps`) that don't exist in `EmailRemittanceVerifier.sol`
- **Impact:** Backend ABI is for a different/earlier contract version
- **Fix needed:** Update ABI to match deployed contract

### 16. Placeholder Claim Secret Hashing
- **Status:** `hashClaimSecret()` returns `'sha256$' + secret` placeholder instead of real SHA-256
- **Impact:** Security vulnerability — claim secrets not properly hashed
- **Fix needed:** Use real SHA-256 hashing

### 17. WalletService Logs Private Keys
- **Status:** `walletService.ts` has `console.log('Private key in NEW function:', privateKey)`
- **Impact:** Private keys exposed in logs — security vulnerability
- **Fix needed:** Remove console.log

---

## Inconsistencies

### 18. Two Parallel Fee Systems
- **Status:** `feeService.ts` (hardcoded 1.5%) and `feeEngine.ts` (database-driven) coexist
- **Impact:** `transactionController` uses `feeService`, `remittanceController` uses `feeEngine`
- **Fix needed:** Unify or clarify which is primary

### 19. Two Parallel Celo Services
- **Status:** `celoService.ts` (viem, multi-chain) and `celo.service.ts` (ethers, Celo-only) coexist
- **Impact:** Confusion about which to use. `celo.service.ts` has Mandate integration.
- **Fix needed:** Unify or clarify roles

### 20. Two Parallel Remittance Controllers
- **Status:** `transactionController.ts` (675 LOC, used by frontend) and `remittanceController.ts` (324 LOC, newer)
- **Impact:** Different API endpoints, different logic paths
- **Fix needed:** Merge or clarify primary controller

### 21. Frontend Vitest Not Configured
- **Status:** Vitest installed as devDependency but no `vitest.config.ts`, no test script in `frontend/package.json`
- **Impact:** Frontend tests cannot be run via `npm test`
- **Fix needed:** Configure Vitest

### 22. Jest Config Excludes src/ Tests
- **Status:** `jest.config.js` `testMatch: ['**/tests/**/*.test.ts']` excludes `src/services/feeDeduction.test.ts`
- **Impact:** Valuable fee deduction tests silently skipped
- **Fix needed:** Update jest.config.js to include `src/**/*.test.ts`

---

## Security Concerns

### 23. No Auth Middleware Wired
- **Status:** `src/middleware/auth.ts` exists with JWT auth but is not applied to any routes
- **Impact:** No authentication on API endpoints
- **Fix needed:** Wire auth middleware into routes

### 24. No Rate Limiter Applied
- **Status:** `src/middleware/rateLimiter.ts` (311 lines) exists but is not applied to routes
- **Impact:** No rate limiting on API endpoints
- **Fix needed:** Wire rate limiter into routes

### 25. Webhook Signature Verification TODO
- **Status:** `webhookController.ts` has TODO for Resend webhook signature verification
- **Impact:** Webhooks not cryptographically verified
- **Fix needed:** Implement webhook signature verification

### 26. Session Store Is In-Memory
- **Status:** `selfSessionStore.ts` uses a `Map` — sessions lost on restart, not shared across instances
- **Impact:** Sessions not persistent, not scalable
- **Fix needed:** Use database-backed session store

### 27. Emergency Withdraw Can Drain All Funds
- **Status:** `emergencyWithdraw()` has no per-escrow accounting — owner can withdraw deposited funds when paused
- **Impact:** Single point of trust for owner
- **Fix needed:** Consider per-escrow accounting or timelock

---

## Test Coverage Gaps

### 28. Zero Smart Contract Tests
- **Status:** No Hardhat/Foundry tests for `EmailRemittanceVerifier.sol`
- **Impact:** Core security mechanism untested
- **Fix needed:** Add comprehensive contract tests

### 29. Zero Controller Tests
- **Status:** `transactionController.ts` (675 LOC) — zero tests
- **Impact:** Core API layer untested
- **Fix needed:** Add controller tests

### 30. Zero Middleware Tests
- **Status:** Auth, rate limiter, validation middleware — zero tests
- **Impact:** Security boundaries untested
- **Fix needed:** Add middleware tests

### 31. Only 29.42% Backend Coverage
- **Status:** Jest coverage: 29.42% statements, 18.26% branches, 27.27% functions
- **Impact:** ~70% of backend untested
- **Fix needed:** Systematic test coverage improvement

---

## Missing Features Per User Requirements

### 32. Service Mode Admin Review
- User explicitly stated: "Send submitted → logged → requires manual review by admin/manager → emails only sent AFTER approval"
- Current: Email sent immediately, no review step

### 33. Manager Appointment System
- User: "Owner can appoint managers with management rights. Managers must verify AND sign a message with their personal wallet"
- Current: No manager system exists

### 34. Weekly Admin Review
- User: "Weekly admin review capability"
- Current: No code

### 35. Balance Management for Payroll
- User: "Can keep large balance for payroll functions"
- Current: Server wallet balance displayed but no management

### 36. Configurable Verification Requirements
- User: "Owner decides if recipients: require verification, don't require, or case-by-case basis"
- Current: Only `requireAuth` boolean on per-transaction basis

### 37. Gift Card Provider Integration
- User: "Gift cards: manage swap/conversion, show provider fees, wait times, confirmation email with gift card"
- Current: Only type definitions, no implementation

### 38. Auto-Generated Wallet Confirmation Step ✅
- **Status:** Implemented! Private key shown with confirmation required.
- **Impact:** User must confirm they've written it down.
- **Fix needed:** Auto-generated wallet: only on recipient selection, show private key once, confirmation required

### 39. Verification Setup Guides for Recipients
- User: "Recipients need to be informed HOW to set up verification methods with links"
- Current: No setup guides

### 40. Cancellation by Sender
- `cancelRemittance()` exists in service but endpoint may not be fully wired
- Frontend has no cancel UI

---

## Deploy Script Issues

### 41. Artifact Path Mismatch
- Deploy script expects `contracts/artifacts/EmailRemittanceVerifier.json`
- Actual artifacts use solcjs naming: `contracts_EmailRemittanceVerifier_sol_EmailRemittanceVerifier.bin`
- Fix: Combine artifacts or update deploy script path

### 42. Self Config Registration Not Automated
- `registerVerificationConfig()` must be called post-deploy on Celo
- Deploy script does not auto-call it
- Fix: Add post-deploy step or separate script

---

## Frontend Issues

### 43. Insufficient Balance Does Not Block Submission
- Red warning appears but send button remains enabled
- Fix: Disable button when insufficient balance

### 44. No Email Validation Beyond HTML5
- Only `type="email"` HTML attribute, no regex validation
- Fix: Add proper email validation

### 45. No Ethereum Address Validation on Claim
- Wallet input field has no `0x` prefix check or checksum verification
- Fix: Add address format validation

### 46. No Error Boundary
- Unhandled errors will crash the component tree
- Fix: Add React error boundary

### 47. TypeScript/ESLint Errors Ignored in Build
- `next.config.mjs` sets `ignoreDuringBuilds: true` and `ignoreBuildErrors: true`
- Fix: Address underlying errors

### 48. Legacy HTML Pages in public/
- `public/index.html` and `public/claim.html` hardcode Railway URL
- Likely stale/unused but still served
- Fix: Remove or update

### 49. Duplicate SendResult Interface in SendForm.tsx
- Lines 17-27 and 74-85 define the same interface
- Fix: Remove duplicate

---

## Test Quality Issues

### 50. Heavy Mocking Hides Real Bugs
- `walletService.test.ts` mocks entire module, only tests mock
- `celoService.test.ts` mocks `getBalance`, asserts mock return value
- Fix: Add integration tests with real service calls

### 51. E2E Tests Target Live Deployment
- Playwright runs against `https://email-remittance-pro.vercel.app` (production)
- Makes them unreliable for CI and dangerous for destructive operations
- Fix: Run against local dev server
