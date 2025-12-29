-- Migration: Create ServiceTitan technicians cache table
-- Purpose: Cache technician data from ServiceTitan API
-- Date: 2024-12-25

CREATE TABLE IF NOT EXISTS raw.st_technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  st_id VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  business_unit_id VARCHAR(50),
  team_id VARCHAR(50),
  zone_id VARCHAR(50),
  skills JSONB,
  role VARCHAR(50),
  active BOOLEAN DEFAULT true,
  hire_date DATE,
  color VARCHAR(20),
  full_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_raw_technicians_tenant_st UNIQUE (tenant_id, st_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_st_technicians_tenant ON raw.st_technicians(tenant_id);
CREATE INDEX IF NOT EXISTS idx_st_technicians_active ON raw.st_technicians(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_st_technicians_team ON raw.st_technicians(tenant_id, team_id);
CREATE INDEX IF NOT EXISTS idx_st_technicians_business_unit ON raw.st_technicians(tenant_id, business_unit_id);
CREATE INDEX IF NOT EXISTS idx_st_technicians_zone ON raw.st_technicians(tenant_id, zone_id);
CREATE INDEX IF NOT EXISTS idx_st_technicians_email ON raw.st_technicians(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_st_technicians_synced ON raw.st_technicians(synced_at);
CREATE INDEX IF NOT EXISTS idx_st_technicians_name ON raw.st_technicians(tenant_id, name);

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_st_technicians_skills ON raw.st_technicians USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_st_technicians_full_data ON raw.st_technicians USING GIN (full_data);

-- Add comments
COMMENT ON TABLE raw.st_technicians IS 'Cached technician data from ServiceTitan API';
COMMENT ON COLUMN raw.st_technicians.st_id IS 'ServiceTitan technician ID';
COMMENT ON COLUMN raw.st_technicians.skills IS 'Array of technician skills/certifications';
COMMENT ON COLUMN raw.st_technicians.full_data IS 'Complete JSON response from ServiceTitan API';
