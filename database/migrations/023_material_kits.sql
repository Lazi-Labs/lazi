-- ============================================
-- Material Kits Schema Migration
-- Migration: 023_material_kits.sql
-- Date: 2025-01-01
-- Purpose: Create tables for Material Kits feature (LAZI-only, no ServiceTitan sync)
-- ============================================

-- Material Kits are pre-configured bundles of materials that can be applied to services.
-- This is a LAZI-only feature - kits are stored locally and not synced to ServiceTitan.
-- When a kit is "applied" to a service, its materials are added to the service's material list.

-- ============================================
-- 1. Create material_kits table
-- ============================================

CREATE TABLE IF NOT EXISTS pricebook.material_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  
  -- Kit metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_path TEXT[], -- Array of category IDs for hierarchical filtering
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_material_kits_tenant 
ON pricebook.material_kits(tenant_id);

CREATE INDEX IF NOT EXISTS idx_material_kits_name 
ON pricebook.material_kits(tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_material_kits_category 
ON pricebook.material_kits USING GIN(category_path);

-- ============================================
-- 2. Create material_kit_groups table
-- ============================================

CREATE TABLE IF NOT EXISTS pricebook.material_kit_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES pricebook.material_kits(id) ON DELETE CASCADE,
  
  -- Group metadata
  name VARCHAR(255) NOT NULL,
  color VARCHAR(20) DEFAULT '#3B82F6',
  collapsed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_material_kit_groups_kit 
ON pricebook.material_kit_groups(kit_id);

-- ============================================
-- 3. Create material_kit_items table
-- ============================================

CREATE TABLE IF NOT EXISTS pricebook.material_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES pricebook.material_kits(id) ON DELETE CASCADE,
  group_id UUID REFERENCES pricebook.material_kit_groups(id) ON DELETE SET NULL,
  
  -- Material reference (from pricebook.pricebook_materials)
  material_id UUID NOT NULL,
  
  -- Item data
  quantity DECIMAL(12,4) NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_material_kit_items_kit 
ON pricebook.material_kit_items(kit_id);

CREATE INDEX IF NOT EXISTS idx_material_kit_items_group 
ON pricebook.material_kit_items(group_id);

CREATE INDEX IF NOT EXISTS idx_material_kit_items_material 
ON pricebook.material_kit_items(material_id);

-- ============================================
-- 4. Create material_kit_includes table (kit-to-kit references)
-- ============================================

CREATE TABLE IF NOT EXISTS pricebook.material_kit_includes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES pricebook.material_kits(id) ON DELETE CASCADE,
  included_kit_id UUID NOT NULL REFERENCES pricebook.material_kits(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent self-reference and duplicates
  CONSTRAINT no_self_include CHECK (kit_id != included_kit_id),
  UNIQUE(kit_id, included_kit_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_material_kit_includes_kit 
ON pricebook.material_kit_includes(kit_id);

CREATE INDEX IF NOT EXISTS idx_material_kit_includes_included 
ON pricebook.material_kit_includes(included_kit_id);

-- ============================================
-- 5. Add comments
-- ============================================

COMMENT ON TABLE pricebook.material_kits IS 'Pre-configured material bundles for quick service setup. LAZI-only feature, not synced to ServiceTitan.';
COMMENT ON TABLE pricebook.material_kit_groups IS 'Groups within a kit for organizing materials (e.g., "Wire Bundle", "Connectors")';
COMMENT ON TABLE pricebook.material_kit_items IS 'Individual materials within a kit with quantities';
COMMENT ON TABLE pricebook.material_kit_includes IS 'Kit-to-kit references allowing kits to include other kits';

COMMENT ON COLUMN pricebook.material_kits.category_path IS 'Hierarchical category path for filtering (e.g., {electrical, wiring, 20amp})';
COMMENT ON COLUMN pricebook.material_kit_groups.color IS 'Hex color for visual grouping in UI';
COMMENT ON COLUMN pricebook.material_kit_items.material_id IS 'References pricebook.pricebook_materials.id';

-- ============================================
-- 6. Create updated_at trigger function (if not exists)
-- ============================================

CREATE OR REPLACE FUNCTION pricebook.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_material_kits_updated_at ON pricebook.material_kits;
CREATE TRIGGER update_material_kits_updated_at
  BEFORE UPDATE ON pricebook.material_kits
  FOR EACH ROW EXECUTE FUNCTION pricebook.update_updated_at_column();

DROP TRIGGER IF EXISTS update_material_kit_groups_updated_at ON pricebook.material_kit_groups;
CREATE TRIGGER update_material_kit_groups_updated_at
  BEFORE UPDATE ON pricebook.material_kit_groups
  FOR EACH ROW EXECUTE FUNCTION pricebook.update_updated_at_column();

DROP TRIGGER IF EXISTS update_material_kit_items_updated_at ON pricebook.material_kit_items;
CREATE TRIGGER update_material_kit_items_updated_at
  BEFORE UPDATE ON pricebook.material_kit_items
  FOR EACH ROW EXECUTE FUNCTION pricebook.update_updated_at_column();
