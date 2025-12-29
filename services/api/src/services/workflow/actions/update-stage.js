/**
 * Update Stage Action Handler
 * Updates entity stage/status in CRM or external systems
 */

import pg from 'pg';
import config from '../../../config/index.js';
import { addJob, QUEUE_NAMES } from '../../../queues/index.js';
import { createModuleLogger } from '../../../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('workflow-action-stage');

/**
 * Update stage action handler
 */
export async function updateStageAction(instance, step, context) {
  const { 
    stage, 
    stageId,
    pipelineId,
    syncToExternal = true,
    externalSystem = 'crm' 
  } = step.config || {};
  
  if (!stage && !stageId) {
    throw new Error('Update stage action requires stage or stageId in config');
  }
  
  const pool = new Pool({
    connectionString: config.database.url,
    max: 1,
  });
  
  try {
    // Update in CRM schema if we have a contact record
    const contactResult = await pool.query(`
      SELECT id FROM crm.contacts 
      WHERE st_customer_id = $1
      LIMIT 1
    `, [instance.entity_type === 'customer' ? instance.entity_id : context.customer_id]);
    
    if (contactResult.rows.length > 0) {
      await pool.query(`
        UPDATE crm.contacts 
        SET custom_stage = $1, updated_at = NOW()
        WHERE id = $2
      `, [stage || stageId, contactResult.rows[0].id]);
      
      logger.info('Stage updated in CRM', {
        instanceId: instance.id,
        contactId: contactResult.rows[0].id,
        stage: stage || stageId,
      });
    }
    
    // Queue sync to external system if enabled
    if (syncToExternal) {
      const job = await addJob(QUEUE_NAMES.OUTBOUND_SYNC, 'sync-stage', {
        type: `sync-to-${externalSystem}`,
        entityType: instance.entity_type,
        entityId: instance.entity_id,
        action: 'update-stage',
        data: {
          stage,
          stageId,
          pipelineId,
        },
        workflowInstanceId: instance.id,
      });
      
      logger.info('Stage sync queued', {
        instanceId: instance.id,
        externalSystem,
        jobId: job.id,
      });
      
      return {
        updated: true,
        stage: stage || stageId,
        syncQueued: true,
        syncJobId: job.id,
      };
    }
    
    return {
      updated: true,
      stage: stage || stageId,
      syncQueued: false,
    };
    
  } finally {
    await pool.end();
  }
}

export default updateStageAction;
