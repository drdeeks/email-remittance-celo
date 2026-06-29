/**
 * Fee Engine Service
 * Calculates dynamic fees from database configuration
 * Formula: fee = base_fee_usd + (percentage_fee_bps / 10000) * amount_usd
 * Clamped to min_fee_usd and max_fee_usd
 */

import { db } from '../db/database';
import { logger } from '../utils/logger';

export interface FeeConfig {
  id: string;
  chain_id: number;
  token_address: string;
  base_fee_usd: number;
  percentage_fee_bps: number;
  min_fee_usd: number;
  max_fee_usd: number;
  gas_sponsor_limit_usd: number;
  created_at: Date;
  updated_at: Date;
}

export interface FeeCalculationResult {
  feeUsd: number;
  feeTokens: string; // string to preserve precision
  baseFeeUsd: number;
  percentageFeeUsd: number;
  feeConfig: FeeConfig;
  amountUsd: number;
  tokenAddress: string;
  chainId: number;
}

export interface FeePreviewResult {
  amountUsd: number;
  feeUsd: number;
  netUsd: number;
  feeBreakdown: {
    baseFeeUsd: number;
    percentageFeeUsd: number;
    percentageBps: number;
  };
  tokenAddress: string;
  chainId: number;
  minFeeUsd: number;
  maxFeeUsd: number;
}

/**
 * Retrieves fee configuration for a chain and token
 */
export async function getFeeConfig(
  chainId: number,
  tokenAddress: string
): Promise<FeeConfig | null> {
  try {
    const row = db.prepare(
      'SELECT * FROM fee_config WHERE chain_id = ? AND token_address = ?'
    ).get(chainId, tokenAddress.toLowerCase()) as FeeConfig | undefined;

    return row || null;
  } catch (error) {
    logger.error('Failed to get fee config', { chainId, tokenAddress, error: error.message });
    return null;
  }
}

/**
 * Calculates fee for a given amount, chain, and token
 * Formula: fee = base_fee_usd + (percentage_fee_bps / 10000) * amount_usd
 * Result clamped between min_fee_usd and max_fee_usd
 */
export function calculateFee(
  amountUsd: number,
  config: FeeConfig
): FeeCalculationResult {
  // Calculate percentage fee component
  const percentageFeeUsd = (config.percentage_fee_bps / 10000) * amountUsd;
  
  // Total fee = base + percentage
  let totalFeeUsd = config.base_fee_usd + percentageFeeUsd;
  
  // Apply min/max clamping
  if (totalFeeUsd < config.min_fee_usd) {
    totalFeeUsd = config.min_fee_usd;
  }
  if (totalFeeUsd > config.max_fee_usd) {
    totalFeeUsd = config.max_fee_usd;
  }

  // For token amount, we'd need current price - returning USD for now
  // In production, use oracle price feed
  const feeTokens = totalFeeUsd.toFixed(18);

  return {
    feeUsd: totalFeeUsd,
    feeTokens,
    baseFeeUsd: config.base_fee_usd,
    percentageFeeUsd,
    feeConfig: config,
    amountUsd,
    tokenAddress: config.token_address,
    chainId: config.chain_id
  };
}

/**
 * Preview fee for frontend display (doesn't require DB write)
 */
export async function previewFee(
  amountUsd: number,
  chainId: number,
  tokenAddress: string
): Promise<FeePreviewResult | null> {
  const config = await getFeeConfig(chainId, tokenAddress);
  
  if (!config) {
    logger.warn('Fee config not found for preview', { chainId, tokenAddress });
    return null;
  }

  const calculation = calculateFee(amountUsd, config);
  
  return {
    amountUsd,
    feeUsd: calculation.feeUsd,
    netUsd: amountUsd - calculation.feeUsd,
    feeBreakdown: {
      baseFeeUsd: calculation.baseFeeUsd,
      percentageFeeUsd: calculation.percentageFeeUsd,
      percentageBps: config.percentage_fee_bps
    },
    tokenAddress: config.token_address,
    chainId: config.chain_id,
    minFeeUsd: config.min_fee_usd,
    maxFeeUsd: config.max_fee_usd
  };
}

/**
 * Creates or updates fee configuration (admin only)
 */
export async function upsertFeeConfig(config: Partial<FeeConfig> & { 
  chain_id: number; 
  token_address: string 
}): Promise<FeeConfig> {
  const stmt = db.prepare(`
    INSERT INTO fee_config (chain_id, token_address, base_fee_usd, percentage_fee_bps, 
      min_fee_usd, max_fee_usd, gas_sponsor_limit_usd, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ON CONFLICT (chain_id, token_address) DO UPDATE SET
      base_fee_usd = excluded.base_fee_usd,
      percentage_fee_bps = excluded.percentage_fee_bps,
      min_fee_usd = excluded.min_fee_usd,
      max_fee_usd = excluded.max_fee_usd,
      gas_sponsor_limit_usd = excluded.gas_sponsor_limit_usd,
      updated_at = NOW()
    RETURNING *
  `);

  const result = stmt.get(
    config.chain_id,
    config.token_address.toLowerCase(),
    config.base_fee_usd ?? 0,
    config.percentage_fee_bps ?? 150,
    config.min_fee_usd ?? 0,
    config.max_fee_usd ?? 100,
    config.gas_sponsor_limit_usd ?? 5
  ) as FeeConfig;

  logger.info('Fee config upserted', { chainId: config.chain_id, tokenAddress: config.token_address });
  return result;
}

/**
 * Gets all fee configurations (admin view)
 */
export async function getAllFeeConfigs(): Promise<FeeConfig[]> {
  return db.prepare('SELECT * FROM fee_config ORDER BY chain_id, token_address').all() as FeeConfig[];
}

/**
 * Deletes fee configuration (admin only)
 */
export async function deleteFeeConfig(chainId: number, tokenAddress: string): Promise<boolean> {
  const result = db.prepare(
    'DELETE FROM fee_config WHERE chain_id = ? AND token_address = ?'
  ).run(chainId, tokenAddress.toLowerCase());
  
  return result.changes > 0;
}

/**
 * Validates fee calculation parameters
 */
export function validateFeeParams(
  amountUsd: number,
  chainId: number,
  tokenAddress: string
): { valid: boolean; error?: string } {
  if (amountUsd <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (!Number.isFinite(amountUsd)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }
  if (amountUsd > 1_000_000) {
    return { valid: false, error: 'Amount exceeds maximum allowed ($1,000,000)' };
  }
  if (!chainId || chainId <= 0) {
    return { valid: false, error: 'Valid chain ID required' };
  }
  if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
    return { valid: false, error: 'Valid token address required' };
  }
  return { valid: true };
}

export { logger as feeLogger };