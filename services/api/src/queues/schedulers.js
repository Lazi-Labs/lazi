/**
 * Job Schedulers
 * Recurring job schedules for sync operations
 */

// Note: QueueScheduler was removed in BullMQ v4+, workers handle scheduling automatically
import { redisConnectionConfig } from './connection.js';
import { getQueue, QUEUE_NAMES, addJob } from './index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('schedulers');

// Sync job types
export const SYNC_JOB_TYPES = {
  // Full sync jobs (run less frequently)
  FULL_SYNC_ALL: 'full-sync-all',
  FULL_SYNC_CUSTOMERS: 'full-sync-customers',
  FULL_SYNC_JOBS: 'full-sync-jobs',
  FULL_SYNC_ESTIMATES: 'full-sync-estimates',
  FULL_SYNC_INVOICES: 'full-sync-invoices',
  FULL_SYNC_PRICEBOOK: 'full-sync-pricebook',
  
  // Incremental sync jobs (run frequently)
  INCREMENTAL_SYNC: 'incremental-sync',
  INCREMENTAL_SYNC_CUSTOMERS: 'incremental-sync-customers',
  INCREMENTAL_SYNC_JOBS: 'incremental-sync-jobs',
  INCREMENTAL_SYNC_APPOINTMENTS: 'incremental-sync-appointments',
  
  // Reference data sync (run daily)
  SYNC_REFERENCE_DATA: 'sync-reference-data',
  SYNC_TECHNICIANS: 'sync-technicians',
  SYNC_BUSINESS_UNITS: 'sync-business-units',
  SYNC_JOB_TYPES: 'sync-job-types',
  SYNC_CAMPAIGNS: 'sync-campaigns',
};

// Schedule configurations
const scheduleConfigs = [
  // Incremental sync every 5 minutes
  {
    name: SYNC_JOB_TYPES.INCREMENTAL_SYNC,
    pattern: '*/5 * * * *', // Every 5 minutes
    data: { syncType: 'incremental' },
    options: { priority: 1 },
  },
  
  // Full sync daily at 2 AM
  {
    name: SYNC_JOB_TYPES.FULL_SYNC_ALL,
    pattern: '0 2 * * *', // 2:00 AM daily
    data: { syncType: 'full', includePricebook: true },
    options: { priority: 2 },
  },
  
  // Reference data sync every 6 hours
  {
    name: SYNC_JOB_TYPES.SYNC_REFERENCE_DATA,
    pattern: '0 */6 * * *', // Every 6 hours
    data: { syncType: 'reference' },
    options: { priority: 3 },
  },
  
  // Pricebook sync weekly on Sunday at 3 AM
  {
    name: SYNC_JOB_TYPES.FULL_SYNC_PRICEBOOK,
    pattern: '0 3 * * 0', // 3:00 AM Sunday
    data: { syncType: 'pricebook' },
    options: { priority: 4 },
  },
];

/**
 * Set up all recurring job schedules
 */
export async function setupSchedules() {
  const queue = getQueue(QUEUE_NAMES.INBOUND_SYNC);
  
  // Remove existing repeatable jobs first
  const existingJobs = await queue.getRepeatableJobs();
  for (const job of existingJobs) {
    await queue.removeRepeatableByKey(job.key);
    logger.info(`Removed existing schedule: ${job.name}`);
  }
  
  // Add new schedules
  for (const schedule of scheduleConfigs) {
    await queue.add(
      schedule.name,
      schedule.data,
      {
        repeat: { pattern: schedule.pattern },
        ...schedule.options,
      }
    );
    logger.info(`Schedule created: ${schedule.name} (${schedule.pattern})`);
  }
  
  logger.info(`${scheduleConfigs.length} schedules configured`);
}

/**
 * Trigger an immediate sync job
 */
export async function triggerSync(syncType, options = {}) {
  const jobName = `manual-${syncType}`;
  const data = { 
    syncType, 
    manual: true,
    triggeredAt: new Date().toISOString(),
    ...options 
  };
  
  const job = await addJob(QUEUE_NAMES.INBOUND_SYNC, jobName, data, {
    priority: 0, // Highest priority for manual triggers
  });
  
  logger.info(`Manual sync triggered: ${syncType}`, { jobId: job.id });
  return job;
}

/**
 * Get all scheduled jobs
 */
export async function getScheduledJobs() {
  const queue = getQueue(QUEUE_NAMES.INBOUND_SYNC);
  return queue.getRepeatableJobs();
}

/**
 * Pause all schedules
 */
export async function pauseSchedules() {
  const queue = getQueue(QUEUE_NAMES.INBOUND_SYNC);
  await queue.pause();
  logger.info('All schedules paused');
}

/**
 * Resume all schedules
 */
export async function resumeSchedules() {
  const queue = getQueue(QUEUE_NAMES.INBOUND_SYNC);
  await queue.resume();
  logger.info('All schedules resumed');
}

export default {
  SYNC_JOB_TYPES,
  setupSchedules,
  triggerSync,
  getScheduledJobs,
  pauseSchedules,
  resumeSchedules,
};
