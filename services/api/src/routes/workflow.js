/**
 * Workflow API Routes
 * Endpoints for workflow management
 */

import { Router } from 'express';
import pg from 'pg';
import config from '../config/index.js';
import { 
  triggerWorkflows, 
  cancelWorkflow, 
  pauseWorkflow, 
  resumeWorkflow, 
  getWorkflowStatus,
  initializeWorkflowEngine,
  isInitialized,
} from '../services/workflow/index.js';
import { createModuleLogger } from '../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('workflow-routes');
const router = Router();

// Ensure workflow engine is initialized
router.use((req, res, next) => {
  if (!isInitialized()) {
    initializeWorkflowEngine();
  }
  next();
});

/**
 * GET /workflows
 * List all workflow definitions
 */
router.get('/', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const { enabled, trigger_event } = req.query;
    
    let query = 'SELECT * FROM workflow.definitions WHERE 1=1';
    const params = [];
    
    if (enabled !== undefined) {
      params.push(enabled === 'true');
      query += ` AND enabled = $${params.length}`;
    }
    
    if (trigger_event) {
      params.push(trigger_event);
      query += ` AND trigger_event = $${params.length}`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      workflows: result.rows,
      count: result.rows.length,
    });
    
  } catch (error) {
    logger.error('Failed to list workflows', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

/**
 * POST /workflows
 * Create a new workflow definition
 */
router.post('/', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const { 
      name, 
      description, 
      trigger_event, 
      trigger_conditions = {}, 
      steps = [],
      enabled = true,
      tags = [],
    } = req.body;
    
    if (!name || !trigger_event) {
      return res.status(400).json({ 
        success: false, 
        error: 'name and trigger_event are required' 
      });
    }
    
    // Create definition
    const defResult = await pool.query(`
      INSERT INTO workflow.definitions (
        name, description, trigger_event, trigger_conditions, steps, enabled, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, description, trigger_event, JSON.stringify(trigger_conditions), JSON.stringify(steps), enabled, tags]);
    
    const definition = defResult.rows[0];
    
    // Create trigger mapping
    await pool.query(`
      INSERT INTO workflow.triggers (event_name, definition_id, enabled)
      VALUES ($1, $2, $3)
      ON CONFLICT (event_name, definition_id) DO UPDATE SET enabled = $3
    `, [trigger_event, definition.id, enabled]);
    
    logger.info('Workflow created', { id: definition.id, name });
    
    res.status(201).json({
      success: true,
      workflow: definition,
    });
    
  } catch (error) {
    logger.error('Failed to create workflow', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

/**
 * GET /workflows/:id
 * Get a workflow definition by ID
 */
router.get('/:id', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM workflow.definitions WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    res.json({
      success: true,
      workflow: result.rows[0],
    });
    
  } catch (error) {
    logger.error('Failed to get workflow', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

/**
 * PUT /workflows/:id
 * Update a workflow definition
 */
router.put('/:id', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      trigger_event, 
      trigger_conditions, 
      steps,
      enabled,
      tags,
    } = req.body;
    
    const result = await pool.query(`
      UPDATE workflow.definitions SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        trigger_event = COALESCE($3, trigger_event),
        trigger_conditions = COALESCE($4, trigger_conditions),
        steps = COALESCE($5, steps),
        enabled = COALESCE($6, enabled),
        tags = COALESCE($7, tags),
        version = version + 1,
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [
      name, 
      description, 
      trigger_event, 
      trigger_conditions ? JSON.stringify(trigger_conditions) : null,
      steps ? JSON.stringify(steps) : null,
      enabled,
      tags,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    // Update trigger if trigger_event changed
    if (trigger_event) {
      await pool.query(`
        UPDATE workflow.triggers SET event_name = $1 WHERE definition_id = $2
      `, [trigger_event, id]);
    }
    
    logger.info('Workflow updated', { id });
    
    res.json({
      success: true,
      workflow: result.rows[0],
    });
    
  } catch (error) {
    logger.error('Failed to update workflow', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

/**
 * DELETE /workflows/:id
 * Delete a workflow definition
 */
router.delete('/:id', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const { id } = req.params;
    
    // Delete triggers first
    await pool.query('DELETE FROM workflow.triggers WHERE definition_id = $1', [id]);
    
    // Delete definition
    const result = await pool.query(
      'DELETE FROM workflow.definitions WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    logger.info('Workflow deleted', { id });
    
    res.json({ success: true, deleted: id });
    
  } catch (error) {
    logger.error('Failed to delete workflow', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

/**
 * POST /workflows/:id/trigger
 * Manually trigger a workflow
 */
router.post('/:id/trigger', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const { id } = req.params;
    const { entity_type, entity_id, context = {} } = req.body;
    
    if (!entity_type || !entity_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'entity_type and entity_id are required' 
      });
    }
    
    // Get workflow definition
    const defResult = await pool.query(
      'SELECT * FROM workflow.definitions WHERE id = $1',
      [id]
    );
    
    if (defResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    const definition = defResult.rows[0];
    
    // Trigger the workflow
    const instances = await triggerWorkflows(
      definition.trigger_event,
      entity_type,
      entity_id,
      { ...context, manual: true }
    );
    
    res.json({
      success: true,
      triggered: instances.length,
      instances: instances.map(i => ({ id: i.id, status: i.status })),
    });
    
  } catch (error) {
    logger.error('Failed to trigger workflow', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

/**
 * GET /workflows/:id/instances
 * List instances of a workflow
 */
router.get('/:id/instances', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const { id } = req.params;
    const { status, limit = 50 } = req.query;
    
    let query = `
      SELECT * FROM workflow.instances 
      WHERE definition_id = $1
    `;
    const params = [id];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      instances: result.rows,
      count: result.rows.length,
    });
    
  } catch (error) {
    logger.error('Failed to list instances', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

/**
 * GET /workflows/instances/:instanceId
 * Get a workflow instance with step logs
 */
router.get('/instances/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    
    const instance = await getWorkflowStatus(instanceId);
    
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }
    
    res.json({
      success: true,
      instance,
    });
    
  } catch (error) {
    logger.error('Failed to get instance', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /workflows/instances/:instanceId/cancel
 * Cancel a running workflow instance
 */
router.post('/instances/:instanceId/cancel', async (req, res) => {
  try {
    const { instanceId } = req.params;
    
    await cancelWorkflow(instanceId);
    
    res.json({ success: true, cancelled: instanceId });
    
  } catch (error) {
    logger.error('Failed to cancel instance', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /workflows/instances/:instanceId/pause
 * Pause a running workflow instance
 */
router.post('/instances/:instanceId/pause', async (req, res) => {
  try {
    const { instanceId } = req.params;
    
    await pauseWorkflow(instanceId);
    
    res.json({ success: true, paused: instanceId });
    
  } catch (error) {
    logger.error('Failed to pause instance', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /workflows/instances/:instanceId/resume
 * Resume a paused workflow instance
 */
router.post('/instances/:instanceId/resume', async (req, res) => {
  try {
    const { instanceId } = req.params;
    
    await resumeWorkflow(instanceId);
    
    res.json({ success: true, resumed: instanceId });
    
  } catch (error) {
    logger.error('Failed to resume instance', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /workflows/templates
 * List available workflow templates
 */
router.get('/templates', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM workflow.templates WHERE 1=1';
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    query += ' ORDER BY name';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      templates: result.rows,
      count: result.rows.length,
    });
    
  } catch (error) {
    logger.error('Failed to list templates', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

/**
 * POST /workflows/from-template/:templateId
 * Create a workflow from a template
 */
router.post('/from-template/:templateId', async (req, res) => {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });
  
  try {
    const { templateId } = req.params;
    const { name, enabled = true } = req.body;
    
    // Get template
    const templateResult = await pool.query(
      'SELECT * FROM workflow.templates WHERE id = $1',
      [templateId]
    );
    
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    const template = templateResult.rows[0];
    
    // Create workflow from template
    const defResult = await pool.query(`
      INSERT INTO workflow.definitions (
        name, description, trigger_event, trigger_conditions, steps, enabled
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      name || template.name,
      template.description,
      template.trigger_event,
      template.trigger_conditions,
      template.steps,
      enabled,
    ]);
    
    const definition = defResult.rows[0];
    
    // Create trigger
    await pool.query(`
      INSERT INTO workflow.triggers (event_name, definition_id, enabled)
      VALUES ($1, $2, $3)
    `, [template.trigger_event, definition.id, enabled]);
    
    // Update template usage count
    await pool.query(
      'UPDATE workflow.templates SET usage_count = usage_count + 1 WHERE id = $1',
      [templateId]
    );
    
    logger.info('Workflow created from template', { 
      workflowId: definition.id, 
      templateId 
    });
    
    res.status(201).json({
      success: true,
      workflow: definition,
    });
    
  } catch (error) {
    logger.error('Failed to create from template', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
});

export default router;
