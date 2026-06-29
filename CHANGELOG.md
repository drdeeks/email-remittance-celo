# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-06-29

### Added - SCR-002 Email Remittance Core Implementation

- **Database Migration**: `/src/database/migrations/20260629_scr002_remittance_schema.ts`
  - Users table with WorldID nullifier, passport score, wallet address, email
  - Remittances table with claim tokens, amounts, fees, chain support, status tracking
  - Identity verifications audit table (WorldID, Self, BrightID, Proof of Humanity)
  - Fee configuration table (admin managed, per chain/token)
  - Idempotency keys table with 24h TTL
  - Default fee configs: Celo USDC, cUSD, Arbitrum USDC, Optimism USDC

- **Email Validator Service**: `/src/services/emailValidator.ts`
  - RFC 5322 compliant email validation
  - Optional MX record check
  - Disposable email detection
  - Normalization and sanitization

- **Fee Engine**: `/src/services/feeEngine.ts`
  - Dynamic fee calculation from database configuration
  - Formula: fee = base_fee_usd + (percentage_fee_bps / 10000) * amount_usd
  - Clamped to min/max fee bounds
  - Preview endpoint for frontend display

- **Remittance Service**: `/src/services/remittanceService.ts`
  - Create remittance with UUID v4 claim tokens
  - Claim remittance with claim secret verification
  - Idempotency key support on all mutating endpoints
  - 7-day expiration with cleanup job
  - Status transitions: pending → claimed/expired/cancelled

- **Email Notification Service**: Resend integration with claim link template

- **API Endpoints** (`/src/routes/remittanceRoutes.ts`, `/src/controllers/remittanceController.ts`):
  - POST `/api/remittance/create` - Create remittance with claim token
  - GET `/api/remittance/claim/:token` - Get remittance details for claim page
  - POST `/api/remittance/claim` - Claim remittance
  - POST `/api/remittance/preview-fee` - Preview fee calculation
  - GET `/api/remittance/sender/:senderId` - Get sender remittances
  - GET `/api/remittance/recipient/:recipientId` - Get recipient remittances
  - DELETE `/api/remittance/:id/cancel` - Cancel pending remittance

- **Frontend**: `/frontend/src/components/SendForm.tsx`
  - Wallet mode toggle (service wallet / personal wallet)
  - Self Protocol verification modal (service wallet mode)
  - World ID verification button (service wallet mode)
  - Chain selector (Celo, Base, Monad)
  - Token selectors (native + cross-chain bridges)
  - Recipient note/message support
  - Auth toggle (require recipient verification)
  - Balance display with insufficient balance validation
  - Claim URL copy with success state

### Added - SCR-1 Verification Method Selection Implementation

- **Backend Router**: `/src/routes/verificationRoutes.ts` - New unified verification router supporting SCR-1 user verification method selection
  - POST `/api/verification/select` - Endpoint for explicit method selection (NONE, SELF, WORLDID)
  - POST `/api/verification` - Unified verification endpoint with automatic method detection
  - GET `/api/verification/status/:token` - Verification status retrieval
  - Full SCR-1 blueprint compliance with fallback chain coordination

- **Enhanced Service**: `/src/services/selfEnterpriseEnhancedService.ts` - Enterprise verification service with multimodal verification support
  - Method routing: NONE, SELF, WORLDID selection and processing
  - Dry-run mode: Development/testing bypass for all verification methods
  - Fallback chain: NONE → SELF → WORLDID automatic fallback on failure
  - Comprehensive error handling: No silent failures, all paths return explicit success/error
  - Validation layer: Input validation per verification method
  - Retry logic: Exponential backoff for transient failures
  - Consistent response format: All methods return standardized response structure
  - Caching: Verification result caching with token management

- **Controller**: `/src/controllers/verificationController.ts` - Updated verification controller with SCR-1 support
  - `selectVerificationMethod()`: Main handler for method selection and verification
  - `verifyIdentity()`: Legacy verification handler for backward compatibility
  - Dry-run support: Bypass actual verification in development
  - Method validation: Enforces SCR-1 requirement (NONE, SELF, WORLDID only)
  - Error transformation: Consistent API response format across all methods
  - Field validation: Required field checking per verification type

- **Types**: `/src/types/verification.d.ts` - Extended verification type definitions
  - `VerificationMethodSelectionRequest`: Type for SCR-1 method selection
  - Enhanced existing types with method field support

- **Frontend**: Verification UI components for user selection
  - `src/components/VerificationChoice.tsx`: User verification method selector component
    - Three method options displayed with visual cards
    - Responsive design for mobile/desktop
    - Integration with useVerification hook
  - `src/hooks/useVerification.ts`: Custom hook for verification operations
    - Request handling for verification API calls
    - Loading state management
    - Error handling and result tracking

- **Tests**: Comprehensive test coverage for SCR-1 implementation
  - `tests/unit/scr-1-verification.test.ts`: Service layer tests
    - All three verification methods (NONE, SELF, WORLDID)
    - Dry-run mode functionality
    - Error handling and validation
    - Response format compliance
  - `tests/unit/scr-1-verification-controller.test.ts`: Controller layer tests
    - Method selection endpoints
    - Error response validation
    - Response consistency checks
    - Unhandled exception prevention

### Tests - Full Coverage (100+ tests passing)
- Frontend SendForm: 26 tests ✅ (Vitest)
- SCR-001 Verification Service: 23 tests ✅ (Jest)
- SCR-001 Verification Controller: 19 tests ✅ (Jest)
- SCR-002 Remittance Service: 5 tests ✅ (Jest)
- SCR-002 Fee Service: 4 tests ✅ (Jest)
- SCR-002 Integration (Remittance Flow): 6 tests ✅ (Jest)
- SCR-002 Integration (Fee Service): 5 tests ✅ (Jest)
- Self Verification Service: 3 tests ✅ (Jest)
- Self Contract Service: 2 tests ✅ (Jest)
- Celo Service: 2 tests ✅ (Jest)
- Wallet Service: 2 tests ✅ (Jest)
- Expired Remittance: 3 tests ✅ (Jest)

### Changed
- **Routes Configuration**: Updated `src/routes/verificationRoutes.ts` to include SCR-1 method selection
- **Controller Logic**: Enhanced `src/controllers/verificationController.ts` with method selection support
- **Type Definitions**: Extended `/src/types/verification.d.ts` to support SCR-1 method selection
- **Import Paths**: Fixed remittanceService.ts and feeEngine.ts to use `../db/database` instead of `../database/database`

### Security
- All verification endpoints now include explicit error handling
- No silent failure paths - all code paths return explicit success/error responses
- Input validation added for all verification method parameters
- Dry-run mode prevents accidental production verification during testing
- Idempotency keys on all mutating endpoints prevent duplicate operations

### Validation
- All functions include comprehensive error boundaries
- Every code path has explicit return statements
- Anti-silent-failure pattern implemented
- Fallback chain with graceful degradation

---

## [Unreleased]

### Added
- Enterprise organization initialized
- Modular file tree structure enforced
- Security hardening with enterprise .gitignore
- Todo-driven task validation framework
- Zero-placeholder code policy
- Self-validation with rollback capability
- Append-only CHANGELOG.md with decision rationale
- Phase-tagged workflow with git tags
- Semantic versioning with automated releases
- Robust git control with hooks

### Security
- Comprehensive credential patterns in .gitignore
- Supply chain security patterns
- Secrets detection patterns

### Validation
- Modular structure validation script
- Security hardening validation script
- Todo completion validator
- Placeholder scanner
- Self-validator with rollback verification
- CHANGELOG manager with rationale

---

*All changes tracked with: datetime, author, changes, method, validation, reasoning*
