/**
 * Health & Status API Routes
 * System health checks and status endpoints
 */

import { Router } from 'express';
import pg from 'pg';
import config from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('health-routes');
const router = Router();

/**
 * GET /health
 * Basic health check - returns 200 if server is running
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness check - verifies all dependencies are available
 */
router.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
  };
  
  // Check database
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  try {
    await pool.query('SELECT 1');
    checks.database = true;
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
  } finally {
    await pool.end();
  }
  
  // Check Redis (if configured)
  try {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis({
      host: config.redis?.host || 'localhost',
      port: config.redis?.port || 6379,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    
    await redis.ping();
    checks.redis = true;
    await redis.quit();
  } catch (error) {
    logger.warn('Redis health check failed', { error: error.message });
    // Redis is optional, don't fail readiness
    checks.redis = null; // null = not configured/optional
  }
  
  const isReady = checks.database; // Only database is required
  
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/live
 * Liveness check - returns 200 if process is alive
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/status
 * Detailed system status
 */
router.get('/status', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    // Get database stats
    const dbStats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM crm.contacts) as crm_contacts,
        (SELECT COUNT(*) FROM crm.opportunities) as crm_opportunities,
        (SELECT COUNT(*) FROM master.customers) as master_customers,
        (SELECT COUNT(*) FROM master.jobs) as master_jobs,
        (SELECT COUNT(*) FROM audit.change_log) as audit_entries,
        (SELECT COUNT(*) FROM workflow.instances WHERE status = 'running') as active_workflows
    `);
    
    // Get recent sync info
    const syncStats = await pool.query(`
      SELECT 
        table_name,
        MAX(fetched_at) as last_sync
      FROM raw.st_customers
      CROSS JOIN (SELECT 'customers' as table_name) t
      GROUP BY table_name
      LIMIT 1
    `);
    
    res.json({
      status: 'operational',
      version: process.env.npm_package_version || '1.0.0',
      environment: config.env || 'development',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
      database: {
        connected: true,
        stats: dbStats.rows[0],
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Status check failed', { error: error.message });
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  } finally {
    await pool.end();
  }
});

/**
 * GET /health/metrics
 * Prometheus-compatible metrics endpoint
 */
router.get('/metrics', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM crm.contacts) as crm_contacts_total,
        (SELECT COUNT(*) FROM crm.opportunities WHERE status = 'Open') as crm_opportunities_open,
        (SELECT COUNT(*) FROM crm.opportunities WHERE status = 'Won') as crm_opportunities_won,
        (SELECT COUNT(*) FROM crm.tasks WHERE status = 'pending') as crm_tasks_pending,
        (SELECT COUNT(*) FROM workflow.instances WHERE status = 'running') as workflows_running,
        (SELECT COUNT(*) FROM workflow.instances WHERE status = 'completed') as workflows_completed,
        (SELECT COUNT(*) FROM audit.change_log WHERE changed_at > NOW() - INTERVAL '1 hour') as audit_changes_1h
    `);
    
    const s = stats.rows[0];
    const metrics = `
# HELP crm_contacts_total Total number of CRM contacts
# TYPE crm_contacts_total gauge
crm_contacts_total ${s.crm_contacts_total}

# HELP crm_opportunities_open Number of open opportunities
# TYPE crm_opportunities_open gauge
crm_opportunities_open ${s.crm_opportunities_open}

# HELP crm_opportunities_won Number of won opportunities
# TYPE crm_opportunities_won gauge
crm_opportunities_won ${s.crm_opportunities_won}

# HELP crm_tasks_pending Number of pending tasks
# TYPE crm_tasks_pending gauge
crm_tasks_pending ${s.crm_tasks_pending}

# HELP workflows_running Number of running workflows
# TYPE workflows_running gauge
workflows_running ${s.workflows_running}

# HELP workflows_completed Number of completed workflows
# TYPE workflows_completed gauge
workflows_completed ${s.workflows_completed}

# HELP audit_changes_1h Audit changes in last hour
# TYPE audit_changes_1h gauge
audit_changes_1h ${s.audit_changes_1h}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${process.uptime()}

# HELP process_memory_heap_bytes Process heap memory usage
# TYPE process_memory_heap_bytes gauge
process_memory_heap_bytes ${process.memoryUsage().heapUsed}
`.trim();
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
    
  } catch (error) {
    logger.error('Metrics generation failed', { error: error.message });
    res.status(500).send('# Error generating metrics');
  } finally {
    await pool.end();
  }
});

export default router;
