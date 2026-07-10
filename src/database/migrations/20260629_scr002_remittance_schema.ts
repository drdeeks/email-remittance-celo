import { logger } from '../../utils/logger';
import { db } from '../database';

export async function up() {
  try {
    logger.info('Running SCR-002 Email Remittance Core Schema Migration');

    // Users table (identity-verified humans)
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        world_id_nullifier VARCHAR(66) UNIQUE,
        passport_score INTEGER DEFAULT 0,
        passport_stamps JSONB DEFAULT '[]',
        wallet_address VARCHAR(42) UNIQUE,
        email VARCHAR(255) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_verified_at TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'active'
            CHECK (status IN ('active', 'suspended', 'banned'))
      );
      COMMENT ON TABLE users IS 'INSERT-only for audit; UPDATE only via admin';
    `);

    // Remittances (email-based transfers)
    db.exec(`
      CREATE TABLE IF NOT EXISTS remittances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID REFERENCES users(id),
        recipient_email VARCHAR(255) NOT NULL,
        recipient_id UUID REFERENCES users(id),
        amount_usd DECIMAL(18,6) NOT NULL,
        amount_tokens DECIMAL(36,18) NOT NULL,
        token_address VARCHAR(42) NOT NULL,
        chain_id INTEGER NOT NULL,
        fee_usd DECIMAL(18,6) NOT NULL,
        fee_tokens DECIMAL(36,18) NOT NULL,
        claim_token VARCHAR(66) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending'
            CHECK (status IN ('pending', 'claimed', 'expired', 'cancelled')),
        expires_at TIMESTAMPTZ NOT NULL,
        claimed_at TIMESTAMPTZ,
        tx_hash VARCHAR(66),
        require_auth INTEGER DEFAULT 0,
        verification_method VARCHAR(10) NOT NULL DEFAULT 'NONE'
            CHECK (verification_method IN ('NONE', 'SELF', 'WORLDID')),
        funding_entity VARCHAR(42),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_remittances_claim_token ON remittances(claim_token);
      CREATE INDEX IF NOT EXISTS idx_remittances_sender ON remittances(sender_id);
      CREATE INDEX IF NOT EXISTS idx_remittances_recipient ON remittances(recipient_id);
      COMMENT ON TABLE remittances IS 'INSERT-only; status transitions only';
    `);

    // Identity verification attempts (audit)
    db.exec(`
      CREATE TABLE IF NOT EXISTS identity_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        provider VARCHAR(30) NOT NULL
            CHECK (provider IN ('world_id', 'human_passport', 'brightid', 'poh')),
        action VARCHAR(50) NOT NULL,
        nullifier VARCHAR(66),
        proof JSONB,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      COMMENT ON TABLE identity_verifications IS 'INSERT-only audit log';
    `);

    // Fee configuration (admin managed)
    db.exec(`
      CREATE TABLE IF NOT EXISTS fee_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chain_id INTEGER NOT NULL,
        token_address VARCHAR(42) NOT NULL,
        base_fee_usd DECIMAL(18,6) DEFAULT 0,
        percentage_fee_bps INTEGER DEFAULT 150,
        min_fee_usd DECIMAL(18,6) DEFAULT 0,
        max_fee_usd DECIMAL(18,6) DEFAULT 100,
        gas_sponsor_limit_usd DECIMAL(18,6) DEFAULT 5,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(chain_id, token_address)
      );
      COMMENT ON TABLE fee_config IS 'Admin managed; INSERT-only for audit';
    `);

    // Idempotency keys for mutating endpoints
    db.exec(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key VARCHAR(66) PRIMARY KEY,
        response JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);
      COMMENT ON TABLE idempotency_keys IS 'Auto-expire after 24h';
    `);

    // Insert default fee configs
    db.exec(`
      INSERT INTO fee_config (chain_id, token_address, base_fee_usd, percentage_fee_bps, gas_sponsor_limit_usd)
      VALUES 
        (42220, '0x765DE816845861e75A25fCA122bb6898B8B1282a', 0.50, 150, 5),  -- Celo USDC
        (42220, '0xCEBA9300F72947C914680F6B4B7E7C7F4E6A8D9E', 0.50, 150, 5),  -- Celo cUSD
        (42161, '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', 0.50, 150, 5),  -- Arbitrum USDC
        (10, '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 0.50, 150, 5)      -- Optimism USDC
      ON CONFLICT (chain_id, token_address) DO NOTHING;
    `);

    logger.info('SCR-002 schema migration completed successfully');
    return true;
  } catch (error) {
    logger.error('SCR-002 migration failed', error);
    return false;
  }
}

export async function down() {
  try {
    logger.info('Rolling back SCR-002 Email Remittance Core Schema');
    
    db.exec('DROP TABLE IF EXISTS idempotency_keys;');
    db.exec('DROP TABLE IF EXISTS fee_config;');
    db.exec('DROP TABLE IF EXISTS identity_verifications;');
    db.exec('DROP TABLE IF EXISTS remittances;');
    db.exec('DROP TABLE IF EXISTS users;');
    
    logger.info('SCR-002 schema rollback completed');
    return true;
  } catch (error) {
    logger.error('Rollback failed', error);
    return false;
  }
}