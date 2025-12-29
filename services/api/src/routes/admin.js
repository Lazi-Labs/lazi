/**
 * Admin Routes
 * Bull Board dashboard and queue management endpoints
 */

import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import { getAllQueues, QUEUE_NAMES, addJob } from '../queues/index.js';
import { triggerSync, getScheduledJobs, pauseSchedules, resumeSchedules } from '../queues/schedulers.js';
import { getAllWorkerStatus } from '../workers/bullmq/index.js';
import { createModuleLogger } from '../utils/logger.js';
import { getPool as getDbPool } from '../db/schema-connection.js';

const logger = createModuleLogger('admin-routes');
const router = Router();

// Create Bull Board adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Initialize Bull Board with all queues
let boardInitialized = false;

export function initializeBullBoard() {
  if (boardInitialized) return serverAdapter;
  
  const queues = getAllQueues();
  const queueAdapters = queues.map(queue => new BullMQAdapter(queue));
  
  createBullBoard({
    queues: queueAdapters,
    serverAdapter,
  });
  
  boardInitialized = true;
  logger.info('Bull Board initialized');
  
  return serverAdapter;
}

// Mount Bull Board
router.use('/queues', (req, res, next) => {
  const adapter = initializeBullBoard();
  return adapter.getRouter()(req, res, next);
});

// Queue status endpoint
router.get('/status', async (req, res) => {
  try {
    const queues = getAllQueues();
    const status = {};
    
    for (const queue of queues) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);
      
      status[queue.name] = {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
      };
    }
    
    res.json({
      success: true,
      queues: status,
      workers: getAllWorkerStatus(),
    });
    
  } catch (error) {
    logger.error('Failed to get queue status', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get scheduled jobs
router.get('/schedules', async (req, res) => {
  try {
    const schedules = await getScheduledJobs();
    res.json({ success: true, schedules });
  } catch (error) {
    logger.error('Failed to get schedules', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trigger manual sync
router.post('/sync/trigger', async (req, res) => {
  try {
    const { syncType = 'full', options = {} } = req.body;
    
    const job = await triggerSync(syncType, options);
    
    res.json({
      success: true,
      message: `Sync triggered: ${syncType}`,
      jobId: job.id,
    });
    
  } catch (error) {
    logger.error('Failed to trigger sync', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pause all schedules
router.post('/schedules/pause', async (req, res) => {
  try {
    await pauseSchedules();
    res.json({ success: true, message: 'Schedules paused' });
  } catch (error) {
    logger.error('Failed to pause schedules', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resume all schedules
router.post('/schedules/resume', async (req, res) => {
  try {
    await resumeSchedules();
    res.json({ success: true, message: 'Schedules resumed' });
  } catch (error) {
    logger.error('Failed to resume schedules', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a job to a specific queue
router.post('/jobs/add', async (req, res) => {
  try {
    const { queue, name, data, options = {} } = req.body;
    
    if (!queue || !QUEUE_NAMES[queue.toUpperCase().replace(/-/g, '_')]) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid queue. Valid queues: ${Object.values(QUEUE_NAMES).join(', ')}` 
      });
    }
    
    const job = await addJob(queue, name || 'manual-job', data, options);
    
    res.json({
      success: true,
      jobId: job.id,
      queue,
    });
    
  } catch (error) {
    logger.error('Failed to add job', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get worker status
router.get('/workers', (req, res) => {
  res.json({
    success: true,
    workers: getAllWorkerStatus(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SYNC HISTORY (for Debug Panel)
// ─────────────────────────────────────────────────────────────────────────────

// Database pool for sync history queries
function getPool() {
  return getDbPool();
}

// GET /api/admin/sync/history - Get recent sync history
router.get('/sync/history', async (req, res) => {
  const { limit = 20 } = req.query;
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID || process.env.DEFAULT_TENANT_ID;

  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        id,
        direction,
        entity_type,
        operation,
        status,
        records_processed,
        records_failed,
        duration_ms,
        error_message,
        started_at,
        completed_at,
        created_at
      FROM sync.history
      ORDER BY created_at DESC
      LIMIT $1
    `, [parseInt(limit, 10)]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    // Table might not exist, return empty array
    logger.warn('Failed to fetch sync history', { error: error.message });
    res.json({
      success: true,
      data: []
    });
  } finally {
    client.release();
  }
});

export default router;
