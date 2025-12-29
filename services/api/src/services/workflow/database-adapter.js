/**
 * Workflow Database Adapter
 * 
 * This adapter migrates workflows from the old database format to the new schema.
 * It provides a unified interface for workflow operations that works with the new
 * PostgreSQL schema (workflow.definitions, workflow.instances, etc.)
 */

import pg from 'pg';
import config from '../../config/index.js';
import { createModuleLogger } from '../../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('workflow-db-adapter');

/**
 * Get database pool
 */
function getPool() {
  return new Pool({
    connectionString: config.database.url,
    max: 5,
  });
}

// ─────────────────────────────────────────────────────────
// WORKFLOW DEFINITIONS
// ─────────────────────────────────────────────────────────

/**
 * Get all workflow definitions
 */
export async function getWorkflowDefinitions(filters = {}) {
  const pool = getPool();
  
  try {
    const { is_active, entity_type, limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT * FROM workflow.definitions
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (is_active !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(is_active);
    }
    
    if (entity_type) {
      query += ` AND entity_type = $${paramIndex++}`;
      params.push(entity_type);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

/**
 * Get a single workflow definition
 */
export async function getWorkflowDefinition(id) {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'SELECT * FROM workflow.definitions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
    
  } finally {
    await pool.end();
  }
}

/**
 * Create a workflow definition
 */
export async function createWorkflowDefinition(data) {
  const pool = getPool();
  
  try {
    const {
      name,
      description,
      entity_type,
      trigger_type,
      trigger_config,
      steps,
      is_active = true,
    } = data;
    
    const result = await pool.query(`
      INSERT INTO workflow.definitions (
        name, description, entity_type, trigger_type, trigger_config, steps, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, description, entity_type, trigger_type, 
        JSON.stringify(trigger_config), JSON.stringify(steps), is_active]);
    
    logger.info('Workflow definition created', { id: result.rows[0].id, name });
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

/**
 * Update a workflow definition
 */
export async function updateWorkflowDefinition(id, data) {
  const pool = getPool();
  
  try {
    const {
      name,
      description,
      trigger_type,
      trigger_config,
      steps,
      is_active,
    } = data;
    
    const result = await pool.query(`
      UPDATE workflow.definitions SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        trigger_type = COALESCE($4, trigger_type),
        trigger_config = COALESCE($5, trigger_config),
        steps = COALESCE($6, steps),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, name, description, trigger_type,
        trigger_config ? JSON.stringify(trigger_config) : null,
        steps ? JSON.stringify(steps) : null, is_active]);
    
    logger.info('Workflow definition updated', { id });
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────
// WORKFLOW INSTANCES
// ─────────────────────────────────────────────────────────

/**
 * Create a workflow instance
 */
export async function createWorkflowInstance(data) {
  const pool = getPool();
  
  try {
    const {
      workflow_id,
      entity_type,
      entity_id,
      context = {},
      triggered_by,
    } = data;
    
    const result = await pool.query(`
      INSERT INTO workflow.instances (
        workflow_id, entity_type, entity_id, context, triggered_by, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [workflow_id, entity_type, entity_id, JSON.stringify(context), triggered_by]);
    
    logger.info('Workflow instance created', { 
      instanceId: result.rows[0].id, 
      workflowId: workflow_id 
    });
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

/**
 * Get a workflow instance
 */
export async function getWorkflowInstance(id) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT 
        i.*,
        d.name as workflow_name,
        d.steps as workflow_steps,
        (
          SELECT json_agg(l ORDER BY l.started_at)
          FROM workflow.step_logs l
          WHERE l.instance_id = i.id
        ) as step_logs
      FROM workflow.instances i
      LEFT JOIN workflow.definitions d ON d.id = i.workflow_id
      WHERE i.id = $1
    `, [id]);
    
    return result.rows[0] || null;
    
  } finally {
    await pool.end();
  }
}

/**
 * Update workflow instance status
 */
export async function updateWorkflowInstanceStatus(id, status, error = null) {
  const pool = getPool();
  
  try {
    const completedAt = ['completed', 'failed', 'cancelled'].includes(status) 
      ? new Date() 
      : null;
    
    const result = await pool.query(`
      UPDATE workflow.instances SET
        status = $2,
        error = $3,
        completed_at = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, status, error, completedAt]);
    
    logger.info('Workflow instance status updated', { id, status });
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

/**
 * Update workflow instance current step
 */
export async function updateWorkflowInstanceStep(id, currentStep) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      UPDATE workflow.instances SET
        current_step = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, currentStep]);
    
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

/**
 * Get running workflow instances
 */
export async function getRunningInstances(limit = 100) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT i.*, d.name as workflow_name
      FROM workflow.instances i
      LEFT JOIN workflow.definitions d ON d.id = i.workflow_id
      WHERE i.status IN ('pending', 'running', 'waiting')
      ORDER BY i.created_at ASC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────
// STEP LOGS
// ─────────────────────────────────────────────────────────

/**
 * Log a step execution
 */
export async function logStepExecution(data) {
  const pool = getPool();
  
  try {
    const {
      instance_id,
      step_index,
      step_type,
      step_config,
      status,
      result,
      error,
      started_at,
      completed_at,
    } = data;
    
    const insertResult = await pool.query(`
      INSERT INTO workflow.step_logs (
        instance_id, step_index, step_type, step_config, status,
        result, error, started_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [instance_id, step_index, step_type, 
        JSON.stringify(step_config), status,
        result ? JSON.stringify(result) : null, error,
        started_at, completed_at]);
    
    return insertResult.rows[0];
    
  } finally {
    await pool.end();
  }
}

/**
 * Get step logs for an instance
 */
export async function getStepLogs(instanceId) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT * FROM workflow.step_logs
      WHERE instance_id = $1
      ORDER BY step_index ASC
    `, [instanceId]);
    
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────
// TRIGGERS
// ─────────────────────────────────────────────────────────

/**
 * Get triggers for an event
 */
export async function getTriggersForEvent(eventType, entityType) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT t.*, d.name as workflow_name, d.steps
      FROM workflow.triggers t
      JOIN workflow.definitions d ON d.id = t.workflow_id
      WHERE t.event_type = $1
        AND t.entity_type = $2
        AND t.is_active = true
        AND d.is_active = true
    `, [eventType, entityType]);
    
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────
// MIGRATION HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Migrate old workflow data to new schema
 * This is a one-time migration function
 */
export async function migrateOldWorkflows() {
  const pool = getPool();
  
  try {
    logger.info('Starting workflow migration...');
    
    // Check if old tables exist
    const oldTablesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'workflows'
      ) as exists
    `);
    
    if (!oldTablesCheck.rows[0].exists) {
      logger.info('No old workflow tables found, skipping migration');
      return { migrated: 0, skipped: true };
    }
    
    // Migrate workflow definitions
    const oldWorkflows = await pool.query(`
      SELECT * FROM public.workflows
    `);
    
    let migrated = 0;
    
    for (const oldWf of oldWorkflows.rows) {
      // Check if already migrated
      const existing = await pool.query(`
        SELECT id FROM workflow.definitions WHERE name = $1
      `, [oldWf.name]);
      
      if (existing.rows.length > 0) {
        logger.info('Workflow already migrated', { name: oldWf.name });
        continue;
      }
      
      // Migrate to new schema
      await pool.query(`
        INSERT INTO workflow.definitions (
          name, description, entity_type, trigger_type, trigger_config, steps, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        oldWf.name,
        oldWf.description,
        oldWf.entity_type || 'contact',
        oldWf.trigger_type || 'manual',
        JSON.stringify(oldWf.trigger_config || {}),
        JSON.stringify(oldWf.steps || []),
        oldWf.is_active !== false,
      ]);
      
      migrated++;
      logger.info('Migrated workflow', { name: oldWf.name });
    }
    
    logger.info('Workflow migration complete', { migrated });
    return { migrated, skipped: false };
    
  } finally {
    await pool.end();
  }
}

export default {
  // Definitions
  getWorkflowDefinitions,
  getWorkflowDefinition,
  createWorkflowDefinition,
  updateWorkflowDefinition,
  
  // Instances
  createWorkflowInstance,
  getWorkflowInstance,
  updateWorkflowInstanceStatus,
  updateWorkflowInstanceStep,
  getRunningInstances,
  
  // Step logs
  logStepExecution,
  getStepLogs,
  
  // Triggers
  getTriggersForEvent,
  
  // Migration
  migrateOldWorkflows,
};
