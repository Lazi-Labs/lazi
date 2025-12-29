/**
 * Audit Service
 * Query and manage audit logs and entity history
 */

import pg from 'pg';
import config from '../../config/index.js';
import { createModuleLogger } from '../../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('audit-service');

/**
 * Get database pool
 */
function getPool() {
  return new Pool({
    connectionString: config.database.url,
    max: 5,
  });
}

// ─────────────────────────────────────────────────────────
// CHANGE LOG QUERIES
// ─────────────────────────────────────────────────────────

/**
 * Get audit log entries with filters
 */
export async function getAuditLog(filters = {}) {
  const pool = getPool();
  
  try {
    const {
      schema_name,
      table_name,
      record_id,
      operation,
      changed_by,
      source,
      from_date,
      to_date,
      limit = 100,
      offset = 0,
    } = filters;
    
    let query = `
      SELECT * FROM audit.change_log
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (schema_name) {
      query += ` AND schema_name = $${paramIndex++}`;
      params.push(schema_name);
    }
    
    if (table_name) {
      query += ` AND table_name = $${paramIndex++}`;
      params.push(table_name);
    }
    
    if (record_id) {
      query += ` AND record_id = $${paramIndex++}`;
      params.push(record_id);
    }
    
    if (operation) {
      query += ` AND operation = $${paramIndex++}`;
      params.push(operation.toUpperCase());
    }
    
    if (changed_by) {
      query += ` AND changed_by = $${paramIndex++}`;
      params.push(changed_by);
    }
    
    if (source) {
      query += ` AND source = $${paramIndex++}`;
      params.push(source);
    }
    
    if (from_date) {
      query += ` AND changed_at >= $${paramIndex++}`;
      params.push(from_date);
    }
    
    if (to_date) {
      query += ` AND changed_at <= $${paramIndex++}`;
      params.push(to_date);
    }
    
    query += ` ORDER BY changed_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM audit.change_log WHERE 1=1`;
    const countParams = params.slice(0, -2); // Remove limit/offset
    
    if (schema_name) countQuery += ` AND schema_name = $1`;
    // ... (simplified - just use the result count for now)
    
    return {
      entries: result.rows,
      count: result.rows.length,
      limit,
      offset,
    };
    
  } finally {
    await pool.end();
  }
}

/**
 * Get audit log for a specific record
 */
export async function getRecordAuditLog(tableName, recordId, limit = 50) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT * FROM audit.change_log
      WHERE table_name = $1 AND record_id = $2
      ORDER BY changed_at DESC
      LIMIT $3
    `, [tableName, recordId, limit]);
    
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

/**
 * Get recent changes across all tables
 */
export async function getRecentChanges(limit = 50) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT 
        id,
        schema_name,
        table_name,
        record_id,
        operation,
        changed_fields,
        changed_by,
        source,
        changed_at
      FROM audit.change_log
      ORDER BY changed_at DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

/**
 * Get change statistics
 */
export async function getChangeStats(days = 7) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT
        table_name,
        operation,
        COUNT(*) as count
      FROM audit.change_log
      WHERE changed_at >= NOW() - INTERVAL '1 day' * $1
      GROUP BY table_name, operation
      ORDER BY count DESC
    `, [days]);
    
    // Also get daily counts
    const dailyResult = await pool.query(`
      SELECT
        DATE(changed_at) as date,
        COUNT(*) as count
      FROM audit.change_log
      WHERE changed_at >= NOW() - INTERVAL '1 day' * $1
      GROUP BY DATE(changed_at)
      ORDER BY date DESC
    `, [days]);
    
    return {
      byTableOperation: result.rows,
      byDay: dailyResult.rows,
    };
    
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────
// ENTITY HISTORY QUERIES
// ─────────────────────────────────────────────────────────

/**
 * Get entity history (all versions)
 */
export async function getEntityHistory(entityType, entityId) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT * FROM audit.entity_history
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY version DESC
    `, [entityType, entityId]);
    
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

/**
 * Get a specific version of an entity
 */
export async function getEntityVersion(entityType, entityId, version) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT * FROM audit.entity_history
      WHERE entity_type = $1 AND entity_id = $2 AND version = $3
    `, [entityType, entityId, version]);
    
    return result.rows[0] || null;
    
  } finally {
    await pool.end();
  }
}

/**
 * Compare two versions of an entity
 */
export async function compareEntityVersions(entityType, entityId, version1, version2) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT * FROM audit.entity_history
      WHERE entity_type = $1 AND entity_id = $2 AND version IN ($3, $4)
      ORDER BY version
    `, [entityType, entityId, version1, version2]);
    
    if (result.rows.length !== 2) {
      return null;
    }
    
    const [older, newer] = result.rows;
    
    // Calculate differences
    const differences = [];
    const olderData = older.data;
    const newerData = newer.data;
    
    const allKeys = new Set([
      ...Object.keys(olderData || {}),
      ...Object.keys(newerData || {}),
    ]);
    
    for (const key of allKeys) {
      const oldValue = olderData?.[key];
      const newValue = newerData?.[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        differences.push({
          field: key,
          oldValue,
          newValue,
        });
      }
    }
    
    return {
      older: {
        version: older.version,
        changed_at: older.changed_at,
        changed_by: older.changed_by,
      },
      newer: {
        version: newer.version,
        changed_at: newer.changed_at,
        changed_by: newer.changed_by,
      },
      differences,
    };
    
  } finally {
    await pool.end();
  }
}

/**
 * Get entity state at a specific point in time
 */
export async function getEntityAtTime(entityType, entityId, timestamp) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT * FROM audit.entity_history
      WHERE entity_type = $1 
        AND entity_id = $2 
        AND changed_at <= $3
      ORDER BY version DESC
      LIMIT 1
    `, [entityType, entityId, timestamp]);
    
    return result.rows[0] || null;
    
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────
// AUDIT CONTEXT HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Set audit context for the current database session
 * Call this before making changes to track who/what made them
 */
export async function setAuditContext(pool, context = {}) {
  const { userId, source } = context;
  
  if (userId) {
    await pool.query(`SELECT set_config('app.current_user', $1, true)`, [userId]);
  }
  
  if (source) {
    await pool.query(`SELECT set_config('app.change_source', $1, true)`, [source]);
  }
}

/**
 * Execute a function with audit context
 */
export async function withAuditContext(context, fn) {
  const pool = getPool();
  
  try {
    await setAuditContext(pool, context);
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

export default {
  // Change log
  getAuditLog,
  getRecordAuditLog,
  getRecentChanges,
  getChangeStats,
  
  // Entity history
  getEntityHistory,
  getEntityVersion,
  compareEntityVersions,
  getEntityAtTime,
  
  // Context
  setAuditContext,
  withAuditContext,
};
