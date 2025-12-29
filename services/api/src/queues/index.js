/**
 * BullMQ Queue Definitions
 * Central registry of all job queues
 */

import { Queue } from 'bullmq';
import { redisConnectionConfig } from './connection.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('queues');

// Queue names
export const QUEUE_NAMES = {
  INBOUND_SYNC: 'inbound-sync',
  OUTBOUND_SYNC: 'outbound-sync',
  WORKFLOW_EXECUTION: 'workflow-execution',
  NOTIFICATIONS: 'notifications',
};

// Default job options
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: {
    age: 24 * 3600,    // Keep completed jobs for 24 hours
    count: 1000,       // Keep last 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
};

// Queue-specific configurations
const queueConfigs = {
  [QUEUE_NAMES.INBOUND_SYNC]: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 5,
      priority: 1, // Higher priority
    },
  },
  [QUEUE_NAMES.OUTBOUND_SYNC]: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      priority: 2,
    },
  },
  [QUEUE_NAMES.WORKFLOW_EXECUTION]: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      priority: 3,
    },
  },
  [QUEUE_NAMES.NOTIFICATIONS]: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 2,
      priority: 4,
    },
  },
};

// Queue instances cache
const queues = new Map();

/**
 * Get or create a queue instance
 */
export function getQueue(queueName) {
  if (!queues.has(queueName)) {
    const config = queueConfigs[queueName] || { defaultJobOptions };
    
    const queue = new Queue(queueName, {
      ...redisConnectionConfig,
      ...config,
    });
    
    queue.on('error', (err) => {
      logger.error(`Queue ${queueName} error`, { error: err.message });
    });
    
    queues.set(queueName, queue);
    logger.info(`Queue created: ${queueName}`);
  }
  
  return queues.get(queueName);
}

/**
 * Get all queue instances
 */
export function getAllQueues() {
  return Object.values(QUEUE_NAMES).map(name => getQueue(name));
}

/**
 * Add a job to a queue
 */
export async function addJob(queueName, jobName, data, options = {}) {
  const queue = getQueue(queueName);
  const job = await queue.add(jobName, data, options);
  
  logger.debug(`Job added to ${queueName}`, { 
    jobId: job.id, 
    jobName,
    data: JSON.stringify(data).slice(0, 100) 
  });
  
  return job;
}

/**
 * Close all queues gracefully
 */
export async function closeAllQueues() {
  const closePromises = [];
  
  for (const [name, queue] of queues) {
    logger.info(`Closing queue: ${name}`);
    closePromises.push(queue.close());
  }
  
  await Promise.all(closePromises);
  queues.clear();
  logger.info('All queues closed');
}

// Convenience functions for specific queues
export const inboundSyncQueue = () => getQueue(QUEUE_NAMES.INBOUND_SYNC);
export const outboundSyncQueue = () => getQueue(QUEUE_NAMES.OUTBOUND_SYNC);
export const workflowQueue = () => getQueue(QUEUE_NAMES.WORKFLOW_EXECUTION);
export const notificationQueue = () => getQueue(QUEUE_NAMES.NOTIFICATIONS);

export default {
  QUEUE_NAMES,
  getQueue,
  getAllQueues,
  addJob,
  closeAllQueues,
  inboundSyncQueue,
  outboundSyncQueue,
  workflowQueue,
  notificationQueue,
};
