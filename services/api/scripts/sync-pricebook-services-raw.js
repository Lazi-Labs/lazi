#!/usr/bin/env node
/**
 * Sync Pricebook Services to Raw Table
 * Fetches services from ServiceTitan API and inserts into raw.st_pricebook_services
 */

import { stRequest } from '../src/services/stClient.js';
import pg from 'pg';
import config from '../src/config/index.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.database.url,
  max: 5,
});

const TENANT_ID = config.serviceTitan.tenantId;

async function fetchAllServices() {
  const allServices = [];
  let page = 1;
  let hasMore = true;
  const pageSize = 1000;

  console.log('Fetching services from ServiceTitan API...');

  while (hasMore) {
    try {
      const url = `https://api.servicetitan.io/pricebook/v2/tenant/${TENANT_ID}/services`;
      
      const response = await stRequest(url, {
        method: 'GET',
        query: {
          page,
          pageSize,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.status}`);
      }

      const data = response.data;
      const services = data.data || [];
      
      allServices.push(...services);

      console.log(`  Page ${page}: fetched ${services.length} services (total: ${allServices.length})`);

      hasMore = data.hasMore || false;
      page++;

      // Rate limiting delay
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      throw error;
    }
  }

  console.log(`\nTotal services fetched: ${allServices.length}`);
  return allServices;
}

async function insertServicesIntoRaw(services) {
  console.log('\nInserting services into raw.st_pricebook_services...');
  
  let inserted = 0;
  let updated = 0;
  
  for (const service of services) {
    try {
      // Prepare data for insertion (matching actual schema)
      const data = {
        st_id: service.id,
        tenant_id: TENANT_ID,
        code: service.code || null,
        display_name: service.displayName || service.name || null,
        description: service.description || null,
        price: service.price || 0,
        member_price: service.memberPrice || 0,
        add_on_price: service.addOnPrice || 0,
        hours: service.hours || 0,
        active: service.active !== false,
        taxable: service.taxable !== false,
        categories: JSON.stringify(service.categories || []),
        service_materials: JSON.stringify(service.serviceMaterials || []),
        service_equipment: JSON.stringify(service.serviceEquipment || []),
        recommendations: JSON.stringify(service.recommendations || []),
        created_on: service.createdOn || null,
        modified_on: service.modifiedOn || null,
        full_data: JSON.stringify(service),
        fetched_at: new Date(),
      };

      // Upsert into raw table
      const result = await pool.query(`
        INSERT INTO raw.st_pricebook_services (
          st_id, tenant_id, code, display_name, description, price, member_price, add_on_price,
          hours, active, taxable, categories, service_materials, service_equipment,
          recommendations, created_on, modified_on, full_data, fetched_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb,
          $15::jsonb, $16, $17, $18::jsonb, $19
        )
        ON CONFLICT (st_id) DO UPDATE SET
          code = EXCLUDED.code,
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          member_price = EXCLUDED.member_price,
          add_on_price = EXCLUDED.add_on_price,
          hours = EXCLUDED.hours,
          active = EXCLUDED.active,
          taxable = EXCLUDED.taxable,
          categories = EXCLUDED.categories,
          service_materials = EXCLUDED.service_materials,
          service_equipment = EXCLUDED.service_equipment,
          recommendations = EXCLUDED.recommendations,
          modified_on = EXCLUDED.modified_on,
          full_data = EXCLUDED.full_data,
          fetched_at = EXCLUDED.fetched_at
        RETURNING (xmax = 0) AS inserted
      `, [
        data.st_id, data.tenant_id, data.code, data.display_name, data.description, data.price,
        data.member_price, data.add_on_price, data.hours, data.active, data.taxable,
        data.categories, data.service_materials, data.service_equipment,
        data.recommendations, data.created_on, data.modified_on, data.full_data,
        data.fetched_at
      ]);

      if (result.rows[0].inserted) {
        inserted++;
      } else {
        updated++;
      }

      if ((inserted + updated) % 100 === 0) {
        console.log(`  Progress: ${inserted + updated}/${services.length}`);
      }
    } catch (error) {
      console.error(`Error inserting service ${service.id}:`, error.message);
    }
  }

  console.log(`\nInserted: ${inserted}, Updated: ${updated}`);
  return { inserted, updated };
}

async function main() {
  console.log('═'.repeat(60));
  console.log('SYNC PRICEBOOK SERVICES TO RAW TABLE');
  console.log('═'.repeat(60));
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful\n');

    // Fetch services from ServiceTitan
    const services = await fetchAllServices();

    // Insert into raw table
    const results = await insertServicesIntoRaw(services);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(60));
    console.log('SYNC COMPLETE');
    console.log('═'.repeat(60));
    console.log(`Total Services: ${services.length}`);
    console.log(`Inserted:       ${results.inserted}`);
    console.log(`Updated:        ${results.updated}`);
    console.log(`Duration:       ${duration}s`);
    console.log(`Completed:      ${new Date().toISOString()}`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
