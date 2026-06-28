# Backend-Frontend Component Connections Analysis

## Component Coupling Analysis

`2026-06-28 00:00:00 UTC`

**Component Coupling: VerificationController has Two VerifyIdentity Handlers**
- **Location**: verificationController.ts:5 and verificationController.ts:50
- **Issue**: Two handlers with different signatures and behaviors creating confusion
- **Impact**: Inconsistent API responses and error handling

`2026-06-28 00:00:00 UTC`

**Component Coupling: Missing SelfProtocol vs WorldID Service Abstraction**
- **Issue**: selfVerificationService only implements Self Protocol
- **Impact**: WorldID SDK present in frontend but not backed by backend service
- **Resolution**: Need AbstractVerificationService interface to switch between implementations

`2026-06-28 00:00:00 UTC`

**Component Coupling: Test Environment Pollution**
- **Location**: selfVerificationService.ts:372
- **Issue**: Direct import using require() pollutes test environment
- **Impact**: Tests rely on environment variables being set
- **Resolution**: Use jest.mock() or dependency injection pattern

`2026-06-28 00:00:00 UTC`

**Component Coupling: Missing Nullifier Store Abstraction**
- **Issue**: SelfVerificationService has verificationCache Map
- **Impact**: WorldID would need separate storage, cross-provider nullifier checking difficult
- **Resolution**: Extract NullifierStorage interface

`2026-06-28 00:00:00 UTC`

**Component Coupling: Missing Dependency Injection for API Clients**
- **Issue**: selfApi.ts imported directly in selfVerificationService
- **Impact**: Hard-coded dependency makes testing difficult
- **Resolution**: Use DI container or factory pattern

## Integration Point Assessment

`2026-06-28 00:00:00 UTC`

**Integration: Missing User Context Data Standardization**
- **Issue**: Different verification methods expect different userContextData formats
- **Impact**: Frontend may send incompatible data
- **Resolution**: Add validation/normalization layer

`2026-06-28 00:00:00 UTC`

**Integration: Missing Frontend-Backend Verification State Sync**
- **Issue**: Frontend has worldIdVerified state, backend may have different tracking
- **Impact**: Session drift between client and server
- **Resolution**: Centralize verification state management

`2026-06-28 00:00:00 UTC`

**Integration: Missing Web3 Wallet Integration Verification**
- **Issue**: Frontend supports wallet connections via wagmi, backend has no corresponding validation
- **Impact**: Frontends may send invalid wallet addresses
- **Resolution**: Add backend wallet validation middleware

## API Endpoint Analysis

`2026-06-28 00:00:00 UTC`

**API: Missing Identity Provider Selection Flow**
- **Issue**: No UI component to select verification method (NONE, SELF, or WORLDID)
- **Impact**: Cannot handle user-selected provider per blueprint SCR-001

`2026-06-28 00:00:00 UTC`

**API: Missing SelfRoutes Verification Endpoint**
- **Issue**: /api/self/verify is missing but blueprint expects verification choice
- **Impact**: No endpoint to trigger verification or verify user's selection

`2026-06-28 00:00:00 UTC`

**API: Missing Proof Format Standardization**
- **Issue**: Different proof formats across verification types
- **Impact**: Frontend cannot easily switch between verification methods
- **Resolution**: Enforce single proof format across all types

`2026-06-28 00:00:00 UTC`

**API: Missing Rate Limiting on Critical Verification Endpoints**
- **Issue**: /api/verification/ and /api/self/verify-proof are public but expensive
- **Impact**: High-value operations vulnerable to brute force

`2026-06-28 00:00:00 UTC`

**API: Missing API for Retrieving Verification History**
- **Issue**: No endpoint for detailed verification history
- **Impact**: Frontend cannot show verification history

`2026-06-28 00:00:00 UTC`

**API: Missing Error Response Standardization**
- **Issue**: Different endpoints return different error formats
- **Impact**: Frontend error handling inconsistent

`2026-06-28 00:00:00 UTC`

**API: Missing API for Health Checks**
- **Issue**: /health endpoint only basic status
- **Impact**: Frontend cannot determine backend health status

`2026-06-28 00:00:00 UTC`

**API: Missing Auditor/Verifier API Endpoint**
- **Issue**: No endpoint for auditor/verifier operations
- **Impact**: Cannot perform batch verifications as per blueprint

## Security Hardening Assessment

`2026-06-28 00:00:00 UTC`

**Security: Missing CORS Origin Validation**
- **Issue**: CORS configured for all origins by default
- **Impact**: Security risk with overly permissive CORS
- **Resolution**: Configure environment-specific CORS

`2026-06-28 00:00:00 UTC`

**Security: Missing Request Tracing Correlation IDs**
- **Issue**: Multiple endpoints don't generate correlation IDs
- **Impact**: No way to trace requests across distributed system

`2026-06-28 00:00:00 UTC`

**Security: Missing Request Size Limits**
- **Issue**: No maximum request body size enforcement
- **Impact**: DoS vulnerability through large requests

`2026-06-28 00:00:00 UTC`

**Security: Missing Input Sanitization**
- **Issue**: verificationRoutes doesn't sanitize inputs
- **Impact**: Inconsistent security across endpoints

## Critical Integration Issues

`2026-06-28 00:00:00 UTC`

**Critical: Missing Verification Method Router**
- **Issue**: Current setup has separate controllers for self and verification
- **Impact**: Frontend doesn't know which endpoint to use
- **Resolution**: Add verification method router

`2026-06-28 00:00:00 UTC`

**Critical: Missing User Intent Capture**
- **Issue**: No way to send user preferences to backend
- **Impact**: Backend doesn't know verification method preference
- **Resolution**: Add preference storage service

`2026-06-28 00:00:00 UTC`

**Critical: Missing User Privacy Controls**
- **Issue**: Verification data stored but user can't delete
- **Impact**: GDPR compliance difficult
- **Resolution**: Add user data management

`2026-06-28 00:00:00 UTC`

**Critical: Missing User Consent Management**
- **Issue**: No explicit user consent storage
- **Impact**: Can't revoke consent later
- **Resolution**: Add consent management layer

`2026-06-28 00:00:00 UTC`

**Critical: WorldID Integration Missing**
- **Issue**: SelfVerificationService doesn't implement WorldID verification
- **Impact**: Cannot meet enterprise blueprint requirements for NONE, SELF, or WORLDID choice
- **Resolution**: Add worldIdVerification method alongside verifyIdentity

`2026-06-28 00:00:00 UTC`

**Integration: Missing Verification Controller Architecture**
- **Location**: verificationController.ts:5-64
- **Issue**: Single file contains two verifyIdentity handlers (lines 5 and 50) with different signatures causing architectural confusion
- **Impact**: Frontend confusion on which endpoint to use, inconsistent API responses and error handling
- **Root Cause**: Two handlers for same logical operation with different behaviors

`2026-06-28 00:00:00 UTC`

**Integration: Missing Verification Method Router**
- **Location**: Missing centralized router component
- **Issue**: No API gateway pattern to coordinate between Self Protocol and WorldID verification methods
- **Impact**: Frontend cannot implement SCR-001 user choice between NONE, SELF, or WORLDID verification
- **Resolution**: Create verification router that dispatches based on user's verification method preference

`2026-06-28 00:00:00 UTC`

**Integration: Missing SelfRoutes Verification Endpoint**
- **Location**: src/routes/selfRoutes.ts:1-44 missing verify endpoint
- **Issue**: /api/self/verify endpoint missing as per blueprint requirement for verification method choice
- **Impact**: Frontend cannot trigger user verification choice with backend coordination
- **Blueprint Reference**: SCR-001 requires user provider selection (NONE, SELF, or WORLDID)

`2026-06-28 00:00:00 UTC`

**Integration: WorldID Configuration Not Integrated**
- **Location**: src/config/self.ts:84-91 (worldId config) not referenced in src/services/selfVerification.service.ts
- **Issue**: WorldID configuration exists but unused in verification service
- **Impact**: Cannot configure WorldID API endpoints, app IDs, or secrets for verification
- **Validation**: Backend missing environment variable validation for WorldID provider URLs per chk-module-002

`2026-06-28 00:00:00 UTC'

**Integration: Missing Nullifier Store Abstraction**
- **Location**: src/services/selfVerification.service.ts:11 (verificationCache: Map)
- **Issue**: Hard-coded verification cache Map prevents cross-provider nullifier tracking
- **Impact**: WorldID nullifiers stored separately from Self Protocol nullifiers, enabling replay attacks across providers
- **Resolution**: Extract NullifierStorage interface for unified nullifier tracking across all verification methods

`2026-06-28 00:00:00 UTC'

**Integration: Missing AbstractVerificationService Interface**
- **Location**: Replace selfVerificationService.ts with interface-based abstraction
- **Issue**: Direct implementation in SelfVerificationService prevents method switching
- **Impact**: Cannot switch between Self Protocol and WorldID verification without code changes
- **Pattern**: Need Strategy pattern for configurable verification methods

`2026-06-28 00:00:00 UTC'

**Integration: Missing Fallback Chain Implementation**
- **Location**: Missing fallback logic across verification methods
- **Issue**: Blueprint SCR-001 specifies fallback chain (NONE → SELF → WORLDID) but not implemented
- **Impact**: Cannot provide alternative verification when primary fails, reducing user experience and resilience
- **Requirement**: Fallback triggers when WORLDID unavailable, then SELF Protocol if worldId not selected

`2026-06-28 00:00:00 UTC'

**Integration: Missing Verification Token Exchange API**
- **Location**: Missing endpoint for exchanging frontend verification tokens for backend validation
- **Issue**: Frontend generates verification tokens but lacks corresponding backend validation
- **Impact**: Frontend cannot verify backend verification results, creates trust gap
- **Solution**: API endpoint to validate frontend verification tokens against backend state

`2026-06-28 00:00:00 UTC'

**Integration: Missing Session Token Validation API**
- **Location**: src/routes/selfRoutes.ts missing session token validation endpoint
- **Issue**: Frontend generates Self Protocol session tokens but backend lacks validation
- **Impact**: Cannot verify Self Protocol verification tokens at backend, breaking chain of custody
- **Requirement**: Backend must validate session tokens from Self app for API calls

`2026-06-28 00:00:00 UTC'

**Integration: Missing User Intent Capture**
- **Location**: Missing preference storage and user verification method preference tracking
- **Issue**: No way to send user preferences to backend for verification method selection
- **Impact**: Backend cannot handle user-selected verification method per blueprint SCR-001
- **Resolution**: Add preference service and verification method intent storage

`2026-06-28 00:00:00 UTC'

**Integration: Missing Response Envelope Standardization**
- **Location**: All API endpoints lack consistent response structure
- **Issue**: Verification endpoints return inconsistent response formats (result:true vs success:false)
- **Impact**: Frontend error handling inconsistent across verification methods
- **Requirement**: Standard API envelope with status, data, error fields per blueprint

`2026-06-28 00:00:00 UTC'

**Integration: Missing User Context Data Standardization**
- **Location**: Different verification methods expect different userContextData formats
- **Issue**: Self Protocol requires attestationId, proof, pubSignals, userContextData; WorldID requires nullifierHash, merkleRoot, proof
- **Impact**: Frontend cannot easily switch between verification methods due to format incompatibility
- **Resolution**: Add normalization layer to standardize data across verification protocols

`2026-06-28 00:00:00 UTC'

**Integration: Missing User Privacy Controls**
- **Location**: User verification data stored in database without deletion API
- **Issue**: Verification data stored but user cannot delete or export per GDPR
- **Impact**: Cannot comply with right to be forgotten, creates compliance risk
- **Requirement**: User data management with delete endpoints for self-service privacy controls

`2026-06-28 00:00:00 UTC'

**Integration: Missing User Consent Management**
- **Location**: Missing user consent storage for verification data collection and processing
- **Issue**: No explicit user consent for verification data collection and storage
- **Impact**: Cannot revoke consent later, creates GDPR compliance issues
- **Resolution**: Add consent management layer with opt-in/out for data collection

`2026-06-28 00:00:00 UTC'

**Integration: Missing Rate Limiting on Critical Verification Endpoints**
- **Location**: src/routes/verificationRoutes.ts:1-9, src/routes/selfRoutes.ts:21-42 missing rate limiting
- **Issue**: /api/verification/ and /api/self/verify-proof public endpoints vulnerable to brute force
- **Impact**: High-value operations vulnerable to abuse, DoS attacks possible
- **Risk**: Expensive API calls unprotected, security hardening incomplete

`2026-06-28 00:00:00 UTC'

**Integration: Missing Request Tracing Correlation IDs**
- **Location**: src/controllers/verificationController.ts, src/controllers/selfController.ts missing correlation ID generation
- **Issue**: Multiple endpoints don't generate correlation IDs for distributed tracing
- **Impact**: Cannot trace requests across distributed system for debugging and security auditing
- **Solution**: Add correlation ID generation and propagation middleware

`2026-06-28 00:00:00 UTC'

**Integration: Missing Verification Frontend Backend State Sync**
- **Location**: Frontend verification states (worldIdVerified, selfVerified) vs backend verification storage
- **Issue**: Fragmented verification state management between frontend and backend
- **Impact**: Session drift, cannot track verification across user sessions or device switches
- **Resolution**: Centralize verification state management with Redis/session storage

`2026-06-28 00:00:00 UTC'

**Integration: Missing Sender Session Token API**
- **Location**: src/services/selfVerification.service.ts:130-133 session token generation for sender callbacks
- **Issue**: Sender session tokens generated but no endpoint to validate them
- **Impact**: Sender callbacks cannot be validated, security gap in verification flow
- **Requirement**: API endpoint to validate senderSessionToken for verification callbacks

`2026-06-28 00:00:00 UTC'

**Integration: Missing API Gateway Pattern**
- **Location**: Missing high-level API routing layer for verification services
- **Issue**: No API gateway to route requests to appropriate verification services
- **Impact**: Frontend logic complexity, lack of protocol abstraction, duplicate verification logic
- **Design Pattern**: Implement API gateway with verification service delegation and provider abstraction

`2026-06-28 00:00:00 UTC'

**Integration: Missing Auditor/Verifier API Endpoint**
- **Location**: Missing bulk verification and audit API endpoints
- **Issue**: No endpoint for auditor/verifier operations as per enterprise blueprint
- **Impact**: Cannot perform batch verifications, audit trails incomplete
- **Requirement**: Admin endpoints for batch verifications and audit operations per blueprint

`2026-06-28 00:00:00 UTC'

**Integration: Missing Verification Choice Component**
- **Location**: Missing frontend verification choice component for SCR-001
- **Issue**: No UI component to let users choose verification method (NONE, SELF, or WORLDID)
- **Impact**: Cannot implement user-selected verification method from blueprint
- **Specification**: AGENTS.md specifies WorldID as additional option to existing Self verification

`2026-06-28 00:00:00 UTC'

**Integration: Broken Verification Flow**
- **Location**: Frontend verification flow coordination and API endpoint routing
- **Issue**: Cannot select WORLDID option in AuthToggle or walletMode, missing chain
- **Impact**: User cannot select WorldID verification when service wallet is used
- **Requirement**: Complete WorldID integration in frontend UI, add verification choice component

`2026-06-28 00:00:00 UTC'

**Integration: Missing Component Architecture Coordination**
- **Location**: Missing centralized verification router and coordinator
- **Issue**: Components exist but no verification router to handle different verification types
- **Impact**: Component architecture fragmented, verification flows disconnected
- **Solution**: Add verification router, coordinator to handle verification type routing

---
**NEXT ANALYSIS PRIORITY**: Implement verification method router first to enable provider selection, then add abstract verification service interface for method switching.
