-- Database Schema for Email-Crypto Remittance

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (collected via Self verification)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(254) UNIQUE NOT NULL,
    self_verification_hash VARCHAR(255) UNIQUE NOT NULL,
    self_issuer VARCHAR(255),
    celo_address VARCHAR(42),
    country_code CHAR(2),
    age_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ
);

-- Email verification tokens (for initial claim link)
CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(254) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ
);

-- Transactions/Remittances
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_email VARCHAR(254) NOT NULL,
    recipient_email VARCHAR(254) NOT NULL,
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL, -- 'cUSD' or 'cREAL'
    status VARCHAR(50) DEFAULT 'pending', -- pending, locked, verified, disbursed, failed, cancelled
    sender_celo_tx_hash VARCHAR(66),
    disbursement_tx_hash VARCHAR(66),
    lock_tx_hash VARCHAR(66),
    ampersend_message_id VARCHAR(100),
    verification_flow_token VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Self verification sessions
CREATE TABLE self_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verification_token VARCHAR(100) UNIQUE NOT NULL,
    self_verification_id VARCHAR(255),
    self_issuance_proof TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, verified, failed, expired
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Email logs (Ampersend tracking)
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    ampersend_message_id VARCHAR(100) UNIQUE,
    direction VARCHAR(20) NOT NULL, -- 'inbound' or 'outbound'
    subject TEXT,
    email_type VARCHAR(50), -- 'claim_request', 'claim_success', 'claim_failed', 'receipt', etc.
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trail
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_recipient_email ON transactions(recipient_email);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_expires_at ON transactions(expires_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_self_verifications_transaction_id ON self_verifications(transaction_id);
CREATE INDEX idx_self_verifications_token ON self_verifications(verification_token);
CREATE INDEX idx_email_logs_transaction_id ON email_logs(transaction_id);
CREATE INDEX idx_email_logs_message_id ON email_logs(ampersend_message_id);
CREATE INDEX idx_audit_logs_transaction_id ON audit_logs(transaction_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Row Level Security (optional, for enhanced security)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY user_isolation_policy ON users USING (auth.uid() = user_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();