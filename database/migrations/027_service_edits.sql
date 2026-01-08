-- ============================================
-- Service Edits Migration
-- Migration: 027_service_edits.sql
-- Date: 2025-01-08
-- Purpose: Create table for storing local service edits before pushing to ServiceTitan
-- ============================================

-- ============================================
-- 1. Create table for service edits (similar to materials overrides)
-- ============================================

CREATE TABLE IF NOT EXISTS crm.pricebook_service_edits (
  id SERIAL PRIMARY KEY,

  -- References
  st_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,

  -- Editable fields (NULL means no override)
  code VARCHAR(100),
  name VARCHAR(500),
  display_name VARCHAR(500),
  description TEXT,
  price DECIMAL(12,2),
  member_price DECIMAL(12,2),
  add_on_price DECIMAL(12,2),
  add_on_member_price DECIMAL(12,2),
  hours DECIMAL(8,2),
  active BOOLEAN,
  taxable BOOLEAN,
  is_labor BOOLEAN,
  account VARCHAR(100),

  -- Warranty (text from UI)
  warranty_text TEXT,

  -- Materials and Equipment overrides (JSONB)
  service_materials JSONB,
  service_equipment JSONB,

  -- Categories override
  categories JSONB,

  -- Images
  pending_images JSONB DEFAULT '[]',
  images_to_delete JSONB DEFAULT '[]',

  -- Upgrades and recommendations
  upgrades JSONB,
  recommendations JSONB,

  -- Custom CRM fields
  internal_notes TEXT,
  custom_tags JSONB DEFAULT '[]',

  -- Sync status
  sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'error'
  sync_error TEXT,
  last_pushed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),

  -- Unique constraint
  UNIQUE(st_id, tenant_id)
);

-- ============================================
-- 2. Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pricebook_service_edits_tenant
ON crm.pricebook_service_edits(tenant_id);

CREATE INDEX IF NOT EXISTS idx_pricebook_service_edits_st_id
ON crm.pricebook_service_edits(st_id);

CREATE INDEX IF NOT EXISTS idx_pricebook_service_edits_pending
ON crm.pricebook_service_edits(tenant_id, sync_status)
WHERE sync_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pricebook_service_edits_error
ON crm.pricebook_service_edits(sync_status)
WHERE sync_status = 'error';

-- ============================================
-- 3. Create table for NEW services (not yet in ST)
-- ============================================

CREATE TABLE IF NOT EXISTS crm.pricebook_new_services (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,

  -- All ST required fields
  code VARCHAR(100) NOT NULL,
  display_name VARCHAR(500),
  description TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  member_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  add_on_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  add_on_member_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  taxable BOOLEAN DEFAULT true,
  is_labor BOOLEAN DEFAULT false,
  account VARCHAR(100),

  -- Warranty
  warranty JSONB,

  -- Categories (array of ST category IDs)
  categories JSONB NOT NULL DEFAULT '[]',

  -- Materials and Equipment
  service_materials JSONB DEFAULT '[]',
  service_equipment JSONB DEFAULT '[]',

  -- Upgrades and recommendations
  upgrades JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',

  -- Assets/Images
  assets JSONB DEFAULT '[]',
  pending_images JSONB DEFAULT '[]',

  -- Sync status
  st_id BIGINT,  -- Populated after push to ST
  pushed_to_st BOOLEAN DEFAULT false,
  pushed_at TIMESTAMPTZ,
  push_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),

  UNIQUE(tenant_id, code)
);

-- Create indexes for new services table
CREATE INDEX IF NOT EXISTS idx_crm_new_services_tenant
ON crm.pricebook_new_services(tenant_id);

CREATE INDEX IF NOT EXISTS idx_crm_new_services_pending
ON crm.pricebook_new_services(tenant_id, pushed_to_st)
WHERE pushed_to_st = false;

CREATE INDEX IF NOT EXISTS idx_crm_new_services_code
ON crm.pricebook_new_services(tenant_id, code);

-- ============================================
-- 4. Add trigger for updated_at on service_edits
-- ============================================

CREATE OR REPLACE FUNCTION crm.update_service_edits_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_service_edits_modified ON crm.pricebook_service_edits;
CREATE TRIGGER update_service_edits_modified
  BEFORE UPDATE ON crm.pricebook_service_edits
  FOR EACH ROW
  EXECUTE FUNCTION crm.update_service_edits_modified_at();

-- ============================================
-- 5. Comments
-- ============================================

COMMENT ON TABLE crm.pricebook_service_edits IS 'Local edits to existing ServiceTitan services. Changes are staged here before being pushed to ST.';
COMMENT ON TABLE crm.pricebook_new_services IS 'Services created in CRM that do not yet exist in ServiceTitan. After push, st_id is populated and pushed_to_st is set to true.';

COMMENT ON COLUMN crm.pricebook_service_edits.sync_status IS 'pending = has unpushed changes, synced = in sync with ST, error = push failed';
COMMENT ON COLUMN crm.pricebook_service_edits.warranty_text IS 'Plain text warranty from UI, converted to JSON when pushed to ST';
