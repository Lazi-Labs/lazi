-- Migration: Create ServiceTitan jobs cache table
-- Purpose: Cache job data from ServiceTitan API
-- Date: 2024-12-25

CREATE TABLE IF NOT EXISTS raw.st_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  st_id VARCHAR(50) NOT NULL,
  job_number VARCHAR(50),
  customer_id VARCHAR(50),
  location_id VARCHAR(50),
  project_id VARCHAR(50),
  business_unit_id VARCHAR(50),
  job_type_id VARCHAR(50),
  campaign_id VARCHAR(50),
  status VARCHAR(50),
  priority VARCHAR(50),
  summary TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  total DECIMAL(10, 2),
  active BOOLEAN DEFAULT true,
  created_on TIMESTAMP WITH TIME ZONE,
  modified_on TIMESTAMP WITH TIME ZONE,
  full_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_raw_jobs_tenant_st UNIQUE (tenant_id, st_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_st_jobs_tenant ON raw.st_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_st_jobs_customer ON raw.st_jobs(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_st_jobs_location ON raw.st_jobs(tenant_id, location_id);
CREATE INDEX IF NOT EXISTS idx_st_jobs_status ON raw.st_jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_st_jobs_business_unit ON raw.st_jobs(tenant_id, business_unit_id);
CREATE INDEX IF NOT EXISTS idx_st_jobs_scheduled ON raw.st_jobs(scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_st_jobs_modified ON raw.st_jobs(modified_on);
CREATE INDEX IF NOT EXISTS idx_st_jobs_synced ON raw.st_jobs(synced_at);
CREATE INDEX IF NOT EXISTS idx_st_jobs_job_number ON raw.st_jobs(tenant_id, job_number);

-- Create GIN index for JSONB full_data (for technician queries)
CREATE INDEX IF NOT EXISTS idx_st_jobs_full_data ON raw.st_jobs USING GIN (full_data);

-- Add comments
COMMENT ON TABLE raw.st_jobs IS 'Cached job data from ServiceTitan API';
COMMENT ON COLUMN raw.st_jobs.st_id IS 'ServiceTitan job ID';
COMMENT ON COLUMN raw.st_jobs.full_data IS 'Complete JSON response from ServiceTitan API, includes technician assignments';
