# Self Protocol - Core Integration

## What to implement
- SelfContractService for contract interactions
- SelfVerificationService for ZK proof verification
- Secure configuration management
- Error handling with fallbacks

## Files to modify
- src/services/selfContract.service.ts (create)
- src/services/selfVerification.service.ts (create)
- src/config/self.ts (create)
- deploy/self-config.env (create)

## Acceptance criteria
- Contract interactions work on Base, Monad, and Celo
- ZK proof verification works with Self Protocol V2 API
- All API keys and private keys securely managed
- npm run typecheck passes
- npm test passes
