/**
 * Inbound Sync Worker
 * Processes ServiceTitan API → raw tables sync jobs
 */

import { Worker } from 'bullmq';
import { redisConnectionConfig } from '../../queues/connection.js';
import { QUEUE_NAMES } from '../../queues/index.js';
import { SYNC_JOB_TYPES } from '../../queues/schedulers.js';
import { syncAllRaw } from '../servicetitan-sync/fetchers/index.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('inbound-sync-worker');

// Rate limiting: 5 requests per second to ST API
const RATE_LIMIT = {
  max: 5,
  duration: 1000,
};

/**
 * Process sync jobs
 */
async function processJob(job) {
  const { name, data, id } = job;
  const startTime = Date.now();
  
  logger.info(`Processing job: ${name}`, { jobId: id, data });
  
  try {
    let result;
    
    switch (data.syncType) {
      case 'full':
        result = await runFullSync(job, data);
        break;
        
      case 'incremental':
        result = await runIncrementalSync(job, data);
        break;
        
      case 'reference':
        result = await runReferenceSync(job, data);
        break;
        
      case 'pricebook':
        result = await runPricebookSync(job, data);
        break;
        
      case 'customers':
        result = await runCustomerSync(job, data);
        break;
        
      case 'jobs':
        result = await runJobSync(job, data);
        break;
        
      case 'estimates':
        result = await runEstimateSync(job, data);
        break;
        
      case 'invoices':
        result = await runInvoiceSync(job, data);
        break;
        
      default:
        // Default to full sync
        result = await runFullSync(job, data);
    }
    
    const duration = Date.now() - startTime;
    logger.info(`Job completed: ${name}`, { 
      jobId: id, 
      duration: `${duration}ms`,
      result 
    });
    
    return {
      success: true,
      duration,
      ...result,
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Job failed: ${name}`, { 
      jobId: id, 
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack 
    });
    
    throw error;
  }
}

/**
 * Run full sync of all raw tables
 */
async function runFullSync(job, data) {
  await job.updateProgress(5);
  
  const options = {
    includePricebook: data.includePricebook !== false,
  };
  
  logger.info('Starting full sync', options);
  
  const results = await syncAllRaw(options);
  
  await job.updateProgress(100);
  
  return {
    type: 'full',
    results,
  };
}

/**
 * Run incremental sync (recent changes only)
 */
async function runIncrementalSync(job, data) {
  await job.updateProgress(5);
  
  // Import the incremental sync functions
  const { syncAllRaw } = await import('../servicetitan-sync/fetchers/index.js');
  
  // For incremental, we use modifiedOnOrAfter parameter
  // Default to last 15 minutes if not specified
  const since = data.since || new Date(Date.now() - 15 * 60 * 1000).toISOString();
  
  logger.info('Starting incremental sync', { since });
  
  const results = await syncAllRaw({
    includePricebook: false, // Skip pricebook for incremental
    queryParams: {
      modifiedOnOrAfter: since,
    },
  });
  
  await job.updateProgress(100);
  
  return {
    type: 'incremental',
    since,
    results,
  };
}

/**
 * Run reference data sync (technicians, business units, etc.)
 */
async function runReferenceSync(job, data) {
  await job.updateProgress(5);
  
  const { syncAllSettings } = await import('../servicetitan-sync/fetchers/settings-fetchers.js');
  
  logger.info('Starting reference data sync');
  
  const results = await syncAllSettings();
  
  await job.updateProgress(100);
  
  return {
    type: 'reference',
    results,
  };
}

/**
 * Run pricebook sync
 */
async function runPricebookSync(job, data) {
  await job.updateProgress(5);
  
  const { syncAllPricebook } = await import('../servicetitan-sync/fetchers/pricebook-fetchers.js');
  
  logger.info('Starting pricebook sync');
  
  const results = await syncAllPricebook();
  
  await job.updateProgress(100);
  
  return {
    type: 'pricebook',
    results,
  };
}

/**
 * Run customer sync only
 */
async function runCustomerSync(job, data) {
  await job.updateProgress(5);
  
  const { syncAllCRM } = await import('../servicetitan-sync/fetchers/crm-fetchers.js');
  
  logger.info('Starting customer sync');
  
  const results = await syncAllCRM();
  
  await job.updateProgress(100);
  
  return {
    type: 'customers',
    results,
  };
}

/**
 * Run job sync only
 */
async function runJobSync(job, data) {
  await job.updateProgress(5);
  
  const { syncAllJPM } = await import('../servicetitan-sync/fetchers/jpm-fetchers.js');
  
  logger.info('Starting job sync');
  
  const results = await syncAllJPM();
  
  await job.updateProgress(100);
  
  return {
    type: 'jobs',
    results,
  };
}

/**
 * Run estimate sync only
 */
async function runEstimateSync(job, data) {
  await job.updateProgress(5);
  
  const { EstimatesFetcher } = await import('../servicetitan-sync/fetchers/other-fetchers.js');
  
  logger.info('Starting estimate sync');
  
  const fetcher = new EstimatesFetcher();
  try {
    const results = await fetcher.fullSync();
    return {
      type: 'estimates',
      results,
    };
  } finally {
    await fetcher.close();
  }
}

/**
 * Run invoice sync only
 */
async function runInvoiceSync(job, data) {
  await job.updateProgress(5);
  
  const { syncAllAccounting } = await import('../servicetitan-sync/fetchers/accounting-fetchers.js');
  
  logger.info('Starting invoice sync');
  
  const results = await syncAllAccounting();
  
  await job.updateProgress(100);
  
  return {
    type: 'invoices',
    results,
  };
}

// Worker instance
let worker = null;

/**
 * Start the inbound sync worker
 */
export function startWorker() {
  if (worker) {
    logger.warn('Worker already running');
    return worker;
  }
  
  worker = new Worker(
    QUEUE_NAMES.INBOUND_SYNC,
    processJob,
    {
      ...redisConnectionConfig,
      concurrency: 1, // Process one sync at a time
      limiter: RATE_LIMIT,
    }
  );
  
  // Event handlers
  worker.on('completed', (job, result) => {
    logger.info(`Job completed: ${job.name}`, { 
      jobId: job.id,
      result: JSON.stringify(result).slice(0, 200)
    });
  });
  
  worker.on('failed', (job, error) => {
    logger.error(`Job failed: ${job?.name}`, { 
      jobId: job?.id,
      error: error.message,
      attemptsMade: job?.attemptsMade,
      attemptsMax: job?.opts?.attempts
    });
  });
  
  worker.on('progress', (job, progress) => {
    logger.debug(`Job progress: ${job.name}`, { jobId: job.id, progress });
  });
  
  worker.on('error', (error) => {
    logger.error('Worker error', { error: error.message });
  });
  
  logger.info('Inbound sync worker started');
  return worker;
}

/**
 * Stop the worker gracefully
 */
export async function stopWorker() {
  if (!worker) {
    return;
  }
  
  logger.info('Stopping inbound sync worker...');
  await worker.close();
  worker = null;
  logger.info('Inbound sync worker stopped');
}

/**
 * Get worker status
 */
export function getWorkerStatus() {
  if (!worker) {
    return { running: false };
  }
  
  return {
    running: true,
    name: worker.name,
    concurrency: worker.opts.concurrency,
  };
}

export default {
  startWorker,
  stopWorker,
  getWorkerStatus,
};
