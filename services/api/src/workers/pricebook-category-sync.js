/**
 * Pricebook Category Sync Worker
 * 
 * Syncs data from raw.pricebook_categories → master.pricebook_categories
 * - Full sync on startup/demand
 * - Incremental sync via pg_notify listener
 * - Extracts subcategories from JSONB
 * - Fetches subcategory images directly from ServiceTitan (bulk fetch returns null)
 * - Emits Socket.io events for real-time UI updates
 */

import { Worker, Queue } from 'bullmq';
import { getRedisConnection } from '../queues/connection.js';
import pool from '../db/pool.js';
import { createModuleLogger } from '../utils/logger.js';
import config from '../config/index.js';
import { queueImageDownload, queueImageDownloadBulk } from '../queues/image-download.queue.js';

// ServiceTitan API helper
async function getServiceTitanToken() {
  const response = await fetch('https://auth.servicetitan.io/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SERVICE_TITAN_CLIENT_ID,
      client_secret: process.env.SERVICE_TITAN_CLIENT_SECRET,
    }),
  });
  if (!response.ok) throw new Error('Failed to get ServiceTitan access token');
  const data = await response.json();
  return data.access_token;
}

// Fetch subcategory directly from ServiceTitan to get its image
async function fetchSubcategoryFromST(subId, tenantId, accessToken) {
  try {
    const response = await fetch(
      `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/categories/${subId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
        },
      }
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.error(`Failed to fetch subcategory ${subId} from ST:`, err.message);
  }
  return null;
}

// Recursively fetch and extract nested subcategories with fresh images from ST
async function fetchAndExtractNestedSubcategories(
  subcategories,
  categoryStId,
  tenantId,
  parentSubcategoryStId,
  depth,
  parentPath,
  accessToken
) {
  const results = [];
  
  if (!subcategories || !Array.isArray(subcategories)) {
    return results;
  }
  
  for (let i = 0; i < subcategories.length; i++) {
    let sub = subcategories[i];
    
    // Fetch fresh data from ST if we have a token
    if (accessToken) {
      const freshData = await fetchSubcategoryFromST(sub.id, tenantId, accessToken);
      if (freshData) {
        sub = freshData;
      }
    }
    
    const path = `${parentPath}.${sub.id}`;
    
    results.push({
      stId: sub.id,
      parentStId: categoryStId,
      parentSubcategoryStId,
      tenantId,
      name: sub.name,
      imageUrl: sub.image || null,
      sortOrder: sub.position || i,
      isActive: sub.active !== false,
      depth,
      path,
    });
    
    // Recursively process nested subcategories
    if (sub.subcategories && sub.subcategories.length > 0) {
      const nested = await fetchAndExtractNestedSubcategories(
        sub.subcategories,
        categoryStId,
        tenantId,
        sub.id,
        depth + 1,
        path,
        accessToken
      );
      results.push(...nested);
    }
  }
  
  return results;
}

const { Pool, Client } = pg;

// ============================================================================
// CONFIGURATION
// ============================================================================

const QUEUE_NAME = 'pricebook-category-sync';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/lazi';
const SSL_CONFIG = DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false;

// Redis connection for BullMQ
let redisConnection = null;

// PostgreSQL pool for queries
let pool = null;

// Dedicated client for LISTEN/NOTIFY
let listenerClient = null;

// Socket.io server reference (injected from main app)
let io = null;

// Queue and Worker instances
let pricebookCategorySyncQueue = null;
let pricebookCategorySyncWorker = null;

// ============================================================================
// QUEUE SETUP
// ============================================================================

function createQueue() {
  if (!redisConnection) {
    redisConnection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      ssl: SSL_CONFIG,
    });
  }

  pricebookCategorySyncQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        count: 1000,
        age: 24 * 60 * 60, // 24 hours
      },
      removeOnFail: {
        count: 500,
      },
    },
  });

  return pricebookCategorySyncQueue;
}

// ============================================================================
// WORKER IMPLEMENTATION
// ============================================================================

function createWorker() {
  pricebookCategorySyncWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const startTime = Date.now();
      console.log(`[${job.id}] Processing ${job.data.type} job`);

      try {
        switch (job.data.type) {
          case 'full-sync':
            return await processFullSync(job.data);

          case 'incremental-sync':
            return await processIncrementalSync(job.data);

          case 'single-category-sync':
            return await processSingleCategorySync(job.data);

          case 'recalculate-sort':
            return await processRecalculateSort(job.data);

          default:
            throw new Error(`Unknown job type: ${job.data.type}`);
        }
      } finally {
        const duration = Date.now() - startTime;
        console.log(`[${job.id}] Completed in ${duration}ms`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // Process one at a time to prevent race conditions
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  // Worker events
  pricebookCategorySyncWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  pricebookCategorySyncWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  pricebookCategorySyncWorker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  return pricebookCategorySyncWorker;
}

// ============================================================================
// JOB PROCESSORS
// ============================================================================

async function processFullSync(job) {
  const { tenantId, categoryType } = job;
  
  console.log(`Starting full sync for tenant ${tenantId}${categoryType ? `, type: ${categoryType}` : ''}`);

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Fetch all raw categories
    let query = `
      SELECT * FROM raw.st_pricebook_categories 
      WHERE tenant_id = $1
    `;
    const params = [tenantId];

    if (categoryType) {
      query += ` AND category_type = $2`;
      params.push(categoryType);
    }

    const rawResult = await client.query(query, params);
    const rawCategories = rawResult.rows;

    console.log(`Found ${rawCategories.length} raw categories`);

    // 2. Get ServiceTitan access token for fetching subcategory images
    let accessToken = null;
    try {
      accessToken = await getServiceTitanToken();
      console.log('Got ServiceTitan access token for subcategory image fetch');
    } catch (err) {
      console.warn('Could not get ST token, subcategory images may be stale:', err.message);
    }

    // 3. Upsert categories into master
    let upsertedCount = 0;
    let subcategoryCount = 0;

    for (const raw of rawCategories) {
      // Upsert main category
      await upsertCategory(client, raw);
      upsertedCount++;

      // Extract and upsert ALL subcategories (recursively)
      // Fetch each subcategory directly from ST to get correct images
      if (raw.subcategories && Array.isArray(raw.subcategories)) {
        for (const sub of raw.subcategories) {
          // Fetch subcategory directly from ST to get its image (bulk fetch returns null)
          let subData = sub;
          if (accessToken) {
            const freshData = await fetchSubcategoryFromST(sub.id, raw.tenant_id, accessToken);
            if (freshData) {
              subData = freshData;
            }
          }
          
          // Upsert this subcategory with fresh image data
          await upsertSubcategory(client, {
            stId: subData.id,
            parentStId: raw.st_id,
            parentSubcategoryStId: null,
            tenantId: raw.tenant_id,
            name: subData.name,
            imageUrl: subData.image || null,
            sortOrder: subData.position || 0,
            isActive: subData.active !== false,
            depth: 1,
            path: `${raw.st_id}.${subData.id}`,
          });
          subcategoryCount++;
          
          // Process nested subcategories recursively
          if (subData.subcategories && subData.subcategories.length > 0) {
            const nestedSubs = await fetchAndExtractNestedSubcategories(
              subData.subcategories,
              raw.st_id,
              raw.tenant_id,
              subData.id,
              2,
              `${raw.st_id}.${subData.id}`,
              accessToken
            );
            for (const nested of nestedSubs) {
              await upsertSubcategory(client, nested);
              subcategoryCount++;
            }
          }
        }
      }
    }

    // 3. Mark categories not in raw as inactive
    const activeStIds = rawCategories.map(r => r.st_id);
    if (activeStIds.length > 0) {
      await client.query(`
        UPDATE master.pricebook_categories
        SET is_active = false, updated_at = NOW()
        WHERE tenant_id = $1
          AND st_id != ALL($2::bigint[])
          AND is_active = true
          ${categoryType ? `AND category_type = $3` : ''}
      `, categoryType 
        ? [tenantId, activeStIds, categoryType] 
        : [tenantId, activeStIds]
      );
    }

    // 4. Rebuild hierarchy paths (if function exists) - use savepoint to avoid aborting transaction
    try {
      await client.query('SAVEPOINT rebuild_paths');
      await client.query(`SELECT master.rebuild_category_paths()`);
      await client.query('RELEASE SAVEPOINT rebuild_paths');
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT rebuild_paths');
      console.log('rebuild_category_paths function not available, skipping');
    }

    // 5. Recalculate global sort order (if function exists) - use savepoint
    const types = categoryType ? [categoryType] : ['Materials', 'Services'];
    for (const type of types) {
      try {
        await client.query('SAVEPOINT recalc_sort');
        await client.query(
          `SELECT master.recalculate_global_sort($1, $2)`,
          [tenantId, type]
        );
        await client.query('RELEASE SAVEPOINT recalc_sort');
      } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT recalc_sort');
        console.log('recalculate_global_sort function not available, skipping');
      }
    }

    // 6. Update subcategory counts
    await client.query(`
      UPDATE master.pricebook_categories c
      SET subcategory_count = (
        SELECT COUNT(*) FROM master.pricebook_subcategories s
        WHERE s.parent_st_id = c.st_id
      )
      WHERE c.tenant_id = $1
    `, [tenantId]);

    await client.query('COMMIT');

    // 7. Emit socket event
    emitEvent(tenantId, 'pricebook:categories:synced', {
      type: categoryType || 'all',
      categoriesCount: upsertedCount,
      subcategoriesCount: subcategoryCount,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      categoriesUpserted: upsertedCount,
      subcategoriesUpserted: subcategoryCount,
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function processIncrementalSync(job) {
  const { tenantId, rawIds, stIds, changeType } = job;

  console.log(`Processing incremental sync: ${changeType} for ${rawIds.length} records`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const affectedStIds = [];
    const affectedTypes = new Set();

    if (changeType === 'DELETE') {
      // Mark as inactive in master
      await client.query(`
        UPDATE master.pricebook_categories
        SET is_active = false, updated_at = NOW()
        WHERE st_id = ANY($1::bigint[])
      `, [stIds]);

      affectedStIds.push(...stIds);

    } else {
      // Fetch changed raw records
      const rawResult = await client.query(`
        SELECT * FROM raw.st_pricebook_categories
        WHERE id = ANY($1::int[])
      `, [rawIds]);

      for (const raw of rawResult.rows) {
        await upsertCategory(client, raw);
        affectedStIds.push(raw.st_id);
        affectedTypes.add(raw.category_type);

        // Sync ALL subcategories (recursively)
        if (raw.subcategories && Array.isArray(raw.subcategories)) {
          // Extract all subcategories recursively
          const allSubcategories = extractAllSubcategories(
            raw.subcategories,
            raw.st_id,
            raw.tenant_id
          );
          const newIds = allSubcategories.map(s => s.stId);

          // Get existing subcategory IDs for this category
          const existingResult = await client.query(`
            SELECT st_id FROM master.pricebook_subcategories
            WHERE parent_st_id = $1
          `, [raw.st_id]);
          const existingIds = existingResult.rows.map(r => r.st_id);

          // Remove subcategories that no longer exist
          const removedIds = existingIds.filter(id => !newIds.includes(id));
          if (removedIds.length > 0) {
            await client.query(`
              DELETE FROM master.pricebook_subcategories
              WHERE st_id = ANY($1::bigint[])
            `, [removedIds]);
          }

          // Upsert all subcategories
          for (const sub of allSubcategories) {
            await upsertSubcategory(client, sub);
          }
        }
      }
    }

    // Recalculate sort for affected types
    for (const type of affectedTypes) {
      try {
        await client.query(
          `SELECT master.recalculate_global_sort($1, $2)`,
          [tenantId, type]
        );
      } catch (e) {
        // Function may not exist
      }
    }

    await client.query('COMMIT');

    // Emit socket event
    emitEvent(tenantId, 'pricebook:categories:updated', {
      operation: changeType,
      affectedIds: affectedStIds,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      affectedCount: affectedStIds.length,
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function processSingleCategorySync(job) {
  const { stId, tenantId } = job;

  console.log(`Syncing single category: ${stId}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch from raw
    const rawResult = await client.query(`
      SELECT * FROM raw.st_pricebook_categories
      WHERE st_id = $1 AND tenant_id = $2
    `, [stId, tenantId]);

    if (rawResult.rows.length === 0) {
      // Category deleted from raw, mark inactive
      await client.query(`
        UPDATE master.pricebook_categories
        SET is_active = false, updated_at = NOW()
        WHERE st_id = $1
      `, [stId]);
    } else {
      const raw = rawResult.rows[0];
      await upsertCategory(client, raw);

      // Sync ALL subcategories (recursively)
      if (raw.subcategories && Array.isArray(raw.subcategories)) {
        const allSubcategories = extractAllSubcategories(
          raw.subcategories,
          raw.st_id,
          raw.tenant_id
        );
        
        for (const sub of allSubcategories) {
          await upsertSubcategory(client, sub);
        }
      }
    }

    await client.query('COMMIT');

    emitEvent(tenantId, 'pricebook:category:updated', {
      stId,
      timestamp: new Date().toISOString(),
    });

    return { success: true, stId };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function processRecalculateSort(job) {
  const { tenantId, categoryType } = job;

  console.log(`Recalculating sort order for ${categoryType}`);

  try {
    await pool.query(
      `SELECT master.recalculate_global_sort($1, $2)`,
      [tenantId, categoryType]
    );
  } catch (e) {
    console.log('recalculate_global_sort function not available');
  }

  emitEvent(tenantId, 'pricebook:categories:reordered', {
    type: categoryType,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function upsertCategory(client, raw) {
  // Debug: log the position being used
  console.log(`[SYNC] Upserting category ${raw.name} (st_id=${raw.st_id}) with position=${raw.position}`);
  
  // Calculate path based on parent
  let path = raw.st_id.toString();
  let depth = 0;

  if (raw.parent_id) {
    const parentResult = await client.query(`
      SELECT path::text, depth FROM master.pricebook_categories
      WHERE st_id = $1
    `, [raw.parent_id]);

    if (parentResult.rows.length > 0) {
      path = `${parentResult.rows[0].path}.${raw.st_id}`;
      depth = parentResult.rows[0].depth + 1;
    }
  }

  await client.query(`
    INSERT INTO master.pricebook_categories (
      st_id, tenant_id, raw_id, name, description, image_url,
      category_type, parent_st_id, depth, path, sort_order,
      is_active, business_unit_ids, last_synced_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, NOW()
    )
    ON CONFLICT (st_id) DO UPDATE SET
      tenant_id = EXCLUDED.tenant_id,
      raw_id = EXCLUDED.raw_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      image_url = EXCLUDED.image_url,
      category_type = EXCLUDED.category_type,
      parent_st_id = EXCLUDED.parent_st_id,
      depth = EXCLUDED.depth,
      path = EXCLUDED.path,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      business_unit_ids = EXCLUDED.business_unit_ids,
      last_synced_at = NOW(),
      updated_at = NOW()
  `, [
    raw.st_id,
    raw.tenant_id,
    raw.id,
    raw.name,
    raw.description,
    raw.image,
    raw.category_type,
    raw.parent_id,
    depth,
    path,
    raw.position || 0,
    raw.active,
    raw.business_unit_ids || [],
  ]);
}

async function upsertSubcategory(client, sub) {
  await client.query(`
    INSERT INTO master.pricebook_subcategories (
      st_id, parent_st_id, parent_subcategory_st_id, tenant_id, name, image_url,
      sort_order, is_active, depth, path, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (st_id) DO UPDATE SET
      parent_st_id = EXCLUDED.parent_st_id,
      parent_subcategory_st_id = EXCLUDED.parent_subcategory_st_id,
      tenant_id = EXCLUDED.tenant_id,
      name = EXCLUDED.name,
      image_url = EXCLUDED.image_url,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      depth = EXCLUDED.depth,
      path = EXCLUDED.path,
      last_synced_at = NOW(),
      updated_at = NOW()
  `, [
    sub.stId,
    sub.parentStId,
    sub.parentSubcategoryStId || null,
    sub.tenantId,
    sub.name,
    sub.imageUrl,
    sub.sortOrder,
    sub.isActive,
    sub.depth || 1,
    sub.path || `${sub.parentStId}.${sub.stId}`,
  ]);
}

/**
 * Recursively extract all subcategories from nested JSONB structure
 * @param {Array} subcategories - Array of subcategory objects from raw JSONB
 * @param {number} categoryStId - Parent category st_id
 * @param {string} tenantId - Tenant ID
 * @param {number|null} parentSubcategoryStId - Parent subcategory st_id (null for depth 1)
 * @param {number} depth - Current depth level (starts at 1)
 * @param {string} parentPath - Parent's ltree path
 * @returns {Array} Flat array of all subcategories with hierarchy info
 */
function extractAllSubcategories(
  subcategories,
  categoryStId,
  tenantId,
  parentSubcategoryStId = null,
  depth = 1,
  parentPath = ''
) {
  const results = [];
  
  if (!subcategories || !Array.isArray(subcategories)) {
    return results;
  }
  
  for (let i = 0; i < subcategories.length; i++) {
    const sub = subcategories[i];
    const path = parentPath ? `${parentPath}.${sub.id}` : `${categoryStId}.${sub.id}`;
    
    results.push({
      stId: sub.id,
      parentStId: categoryStId,  // Always references the root category
      parentSubcategoryStId,      // References parent subcategory (null for depth 1)
      tenantId,
      name: sub.name,
      imageUrl: sub.image || null,
      sortOrder: i,
      isActive: sub.active !== false,
      depth,
      path,
    });
    
    // Recursively process nested subcategories
    if (sub.subcategories && sub.subcategories.length > 0) {
      results.push(...extractAllSubcategories(
        sub.subcategories,
        categoryStId,
        tenantId,
        sub.id,  // This subcategory becomes the parent
        depth + 1,
        path
      ));
    }
  }
  
  return results;
}

function emitEvent(tenantId, event, data) {
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, data);
    console.log(`Emitted ${event} to tenant:${tenantId}`);
  }
}

// ============================================================================
// PG_NOTIFY LISTENER
// ============================================================================

async function startNotifyListener() {
  listenerClient = new Client({
    connectionString: DATABASE_URL,
    ssl: SSL_CONFIG,
  });

  await listenerClient.connect();
  await listenerClient.query('LISTEN pricebook_category_change');

  console.log('Listening for pricebook_category_change notifications');

  listenerClient.on('notification', async (msg) => {
    if (msg.channel !== 'pricebook_category_change' || !msg.payload) return;

    try {
      const payload = JSON.parse(msg.payload);
      console.log(`Received notification: ${payload.operation} for st_id ${payload.st_id}`);

      // Queue incremental sync job
      await pricebookCategorySyncQueue.add(
        `incremental-${payload.operation}-${payload.st_id}`,
        {
          type: 'incremental-sync',
          tenantId: payload.tenant_id,
          rawIds: [payload.raw_id],
          stIds: [payload.st_id],
          changeType: payload.operation,
        },
        {
          // Deduplicate rapid updates to same category
          jobId: `sync-${payload.st_id}-${Math.floor(Date.now() / 5000)}`,
        }
      );
    } catch (error) {
      console.error('Error processing notification:', error);
    }
  });

  listenerClient.on('error', (err) => {
    console.error('Listener client error:', err);
    // Attempt to reconnect
    setTimeout(startNotifyListener, 5000);
  });
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize the worker with Socket.io server
 */
export async function initializePricebookCategorySyncWorker(socketServer) {
  if (socketServer) {
    io = socketServer;
  }

  // Create queue and worker
  createQueue();
  createWorker();

  // Start pg_notify listener
  try {
    await startNotifyListener();
  } catch (e) {
    console.error('Failed to start pg_notify listener:', e.message);
  }

  console.log('Pricebook Category Sync Worker initialized');
}

/**
 * Queue a full sync job
 */
export async function queueFullSync(tenantId, categoryType) {
  if (!pricebookCategorySyncQueue) {
    throw new Error('Worker not initialized');
  }
  
  return pricebookCategorySyncQueue.add(
    `full-sync-${tenantId}-${categoryType || 'all'}`,
    {
      type: 'full-sync',
      tenantId,
      categoryType,
    },
    {
      jobId: `full-sync-${tenantId}-${categoryType || 'all'}-${Date.now()}`,
    }
  );
}

/**
 * Queue a single category sync
 */
export async function queueCategorySync(stId, tenantId) {
  if (!pricebookCategorySyncQueue) {
    throw new Error('Worker not initialized');
  }
  
  return pricebookCategorySyncQueue.add(
    `single-sync-${stId}`,
    {
      type: 'single-category-sync',
      stId,
      tenantId,
    }
  );
}

/**
 * Queue image downloads for categories missing images
 */
async function queueCategoryImages(tenantId, logger) {
  try {
    const result = await pool.query(`
      SELECT st_id, image as image_path
      FROM raw.st_pricebook_categories
      WHERE image IS NOT NULL 
        AND image != ''
        AND image_data IS NULL
        AND tenant_id = $1
      LIMIT 100
    `, [tenantId]);

    if (result.rows.length === 0) {
      logger.info('No category images to queue');
      return;
    }

    const items = result.rows.map(row => ({
      stId: row.st_id,
      imagePath: row.image_path,
      itemType: 'category',
    }));

    await queueImageDownloadBulk(items, tenantId);
    logger.info(`Queued ${items.length} category images for download`);
  } catch (error) {
    logger.error('Failed to queue category images', { error: error.message });
  }
}

/**
 * Shutdown gracefully
 */
export async function shutdownPricebookCategorySyncWorker() {
  console.log('Shutting down Pricebook Category Sync Worker...');

  if (listenerClient) {
    await listenerClient.end();
  }

  if (pricebookCategorySyncWorker) {
    await pricebookCategorySyncWorker.close();
  }
  
  if (pricebookCategorySyncQueue) {
    await pricebookCategorySyncQueue.close();
  }
  
  if (pool) {
    await pool.end();
  }

  console.log('Pricebook Category Sync Worker shutdown complete');
}

export default {
  initializePricebookCategorySyncWorker,
  queueFullSync,
  queueCategorySync,
  shutdownPricebookCategorySyncWorker,
};
