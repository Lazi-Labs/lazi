import * as service from './workflow.service.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('workflow-controller');

export const getSchemaStats = async (req, res) => {
  try {
    const stats = await service.getSchemaStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to get schema stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const getTableStats = async (req, res) => {
  try {
    const { schema } = req.params;
    const stats = await service.getTableStats(schema);
    res.json({ success: true, schema, ...stats });
  } catch (error) {
    logger.error('Failed to get table stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const getLiveStats = async (req, res) => {
  try {
    const stats = await service.getLiveStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to get live stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const list = async (req, res) => {
  try {
    const workflows = await service.listWorkflows();
    res.json({ success: true, data: workflows });
  } catch (error) {
    logger.error('Failed to list workflows', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const get = async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await service.getWorkflow(id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({ success: true, data: workflow });
  } catch (error) {
    logger.error('Failed to get workflow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const workflow = await service.createWorkflow(req.body);
    res.status(201).json({ success: true, data: workflow });
  } catch (error) {
    logger.error('Failed to create workflow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await service.updateWorkflow(id, req.body);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({ success: true, data: workflow });
  } catch (error) {
    logger.error('Failed to update workflow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    await service.deleteWorkflow(id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete workflow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export { deleteWorkflow as delete };
