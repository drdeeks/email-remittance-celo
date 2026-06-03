/**
 * Migration: Add original_amount column to remittances table
 * 
 * This migration adds the original_amount column to track the amount before
 * the 1.5% platform fee is deducted.
 */

import { db } from '../database';
import { logger } from '../../utils/logger';

/**
 * Run the migration
 */
export async function up() {
  try {
    logger.info('Running migration: Add original_amount column to remittances table');
    
    // Check if column already exists
    const result = db.prepare(
      "SELECT COUNT(*) as count FROM pragma_table_info('remittances') WHERE name = 'original_amount'"
    ).get();
    
    if (result.count === 0) {
      // Add the column if it doesn't exist
      db.prepare(
        'ALTER TABLE remittances ADD COLUMN original_amount TEXT NOT NULL DEFAULT \'0\' CHECK (original_amount != \'\')'
      ).run();
      
      logger.info('Added original_amount column to remittances table');
    } else {
      logger.info('original_amount column already exists, skipping migration');
    }
    
    return true;
  } catch (error) {
    logger.error('Migration failed', error);
    return false;
  }
}

/**
 * Rollback the migration
 */
export async function down() {
  try {
    logger.info('Rolling back migration: Remove original_amount column from remittances table');
    
    // SQLite doesn't support dropping columns directly, so we'd need to:
    // 1. Create new table without the column
    // 2. Copy data from old table
    // 3. Drop old table
    // 4. Rename new table
    // This is complex and not typically needed for rollback
    logger.warn('Rollback not implemented for SQLite column addition');
    
    return true;
  } catch (error) {
    logger.error('Rollback failed', error);
    return false;
  }
}