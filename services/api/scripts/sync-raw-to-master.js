#!/usr/bin/env node
/**
 * Sync Raw Tables to Master Tables
 * 
 * Populates master.pricebook_* tables from raw.st_pricebook_* tables.
 * Run this after initial ST sync or whenever raw data is updated.
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

// Fix DATABASE_URL if it has invalid sslmode
let dbUrl = process.env.DATABASE_URL;
if (dbUrl?.includes('sslmode=no-verify')) {
  dbUrl = dbUrl.replace('sslmode=no-verify', 'sslmode=require');
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl?.includes('supabase') ? { rejectUnauthorized: false } : false,
});

const TENANT_ID = process.env.SERVICE_TITAN_TENANT_ID || '3222348440';

async function syncServices() {
  console.log('Syncing services...');
  
  const result = await pool.query(`
    INSERT INTO master.pricebook_services (
      st_id, tenant_id, code, name, display_name, description,
      price, member_price, add_on_price, cost, active, taxable, hours,
      category_st_id, categories,
      service_materials, service_equipment, recommendations,
      st_created_on, st_modified_on,
      last_synced_at
    )
    SELECT 
      r.st_id,
      r.tenant_id::VARCHAR,
      r.code,
      r.display_name,
      r.display_name,
      r.description,
      r.price,
      r.member_price,
      r.add_on_price,
      r.price * 0.5,
      COALESCE(r.active, true),
      COALESCE(r.taxable, true),
      r.hours,
      (r.categories->0->>'id')::BIGINT,
      r.categories,
      r.service_materials,
      r.service_equipment,
      r.recommendations,
      r.created_on,
      r.modified_on,
      NOW()
    FROM raw.st_pricebook_services r
    WHERE r.tenant_id = $1
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      display_name = EXCLUDED.display_name,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      member_price = EXCLUDED.member_price,
      add_on_price = EXCLUDED.add_on_price,
      active = EXCLUDED.active,
      taxable = EXCLUDED.taxable,
      hours = EXCLUDED.hours,
      category_st_id = EXCLUDED.category_st_id,
      categories = EXCLUDED.categories,
      service_materials = EXCLUDED.service_materials,
      service_equipment = EXCLUDED.service_equipment,
      last_synced_at = NOW(),
      updated_at = NOW()
  `, [TENANT_ID]);

  console.log(`✓ Services synced: ${result.rowCount} rows`);
  return result.rowCount;
}

async function syncMaterials() {
  console.log('Syncing materials...');
  
  const result = await pool.query(`
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
    WHERE r.tenant_id = $1
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
      updated_at = NOW()
  `, [TENANT_ID]);

  console.log(`✓ Materials synced: ${result.rowCount} rows`);
  return result.rowCount;
}

async function syncEquipment() {
  console.log('Syncing equipment...');
  
  const result = await pool.query(`
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
    WHERE r.tenant_id = $1
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      image_url = COALESCE(EXCLUDED.image_url, master.pricebook_equipment.image_url),
      last_synced_at = NOW(),
      updated_at = NOW()
  `, [TENANT_ID]);

  console.log(`✓ Equipment synced: ${result.rowCount} rows`);
  return result.rowCount;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Syncing Raw → Master Tables');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log('');

  try {
    const counts = {
      services: await syncServices(),
      materials: 0, // await syncMaterials(),
      equipment: 0, // await syncEquipment(),
    };

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Sync Complete');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Summary:');
    console.log(`  Services:  ${counts.services} rows`);
    console.log(`  Materials: ${counts.materials} rows`);
    console.log(`  Equipment: ${counts.equipment} rows`);
    console.log('');

    // Show master table counts
    const summary = await pool.query(`
      SELECT 'services' as type, COUNT(*) as count FROM master.pricebook_services WHERE tenant_id = $1
      UNION ALL
      SELECT 'materials', COUNT(*) FROM master.pricebook_materials WHERE tenant_id = $1
      UNION ALL
      SELECT 'equipment', COUNT(*) FROM master.pricebook_equipment WHERE tenant_id = $1
    `, [TENANT_ID]);

    console.log('Master table totals:');
    summary.rows.forEach(row => {
      console.log(`  ${row.type.padEnd(10)}: ${row.count}`);
    });

  } catch (error) {
    console.error('');
    console.error('❌ Sync error:', error.message);
    console.error('');
    process.exit(1);
  }

  await pool.end();
}

main();
