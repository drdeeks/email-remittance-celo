/**
 * Self Protocol Configuration
 * 
 * Enterprise-grade configuration with:
 * - Secure key management
 * - Environment validation
 * - Fallback mechanisms
 * - Audit logging
 */

import { logger } from '../utils/logger';
import { SupportedChain } from '../services/celoService';

// Validate required environment variables
const validateConfig = () => {
  const requiredVars = [
    'BASE_SELF_CONTRACT',
    'MONAD_SELF_CONTRACT',
    'CELO_SELF_CONTRACT',
    'SELF_ATTESTER_ADDRESS',
    'SELF_APP_ID',
    'SELF_APP_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    logger.error(`Self Protocol: Missing required environment variables: ${missingVars.join(', ')}`);
    throw new Error(`Missing Self Protocol configuration: ${missingVars.join(', ')}`);
  }
};

// Run validation on import
try {
  validateConfig();
} catch (error) {
  logger.warn('Self Protocol configuration validation failed, running in fallback mode', error);
}

/**
 * Self Protocol Configuration
 */
export const selfConfig = {
  // Contract addresses
  contracts: {
    base: process.env.BASE_SELF_CONTRACT!,
    monad: process.env.MONAD_SELF_CONTRACT!,
    celo: process.env.CELO_SELF_CONTRACT!,
  } as Record<SupportedChain, string>,

  // API configuration
  api: {
    url: process.env.SELF_API_URL || 'https://api.self.xyz/v1',
    appId: process.env.SELF_APP_ID!,
    appSecret: process.env.SELF_APP_SECRET!,
    timeout: parseInt(process.env.SELF_API_TIMEOUT || '10000'),
  },

  // Self Enterprise SDK (@selfxyz/enterprise-sdk) configuration.
  // None of these are required at boot — verification is OPTIONAL and degrades gracefully.
  enterprise: {
    apiKey: process.env.SELF_API_KEY || process.env.SELF_ENTERPRISE_API_KEY || '',
    flowId: process.env.SELF_FLOW_ID || '',
    webhookSecret: process.env.SELF_WEBHOOK_SECRET || '',
  },

  // Attester configuration
  attester: {
    address: process.env.SELF_ATTESTER_ADDRESS!,
    privateKey: process.env.WALLET_PRIVATE_KEY!, // Same as blockchain wallet
  },

  // Verification settings
  verification: {
    requireAuth: process.env.DEFAULT_REQUIRE_AUTH === 'true',
    minAge: parseInt(process.env.MIN_AGE || '18'),
    highValueThreshold: parseFloat(process.env.HIGH_VALUE_THRESHOLD || '100'), // $100
  },

  // Monitoring
  monitoring: {
    enabled: process.env.SELF_MONITORING_ENABLED !== 'false',
    alertThreshold: parseInt(process.env.SELF_ALERT_THRESHOLD || '5'), // 5 failures
  },

  // Rollback configuration
  rollback: {
    enabled: process.env.SELF_ROLLBACK_ENABLED !== 'false',
    maxRetries: parseInt(process.env.SELF_MAX_RETRIES || '3'),
  },

  // World ID configuration
  worldId: {
    apiUrl: process.env.WORLDID_API_URL || 'https://api.worldcoin.org/v1',
    appId: process.env.WORLDID_APP_ID || '',
    appSecret: process.env.WORLDID_APP_SECRET || '',
    verifyEndpoint: process.env.WORLDID_VERIFY_ENDPOINT || '/api/v1/worldid/verify',
    timeout: parseInt(process.env.WORLDID_API_TIMEOUT || '10000'),
  }
};

// Log configuration (without sensitive data)
logger.info('Self Protocol configuration loaded', {
  contracts: {
    base: selfConfig.contracts.base ? 'configured' : 'not configured',
    monad: selfConfig.contracts.monad ? 'configured' : 'not configured',
    celo: selfConfig.contracts.celo ? 'configured' : 'not configured',
  },
  api: {
    url: selfConfig.api.url,
    timeout: selfConfig.api.timeout,
  },
  verification: {
    requireAuth: selfConfig.verification.requireAuth,
    minAge: selfConfig.verification.minAge,
    highValueThreshold: selfConfig.verification.highValueThreshold,
  },
  monitoring: {
    enabled: selfConfig.monitoring.enabled,
  }
});

export default selfConfig;