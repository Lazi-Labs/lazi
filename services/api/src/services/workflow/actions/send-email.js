/**
 * Send Email Action Handler
 * Sends email notifications via configured provider
 */

import pg from 'pg';
import config from '../../../config/index.js';
import { addJob, QUEUE_NAMES } from '../../../queues/index.js';
import { createModuleLogger } from '../../../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('workflow-action-email');

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
      WHERE name = $1 AND channel = 'email' AND active = true
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
 * Get customer email
 */
async function getCustomerEmail(customerId) {
  const pool = new Pool({
    connectionString: config.database.url,
    max: 1,
  });
  
  try {
    const result = await pool.query(`
      SELECT email FROM master.customers WHERE st_id = $1
    `, [customerId]);
    
    return result.rows[0]?.email || null;
    
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
 * Send email action handler
 */
export async function sendEmailAction(instance, step, context) {
  const { 
    template: templateName, 
    to, 
    subject, 
    body, 
    variables = {} 
  } = step.config || {};
  
  // Get recipient email
  let emailAddress = to;
  
  if (!emailAddress) {
    // Try to get email from entity
    if (instance.entity_type === 'customer') {
      emailAddress = await getCustomerEmail(instance.entity_id);
    } else {
      // Get customer_id from entity and then get email
      const entityData = await getEntityData(instance.entity_type, instance.entity_id);
      if (entityData?.customer_id) {
        emailAddress = await getCustomerEmail(entityData.customer_id);
      }
    }
  }
  
  if (!emailAddress) {
    throw new Error('No email address available');
  }
  
  // Get email content
  let emailSubject = subject;
  let emailBody = body;
  
  if (templateName && (!emailSubject || !emailBody)) {
    const template = await getTemplate(templateName);
    if (!template) {
      throw new Error(`Email template not found: ${templateName}`);
    }
    
    // Get entity data for variables
    const entityData = await getEntityData(instance.entity_type, instance.entity_id);
    
    // Merge variables
    const allVariables = {
      ...entityData,
      ...context,
      ...variables,
    };
    
    emailSubject = emailSubject || renderTemplate(template.subject_template, allVariables);
    emailBody = emailBody || renderTemplate(template.body_template, allVariables);
  }
  
  if (!emailSubject || !emailBody) {
    throw new Error('No subject or body for email');
  }
  
  // Queue email for sending via notification worker
  const job = await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
    type: 'send-email',
    to: emailAddress,
    subject: emailSubject,
    body: emailBody,
    workflowInstanceId: instance.id,
    entityType: instance.entity_type,
    entityId: instance.entity_id,
  });
  
  logger.info('Email queued for sending', {
    instanceId: instance.id,
    to: emailAddress,
    subject: emailSubject,
    jobId: job.id,
  });
  
  return {
    queued: true,
    jobId: job.id,
    to: emailAddress,
    subject: emailSubject,
  };
}

export default sendEmailAction;
