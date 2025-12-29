/**
 * Delay Action Handler
 * Pauses workflow execution for a specified duration
 */

import { createModuleLogger } from '../../../utils/logger.js';

const logger = createModuleLogger('workflow-action-delay');

// Duration parsing regex
const DURATION_REGEX = /^(\d+)(s|m|h|d|w)$/;

/**
 * Parse duration string to milliseconds
 * Supports: 30s, 5m, 2h, 3d, 1w
 */
function parseDuration(duration) {
  const match = duration.match(DURATION_REGEX);
  
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use format like 30s, 5m, 2h, 3d, 1w`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers = {
    s: 1000,           // seconds
    m: 60 * 1000,      // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
  };
  
  return value * multipliers[unit];
}

/**
 * Delay action handler
 */
export async function delayAction(instance, step, context) {
  const { duration } = step.config || {};
  
  if (!duration) {
    throw new Error('Delay action requires duration in config');
  }
  
  const delayMs = parseDuration(duration);
  const delayUntil = new Date(Date.now() + delayMs);
  
  logger.info('Delay action executed', {
    instanceId: instance.id,
    duration,
    delayMs,
    delayUntil: delayUntil.toISOString(),
  });
  
  return {
    delayUntil: delayUntil.toISOString(),
    delayMs,
    duration,
  };
}

export default delayAction;
