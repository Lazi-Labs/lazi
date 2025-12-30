-- ============================================
-- Materials ServiceTitan Fields Migration
-- Migration: 015_materials_st_fields.sql
-- Date: 2025-12-30
-- Purpose: Add missing ServiceTitan API fields for materials CRUD + Push
-- ============================================

-- ============================================
-- 1. Add missing columns to master.pricebook_materials
-- ============================================

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS add_on_member_price DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pays_commission BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deduct_as_job_cost BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_inventory BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_configurable_material BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_in_amount BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_other_direct_cost BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS chargeable_by_default BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS cost_of_sale_account VARCHAR(100),
  ADD COLUMN IF NOT EXISTS asset_account VARCHAR(100),
  ADD COLUMN IF NOT EXISTS business_unit_id BIGINT,
  ADD COLUMN IF NOT EXISTS general_ledger_account_id BIGINT,
  ADD COLUMN IF NOT EXISTS cost_type_id BIGINT,
  ADD COLUMN IF NOT EXISTS budget_cost_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS budget_cost_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- ============================================
-- 2. Add override columns to crm.pricebook_overrides
-- ============================================

-- Add tenant_id column if missing (needed for multi-tenant support)
ALTER TABLE crm.pricebook_overrides
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50);

-- Add active override
ALTER TABLE crm.pricebook_overrides
  ADD COLUMN IF NOT EXISTS override_active BOOLEAN;

-- Add image URL override
ALTER TABLE crm.pricebook_overrides
  ADD COLUMN IF NOT EXISTS override_image_url TEXT;

-- Add custom tags
ALTER TABLE crm.pricebook_overrides
  ADD COLUMN IF NOT EXISTS custom_tags JSONB DEFAULT '[]';

-- Add new ST field overrides
ALTER TABLE crm.pricebook_overrides
  ADD COLUMN IF NOT EXISTS override_member_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS override_add_on_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS override_add_on_member_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS override_hours DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS override_bonus DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS override_commission_bonus DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS override_pays_commission BOOLEAN,
  ADD COLUMN IF NOT EXISTS override_deduct_as_job_cost BOOLEAN,
  ADD COLUMN IF NOT EXISTS override_is_inventory BOOLEAN,
  ADD COLUMN IF NOT EXISTS override_unit_of_measure VARCHAR(50),
  ADD COLUMN IF NOT EXISTS override_chargeable_by_default BOOLEAN,
  ADD COLUMN IF NOT EXISTS override_primary_vendor JSONB,
  ADD COLUMN IF NOT EXISTS override_other_vendors JSONB,
  ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Drop old unique constraint and add new one with tenant_id
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pricebook_overrides_st_pricebook_id_item_type_key'
  ) THEN
    ALTER TABLE crm.pricebook_overrides 
      DROP CONSTRAINT pricebook_overrides_st_pricebook_id_item_type_key;
  END IF;
  
  -- Add new unique constraint with tenant_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pricebook_overrides_tenant_st_id_type_key'
  ) THEN
    ALTER TABLE crm.pricebook_overrides 
      ADD CONSTRAINT pricebook_overrides_tenant_st_id_type_key 
      UNIQUE (st_pricebook_id, tenant_id, item_type);
  END IF;
END $$;

-- Create index on tenant_id
CREATE INDEX IF NOT EXISTS idx_pricebook_overrides_tenant 
ON crm.pricebook_overrides(tenant_id);

-- Create index for pending sync items
CREATE INDEX IF NOT EXISTS idx_pricebook_overrides_pending 
ON crm.pricebook_overrides(tenant_id, item_type, pending_sync) 
WHERE pending_sync = true;

-- ============================================
-- 3. Create table for NEW materials (not yet in ST)
-- ============================================

CREATE TABLE IF NOT EXISTS crm.pricebook_new_materials (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- All ST required fields
  code VARCHAR(100) NOT NULL,
  display_name VARCHAR(500),
  description TEXT NOT NULL,
  cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  member_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  add_on_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  add_on_member_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  bonus DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission_bonus DECIMAL(8,2) NOT NULL DEFAULT 0,
  pays_commission BOOLEAN NOT NULL DEFAULT false,
  deduct_as_job_cost BOOLEAN NOT NULL DEFAULT false,
  is_inventory BOOLEAN NOT NULL DEFAULT false,
  is_configurable_material BOOLEAN NOT NULL DEFAULT false,
  display_in_amount BOOLEAN NOT NULL DEFAULT false,
  is_other_direct_cost BOOLEAN NOT NULL DEFAULT false,
  chargeable_by_default BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  taxable BOOLEAN DEFAULT true,
  
  -- Optional fields
  unit_of_measure VARCHAR(50),
  account VARCHAR(100),
  cost_of_sale_account VARCHAR(100),
  asset_account VARCHAR(100),
  business_unit_id BIGINT,
  general_ledger_account_id BIGINT,
  cost_type_id BIGINT,
  budget_cost_code VARCHAR(100),
  budget_cost_type VARCHAR(100),
  
  -- Categories (array of ST category IDs)
  categories JSONB NOT NULL DEFAULT '[]',
  
  -- Vendors
  primary_vendor JSONB,
  other_vendors JSONB DEFAULT '[]',
  
  -- Assets/Images
  assets JSONB DEFAULT '[]',
  s3_image_url TEXT,
  
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

-- Create indexes for new materials table
CREATE INDEX IF NOT EXISTS idx_crm_new_materials_tenant 
ON crm.pricebook_new_materials(tenant_id);

CREATE INDEX IF NOT EXISTS idx_crm_new_materials_pending 
ON crm.pricebook_new_materials(tenant_id, pushed_to_st) 
WHERE pushed_to_st = false;

CREATE INDEX IF NOT EXISTS idx_crm_new_materials_code
ON crm.pricebook_new_materials(tenant_id, code);

-- ============================================
-- 4. Add comments
-- ============================================

COMMENT ON TABLE crm.pricebook_new_materials IS 'Materials created in CRM that do not yet exist in ServiceTitan. After push, st_id is populated and pushed_to_st is set to true.';

COMMENT ON COLUMN master.pricebook_materials.add_on_member_price IS 'Add-on member price from ServiceTitan';
COMMENT ON COLUMN master.pricebook_materials.bonus IS 'Flat rate bonus amount';
COMMENT ON COLUMN master.pricebook_materials.pays_commission IS 'Whether this material pays commission';
COMMENT ON COLUMN master.pricebook_materials.deduct_as_job_cost IS 'Whether to deduct as job cost';
COMMENT ON COLUMN master.pricebook_materials.is_inventory IS 'Whether this material is tracked in inventory';
COMMENT ON COLUMN master.pricebook_materials.is_configurable_material IS 'Whether this is a configurable material';
COMMENT ON COLUMN master.pricebook_materials.display_in_amount IS 'Display in amount mode';
COMMENT ON COLUMN master.pricebook_materials.is_other_direct_cost IS 'Whether this is an other direct cost';
COMMENT ON COLUMN master.pricebook_materials.chargeable_by_default IS 'Whether chargeable by default';
