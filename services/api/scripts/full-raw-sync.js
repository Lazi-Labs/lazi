#!/usr/bin/env node

/**
 * Full Raw Sync Script
 * 
 * Uses existing fetchers to populate ALL raw.st_* tables
 * with complete data from ServiceTitan API.
 * 
 * Usage: node scripts/full-raw-sync.js
 */

import { syncAllRaw } from '../src/workers/servicetitan-sync/fetchers/index.js';
import pg from 'pg';
import config from '../src/config/index.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.database.url,
  max: 5,
});

async function updateSyncState(tableName, status, recordCount = 0, error = null) {
  try {
    await pool.query(`
      UPDATE raw.sync_state 
      SET sync_status = $1,
          records_count = $2,
          last_full_sync = CASE WHEN $1 = 'completed' THEN NOW() ELSE last_full_sync END,
          last_error = $3,
          updated_at = NOW()
      WHERE table_name = $4
    `, [status, recordCount, error, tableName]);
  } catch (err) {
    console.error(`Failed to update sync state for ${tableName}:`, err.message);
  }
}

async function getTableCount(tableName) {
  // Convert raw_st_* to raw.st_* for query
  const schemaTable = tableName.startsWith('raw_st_') 
    ? `raw.st_${tableName.replace('raw_st_', '')}` 
    : tableName;
  
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM ${schemaTable}`);
    return parseInt(result.rows[0].count);
  } catch (err) {
    console.error(`Error counting ${schemaTable}:`, err.message);
    return 0;
  }
}

async function main() {
  console.log('═'.repeat(80));
  console.log('SERVICETITAN FULL RAW DATA SYNC');
  console.log('═'.repeat(80));
  console.log(`Started: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  try {
    // Run the existing syncAllRaw function
    console.log('Running syncAllRaw({ includePricebook: true })...\n');
    const results = await syncAllRaw({ includePricebook: true });

    console.log('\nSync results:', JSON.stringify(results, null, 2));

    // Verify and log results
    console.log('\n' + '─'.repeat(60));
    console.log('VERIFICATION - Record counts per table:');
    console.log('─'.repeat(60));

    const tables = [
      'raw_st_customers',
      'raw_st_customer_contacts', 
      'raw_st_locations',
      'raw_st_location_contacts',
      'raw_st_jobs',
      'raw_st_appointments',
      'raw_st_job_types',
      'raw_st_invoices',
      'raw_st_payments',
      'raw_st_technicians',
      'raw_st_employees',
      'raw_st_business_units',
      'raw_st_tag_types',
      'raw_st_appointment_assignments',
      'raw_st_teams',
      'raw_st_zones',
      'raw_st_campaigns',
      'raw_st_installed_equipment',
      'raw_st_estimates',
      'raw_st_pricebook_materials',
      'raw_st_pricebook_services',
      'raw_st_pricebook_equipment',
      'raw_st_pricebook_categories'
    ];

    let totalRecords = 0;
    const tableResults = [];

    for (const table of tables) {
      try {
        const count = await getTableCount(table);
        const status = count > 0 ? '✅' : '⚠️';
        console.log(`${status} ${table.padEnd(35)} ${count.toString().padStart(8)} records`);
        await updateSyncState(table, count > 0 ? 'completed' : 'empty', count);
        totalRecords += count;
        tableResults.push({ table, count, status: count > 0 ? 'success' : 'empty' });
      } catch (err) {
        console.log(`❌ ${table.padEnd(35)} ERROR: ${err.message}`);
        await updateSyncState(table, 'error', 0, err.message);
        tableResults.push({ table, count: 0, status: 'error', error: err.message });
      }
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    console.log('\n' + '═'.repeat(80));
    console.log('SYNC SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Records:    ${totalRecords.toLocaleString()}`);
    console.log(`Tables Populated: ${tableResults.filter(r => r.count > 0).length}/${tables.length}`);
    console.log(`Duration:         ${duration} minutes`);
    console.log(`Completed:        ${new Date().toISOString()}`);
    console.log('═'.repeat(80));

    // Check for tables with 0 records
    const emptyTables = tableResults.filter(r => r.count === 0);
    if (emptyTables.length > 0) {
      console.log('\n⚠️  TABLES WITH NO DATA:');
      emptyTables.forEach(t => console.log(`   - ${t.table}`));
      console.log('\nThese may need fetchers created or API access enabled.');
    }

  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
