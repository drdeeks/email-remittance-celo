import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../utils/logger';

const DB_PATH = process.env.DB_PATH || './remittance.db';

class DatabaseManager {
  private db: Database.Database;
  private static instance: DatabaseManager;

  private constructor() {
    const dbPath = path.resolve(DB_PATH);
    logger.info(`Initializing database at ${dbPath}`);
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeSchema();
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private initializeSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS remittances (
        id TEXT PRIMARY KEY,
        claim_token TEXT UNIQUE NOT NULL,
        sender_email TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        amount_celo TEXT NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'pending',
        escrow_tx_hash TEXT,
        claim_tx_hash TEXT,
        recipient_wallet TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        expires_at INTEGER NOT NULL,
        claimed_at INTEGER,
        require_auth INTEGER DEFAULT 0,
        chain TEXT DEFAULT 'celo',
        self_verification_id TEXT,
        self_verified INTEGER DEFAULT 0,
        email_sent INTEGER DEFAULT 0,
        fee_model TEXT DEFAULT 'standard',
        escrow_address TEXT,
        sender_wallet TEXT,
        fee_amount TEXT DEFAULT '0',
        deposit_tx_hash TEXT,
        deposit_confirmed INTEGER DEFAULT 0,
        receiver_token TEXT DEFAULT NULL,
        sender_token TEXT DEFAULT NULL,
        sender_message TEXT DEFAULT NULL,
        sender_verification_type TEXT DEFAULT NULL,
        sender_verified_name TEXT DEFAULT NULL,
        sender_verified_nationality TEXT DEFAULT NULL,
        sender_verified_ethnicity TEXT DEFAULT NULL,
        escrow_agent_wallet TEXT DEFAULT NULL,
        cross_chain_tx_hashes TEXT DEFAULT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_claim_token ON remittances(claim_token);
      CREATE INDEX IF NOT EXISTS idx_status ON remittances(status);
      CREATE INDEX IF NOT EXISTS idx_recipient_email ON remittances(recipient_email);
    `;

    try {
      this.db.exec(schema);
      this.runMigrations();
      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema', error);
      throw error;
    }
  }

  private runMigrations() {
    // Add new columns to existing databases (SQLite doesn't support IF NOT EXISTS for columns)
    const migrations = [
      { column: 'require_auth', sql: 'ALTER TABLE remittances ADD COLUMN require_auth INTEGER DEFAULT 0' },
      { column: 'chain', sql: 'ALTER TABLE remittances ADD COLUMN chain TEXT DEFAULT \'celo\'' },
      { column: 'self_verification_id', sql: 'ALTER TABLE remittances ADD COLUMN self_verification_id TEXT' },
      { column: 'self_verified', sql: 'ALTER TABLE remittances ADD COLUMN self_verified INTEGER DEFAULT 0' },
      { column: 'email_sent', sql: 'ALTER TABLE remittances ADD COLUMN email_sent INTEGER DEFAULT 0' },
      { column: 'receiver_token', sql: 'ALTER TABLE remittances ADD COLUMN receiver_token TEXT DEFAULT NULL' },
      { column: 'sender_token', sql: 'ALTER TABLE remittances ADD COLUMN sender_token TEXT DEFAULT NULL' },
      { column: 'sender_message', sql: 'ALTER TABLE remittances ADD COLUMN sender_message TEXT DEFAULT NULL' },
      { column: 'sender_verification_type', sql: 'ALTER TABLE remittances ADD COLUMN sender_verification_type TEXT DEFAULT NULL' },
      { column: 'sender_verified_name', sql: 'ALTER TABLE remittances ADD COLUMN sender_verified_name TEXT DEFAULT NULL' },
      { column: 'sender_verified_nationality', sql: 'ALTER TABLE remittances ADD COLUMN sender_verified_nationality TEXT DEFAULT NULL' },
      { column: 'sender_verified_ethnicity', sql: 'ALTER TABLE remittances ADD COLUMN sender_verified_ethnicity TEXT DEFAULT NULL' },
      { column: 'escrow_agent_wallet', sql: 'ALTER TABLE remittances ADD COLUMN escrow_agent_wallet TEXT DEFAULT NULL' },
      { column: 'cross_chain_tx_hashes', sql: 'ALTER TABLE remittances ADD COLUMN cross_chain_tx_hashes TEXT DEFAULT NULL' },
    ];

    for (const migration of migrations) {
      try {
        // Check if column exists by querying table info
        const columns = this.db.prepare('PRAGMA table_info(remittances)').all() as { name: string }[];
        const hasColumn = columns.some(c => c.name === migration.column);
        if (!hasColumn) {
          this.db.exec(migration.sql);
          logger.info(`Migration: added column ${migration.column}`);
        }
      } catch (error) {
        // Column likely already exists, ignore
        logger.debug(`Migration skipped for ${migration.column}: ${error}`);
      }
    }
  }

  getDb(): Database.Database {
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }
}

export const database = DatabaseManager.getInstance();
export const db: Database.Database = database.getDb();
