# Self Protocol - Fee Deduction

## What to implement
- Modify remittance creation to deduct 1.5% immediately
- Store platform fee in database
- Update fee calculation logic

## Files to modify
- src/services/remittanceService.ts
- src/models/remittance.model.ts
- src/database/migrations/*.ts

## Acceptance criteria
- 1.5% fee deducted immediately on remittance creation
- Fee stored in database with remittance record
- Recipient receives net amount after fee
- npm run typecheck passes
- npm test passes
