/**
 * Workflow Action Handlers Index
 * Registers all available action handlers
 */

import { registerActionHandler } from '../engine.js';
import { delayAction } from './delay.js';
import { conditionAction } from './condition.js';
import { sendSmsAction } from './send-sms.js';
import { sendEmailAction } from './send-email.js';
import { updateStageAction } from './update-stage.js';
import { apiCallAction } from './api-call.js';
import { createModuleLogger } from '../../../utils/logger.js';

const logger = createModuleLogger('workflow-actions');

/**
 * Register all action handlers
 */
export function registerAllActions() {
  registerActionHandler('delay', delayAction);
  registerActionHandler('condition', conditionAction);
  registerActionHandler('send_sms', sendSmsAction);
  registerActionHandler('send_email', sendEmailAction);
  registerActionHandler('update_stage', updateStageAction);
  registerActionHandler('api_call', apiCallAction);
  
  logger.info('All workflow action handlers registered');
}

export {
  delayAction,
  conditionAction,
  sendSmsAction,
  sendEmailAction,
  updateStageAction,
  apiCallAction,
};

export default {
  registerAllActions,
};
