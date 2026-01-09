-- ============================================
-- Equipment CRUD & CRM Tables Migration
-- Migration: 031_equipment_crud.sql
-- Date: 2025-01-09
-- Purpose: Add equipment CRM tables and missing ST fields for equipment CRUD + Push
-- ============================================

-- ============================================
-- 1. Add missing columns to master.pricebook_equipment
-- ============================================

ALTER TABLE master.pricebook_equipment 
  ADD COLUMN IF NOT EXISTS add_on_member_price DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hours DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_bonus DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pays_commission BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deduct_as_job_cost BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS chargeable_by_default BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS cost_of_sale_account VARCHAR(100),
  ADD COLUMN IF NOT EXISTS asset_account VARCHAR(100),
  ADD COLUMN IF NOT EXISTS income_account VARCHAR(100),
  ADD COLUMN IF NOT EXISTS business_unit_id BIGINT,
  ADD COLUMN IF NOT EXISTS general_ledger_account_id BIGINT,
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS default_asset_url TEXT,
  ADD COLUMN IF NOT EXISTS pending_images JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS images_to_delete JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS created_by_id BIGINT;

-- ============================================
-- 2. Add equipment-specific override columns to crm.pricebook_overrides
-- ============================================

-- Equipment-specific overrides (manufacturer, model, warranty)
ALTER TABLE crm.pricebook_overrides
  ADD COLUMN IF NOT EXISTS override_manufacturer VARCHAR(255),
  ADD COLUMN IF NOT EXISTS override_model VARCHAR(255),
  ADD COLUMN IF NOT EXISTS override_manufacturer_warranty JSONB,
  ADD COLUMN IF NOT EXISTS override_service_warranty JSONB;

-- ============================================
-- 3. Create table for NEW equipment (not yet in ST)
-- ============================================

CREATE TABLE IF NOT EXISTS crm.pricebook_new_equipment (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- Core Identity
  code VARCHAR(100) NOT NULL,
  display_name VARCHAR(500),
  description TEXT NOT NULL,
  
  -- Product Details
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  
  -- Pricing
  cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  member_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  add_on_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  add_on_member_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Labor & Commission
  hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  bonus DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission_bonus DECIMAL(8,2) NOT NULL DEFAULT 0,
  pays_commission BOOLEAN NOT NULL DEFAULT false,
  deduct_as_job_cost BOOLEAN NOT NULL DEFAULT false,
  
  -- Flags
  active BOOLEAN NOT NULL DEFAULT true,
  taxable BOOLEAN DEFAULT true,
  chargeable_by_default BOOLEAN NOT NULL DEFAULT true,
  
  -- Accounting
  account VARCHAR(100),
  cost_of_sale_account VARCHAR(100),
  asset_account VARCHAR(100),
  income_account VARCHAR(100),
  business_unit_id BIGINT,
  general_ledger_account_id BIGINT,
  
  -- Categories (array of ST category IDs)
  categories JSONB NOT NULL DEFAULT '[]',
  
  -- Warranty
  manufacturer_warranty JSONB,
  service_warranty JSONB,
  
  -- Vendors
  primary_vendor JSONB,
  other_vendors JSONB DEFAULT '[]',
  
  -- Assets/Images
  assets JSONB DEFAULT '[]',
  s3_image_url TEXT,
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

-- Create indexes for new equipment table
CREATE INDEX IF NOT EXISTS idx_crm_new_equipment_tenant 
ON crm.pricebook_new_equipment(tenant_id);

CREATE INDEX IF NOT EXISTS idx_crm_new_equipment_pending 
ON crm.pricebook_new_equipment(tenant_id, pushed_to_st) 
WHERE pushed_to_st = false;

CREATE INDEX IF NOT EXISTS idx_crm_new_equipment_code
ON crm.pricebook_new_equipment(tenant_id, code);

-- ============================================
-- 4. Add comments
-- ============================================

COMMENT ON TABLE crm.pricebook_new_equipment IS 'Equipment created in CRM that do not yet exist in ServiceTitan. After push, st_id is populated and pushed_to_st is set to true.';

COMMENT ON COLUMN master.pricebook_equipment.add_on_member_price IS 'Add-on member price from ServiceTitan';
COMMENT ON COLUMN master.pricebook_equipment.hours IS 'Estimated labor hours';
COMMENT ON COLUMN master.pricebook_equipment.bonus IS 'Flat rate bonus amount';
COMMENT ON COLUMN master.pricebook_equipment.commission_bonus IS 'Commission bonus percentage';
COMMENT ON COLUMN master.pricebook_equipment.pays_commission IS 'Whether this equipment pays commission';
COMMENT ON COLUMN master.pricebook_equipment.deduct_as_job_cost IS 'Whether to deduct as job cost';
COMMENT ON COLUMN master.pricebook_equipment.chargeable_by_default IS 'Whether chargeable by default';
