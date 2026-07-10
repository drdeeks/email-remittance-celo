/**
 * SCR-003: Add server-decided verification method to remittances.
 *
 * Adds:
 *   - verification_method TEXT NOT NULL DEFAULT 'NONE'  (NONE | SELF | WORLDID)
 *   - funding_entity     TEXT                            (address of whoever funds the escrow)
 *
 * The verification method is decided server-side by the funding entity, never by the user.
 * Runs against the real SQLite database (src/db/database) used by remittanceService.
 */

import { logger } from '../../utils/logger';
import { db } from '../../db/database';

export async function up() {
  try {
    logger.info('Running SCR-003 verification_method migration');

    const columns = db.prepare('PRAGMA table_info(remittances)').all() as { name: string }[];
    const has = (name: string) => columns.some((c) => c.name === name);

    if (!has('verification_method')) {
      db.exec("ALTER TABLE remittances ADD COLUMN verification_method TEXT NOT NULL DEFAULT 'NONE'");
      logger.info('SCR-003: added column verification_method');
    }
    if (!has('funding_entity')) {
      db.exec('ALTER TABLE remittances ADD COLUMN funding_entity TEXT');
      logger.info('SCR-003: added column funding_entity');
    }

    logger.info('SCR-003 migration completed successfully');
    return true;
  } catch (error) {
    logger.error('SCR-003 migration failed', error);
    return false;
  }
}

export async function down() {
  // SQLite has limited DROP COLUMN support across versions; treated as a no-op.
  logger.info('SCR-003 rollback is a no-op (SQLite column drop not supported)');
  return true;
}
