/**
 * System Routes - Developer Dashboard API
 * 
 * Provides endpoints for:
 * - Schema statistics
 * - Service health checks
 * - Prometheus metrics
 * - Temporal workflows
 * - Sync status
 * - Database activity
 */

import { Router } from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = Router();

// Database pool
import { getPool as getDbPool } from '../db/schema-connection.js';

function getPool() {
  return getDbPool();
}

// Service URLs
const SERVICES = {
  prometheus: process.env.PROMETHEUS_URL || 'http://localhost:9090',
  grafana: process.env.GRAFANA_URL || 'http://localhost:3031',
  temporal: process.env.TEMPORAL_URL || 'http://localhost:7233',
  temporalUI: process.env.TEMPORAL_UI_URL || 'http://localhost:8088',
  metabase: process.env.METABASE_URL || 'http://localhost:3030',
  supabase: process.env.SUPABASE_URL || 'http://localhost:54323',
  redis: process.env.REDIS_URL || 'localhost:6379',
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA STATS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/schema-stats', async (req, res) => {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT 
        schemaname as schema,
        COUNT(*) as table_count,
        SUM(n_live_tup) as row_count
      FROM pg_stat_user_tables
      WHERE schemaname IN ('raw', 'master', 'crm', 'audit', 'auth', 'workflow', 'sync', 'integrations', 'public')
      GROUP BY schemaname
      ORDER BY 
        CASE schemaname
          WHEN 'raw' THEN 1
          WHEN 'master' THEN 2
          WHEN 'crm' THEN 3
          WHEN 'audit' THEN 4
          WHEN 'auth' THEN 5
          WHEN 'workflow' THEN 6
          WHEN 'sync' THEN 7
          WHEN 'integrations' THEN 8
          WHEN 'public' THEN 9
        END
    `);
    
    const tables = await client.query(`
      SELECT 
        schemaname as schema,
        relname as table_name,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname IN ('raw', 'master', 'crm', 'audit', 'auth', 'workflow', 'sync', 'integrations')
      ORDER BY schemaname, relname
    `);
    
    res.json({
      schemas: result.rows,
      tables: tables.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    services: {},
    timestamp: new Date().toISOString()
  };
  
  // Check PostgreSQL
  try {
    const client = await getPool().connect();
    try {
      await client.query('SELECT 1 as ok');
      health.services.database = {
        status: 'healthy',
        details: { connected: true }
      };
    } finally {
      client.release();
    }
  } catch (e) {
    health.services.database = { status: 'unhealthy', error: e.message };
    health.status = 'degraded';
  }
  
  // Check Redis
  try {
    const { createClient } = await import('redis');
    const redisClient = createClient({ url: `redis://${SERVICES.redis}` });
    await redisClient.connect();
    await redisClient.ping();
    await redisClient.disconnect();
    health.services.redis = { status: 'healthy' };
  } catch (e) {
    health.services.redis = { status: 'unhealthy', error: e.message };
    health.status = 'degraded';
  }
  
  // Check Temporal
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const temporalResponse = await fetch(`${SERVICES.temporalUI}/api/v1/namespaces`, {
      signal: controller.signal
    }).catch(() => null);
    
    clearTimeout(timeout);
    
    health.services.temporal = temporalResponse?.ok 
      ? { status: 'healthy' }
      : { status: 'unhealthy', details: 'Cannot reach Temporal' };
  } catch (e) {
    health.services.temporal = { status: 'unreachable', error: e.message };
  }
  
  // Check Prometheus
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const promResponse = await fetch(`${SERVICES.prometheus}/-/healthy`, {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    health.services.prometheus = promResponse.ok 
      ? { status: 'healthy' }
      : { status: 'unhealthy' };
  } catch (e) {
    health.services.prometheus = { status: 'unreachable' };
  }
  
  // Check Grafana
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const grafanaResponse = await fetch(`${SERVICES.grafana}/api/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    health.services.grafana = grafanaResponse.ok 
      ? { status: 'healthy' }
      : { status: 'unhealthy' };
  } catch (e) {
    health.services.grafana = { status: 'unreachable' };
  }
  
  // Check Metabase
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const metabaseResponse = await fetch(`${SERVICES.metabase}/api/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    health.services.metabase = metabaseResponse.ok 
      ? { status: 'healthy' }
      : { status: 'unhealthy' };
  } catch (e) {
    health.services.metabase = { status: 'unreachable' };
  }
  
  res.json(health);
});

// ─────────────────────────────────────────────────────────────────────────────
// PROMETHEUS METRICS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/metrics', async (req, res) => {
  try {
    const queries = [
      { name: 'cpu_usage', query: '100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)' },
      { name: 'memory_usage', query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100' },
      { name: 'db_connections', query: 'pg_stat_activity_count' },
      { name: 'http_requests_total', query: 'sum(rate(http_requests_total[5m]))' },
    ];
    
    const metrics = {};
    
    for (const q of queries) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `${SERVICES.prometheus}/api/v1/query?query=${encodeURIComponent(q.query)}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeout);
        
        if (response.ok) {
          const data = await response.json();
          if (data.data?.result?.[0]?.value) {
            metrics[q.name] = parseFloat(data.data.result[0].value[1]);
          }
        }
      } catch (e) {
        metrics[q.name] = null;
      }
    }
    
    res.json({ metrics, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORAL WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/workflows', async (req, res) => {
  try {
    const namespace = 'default';
    
    let workflows = {
      running: 0,
      completed: 0,
      failed: 0,
      recent: [],
      definitions: []
    };
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const runningResponse = await fetch(
        `${SERVICES.temporalUI}/api/v1/namespaces/${namespace}/workflows?status=Running`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeout);
      
      if (runningResponse.ok) {
        const data = await runningResponse.json();
        workflows.running = data.executions?.length || 0;
        workflows.recent = (data.executions || []).slice(0, 5).map(w => ({
          id: w.workflowId,
          type: w.type?.name || 'Unknown',
          status: w.status,
          startTime: w.startTime
        }));
      }
    } catch (e) {
      workflows.error = 'Cannot reach Temporal API';
    }
    
    // Check workflow definitions in database
    const client = await getPool().connect();
    try {
      const dbWorkflows = await client.query(`
        SELECT 
          name,
          is_active,
          last_run_at,
          run_count
        FROM workflow.definitions
        ORDER BY last_run_at DESC NULLS LAST
        LIMIT 10
      `).catch(() => ({ rows: [] }));
      
      workflows.definitions = dbWorkflows.rows;
    } finally {
      client.release();
    }
    
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SYNC STATUS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/sync-status', async (req, res) => {
  const client = await getPool().connect();
  try {
    // Get last sync times for each entity type
    const lastSync = await client.query(`
      SELECT 
        'customers' as entity,
        MAX(fetched_at) as last_sync,
        COUNT(*) as total_records
      FROM raw.st_customers
      UNION ALL
      SELECT 'jobs', MAX(fetched_at), COUNT(*) FROM raw.st_jobs
      UNION ALL
      SELECT 'invoices', MAX(fetched_at), COUNT(*) FROM raw.st_invoices
      UNION ALL
      SELECT 'estimates', MAX(fetched_at), COUNT(*) FROM raw.st_estimates
      UNION ALL
      SELECT 'locations', MAX(fetched_at), COUNT(*) FROM raw.st_locations
      UNION ALL
      SELECT 'technicians', MAX(fetched_at), COUNT(*) FROM raw.st_technicians
    `);
    
    // Get pending outbound syncs
    const pendingSync = await client.query(`
      SELECT 
        destination,
        COUNT(*) as pending_count,
        MIN(created_at) as oldest_pending
      FROM sync.outbound_queue
      WHERE status = 'pending'
      GROUP BY destination
    `).catch(() => ({ rows: [] }));
    
    // Get recent sync history
    const syncHistory = await client.query(`
      SELECT 
        entity_type,
        operation,
        status,
        records_processed,
        records_failed,
        started_at,
        completed_at,
        duration_ms
      FROM sync.history
      ORDER BY started_at DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));
    
    res.json({
      lastSync: lastSync.rows,
      pendingOutbound: pendingSync.rows,
      recentHistory: syncHistory.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE URLS (for frontend links)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/service-urls', async (req, res) => {
  res.json({
    grafana: SERVICES.grafana,
    prometheus: SERVICES.prometheus,
    temporal: SERVICES.temporalUI,
    metabase: SERVICES.metabase,
    supabase: SERVICES.supabase,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────

router.get('/db-activity', async (req, res) => {
  const client = await getPool().connect();
  try {
    // Active connections
    const connections = await client.query(`
      SELECT 
        state,
        COUNT(*) as count,
        MAX(EXTRACT(EPOCH FROM (NOW() - query_start))) as max_duration_sec
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `);
    
    // Recent audit log entries
    const recentChanges = await client.query(`
      SELECT 
        table_name,
        operation,
        changed_at,
        changed_by
      FROM audit.change_log
      ORDER BY changed_at DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));
    
    // Table sizes
    const tableSizes = await client.query(`
      SELECT 
        schemaname || '.' || relname as table_name,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 10
    `);
    
    res.json({
      connections: connections.rows,
      recentChanges: recentChanges.rows,
      largestTables: tableSizes.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
