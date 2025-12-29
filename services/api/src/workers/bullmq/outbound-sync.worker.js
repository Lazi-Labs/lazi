/**
 * Outbound Sync Worker
 * Processes CRM → ServiceTitan API sync jobs
 */

import { Worker } from 'bullmq';
import { redisConnectionConfig } from '../../queues/connection.js';
import { QUEUE_NAMES } from '../../queues/index.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('outbound-sync-worker');

// Rate limiting for ST API writes
const RATE_LIMIT = {
  max: 2,
  duration: 1000,
};

// Outbound job types
export const OUTBOUND_JOB_TYPES = {
  UPDATE_CUSTOMER: 'update-customer',
  UPDATE_JOB: 'update-job',
  CREATE_ESTIMATE: 'create-estimate',
  UPDATE_ESTIMATE: 'update-estimate',
  SYNC_TO_PAYLOAD: 'sync-to-payload',
};

/**
 * Process outbound sync jobs
 */
async function processJob(job) {
  const { name, data, id } = job;
  const startTime = Date.now();
  
  logger.info(`Processing outbound job: ${name}`, { jobId: id, data });
  
  try {
    let result;
    
    switch (data.type) {
      case OUTBOUND_JOB_TYPES.UPDATE_CUSTOMER:
        result = await updateCustomerInST(job, data);
        break;
        
      case OUTBOUND_JOB_TYPES.UPDATE_JOB:
        result = await updateJobInST(job, data);
        break;
        
      case OUTBOUND_JOB_TYPES.CREATE_ESTIMATE:
        result = await createEstimateInST(job, data);
        break;
        
      case OUTBOUND_JOB_TYPES.UPDATE_ESTIMATE:
        result = await updateEstimateInST(job, data);
        break;
        
      case OUTBOUND_JOB_TYPES.SYNC_TO_PAYLOAD:
        result = await syncToPayload(job, data);
        break;
        
      default:
        throw new Error(`Unknown outbound job type: ${data.type}`);
    }
    
    const duration = Date.now() - startTime;
    logger.info(`Outbound job completed: ${name}`, { 
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
    logger.error(`Outbound job failed: ${name}`, { 
      jobId: id, 
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack 
    });
    
    throw error;
  }
}

/**
 * Update customer in ServiceTitan
 */
async function updateCustomerInST(job, data) {
  const { customerId, updates } = data;
  
  logger.info('Updating customer in ST', { customerId, updates });
  
  // TODO: Implement ST API call
  // const { stRequest } = await import('../../services/stClient.js');
  // await stRequest(`/crm/v2/tenant/{tenant}/customers/${customerId}`, {
  //   method: 'PATCH',
  //   body: updates,
  // });
  
  await job.updateProgress(100);
  
  return {
    type: 'update-customer',
    customerId,
    status: 'pending-implementation',
  };
}

/**
 * Update job in ServiceTitan
 */
async function updateJobInST(job, data) {
  const { jobId, updates } = data;
  
  logger.info('Updating job in ST', { jobId, updates });
  
  // TODO: Implement ST API call
  
  await job.updateProgress(100);
  
  return {
    type: 'update-job',
    jobId,
    status: 'pending-implementation',
  };
}

/**
 * Create estimate in ServiceTitan
 */
async function createEstimateInST(job, data) {
  const { estimate } = data;
  
  logger.info('Creating estimate in ST', { estimate });
  
  // TODO: Implement ST API call
  
  await job.updateProgress(100);
  
  return {
    type: 'create-estimate',
    status: 'pending-implementation',
  };
}

/**
 * Update estimate in ServiceTitan
 */
async function updateEstimateInST(job, data) {
  const { estimateId, updates } = data;
  
  logger.info('Updating estimate in ST', { estimateId, updates });
  
  // TODO: Implement ST API call
  
  await job.updateProgress(100);
  
  return {
    type: 'update-estimate',
    estimateId,
    status: 'pending-implementation',
  };
}

/**
 * Sync data to Payload CMS
 */
async function syncToPayload(job, data) {
  const { entityType, entityId, action } = data;
  
  logger.info('Syncing to Payload', { entityType, entityId, action });
  
  // TODO: Implement Payload API call
  
  await job.updateProgress(100);
  
  return {
    type: 'sync-to-payload',
    entityType,
    entityId,
    status: 'pending-implementation',
  };
}

// Worker instance
let worker = null;

/**
 * Start the outbound sync worker
 */
export function startWorker() {
  if (worker) {
    logger.warn('Outbound worker already running');
    return worker;
  }
  
  worker = new Worker(
    QUEUE_NAMES.OUTBOUND_SYNC,
    processJob,
    {
      ...redisConnectionConfig,
      concurrency: 2, // Allow 2 concurrent outbound syncs
      limiter: RATE_LIMIT,
    }
  );
  
  // Event handlers
  worker.on('completed', (job, result) => {
    logger.info(`Outbound job completed: ${job.name}`, { 
      jobId: job.id,
      result: JSON.stringify(result).slice(0, 200)
    });
  });
  
  worker.on('failed', (job, error) => {
    logger.error(`Outbound job failed: ${job?.name}`, { 
      jobId: job?.id,
      error: error.message,
      attemptsMade: job?.attemptsMade
    });
  });
  
  worker.on('error', (error) => {
    logger.error('Outbound worker error', { error: error.message });
  });
  
  logger.info('Outbound sync worker started');
  return worker;
}

/**
 * Stop the worker gracefully
 */
export async function stopWorker() {
  if (!worker) {
    return;
  }
  
  logger.info('Stopping outbound sync worker...');
  await worker.close();
  worker = null;
  logger.info('Outbound sync worker stopped');
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
  OUTBOUND_JOB_TYPES,
  startWorker,
  stopWorker,
  getWorkerStatus,
};
