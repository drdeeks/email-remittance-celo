/**
 * Migration: Add admin/manager review system
 * - managers table: stores manager accounts with dual identity (verification + wallet signature)
 * - review_queue table: tracks pending sends requiring admin/manager approval
 * - Adds review_status to remittances table for service mode workflow
 */

import { Database } from 'better-sqlite3';

export function up(db: Database): void {
  // Managers table — stores admin and manager accounts
  db.exec(`
    CREATE TABLE IF NOT EXISTS managers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager')),
      wallet_address TEXT,
      self_verification_id TEXT,
      self_verified INTEGER DEFAULT 0,
      wallet_signature TEXT,
      wallet_signature_verified INTEGER DEFAULT 0,
      invited_by TEXT,
      approved_by TEXT,
      approved_at INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (invited_by) REFERENCES managers(id),
      FOREIGN KEY (approved_by) REFERENCES managers(id)
    );
  `);

  // Review queue — tracks pending sends requiring approval
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_queue (
      id TEXT PRIMARY KEY,
      remittance_id TEXT NOT NULL,
      submitted_by TEXT NOT NULL,
      reviewed_by TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
      submitted_at INTEGER DEFAULT (unixepoch()),
      reviewed_at INTEGER,
      review_notes TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (remittance_id) REFERENCES remittances(id),
      FOREIGN KEY (submitted_by) REFERENCES managers(id),
      FOREIGN KEY (reviewed_by) REFERENCES managers(id)
    );
  `);

  // Add review_status column to remittances table for service mode workflow
  db.exec(`
    ALTER TABLE remittances ADD COLUMN review_status TEXT DEFAULT 'none'
      CHECK (review_status IN ('none', 'pending_review', 'approved', 'rejected'));
  `);

  db.exec(`
    ALTER TABLE remittances ADD COLUMN submitted_by TEXT;
  `);

  db.exec(`
    ALTER TABLE remittances ADD COLUMN reviewed_by TEXT;
  `);

  db.exec(`
    ALTER TABLE remittances ADD COLUMN reviewed_at INTEGER;
  `);

  // Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_managers_email ON managers(email);
    CREATE INDEX IF NOT EXISTS idx_managers_status ON managers(status);
    CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status);
    CREATE INDEX IF NOT EXISTS idx_review_queue_remittance ON review_queue(remittance_id);
    CREATE INDEX IF NOT EXISTS idx_remittances_review_status ON remittances(review_status);
  `);
}

export function down(db: Database): void {
  db.exec(`DROP TABLE IF EXISTS review_queue;`);
  db.exec(`DROP TABLE IF EXISTS managers;`);
  db.exec(`DROP INDEX IF EXISTS idx_remittances_review_status;`);
}
