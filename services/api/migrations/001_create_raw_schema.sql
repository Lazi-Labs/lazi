-- Migration: Create raw schema for ServiceTitan data caching
-- Purpose: Store cached data from ServiceTitan API for performance
-- Date: 2024-12-25

-- Create raw schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS raw;

-- Create sync state tracking table
CREATE TABLE IF NOT EXISTS raw.sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  last_full_sync TIMESTAMP WITH TIME ZONE,
  last_incremental_sync TIMESTAMP WITH TIME ZONE,
  records_synced INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_sync_state_tenant_table UNIQUE (tenant_id, table_name)
);

-- Create index on sync state
CREATE INDEX IF NOT EXISTS idx_sync_state_tenant ON raw.sync_state(tenant_id);

-- Add comments
COMMENT ON SCHEMA raw IS 'Schema for caching external data (ServiceTitan)';
COMMENT ON TABLE raw.sync_state IS 'Tracks sync status for each table per tenant';
