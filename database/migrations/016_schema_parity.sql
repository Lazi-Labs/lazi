-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 016_schema_parity.sql
-- Purpose: Complete ServiceTitan schema parity for bidirectional sync
-- Date: 2025-12-30
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- MASTER.PRICEBOOK_MATERIALS - Add missing columns for full ST parity
-- ═══════════════════════════════════════════════════════════════════════════

-- Labor & Commission (required by ST, default 0)
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS hours DECIMAL(8,2) DEFAULT 0;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS commission_bonus DECIMAL(8,2) DEFAULT 0;

-- Timestamps
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS created_by_id BIGINT;

-- Assets
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS default_asset_url TEXT;

-- ═══════════════════════════════════════════════════════════════════════════
-- CRM.PRICEBOOK_OVERRIDES - Add missing override columns
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_taxable BOOLEAN;

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_business_unit_id BIGINT;

-- ═══════════════════════════════════════════════════════════════════════════
-- SYNC: Populate new columns from raw.full_data JSONB
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE master.pricebook_materials m
SET 
  hours = COALESCE((r.full_data->>'hours')::decimal, 0),
  commission_bonus = COALESCE((r.full_data->>'commissionBonus')::decimal, 0),
  created_by_id = (r.full_data->>'createdById')::bigint,
  default_asset_url = r.full_data->>'defaultAssetUrl',
  pays_commission = COALESCE((r.full_data->>'paysCommission')::boolean, false),
  deduct_as_job_cost = COALESCE((r.full_data->>'deductAsJobCost')::boolean, false),
  is_inventory = COALESCE((r.full_data->>'isInventory')::boolean, false),
  is_configurable_material = COALESCE((r.full_data->>'isConfigurableMaterial')::boolean, false),
  chargeable_by_default = COALESCE((r.full_data->>'chargeableByDefault')::boolean, true),
  display_in_amount = COALESCE((r.full_data->>'displayInAmount')::boolean, false),
  is_other_direct_cost = COALESCE((r.full_data->>'isOtherDirectCost')::boolean, false),
  cost_of_sale_account = r.full_data->>'costOfSaleAccount',
  asset_account = r.full_data->>'assetAccount',
  general_ledger_account_id = (r.full_data->>'generalLedgerAccountId')::bigint,
  updated_at = NOW()
FROM raw.st_pricebook_materials r
WHERE m.st_id = r.st_id AND m.tenant_id = r.tenant_id::text;

-- Analyze tables after changes
ANALYZE master.pricebook_materials;
ANALYZE crm.pricebook_overrides;
