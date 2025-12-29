-- ============================================
-- Perfect Catch - WORKFLOW Schema Tables
-- ============================================
-- Run order: 06
-- 
-- Purpose: Automation configurations and execution
-- Rules:
--   - Stage actions define what happens on pipeline transitions
--   - Field mappings define CRM ↔ ST data transformations
--   - Workflow definitions are reusable automation sequences
-- ============================================

-- Stage Actions (what happens when opportunity enters/exits a stage)
CREATE TABLE IF NOT EXISTS workflow.stage_actions (
    id BIGSERIAL PRIMARY KEY,
    stage_id BIGINT, -- References crm.pipeline_stages(id)
    
    -- Trigger
    trigger_type VARCHAR(20) NOT NULL, -- on_enter, on_exit, on_time
    trigger_delay_minutes INT DEFAULT 0, -- For delayed actions
    
    -- Action
    action_type VARCHAR(50) NOT NULL, -- create_st_job, create_st_appointment, send_notification, update_field, webhook, run_workflow
    action_config JSONB NOT NULL, -- Action-specific configuration
    
    -- Execution settings
    auto_execute BOOLEAN DEFAULT true, -- false = requires manual trigger
    stop_on_error BOOLEAN DEFAULT false,
    retry_count INT DEFAULT 3,
    
    -- Conditions (optional)
    conditions JSONB, -- e.g., {"field": "value", "operator": ">", "threshold": 1000}
    
    active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field Mappings (how CRM fields map to ST fields)
CREATE TABLE IF NOT EXISTS workflow.field_mappings (
    id BIGSERIAL PRIMARY KEY,
    
    -- Source
    source_entity VARCHAR(50) NOT NULL, -- crm.opportunities, crm.contacts
    source_field VARCHAR(100) NOT NULL,
    
    -- Destination
    dest_entity VARCHAR(50) NOT NULL, -- st_job, st_customer, st_estimate
    dest_field VARCHAR(100) NOT NULL,
    
    -- Transformation
    transform_type VARCHAR(20) DEFAULT 'direct', -- direct, lookup, formula, template
    transform_config JSONB, -- e.g., {"lookup_table": "...", "lookup_key": "..."}
    
    -- Sync direction
    direction VARCHAR(10) DEFAULT 'crm_to_st', -- crm_to_st, st_to_crm, bidirectional
    
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Definitions (reusable automation sequences)
CREATE TABLE IF NOT EXISTS workflow.definitions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- Trigger configuration
    trigger_type VARCHAR(50) NOT NULL, -- manual, schedule, event, webhook
    trigger_config JSONB NOT NULL,
    
    -- Workflow steps (ordered list)
    steps JSONB NOT NULL DEFAULT '[]', -- Array of step definitions
    
    -- Error handling
    on_error VARCHAR(20) DEFAULT 'continue', -- continue, stop, retry
    max_retries INT DEFAULT 3,
    
    -- Status
    active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    last_run_status VARCHAR(20),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Executions (run history)
CREATE TABLE IF NOT EXISTS workflow.executions (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT REFERENCES workflow.definitions(id),
    
    -- Context
    trigger_type VARCHAR(50),
    trigger_data JSONB,
    
    -- Execution state
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    current_step INT DEFAULT 0,
    step_results JSONB DEFAULT '[]',
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error info
    error_message TEXT,
    error_step INT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Transformations (reusable data manipulation rules)
CREATE TABLE IF NOT EXISTS workflow.transformations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Source configuration
    source_type VARCHAR(20) NOT NULL, -- table, query, api
    source_config JSONB NOT NULL,
    
    -- Transformation rules
    rules JSONB NOT NULL, -- Array of transformation steps
    
    -- Destination configuration
    dest_type VARCHAR(20) NOT NULL, -- table, api, file
    dest_config JSONB NOT NULL,
    
    -- Schedule (optional)
    schedule_cron VARCHAR(100),
    
    active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merge Rules (how to combine data from multiple sources)
CREATE TABLE IF NOT EXISTS workflow.merge_rules (
    id BIGSERIAL PRIMARY KEY,
    target_entity VARCHAR(50) NOT NULL, -- master.customers, master.jobs
    
    -- Source tables (ordered by priority)
    sources JSONB NOT NULL, -- [{"table": "raw.st_customers", "priority": 1}, ...]
    
    -- Field-level merge strategy
    field_strategies JSONB NOT NULL, -- {"name": "first_non_null", "email": "prefer_source_1", ...}
    
    -- Conflict resolution
    conflict_resolution VARCHAR(20) DEFAULT 'latest', -- latest, priority, manual
    
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messaging Templates
CREATE TABLE IF NOT EXISTS workflow.messaging_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    channel VARCHAR(50) NOT NULL, -- sms, email, push
    subject_template VARCHAR(500),
    body_template TEXT NOT NULL,
    required_variables JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    category VARCHAR(100),
    usage_count INT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log completion
DO $$ BEGIN RAISE NOTICE 'WORKFLOW schema tables created (7 tables)'; END $$;
