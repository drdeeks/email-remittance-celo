# Email Remittance Pro - Enhancement Plan (2026-04-02)

## Dr Deeks' Requirements

### 1. Verification Method Enforcement
- Currently: Self Protocol verification exists but wasn't required in test
- Fix: Ensure when `requireAuth=true` is set, verification is MANDATORY before claiming
- Add a second verification method (World ID) alongside Self Protocol
- Create a separate test flow that forces verification

### 2. Full Chain Selection + Token Selection
- **Sender**: Select chain (Celo, Base, Monad) → see all available tokens (native + ERC-20)
- **Receiver**: Select chain + token independently from sender
- **Cross-chain**: If sender sends 5 USDC on Monad, receiver can select Celo Native
- **Display chain of events**: Each transaction hash shown to recipient
- **Integrate Uniswap API + LI.FI** for actual bridging/execution

### 3. Wallet Mode Security
- **Personal Wallet**: Wallet confirmation pop-up (MetaMask/connected wallet signs a message to verify ownership)
- **Escrow Agent Mode**: Every send requires Self Protocol verification + shares name, age, ethnicity
- This prevents fraud/unauthorized fund movement

### 4. LIT Protocol Full Integration
- All agent-controlled wallet workflows use LIT Protocol
- Hardwire LIT into code
- Document setup steps within MANDATE protocol

### 5. Auto Wallet Disconnect
- Already partially implemented with `beforeunload`
- Need to enforce it properly

### 6. Optional Message Box
- Add textarea for sender to include notes (remittance purpose, tracking IDs, etc.)
- Include in remittance record and display to recipient

## Implementation Order

Phase 1: Backend changes (routes, services, DB)
Phase 2: Frontend changes (SendForm, ClaimPage)
Phase 3: Testing & integration
Phase 4: Deployment

## Files to Modify
- Backend: src/controllers/transactionController.ts, src/services/remittanceService.ts
- Frontend: frontend/src/components/SendForm.tsx, frontend/src/app/claim/[token]/page.tsx
- DB: src/db/database.ts (new columns for message tracking)
- Services: src/services/celoService.ts, src/services/uniswapService.ts
