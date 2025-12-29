-- Sync Raw → Master Tables
-- Run this to populate master tables from raw tables

\echo 'Syncing services...'
INSERT INTO master.pricebook_services (
  st_id, tenant_id, name, description, code, sku, active,
  price, cost, unit_of_measure, is_taxable,
  category_st_id, service_type,
  image_url, image_path, image_migrated_at,
  business_unit_ids, sort_order,
  last_synced_at
)
SELECT 
  r.st_id,
  r.tenant_id::VARCHAR,
  COALESCE(r.display_name, r.name),
  r.description,
  r.code,
  r.sku,
  COALESCE(r.active, true),
  r.price,
  r.cost,
  r.unit_of_measure,
  COALESCE(r.taxable, true),
  (r.categories->0->>'id')::BIGINT,
  r.service_type,
  r.s3_image_url,
  r.assets->0->>'url',
  r.image_migrated_at,
  COALESCE(r.business_unit_ids, '[]'::JSONB),
  COALESCE(r.sort_order, 0),
  NOW()
FROM raw.st_pricebook_services r
WHERE r.tenant_id = '3222348440'
ON CONFLICT (st_id, tenant_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  code = EXCLUDED.code,
  active = EXCLUDED.active,
  price = EXCLUDED.price,
  cost = EXCLUDED.cost,
  category_st_id = EXCLUDED.category_st_id,
  image_url = COALESCE(EXCLUDED.image_url, master.pricebook_services.image_url),
  business_unit_ids = EXCLUDED.business_unit_ids,
  last_synced_at = NOW(),
  updated_at = NOW();

\echo 'Syncing materials...'
INSERT INTO master.pricebook_materials (
  st_id, tenant_id, name, description, code, sku, active,
  price, cost, unit_of_measure, is_taxable,
  category_st_id, vendor_st_id, vendor_name, manufacturer,
  image_url, image_path, image_migrated_at,
  business_unit_ids, sort_order,
  last_synced_at
)
SELECT 
  r.st_id,
  r.tenant_id::VARCHAR,
  r.name,
  r.description,
  r.code,
  r.sku,
  COALESCE(r.active, true),
  r.price,
  r.cost,
  r.unit_of_measure,
  COALESCE(r.is_taxable, true),
  (r.categories->0->>'id')::BIGINT,
  r.vendor_id,
  r.vendor_name,
  r.manufacturer,
  r.s3_image_url,
  r.assets->0->>'url',
  r.image_migrated_at,
  COALESCE(r.business_unit_ids, '[]'::JSONB),
  COALESCE(r.sort_order, 0),
  NOW()
FROM raw.st_pricebook_materials r
WHERE r.tenant_id = '3222348440'
ON CONFLICT (st_id, tenant_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  cost = EXCLUDED.cost,
  category_st_id = EXCLUDED.category_st_id,
  vendor_st_id = EXCLUDED.vendor_st_id,
  vendor_name = EXCLUDED.vendor_name,
  image_url = COALESCE(EXCLUDED.image_url, master.pricebook_materials.image_url),
  last_synced_at = NOW(),
  updated_at = NOW();

\echo 'Syncing equipment...'
INSERT INTO master.pricebook_equipment (
  st_id, tenant_id, name, description, code, sku, active,
  price, cost, unit_of_measure, is_taxable,
  category_st_id, equipment_type,
  vendor_st_id, vendor_name, manufacturer, model,
  image_url, image_path, image_migrated_at,
  business_unit_ids, sort_order,
  last_synced_at
)
SELECT 
  r.st_id,
  r.tenant_id::VARCHAR,
  r.name,
  r.description,
  r.code,
  r.sku,
  COALESCE(r.active, true),
  r.price,
  r.cost,
  r.unit_of_measure,
  COALESCE(r.is_taxable, true),
  (r.categories->0->>'id')::BIGINT,
  r.equipment_type,
  r.vendor_id,
  r.vendor_name,
  r.manufacturer,
  r.model,
  r.s3_image_url,
  r.assets->0->>'url',
  r.image_migrated_at,
  COALESCE(r.business_unit_ids, '[]'::JSONB),
  COALESCE(r.sort_order, 0),
  NOW()
FROM raw.st_pricebook_equipment r
WHERE r.tenant_id = '3222348440'
ON CONFLICT (st_id, tenant_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = COALESCE(EXCLUDED.image_url, master.pricebook_equipment.image_url),
  last_synced_at = NOW(),
  updated_at = NOW();

\echo 'Sync complete!'
\echo ''
\echo 'Master table counts:'
SELECT 'services' as type, COUNT(*) as count FROM master.pricebook_services WHERE tenant_id = '3222348440'
UNION ALL
SELECT 'materials', COUNT(*) FROM master.pricebook_materials WHERE tenant_id = '3222348440'
UNION ALL
SELECT 'equipment', COUNT(*) FROM master.pricebook_equipment WHERE tenant_id = '3222348440';
