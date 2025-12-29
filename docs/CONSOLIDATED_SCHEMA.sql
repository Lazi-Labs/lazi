-- ============================================================
-- LAZI (Perfect Catch CRM) - Consolidated Database Schema
-- For Supabase Migration
-- ============================================================
-- 
-- This file consolidates all SQL schema definitions for migration
-- to Supabase. Run in order from top to bottom.
--
-- Generated: December 2024
-- ============================================================

-- ============================================================
-- PART 1: EXTENSIONS
-- ============================================================
-- Note: Some extensions may need to be enabled via Supabase Dashboard

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Optional: Enable if using vector embeddings
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- PART 2: SCHEMAS (Optional - Prisma uses public schema)
-- ============================================================
-- Uncomment if you want to use separate schemas

-- CREATE SCHEMA IF NOT EXISTS raw;
-- CREATE SCHEMA IF NOT EXISTS master;
-- CREATE SCHEMA IF NOT EXISTS crm;
-- CREATE SCHEMA IF NOT EXISTS workflow;
-- CREATE SCHEMA IF NOT EXISTS sync;
-- CREATE SCHEMA IF NOT EXISTS audit;

-- ============================================================
-- PART 3: ENUMS
-- ============================================================

DO $$ BEGIN
    CREATE TYPE sync_status AS ENUM (
        'synced', 'pending_sync', 'sync_failed', 'conflict', 'local_only', 'st_only'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sync_direction AS ENUM (
        'from_st', 'to_st', 'bidirectional'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE conflict_status AS ENUM (
        'unresolved', 'resolved_keep_st', 'resolved_keep_local', 'resolved_merged', 'ignored'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE conflict_type AS ENUM (
        'both_modified', 'local_deleted_st_modified', 'st_deleted_local_modified', 'field_conflict'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE change_action AS ENUM (
        'create', 'update', 'delete', 'restore'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE change_source AS ENUM (
        'sync_from_st', 'sync_to_st', 'api', 'chat', 'n8n', 'manual', 'system'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM (
        'category', 'material', 'service', 'equipment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sync_job_status AS ENUM (
        'pending', 'running', 'completed', 'failed', 'partial', 'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ghl_entity_type AS ENUM (
        'contact', 'opportunity', 'task', 'note', 'appointment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ghl_sync_status AS ENUM (
        'pending', 'synced', 'failed', 'skipped', 'conflict'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE scheduling_action_type AS ENUM (
        'book', 'reschedule', 'cancel', 'recommend', 'availability_query', 'smart_match'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE scheduling_entity_type AS ENUM (
        'technician', 'team', 'zone', 'business_hours', 'arrival_window', 'job_type', 'tag'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE scheduling_rule_type AS ENUM (
        'constraint', 'preference', 'optimization'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE skill_level AS ENUM (
        'basic', 'intermediate', 'advanced', 'expert'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- PART 4: CORE SERVICETITAN TABLES
-- ============================================================

-- Customers
CREATE TABLE IF NOT EXISTS st_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(500) NOT NULL,
    type VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(50),
    phone_numbers JSONB DEFAULT '[]',
    email_addresses JSONB DEFAULT '[]',
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(255),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    addresses JSONB DEFAULT '[]',
    balance DECIMAL(18,4) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    do_not_service BOOLEAN DEFAULT false,
    do_not_mail BOOLEAN DEFAULT false,
    tag_type_ids BIGINT[],
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    local_created_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL,
    total_jobs INT DEFAULT 0,
    completed_jobs INT DEFAULT 0,
    lifetime_value DECIMAL(12,2) DEFAULT 0,
    last_job_date TIMESTAMP,
    first_job_date TIMESTAMP,
    aggregates_updated_at TIMESTAMP,
    last_synced_at TIMESTAMP,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    location_id BIGINT,
    postal_code VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_st_customers_st_id ON st_customers(st_id);
CREATE INDEX IF NOT EXISTS idx_st_customers_name ON st_customers(name);
CREATE INDEX IF NOT EXISTS idx_st_customers_email ON st_customers(email);
CREATE INDEX IF NOT EXISTS idx_st_customers_phone ON st_customers(phone);
CREATE INDEX IF NOT EXISTS idx_st_customers_city ON st_customers(city);
CREATE INDEX IF NOT EXISTS idx_st_customers_zip ON st_customers(zip);
CREATE INDEX IF NOT EXISTS idx_st_customers_modified ON st_customers(st_modified_on);

-- Locations
CREATE TABLE IF NOT EXISTS st_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    name VARCHAR(500),
    street VARCHAR(500),
    unit VARCHAR(100),
    city VARCHAR(255),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    phone VARCHAR(50),
    email VARCHAR(255),
    tax_zone_id BIGINT,
    tag_type_ids BIGINT[],
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_st_locations_st_id ON st_locations(st_id);
CREATE INDEX IF NOT EXISTS idx_st_locations_customer ON st_locations(customer_id);
CREATE INDEX IF NOT EXISTS idx_st_locations_city ON st_locations(city);
CREATE INDEX IF NOT EXISTS idx_st_locations_zip ON st_locations(zip);

-- Jobs
CREATE TABLE IF NOT EXISTS st_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    job_number VARCHAR(100) NOT NULL,
    customer_id BIGINT,
    location_id BIGINT,
    business_unit_id BIGINT,
    job_type_id BIGINT,
    campaign_id BIGINT,
    summary TEXT,
    job_status VARCHAR(50),
    job_completion_time TIMESTAMPTZ,
    invoice_total DECIMAL(18,4) DEFAULT 0,
    balance DECIMAL(18,4) DEFAULT 0,
    total_cost DECIMAL(18,4) DEFAULT 0,
    tag_type_ids BIGINT[],
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    ghl_synced_at TIMESTAMPTZ,
    ghl_opportunity_id VARCHAR(255),
    ghl_sync_status VARCHAR(50),
    ghl_sync_error TEXT,
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL,
    technician_name VARCHAR(200),
    priority VARCHAR(50) DEFAULT 'Normal',
    last_synced_at TIMESTAMP,
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    completed_on TIMESTAMP,
    technician_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_st_jobs_st_id ON st_jobs(st_id);
CREATE INDEX IF NOT EXISTS idx_st_jobs_number ON st_jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_st_jobs_customer ON st_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_st_jobs_location ON st_jobs(location_id);
CREATE INDEX IF NOT EXISTS idx_st_jobs_status ON st_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_st_jobs_modified ON st_jobs(st_modified_on);
CREATE INDEX IF NOT EXISTS idx_st_jobs_business_unit ON st_jobs(business_unit_id);

-- Appointments
CREATE TABLE IF NOT EXISTS st_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    status VARCHAR(50),
    start_on TIMESTAMPTZ NOT NULL,
    end_on TIMESTAMPTZ,
    arrival_window_start TIMESTAMPTZ,
    arrival_window_end TIMESTAMPTZ,
    technician_ids BIGINT[],
    custom_fields JSONB DEFAULT '{}',
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL,
    actual_arrival TIMESTAMP,
    actual_departure TIMESTAMP,
    technician_name VARCHAR(200),
    last_synced_at TIMESTAMP,
    appointment_number VARCHAR(100),
    type VARCHAR(100),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INT DEFAULT 60,
    notes TEXT,
    customer_id BIGINT,
    location_id BIGINT,
    technician_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_st_appointments_st_id ON st_appointments(st_id);
CREATE INDEX IF NOT EXISTS idx_st_appointments_job ON st_appointments(job_id);
CREATE INDEX IF NOT EXISTS idx_st_appointments_start ON st_appointments(start_on);
CREATE INDEX IF NOT EXISTS idx_st_appointments_status ON st_appointments(status);
CREATE INDEX IF NOT EXISTS idx_st_appointments_techs ON st_appointments USING gin(technician_ids);

-- Estimates
CREATE TABLE IF NOT EXISTS st_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    location_id BIGINT,
    estimate_number VARCHAR(100) NOT NULL,
    name VARCHAR(500),
    status VARCHAR(50),
    sold_by BIGINT,
    sold_on TIMESTAMPTZ,
    subtotal DECIMAL(18,4) DEFAULT 0,
    total DECIMAL(18,4) DEFAULT 0,
    tax DECIMAL(12,2) DEFAULT 0,
    items JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL,
    item_count INT DEFAULT 0,
    sold_by_id BIGINT,
    last_synced_at TIMESTAMP,
    business_unit_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_st_estimates_st_id ON st_estimates(st_id);
CREATE INDEX IF NOT EXISTS idx_st_estimates_job ON st_estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_st_estimates_customer ON st_estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_st_estimates_status ON st_estimates(status);
CREATE INDEX IF NOT EXISTS idx_st_estimates_number ON st_estimates(estimate_number);
CREATE INDEX IF NOT EXISTS idx_st_estimates_modified ON st_estimates(st_modified_on);

-- Invoices
CREATE TABLE IF NOT EXISTS st_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    location_id BIGINT,
    business_unit_id BIGINT NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    status VARCHAR(50),
    invoice_date DATE,
    due_date DATE,
    subtotal DECIMAL(18,4) DEFAULT 0,
    total DECIMAL(18,4) DEFAULT 0,
    tax DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(18,4) DEFAULT 0,
    items JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    payment_count INT DEFAULT 0,
    paid_on TIMESTAMP,
    last_synced_at TIMESTAMP,
    payments TEXT,
    item_count INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_st_invoices_st_id ON st_invoices(st_id);
CREATE INDEX IF NOT EXISTS idx_st_invoices_job ON st_invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_st_invoices_customer ON st_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_st_invoices_number ON st_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_st_invoices_status ON st_invoices(status);
CREATE INDEX IF NOT EXISTS idx_st_invoices_due_date ON st_invoices(due_date);

-- Payments
CREATE TABLE IF NOT EXISTS st_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    invoice_id BIGINT,
    payment_number VARCHAR(100),
    payment_type VARCHAR(50),
    payment_method VARCHAR(100),
    status VARCHAR(50),
    amount DECIMAL(18,4) NOT NULL,
    unapplied_amount DECIMAL(18,4) DEFAULT 0,
    payment_date DATE,
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_st_payments_st_id ON st_payments(st_id);
CREATE INDEX IF NOT EXISTS idx_st_payments_customer ON st_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_st_payments_invoice ON st_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_st_payments_date ON st_payments(payment_date);

-- Technicians
CREATE TABLE IF NOT EXISTS st_technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    business_unit_id BIGINT,
    active BOOLEAN DEFAULT true,
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL,
    total_jobs INT DEFAULT 0,
    completed_jobs INT DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    skills JSONB DEFAULT '[]',
    hire_date DATE,
    last_synced_at TIMESTAMP,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(100),
    is_technician BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_st_technicians_st_id ON st_technicians(st_id);
CREATE INDEX IF NOT EXISTS idx_st_technicians_name ON st_technicians(name);
CREATE INDEX IF NOT EXISTS idx_st_technicians_active ON st_technicians(active);
CREATE INDEX IF NOT EXISTS idx_st_technicians_business_unit ON st_technicians(business_unit_id);

-- Employees
CREATE TABLE IF NOT EXISTS st_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    business_unit_id BIGINT,
    active BOOLEAN DEFAULT true,
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL,
    last_synced_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_st_employees_st_id ON st_employees(st_id);
CREATE INDEX IF NOT EXISTS idx_st_employees_name ON st_employees(name);
CREATE INDEX IF NOT EXISTS idx_st_employees_active ON st_employees(active);
CREATE INDEX IF NOT EXISTS idx_st_employees_role ON st_employees(role);
CREATE INDEX IF NOT EXISTS idx_st_employees_business_unit ON st_employees(business_unit_id);

-- Business Units
CREATE TABLE IF NOT EXISTS st_business_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    official_name VARCHAR(255),
    active BOOLEAN DEFAULT true,
    ghl_pipeline_id VARCHAR(255),
    ghl_location_id VARCHAR(255),
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL,
    total_jobs INT DEFAULT 0,
    active_jobs INT DEFAULT 0,
    last_synced_at TIMESTAMP,
    code VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT
);

CREATE INDEX IF NOT EXISTS idx_st_business_units_st_id ON st_business_units(st_id);
CREATE INDEX IF NOT EXISTS idx_st_business_units_name ON st_business_units(name);
CREATE INDEX IF NOT EXISTS idx_st_business_units_active ON st_business_units(active);

-- Campaigns
CREATE TABLE IF NOT EXISTS st_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id BIGINT,
    active BOOLEAN DEFAULT true,
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL,
    last_synced_at TIMESTAMP,
    code VARCHAR(50),
    category VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_st_campaigns_st_id ON st_campaigns(st_id);
CREATE INDEX IF NOT EXISTS idx_st_campaigns_name ON st_campaigns(name);
CREATE INDEX IF NOT EXISTS idx_st_campaigns_active ON st_campaigns(active);

-- Job Types
CREATE TABLE IF NOT EXISTS st_job_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL,
    last_synced_at TIMESTAMP,
    code VARCHAR(50),
    business_unit_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_st_job_types_st_id ON st_job_types(st_id);
CREATE INDEX IF NOT EXISTS idx_st_job_types_name ON st_job_types(name);

-- Tag Types
CREATE TABLE IF NOT EXISTS st_tag_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL,
    last_synced_at TIMESTAMP,
    code VARCHAR(50),
    color VARCHAR(50),
    entity_type VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_st_tag_types_st_id ON st_tag_types(st_id);
CREATE INDEX IF NOT EXISTS idx_st_tag_types_name ON st_tag_types(name);

-- Custom Fields
CREATE TABLE IF NOT EXISTS st_custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50),
    entity_type VARCHAR(50),
    active BOOLEAN DEFAULT true,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_st_custom_fields_st_id ON st_custom_fields(st_id);
CREATE INDEX IF NOT EXISTS idx_st_custom_fields_name ON st_custom_fields(name);
CREATE INDEX IF NOT EXISTS idx_st_custom_fields_entity ON st_custom_fields(entity_type);

-- Call Reasons
CREATE TABLE IF NOT EXISTS st_call_reasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_st_call_reasons_st_id ON st_call_reasons(st_id);
CREATE INDEX IF NOT EXISTS idx_st_call_reasons_name ON st_call_reasons(name);

-- Installed Equipment
CREATE TABLE IF NOT EXISTS st_installed_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    location_id BIGINT NOT NULL,
    equipment_type_id BIGINT,
    name VARCHAR(500),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    install_date DATE,
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_st_installed_equipment_st_id ON st_installed_equipment(st_id);
CREATE INDEX IF NOT EXISTS idx_st_installed_equipment_location ON st_installed_equipment(location_id);
CREATE INDEX IF NOT EXISTS idx_st_installed_equipment_type ON st_installed_equipment(equipment_type_id);

-- ============================================================
-- PART 5: RAW TABLES (Immutable ST API copies)
-- ============================================================

-- Raw Customers
CREATE TABLE IF NOT EXISTS raw_st_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    active BOOLEAN DEFAULT true,
    name VARCHAR(500),
    type VARCHAR(50),
    address JSONB DEFAULT '{}',
    custom_fields JSONB DEFAULT '[]',
    balance DECIMAL(18,4) DEFAULT 0,
    tax_exempt BOOLEAN DEFAULT false,
    tag_type_ids BIGINT[] DEFAULT '{}',
    do_not_mail BOOLEAN DEFAULT false,
    do_not_service BOOLEAN DEFAULT false,
    national_account BOOLEAN DEFAULT false,
    created_by_id BIGINT,
    merged_to_id BIGINT,
    payment_term_id BIGINT,
    credit_limit DECIMAL(18,4),
    credit_limit_balance DECIMAL(18,4),
    external_data JSONB,
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_st_customers_st_id ON raw_st_customers(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_customers_modified ON raw_st_customers(st_modified_on);
CREATE INDEX IF NOT EXISTS idx_raw_st_customers_fetched ON raw_st_customers(fetched_at);

-- Raw Locations
CREATE TABLE IF NOT EXISTS raw_st_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    active BOOLEAN DEFAULT true,
    name VARCHAR(500),
    address JSONB DEFAULT '{}',
    custom_fields JSONB DEFAULT '[]',
    created_by_id BIGINT,
    merged_to_id BIGINT,
    zone_id BIGINT,
    tax_zone_id BIGINT,
    tax_exempt BOOLEAN DEFAULT false,
    tag_type_ids BIGINT[] DEFAULT '{}',
    external_data JSONB,
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_st_locations_st_id ON raw_st_locations(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_locations_customer ON raw_st_locations(customer_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_locations_modified ON raw_st_locations(st_modified_on);
CREATE INDEX IF NOT EXISTS idx_raw_st_locations_fetched ON raw_st_locations(fetched_at);

-- Raw Jobs
CREATE TABLE IF NOT EXISTS raw_st_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    job_number VARCHAR(50),
    project_id BIGINT,
    customer_id BIGINT,
    location_id BIGINT,
    job_status VARCHAR(50),
    completed_on TIMESTAMPTZ,
    business_unit_id BIGINT,
    job_type_id BIGINT,
    priority VARCHAR(20) DEFAULT 'Normal',
    campaign_id BIGINT,
    appointment_count INT DEFAULT 0,
    first_appointment_id BIGINT,
    last_appointment_id BIGINT,
    recall_for_id BIGINT,
    warranty_id BIGINT,
    job_generated_lead_source JSONB,
    no_charge BOOLEAN DEFAULT false,
    notifications_enabled BOOLEAN DEFAULT true,
    created_by_id BIGINT,
    tag_type_ids BIGINT[] DEFAULT '{}',
    lead_call_id BIGINT,
    partner_lead_call_id BIGINT,
    booking_id BIGINT,
    sold_by_id BIGINT,
    customer_po VARCHAR(100),
    invoice_id BIGINT,
    membership_id BIGINT,
    total DECIMAL(18,4) DEFAULT 0,
    created_from_estimate_id BIGINT,
    estimate_ids BIGINT[] DEFAULT '{}',
    summary TEXT,
    custom_fields JSONB DEFAULT '[]',
    external_data JSONB,
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_st_jobs_st_id ON raw_st_jobs(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_jobs_customer ON raw_st_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_jobs_location ON raw_st_jobs(location_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_jobs_job_number ON raw_st_jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_raw_st_jobs_status ON raw_st_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_raw_st_jobs_modified ON raw_st_jobs(st_modified_on);
CREATE INDEX IF NOT EXISTS idx_raw_st_jobs_fetched ON raw_st_jobs(fetched_at);

-- Raw Pricebook Categories
CREATE TABLE IF NOT EXISTS raw_st_pricebook_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255),
    active BOOLEAN DEFAULT true,
    description TEXT,
    image TEXT,
    parent_id BIGINT,
    position INT,
    category_type VARCHAR(50),
    subcategories JSONB DEFAULT '[]',
    business_unit_ids BIGINT[] DEFAULT '{}',
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_st_pb_categories_st_id ON raw_st_pricebook_categories(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_pb_categories_parent ON raw_st_pricebook_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_pb_categories_type ON raw_st_pricebook_categories(category_type);

-- Raw Pricebook Materials
CREATE TABLE IF NOT EXISTS raw_st_pricebook_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    code VARCHAR(100),
    display_name VARCHAR(500),
    description TEXT,
    cost DECIMAL(18,4),
    price DECIMAL(18,4),
    member_price DECIMAL(18,4),
    add_on_price DECIMAL(18,4),
    active BOOLEAN DEFAULT true,
    taxable BOOLEAN DEFAULT false,
    hours DECIMAL(8,4),
    unit_of_measure VARCHAR(50),
    is_inventory BOOLEAN DEFAULT false,
    account VARCHAR(100),
    cost_of_sale_account VARCHAR(100),
    asset_account VARCHAR(100),
    primary_vendor JSONB,
    other_vendors JSONB DEFAULT '[]',
    categories JSONB DEFAULT '[]',
    assets JSONB DEFAULT '[]',
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_st_pb_materials_st_id ON raw_st_pricebook_materials(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_pb_materials_code ON raw_st_pricebook_materials(code);
CREATE INDEX IF NOT EXISTS idx_raw_st_pb_materials_active ON raw_st_pricebook_materials(active);

-- Raw Pricebook Services
CREATE TABLE IF NOT EXISTS raw_st_pricebook_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    code VARCHAR(100),
    display_name VARCHAR(500),
    description TEXT,
    price DECIMAL(18,4),
    member_price DECIMAL(18,4),
    add_on_price DECIMAL(18,4),
    active BOOLEAN DEFAULT true,
    taxable BOOLEAN DEFAULT false,
    hours DECIMAL(8,4),
    is_labor BOOLEAN DEFAULT false,
    account VARCHAR(100),
    warranty JSONB,
    categories JSONB DEFAULT '[]',
    assets JSONB DEFAULT '[]',
    service_materials JSONB DEFAULT '[]',
    service_equipment JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    upgrades JSONB DEFAULT '[]',
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_st_pb_services_st_id ON raw_st_pricebook_services(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_pb_services_code ON raw_st_pricebook_services(code);
CREATE INDEX IF NOT EXISTS idx_raw_st_pb_services_active ON raw_st_pricebook_services(active);

-- Raw Pricebook Equipment
CREATE TABLE IF NOT EXISTS raw_st_pricebook_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    code VARCHAR(100),
    display_name VARCHAR(500),
    description TEXT,
    price DECIMAL(18,4),
    member_price DECIMAL(18,4),
    add_on_price DECIMAL(18,4),
    cost DECIMAL(18,4),
    active BOOLEAN DEFAULT true,
    taxable BOOLEAN DEFAULT false,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    manufacturer_warranty JSONB,
    service_warranty JSONB,
    categories JSONB DEFAULT '[]',
    assets JSONB DEFAULT '[]',
    primary_vendor JSONB,
    other_vendors JSONB DEFAULT '[]',
    equipment_materials JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    st_created_on TIMESTAMPTZ,
    st_modified_on TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_st_pb_equipment_st_id ON raw_st_pricebook_equipment(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_pb_equipment_code ON raw_st_pricebook_equipment(code);
CREATE INDEX IF NOT EXISTS idx_raw_st_pb_equipment_active ON raw_st_pricebook_equipment(active);

-- Raw Sync State
CREATE TABLE IF NOT EXISTS raw_sync_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================
-- PART 6: WORKFLOW & MESSAGING TABLES
-- ============================================================

-- Workflow Definitions
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100) NOT NULL,
    trigger_conditions JSONB DEFAULT '{}',
    stop_conditions JSONB DEFAULT '[]',
    steps JSONB DEFAULT '[]',
    enabled BOOLEAN DEFAULT true,
    max_concurrent_per_customer INT DEFAULT 1,
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    tags VARCHAR(100)[]
);

CREATE INDEX IF NOT EXISTS idx_workflow_defs_name ON workflow_definitions(name);
CREATE INDEX IF NOT EXISTS idx_workflow_defs_enabled ON workflow_definitions(enabled);
CREATE INDEX IF NOT EXISTS idx_workflow_defs_trigger ON workflow_definitions(trigger_event);

-- Workflow Instances
CREATE TABLE IF NOT EXISTS workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    current_step INT DEFAULT 0,
    message_count INT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    stopped_reason VARCHAR(255),
    execution_log JSONB DEFAULT '[]',
    next_action_at TIMESTAMPTZ,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow ON workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_customer ON workflow_instances(customer_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);

-- Workflow Step Executions
CREATE TABLE IF NOT EXISTS workflow_step_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    action_type VARCHAR(50),
    action_description TEXT,
    action_input JSONB,
    action_output JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    retry_count INT DEFAULT 0,
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_step_executions_instance ON workflow_step_executions(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_status ON workflow_step_executions(status);
CREATE INDEX IF NOT EXISTS idx_step_executions_scheduled ON workflow_step_executions(scheduled_for);

-- Messaging Templates
CREATE TABLE IF NOT EXISTS messaging_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    channel VARCHAR(50) NOT NULL,
    subject_template VARCHAR(500),
    body_template TEXT NOT NULL,
    required_variables JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    category VARCHAR(100),
    usage_count INT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_messaging_templates_name ON messaging_templates(name);
CREATE INDEX IF NOT EXISTS idx_messaging_templates_channel ON messaging_templates(channel);
CREATE INDEX IF NOT EXISTS idx_messaging_templates_active ON messaging_templates(active);
CREATE INDEX IF NOT EXISTS idx_messaging_templates_category ON messaging_templates(category);

-- Messaging Log
CREATE TABLE IF NOT EXISTS messaging_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    to_phone VARCHAR(50),
    to_email VARCHAR(255),
    from_phone VARCHAR(50),
    from_email VARCHAR(255),
    subject VARCHAR(500),
    body TEXT NOT NULL,
    customer_id BIGINT,
    job_id BIGINT,
    workflow_instance_id UUID,
    provider VARCHAR(50),
    provider_message_id VARCHAR(255),
    provider_status VARCHAR(50),
    provider_error TEXT,
    tracking_id VARCHAR(255),
    template_id UUID,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    cost DECIMAL(10,6),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messaging_log_channel ON messaging_log(channel);
CREATE INDEX IF NOT EXISTS idx_messaging_log_direction ON messaging_log(direction);
CREATE INDEX IF NOT EXISTS idx_messaging_log_status ON messaging_log(status);
CREATE INDEX IF NOT EXISTS idx_messaging_log_customer ON messaging_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_messaging_log_job ON messaging_log(job_id);
CREATE INDEX IF NOT EXISTS idx_messaging_log_workflow ON messaging_log(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_messaging_log_created ON messaging_log(created_at DESC);

-- Customer Communication Preferences
CREATE TABLE IF NOT EXISTS customer_communication_preferences (
    customer_id BIGINT PRIMARY KEY,
    sms_opted_out BOOLEAN DEFAULT false,
    email_opted_out BOOLEAN DEFAULT false,
    phone_opted_out BOOLEAN DEFAULT false,
    opted_out_at TIMESTAMPTZ,
    opt_out_reason VARCHAR(255),
    preferred_channel VARCHAR(50),
    do_not_contact BOOLEAN DEFAULT false,
    max_messages_per_day INT DEFAULT 3,
    max_messages_per_week INT DEFAULT 10,
    messages_today INT DEFAULT 0,
    messages_this_week INT DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_prefs_opted_out ON customer_communication_preferences(sms_opted_out);
CREATE INDEX IF NOT EXISTS idx_customer_prefs_do_not_contact ON customer_communication_preferences(do_not_contact);

-- ============================================================
-- PART 7: GHL INTEGRATION TABLES
-- ============================================================

-- GHL Contacts
CREATE TABLE IF NOT EXISTS ghl_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ghl_id VARCHAR(255) UNIQUE NOT NULL,
    ghl_location_id VARCHAR(255),
    st_customer_id BIGINT,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    name VARCHAR(500),
    email VARCHAR(255),
    phone VARCHAR(50),
    address_line1 VARCHAR(500),
    city VARCHAR(255),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    phone_numbers JSONB DEFAULT '[]',
    email_addresses JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    source VARCHAR(255),
    type VARCHAR(50),
    custom_fields JSONB DEFAULT '{}',
    ghl_created_at TIMESTAMPTZ,
    ghl_updated_at TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    synced_to_st BOOLEAN DEFAULT false,
    st_sync_error TEXT,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status VARCHAR(50) DEFAULT 'synced',
    sync_attempts INT DEFAULT 0,
    last_sync_error TEXT,
    st_data_hash VARCHAR(64),
    ghl_data_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_ghl_contacts_ghl_id ON ghl_contacts(ghl_id);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_st_customer ON ghl_contacts(st_customer_id);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_email ON ghl_contacts(email);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_phone ON ghl_contacts(phone);

-- GHL Opportunities
CREATE TABLE IF NOT EXISTS ghl_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ghl_id VARCHAR(255) UNIQUE NOT NULL,
    st_job_id BIGINT,
    st_customer_id BIGINT,
    ghl_contact_id VARCHAR(255),
    ghl_location_id VARCHAR(255),
    ghl_pipeline_id VARCHAR(255) NOT NULL,
    pipeline_name VARCHAR(255),
    ghl_pipeline_stage_id VARCHAR(255),
    stage_name VARCHAR(255),
    name VARCHAR(500) NOT NULL,
    monetary_value DECIMAL(18,4) DEFAULT 0,
    status VARCHAR(50),
    ghl_created_at TIMESTAMPTZ,
    ghl_updated_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    last_status_change_at TIMESTAMPTZ,
    assigned_to VARCHAR(255),
    source VARCHAR(255),
    lead_value DECIMAL(18,4),
    custom_fields JSONB DEFAULT '{}',
    notes_count INT DEFAULT 0,
    tasks_count INT DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    full_data JSONB NOT NULL,
    synced_to_st BOOLEAN DEFAULT false,
    st_sync_error TEXT,
    local_synced_at TIMESTAMPTZ DEFAULT NOW(),
    local_created_at TIMESTAMPTZ DEFAULT NOW(),
    local_updated_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status VARCHAR(50) DEFAULT 'synced',
    sync_attempts INT DEFAULT 0,
    last_sync_error TEXT,
    st_data_hash VARCHAR(64),
    ghl_data_hash VARCHAR(64),
    st_estimate_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_ghl_id ON ghl_opportunities(ghl_id);
CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_st_job ON ghl_opportunities(st_job_id);
CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_st_customer ON ghl_opportunities(st_customer_id);
CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_contact ON ghl_opportunities(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_pipeline ON ghl_opportunities(ghl_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_stage ON ghl_opportunities(ghl_pipeline_stage_id);
CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_status ON ghl_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_updated ON ghl_opportunities(ghl_updated_at DESC);

-- GHL Pipeline Mapping
CREATE TABLE IF NOT EXISTS ghl_pipeline_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_job_type_id BIGINT,
    st_job_type_name VARCHAR(255),
    st_business_unit_id BIGINT,
    st_business_unit_name VARCHAR(255),
    ghl_pipeline_id VARCHAR(255) NOT NULL,
    ghl_pipeline_name VARCHAR(255),
    ghl_default_stage_id VARCHAR(255),
    ghl_default_stage_name VARCHAR(255),
    ghl_location_id VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(st_job_type_id, st_business_unit_id, ghl_location_id)
);

CREATE INDEX IF NOT EXISTS idx_ghl_pipeline_st_job_type ON ghl_pipeline_mapping(st_job_type_id);
CREATE INDEX IF NOT EXISTS idx_ghl_pipeline_st_bu ON ghl_pipeline_mapping(st_business_unit_id);

-- GHL Sync Log
CREATE TABLE IF NOT EXISTS ghl_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL,
    records_fetched INT DEFAULT 0,
    records_created INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    records_failed INT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    error_message TEXT,
    error_details JSONB,
    triggered_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_ghl_sync_log_type ON ghl_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_ghl_sync_log_status ON ghl_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_ghl_sync_log_started ON ghl_sync_log(started_at DESC);

-- GHL Webhook Events
CREATE TABLE IF NOT EXISTS ghl_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    ghl_location_id VARCHAR(255),
    payload JSONB NOT NULL,
    headers JSONB,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    processing_error TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ghl_webhook_events_type ON ghl_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ghl_webhook_events_received ON ghl_webhook_events(received_at DESC);

-- ============================================================
-- PART 8: CALLRAIL INTEGRATION TABLES
-- ============================================================

-- CallRail Calls
CREATE TABLE IF NOT EXISTS callrail_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    callrail_id VARCHAR(255) UNIQUE NOT NULL,
    caller_phone VARCHAR(50),
    tracking_number VARCHAR(50),
    duration_seconds INT,
    call_start TIMESTAMPTZ,
    call_end TIMESTAMPTZ,
    recording_url TEXT,
    call_status VARCHAR(50),
    gclid TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    landing_page_url TEXT,
    referrer_url TEXT,
    device_type VARCHAR(50),
    caller_city VARCHAR(255),
    caller_state VARCHAR(100),
    caller_zip VARCHAR(20),
    caller_country VARCHAR(100),
    st_customer_id BIGINT,
    matched_at TIMESTAMPTZ,
    match_confidence VARCHAR(20),
    match_method VARCHAR(50),
    converted_to_job BOOLEAN DEFAULT false,
    converted_to_estimate BOOLEAN DEFAULT false,
    estimate_sold BOOLEAN DEFAULT false,
    st_job_id BIGINT,
    st_estimate_id BIGINT,
    conversion_value DECIMAL(18,4),
    conversion_date TIMESTAMPTZ,
    gads_conversion_sent BOOLEAN DEFAULT false,
    gads_conversion_sent_at TIMESTAMPTZ,
    gads_conversion_error TEXT,
    gads_retry_count INT DEFAULT 0,
    tags JSONB DEFAULT '[]',
    notes TEXT,
    full_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_callrail_calls_id ON callrail_calls(callrail_id);
CREATE INDEX IF NOT EXISTS idx_callrail_calls_phone ON callrail_calls(caller_phone);
CREATE INDEX IF NOT EXISTS idx_callrail_calls_customer ON callrail_calls(st_customer_id);
CREATE INDEX IF NOT EXISTS idx_callrail_calls_job ON callrail_calls(st_job_id);
CREATE INDEX IF NOT EXISTS idx_callrail_calls_estimate ON callrail_calls(st_estimate_id);
CREATE INDEX IF NOT EXISTS idx_callrail_calls_start ON callrail_calls(call_start DESC);

-- CallRail Conversion Log
CREATE TABLE IF NOT EXISTS callrail_conversion_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES callrail_calls(id) ON DELETE CASCADE,
    conversion_type VARCHAR(50) NOT NULL,
    conversion_value DECIMAL(18,4),
    gads_attempt_number INT DEFAULT 1,
    gads_status VARCHAR(50),
    gads_response JSONB,
    gads_error TEXT,
    gclid TEXT,
    campaign_id VARCHAR(255),
    conversion_action VARCHAR(100),
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    succeeded_at TIMESTAMPTZ,
    triggered_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_conversion_log_call ON callrail_conversion_log(call_id);
CREATE INDEX IF NOT EXISTS idx_conversion_log_status ON callrail_conversion_log(gads_status);
CREATE INDEX IF NOT EXISTS idx_conversion_log_attempted ON callrail_conversion_log(attempted_at DESC);

-- ============================================================
-- PART 9: CHAT & SYNC TABLES
-- ============================================================

-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    last_category_id UUID,
    last_category_st_id BIGINT,
    last_category_name VARCHAR(255),
    pending_action JSONB,
    history JSONB DEFAULT '[]',
    user_id VARCHAR(255),
    user_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires ON chat_sessions(expires_at);

-- ST Sync Log
CREATE TABLE IF NOT EXISTS st_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(100) NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    records_fetched INT DEFAULT 0,
    records_created INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    records_failed INT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    error_message TEXT,
    error_details JSONB,
    triggered_by VARCHAR(100),
    parameters JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_st_sync_log_module ON st_sync_log(module);
CREATE INDEX IF NOT EXISTS idx_st_sync_log_status ON st_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_st_sync_log_started ON st_sync_log(started_at DESC);

-- ============================================================
-- PART 10: SCHEDULING TABLES
-- ============================================================

-- Scheduling Job Types
CREATE TABLE IF NOT EXISTS scheduling_job_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    sync_status sync_status DEFAULT 'synced',
    local_created_at TIMESTAMPTZ DEFAULT NOW(),
    local_modified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sched_job_types_st_id ON scheduling_job_types(st_id);
CREATE INDEX IF NOT EXISTS idx_sched_job_types_name_trgm ON scheduling_job_types USING gin(name gin_trgm_ops);

-- Scheduling Job Profiles
CREATE TABLE IF NOT EXISTS scheduling_job_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type_id UUID REFERENCES scheduling_job_types(id),
    job_type_st_id BIGINT,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    avg_duration_minutes INT DEFAULT 60,
    min_duration_minutes INT DEFAULT 30,
    max_duration_minutes INT DEFAULT 180,
    required_skills TEXT[] DEFAULT '{}',
    preferred_skills TEXT[] DEFAULT '{}',
    requires_equipment BOOLEAN DEFAULT false,
    requires_permit BOOLEAN DEFAULT false,
    requires_two_techs BOOLEAN DEFAULT false,
    can_overlap BOOLEAN DEFAULT false,
    base_price DECIMAL(10,2),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_profiles_name_trgm ON scheduling_job_profiles USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_job_profiles_skills ON scheduling_job_profiles USING gin(required_skills);

-- Scheduling Technician Skills
CREATE TABLE IF NOT EXISTS scheduling_technician_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL,
    technician_st_id BIGINT NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    skill_level skill_level DEFAULT 'basic',
    certified BOOLEAN DEFAULT false,
    certification_name VARCHAR(255),
    certification_expires DATE,
    certification_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(technician_id, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_tech_skills_tech_id ON scheduling_technician_skills(technician_id);
CREATE INDEX IF NOT EXISTS idx_tech_skills_skill_name ON scheduling_technician_skills(skill_name);

-- Scheduling Rules
CREATE TABLE IF NOT EXISTS scheduling_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    rule_type scheduling_rule_type DEFAULT 'preference',
    conditions JSONB DEFAULT '{}',
    actions JSONB DEFAULT '{}',
    priority INT DEFAULT 50,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sched_rules_type ON scheduling_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_sched_rules_priority ON scheduling_rules(priority DESC);

-- ============================================================
-- PART 11: COMPLETION MESSAGE
-- ============================================================

DO $$ 
BEGIN 
    RAISE NOTICE '============================================';
    RAISE NOTICE 'LAZI Database Schema Creation Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created in public schema';
    RAISE NOTICE 'Ready for Prisma client generation';
    RAISE NOTICE '============================================';
END $$;
