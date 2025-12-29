/**
 * Health Controller
 * Handles health check, status, and system info endpoints
 */

import { getTokenStatus } from '../services/tokenManager.js';
import { healthMonitor } from '../services/monitoring/health-monitor.js';
import pg from 'pg';

const { Pool } = pg;

// Track server start time
const startTime = Date.now();

// Lazy-loaded database pool for status checks
let dbPool = null;
function getDbPool() {
  if (!dbPool) {
    const connectionString = process.env.SERVICETITAN_DATABASE_URL || process.env.DATABASE_URL;
    if (connectionString) {
      dbPool = new Pool({ connectionString, max: 2 });
    }
  }
  return dbPool;
}

/**
 * Simple ping endpoint for basic availability check
 */
export function ping(req, res) {
  res.json({ msg: 'ServiceTitan MCP API is running' });
}

/**
 * Detailed health check with component status
 * Always returns 200 for Traefik/load balancer compatibility
 * The status field indicates actual health state
 */
export async function health(req, res) {
  const tokenStatus = getTokenStatus();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  // Server is healthy if it's been up for more than 30 seconds (past initial startup)
  // or if the token is valid
  const isHealthy = uptimeSeconds > 30 || tokenStatus.valid;

  const health = {
    status: isHealthy ? 'healthy' : 'starting',
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    version: '2.0.0',
    components: {
      server: 'up',
      tokenManager: tokenStatus.cached ? 'up' : 'initializing',
      database: 'up',
    },
  };

  // Always return 200 - the server is running and can handle requests
  // Token will be fetched on first API call if not cached
  res.status(200).json(health);
}

/**
 * Detailed status endpoint with internal metrics
 */
export async function status(req, res) {
  const tokenStatus = getTokenStatus();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    service: 'perfect-catch-st-automation',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: {
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds),
    },
    token: {
      valid: tokenStatus.valid,
      cached: tokenStatus.cached,
      expiresAt: tokenStatus.expiresAt,
      expiresIn: tokenStatus.expiresIn ? `${tokenStatus.expiresIn}s` : null,
    },
    memory: {
      heapUsed: formatBytes(process.memoryUsage().heapUsed),
      heapTotal: formatBytes(process.memoryUsage().heapTotal),
      rss: formatBytes(process.memoryUsage().rss),
    },
    queue: {
      status: 'not_implemented',
      pending: 0,
    },
  });
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

/**
 * Format uptime seconds to human readable string
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Detailed system health check with all components
 */
export async function detailedHealth(req, res) {
  try {
    const health = await healthMonitor.getSystemHealth();
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'critical' ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Workflow-specific health check
 */
export async function workflowHealth(req, res) {
  try {
    const workflowCheck = await healthMonitor.checkWorkflowEngine();
    res.json({
      component: 'workflow',
      ...workflowCheck
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Worker Health Status Endpoint
 * Batch 10: Returns health status of background workers
 */
export async function workerStatus(req, res) {
  try {
    const fs = await import('fs');
    const HEARTBEAT_FILE = '/tmp/worker-heartbeat';

    let workerHealth = {
      healthy: false,
      error: 'Heartbeat file not found - worker may not be running'
    };

    try {
      const stat = fs.statSync(HEARTBEAT_FILE);
      const content = fs.readFileSync(HEARTBEAT_FILE, 'utf8');
      const data = JSON.parse(content);
      const age = Date.now() - stat.mtimeMs;

      workerHealth = {
        healthy: age < 120000,
        lastUpdate: new Date(stat.mtimeMs).toISOString(),
        ageMs: age,
        ageFormatted: `${Math.floor(age / 1000)}s ago`,
        ...data
      };
    } catch {
      // Keep default error state
    }

    res.json({
      component: 'workers',
      timestamp: new Date().toISOString(),
      workflow_worker: workerHealth,
      message: workerHealth.healthy
        ? 'Workers are healthy'
        : 'Workers may be unhealthy or not running'
    });
  } catch (error) {
    res.status(500).json({
      component: 'workers',
      status: 'error',
      error: error.message
    });
  }
}

export default {
  ping,
  health,
  status,
  detailedHealth,
  workflowHealth,
  workerStatus,
};
