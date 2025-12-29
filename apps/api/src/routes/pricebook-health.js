/**
 * Pricebook Health Dashboard
 * Comprehensive sync status and health monitoring for all pricebook entities
 */

import express from 'express';
import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function getTenantId(req) {
  return req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
}

function getPool() {
  const connectionString = config.database.url;
  return new Pool({
    connectionString,
    max: 10,
    ssl: connectionString?.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
}

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const tenantId = getTenantId(req);
    
    const status = {
      tenant_id: tenantId,
      timestamp: new Date().toISOString(),
      entities: {},
      issues: [],
      overall_health: 'unknown',
    };
    
    try {
      const entities = ['services', 'materials', 'equipment', 'categories'];
      
      for (const entity of entities) {
        const rawTable = `raw.st_pricebook_${entity}`;
        const masterTable = `master.pricebook_${entity}`;
        
        try {
          const rawCount = await pool.query(
            `SELECT COUNT(*) FROM ${rawTable} WHERE tenant_id = $1`,
            [tenantId]
          );
          
          const masterCount = await pool.query(
            `SELECT COUNT(*) FROM ${masterTable} WHERE tenant_id = $1`,
            [tenantId]
          );
          
          const raw = parseInt(rawCount.rows[0].count);
          const master = parseInt(masterCount.rows[0].count);
          const syncRate = raw > 0 ? ((master / raw) * 100).toFixed(1) : 0;
          
          status.entities[entity] = {
            raw: raw,
            master: master,
            sync_rate: `${syncRate}%`,
            missing: raw - master,
            status: master === raw ? '✅ Synced' : master > 0 ? '⚠️ Partial' : '❌ Not Synced',
          };
          
          if (master < raw) {
            status.issues.push(`${entity}: ${raw - master} items not synced to MASTER`);
          }
        } catch (error) {
          status.entities[entity] = {
            error: error.message,
            status: '❌ Error',
          };
          status.issues.push(`${entity}: ${error.message}`);
        }
      }
      
      const allSynced = Object.values(status.entities).every(e => 
        e.status === '✅ Synced' || e.sync_rate === '100.0%'
      );
      status.overall_health = allSynced && status.issues.length === 0 
        ? '✅ Healthy' 
        : status.issues.length > 0 
          ? '⚠️ Issues Found' 
          : '❌ Critical';
      
      res.json(status);
      
    } catch (error) {
      console.error('[HEALTH CHECK] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    } finally {
      await pool.end();
    }
  })
);

export default router;
