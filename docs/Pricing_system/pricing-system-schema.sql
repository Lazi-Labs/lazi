-- ============================================================================
-- ADVANCED PRICING SYSTEM - COMPLETE DATABASE SCHEMA
-- LAZI AI Platform / Perfect Catch & Pools
-- ============================================================================
-- 
-- Multi-tenant architecture with organization-level isolation
-- Designed for Supabase PostgreSQL
-- 
-- Schema: pricing (separate from raw/master/crm schemas)
-- ============================================================================

-- Create dedicated schema for pricing system
CREATE SCHEMA IF NOT EXISTS pricing;

-- Set search path for this session
SET search_path TO pricing, public;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Encryption functions

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE pricing.employee_status AS ENUM ('active', 'inactive', 'terminated', 'on_leave');
CREATE TYPE pricing.pay_type AS ENUM ('hourly', 'salary');
CREATE TYPE pricing.vehicle_status AS ENUM ('active', 'reserve', 'maintenance', 'sold', 'totaled');
CREATE TYPE pricing.expense_frequency AS ENUM ('monthly', 'annual', 'quarterly', 'weekly', 'one_time');
CREATE TYPE pricing.user_role AS ENUM ('owner', 'admin', 'manager', 'viewer');

-- ============================================================================
-- TABLE: ORGANIZATIONS (Multi-tenant root)
-- ============================================================================
-- This is the top-level tenant table. All other tables reference this.
-- Each organization is a separate business/company.

CREATE TABLE pricing.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier
    legal_name VARCHAR(255),
    
    -- Contact
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    
    -- Business Settings
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    currency VARCHAR(3) DEFAULT 'USD',
    fiscal_year_start INTEGER DEFAULT 1,  -- Month (1-12)
    
    -- Pricing Settings
    working_days_per_year INTEGER DEFAULT 260,
    weeks_per_year INTEGER DEFAULT 52,
    default_billable_hours_per_day DECIMAL(4,2) DEFAULT 6.0,
    target_annual_revenue DECIMAL(14,2) DEFAULT 0,
    material_cost_percent DECIMAL(5,2) DEFAULT 20.00,
    
    -- Default Burden Rates (can be overridden per employee)
    default_payroll_tax_rate DECIMAL(5,2) DEFAULT 7.65,
    default_futa_rate DECIMAL(5,2) DEFAULT 0.60,
    default_suta_rate DECIMAL(5,2) DEFAULT 2.70,
    default_workers_comp_rate_field DECIMAL(5,2) DEFAULT 8.50,  -- For field techs
    default_workers_comp_rate_office DECIMAL(5,2) DEFAULT 0.50, -- For office staff
    
    -- ServiceTitan Integration
    servicetitan_tenant_id VARCHAR(50),
    servicetitan_connected BOOLEAN DEFAULT FALSE,
    servicetitan_last_sync TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    -- Constraints
    CONSTRAINT valid_fiscal_year CHECK (fiscal_year_start BETWEEN 1 AND 12),
    CONSTRAINT valid_working_days CHECK (working_days_per_year BETWEEN 200 AND 365)
);

-- ============================================================================
-- TABLE: USERS (Organization members)
-- ============================================================================
-- Users who can access the pricing system. Links to Supabase auth.users.

CREATE TABLE pricing.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    -- Link to Supabase Auth
    auth_user_id UUID UNIQUE,  -- References auth.users(id)
    
    -- Profile
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    avatar_url TEXT,
    
    -- Access
    role pricing.user_role DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(organization_id, email)
);

-- ============================================================================
-- TABLE: TECHNICIANS
-- ============================================================================
-- Field service technicians who generate billable revenue.

CREATE TABLE pricing.technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    -- Basic Info
    employee_number VARCHAR(50),  -- Internal employee ID
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    role VARCHAR(100) DEFAULT 'Technician',
    status pricing.employee_status DEFAULT 'active',
    
    -- Contact
    email VARCHAR(255),
    phone VARCHAR(50),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(50),
    
    -- Employment
    hire_date DATE,
    termination_date DATE,
    department VARCHAR(100),
    
    -- Pay Structure
    pay_type pricing.pay_type DEFAULT 'hourly',
    base_pay_rate DECIMAL(10,2),          -- Hourly rate (if hourly)
    annual_salary DECIMAL(12,2),           -- Annual salary (if salary)
    overtime_multiplier DECIMAL(4,2) DEFAULT 1.50,
    paid_hours_per_day DECIMAL(4,2) DEFAULT 8.00,
    
    -- Burden Rates (override org defaults if set)
    payroll_tax_rate DECIMAL(5,2),
    futa_rate DECIMAL(5,2),
    suta_rate DECIMAL(5,2),
    workers_comp_rate DECIMAL(5,2),
    
    -- Benefits (monthly employer contribution)
    health_insurance_monthly DECIMAL(10,2) DEFAULT 0,
    dental_insurance_monthly DECIMAL(10,2) DEFAULT 0,
    vision_insurance_monthly DECIMAL(10,2) DEFAULT 0,
    life_insurance_monthly DECIMAL(10,2) DEFAULT 0,
    retirement_401k_match_percent DECIMAL(5,2) DEFAULT 0,
    hsa_contribution_monthly DECIMAL(10,2) DEFAULT 0,
    other_benefits_monthly DECIMAL(10,2) DEFAULT 0,
    
    -- Vehicle Assignment
    assigned_vehicle_id UUID,  -- FK added after vehicles table
    
    -- ServiceTitan Integration
    servicetitan_employee_id VARCHAR(50),
    
    -- Calculated Fields (updated by trigger)
    calculated_annual_base_pay DECIMAL(12,2),
    calculated_total_burden_annual DECIMAL(12,2),
    calculated_burden_percent DECIMAL(5,2),
    calculated_billable_hours_per_year DECIMAL(8,2),
    calculated_true_cost_per_hour DECIMAL(10,2),
    calculated_efficiency_percent DECIMAL(5,2),
    
    -- Metadata
    notes TEXT,
    is_active BOOLEAN GENERATED ALWAYS AS (status = 'active') STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES pricing.users(id),
    updated_by UUID REFERENCES pricing.users(id),
    
    -- Constraints
    UNIQUE(organization_id, employee_number),
    CONSTRAINT valid_pay CHECK (
        (pay_type = 'hourly' AND base_pay_rate IS NOT NULL) OR
        (pay_type = 'salary' AND annual_salary IS NOT NULL)
    )
);

-- ============================================================================
-- TABLE: UNPRODUCTIVE_TIME_CATEGORIES
-- ============================================================================
-- Organization-level templates for unproductive time categories.

CREATE TABLE pricing.unproductive_time_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'Clock',
    default_hours DECIMAL(4,2) DEFAULT 0,
    default_is_paid BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,  -- System defaults can't be deleted
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, name)
);

-- ============================================================================
-- TABLE: TECHNICIAN_UNPRODUCTIVE_TIME
-- ============================================================================
-- Per-technician unproductive time tracking.

CREATE TABLE pricing.technician_unproductive_time (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES pricing.technicians(id) ON DELETE CASCADE,
    category_id UUID REFERENCES pricing.unproductive_time_categories(id) ON DELETE SET NULL,
    
    name VARCHAR(100) NOT NULL,  -- Can override category name
    hours_per_day DECIMAL(4,2) NOT NULL DEFAULT 0,
    is_paid BOOLEAN DEFAULT TRUE,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_hours CHECK (hours_per_day >= 0 AND hours_per_day <= 24)
);

-- ============================================================================
-- TABLE: OFFICE_STAFF
-- ============================================================================
-- Non-billable office/administrative employees.

CREATE TABLE pricing.office_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    -- Basic Info
    employee_number VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    role VARCHAR(100) DEFAULT 'Office Staff',
    status pricing.employee_status DEFAULT 'active',
    
    -- Contact
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Employment
    hire_date DATE,
    termination_date DATE,
    department VARCHAR(100),
    
    -- Pay Structure
    pay_type pricing.pay_type DEFAULT 'hourly',
    base_pay_rate DECIMAL(10,2),
    annual_salary DECIMAL(12,2),
    hours_per_week DECIMAL(4,2) DEFAULT 40.00,
    
    -- Burden Rates
    payroll_tax_rate DECIMAL(5,2),
    futa_rate DECIMAL(5,2),
    suta_rate DECIMAL(5,2),
    workers_comp_rate DECIMAL(5,2),
    
    -- Benefits
    health_insurance_monthly DECIMAL(10,2) DEFAULT 0,
    dental_insurance_monthly DECIMAL(10,2) DEFAULT 0,
    vision_insurance_monthly DECIMAL(10,2) DEFAULT 0,
    life_insurance_monthly DECIMAL(10,2) DEFAULT 0,
    retirement_401k_match_percent DECIMAL(5,2) DEFAULT 0,
    hsa_contribution_monthly DECIMAL(10,2) DEFAULT 0,
    other_benefits_monthly DECIMAL(10,2) DEFAULT 0,
    
    -- Calculated Fields
    calculated_annual_base_pay DECIMAL(12,2),
    calculated_total_burden_annual DECIMAL(12,2),
    calculated_burden_percent DECIMAL(5,2),
    calculated_monthly_cost DECIMAL(12,2),
    
    -- Metadata
    notes TEXT,
    is_active BOOLEAN GENERATED ALWAYS AS (status = 'active') STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES pricing.users(id),
    updated_by UUID REFERENCES pricing.users(id),
    
    UNIQUE(organization_id, employee_number)
);

-- ============================================================================
-- TABLE: VEHICLES
-- ============================================================================
-- Fleet vehicles and their costs.

CREATE TABLE pricing.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    -- Vehicle Info
    year INTEGER,
    make VARCHAR(50),
    model VARCHAR(100),
    trim VARCHAR(100),
    color VARCHAR(50),
    vin VARCHAR(17),
    license_plate VARCHAR(20),
    
    -- Status
    status pricing.vehicle_status DEFAULT 'reserve',
    assigned_driver_id UUID,  -- FK added after technicians table complete
    
    -- Financial
    purchase_date DATE,
    purchase_price DECIMAL(12,2),
    loan_balance DECIMAL(12,2) DEFAULT 0,
    monthly_payment DECIMAL(10,2) DEFAULT 0,
    loan_interest_rate DECIMAL(5,2),
    loan_term_months INTEGER,
    market_value DECIMAL(12,2) DEFAULT 0,
    
    -- Monthly Operating Costs
    insurance_monthly DECIMAL(10,2) DEFAULT 0,
    fuel_monthly DECIMAL(10,2) DEFAULT 0,
    maintenance_monthly DECIMAL(10,2) DEFAULT 0,
    registration_annual DECIMAL(10,2) DEFAULT 0,
    
    -- Tracking
    odometer_current INTEGER,
    odometer_at_purchase INTEGER,
    fuel_type VARCHAR(20) DEFAULT 'gasoline',
    mpg_average DECIMAL(5,2),
    
    -- ServiceTitan Integration
    servicetitan_equipment_id VARCHAR(50),
    
    -- Calculated Fields
    calculated_equity DECIMAL(12,2),
    calculated_total_monthly_cost DECIMAL(12,2),
    
    -- Metadata
    notes TEXT,
    is_active BOOLEAN GENERATED ALWAYS AS (status IN ('active', 'reserve', 'maintenance')) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES pricing.users(id),
    updated_by UUID REFERENCES pricing.users(id),
    
    UNIQUE(organization_id, vin)
);

-- Add FK for vehicle assignment after vehicles table exists
ALTER TABLE pricing.technicians
ADD CONSTRAINT fk_technician_vehicle
FOREIGN KEY (assigned_vehicle_id) REFERENCES pricing.vehicles(id) ON DELETE SET NULL;

ALTER TABLE pricing.vehicles
ADD CONSTRAINT fk_vehicle_driver
FOREIGN KEY (assigned_driver_id) REFERENCES pricing.technicians(id) ON DELETE SET NULL;

-- ============================================================================
-- TABLE: EXPENSE_CATEGORIES
-- ============================================================================
-- Categories for operating expenses.

CREATE TABLE pricing.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'Receipt',
    color VARCHAR(50) DEFAULT 'slate',
    
    -- Category Type
    is_payroll BOOLEAN DEFAULT FALSE,      -- Auto-populated from workforce
    is_fleet BOOLEAN DEFAULT FALSE,        -- Auto-populated from fleet
    is_system BOOLEAN DEFAULT FALSE,       -- System categories can't be deleted
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    is_collapsed BOOLEAN DEFAULT TRUE,
    
    -- Calculated
    calculated_monthly_total DECIMAL(12,2) DEFAULT 0,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, name)
);

-- ============================================================================
-- TABLE: EXPENSE_ITEMS
-- ============================================================================
-- Individual expense line items within categories.

CREATE TABLE pricing.expense_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES pricing.expense_categories(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    vendor VARCHAR(200),
    
    -- Amount
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    frequency pricing.expense_frequency DEFAULT 'monthly',
    
    -- Calculated monthly equivalent
    calculated_monthly_amount DECIMAL(12,2),
    
    -- Tracking
    account_number VARCHAR(100),
    is_tax_deductible BOOLEAN DEFAULT TRUE,
    tax_category VARCHAR(100),
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES pricing.users(id),
    
    CONSTRAINT valid_amount CHECK (amount >= 0)
);

-- ============================================================================
-- TABLE: JOB_TYPES
-- ============================================================================
-- Different job/service types with their pricing parameters.

CREATE TABLE pricing.job_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    -- Basic Info
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),  -- Short code (e.g., 'SVC', 'INST')
    description TEXT,
    
    -- Hour Constraints
    min_hours DECIMAL(4,2) DEFAULT 0,
    max_hours DECIMAL(4,2) DEFAULT 4,
    typical_hours DECIMAL(4,2),
    
    -- Pricing Parameters
    target_gross_margin DECIMAL(5,2) DEFAULT 60.00,
    member_discount_percent DECIMAL(5,2) DEFAULT 0,
    material_gross_margin DECIMAL(5,2) DEFAULT 40.00,
    flat_surcharge DECIMAL(10,2) DEFAULT 0,
    
    -- Calculated Rates
    calculated_hourly_rate DECIMAL(10,2),
    calculated_member_rate DECIMAL(10,2),
    calculated_min_invoice DECIMAL(10,2),
    calculated_material_markup DECIMAL(6,2),
    
    -- ServiceTitan Integration
    servicetitan_business_unit_id VARCHAR(50),
    
    -- Display
    color VARCHAR(50) DEFAULT 'sky',
    icon VARCHAR(50) DEFAULT 'Wrench',
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, name),
    UNIQUE(organization_id, code),
    CONSTRAINT valid_margins CHECK (
        target_gross_margin BETWEEN 0 AND 99.99 AND
        member_discount_percent BETWEEN 0 AND 100 AND
        material_gross_margin BETWEEN 0 AND 99.99
    )
);

-- ============================================================================
-- TABLE: MARKUP_TIERS
-- ============================================================================
-- Tiered material markup structure.

CREATE TABLE pricing.markup_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    -- Tier Definition
    name VARCHAR(100),
    min_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_cost DECIMAL(12,2) NOT NULL DEFAULT 999999.99,
    
    -- Pricing
    gross_margin_percent DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    
    -- Calculated
    calculated_markup_percent DECIMAL(8,2),
    calculated_multiplier DECIMAL(6,4),
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_cost_range CHECK (min_cost < max_cost),
    CONSTRAINT valid_margin CHECK (gross_margin_percent BETWEEN 0 AND 99.99)
);

-- ============================================================================
-- TABLE: SCENARIOS
-- ============================================================================
-- Saved pricing scenarios for comparison and what-if analysis.

CREATE TABLE pricing.scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Snapshot Data (JSON)
    snapshot_data JSONB NOT NULL,  -- Full state snapshot
    
    -- Summary Metrics (for quick comparison)
    summary_tech_count INTEGER,
    summary_staff_count INTEGER,
    summary_vehicle_count INTEGER,
    summary_avg_burden_percent DECIMAL(5,2),
    summary_avg_efficiency_percent DECIMAL(5,2),
    summary_avg_true_cost_per_hour DECIMAL(10,2),
    summary_fleet_cost_monthly DECIMAL(12,2),
    summary_overhead_monthly DECIMAL(12,2),
    summary_avg_hourly_rate DECIMAL(10,2),
    summary_projected_revenue DECIMAL(14,2),
    summary_projected_net_profit DECIMAL(14,2),
    summary_net_profit_percent DECIMAL(5,2),
    summary_break_even_monthly DECIMAL(12,2),
    
    -- Metadata
    is_baseline BOOLEAN DEFAULT FALSE,  -- Mark as baseline for comparison
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES pricing.users(id),
    
    UNIQUE(organization_id, name)
);

-- ============================================================================
-- TABLE: AUDIT_LOG
-- ============================================================================
-- Audit trail for all changes.

CREATE TABLE pricing.audit_log (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    -- What changed
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,  -- INSERT, UPDATE, DELETE
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Who changed it
    user_id UUID REFERENCES pricing.users(id),
    user_email VARCHAR(255),
    
    -- When
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Client info
    ip_address INET,
    user_agent TEXT
);

-- ============================================================================
-- TABLE: SETTINGS
-- ============================================================================
-- Key-value settings for organizations.

CREATE TABLE pricing.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES pricing.organizations(id) ON DELETE CASCADE,
    
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES pricing.users(id),
    
    UNIQUE(organization_id, key)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Organizations
CREATE INDEX idx_org_slug ON pricing.organizations(slug);
CREATE INDEX idx_org_active ON pricing.organizations(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_org_servicetitan ON pricing.organizations(servicetitan_tenant_id) WHERE servicetitan_tenant_id IS NOT NULL;

-- Users
CREATE INDEX idx_users_org ON pricing.users(organization_id);
CREATE INDEX idx_users_auth ON pricing.users(auth_user_id);
CREATE INDEX idx_users_email ON pricing.users(email);
CREATE INDEX idx_users_active ON pricing.users(organization_id, is_active) WHERE is_active = TRUE;

-- Technicians
CREATE INDEX idx_tech_org ON pricing.technicians(organization_id);
CREATE INDEX idx_tech_status ON pricing.technicians(organization_id, status);
CREATE INDEX idx_tech_active ON pricing.technicians(organization_id) WHERE status = 'active';
CREATE INDEX idx_tech_vehicle ON pricing.technicians(assigned_vehicle_id) WHERE assigned_vehicle_id IS NOT NULL;
CREATE INDEX idx_tech_servicetitan ON pricing.technicians(servicetitan_employee_id) WHERE servicetitan_employee_id IS NOT NULL;

-- Unproductive Time
CREATE INDEX idx_unproductive_tech ON pricing.technician_unproductive_time(technician_id);
CREATE INDEX idx_unproductive_cat ON pricing.unproductive_time_categories(organization_id);

-- Office Staff
CREATE INDEX idx_staff_org ON pricing.office_staff(organization_id);
CREATE INDEX idx_staff_active ON pricing.office_staff(organization_id) WHERE status = 'active';

-- Vehicles
CREATE INDEX idx_vehicles_org ON pricing.vehicles(organization_id);
CREATE INDEX idx_vehicles_status ON pricing.vehicles(organization_id, status);
CREATE INDEX idx_vehicles_active ON pricing.vehicles(organization_id) WHERE status IN ('active', 'reserve', 'maintenance');
CREATE INDEX idx_vehicles_driver ON pricing.vehicles(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL;

-- Expenses
CREATE INDEX idx_expense_cat_org ON pricing.expense_categories(organization_id);
CREATE INDEX idx_expense_items_cat ON pricing.expense_items(category_id);
CREATE INDEX idx_expense_items_org ON pricing.expense_items(organization_id);
CREATE INDEX idx_expense_items_active ON pricing.expense_items(organization_id) WHERE is_active = TRUE;

-- Job Types
CREATE INDEX idx_job_types_org ON pricing.job_types(organization_id);
CREATE INDEX idx_job_types_active ON pricing.job_types(organization_id) WHERE is_active = TRUE;

-- Markup Tiers
CREATE INDEX idx_markup_org ON pricing.markup_tiers(organization_id);
CREATE INDEX idx_markup_active ON pricing.markup_tiers(organization_id) WHERE is_active = TRUE;

-- Scenarios
CREATE INDEX idx_scenarios_org ON pricing.scenarios(organization_id);
CREATE INDEX idx_scenarios_created ON pricing.scenarios(organization_id, created_at DESC);

-- Audit Log
CREATE INDEX idx_audit_org ON pricing.audit_log(organization_id);
CREATE INDEX idx_audit_table ON pricing.audit_log(organization_id, table_name);
CREATE INDEX idx_audit_record ON pricing.audit_log(table_name, record_id);
CREATE INDEX idx_audit_created ON pricing.audit_log(created_at DESC);
CREATE INDEX idx_audit_user ON pricing.audit_log(user_id);

-- Settings
CREATE INDEX idx_settings_org ON pricing.settings(organization_id);

-- ============================================================================
-- FUNCTIONS: Calculation Helpers
-- ============================================================================

-- Calculate monthly equivalent from frequency
CREATE OR REPLACE FUNCTION pricing.calc_monthly_amount(
    amount DECIMAL,
    frequency pricing.expense_frequency
) RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE frequency
        WHEN 'monthly' THEN amount
        WHEN 'annual' THEN amount / 12
        WHEN 'quarterly' THEN amount / 3
        WHEN 'weekly' THEN amount * 4.333
        WHEN 'one_time' THEN 0  -- One-time expenses don't contribute to monthly
        ELSE amount
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate markup from margin
CREATE OR REPLACE FUNCTION pricing.calc_markup_from_margin(
    margin_percent DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    IF margin_percent >= 100 THEN
        RETURN 999999.99;
    END IF;
    RETURN (margin_percent / (100 - margin_percent)) * 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate multiplier from margin
CREATE OR REPLACE FUNCTION pricing.calc_multiplier_from_margin(
    margin_percent DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    IF margin_percent >= 100 THEN
        RETURN 999.9999;
    END IF;
    RETURN 1 / (1 - margin_percent / 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION pricing.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger to all tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'pricing' 
        AND column_name = 'updated_at'
        AND table_name NOT IN ('audit_log')
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trigger_update_timestamp ON pricing.%I;
            CREATE TRIGGER trigger_update_timestamp
            BEFORE UPDATE ON pricing.%I
            FOR EACH ROW
            EXECUTE FUNCTION pricing.update_timestamp();
        ', t, t);
    END LOOP;
END;
$$;

-- ============================================================================
-- TRIGGERS: Calculate expense monthly amounts
-- ============================================================================

CREATE OR REPLACE FUNCTION pricing.calc_expense_monthly()
RETURNS TRIGGER AS $$
BEGIN
    NEW.calculated_monthly_amount = pricing.calc_monthly_amount(NEW.amount, NEW.frequency);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calc_expense_monthly
BEFORE INSERT OR UPDATE ON pricing.expense_items
FOR EACH ROW
EXECUTE FUNCTION pricing.calc_expense_monthly();

-- ============================================================================
-- TRIGGERS: Calculate markup tier values
-- ============================================================================

CREATE OR REPLACE FUNCTION pricing.calc_markup_tier()
RETURNS TRIGGER AS $$
BEGIN
    NEW.calculated_markup_percent = pricing.calc_markup_from_margin(NEW.gross_margin_percent);
    NEW.calculated_multiplier = pricing.calc_multiplier_from_margin(NEW.gross_margin_percent);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calc_markup_tier
BEFORE INSERT OR UPDATE ON pricing.markup_tiers
FOR EACH ROW
EXECUTE FUNCTION pricing.calc_markup_tier();

-- ============================================================================
-- TRIGGERS: Calculate vehicle totals
-- ============================================================================

CREATE OR REPLACE FUNCTION pricing.calc_vehicle_totals()
RETURNS TRIGGER AS $$
BEGIN
    NEW.calculated_equity = COALESCE(NEW.market_value, 0) - COALESCE(NEW.loan_balance, 0);
    NEW.calculated_total_monthly_cost = 
        COALESCE(NEW.monthly_payment, 0) + 
        COALESCE(NEW.insurance_monthly, 0) + 
        COALESCE(NEW.fuel_monthly, 0) + 
        COALESCE(NEW.maintenance_monthly, 0) +
        (COALESCE(NEW.registration_annual, 0) / 12);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calc_vehicle_totals
BEFORE INSERT OR UPDATE ON pricing.vehicles
FOR EACH ROW
EXECUTE FUNCTION pricing.calc_vehicle_totals();

-- ============================================================================
-- VIEWS: Technician Summary
-- ============================================================================

CREATE OR REPLACE VIEW pricing.v_technician_summary AS
SELECT 
    t.id,
    t.organization_id,
    t.display_name,
    t.role,
    t.status,
    t.pay_type,
    t.base_pay_rate,
    t.paid_hours_per_day,
    
    -- Get org defaults for burden rates
    COALESCE(t.payroll_tax_rate, o.default_payroll_tax_rate) as payroll_tax_rate,
    COALESCE(t.futa_rate, o.default_futa_rate) as futa_rate,
    COALESCE(t.suta_rate, o.default_suta_rate) as suta_rate,
    COALESCE(t.workers_comp_rate, o.default_workers_comp_rate_field) as workers_comp_rate,
    
    -- Benefits
    t.health_insurance_monthly + t.dental_insurance_monthly + t.vision_insurance_monthly as insurance_monthly,
    t.retirement_401k_match_percent,
    t.other_benefits_monthly,
    
    -- Unproductive time summary
    COALESCE(ut.paid_unproductive_hours, 0) as paid_unproductive_hours,
    COALESCE(ut.unpaid_unproductive_hours, 0) as unpaid_unproductive_hours,
    t.paid_hours_per_day - COALESCE(ut.paid_unproductive_hours, 0) as billable_hours_per_day,
    
    -- Vehicle
    t.assigned_vehicle_id,
    v.calculated_total_monthly_cost as vehicle_monthly_cost,
    
    -- Calculated fields (if pre-computed)
    t.calculated_annual_base_pay,
    t.calculated_total_burden_annual,
    t.calculated_burden_percent,
    t.calculated_true_cost_per_hour,
    t.calculated_efficiency_percent
    
FROM pricing.technicians t
JOIN pricing.organizations o ON t.organization_id = o.id
LEFT JOIN pricing.vehicles v ON t.assigned_vehicle_id = v.id
LEFT JOIN LATERAL (
    SELECT 
        SUM(CASE WHEN is_paid THEN hours_per_day ELSE 0 END) as paid_unproductive_hours,
        SUM(CASE WHEN NOT is_paid THEN hours_per_day ELSE 0 END) as unpaid_unproductive_hours
    FROM pricing.technician_unproductive_time
    WHERE technician_id = t.id
) ut ON TRUE;

-- ============================================================================
-- VIEWS: Expense Summary by Category
-- ============================================================================

CREATE OR REPLACE VIEW pricing.v_expense_summary AS
SELECT 
    ec.organization_id,
    ec.id as category_id,
    ec.name as category_name,
    ec.icon,
    ec.color,
    ec.is_payroll,
    ec.is_fleet,
    COUNT(ei.id) as item_count,
    SUM(COALESCE(ei.calculated_monthly_amount, 0)) as monthly_total,
    SUM(COALESCE(ei.calculated_monthly_amount, 0)) * 12 as annual_total
FROM pricing.expense_categories ec
LEFT JOIN pricing.expense_items ei ON ec.id = ei.category_id AND ei.is_active = TRUE
WHERE ec.is_active = TRUE
GROUP BY ec.organization_id, ec.id, ec.name, ec.icon, ec.color, ec.is_payroll, ec.is_fleet, ec.sort_order
ORDER BY ec.sort_order;

-- ============================================================================
-- VIEWS: Fleet Summary
-- ============================================================================

CREATE OR REPLACE VIEW pricing.v_fleet_summary AS
SELECT 
    organization_id,
    COUNT(*) as total_vehicles,
    COUNT(*) FILTER (WHERE status = 'active') as active_vehicles,
    COUNT(*) FILTER (WHERE status = 'reserve') as reserve_vehicles,
    COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_vehicles,
    COUNT(*) FILTER (WHERE calculated_equity < 0) as vehicles_upside_down,
    SUM(monthly_payment) as total_payments,
    SUM(insurance_monthly) as total_insurance,
    SUM(fuel_monthly) as total_fuel,
    SUM(maintenance_monthly) as total_maintenance,
    SUM(calculated_total_monthly_cost) as total_monthly_cost,
    SUM(loan_balance) as total_loan_balance,
    SUM(market_value) as total_market_value,
    SUM(calculated_equity) as total_equity
FROM pricing.vehicles
WHERE status IN ('active', 'reserve', 'maintenance')
GROUP BY organization_id;

-- ============================================================================
-- VIEWS: Workforce Summary
-- ============================================================================

CREATE OR REPLACE VIEW pricing.v_workforce_summary AS
SELECT 
    organization_id,
    'technician' as employee_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    SUM(calculated_annual_base_pay) as total_annual_base_pay,
    SUM(calculated_total_burden_annual) as total_annual_burden,
    AVG(calculated_burden_percent) as avg_burden_percent,
    AVG(calculated_efficiency_percent) as avg_efficiency_percent,
    AVG(calculated_true_cost_per_hour) as avg_true_cost_per_hour,
    SUM(calculated_billable_hours_per_year) as total_billable_hours_per_year
FROM pricing.technicians
GROUP BY organization_id

UNION ALL

SELECT 
    organization_id,
    'office_staff' as employee_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    SUM(calculated_annual_base_pay) as total_annual_base_pay,
    SUM(calculated_total_burden_annual) as total_annual_burden,
    AVG(calculated_burden_percent) as avg_burden_percent,
    NULL as avg_efficiency_percent,
    NULL as avg_true_cost_per_hour,
    NULL as total_billable_hours_per_year
FROM pricing.office_staff
GROUP BY organization_id;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE pricing.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.unproductive_time_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.technician_unproductive_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.office_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.job_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.markup_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing.settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization
CREATE OR REPLACE FUNCTION pricing.get_user_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id 
        FROM pricing.users 
        WHERE auth_user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies: Users can only see their organization's data
CREATE POLICY org_isolation_organizations ON pricing.organizations
    FOR ALL USING (id = pricing.get_user_org_id());

CREATE POLICY org_isolation_users ON pricing.users
    FOR ALL USING (organization_id = pricing.get_user_org_id());

CREATE POLICY org_isolation_technicians ON pricing.technicians
    FOR ALL USING (organization_id = pricing.get_user_org_id());

CREATE POLICY org_isolation_unproductive_cats ON pricing.unproductive_time_categories
    FOR ALL USING (organization_id = pricing.get_user_org_id());

CREATE POLICY org_isolation_unproductive_time ON pricing.technician_unproductive_time
    FOR ALL USING (
        technician_id IN (SELECT id FROM pricing.technicians WHERE organization_id = pricing.get_user_org_id())
    );

CREATE POLICY org_isolation_office_staff ON pricing.office_staff
    FOR ALL USING (organization_id = pricing.get_user_org_id());

CREATE POLICY org_isolation_vehicles ON pricing.vehicles
    FOR ALL USING (organization_id = pricing.get_user_org_id());

CREATE POLICY org_isolation_expense_categories ON pricing.expense_categories
    FOR ALL USING (organization_id = pricing.get_user_org_id());

CREATE POLICY org_isolation_expense_items ON pricing.expense_items
    FOR ALL USING (organization_id = pricing.get_user_org_id());

CREATE POLICY org_isolation_job_types ON pricing.job_types
    FOR ALL USING (organization_id = pricing.get_user_org_id());

CREATE POLICY org_isolation_markup_tiers ON pricing.markup_tiers
    FOR ALL USING (organization_id = pricing.get_user_org_id());

CREATE POLICY org_isolation_scenarios ON pricing.scenarios
    FOR ALL USING (organization_id = pricing.get_user_org_id());

CREATE POLICY org_isolation_audit_log ON pricing.audit_log
    FOR SELECT USING (organization_id = pricing.get_user_org_id());

CREATE POLICY org_isolation_settings ON pricing.settings
    FOR ALL USING (organization_id = pricing.get_user_org_id());

-- ============================================================================
-- SEED DATA: Default Unproductive Time Categories
-- ============================================================================

-- This will be run per-organization when they onboard
CREATE OR REPLACE FUNCTION pricing.seed_org_defaults(org_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Default unproductive time categories
    INSERT INTO pricing.unproductive_time_categories (organization_id, name, description, icon, default_hours, default_is_paid, is_system, sort_order)
    VALUES
        (org_id, 'Morning Meeting', 'Daily team huddle/standup', 'Coffee', 0.5, TRUE, TRUE, 1),
        (org_id, 'Drive Time', 'Travel between jobs', 'Route', 1.5, TRUE, TRUE, 2),
        (org_id, 'Lunch Break', 'Unpaid lunch break', 'Coffee', 0.5, FALSE, TRUE, 3),
        (org_id, 'Paperwork/Admin', 'End of day paperwork', 'ClipboardList', 0.5, TRUE, TRUE, 4),
        (org_id, 'Training', 'Ongoing training time', 'GraduationCap', 0, TRUE, TRUE, 5),
        (org_id, 'Warehouse/Parts', 'Parts pickup and inventory', 'Package', 0.25, TRUE, TRUE, 6),
        (org_id, 'Breaks', 'Paid breaks throughout day', 'PauseCircle', 0.25, TRUE, TRUE, 7)
    ON CONFLICT DO NOTHING;
    
    -- Default expense categories
    INSERT INTO pricing.expense_categories (organization_id, name, icon, color, is_system, sort_order)
    VALUES
        (org_id, 'Fleet Costs', 'Truck', 'amber', TRUE, 0),
        (org_id, 'Facility & Office', 'Building2', 'blue', TRUE, 1),
        (org_id, 'Business Insurance', 'Shield', 'emerald', TRUE, 2),
        (org_id, 'Software & Technology', 'Monitor', 'violet', TRUE, 3),
        (org_id, 'Marketing & Advertising', 'Megaphone', 'rose', TRUE, 4),
        (org_id, 'Financial & Professional', 'Landmark', 'slate', TRUE, 5),
        (org_id, 'Tools & Equipment', 'Wrench', 'orange', TRUE, 6),
        (org_id, 'Training & Development', 'GraduationCap', 'teal', TRUE, 7),
        (org_id, 'Miscellaneous', 'MoreHorizontal', 'gray', TRUE, 8)
    ON CONFLICT DO NOTHING;
    
    -- Default job types
    INSERT INTO pricing.job_types (organization_id, name, code, description, min_hours, max_hours, target_gross_margin, member_discount_percent, material_gross_margin, sort_order)
    VALUES
        (org_id, 'Service Call', 'SVC', '4 Hours or Less', 0, 4, 60, 0, 40, 1),
        (org_id, 'Half Day', 'HALF', '4-6 Hours', 4, 6, 60, 10, 60, 2),
        (org_id, 'Full Day Install', 'INST', '6+ Hours / Multi-Day', 6, 40, 60, 10, 65, 3)
    ON CONFLICT DO NOTHING;
    
    -- Default markup tiers
    INSERT INTO pricing.markup_tiers (organization_id, name, min_cost, max_cost, gross_margin_percent, sort_order)
    VALUES
        (org_id, 'Tier 1 - Small Parts', 0, 20, 80, 1),
        (org_id, 'Tier 2 - Medium Parts', 20.01, 50, 78, 2),
        (org_id, 'Tier 3 - Standard', 50.01, 1000, 75, 3),
        (org_id, 'Tier 4 - High Value', 1000.01, 999999.99, 70, 4)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS: API Access
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA pricing TO authenticated;
GRANT USAGE ON SCHEMA pricing TO service_role;

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pricing TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA pricing TO service_role;

-- Grant access to sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA pricing TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pricing TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pricing TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pricing TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON SCHEMA pricing IS 'Advanced Pricing System - Multi-tenant pricing calculator for service businesses';
COMMENT ON TABLE pricing.organizations IS 'Root tenant table - each organization is a separate business';
COMMENT ON TABLE pricing.technicians IS 'Field service technicians who generate billable revenue';
COMMENT ON TABLE pricing.office_staff IS 'Non-billable office/administrative employees';
COMMENT ON TABLE pricing.vehicles IS 'Fleet vehicles with associated costs';
COMMENT ON TABLE pricing.expense_categories IS 'Operating expense categories';
COMMENT ON TABLE pricing.expense_items IS 'Individual expense line items';
COMMENT ON TABLE pricing.job_types IS 'Service/job types with pricing parameters';
COMMENT ON TABLE pricing.markup_tiers IS 'Tiered material markup structure';
COMMENT ON TABLE pricing.scenarios IS 'Saved pricing scenarios for what-if analysis';
COMMENT ON TABLE pricing.audit_log IS 'Change history for compliance and debugging';
