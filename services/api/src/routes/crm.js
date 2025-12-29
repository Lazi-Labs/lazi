/**
 * CRM API Routes - Standalone CRM (No External Sync)
 * 
 * This is our CRM - not a sync layer to another CRM.
 * Data flows: ServiceTitan → raw → master → crm
 */

import { Router } from 'express';
import {
  getContacts,
  getContact,
  updateContact,
  moveContactToStage,
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  moveOpportunityToStage,
  getPipelines,
  getPipelineStats,
  logActivity,
  getActivities,
  createTask,
  completeTask,
  getUpcomingTasks,
  getDashboardStats,
} from '../services/crm/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('crm-routes');
const router = Router();

// ─────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────

/**
 * GET /crm/dashboard
 * Get CRM dashboard statistics
 */
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Failed to get dashboard stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// CONTACTS
// ─────────────────────────────────────────────────────────

/**
 * GET /crm/contacts
 * List CRM contacts
 */
router.get('/contacts', async (req, res) => {
  try {
    const result = await getContacts(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Failed to list contacts', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /crm/contacts/:id
 * Get a single contact with related data
 */
router.get('/contacts/:id', async (req, res) => {
  try {
    const contact = await getContact(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    
    res.json({ success: true, contact });
  } catch (error) {
    logger.error('Failed to get contact', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /crm/contacts/:id
 * Update a contact
 */
router.put('/contacts/:id', async (req, res) => {
  try {
    const contact = await updateContact(req.params.id, req.body);
    
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    
    res.json({ success: true, contact });
  } catch (error) {
    logger.error('Failed to update contact', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /crm/contacts/:id/move-stage
 * Move contact to a different stage
 */
router.post('/contacts/:id/move-stage', async (req, res) => {
  try {
    const { stage } = req.body;
    
    if (!stage) {
      return res.status(400).json({ success: false, error: 'stage is required' });
    }
    
    const contact = await moveContactToStage(req.params.id, stage);
    res.json({ success: true, contact });
  } catch (error) {
    logger.error('Failed to move contact stage', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /crm/contacts/:id/activities
 * Get activities for a contact
 */
router.get('/contacts/:id/activities', async (req, res) => {
  try {
    const activities = await getActivities(req.params.id);
    res.json({ success: true, activities });
  } catch (error) {
    logger.error('Failed to get activities', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /crm/contacts/:id/activities
 * Log an activity for a contact
 */
router.post('/contacts/:id/activities', async (req, res) => {
  try {
    const activity = await logActivity({
      contact_id: req.params.id,
      ...req.body,
    });
    res.status(201).json({ success: true, activity });
  } catch (error) {
    logger.error('Failed to log activity', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// OPPORTUNITIES
// ─────────────────────────────────────────────────────────

/**
 * GET /crm/opportunities
 * List opportunities
 */
router.get('/opportunities', async (req, res) => {
  try {
    const opportunities = await getOpportunities(req.query);
    res.json({ success: true, opportunities });
  } catch (error) {
    logger.error('Failed to list opportunities', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /crm/opportunities
 * Create an opportunity
 */
router.post('/opportunities', async (req, res) => {
  try {
    const opportunity = await createOpportunity(req.body);
    res.status(201).json({ success: true, opportunity });
  } catch (error) {
    logger.error('Failed to create opportunity', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /crm/opportunities/:id
 * Update an opportunity
 */
router.put('/opportunities/:id', async (req, res) => {
  try {
    const opportunity = await updateOpportunity(req.params.id, req.body);
    
    if (!opportunity) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }
    
    res.json({ success: true, opportunity });
  } catch (error) {
    logger.error('Failed to update opportunity', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /crm/opportunities/:id/move-stage
 * Move opportunity to a different stage
 */
router.post('/opportunities/:id/move-stage', async (req, res) => {
  try {
    const { stage_id } = req.body;
    
    if (!stage_id) {
      return res.status(400).json({ success: false, error: 'stage_id is required' });
    }
    
    const opportunity = await moveOpportunityToStage(req.params.id, stage_id);
    res.json({ success: true, opportunity });
  } catch (error) {
    logger.error('Failed to move opportunity stage', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// PIPELINES
// ─────────────────────────────────────────────────────────

/**
 * GET /crm/pipelines
 * List pipelines with stages
 */
router.get('/pipelines', async (req, res) => {
  try {
    const pipelines = await getPipelines();
    res.json({ success: true, pipelines });
  } catch (error) {
    logger.error('Failed to list pipelines', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /crm/pipelines/:id/stats
 * Get pipeline statistics by stage
 */
router.get('/pipelines/:id/stats', async (req, res) => {
  try {
    const stats = await getPipelineStats(req.params.id);
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Failed to get pipeline stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────

/**
 * POST /crm/tasks
 * Create a task
 */
router.post('/tasks', async (req, res) => {
  try {
    const task = await createTask(req.body);
    res.status(201).json({ success: true, task });
  } catch (error) {
    logger.error('Failed to create task', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /crm/tasks/:id/complete
 * Complete a task
 */
router.post('/tasks/:id/complete', async (req, res) => {
  try {
    const task = await completeTask(req.params.id);
    res.json({ success: true, task });
  } catch (error) {
    logger.error('Failed to complete task', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /crm/tasks/upcoming
 * Get upcoming tasks for a user
 */
router.get('/tasks/upcoming', async (req, res) => {
  try {
    const userId = req.query.user_id || req.user?.id;
    const days = parseInt(req.query.days) || 7;
    
    const tasks = await getUpcomingTasks(userId, days);
    res.json({ success: true, tasks });
  } catch (error) {
    logger.error('Failed to get upcoming tasks', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
