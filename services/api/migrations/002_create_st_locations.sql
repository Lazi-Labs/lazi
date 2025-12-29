-- Migration: Create ServiceTitan locations cache table
-- Purpose: Cache location data from ServiceTitan API
-- Date: 2024-12-25

CREATE TABLE IF NOT EXISTS raw.st_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  st_id VARCHAR(50) NOT NULL,
  customer_id VARCHAR(50),
  name VARCHAR(255),
  address_street VARCHAR(255),
  address_unit VARCHAR(50),
  address_city VARCHAR(100),
  address_state VARCHAR(50),
  address_zip VARCHAR(20),
  address_country VARCHAR(50) DEFAULT 'USA',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(50),
  email VARCHAR(255),
  tax_zone_id VARCHAR(50),
  zone_id VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_on TIMESTAMP WITH TIME ZONE,
  modified_on TIMESTAMP WITH TIME ZONE,
  full_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_raw_locations_tenant_st UNIQUE (tenant_id, st_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_st_locations_tenant ON raw.st_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_st_locations_customer ON raw.st_locations(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_st_locations_active ON raw.st_locations(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_st_locations_modified ON raw.st_locations(modified_on);
CREATE INDEX IF NOT EXISTS idx_st_locations_synced ON raw.st_locations(synced_at);

-- Create GIN index for JSONB full_data
CREATE INDEX IF NOT EXISTS idx_st_locations_full_data ON raw.st_locations USING GIN (full_data);

-- Add comments
COMMENT ON TABLE raw.st_locations IS 'Cached location data from ServiceTitan API';
COMMENT ON COLUMN raw.st_locations.st_id IS 'ServiceTitan location ID';
COMMENT ON COLUMN raw.st_locations.full_data IS 'Complete JSON response from ServiceTitan API';
