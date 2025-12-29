/**
 * Image Download Queue Configuration
 * 
 * Handles async downloading of pricebook images from ServiceTitan
 */

import { Queue } from 'bullmq';
import { getRedisConnection } from './connection.js';

const QUEUE_NAME = 'pricebook-image-download';

const queueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 1000,
      age: 86400,
    },
    removeOnFail: {
      count: 500,
      age: 604800,
    },
  },
};

const imageDownloadQueue = new Queue(QUEUE_NAME, queueOptions);

/**
 * Add an image download job to the queue
 * 
 * @param {Object} data - Job data
 * @param {BigInt|string} data.stId - ServiceTitan item ID
 * @param {string} data.imagePath - Image path from ST (e.g., "Images/Category/xxx.jpg")
 * @param {string} data.itemType - Type: 'category', 'service', 'material', 'equipment'
 * @param {string} data.tenantId - Tenant ID
 * @param {Object} options - Optional job options
 */
export async function queueImageDownload(data, options = {}) {
  const { stId, imagePath, itemType, tenantId } = data;
  
  if (!imagePath) {
    console.log(`[ImageQueue] Skipping st_id=${stId} - no image path`);
    return null;
  }

  const jobId = `${itemType}-${stId}`;
  
  const job = await imageDownloadQueue.add('download', {
    stId: stId.toString(),
    imagePath,
    itemType,
    tenantId: tenantId.toString(),
    queuedAt: new Date().toISOString(),
  }, {
    jobId,
    ...options,
  });

  console.log(`[ImageQueue] Queued ${itemType} image: st_id=${stId}, jobId=${job.id}`);
  return job;
}

/**
 * Add multiple image download jobs in bulk
 * 
 * @param {Array} items - Array of {stId, imagePath, itemType}
 * @param {string} tenantId - Tenant ID
 */
export async function queueImageDownloadBulk(items, tenantId) {
  const jobs = items
    .filter(item => item.imagePath)
    .map(item => ({
      name: 'download',
      data: {
        stId: item.stId.toString(),
        imagePath: item.imagePath,
        itemType: item.itemType,
        tenantId: tenantId.toString(),
        queuedAt: new Date().toISOString(),
      },
      opts: {
        jobId: `${item.itemType}-${item.stId}`,
      },
    }));

  if (jobs.length === 0) {
    console.log('[ImageQueue] No images to queue');
    return [];
  }

  const result = await imageDownloadQueue.addBulk(jobs);
  console.log(`[ImageQueue] Queued ${result.length} image downloads`);
  return result;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    imageDownloadQueue.getWaitingCount(),
    imageDownloadQueue.getActiveCount(),
    imageDownloadQueue.getCompletedCount(),
    imageDownloadQueue.getFailedCount(),
    imageDownloadQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Clear all jobs from the queue
 */
export async function clearQueue() {
  await imageDownloadQueue.obliterate({ force: true });
  console.log('[ImageQueue] Queue cleared');
}

export { imageDownloadQueue, QUEUE_NAME };
