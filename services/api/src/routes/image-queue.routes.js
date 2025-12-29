/**
 * Image Queue Management Routes
 * 
 * Endpoints for monitoring and managing the image download queue
 */

import express from 'express';
import { 
  imageDownloadQueue, 
  getQueueStats, 
  clearQueue,
  queueImageDownloadBulk,
} from '../queues/image-download.queue.js';
import { query } from '../db/schema-connection.js';

const pool = { query };

const router = express.Router();

/**
 * GET /api/images/queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    
    const dbStats = await pool.query(`
      SELECT 
        'categories' as type,
        COUNT(*) as total,
        COUNT(image) FILTER (WHERE image IS NOT NULL) as with_path,
        COUNT(image_data) FILTER (WHERE image_data IS NOT NULL) as downloaded
      FROM raw.st_pricebook_categories
      
      UNION ALL
      
      SELECT 
        'services' as type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(assets, '[]'::jsonb)) > 0) as with_path,
        COUNT(image_data) FILTER (WHERE image_data IS NOT NULL) as downloaded
      FROM raw.st_pricebook_services
    `);

    res.json({
      queue: stats,
      database: dbStats.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ImageQueue] Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/images/queue/jobs
 * Get recent jobs
 */
router.get('/queue/jobs', async (req, res) => {
  try {
    const { status = 'all', limit = 20 } = req.query;

    let jobs = [];
    
    if (status === 'all' || status === 'waiting') {
      const waiting = await imageDownloadQueue.getWaiting(0, parseInt(limit));
      jobs.push(...waiting.map(j => ({ ...j.data, status: 'waiting', id: j.id })));
    }
    
    if (status === 'all' || status === 'active') {
      const active = await imageDownloadQueue.getActive(0, parseInt(limit));
      jobs.push(...active.map(j => ({ ...j.data, status: 'active', id: j.id })));
    }
    
    if (status === 'all' || status === 'completed') {
      const completed = await imageDownloadQueue.getCompleted(0, parseInt(limit));
      jobs.push(...completed.map(j => ({ ...j.data, status: 'completed', id: j.id, result: j.returnvalue })));
    }
    
    if (status === 'all' || status === 'failed') {
      const failed = await imageDownloadQueue.getFailed(0, parseInt(limit));
      jobs.push(...failed.map(j => ({ ...j.data, status: 'failed', id: j.id, error: j.failedReason })));
    }

    res.json({ jobs, count: jobs.length });
  } catch (error) {
    console.error('[ImageQueue] Jobs error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/images/queue/retry-failed
 * Retry all failed jobs
 */
router.post('/queue/retry-failed', async (req, res) => {
  try {
    const failed = await imageDownloadQueue.getFailed(0, 1000);
    
    let retried = 0;
    for (const job of failed) {
      await job.retry();
      retried++;
    }

    res.json({ 
      success: true, 
      retried,
      message: `Retried ${retried} failed jobs`,
    });
  } catch (error) {
    console.error('[ImageQueue] Retry error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/images/queue/clear
 * Clear all jobs from queue (use with caution!)
 */
router.post('/queue/clear', async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'yes-clear-all') {
      return res.status(400).json({ 
        error: 'Must confirm with body: { "confirm": "yes-clear-all" }' 
      });
    }

    await clearQueue();

    res.json({ 
      success: true, 
      message: 'Queue cleared',
    });
  } catch (error) {
    console.error('[ImageQueue] Clear error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/images/queue/download-missing
 * Queue download for all items missing images
 */
router.post('/queue/download-missing', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
    const { type = 'categories' } = req.body;

    let query;
    let itemType;

    if (type === 'categories') {
      query = `
        SELECT st_id, image as image_path
        FROM raw.st_pricebook_categories
        WHERE image IS NOT NULL 
          AND image != ''
          AND image_data IS NULL
          AND tenant_id = $1
      `;
      itemType = 'category';
    } else if (type === 'services') {
      query = `
        SELECT st_id, assets->0->>'url' as image_path
        FROM raw.st_pricebook_services
        WHERE jsonb_array_length(COALESCE(assets, '[]'::jsonb)) > 0
          AND image_data IS NULL
          AND tenant_id = $1
      `;
      itemType = 'service';
    } else {
      return res.status(400).json({ error: 'Invalid type. Use: categories, services, materials, equipment' });
    }

    const result = await pool.query(query, [tenantId]);
    
    const items = result.rows
      .filter(row => row.image_path)
      .map(row => ({
        stId: row.st_id,
        imagePath: row.image_path,
        itemType,
      }));

    if (items.length === 0) {
      return res.json({ 
        success: true, 
        queued: 0,
        message: 'All images already downloaded',
      });
    }

    await queueImageDownloadBulk(items, tenantId);

    res.json({
      success: true,
      queued: items.length,
      message: `Queued ${items.length} ${type} for image download`,
    });
  } catch (error) {
    console.error('[ImageQueue] Download missing error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
