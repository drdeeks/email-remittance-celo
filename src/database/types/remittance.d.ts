declare module '../../database/database' {
  import { Knex } from 'knex';
  
  interface Remittance {
    id: string;
    sender_email: string;
    recipient_email: string;
    amount: number;
    currency: string;
    original_amount: number;
    amount_celo: number;
    platform_fee: number;
    status: string;
    token: string;
    sender_wallet: string;
    recipient_wallet: string;
    wallet_mode: string;
    require_auth: boolean;
    email_sent: boolean;
    email_sent_at?: Date;
    email_failed: boolean;
    email_failed_at?: Date;
    created_at: Date;
    updated_at: Date;
  }
  
  interface Database {
    remittances: Knex.QueryBuilder<Remittance>;
    run: (sql: string, params?: any[]) => Promise<{ lastID: number }>;
    get: (sql: string, params?: any[]) => Promise<any>;
    all: (sql: string, params?: any[]) => Promise<any[]>;
    raw: Knex.RawBuilder;
  }
  
  const db: Database;
  export = db;
}
