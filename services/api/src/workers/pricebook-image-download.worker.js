/**
 * Pricebook Image Download Worker
 * 
 * Processes the image download queue asynchronously.
 * Downloads images from ServiceTitan and stores in PostgreSQL BYTEA columns.
 * 
 * Features:
 * - Rate limited to avoid overwhelming ServiceTitan API
 * - Auto-retry with exponential backoff
 * - Concurrent downloads (configurable)
 * - Skips already-downloaded images
 */

import { Worker } from 'bullmq';
import { getRedisConnection } from '../queues/connection.js';
import { getAccessToken } from '../services/tokenManager.js';
import { query } from '../db/schema-connection.js';

const pool = { query };
import { QUEUE_NAME } from '../queues/image-download.queue.js';
import config from '../config/index.js';

const CONFIG = {
  concurrency: 3,
  rateLimitMax: 20,
  rateLimitDuration: 60000,
  downloadTimeout: 30000,
};

/**
 * Download an image from ServiceTitan
 * 
 * @param {string} imagePath - Image path (e.g., "Images/Category/xxx.jpg")
 * @param {string} tenantId - Tenant ID
 * @returns {Object} { buffer, contentType }
 */
async function downloadImageFromST(imagePath, tenantId) {
  const accessToken = await getAccessToken();
  const appKey = config.serviceTitan.appKey;

  const url = `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/images?path=${encodeURIComponent(imagePath)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.downloadTimeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'ST-App-Key': appKey,
      },
      redirect: 'manual',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 302) {
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        const imageResponse = await fetch(redirectUrl, {
          signal: AbortSignal.timeout(CONFIG.downloadTimeout),
        });
        
        if (imageResponse.ok) {
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
          return { buffer, contentType };
        }
        throw new Error(`Azure download failed: ${imageResponse.status}`);
      }
    }

    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const ext = imagePath.split('.').pop()?.toLowerCase();
      const contentTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      return { buffer, contentType: contentTypes[ext] || 'image/jpeg' };
    }

    throw new Error(`ST API failed: ${response.status} ${response.statusText}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get the table name for an item type
 */
function getTableName(itemType) {
  const tables = {
    category: 'raw.st_pricebook_categories',
    subcategory: 'raw.st_pricebook_categories',
    service: 'raw.st_pricebook_services',
    material: 'raw.st_pricebook_materials',
    equipment: 'raw.st_pricebook_equipment',
  };
  return tables[itemType] || tables.category;
}

/**
 * Check if image already exists in database
 */
async function imageAlreadyExists(stId, itemType) {
  const tableName = getTableName(itemType);
  
  const result = await pool.query(`
    SELECT image_downloaded_at, LENGTH(image_data) as size
    FROM ${tableName}
    WHERE st_id = $1 AND image_data IS NOT NULL
  `, [stId]);

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Store image in database
 */
async function storeImage(stId, itemType, buffer, contentType) {
  const tableName = getTableName(itemType);

  await pool.query(`
    UPDATE ${tableName}
    SET 
      image_data = $1,
      image_content_type = $2,
      image_downloaded_at = NOW()
    WHERE st_id = $3
  `, [buffer, contentType, stId]);

  console.log(`[ImageWorker] Stored ${itemType} image: st_id=${stId}, size=${Math.round(buffer.length / 1024)}KB`);
}

/**
 * Process a single image download job
 */
async function processImageDownload(job) {
  const { stId, imagePath, itemType, tenantId } = job.data;
  
  console.log(`[ImageWorker] Processing: ${itemType} st_id=${stId}`);

  const existing = await imageAlreadyExists(stId, itemType);
  if (existing && !job.opts?.force) {
    console.log(`[ImageWorker] Skipped ${stId} - already downloaded (${existing.size} bytes)`);
    return { 
      status: 'skipped', 
      reason: 'already_exists',
      stId,
      existingSize: existing.size,
    };
  }

  const { buffer, contentType } = await downloadImageFromST(imagePath, tenantId);

  await storeImage(stId, itemType, buffer, contentType);

  return {
    status: 'downloaded',
    stId,
    itemType,
    size: buffer.length,
    contentType,
  };
}

/**
 * Create and start the worker
 */
export function createImageDownloadWorker() {
  const worker = new Worker(QUEUE_NAME, processImageDownload, {
    connection: getRedisConnection(),
    concurrency: CONFIG.concurrency,
    limiter: {
      max: CONFIG.rateLimitMax,
      duration: CONFIG.rateLimitDuration,
    },
  });

  worker.on('completed', (job, result) => {
    if (result.status === 'downloaded') {
      console.log(`[ImageWorker] ✓ Completed: ${result.itemType} st_id=${result.stId} (${Math.round(result.size / 1024)}KB)`);
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`[ImageWorker] ✗ Failed: ${job.data.itemType} st_id=${job.data.stId}`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[ImageWorker] Worker error:', err);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[ImageWorker] Job stalled: ${jobId}`);
  });

  console.log('[ImageWorker] Started with config:', {
    concurrency: CONFIG.concurrency,
    rateLimit: `${CONFIG.rateLimitMax}/${CONFIG.rateLimitDuration}ms`,
  });

  return worker;
}

export { processImageDownload, downloadImageFromST, CONFIG };
