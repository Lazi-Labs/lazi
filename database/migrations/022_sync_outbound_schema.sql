-- Migration: 022_sync_outbound_schema.sql
-- Purpose: Create sync schema for outbound queue and sync history

BEGIN;

CREATE SCHEMA IF NOT EXISTS sync;

-- Outbound queue for changes to push to ServiceTitan
CREATE TABLE IF NOT EXISTS sync.outbound_queue (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    st_id VARCHAR(100),
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'synced', 'failed', 'conflict')),
    attempts INT DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ,
    created_by INT
);

CREATE INDEX IF NOT EXISTS idx_outbound_queue_status ON sync.outbound_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_outbound_queue_entity ON sync.outbound_queue(entity_type, entity_id);

-- Entity mappings (local ID <-> ST ID)
CREATE TABLE IF NOT EXISTS sync.entity_mappings (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    local_id VARCHAR(100) NOT NULL,
    st_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, local_id),
    UNIQUE(entity_type, st_id)
);

-- Sync history for debugging
CREATE TABLE IF NOT EXISTS sync.sync_history (
    id SERIAL PRIMARY KEY,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    operation VARCHAR(20),
    status VARCHAR(20),
    request_payload JSONB,
    response_payload JSONB,
    error_message TEXT,
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_history_entity ON sync.sync_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_created ON sync.sync_history(created_at DESC);

COMMIT;
