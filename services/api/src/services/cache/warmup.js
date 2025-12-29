/**
 * Cache Warmup
 * Pre-populate cache with frequently accessed data on startup
 */

import pg from 'pg';
import config from '../../config/index.js';
import { set, buildKey, TTL_CONFIG } from './index.js';
import { isCacheConnected } from './redis-client.js';
import { createModuleLogger } from '../../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('cache-warmup');

// Warmup queries - fetch hot data from master tables
const WARMUP_QUERIES = [
  {
    name: 'active_technicians',
    key: 'technician:active:list',
    ttl: TTL_CONFIG.TECHNICIAN,
    query: `
      SELECT st_id, name, email, phone, business_unit_id, active
      FROM master.technicians
      WHERE active = true
      ORDER BY name
    `,
  },
  {
    name: 'business_units',
    key: 'business_unit:all:list',
    ttl: TTL_CONFIG.BUSINESS_UNIT,
    query: `
      SELECT st_id, name, official_name, email, phone, active
      FROM master.business_units
      WHERE active = true
      ORDER BY name
    `,
  },
  {
    name: 'job_types',
    key: 'job_type:all:list',
    ttl: TTL_CONFIG.JOB_TYPE,
    query: `
      SELECT st_id, name, duration, priority, active
      FROM master.job_types
      WHERE active = true
      ORDER BY name
    `,
  },
  {
    name: 'campaigns',
    key: 'campaign:all:list',
    ttl: TTL_CONFIG.CAMPAIGN,
    query: `
      SELECT st_id, name, code, category_id, active
      FROM master.campaigns
      WHERE active = true
      ORDER BY name
    `,
  },
  {
    name: 'recent_customers',
    key: 'customer:recent:list',
    ttl: TTL_CONFIG.CUSTOMER,
    query: `
      SELECT st_id, name, email, phone, city, state, active
      FROM master.customers
      WHERE active = true
      ORDER BY st_modified_on DESC NULLS LAST
      LIMIT 100
    `,
  },
  {
    name: 'recent_jobs',
    key: 'job:recent:list',
    ttl: TTL_CONFIG.JOB,
    query: `
      SELECT st_id, job_number, customer_id, job_status, 
             primary_technician_name, scheduled_start, total
      FROM master.jobs
      ORDER BY scheduled_start DESC NULLS LAST
      LIMIT 100
    `,
  },
  {
    name: 'pending_estimates',
    key: 'estimate:pending:list',
    ttl: TTL_CONFIG.ESTIMATE,
    query: `
      SELECT st_id, name, customer_id, customer_name, status, 
             subtotal, tax, sold_by_name
      FROM master.estimates
      WHERE status NOT IN ('Sold', 'Dismissed')
      ORDER BY st_modified_on DESC NULLS LAST
      LIMIT 100
    `,
  },
  {
    name: 'unpaid_invoices',
    key: 'invoice:unpaid:list',
    ttl: TTL_CONFIG.INVOICE,
    query: `
      SELECT st_id, reference_number, customer_id, customer_name,
             total, balance, invoice_date, due_date
      FROM master.invoices
      WHERE balance > 0 AND active = true
      ORDER BY due_date ASC
      LIMIT 100
    `,
  },
  {
    name: 'dashboard_stats',
    key: 'dashboard:stats',
    ttl: TTL_CONFIG.DASHBOARD,
    query: `
      SELECT 
        (SELECT COUNT(*) FROM master.customers WHERE active = true) as total_customers,
        (SELECT COUNT(*) FROM master.jobs WHERE job_status = 'Scheduled') as scheduled_jobs,
        (SELECT COUNT(*) FROM master.jobs WHERE job_status = 'Completed' 
         AND completed_on >= NOW() - INTERVAL '7 days') as completed_jobs_7d,
        (SELECT COUNT(*) FROM master.estimates WHERE status NOT IN ('Sold', 'Dismissed')) as pending_estimates,
        (SELECT COALESCE(SUM(balance), 0) FROM master.invoices WHERE balance > 0) as outstanding_balance,
        (SELECT COUNT(*) FROM master.invoices WHERE balance > 0) as unpaid_invoices
    `,
  },
];

/**
 * Run cache warmup
 */
export async function warmupCache() {
  if (!isCacheConnected()) {
    logger.warn('Cache not connected - skipping warmup');
    return { success: false, reason: 'cache_not_connected' };
  }
  
  if (!config.database.url) {
    logger.warn('DATABASE_URL not configured - skipping warmup');
    return { success: false, reason: 'database_not_configured' };
  }
  
  const pool = new Pool({
    connectionString: config.database.url,
    max: 3,
  });
  
  const results = {
    success: true,
    warmed: [],
    failed: [],
    duration: 0,
  };
  
  const startTime = Date.now();
  
  logger.info('Starting cache warmup...');
  
  try {
    for (const warmupQuery of WARMUP_QUERIES) {
      try {
        const queryResult = await pool.query(warmupQuery.query);
        const data = warmupQuery.query.includes('LIMIT 1') || warmupQuery.name.includes('stats')
          ? queryResult.rows[0]
          : queryResult.rows;
        
        await set(warmupQuery.key, data, warmupQuery.ttl);
        
        results.warmed.push({
          name: warmupQuery.name,
          key: warmupQuery.key,
          count: Array.isArray(data) ? data.length : 1,
        });
        
        logger.debug('Warmed cache', { 
          name: warmupQuery.name, 
          count: Array.isArray(data) ? data.length : 1 
        });
        
      } catch (error) {
        results.failed.push({
          name: warmupQuery.name,
          error: error.message,
        });
        logger.error('Warmup query failed', { 
          name: warmupQuery.name, 
          error: error.message 
        });
      }
    }
    
    results.duration = Date.now() - startTime;
    
    logger.info('Cache warmup completed', {
      warmed: results.warmed.length,
      failed: results.failed.length,
      duration: `${results.duration}ms`,
    });
    
  } catch (error) {
    logger.error('Cache warmup failed', { error: error.message });
    results.success = false;
    results.error = error.message;
  } finally {
    await pool.end();
  }
  
  return results;
}

/**
 * Warm up cache for a specific entity by ID
 */
export async function warmupEntity(entityType, entityId) {
  if (!isCacheConnected() || !config.database.url) {
    return false;
  }
  
  const pool = new Pool({
    connectionString: config.database.url,
    max: 1,
  });
  
  try {
    let query;
    let key;
    let ttl;
    
    switch (entityType) {
      case 'customer':
        query = `SELECT * FROM master.customers WHERE st_id = $1`;
        key = buildKey('customer', entityId);
        ttl = TTL_CONFIG.CUSTOMER;
        break;
      case 'job':
        query = `SELECT * FROM master.jobs WHERE st_id = $1`;
        key = buildKey('job', entityId);
        ttl = TTL_CONFIG.JOB;
        break;
      case 'invoice':
        query = `SELECT * FROM master.invoices WHERE st_id = $1`;
        key = buildKey('invoice', entityId);
        ttl = TTL_CONFIG.INVOICE;
        break;
      case 'estimate':
        query = `SELECT * FROM master.estimates WHERE st_id = $1`;
        key = buildKey('estimate', entityId);
        ttl = TTL_CONFIG.ESTIMATE;
        break;
      case 'technician':
        query = `SELECT * FROM master.technicians WHERE st_id = $1`;
        key = buildKey('technician', entityId);
        ttl = TTL_CONFIG.TECHNICIAN;
        break;
      case 'location':
        query = `SELECT * FROM master.locations WHERE st_id = $1`;
        key = buildKey('location', entityId);
        ttl = TTL_CONFIG.LOCATION;
        break;
      default:
        logger.warn('Unknown entity type for warmup', { entityType });
        return false;
    }
    
    const result = await pool.query(query, [entityId]);
    
    if (result.rows.length > 0) {
      await set(key, result.rows[0], ttl);
      logger.debug('Entity warmed', { entityType, entityId, key });
      return true;
    }
    
    return false;
    
  } catch (error) {
    logger.error('Entity warmup failed', { entityType, entityId, error: error.message });
    return false;
  } finally {
    await pool.end();
  }
}

export default {
  warmupCache,
  warmupEntity,
};
