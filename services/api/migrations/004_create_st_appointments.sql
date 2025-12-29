-- Migration: Create ServiceTitan appointments cache table
-- Purpose: Cache appointment data from ServiceTitan API
-- Date: 2024-12-25

CREATE TABLE IF NOT EXISTS raw.st_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  st_id VARCHAR(50) NOT NULL,
  job_id VARCHAR(50),
  technician_id VARCHAR(50),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  arrival_window_start VARCHAR(50),
  arrival_window_end VARCHAR(50),
  status VARCHAR(50),
  active BOOLEAN DEFAULT true,
  full_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_raw_appointments_tenant_st UNIQUE (tenant_id, st_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_st_appointments_tenant ON raw.st_appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_st_appointments_job ON raw.st_appointments(tenant_id, job_id);
CREATE INDEX IF NOT EXISTS idx_st_appointments_technician ON raw.st_appointments(tenant_id, technician_id);
CREATE INDEX IF NOT EXISTS idx_st_appointments_start ON raw.st_appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_st_appointments_date ON raw.st_appointments(tenant_id, DATE(start_time));
CREATE INDEX IF NOT EXISTS idx_st_appointments_status ON raw.st_appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_st_appointments_synced ON raw.st_appointments(synced_at);

-- Create composite index for technician schedule queries
CREATE INDEX IF NOT EXISTS idx_st_appointments_tech_date ON raw.st_appointments(tenant_id, technician_id, DATE(start_time));

-- Create GIN index for JSONB full_data
CREATE INDEX IF NOT EXISTS idx_st_appointments_full_data ON raw.st_appointments USING GIN (full_data);

-- Add comments
COMMENT ON TABLE raw.st_appointments IS 'Cached appointment data from ServiceTitan API';
COMMENT ON COLUMN raw.st_appointments.st_id IS 'ServiceTitan appointment ID';
COMMENT ON COLUMN raw.st_appointments.full_data IS 'Complete JSON response from ServiceTitan API';
