// Test Environment Configuration
// Sets up all required environment variables for tests

// Self Protocol Configuration
const setupTestEnvironment = () => {
  process.env.BASE_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
  process.env.MONAD_SELF_CONTRACT = '0x7BC66eD8285b51F84D170F158aD162cA144F32c1';
  process.env.CELO_SELF_CONTRACT = '0x10079Fa97E739Fd05Ddc5C7cD11951aEF566b7e0';
  process.env.SELF_ATTESTER_ADDRESS = '0x38be03139523EE998952D21110115f23AE54b1f7';
  process.env.SELF_APP_ID = 'test-app-id';
  process.env.SELF_APP_SECRET = 'test-app-secret';

  // Wallet Configuration
  process.env.WALLET_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  // API Configuration
  process.env.UNISWAP_API_KEY = 'test-uniswap-key';
  process.env.CELO_PROVIDER_URL = 'https://forno.celo.org';

  // Database Configuration
  process.env.DATABASE_URL = 'sqlite::memory:';

  // Monitoring
  process.env.SELF_MONITORING_ENABLED = 'true';
};

// Export for use in test files
export { setupTestEnvironment };
