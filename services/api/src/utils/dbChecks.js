/**
 * Database Health Check Utilities
 * Helpers for checking database state and sync status
 */

import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

function getPool() {
  const connectionString = config.database.url;
  return new Pool({
    connectionString,
    max: 10,
    ssl: connectionString?.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
}

/**
 * Check if a table exists before querying
 */
export async function tableExists(schema, tableName) {
  const pool = getPool();
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = $2
      )
    `, [schema, tableName]);
    return result.rows[0].exists;
  } finally {
    await pool.end();
  }
}

/**
 * Check if unique constraint exists
 */
export async function constraintExists(tableName, constraintName) {
  const pool = getPool();
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_constraint 
        WHERE conrelid = $1::regclass AND conname = $2
      )
    `, [tableName, constraintName]);
    return result.rows[0].exists;
  } finally {
    await pool.end();
  }
}

/**
 * Get row counts for sync status
 */
export async function getSyncStatus(tenantId) {
  const pool = getPool();
  try {
    const queries = [
      { name: 'raw_services', query: 'SELECT COUNT(*) FROM raw.st_pricebook_services WHERE tenant_id = $1' },
      { name: 'master_services', query: 'SELECT COUNT(*) FROM master.pricebook_services WHERE tenant_id = $1' },
      { name: 'raw_materials', query: 'SELECT COUNT(*) FROM raw.st_pricebook_materials WHERE tenant_id = $1' },
      { name: 'master_materials', query: 'SELECT COUNT(*) FROM master.pricebook_materials WHERE tenant_id = $1' },
      { name: 'raw_equipment', query: 'SELECT COUNT(*) FROM raw.st_pricebook_equipment WHERE tenant_id = $1' },
      { name: 'master_equipment', query: 'SELECT COUNT(*) FROM master.pricebook_equipment WHERE tenant_id = $1' },
      { name: 'raw_categories', query: 'SELECT COUNT(*) FROM raw.st_pricebook_categories WHERE tenant_id = $1' },
      { name: 'master_categories', query: 'SELECT COUNT(*) FROM master.pricebook_categories WHERE tenant_id = $1' },
    ];
    
    const results = {};
    for (const q of queries) {
      try {
        const result = await pool.query(q.query, [tenantId]);
        results[q.name] = parseInt(result.rows[0].count);
      } catch (e) {
        results[q.name] = `ERROR: ${e.message}`;
      }
    }
    return results;
  } finally {
    await pool.end();
  }
}

/**
 * Ensure unique constraint exists on a table
 */
export async function ensureUniqueConstraint(tableName, columns, constraintName) {
  const pool = getPool();
  try {
    const exists = await constraintExists(tableName, constraintName);
    if (!exists) {
      await pool.query(`
        ALTER TABLE ${tableName} 
        ADD CONSTRAINT ${constraintName} 
        UNIQUE (${columns.join(', ')})
      `);
      return { created: true, message: `Created constraint ${constraintName}` };
    }
    return { created: false, message: `Constraint ${constraintName} already exists` };
  } finally {
    await pool.end();
  }
}

export default {
  tableExists,
  constraintExists,
  getSyncStatus,
  ensureUniqueConstraint,
};
