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
        claimed_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_claim_token ON remittances(claim_token);
      CREATE INDEX IF NOT EXISTS idx_status ON remittances(status);
      CREATE INDEX IF NOT EXISTS idx_recipient_email ON remittances(recipient_email);
    `;

    try {
      this.db.exec(schema);
      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema', error);
      throw error;
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
