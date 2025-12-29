-- ============================================================
-- MASTER SCHEMA - Denormalized, Query-Optimized Tables
-- Phase 3: Raw → Master Sync
-- ============================================================

CREATE SCHEMA IF NOT EXISTS master;

-- ────────────────────────────────────────────────────────────
-- master.customers
-- Combines: customers + contacts + primary location
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS master.customers CASCADE;
CREATE TABLE master.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    st_id BIGINT UNIQUE NOT NULL,
    
    -- Core fields
    name VARCHAR(500),
    type VARCHAR(50),  -- Residential, Commercial
    active BOOLEAN DEFAULT true,
    balance DECIMAL(18,4) DEFAULT 0,
    
    -- Contact info (merged from customer_contacts)
    email VARCHAR(255),
    phone VARCHAR(50),
    phone_numbers JSONB,      -- All phone numbers with types
    email_addresses JSONB,    -- All email addresses
    
    -- Primary location (merged from locations)
    primary_location_id BIGINT,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    country VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    
    -- Preferences
    do_not_mail BOOLEAN DEFAULT false,
    do_not_service BOOLEAN DEFAULT false,
    
    -- Tags and custom fields
    tag_type_ids BIGINT[],
    custom_fields JSONB,
    
    -- Tracking
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Full raw data reference
    raw_data JSONB
);

CREATE INDEX idx_master_customers_st_id ON master.customers(st_id);
CREATE INDEX idx_master_customers_email ON master.customers(email);
CREATE INDEX idx_master_customers_phone ON master.customers(phone);
CREATE INDEX idx_master_customers_name ON master.customers USING gin(name gin_trgm_ops);
CREATE INDEX idx_master_customers_city ON master.customers(city);
CREATE INDEX idx_master_customers_active ON master.customers(active);

-- ────────────────────────────────────────────────────────────
-- master.locations
-- Service locations with contact info
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS master.locations CASCADE;
CREATE TABLE master.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    st_id BIGINT UNIQUE NOT NULL,
    
    -- Core fields
    customer_id BIGINT,
    name VARCHAR(500),
    active BOOLEAN DEFAULT true,
    
    -- Address
    street VARCHAR(255),
    unit VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    country VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    
    -- Contact (merged from location_contacts)
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Zone
    zone_id BIGINT,
    tax_zone_id BIGINT,
    
    -- Tags
    tag_type_ids BIGINT[],
    custom_fields JSONB,
    
    -- Tracking
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    raw_data JSONB
);

CREATE INDEX idx_master_locations_st_id ON master.locations(st_id);
CREATE INDEX idx_master_locations_customer ON master.locations(customer_id);
CREATE INDEX idx_master_locations_zone ON master.locations(zone_id);
CREATE INDEX idx_master_locations_city ON master.locations(city);

-- ────────────────────────────────────────────────────────────
-- master.jobs
-- Combines: jobs + appointments + technician assignments
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS master.jobs CASCADE;
CREATE TABLE master.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    st_id BIGINT UNIQUE NOT NULL,
    
    -- Core fields
    job_number VARCHAR(50),
    customer_id BIGINT,
    location_id BIGINT,
    business_unit_id BIGINT,
    job_type_id BIGINT,
    campaign_id BIGINT,
    
    -- Status
    job_status VARCHAR(50),
    priority VARCHAR(20),
    summary TEXT,
    total DECIMAL(18,4),
    
    -- Scheduling (merged from appointments)
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    arrival_window_start TIMESTAMPTZ,
    arrival_window_end TIMESTAMPTZ,
    completed_on TIMESTAMPTZ,
    
    -- Technician (merged from appointment_assignments)
    primary_technician_id BIGINT,
    primary_technician_name VARCHAR(255),
    technician_ids BIGINT[],
    
    -- Sales
    sold_by_id BIGINT,
    sold_by_name VARCHAR(255),
    created_from_estimate_id BIGINT,
    
    -- Tags
    tag_type_ids BIGINT[],
    custom_fields JSONB,
    
    -- Tracking
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    raw_data JSONB
);

CREATE INDEX idx_master_jobs_st_id ON master.jobs(st_id);
CREATE INDEX idx_master_jobs_customer ON master.jobs(customer_id);
CREATE INDEX idx_master_jobs_status ON master.jobs(job_status);
CREATE INDEX idx_master_jobs_scheduled ON master.jobs(scheduled_start);
CREATE INDEX idx_master_jobs_technician ON master.jobs(primary_technician_id);
CREATE INDEX idx_master_jobs_business_unit ON master.jobs(business_unit_id);

-- ────────────────────────────────────────────────────────────
-- master.invoices
-- Combines: invoices + payment totals
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS master.invoices CASCADE;
CREATE TABLE master.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    st_id BIGINT UNIQUE NOT NULL,
    
    -- Core fields
    reference_number VARCHAR(100),
    invoice_date DATE,
    due_date DATE,
    invoice_type VARCHAR(50),
    
    -- Amounts
    subtotal DECIMAL(18,4),
    sales_tax DECIMAL(18,4),
    total DECIMAL(18,4),
    balance DECIMAL(18,4),
    
    -- Payment summary (computed from payments)
    paid_amount DECIMAL(18,4) DEFAULT 0,
    payment_count INT DEFAULT 0,
    last_payment_date TIMESTAMPTZ,
    is_paid BOOLEAN GENERATED ALWAYS AS (balance <= 0) STORED,
    
    -- References
    customer_id BIGINT,
    customer_name VARCHAR(500),
    location_id BIGINT,
    job_id BIGINT,
    job_number VARCHAR(50),
    business_unit_id BIGINT,
    
    -- Line items
    items JSONB,
    
    -- Status
    active BOOLEAN DEFAULT true,
    sync_status VARCHAR(50),
    
    -- Tracking
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    raw_data JSONB
);

CREATE INDEX idx_master_invoices_st_id ON master.invoices(st_id);
CREATE INDEX idx_master_invoices_customer ON master.invoices(customer_id);
CREATE INDEX idx_master_invoices_job ON master.invoices(job_id);
CREATE INDEX idx_master_invoices_date ON master.invoices(invoice_date);
CREATE INDEX idx_master_invoices_balance ON master.invoices(balance) WHERE balance > 0;

-- ────────────────────────────────────────────────────────────
-- master.estimates
-- Denormalized estimates with expanded items
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS master.estimates CASCADE;
CREATE TABLE master.estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    st_id BIGINT UNIQUE NOT NULL,
    
    -- Core fields
    name VARCHAR(255),
    job_number VARCHAR(50),
    status VARCHAR(50),
    review_status VARCHAR(50),
    summary TEXT,
    
    -- Amounts
    subtotal DECIMAL(18,4),
    tax DECIMAL(18,4),
    total DECIMAL(18,4) GENERATED ALWAYS AS (COALESCE(subtotal, 0) + COALESCE(tax, 0)) STORED,
    
    -- References
    customer_id BIGINT,
    customer_name VARCHAR(500),
    location_id BIGINT,
    job_id BIGINT,
    project_id BIGINT,
    business_unit_id BIGINT,
    
    -- Sales
    sold_on TIMESTAMPTZ,
    sold_by_id BIGINT,
    sold_by_name VARCHAR(255),
    is_sold BOOLEAN GENERATED ALWAYS AS (status = 'Sold') STORED,
    
    -- Line items (expanded)
    items JSONB,
    item_count INT,
    
    -- Status
    active BOOLEAN DEFAULT true,
    
    -- Tracking
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    raw_data JSONB
);

CREATE INDEX idx_master_estimates_st_id ON master.estimates(st_id);
CREATE INDEX idx_master_estimates_customer ON master.estimates(customer_id);
CREATE INDEX idx_master_estimates_status ON master.estimates(status);
CREATE INDEX idx_master_estimates_sold ON master.estimates(is_sold);

-- ────────────────────────────────────────────────────────────
-- master.technicians
-- Denormalized technicians with stats
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS master.technicians CASCADE;
CREATE TABLE master.technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    st_id BIGINT UNIQUE NOT NULL,
    
    -- Core fields
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    login_name VARCHAR(100),
    
    -- Assignment
    business_unit_id BIGINT,
    main_zone_id BIGINT,
    zone_ids BIGINT[],
    role_ids BIGINT[],
    
    -- Performance (computed)
    daily_goal DECIMAL(18,4),
    burden_rate DECIMAL(18,4),
    
    -- Status
    active BOOLEAN DEFAULT true,
    is_managed_tech BOOLEAN DEFAULT false,
    
    -- Tracking
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    raw_data JSONB
);

CREATE INDEX idx_master_technicians_st_id ON master.technicians(st_id);
CREATE INDEX idx_master_technicians_active ON master.technicians(active);
CREATE INDEX idx_master_technicians_business_unit ON master.technicians(business_unit_id);

-- ────────────────────────────────────────────────────────────
-- Reference tables (simple copy, no merge needed)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS master.business_units CASCADE;
CREATE TABLE master.business_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    st_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    official_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    active BOOLEAN DEFAULT true,
    address JSONB,
    trade VARCHAR(100),
    raw_data JSONB,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS master.job_types CASCADE;
CREATE TABLE master.job_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    st_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    duration INT,
    priority VARCHAR(20),
    active BOOLEAN DEFAULT true,
    raw_data JSONB,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS master.campaigns CASCADE;
CREATE TABLE master.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    st_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    code VARCHAR(50),
    category_id BIGINT,
    active BOOLEAN DEFAULT true,
    raw_data JSONB,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT ALL ON SCHEMA master TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA master TO postgres;
