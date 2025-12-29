/**
 * Workflow Manager
 * Main coordinator for the workflow system
 */

import { eventDetector } from './event-detector.js';
import { triggerEngine } from './trigger-engine.js';
import { executionEngine } from './execution-engine.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('workflow-manager');

export class WorkflowManager {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Workflow system already running');
      return;
    }

    logger.info('Starting workflow system...');

    // Connect event detector to trigger engine
    this.setupEventHandlers();

    // Start engines
    await eventDetector.start();
    await executionEngine.start();

    this.isRunning = true;
    logger.info('Workflow system started successfully');
  }

  setupEventHandlers() {
    // Estimate events
    eventDetector.on('estimate_created', (data) => {
      logger.debug('Handling estimate_created event');
      triggerEngine.handleEvent('estimate_created', data);
    });

    eventDetector.on('estimate_approved', async (data) => {
      logger.info('Handling estimate_approved event', { estimateId: data.estimateId });
      triggerEngine.handleEvent('estimate_approved', data);
    });

    eventDetector.on('estimate_rejected', (data) => {
      logger.debug('Handling estimate_rejected event');
      triggerEngine.handleEvent('estimate_rejected', data);
    });

    // Job events
    eventDetector.on('job_created', (data) => {
      logger.debug('Handling job_created event');
      triggerEngine.handleEvent('job_created', data);
    });

    eventDetector.on('job_completed', (data) => {
      logger.debug('Handling job_completed event');
      triggerEngine.handleEvent('job_completed', data);
    });

    // Invoice events
    eventDetector.on('invoice_created', (data) => {
      logger.debug('Handling invoice_created event');
      triggerEngine.handleEvent('invoice_created', data);
    });

    eventDetector.on('invoice_overdue', (data) => {
      logger.debug('Handling invoice_overdue event');
      triggerEngine.handleEvent('invoice_overdue', data);
    });

    // Appointment events
    eventDetector.on('appointment_created', (data) => {
      logger.debug('Handling appointment_created event');
      triggerEngine.handleEvent('appointment_created', data);
    });

    // Install job created
    eventDetector.on('install_job_created', async (data) => {
      logger.info('Handling install_job_created event', {
        jobId: data.jobId,
        customerId: data.customerId,
        businessUnit: data.businessUnit
      });
      triggerEngine.handleEvent('install_job_created', data);
    });

    logger.info('Event handlers configured');
  }

  async stop() {
    logger.info('Stopping workflow system...');

    eventDetector.stop();
    executionEngine.stop();

    this.isRunning = false;
    logger.info('Workflow system stopped');
  }

  isActive() {
    return this.isRunning;
  }
}

export const workflowManager = new WorkflowManager();

export default WorkflowManager;
