/**
 * Workflow Visualizer API Routes
 * Endpoints for workflow visualization and live data
 */

import { Router } from 'express';
import pg from 'pg';
import config from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('workflow-visualizer-routes');
const router = Router();

/**
 * GET /workflows/stats/schemas
 * Get row counts and stats for all schemas
 */
router.get('/stats/schemas', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const result = await pool.query(`
      SELECT 
        schemaname as schema,
        tablename as table,
        n_live_tup as row_count,
        last_vacuum,
        last_autovacuum,
        last_analyze
      FROM pg_stat_user_tables
      WHERE schemaname IN ('raw', 'master', 'crm', 'sync', 'audit', 'pricebook')
      ORDER BY schemaname, tablename
    `);
    
    const schemaStats = {};
    
    result.rows.forEach(row => {
      if (!schemaStats[row.schema]) {
        schemaStats[row.schema] = {
          rowCount: 0,
          tables: [],
          lastSync: null,
        };
      }
      
      schemaStats[row.schema].rowCount += parseInt(row.row_count) || 0;
      schemaStats[row.schema].tables.push({
        name: row.table,
        rowCount: parseInt(row.row_count) || 0,
      });
      
      const lastUpdate = row.last_analyze || row.last_autovacuum || row.last_vacuum;
      if (lastUpdate && (!schemaStats[row.schema].lastSync || lastUpdate > schemaStats[row.schema].lastSync)) {
        schemaStats[row.schema].lastSync = lastUpdate;
      }
    });
    
    res.json({
      success: true,
      data: schemaStats,
    });
    
  } catch (error) {
    logger.error('Failed to get schema stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

/**
 * GET /workflows/stats/tables/:schema
 * Get detailed stats for tables in a specific schema
 */
router.get('/stats/tables/:schema', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const { schema } = req.params;
    
    const validSchemas = ['raw', 'master', 'crm', 'sync', 'audit', 'pricebook'];
    if (!validSchemas.includes(schema)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid schema. Must be one of: ' + validSchemas.join(', ') 
      });
    }
    
    const result = await pool.query(`
      SELECT 
        tablename as table,
        n_live_tup as row_count,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = $1
      ORDER BY n_live_tup DESC
    `, [schema]);
    
    res.json({
      success: true,
      schema,
      tables: result.rows.map(row => ({
        name: row.table,
        rowCount: parseInt(row.row_count) || 0,
        inserts: parseInt(row.inserts) || 0,
        updates: parseInt(row.updates) || 0,
        deletes: parseInt(row.deletes) || 0,
        lastVacuum: row.last_vacuum,
        lastAnalyze: row.last_analyze,
      })),
      count: result.rows.length,
    });
    
  } catch (error) {
    logger.error('Failed to get table stats', { error: error.message, schema: req.params.schema });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

/**
 * GET /workflows/stats/live
 * Get real-time system stats
 */
router.get('/stats/live', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const [dbSize, connections, activity] = await Promise.all([
      pool.query(`
        SELECT 
          pg_database_size(current_database()) as size_bytes,
          pg_size_pretty(pg_database_size(current_database())) as size_pretty
      `),
      pool.query(`
        SELECT count(*) as total
        FROM pg_stat_activity
        WHERE datname = current_database()
      `),
      pool.query(`
        SELECT 
          state,
          count(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `),
    ]);
    
    res.json({
      success: true,
      data: {
        database: {
          sizeBytes: parseInt(dbSize.rows[0].size_bytes),
          sizePretty: dbSize.rows[0].size_pretty,
        },
        connections: {
          total: parseInt(connections.rows[0].total),
          byState: activity.rows.reduce((acc, row) => {
            acc[row.state || 'unknown'] = parseInt(row.count);
            return acc;
          }, {}),
        },
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    logger.error('Failed to get live stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

export default router;
