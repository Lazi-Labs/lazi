-- Create CRM schema if not exists
CREATE SCHEMA IF NOT EXISTS crm;

-- Service Edits Table
CREATE TABLE IF NOT EXISTS crm.pricebook_service_edits (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  st_id BIGINT NOT NULL,
  name TEXT,
  display_name TEXT,
  description TEXT,
  price DECIMAL(12,2),
  member_price DECIMAL(12,2),
  cost DECIMAL(12,2),
  hours DECIMAL(10,2),
  warranty TEXT,
  custom_image_url TEXT,
  image_deleted BOOLEAN DEFAULT FALSE,
  edited_by TEXT,
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  pushed_to_st BOOLEAN DEFAULT FALSE,
  pushed_at TIMESTAMPTZ,
  CONSTRAINT service_edits_tenant_st UNIQUE (tenant_id, st_id)
);

CREATE INDEX IF NOT EXISTS idx_service_edits_tenant ON crm.pricebook_service_edits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_edits_st_id ON crm.pricebook_service_edits(st_id);
CREATE INDEX IF NOT EXISTS idx_service_edits_not_pushed ON crm.pricebook_service_edits(tenant_id) WHERE pushed_to_st = FALSE;

-- Material Edits Table
CREATE TABLE IF NOT EXISTS crm.pricebook_material_edits (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  st_id BIGINT NOT NULL,
  name TEXT,
  display_name TEXT,
  description TEXT,
  cost DECIMAL(12,4),
  price DECIMAL(12,2),
  custom_image_url TEXT,
  image_deleted BOOLEAN DEFAULT FALSE,
  edited_by TEXT,
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  pushed_to_st BOOLEAN DEFAULT FALSE,
  pushed_at TIMESTAMPTZ,
  CONSTRAINT material_edits_tenant_st UNIQUE (tenant_id, st_id)
);

CREATE INDEX IF NOT EXISTS idx_material_edits_tenant ON crm.pricebook_material_edits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_material_edits_st_id ON crm.pricebook_material_edits(st_id);

-- Equipment Edits Table
CREATE TABLE IF NOT EXISTS crm.pricebook_equipment_edits (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  st_id BIGINT NOT NULL,
  name TEXT,
  display_name TEXT,
  description TEXT,
  cost DECIMAL(12,2),
  price DECIMAL(12,2),
  custom_image_url TEXT,
  image_deleted BOOLEAN DEFAULT FALSE,
  edited_by TEXT,
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  pushed_to_st BOOLEAN DEFAULT FALSE,
  pushed_at TIMESTAMPTZ,
  CONSTRAINT equipment_edits_tenant_st UNIQUE (tenant_id, st_id)
);

CREATE INDEX IF NOT EXISTS idx_equipment_edits_tenant ON crm.pricebook_equipment_edits(tenant_id);

-- Category Edits Table
CREATE TABLE IF NOT EXISTS crm.pricebook_category_edits (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  st_id BIGINT NOT NULL,
  name TEXT,
  display_name TEXT,
  description TEXT,
  custom_image_url TEXT,
  image_deleted BOOLEAN DEFAULT FALSE,
  edited_by TEXT,
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  pushed_to_st BOOLEAN DEFAULT FALSE,
  pushed_at TIMESTAMPTZ,
  CONSTRAINT category_edits_tenant_st UNIQUE (tenant_id, st_id)
);

CREATE INDEX IF NOT EXISTS idx_category_edits_tenant ON crm.pricebook_category_edits(tenant_id);
