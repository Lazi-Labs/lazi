/**
 * Send SMS Action Handler
 * Sends SMS notifications via configured provider
 */

import pg from 'pg';
import config from '../../../config/index.js';
import { addJob, QUEUE_NAMES } from '../../../queues/index.js';
import { createModuleLogger } from '../../../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('workflow-action-sms');

/**
 * Get messaging template from database
 */
async function getTemplate(templateName) {
  const pool = new Pool({
    connectionString: config.database.url,
    max: 1,
  });
  
  try {
    const result = await pool.query(`
      SELECT * FROM workflow.messaging_templates
      WHERE name = $1 AND channel = 'sms' AND active = true
    `, [templateName]);
    
    return result.rows[0] || null;
    
  } finally {
    await pool.end();
  }
}

/**
 * Get entity data for template variables
 */
async function getEntityData(entityType, entityId) {
  const pool = new Pool({
    connectionString: config.database.url,
    max: 1,
  });
  
  try {
    const tableMap = {
      customer: 'master.customers',
      job: 'master.jobs',
      invoice: 'master.invoices',
      estimate: 'master.estimates',
    };
    
    const table = tableMap[entityType];
    if (!table) return null;
    
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE st_id = $1`,
      [entityId]
    );
    
    return result.rows[0] || null;
    
  } finally {
    await pool.end();
  }
}

/**
 * Get customer phone number
 */
async function getCustomerPhone(customerId) {
  const pool = new Pool({
    connectionString: config.database.url,
    max: 1,
  });
  
  try {
    const result = await pool.query(`
      SELECT phone FROM master.customers WHERE st_id = $1
    `, [customerId]);
    
    return result.rows[0]?.phone || null;
    
  } finally {
    await pool.end();
  }
}

/**
 * Replace template variables with actual values
 */
function renderTemplate(template, variables) {
  let rendered = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(placeholder, value || '');
  }
  
  return rendered;
}

/**
 * Send SMS action handler
 */
export async function sendSmsAction(instance, step, context) {
  const { template: templateName, to, message, variables = {} } = step.config || {};
  
  // Get recipient phone number
  let phoneNumber = to;
  
  if (!phoneNumber) {
    // Try to get phone from entity
    if (instance.entity_type === 'customer') {
      phoneNumber = await getCustomerPhone(instance.entity_id);
    } else {
      // Get customer_id from entity and then get phone
      const entityData = await getEntityData(instance.entity_type, instance.entity_id);
      if (entityData?.customer_id) {
        phoneNumber = await getCustomerPhone(entityData.customer_id);
      }
    }
  }
  
  if (!phoneNumber) {
    throw new Error('No phone number available for SMS');
  }
  
  // Get message content
  let smsMessage = message;
  
  if (templateName && !smsMessage) {
    const template = await getTemplate(templateName);
    if (!template) {
      throw new Error(`SMS template not found: ${templateName}`);
    }
    
    // Get entity data for variables
    const entityData = await getEntityData(instance.entity_type, instance.entity_id);
    
    // Merge variables
    const allVariables = {
      ...entityData,
      ...context,
      ...variables,
    };
    
    smsMessage = renderTemplate(template.body_template, allVariables);
  }
  
  if (!smsMessage) {
    throw new Error('No message content for SMS');
  }
  
  // Queue SMS for sending via notification worker
  const job = await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-sms', {
    type: 'send-sms',
    to: phoneNumber,
    message: smsMessage,
    workflowInstanceId: instance.id,
    entityType: instance.entity_type,
    entityId: instance.entity_id,
  });
  
  logger.info('SMS queued for sending', {
    instanceId: instance.id,
    to: phoneNumber,
    messageLength: smsMessage.length,
    jobId: job.id,
  });
  
  return {
    queued: true,
    jobId: job.id,
    to: phoneNumber,
    messageLength: smsMessage.length,
  };
}

export default sendSmsAction;
