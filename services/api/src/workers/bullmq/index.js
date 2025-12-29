/**
 * BullMQ Workers Index
 * Central management for all workers
 */

import { startWorker as startInboundWorker, stopWorker as stopInboundWorker, getWorkerStatus as getInboundStatus } from './inbound-sync.worker.js';
import { startWorker as startOutboundWorker, stopWorker as stopOutboundWorker, getWorkerStatus as getOutboundStatus } from './outbound-sync.worker.js';
import { startWorker as startNotificationWorker, stopWorker as stopNotificationWorker, getWorkerStatus as getNotificationStatus } from './notification.worker.js';
import { startWorker as startWorkflowWorker, stopWorker as stopWorkflowWorker, getWorkerStatus as getWorkflowStatus } from './workflow.worker.js';
import { setupSchedules } from '../../queues/schedulers.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('workers');

/**
 * Start all workers
 */
export async function startAllWorkers() {
  logger.info('Starting all BullMQ workers...');
  
  try {
    // Start workers
    startInboundWorker();
    startOutboundWorker();
    startNotificationWorker();
    startWorkflowWorker();
    
    // Set up recurring job schedules
    await setupSchedules();
    
    logger.info('All workers started successfully');
    
    return {
      success: true,
      workers: getAllWorkerStatus(),
    };
    
  } catch (error) {
    logger.error('Failed to start workers', { error: error.message });
    throw error;
  }
}

/**
 * Stop all workers gracefully
 */
export async function stopAllWorkers() {
  logger.info('Stopping all BullMQ workers...');
  
  try {
    await Promise.all([
      stopInboundWorker(),
      stopOutboundWorker(),
      stopNotificationWorker(),
      stopWorkflowWorker(),
    ]);
    
    logger.info('All workers stopped');
    
    return { success: true };
    
  } catch (error) {
    logger.error('Error stopping workers', { error: error.message });
    throw error;
  }
}

/**
 * Get status of all workers
 */
export function getAllWorkerStatus() {
  return {
    inboundSync: getInboundStatus(),
    outboundSync: getOutboundStatus(),
    notifications: getNotificationStatus(),
    workflow: getWorkflowStatus(),
  };
}

export default {
  startAllWorkers,
  stopAllWorkers,
  getAllWorkerStatus,
};
