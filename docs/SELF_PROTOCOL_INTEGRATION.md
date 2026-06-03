# Self Protocol Integration Documentation

## Overview
This document provides comprehensive documentation for the Self Protocol integration in the Email Native Remittance platform. Self Protocol enables identity verification for high-value transactions using zero-knowledge proofs.

## Architecture

### Core Components

1. **SelfContractService** - Handles interactions with Self Protocol smart contracts
2. **SelfVerificationService** - Manages identity verification flows
3. **Self API Integration** - Communicates with Self Protocol backend services
4. **Controllers & Routes** - API endpoints for frontend integration

### Data Flow
```
Frontend → API Routes → Controllers → Services → Self Protocol
```

## SelfContractService

### Purpose
Handles interactions with Self Protocol smart contracts on Base, Monad, and Celo blockchains.

### Key Methods

#### `initializeContracts(): Promise<Record<SupportedChain, boolean>>`
- Initializes contracts on all supported chains
- Sets attester and registers verification configuration
- Returns success status for each chain

#### `initialize(chain: SupportedChain): Promise<boolean>`
- Initializes contract on a specific chain
- Sets attester and registers verification configuration
- Returns success status

#### `setAttester(chain: SupportedChain, enabled: boolean): Promise<boolean>`
- Sets the platform wallet as an attester on the specified chain
- Returns `true` on success, `false` on failure

#### `registerVerificationConfig(chain: SupportedChain): Promise<boolean>`
- Registers verification configuration on the specified chain
- Configures minimum age requirements
- Returns `true` on success, `false` on failure

### Testing
- **Unit Tests**: `tests/unit/selfContract.test.ts`
- **Test Coverage**: 48.68%
- **Key Test Cases**:
  - Successful attester setting
  - Failed contract interactions
  - Proper error handling

## SelfVerificationService

### Purpose
Manages identity verification flows for high-value transactions (>$100).

### Key Methods

#### `verifyIdentity(request: SelfVerificationRequest): Promise<SelfVerificationResult>`
- Verifies identity for transaction recipients
- Automatically determines if verification is required based on amount
- Returns verification result with token and proof data

#### `verifyProof(proofData: any): Promise<ProofVerificationResult>`
- Verifies zero-knowledge proofs from the frontend
- Validates proof validity and extracted attributes
- Returns verification status and attributes

#### `getFrontendConfig(): SelfFrontendConfig`
- Returns configuration needed by the frontend
- Includes API URLs, thresholds, and settings

#### `getStatus(): SelfStatus`
- Returns system status information
- Includes configuration status and thresholds

### Testing
- **Unit Tests**: `tests/unit/selfVerification.test.ts`
- **Integration Tests**: `tests/integration/selfIntegration.test.ts`
- **Test Coverage**: 73.8%
- **Key Test Cases**:
  - High value transaction verification
  - Low value transaction bypass
  - Verification failure handling
  - Proof verification
  - Frontend configuration

## API Endpoints

### Self Protocol Endpoints

#### `GET /api/self/config`
- Returns frontend configuration
- Response: `SelfFrontendConfig`

#### `POST /api/self/initialize`
- Initializes Self Protocol on specified chain
- Request body: `{ chain: 'base' | 'monad' | 'celo' }`
- Response: `{ success: boolean }`

#### `GET /api/self/status`
- Returns system status
- Response: `SelfStatus`

### Verification Endpoints

#### `POST /api/verification`
- Initiates identity verification
- Request body: `{ recipient: string, amount: number, currency: string }`
- Response: `SelfVerificationResult`

#### `POST /api/verification/verify`
- Verifies zero-knowledge proof
- Request body: `{ proof: any, pubSignals: string[] }`
- Response: `ProofVerificationResult`

## Configuration

### Environment Variables
```
# Contract addresses
BASE_SELF_CONTRACT=0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0
MONAD_SELF_CONTRACT=0x7BC66eD8285b51F84D170F158aD162cA144F32c1
CELO_SELF_CONTRACT=0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0

# Attester configuration
SELF_ATTESTER_ADDRESS=0x38be03139523EE998952D21110115f23AE54b1f7

# API configuration
SELF_APP_ID=your-app-id
SELF_APP_SECRET=your-app-secret
SELF_API_URL=https://api.self.xyz/v1

# Verification settings
DEFAULT_REQUIRE_AUTH=false
MIN_AGE=18
HIGH_VALUE_THRESHOLD=100
```

### Configuration File
`src/config/self.ts` - Contains all Self Protocol configuration with validation

## Error Handling

### Error Types
1. **Contract Interaction Errors** - Failed blockchain transactions
2. **API Errors** - Self Protocol API communication failures
3. **Verification Errors** - Failed identity verification
4. **Proof Verification Errors** - Invalid zero-knowledge proofs

### Error Handling Approach
- Comprehensive logging with context
- Graceful degradation
- Meaningful error responses
- Monitoring and alerting integration

## Monitoring and Logging

### Monitoring Metrics
- `self_contract_calls_total` - Total contract calls
- `self_contract_errors_total` - Total contract errors
- `self_contract_latency_seconds` - Contract call latency

### Logging
- **Audit Logs**: All verification attempts and contract interactions
- **Error Logs**: Detailed error information with context
- **Info Logs**: Operational information

## Testing Strategy

### Unit Tests
- Isolated component testing
- Mock external dependencies
- Test both success and failure scenarios
- Located in `tests/unit/`

### Integration Tests
- End-to-end flow testing
- API endpoint testing
- Service integration testing
- Located in `tests/integration/`

### Test Coverage
| Component                  | Coverage | Tests Passing |
|---------------------------|----------|---------------|
| SelfContractService       | 48.68%   | 2/2           |
| SelfVerificationService   | 73.8%    | 3/3           |
| Integration Tests         | 100%     | 4/4           |

## Security Considerations

1. **Rate Limiting** - Protection against API abuse
2. **Input Validation** - Secure handling of verification data
3. **Error Handling** - No sensitive information leakage
4. **Monitoring** - Real-time detection of issues
5. **Rollback** - Atomic contract interactions

## Deployment

### Initialization
1. Set required environment variables
2. Deploy platform
3. Call `/api/self/initialize` for each chain
4. Verify status with `/api/self/status`

### Verification Flow
1. Frontend checks if verification is needed using `/api/self/config`
2. For high-value transactions, initiate verification with `/api/verification`
3. Frontend collects proof from user
4. Verify proof with `/api/verification/verify`
5. Complete transaction if verification succeeds

## Troubleshooting

### Common Issues
1. **Contract Initialization Failures**
   - Verify wallet has sufficient gas
   - Check contract addresses are correct
   - Verify attester address is correct

2. **Verification Failures**
   - Check recipient email format
   - Verify amount exceeds threshold
   - Check Self API connectivity

3. **Proof Verification Failures**
   - Verify proof format
   - Check proof validity period
   - Validate extracted attributes

### Debugging Tools
- Check application logs for detailed error information
- Use `/api/self/status` to verify configuration
- Monitor contract interactions on blockchain explorers

## Future Enhancements

1. **Automated Contract Initialization** - On application startup
2. **Enhanced Monitoring** - Real-time dashboards
3. **Additional Verification Methods** - Document verification, biometrics
4. **Performance Optimization** - Caching and rate limiting improvements
