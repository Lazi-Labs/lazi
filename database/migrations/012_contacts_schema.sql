-- =============================================================================
-- CUSTOMER CONTACTS SCHEMA
-- Migration 012: Customer Contacts Integration
-- =============================================================================
-- Three-tier schema: raw -> master -> crm
-- =============================================================================

-- Raw schema: Immutable API responses from ServiceTitan
CREATE SCHEMA IF NOT EXISTS raw;

-- Master schema: Denormalized, query-optimized data
CREATE SCHEMA IF NOT EXISTS master;

-- CRM schema: User-editable data with overrides
CREATE SCHEMA IF NOT EXISTS crm;

-- =============================================================================
-- RAW SCHEMA - ServiceTitan API Responses
-- =============================================================================

CREATE TABLE IF NOT EXISTS raw.st_contacts (
    id SERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_contacts_st_id ON raw.st_contacts(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_contacts_customer_id ON raw.st_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_raw_contacts_fetched ON raw.st_contacts(fetched_at);

-- =============================================================================
-- MASTER SCHEMA - Denormalized Contacts
-- =============================================================================

CREATE TABLE IF NOT EXISTS master.contacts (
    id SERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE,
    customer_id BIGINT,
    
    -- Contact info
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    full_name VARCHAR(511) GENERATED ALWAYS AS (
        TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    ) STORED,
    email VARCHAR(255),
    phone VARCHAR(50),
    phone_type VARCHAR(50),
    mobile_phone VARCHAR(50),
    
    -- Contact role/type
    contact_type VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    
    -- Address (denormalized from customer if needed)
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(50),
    address_zip VARCHAR(20),
    
    -- Communication preferences
    email_opt_in BOOLEAN DEFAULT true,
    sms_opt_in BOOLEAN DEFAULT true,
    do_not_contact BOOLEAN DEFAULT false,
    
    -- ServiceTitan metadata
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    
    -- Sync metadata
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_contacts_customer ON master.contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_master_contacts_email ON master.contacts(email);
CREATE INDEX IF NOT EXISTS idx_master_contacts_phone ON master.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_master_contacts_name ON master.contacts(full_name);
CREATE INDEX IF NOT EXISTS idx_master_contacts_primary ON master.contacts(customer_id, is_primary) WHERE is_primary = true;

-- =============================================================================
-- CRM SCHEMA - User Overrides & Extensions
-- =============================================================================

CREATE TABLE IF NOT EXISTS crm.contact_overrides (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES master.contacts(id) ON DELETE CASCADE,
    
    -- Override fields (null = use master value)
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    
    -- CRM-specific fields
    lead_source VARCHAR(100),
    lead_status VARCHAR(50),
    assigned_to INTEGER, -- User ID
    tags TEXT[],
    notes TEXT,
    
    -- Custom fields as JSONB for flexibility
    custom_fields JSONB DEFAULT '{}',
    
    -- Audit
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_overrides_contact ON crm.contact_overrides(contact_id);

-- =============================================================================
-- UNIFIED VIEW - Combines master + CRM overrides
-- =============================================================================

CREATE OR REPLACE VIEW crm.contacts_unified AS
SELECT 
    m.id,
    m.st_id,
    m.customer_id,
    
    -- Use override if exists, otherwise master
    COALESCE(o.first_name, m.first_name) AS first_name,
    COALESCE(o.last_name, m.last_name) AS last_name,
    TRIM(
        COALESCE(o.first_name, m.first_name, '') || ' ' || 
        COALESCE(o.last_name, m.last_name, '')
    ) AS full_name,
    COALESCE(o.email, m.email) AS email,
    COALESCE(o.phone, m.phone) AS phone,
    COALESCE(o.mobile_phone, m.mobile_phone) AS mobile_phone,
    
    -- Master-only fields
    m.phone_type,
    m.contact_type,
    m.is_primary,
    m.address_street,
    m.address_city,
    m.address_state,
    m.address_zip,
    m.email_opt_in,
    m.sms_opt_in,
    m.do_not_contact,
    
    -- CRM-only fields
    o.lead_source,
    o.lead_status,
    o.assigned_to,
    o.tags,
    o.notes,
    o.custom_fields,
    
    -- Metadata
    m.st_created_on,
    m.st_modified_on,
    m.synced_at,
    GREATEST(m.updated_at, COALESCE(o.updated_at, m.updated_at)) AS updated_at,
    
    -- Flags
    o.id IS NOT NULL AS has_overrides
    
FROM master.contacts m
LEFT JOIN crm.contact_overrides o ON o.contact_id = m.id;

-- =============================================================================
-- TRIGGER: Auto-populate master from raw
-- =============================================================================

CREATE OR REPLACE FUNCTION raw.populate_master_contact()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO master.contacts (
        st_id,
        customer_id,
        first_name,
        last_name,
        email,
        phone,
        phone_type,
        mobile_phone,
        contact_type,
        is_primary,
        st_created_on,
        st_modified_on,
        synced_at
    )
    VALUES (
        NEW.st_id,
        NEW.customer_id,
        NEW.full_data->>'firstName',
        NEW.full_data->>'lastName',
        NEW.full_data->>'email',
        NEW.full_data->'phoneSettings'->>'phoneNumber',
        NEW.full_data->'phoneSettings'->>'phoneType',
        NEW.full_data->>'mobilePhone',
        NEW.full_data->>'type',
        COALESCE((NEW.full_data->>'isPrimary')::boolean, false),
        (NEW.full_data->>'createdOn')::timestamptz,
        (NEW.full_data->>'modifiedOn')::timestamptz,
        NOW()
    )
    ON CONFLICT (st_id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        phone_type = EXCLUDED.phone_type,
        mobile_phone = EXCLUDED.mobile_phone,
        contact_type = EXCLUDED.contact_type,
        is_primary = EXCLUDED.is_primary,
        st_modified_on = EXCLUDED.st_modified_on,
        synced_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_master_contact ON raw.st_contacts;
CREATE TRIGGER trg_populate_master_contact
AFTER INSERT OR UPDATE ON raw.st_contacts
FOR EACH ROW EXECUTE FUNCTION raw.populate_master_contact();
