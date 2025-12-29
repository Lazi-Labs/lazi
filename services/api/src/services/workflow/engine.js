/**
 * Workflow Engine
 * Core engine for executing workflow definitions
 */

import pg from 'pg';
import config from '../../config/index.js';
import { addJob, QUEUE_NAMES } from '../../queues/index.js';
import { createModuleLogger } from '../../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('workflow-engine');

// Workflow statuses
export const WORKFLOW_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Step statuses
export const STEP_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};

// Action handlers registry
const actionHandlers = new Map();

/**
 * Register an action handler
 */
export function registerActionHandler(actionType, handler) {
  actionHandlers.set(actionType, handler);
  logger.info(`Action handler registered: ${actionType}`);
}

/**
 * Get database pool
 */
function getPool() {
  return new Pool({
    connectionString: config.database.url,
    max: 5,
  });
}

/**
 * Trigger workflows for an event
 */
export async function triggerWorkflows(eventName, entityType, entityId, context = {}) {
  const pool = getPool();
  
  try {
    logger.info('Triggering workflows', { eventName, entityType, entityId });
    
    // Find enabled workflows for this event
    const result = await pool.query(`
      SELECT d.* 
      FROM workflow.definitions d
      JOIN workflow.triggers t ON t.definition_id = d.id
      WHERE t.event_name = $1 
        AND t.enabled = true 
        AND d.enabled = true
      ORDER BY t.priority DESC
    `, [eventName]);
    
    if (result.rows.length === 0) {
      logger.debug('No workflows found for event', { eventName });
      return [];
    }
    
    const instances = [];
    
    for (const definition of result.rows) {
      // Check trigger conditions
      if (!evaluateConditions(definition.trigger_conditions, context)) {
        logger.debug('Workflow conditions not met', { 
          workflowId: definition.id, 
          name: definition.name 
        });
        continue;
      }
      
      // Create workflow instance
      const instance = await createInstance(pool, definition, entityType, entityId, context);
      instances.push(instance);
      
      // Queue the workflow for execution
      await addJob(QUEUE_NAMES.WORKFLOW_EXECUTION, 'execute-workflow', {
        instanceId: instance.id,
        definitionId: definition.id,
      });
      
      logger.info('Workflow triggered', { 
        instanceId: instance.id, 
        workflowName: definition.name,
        entityType,
        entityId 
      });
    }
    
    return instances;
    
  } catch (error) {
    logger.error('Error triggering workflows', { 
      eventName, 
      entityType, 
      entityId, 
      error: error.message 
    });
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Create a workflow instance
 */
async function createInstance(pool, definition, entityType, entityId, context) {
  const result = await pool.query(`
    INSERT INTO workflow.instances (
      definition_id, definition_version, entity_type, entity_id,
      status, context, triggered_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    definition.id,
    definition.version,
    entityType,
    entityId,
    WORKFLOW_STATUS.PENDING,
    JSON.stringify(context),
    'system',
  ]);
  
  return result.rows[0];
}

/**
 * Execute a workflow instance
 */
export async function executeWorkflow(instanceId) {
  const pool = getPool();
  
  try {
    // Get instance with definition
    const instanceResult = await pool.query(`
      SELECT i.*, d.steps, d.max_retries, d.retry_delay_seconds, d.timeout_seconds
      FROM workflow.instances i
      JOIN workflow.definitions d ON d.id = i.definition_id
      WHERE i.id = $1
    `, [instanceId]);
    
    if (instanceResult.rows.length === 0) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }
    
    const instance = instanceResult.rows[0];
    const steps = instance.steps;
    
    // Update status to running
    await pool.query(`
      UPDATE workflow.instances 
      SET status = $1, started_at = COALESCE(started_at, NOW()), updated_at = NOW()
      WHERE id = $2
    `, [WORKFLOW_STATUS.RUNNING, instanceId]);
    
    logger.info('Executing workflow', { 
      instanceId, 
      currentStep: instance.current_step,
      totalSteps: steps.length 
    });
    
    // Execute steps starting from current_step
    for (let i = instance.current_step; i < steps.length; i++) {
      const step = steps[i];
      
      // Check if workflow was cancelled or paused
      const statusCheck = await pool.query(
        'SELECT status FROM workflow.instances WHERE id = $1',
        [instanceId]
      );
      
      if (statusCheck.rows[0].status === WORKFLOW_STATUS.CANCELLED) {
        logger.info('Workflow cancelled', { instanceId });
        return { status: WORKFLOW_STATUS.CANCELLED };
      }
      
      if (statusCheck.rows[0].status === WORKFLOW_STATUS.PAUSED) {
        logger.info('Workflow paused', { instanceId });
        return { status: WORKFLOW_STATUS.PAUSED };
      }
      
      // Execute the step
      const stepResult = await executeStep(pool, instance, i, step);
      
      // Update current step
      await pool.query(`
        UPDATE workflow.instances 
        SET current_step = $1, 
            step_results = step_results || $2::jsonb,
            updated_at = NOW()
        WHERE id = $3
      `, [i + 1, JSON.stringify([stepResult]), instanceId]);
      
      // Handle step result
      if (stepResult.status === STEP_STATUS.FAILED) {
        await pool.query(`
          UPDATE workflow.instances 
          SET status = $1, error_message = $2, completed_at = NOW(), updated_at = NOW()
          WHERE id = $3
        `, [WORKFLOW_STATUS.FAILED, stepResult.error, instanceId]);
        
        logger.error('Workflow failed at step', { 
          instanceId, 
          stepIndex: i, 
          stepName: step.name,
          error: stepResult.error 
        });
        
        return { status: WORKFLOW_STATUS.FAILED, error: stepResult.error };
      }
      
      // Handle delay action - schedule next step
      if (step.action === 'delay' && stepResult.delayUntil) {
        await pool.query(`
          UPDATE workflow.instances 
          SET next_step_at = $1, updated_at = NOW()
          WHERE id = $2
        `, [stepResult.delayUntil, instanceId]);
        
        // Queue delayed execution
        const delayMs = new Date(stepResult.delayUntil).getTime() - Date.now();
        await addJob(QUEUE_NAMES.WORKFLOW_EXECUTION, 'execute-workflow', {
          instanceId,
          definitionId: instance.definition_id,
        }, { delay: Math.max(0, delayMs) });
        
        logger.info('Workflow delayed', { 
          instanceId, 
          delayUntil: stepResult.delayUntil 
        });
        
        return { status: WORKFLOW_STATUS.RUNNING, delayed: true };
      }
      
      // Handle condition that evaluates to false - skip remaining steps
      if (step.action === 'condition' && stepResult.conditionMet === false) {
        logger.info('Workflow condition not met, completing', { instanceId, stepIndex: i });
        break;
      }
    }
    
    // Workflow completed
    await pool.query(`
      UPDATE workflow.instances 
      SET status = $1, completed_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `, [WORKFLOW_STATUS.COMPLETED, instanceId]);
    
    logger.info('Workflow completed', { instanceId });
    
    return { status: WORKFLOW_STATUS.COMPLETED };
    
  } catch (error) {
    logger.error('Error executing workflow', { instanceId, error: error.message });
    
    await pool.query(`
      UPDATE workflow.instances 
      SET status = $1, error_message = $2, completed_at = NOW(), updated_at = NOW()
      WHERE id = $3
    `, [WORKFLOW_STATUS.FAILED, error.message, instanceId]);
    
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Execute a single workflow step
 */
async function executeStep(pool, instance, stepIndex, step) {
  const startTime = Date.now();
  
  // Log step start
  const logResult = await pool.query(`
    INSERT INTO workflow.step_logs (
      instance_id, step_index, step_name, action_type, action_config, status, started_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id
  `, [
    instance.id,
    stepIndex,
    step.name,
    step.action,
    JSON.stringify(step.config || {}),
    STEP_STATUS.RUNNING,
  ]);
  
  const logId = logResult.rows[0].id;
  
  try {
    // Get action handler
    const handler = actionHandlers.get(step.action);
    
    if (!handler) {
      throw new Error(`Unknown action type: ${step.action}`);
    }
    
    // Execute action
    const result = await handler(instance, step, instance.context);
    
    const duration = Date.now() - startTime;
    
    // Update log with success
    await pool.query(`
      UPDATE workflow.step_logs 
      SET status = $1, result = $2, completed_at = NOW(), duration_ms = $3
      WHERE id = $4
    `, [STEP_STATUS.COMPLETED, JSON.stringify(result), duration, logId]);
    
    return {
      status: STEP_STATUS.COMPLETED,
      ...result,
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Update log with failure
    await pool.query(`
      UPDATE workflow.step_logs 
      SET status = $1, error_message = $2, completed_at = NOW(), duration_ms = $3
      WHERE id = $4
    `, [STEP_STATUS.FAILED, error.message, duration, logId]);
    
    return {
      status: STEP_STATUS.FAILED,
      error: error.message,
    };
  }
}

/**
 * Evaluate trigger conditions against context
 */
function evaluateConditions(conditions, context) {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }
  
  for (const [field, condition] of Object.entries(conditions)) {
    const value = context[field];
    
    if (typeof condition === 'object') {
      // Handle operators like $eq, $ne, $gt, $lt, $in
      for (const [op, expected] of Object.entries(condition)) {
        switch (op) {
          case '$eq':
            if (value !== expected) return false;
            break;
          case '$ne':
            if (value === expected) return false;
            break;
          case '$gt':
            if (!(value > expected)) return false;
            break;
          case '$gte':
            if (!(value >= expected)) return false;
            break;
          case '$lt':
            if (!(value < expected)) return false;
            break;
          case '$lte':
            if (!(value <= expected)) return false;
            break;
          case '$in':
            if (!Array.isArray(expected) || !expected.includes(value)) return false;
            break;
          case '$nin':
            if (Array.isArray(expected) && expected.includes(value)) return false;
            break;
        }
      }
    } else {
      // Simple equality check
      if (value !== condition) return false;
    }
  }
  
  return true;
}

/**
 * Cancel a workflow instance
 */
export async function cancelWorkflow(instanceId) {
  const pool = getPool();
  
  try {
    await pool.query(`
      UPDATE workflow.instances 
      SET status = $1, completed_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND status IN ($3, $4)
    `, [WORKFLOW_STATUS.CANCELLED, instanceId, WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.RUNNING]);
    
    logger.info('Workflow cancelled', { instanceId });
    
  } finally {
    await pool.end();
  }
}

/**
 * Pause a workflow instance
 */
export async function pauseWorkflow(instanceId) {
  const pool = getPool();
  
  try {
    await pool.query(`
      UPDATE workflow.instances 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND status = $3
    `, [WORKFLOW_STATUS.PAUSED, instanceId, WORKFLOW_STATUS.RUNNING]);
    
    logger.info('Workflow paused', { instanceId });
    
  } finally {
    await pool.end();
  }
}

/**
 * Resume a paused workflow
 */
export async function resumeWorkflow(instanceId) {
  const pool = getPool();
  
  try {
    await pool.query(`
      UPDATE workflow.instances 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND status = $3
    `, [WORKFLOW_STATUS.RUNNING, instanceId, WORKFLOW_STATUS.PAUSED]);
    
    // Queue for execution
    await addJob(QUEUE_NAMES.WORKFLOW_EXECUTION, 'execute-workflow', {
      instanceId,
    });
    
    logger.info('Workflow resumed', { instanceId });
    
  } finally {
    await pool.end();
  }
}

/**
 * Get workflow instance status
 */
export async function getWorkflowStatus(instanceId) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT i.*, d.name as workflow_name, d.steps
      FROM workflow.instances i
      JOIN workflow.definitions d ON d.id = i.definition_id
      WHERE i.id = $1
    `, [instanceId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const instance = result.rows[0];
    
    // Get step logs
    const logsResult = await pool.query(`
      SELECT * FROM workflow.step_logs
      WHERE instance_id = $1
      ORDER BY step_index, attempt_number
    `, [instanceId]);
    
    return {
      ...instance,
      stepLogs: logsResult.rows,
    };
    
  } finally {
    await pool.end();
  }
}

export default {
  WORKFLOW_STATUS,
  STEP_STATUS,
  registerActionHandler,
  triggerWorkflows,
  executeWorkflow,
  cancelWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  getWorkflowStatus,
};
