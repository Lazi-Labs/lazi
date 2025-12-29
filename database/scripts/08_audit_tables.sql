-- ============================================
-- Perfect Catch - AUDIT Schema Tables
-- ============================================
-- Run order: 08
-- 
-- Purpose: Change history and logging
-- Rules:
--   - Track all changes across all schemas
--   - Partitioned by date for performance
--   - Never delete audit records
-- ============================================

-- Change Log (partitioned by month)
CREATE TABLE IF NOT EXISTS audit.change_log (
    id BIGSERIAL,
    
    -- What changed
    schema_name VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    
    -- Change details
    operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[] DEFAULT '{}',
    
    -- Who/what made the change
    changed_by VARCHAR(100), -- user_id, system, sync_worker, etc.
    change_source VARCHAR(50), -- api, sync, manual, trigger
    
    -- When
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (id, changed_at)
) PARTITION BY RANGE (changed_at);

-- Create partitions for current and next year
CREATE TABLE IF NOT EXISTS audit.change_log_2024 PARTITION OF audit.change_log
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS audit.change_log_2025 PARTITION OF audit.change_log
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS audit.change_log_2026 PARTITION OF audit.change_log
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- API Log (for debugging and analytics)
CREATE TABLE IF NOT EXISTS audit.api_log (
    id BIGSERIAL,
    
    -- Request info
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    query_params JSONB,
    request_body JSONB,
    
    -- Response info
    status_code INT,
    response_body JSONB,
    response_time_ms INT,
    
    -- Context
    user_id VARCHAR(100),
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Timing
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (id, requested_at)
) PARTITION BY RANGE (requested_at);

-- Create partitions
CREATE TABLE IF NOT EXISTS audit.api_log_2024 PARTITION OF audit.api_log
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS audit.api_log_2025 PARTITION OF audit.api_log
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS audit.api_log_2026 PARTITION OF audit.api_log
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Error Log (for debugging)
CREATE TABLE IF NOT EXISTS audit.error_log (
    id BIGSERIAL PRIMARY KEY,
    
    -- Error details
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    
    -- Context
    source VARCHAR(100), -- sync_worker, api, webhook, etc.
    context JSONB DEFAULT '{}',
    
    -- Related entities
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    
    -- Timing
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log completion
DO $$ BEGIN RAISE NOTICE 'AUDIT schema tables created (3 tables + partitions)'; END $$;
