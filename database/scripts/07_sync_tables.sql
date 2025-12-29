-- ============================================
-- Perfect Catch - SYNC Schema Tables
-- ============================================
-- Run order: 07
-- 
-- Purpose: Queue state and sync tracking
-- Rules:
--   - Outbound queue for CRM → ServiceTitan operations
--   - Inbound log for ServiceTitan → CRM tracking
--   - Entity hashes for change detection
-- ============================================

-- Outbound Queue (CRM → ServiceTitan)
CREATE TABLE IF NOT EXISTS sync.outbound_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entity info
    entity_type VARCHAR(50) NOT NULL, -- job, customer, estimate, appointment
    entity_id VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- create, update, delete
    
    -- Payload
    payload JSONB NOT NULL,
    
    -- Sync settings
    auto_sync BOOLEAN DEFAULT true,
    priority INT DEFAULT 5, -- 1-10, lower = higher priority
    
    -- State
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(100),
    processed_at TIMESTAMPTZ,
    
    -- Result
    result JSONB,
    error_message TEXT,
    error_code VARCHAR(50)
);

-- Inbound Sync Log (ServiceTitan → CRM)
CREATE TABLE IF NOT EXISTS sync.inbound_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source
    source VARCHAR(50) NOT NULL, -- servicetitan, webhook
    endpoint VARCHAR(255),
    
    -- Sync details
    sync_type VARCHAR(50) NOT NULL, -- full, incremental, webhook
    entity_types VARCHAR(50)[] DEFAULT '{}',
    
    -- Results
    records_fetched INT DEFAULT 0,
    records_created INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    records_unchanged INT DEFAULT 0,
    records_failed INT DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed, partial
    error_message TEXT,
    error_details JSONB,
    
    -- Metadata
    triggered_by VARCHAR(100), -- scheduler, manual, webhook
    parameters JSONB DEFAULT '{}'
);

-- Entity Hashes (for change detection)
CREATE TABLE IF NOT EXISTS sync.entity_hashes (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- customer, job, estimate, etc.
    entity_id BIGINT NOT NULL,
    
    -- Hashes
    raw_hash VARCHAR(64), -- Hash of raw.st_* record
    master_hash VARCHAR(64), -- Hash of master.* record
    crm_hash VARCHAR(64), -- Hash of crm.* record (if exists)
    
    -- Sync flags
    needs_push BOOLEAN DEFAULT false, -- CRM changed, needs push to ST
    needs_pull BOOLEAN DEFAULT false, -- ST changed, needs pull to master
    
    -- Timestamps
    raw_updated_at TIMESTAMPTZ,
    master_updated_at TIMESTAMPTZ,
    crm_updated_at TIMESTAMPTZ,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(entity_type, entity_id)
);

-- Distributed Locks (for sync coordination)
CREATE TABLE IF NOT EXISTS sync.locks (
    lock_key VARCHAR(100) PRIMARY KEY,
    locked_by VARCHAR(100) NOT NULL,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- Sync Conflicts (when ST and CRM both changed)
CREATE TABLE IF NOT EXISTS sync.conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entity info
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    
    -- Conflict details
    conflict_type VARCHAR(50) NOT NULL, -- both_modified, deleted_modified, field_conflict
    conflicting_fields TEXT[] DEFAULT '{}',
    
    -- Data snapshots
    st_data JSONB,
    crm_data JSONB,
    
    -- Resolution
    status VARCHAR(20) DEFAULT 'unresolved', -- unresolved, resolved_keep_st, resolved_keep_crm, resolved_merged
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log completion
DO $$ BEGIN RAISE NOTICE 'SYNC schema tables created (5 tables)'; END $$;
