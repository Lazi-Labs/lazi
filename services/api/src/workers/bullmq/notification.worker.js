/**
 * Notification Worker
 * Processes email/SMS dispatch jobs
 */

import { Worker } from 'bullmq';
import { redisConnectionConfig } from '../../queues/connection.js';
import { QUEUE_NAMES } from '../../queues/index.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('notification-worker');

// Notification job types
export const NOTIFICATION_JOB_TYPES = {
  SEND_EMAIL: 'send-email',
  SEND_SMS: 'send-sms',
  SEND_SLACK: 'send-slack',
  WORKFLOW_NOTIFICATION: 'workflow-notification',
};

/**
 * Process notification jobs
 */
async function processJob(job) {
  const { name, data, id } = job;
  const startTime = Date.now();
  
  logger.info(`Processing notification: ${name}`, { jobId: id, type: data.type });
  
  try {
    let result;
    
    switch (data.type) {
      case NOTIFICATION_JOB_TYPES.SEND_EMAIL:
        result = await sendEmail(job, data);
        break;
        
      case NOTIFICATION_JOB_TYPES.SEND_SMS:
        result = await sendSMS(job, data);
        break;
        
      case NOTIFICATION_JOB_TYPES.SEND_SLACK:
        result = await sendSlack(job, data);
        break;
        
      case NOTIFICATION_JOB_TYPES.WORKFLOW_NOTIFICATION:
        result = await sendWorkflowNotification(job, data);
        break;
        
      default:
        throw new Error(`Unknown notification type: ${data.type}`);
    }
    
    const duration = Date.now() - startTime;
    logger.info(`Notification sent: ${name}`, { 
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
    logger.error(`Notification failed: ${name}`, { 
      jobId: id, 
      duration: `${duration}ms`,
      error: error.message 
    });
    
    throw error;
  }
}

/**
 * Send email notification
 */
async function sendEmail(job, data) {
  const { to, subject, body, template, templateData } = data;
  
  logger.info('Sending email', { to, subject });
  
  // TODO: Implement email sending (SendGrid, AWS SES, etc.)
  // For now, just log it
  
  await job.updateProgress(100);
  
  return {
    type: 'email',
    to,
    subject,
    status: 'pending-implementation',
  };
}

/**
 * Send SMS notification
 */
async function sendSMS(job, data) {
  const { to, message } = data;
  
  logger.info('Sending SMS', { to, messageLength: message?.length });
  
  // TODO: Implement SMS sending (Twilio, etc.)
  
  await job.updateProgress(100);
  
  return {
    type: 'sms',
    to,
    status: 'pending-implementation',
  };
}

/**
 * Send Slack notification
 */
async function sendSlack(job, data) {
  const { channel, message, blocks } = data;
  
  logger.info('Sending Slack message', { channel });
  
  try {
    // Use existing Slack integration if available
    const { WebClient } = await import('@slack/web-api');
    
    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken) {
      logger.warn('SLACK_BOT_TOKEN not configured');
      return {
        type: 'slack',
        channel,
        status: 'skipped-no-token',
      };
    }
    
    const client = new WebClient(slackToken);
    
    await client.chat.postMessage({
      channel,
      text: message,
      blocks,
    });
    
    await job.updateProgress(100);
    
    return {
      type: 'slack',
      channel,
      status: 'sent',
    };
    
  } catch (error) {
    logger.error('Slack send failed', { error: error.message });
    throw error;
  }
}

/**
 * Send workflow-triggered notification
 */
async function sendWorkflowNotification(job, data) {
  const { workflowId, stepId, notificationType, recipient, content } = data;
  
  logger.info('Sending workflow notification', { 
    workflowId, 
    stepId, 
    notificationType 
  });
  
  // Route to appropriate notification method
  switch (notificationType) {
    case 'email':
      return sendEmail(job, { to: recipient, ...content });
    case 'sms':
      return sendSMS(job, { to: recipient, message: content.message });
    case 'slack':
      return sendSlack(job, { channel: recipient, ...content });
    default:
      throw new Error(`Unknown workflow notification type: ${notificationType}`);
  }
}

// Worker instance
let worker = null;

/**
 * Start the notification worker
 */
export function startWorker() {
  if (worker) {
    logger.warn('Notification worker already running');
    return worker;
  }
  
  worker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    processJob,
    {
      ...redisConnectionConfig,
      concurrency: 5, // Allow 5 concurrent notifications
    }
  );
  
  // Event handlers
  worker.on('completed', (job, result) => {
    logger.info(`Notification completed: ${job.name}`, { 
      jobId: job.id,
      type: result?.type
    });
  });
  
  worker.on('failed', (job, error) => {
    logger.error(`Notification failed: ${job?.name}`, { 
      jobId: job?.id,
      error: error.message,
      attemptsMade: job?.attemptsMade
    });
  });
  
  worker.on('error', (error) => {
    logger.error('Notification worker error', { error: error.message });
  });
  
  logger.info('Notification worker started');
  return worker;
}

/**
 * Stop the worker gracefully
 */
export async function stopWorker() {
  if (!worker) {
    return;
  }
  
  logger.info('Stopping notification worker...');
  await worker.close();
  worker = null;
  logger.info('Notification worker stopped');
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
  NOTIFICATION_JOB_TYPES,
  startWorker,
  stopWorker,
  getWorkerStatus,
};
