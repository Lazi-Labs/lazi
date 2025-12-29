/**
 * Workflow Execution Worker
 * Processes workflow execution jobs from the queue
 */

import { Worker } from 'bullmq';
import { redisConnectionConfig } from '../../queues/connection.js';
import { QUEUE_NAMES } from '../../queues/index.js';
import { executeWorkflow, initializeWorkflowEngine, isInitialized } from '../../services/workflow/index.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('workflow-worker');

/**
 * Process workflow execution jobs
 */
async function processJob(job) {
  const { name, data, id } = job;
  const startTime = Date.now();
  
  // Ensure workflow engine is initialized
  if (!isInitialized()) {
    initializeWorkflowEngine();
  }
  
  logger.info(`Processing workflow job: ${name}`, { jobId: id, data });
  
  try {
    const { instanceId } = data;
    
    if (!instanceId) {
      throw new Error('Workflow job missing instanceId');
    }
    
    // Execute the workflow
    const result = await executeWorkflow(instanceId);
    
    const duration = Date.now() - startTime;
    logger.info(`Workflow job completed: ${name}`, { 
      jobId: id, 
      instanceId,
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
    logger.error(`Workflow job failed: ${name}`, { 
      jobId: id, 
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack 
    });
    
    throw error;
  }
}

// Worker instance
let worker = null;

/**
 * Start the workflow worker
 */
export function startWorker() {
  if (worker) {
    logger.warn('Workflow worker already running');
    return worker;
  }
  
  // Initialize workflow engine
  if (!isInitialized()) {
    initializeWorkflowEngine();
  }
  
  worker = new Worker(
    QUEUE_NAMES.WORKFLOW_EXECUTION,
    processJob,
    {
      ...redisConnectionConfig,
      concurrency: 3, // Process up to 3 workflows concurrently
    }
  );
  
  // Event handlers
  worker.on('completed', (job, result) => {
    logger.info(`Workflow job completed: ${job.name}`, { 
      jobId: job.id,
      status: result?.status
    });
  });
  
  worker.on('failed', (job, error) => {
    logger.error(`Workflow job failed: ${job?.name}`, { 
      jobId: job?.id,
      error: error.message,
      attemptsMade: job?.attemptsMade
    });
  });
  
  worker.on('error', (error) => {
    logger.error('Workflow worker error', { error: error.message });
  });
  
  logger.info('Workflow worker started');
  return worker;
}

/**
 * Stop the worker gracefully
 */
export async function stopWorker() {
  if (!worker) {
    return;
  }
  
  logger.info('Stopping workflow worker...');
  await worker.close();
  worker = null;
  logger.info('Workflow worker stopped');
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
