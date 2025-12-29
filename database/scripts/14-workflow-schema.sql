-- ============================================================
-- WORKFLOW SCHEMA
-- Phase 6: Configurable workflow engine for business automation
-- ============================================================

CREATE SCHEMA IF NOT EXISTS workflow;

-- ────────────────────────────────────────────────────────────
-- workflow.definitions
-- Workflow templates with trigger conditions and steps
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow.definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INT DEFAULT 1,
    
    -- Trigger configuration
    trigger_event VARCHAR(100) NOT NULL,  -- e.g., 'estimate.created', 'job.completed', 'invoice.overdue'
    trigger_conditions JSONB DEFAULT '{}', -- Conditions that must be met to trigger
    
    -- Workflow steps (ordered array of step definitions)
    steps JSONB NOT NULL DEFAULT '[]',
    
    -- Configuration
    enabled BOOLEAN DEFAULT true,
    max_retries INT DEFAULT 3,
    retry_delay_seconds INT DEFAULT 300,
    timeout_seconds INT DEFAULT 86400,  -- 24 hours default
    
    -- Metadata
    tags VARCHAR(100)[],
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_definitions_trigger ON workflow.definitions(trigger_event);
CREATE INDEX idx_workflow_definitions_enabled ON workflow.definitions(enabled);
CREATE INDEX idx_workflow_definitions_tags ON workflow.definitions USING gin(tags);

-- ────────────────────────────────────────────────────────────
-- workflow.instances
-- Running or completed workflow instances
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow.instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to definition
    definition_id UUID NOT NULL REFERENCES workflow.definitions(id),
    definition_version INT NOT NULL,
    
    -- Entity that triggered this workflow
    entity_type VARCHAR(50) NOT NULL,  -- 'customer', 'job', 'estimate', 'invoice'
    entity_id BIGINT NOT NULL,
    
    -- Execution state
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, running, paused, completed, failed, cancelled
    current_step INT DEFAULT 0,
    
    -- Context data (passed between steps)
    context JSONB DEFAULT '{}',
    
    -- Results
    step_results JSONB DEFAULT '[]',  -- Array of step execution results
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    next_step_at TIMESTAMPTZ,  -- For delayed steps
    
    -- Metadata
    triggered_by VARCHAR(255),  -- 'system', 'manual', 'api'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_instances_definition ON workflow.instances(definition_id);
CREATE INDEX idx_workflow_instances_entity ON workflow.instances(entity_type, entity_id);
CREATE INDEX idx_workflow_instances_status ON workflow.instances(status);
CREATE INDEX idx_workflow_instances_next_step ON workflow.instances(next_step_at) WHERE status = 'running';

-- ────────────────────────────────────────────────────────────
-- workflow.step_logs
-- Detailed log of each step execution
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow.step_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    instance_id UUID NOT NULL REFERENCES workflow.instances(id),
    step_index INT NOT NULL,
    step_name VARCHAR(255),
    
    -- Execution
    action_type VARCHAR(100) NOT NULL,  -- 'send_email', 'send_sms', 'update_stage', 'api_call', 'delay', 'condition'
    action_config JSONB,
    
    -- Result
    status VARCHAR(50) NOT NULL,  -- 'pending', 'running', 'completed', 'failed', 'skipped'
    result JSONB,
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    
    -- Retry tracking
    attempt_number INT DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_step_logs_instance ON workflow.step_logs(instance_id);
CREATE INDEX idx_workflow_step_logs_status ON workflow.step_logs(status);

-- ────────────────────────────────────────────────────────────
-- workflow.triggers
-- Event-to-workflow mapping for fast lookup
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow.triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    event_name VARCHAR(100) NOT NULL,
    definition_id UUID NOT NULL REFERENCES workflow.definitions(id),
    priority INT DEFAULT 0,  -- Higher priority runs first
    
    enabled BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_triggers_event ON workflow.triggers(event_name);
CREATE INDEX idx_workflow_triggers_enabled ON workflow.triggers(enabled);
CREATE UNIQUE INDEX idx_workflow_triggers_unique ON workflow.triggers(event_name, definition_id);

-- ────────────────────────────────────────────────────────────
-- workflow.schedules
-- Scheduled workflow executions (cron-like)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    definition_id UUID NOT NULL REFERENCES workflow.definitions(id),
    
    -- Schedule configuration
    cron_expression VARCHAR(100),  -- e.g., '0 9 * * 1' (Monday 9am)
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    -- Query to find entities to process
    entity_query JSONB,  -- SQL-like query definition
    
    -- State
    enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_schedules_next_run ON workflow.schedules(next_run_at) WHERE enabled = true;

-- ────────────────────────────────────────────────────────────
-- workflow.templates
-- Pre-built workflow templates for common use cases
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),  -- 'sales', 'service', 'billing', 'marketing'
    
    -- Template definition (same structure as workflow.definitions)
    trigger_event VARCHAR(100),
    trigger_conditions JSONB DEFAULT '{}',
    steps JSONB NOT NULL DEFAULT '[]',
    
    -- Metadata
    is_system BOOLEAN DEFAULT false,  -- System templates can't be deleted
    usage_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_templates_category ON workflow.templates(category);

-- ────────────────────────────────────────────────────────────
-- Seed default workflow templates
-- ────────────────────────────────────────────────────────────
INSERT INTO workflow.templates (name, description, category, trigger_event, trigger_conditions, steps, is_system)
VALUES 
(
    'Estimate Follow-up',
    'Automatically follow up on unsold estimates after 3 days',
    'sales',
    'estimate.created',
    '{"status": {"$ne": "Sold"}}',
    '[
        {"name": "Wait 3 days", "action": "delay", "config": {"duration": "3d"}},
        {"name": "Check status", "action": "condition", "config": {"field": "status", "operator": "ne", "value": "Sold"}},
        {"name": "Send follow-up SMS", "action": "send_sms", "config": {"template": "estimate_followup"}}
    ]'::jsonb,
    true
),
(
    'Job Completion Review Request',
    'Request a review after job completion',
    'service',
    'job.completed',
    '{}',
    '[
        {"name": "Wait 1 day", "action": "delay", "config": {"duration": "1d"}},
        {"name": "Send review request", "action": "send_sms", "config": {"template": "review_request"}}
    ]'::jsonb,
    true
),
(
    'Invoice Payment Reminder',
    'Send payment reminders for overdue invoices',
    'billing',
    'invoice.overdue',
    '{"balance": {"$gt": 0}}',
    '[
        {"name": "Send first reminder", "action": "send_email", "config": {"template": "payment_reminder_1"}},
        {"name": "Wait 7 days", "action": "delay", "config": {"duration": "7d"}},
        {"name": "Check if paid", "action": "condition", "config": {"field": "balance", "operator": "gt", "value": 0}},
        {"name": "Send second reminder", "action": "send_sms", "config": {"template": "payment_reminder_2"}}
    ]'::jsonb,
    true
),
(
    'New Customer Welcome',
    'Welcome sequence for new customers',
    'marketing',
    'customer.created',
    '{}',
    '[
        {"name": "Send welcome email", "action": "send_email", "config": {"template": "welcome_email"}},
        {"name": "Wait 3 days", "action": "delay", "config": {"duration": "3d"}},
        {"name": "Send tips email", "action": "send_email", "config": {"template": "customer_tips"}}
    ]'::jsonb,
    true
)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL ON SCHEMA workflow TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA workflow TO postgres;
