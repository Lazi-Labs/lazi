/**
 * Workflow Service Index
 * Main entry point for workflow engine
 */

import { 
  triggerWorkflows, 
  executeWorkflow, 
  cancelWorkflow, 
  pauseWorkflow, 
  resumeWorkflow, 
  getWorkflowStatus,
  WORKFLOW_STATUS,
  STEP_STATUS,
} from './engine.js';
import { registerAllActions } from './actions/index.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('workflow');

// Initialize flag
let initialized = false;

/**
 * Initialize workflow engine
 */
export function initializeWorkflowEngine() {
  if (initialized) {
    logger.warn('Workflow engine already initialized');
    return;
  }
  
  // Register all action handlers
  registerAllActions();
  
  initialized = true;
  logger.info('Workflow engine initialized');
}

/**
 * Check if workflow engine is initialized
 */
export function isInitialized() {
  return initialized;
}

export {
  triggerWorkflows,
  executeWorkflow,
  cancelWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  getWorkflowStatus,
  WORKFLOW_STATUS,
  STEP_STATUS,
};

export default {
  initializeWorkflowEngine,
  isInitialized,
  triggerWorkflows,
  executeWorkflow,
  cancelWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  getWorkflowStatus,
  WORKFLOW_STATUS,
  STEP_STATUS,
};
