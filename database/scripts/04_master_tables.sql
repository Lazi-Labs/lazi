-- ============================================
-- Perfect Catch - MASTER Schema Tables
-- ============================================
-- Run order: 04
-- 
-- Purpose: Merged/computed entities for fast queries
-- Rules:
--   - Denormalized for speed (customer name on jobs, etc.)
--   - Updated via triggers from raw schema
--   - Contains computed fields (lifetime_value, total_jobs, etc.)
-- ============================================

-- Unified customer view
CREATE TABLE IF NOT EXISTS master.customers (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(500),
    type VARCHAR(50),
    active BOOLEAN DEFAULT true,
    
    -- Merged contact info (from st_customer_contacts)
    primary_email VARCHAR(255),
    primary_phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    all_phones JSONB DEFAULT '[]',
    all_emails JSONB DEFAULT '[]',
    
    -- Primary location (from st_locations)
    primary_address JSONB,
    primary_location_id BIGINT,
    
    -- Computed fields (updated by triggers)
    total_jobs INT DEFAULT 0,
    completed_jobs INT DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    last_job_date TIMESTAMPTZ,
    first_job_date TIMESTAMPTZ,
    lifetime_value DECIMAL(12,2) DEFAULT 0,
    
    -- Tags
    tags JSONB DEFAULT '[]',
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified job view
CREATE TABLE IF NOT EXISTS master.jobs (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    job_number VARCHAR(100),
    
    -- Customer info (denormalized for speed)
    customer_id BIGINT,
    customer_name VARCHAR(500),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    
    -- Location info (denormalized)
    location_id BIGINT,
    location_address JSONB,
    
    -- Job details
    job_type_id BIGINT,
    job_type_name VARCHAR(255),
    status VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'Normal',
    summary TEXT,
    
    -- Business unit
    business_unit_id BIGINT,
    business_unit_name VARCHAR(255),
    
    -- Campaign
    campaign_id BIGINT,
    campaign_name VARCHAR(255),
    
    -- Scheduling
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    completed_on TIMESTAMPTZ,
    
    -- Appointment info (from st_appointments)
    appointment_id BIGINT,
    appointment_status VARCHAR(50),
    arrival_window_start TIMESTAMPTZ,
    arrival_window_end TIMESTAMPTZ,
    
    -- Assigned technicians (array)
    technician_ids BIGINT[] DEFAULT '{}',
    technician_names TEXT[] DEFAULT '{}',
    
    -- Financials
    total DECIMAL(12,2) DEFAULT 0,
    
    -- Tags
    tags JSONB DEFAULT '[]',
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified estimate view
CREATE TABLE IF NOT EXISTS master.estimates (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    
    -- Links
    job_id BIGINT,
    job_number VARCHAR(100),
    customer_id BIGINT,
    customer_name VARCHAR(500),
    location_id BIGINT,
    
    -- Estimate details
    name VARCHAR(255),
    status VARCHAR(50),
    review_status VARCHAR(50),
    summary TEXT,
    
    -- Business unit
    business_unit_id BIGINT,
    business_unit_name VARCHAR(255),
    
    -- Sales info
    sold_on TIMESTAMPTZ,
    sold_by_id BIGINT,
    sold_by_name VARCHAR(255),
    
    -- Financials
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,
    item_count INT DEFAULT 0,
    
    -- Items (denormalized)
    items JSONB DEFAULT '[]',
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified invoice view
CREATE TABLE IF NOT EXISTS master.invoices (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    reference_number VARCHAR(100),
    
    -- Links
    job_id BIGINT,
    job_number VARCHAR(100),
    customer_id BIGINT,
    customer_name VARCHAR(500),
    location_id BIGINT,
    
    -- Business unit
    business_unit_id BIGINT,
    business_unit_name VARCHAR(255),
    
    -- Dates
    invoice_date DATE,
    due_date DATE,
    
    -- Financials
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Payment info
    payment_count INT DEFAULT 0,
    paid_on TIMESTAMPTZ,
    
    -- Items
    items JSONB DEFAULT '[]',
    item_count INT DEFAULT 0,
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified technician view
CREATE TABLE IF NOT EXISTS master.technicians (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Organization
    business_unit_id BIGINT,
    business_unit_name VARCHAR(255),
    main_zone_id BIGINT,
    zone_ids BIGINT[] DEFAULT '{}',
    
    -- Status
    active BOOLEAN DEFAULT true,
    
    -- Computed fields
    total_jobs INT DEFAULT 0,
    completed_jobs INT DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    
    -- Skills (for scheduling)
    skills JSONB DEFAULT '[]',
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified pricebook items (materials, services, equipment combined)
CREATE TABLE IF NOT EXISTS master.pricebook_items (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT NOT NULL,
    item_type VARCHAR(20) NOT NULL, -- 'material', 'service', 'equipment'
    
    code VARCHAR(100),
    display_name VARCHAR(500),
    description TEXT,
    
    -- Pricing
    cost DECIMAL(12,2),
    price DECIMAL(12,2),
    member_price DECIMAL(12,2),
    add_on_price DECIMAL(12,2),
    margin_percent DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN cost > 0 THEN ((price - cost) / cost * 100) ELSE 0 END
    ) STORED,
    
    -- Equipment-specific
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    
    -- Service-specific
    hours DECIMAL(8,4),
    
    -- Organization
    categories JSONB DEFAULT '[]',
    taxable BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    
    -- Metadata
    raw_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(st_id, item_type)
);

-- Reference data: Business Units
CREATE TABLE IF NOT EXISTS master.business_units (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    official_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address JSONB,
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reference data: Job Types
CREATE TABLE IF NOT EXISTS master.job_types (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    duration INT,
    priority VARCHAR(20),
    business_unit_ids BIGINT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reference data: Campaigns
CREATE TABLE IF NOT EXISTS master.campaigns (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    code VARCHAR(50),
    category_id BIGINT,
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reference data: Tag Types
CREATE TABLE IF NOT EXISTS master.tag_types (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    code VARCHAR(50),
    color VARCHAR(20),
    entity_type VARCHAR(50),
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reference data: Zones
CREATE TABLE IF NOT EXISTS master.zones (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log completion
DO $$ BEGIN RAISE NOTICE 'MASTER schema tables created (12 tables)'; END $$;
