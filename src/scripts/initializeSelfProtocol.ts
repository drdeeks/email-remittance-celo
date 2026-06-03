#!/usr/bin/env ts-node

/**
 * Self Protocol Initialization Script
 * 
 * This script initializes the Self Protocol contracts:
 * - Sets backend wallet as attester for Base and Monad
 * - Registers verification config for Celo
 */

import { selfContractService } from '../services/selfContract.service';
import { logger } from '../utils/logger';
import { monitoring } from '../utils/monitoring';

async function main() {
  logger.info('🚀 Initializing Self Protocol contracts');
  
  try {
    // Initialize contracts
    const result = await selfContractService.initializeContracts();
    
    logger.info('✅ Self Protocol initialization results:', {
      base: result.base ? 'success' : 'failed',
      monad: result.monad ? 'success' : 'failed',
      celo: result.celo ? 'success' : 'failed',
    });
    
    // Log metrics
    if (result.base) monitoring.incrementMetric('self_initialization_success', { chain: 'base' });
    if (result.monad) monitoring.incrementMetric('self_initialization_success', { chain: 'monad' });
    if (result.celo) monitoring.incrementMetric('self_initialization_success', { chain: 'celo' });
    
    if (!result.base || !result.monad || !result.celo) {
      logger.warn('⚠️ Some Self Protocol contracts failed to initialize');
      process.exit(1);
    }
    
    logger.info('🎉 Self Protocol initialization complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Self Protocol initialization failed', error);
    monitoring.incrementMetric('self_initialization_failure');
    process.exit(1);
  }
}

// Run the script
main();