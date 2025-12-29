-- ============================================
-- Perfect Catch - CRM Schema Tables
-- ============================================
-- Run order: 05
-- 
-- Purpose: Custom CRM tables (NOT Payload CMS - that stays separate)
-- Rules:
--   - User-editable data
--   - Links to master schema via st_id references
--   - Supports pipelines, opportunities, activities
-- ============================================

-- CRM Contacts (linked to master.customers)
CREATE TABLE IF NOT EXISTS crm.contacts (
    id BIGSERIAL PRIMARY KEY,
    st_customer_id BIGINT, -- References master.customers(st_id)
    
    -- CRM-specific fields (not in ST)
    lead_source VARCHAR(100),
    referral_source VARCHAR(255),
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    
    -- Custom fields (flexible)
    custom_fields JSONB DEFAULT '{}',
    
    -- CRM metadata
    owner_id INT, -- CRM user who owns this contact
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipelines (user-defined)
CREATE TABLE IF NOT EXISTS crm.pipelines (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50) DEFAULT 'opportunity', -- opportunity, lead, project
    active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline Stages
CREATE TABLE IF NOT EXISTS crm.pipeline_stages (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id BIGINT REFERENCES crm.pipelines(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280', -- Hex color
    display_order INT DEFAULT 0,
    
    -- Stage behavior
    is_won BOOLEAN DEFAULT false,
    is_lost BOOLEAN DEFAULT false,
    auto_close_days INT, -- Auto-close opportunity after X days
    
    -- Probability for forecasting
    probability_percent INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunities
CREATE TABLE IF NOT EXISTS crm.opportunities (
    id BIGSERIAL PRIMARY KEY,
    
    -- Links
    contact_id BIGINT REFERENCES crm.contacts(id),
    st_customer_id BIGINT, -- Direct link to ST customer
    st_job_id BIGINT, -- Link to ST job if created
    st_estimate_id BIGINT, -- Link to ST estimate if exists
    
    -- Pipeline position
    pipeline_id BIGINT REFERENCES crm.pipelines(id),
    stage_id BIGINT REFERENCES crm.pipeline_stages(id),
    
    -- Opportunity details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(12,2) DEFAULT 0,
    
    -- Timing
    expected_close_date DATE,
    actual_close_date DATE,
    
    -- Assignment
    owner_id INT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'open', -- open, won, lost
    lost_reason VARCHAR(255),
    
    -- Metadata
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities (calls, emails, notes, tasks)
CREATE TABLE IF NOT EXISTS crm.activities (
    id BIGSERIAL PRIMARY KEY,
    
    -- Polymorphic link
    entity_type VARCHAR(50) NOT NULL, -- contact, opportunity, job
    entity_id BIGINT NOT NULL,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL, -- call, email, note, meeting, task
    subject VARCHAR(255),
    description TEXT,
    
    -- Timing
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_minutes INT,
    
    -- Assignment
    assigned_to INT,
    created_by INT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricebook Overrides (CRM modifications to ST pricebook)
CREATE TABLE IF NOT EXISTS crm.pricebook_overrides (
    id BIGSERIAL PRIMARY KEY,
    st_pricebook_id BIGINT NOT NULL,
    item_type VARCHAR(20) NOT NULL, -- material, service, equipment
    
    -- Override values (null = use ST value)
    override_price DECIMAL(12,2),
    override_cost DECIMAL(12,2),
    override_name VARCHAR(255),
    override_description TEXT,
    
    -- CRM-specific additions
    internal_notes TEXT,
    preferred_vendor VARCHAR(255),
    reorder_threshold INT,
    
    -- Sync tracking
    pending_sync BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(st_pricebook_id, item_type)
);

-- Log completion
DO $$ BEGIN RAISE NOTICE 'CRM schema tables created (6 tables)'; END $$;
