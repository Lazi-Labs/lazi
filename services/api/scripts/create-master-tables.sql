-- ═══════════════════════════════════════════════════════════════
-- LAZI Pricebook - Master Tables Setup
-- Three-tier architecture: raw → master → crm
-- ═══════════════════════════════════════════════════════════════

-- Create master schema if not exists
CREATE SCHEMA IF NOT EXISTS master;
CREATE SCHEMA IF NOT EXISTS crm;

-- ═══════════════════════════════════════════════════════════════
-- MASTER.PRICEBOOK_SERVICES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS master.pricebook_services (
  id SERIAL PRIMARY KEY,
  st_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- Core fields
  name VARCHAR(500) NOT NULL,
  description TEXT,
  code VARCHAR(100),
  sku VARCHAR(100),
  active BOOLEAN DEFAULT true,
  
  -- Pricing
  price DECIMAL(12, 2),
  cost DECIMAL(12, 2),
  unit_of_measure VARCHAR(50),
  is_taxable BOOLEAN DEFAULT true,
  
  -- Categorization
  category_st_id BIGINT,
  category_name VARCHAR(500),
  service_type VARCHAR(100),
  
  -- Image (S3 after migration)
  image_url TEXT,
  image_path VARCHAR(500),
  image_migrated_at TIMESTAMPTZ,
  
  -- Business Units
  business_unit_ids JSONB DEFAULT '[]',
  
  -- Warranty
  warranty_duration INTEGER,
  warranty_duration_unit VARCHAR(50),
  
  -- Display
  sort_order INTEGER DEFAULT 0,
  is_visible_crm BOOLEAN DEFAULT true,
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_id, tenant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_master_services_tenant ON master.pricebook_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_master_services_category ON master.pricebook_services(category_st_id);
CREATE INDEX IF NOT EXISTS idx_master_services_active ON master.pricebook_services(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_master_services_search ON master.pricebook_services USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ═══════════════════════════════════════════════════════════════
-- MASTER.PRICEBOOK_MATERIALS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS master.pricebook_materials (
  id SERIAL PRIMARY KEY,
  st_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- Core fields
  name VARCHAR(500) NOT NULL,
  description TEXT,
  code VARCHAR(100),
  sku VARCHAR(100),
  active BOOLEAN DEFAULT true,
  
  -- Pricing
  price DECIMAL(12, 2),
  cost DECIMAL(12, 2),
  unit_of_measure VARCHAR(50),
  is_taxable BOOLEAN DEFAULT true,
  
  -- Categorization
  category_st_id BIGINT,
  category_name VARCHAR(500),
  
  -- Vendor
  vendor_st_id BIGINT,
  vendor_name VARCHAR(500),
  manufacturer VARCHAR(500),
  
  -- Image
  image_url TEXT,
  image_path VARCHAR(500),
  image_migrated_at TIMESTAMPTZ,
  
  -- Business Units
  business_unit_ids JSONB DEFAULT '[]',
  
  -- Display
  sort_order INTEGER DEFAULT 0,
  is_visible_crm BOOLEAN DEFAULT true,
  
  -- Sync
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_master_materials_tenant ON master.pricebook_materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_master_materials_category ON master.pricebook_materials(category_st_id);
CREATE INDEX IF NOT EXISTS idx_master_materials_active ON master.pricebook_materials(tenant_id, active);

-- ═══════════════════════════════════════════════════════════════
-- MASTER.PRICEBOOK_EQUIPMENT
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS master.pricebook_equipment (
  id SERIAL PRIMARY KEY,
  st_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- Core fields
  name VARCHAR(500) NOT NULL,
  description TEXT,
  code VARCHAR(100),
  sku VARCHAR(100),
  active BOOLEAN DEFAULT true,
  
  -- Pricing
  price DECIMAL(12, 2),
  cost DECIMAL(12, 2),
  unit_of_measure VARCHAR(50),
  is_taxable BOOLEAN DEFAULT true,
  
  -- Categorization
  category_st_id BIGINT,
  category_name VARCHAR(500),
  equipment_type VARCHAR(100),
  
  -- Vendor
  vendor_st_id BIGINT,
  vendor_name VARCHAR(500),
  manufacturer VARCHAR(500),
  model VARCHAR(500),
  
  -- Image
  image_url TEXT,
  image_path VARCHAR(500),
  image_migrated_at TIMESTAMPTZ,
  
  -- Business Units
  business_unit_ids JSONB DEFAULT '[]',
  
  -- Display
  sort_order INTEGER DEFAULT 0,
  is_visible_crm BOOLEAN DEFAULT true,
  
  -- Sync
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_master_equipment_tenant ON master.pricebook_equipment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_master_equipment_active ON master.pricebook_equipment(tenant_id, active);

-- ═══════════════════════════════════════════════════════════════
-- CRM.PRICEBOOK_OVERRIDES (Unified for all types)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm.pricebook_overrides (
  id SERIAL PRIMARY KEY,
  st_pricebook_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(50) NOT NULL,  -- 'service', 'material', 'equipment', 'category'
  
  -- Override values (NULL = use original)
  override_name VARCHAR(500),
  override_description TEXT,
  override_code VARCHAR(100),
  override_price DECIMAL(12, 2),
  override_cost DECIMAL(12, 2),
  override_active BOOLEAN,
  override_category_st_id BIGINT,
  override_sort_order INTEGER,
  override_business_unit_ids JSONB,
  
  -- Custom image (uploaded by user)
  override_image_url TEXT,
  
  -- Internal CRM fields (not synced to ST)
  internal_notes TEXT,
  custom_tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  
  -- Sync status
  pending_sync BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_pricebook_id, tenant_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_crm_overrides_pending 
ON crm.pricebook_overrides(tenant_id, pending_sync) 
WHERE pending_sync = true;

CREATE INDEX IF NOT EXISTS idx_crm_overrides_type 
ON crm.pricebook_overrides(tenant_id, item_type);
