-- Plaid Integration Tables
-- Run this migration to add bank connection support

-- PlaidItems: Stores the Plaid Item (bank connection) for each user
CREATE TABLE IF NOT EXISTS plaid_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL, -- ENCRYPTED - never store plaintext!
    item_id VARCHAR(255) NOT NULL UNIQUE,
    institution_id VARCHAR(255),
    institution_name VARCHAR(255),
    cursor TEXT, -- For transaction sync pagination
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'error', 'pending_expiration', 'revoked')),
    consent_expires_at TIMESTAMP WITH TIME ZONE,
    error_code VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PlaidAccounts: Individual bank accounts linked to a Plaid Item
CREATE TABLE IF NOT EXISTS plaid_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plaid_item_id UUID NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
    account_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    official_name VARCHAR(255),
    type VARCHAR(50), -- depository, credit, loan, investment, etc.
    subtype VARCHAR(50), -- checking, savings, credit card, etc.
    mask VARCHAR(10), -- Last 4 digits
    current_balance DECIMAL(15, 2),
    available_balance DECIMAL(15, 2),
    iso_currency_code VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BankTransactions: Imported transactions from Plaid
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plaid_account_id UUID NOT NULL REFERENCES plaid_accounts(id) ON DELETE CASCADE,
    plaid_transaction_id VARCHAR(255) NOT NULL UNIQUE,
    amount DECIMAL(15, 2) NOT NULL, -- Positive = money out, Negative = money in (Plaid convention)
    date DATE NOT NULL,
    datetime TIMESTAMP WITH TIME ZONE,
    name VARCHAR(500),
    merchant_name VARCHAR(255),
    category JSONB, -- Array of category strings from Plaid
    category_id VARCHAR(100),
    payment_channel VARCHAR(50), -- online, in store, other
    pending BOOLEAN DEFAULT false,
    pending_transaction_id VARCHAR(255),
    iso_currency_code VARCHAR(10) DEFAULT 'USD',
    -- Reconciliation fields
    matched_invoice_id UUID, -- FK to invoices table when matched
    match_confidence DECIMAL(5, 2), -- 0-100 confidence score
    match_status VARCHAR(50) DEFAULT 'unmatched' CHECK (match_status IN ('unmatched', 'auto_matched', 'manual_matched', 'confirmed', 'ignored')),
    matched_at TIMESTAMP WITH TIME ZONE,
    matched_by VARCHAR(255), -- user who confirmed the match
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plaid_items_user_tenant ON plaid_items(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id ON plaid_items(item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_status ON plaid_items(status);

CREATE INDEX IF NOT EXISTS idx_plaid_accounts_item ON plaid_accounts(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_type ON plaid_accounts(type);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(plaid_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_match_status ON bank_transactions(match_status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_pending ON bank_transactions(pending);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_merchant ON bank_transactions(merchant_name);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_plaid_items_updated_at ON plaid_items;
CREATE TRIGGER update_plaid_items_updated_at
    BEFORE UPDATE ON plaid_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plaid_accounts_updated_at ON plaid_accounts;
CREATE TRIGGER update_plaid_accounts_updated_at
    BEFORE UPDATE ON plaid_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bank_transactions_updated_at ON bank_transactions;
CREATE TRIGGER update_bank_transactions_updated_at
    BEFORE UPDATE ON bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE plaid_items IS 'Stores Plaid Item connections (bank institution links) per user';
COMMENT ON TABLE plaid_accounts IS 'Individual bank accounts from Plaid Items';
COMMENT ON TABLE bank_transactions IS 'Imported bank transactions from Plaid for reconciliation';
COMMENT ON COLUMN plaid_items.access_token IS 'ENCRYPTED access token - never expose or log this value';
COMMENT ON COLUMN plaid_items.cursor IS 'Cursor for Plaid Transaction Sync API pagination';
COMMENT ON COLUMN bank_transactions.match_status IS 'unmatched: not matched, auto_matched: AI matched, manual_matched: user matched, confirmed: verified, ignored: user chose to ignore';
