-- ============================================
-- Perfect Catch - RAW Schema Tables
-- ============================================
-- Run order: 03
-- 
-- Purpose: Store exact copies of ServiceTitan API responses
-- Rules:
--   - Never modify data after insert (immutable)
--   - Always store full_data JSONB with complete API response
--   - Use source_hash for change detection
-- ============================================

-- Customers from ST
CREATE TABLE IF NOT EXISTS raw.st_customers (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(500),
    type VARCHAR(50),
    active BOOLEAN DEFAULT true,
    balance DECIMAL(18,4) DEFAULT 0,
    do_not_mail BOOLEAN DEFAULT false,
    do_not_service BOOLEAN DEFAULT false,
    address JSONB DEFAULT '{}',
    custom_fields JSONB DEFAULT '[]',
    tag_type_ids BIGINT[] DEFAULT '{}',
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    source_hash VARCHAR(64)
);

-- Customer contacts
CREATE TABLE IF NOT EXISTS raw.st_customer_contacts (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    type VARCHAR(50),
    value TEXT,
    memo TEXT,
    phone_settings JSONB,
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(st_id, customer_id)
);

-- Locations
CREATE TABLE IF NOT EXISTS raw.st_locations (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    name VARCHAR(500),
    address JSONB DEFAULT '{}',
    zone_id BIGINT,
    tax_zone_id BIGINT,
    active BOOLEAN DEFAULT true,
    custom_fields JSONB DEFAULT '[]',
    tag_type_ids BIGINT[] DEFAULT '{}',
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location contacts
CREATE TABLE IF NOT EXISTS raw.st_location_contacts (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    location_id BIGINT NOT NULL,
    type VARCHAR(50),
    value TEXT,
    memo TEXT,
    phone_settings JSONB,
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(st_id, location_id)
);

-- Jobs
CREATE TABLE IF NOT EXISTS raw.st_jobs (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    job_number VARCHAR(100),
    customer_id BIGINT,
    location_id BIGINT,
    business_unit_id BIGINT,
    job_type_id BIGINT,
    campaign_id BIGINT,
    priority VARCHAR(20) DEFAULT 'Normal',
    job_status VARCHAR(50),
    summary TEXT,
    completed_on TIMESTAMPTZ,
    total DECIMAL(18,4) DEFAULT 0,
    tag_type_ids BIGINT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '[]',
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS raw.st_appointments (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    appointment_number VARCHAR(50),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    arrival_window_start TIMESTAMPTZ,
    arrival_window_end TIMESTAMPTZ,
    status VARCHAR(50),
    special_instructions TEXT,
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment technician assignments
CREATE TABLE IF NOT EXISTS raw.st_appointment_assignments (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    appointment_id BIGINT NOT NULL,
    technician_id BIGINT NOT NULL,
    assigned_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id, technician_id)
);

-- Estimates
CREATE TABLE IF NOT EXISTS raw.st_estimates (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    job_id BIGINT,
    customer_id BIGINT,
    location_id BIGINT,
    business_unit_id BIGINT,
    name VARCHAR(255),
    status VARCHAR(50),
    review_status VARCHAR(50),
    summary TEXT,
    sold_on TIMESTAMPTZ,
    sold_by BIGINT,
    subtotal DECIMAL(18,4) DEFAULT 0,
    tax DECIMAL(18,4) DEFAULT 0,
    items JSONB DEFAULT '[]',
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS raw.st_invoices (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    job_id BIGINT,
    customer_id BIGINT,
    location_id BIGINT,
    business_unit_id BIGINT,
    reference_number VARCHAR(100),
    invoice_date DATE,
    due_date DATE,
    subtotal DECIMAL(18,4) DEFAULT 0,
    sales_tax DECIMAL(18,4) DEFAULT 0,
    total DECIMAL(18,4) DEFAULT 0,
    balance DECIMAL(18,4) DEFAULT 0,
    items JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '[]',
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS raw.st_payments (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    customer_id BIGINT,
    invoice_id BIGINT,
    reference_number VARCHAR(255),
    payment_type VARCHAR(50),
    payment_date TIMESTAMPTZ,
    total DECIMAL(18,4) DEFAULT 0,
    unapplied_amount DECIMAL(18,4) DEFAULT 0,
    applied_to JSONB DEFAULT '[]',
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technicians
CREATE TABLE IF NOT EXISTS raw.st_technicians (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    business_unit_id BIGINT,
    main_zone_id BIGINT,
    zone_ids BIGINT[] DEFAULT '{}',
    role_ids BIGINT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    custom_fields JSONB DEFAULT '[]',
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS raw.st_employees (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    role_ids BIGINT[] DEFAULT '{}',
    business_unit_id BIGINT,
    active BOOLEAN DEFAULT true,
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Units
CREATE TABLE IF NOT EXISTS raw.st_business_units (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255),
    official_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address JSONB,
    active BOOLEAN DEFAULT true,
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE IF NOT EXISTS raw.st_campaigns (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255),
    code VARCHAR(50),
    category_id BIGINT,
    active BOOLEAN DEFAULT true,
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Types
CREATE TABLE IF NOT EXISTS raw.st_job_types (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255),
    business_unit_ids BIGINT[] DEFAULT '{}',
    duration INT,
    priority VARCHAR(20),
    active BOOLEAN DEFAULT true,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tag Types
CREATE TABLE IF NOT EXISTS raw.st_tag_types (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255),
    code VARCHAR(50),
    color VARCHAR(20),
    entity_type VARCHAR(50),
    active BOOLEAN DEFAULT true,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zones
CREATE TABLE IF NOT EXISTS raw.st_zones (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255),
    active BOOLEAN DEFAULT true,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS raw.st_teams (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255),
    active BOOLEAN DEFAULT true,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricebook Categories
CREATE TABLE IF NOT EXISTS raw.st_pricebook_categories (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255),
    description TEXT,
    image TEXT,
    parent_id BIGINT,
    position INT,
    category_type VARCHAR(50),
    subcategories JSONB DEFAULT '[]',
    business_unit_ids BIGINT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricebook Materials
CREATE TABLE IF NOT EXISTS raw.st_pricebook_materials (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    code VARCHAR(100),
    display_name VARCHAR(500),
    description TEXT,
    cost DECIMAL(18,4),
    price DECIMAL(18,4),
    member_price DECIMAL(18,4),
    add_on_price DECIMAL(18,4),
    hours DECIMAL(8,4),
    unit_of_measure VARCHAR(50),
    taxable BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    categories JSONB DEFAULT '[]',
    primary_vendor JSONB,
    other_vendors JSONB DEFAULT '[]',
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricebook Services
CREATE TABLE IF NOT EXISTS raw.st_pricebook_services (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    code VARCHAR(100),
    display_name VARCHAR(500),
    description TEXT,
    price DECIMAL(18,4),
    member_price DECIMAL(18,4),
    add_on_price DECIMAL(18,4),
    hours DECIMAL(8,4),
    taxable BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    categories JSONB DEFAULT '[]',
    service_materials JSONB DEFAULT '[]',
    service_equipment JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricebook Equipment
CREATE TABLE IF NOT EXISTS raw.st_pricebook_equipment (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    code VARCHAR(100),
    display_name VARCHAR(500),
    description TEXT,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    cost DECIMAL(18,4),
    price DECIMAL(18,4),
    member_price DECIMAL(18,4),
    add_on_price DECIMAL(18,4),
    taxable BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    categories JSONB DEFAULT '[]',
    manufacturer_warranty JSONB,
    service_warranty JSONB,
    primary_vendor JSONB,
    other_vendors JSONB DEFAULT '[]',
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Installed Equipment
CREATE TABLE IF NOT EXISTS raw.st_installed_equipment (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    location_id BIGINT,
    customer_id BIGINT,
    equipment_id BIGINT,
    name VARCHAR(255),
    type VARCHAR(100),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(100),
    installed_on TIMESTAMPTZ,
    created_on TIMESTAMPTZ,
    modified_on TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync State Tracking
CREATE TABLE IF NOT EXISTS raw.sync_state (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) UNIQUE NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    last_full_sync TIMESTAMPTZ,
    last_incremental_sync TIMESTAMPTZ,
    last_modified_on_cursor TIMESTAMPTZ,
    continuation_token TEXT,
    records_count BIGINT DEFAULT 0,
    sync_status VARCHAR(50) DEFAULT 'pending',
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log completion
DO $$ BEGIN RAISE NOTICE 'RAW schema tables created (24 tables)'; END $$;
