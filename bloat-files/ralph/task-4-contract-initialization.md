# Self Protocol - Contract Initialization

## What to implement
- Set backend wallet as attester for Base/Monad
- Register verification config for Celo
- Initialization scripts
- Error handling and retries

## Files to modify
- src/scripts/setAttester.ts (create)
- src/scripts/registerVerificationConfig.ts (create)
- src/services/selfContract.service.ts

## Acceptance criteria
- Backend wallet set as attester on Base and Monad
- Verification config registered on Celo
- Scripts can be run multiple times without errors
- npm run typecheck passes
