/**
 * Condition Action Handler
 * Evaluates a condition and determines if workflow should continue
 */

import pg from 'pg';
import config from '../../../config/index.js';
import { createModuleLogger } from '../../../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('workflow-action-condition');

/**
 * Get current entity data from database
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
      location: 'master.locations',
    };
    
    const table = tableMap[entityType];
    if (!table) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }
    
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
 * Evaluate a single condition
 */
function evaluateCondition(value, operator, expected) {
  switch (operator) {
    case 'eq':
    case '=':
    case '==':
      return value === expected;
      
    case 'ne':
    case '!=':
    case '<>':
      return value !== expected;
      
    case 'gt':
    case '>':
      return value > expected;
      
    case 'gte':
    case '>=':
      return value >= expected;
      
    case 'lt':
    case '<':
      return value < expected;
      
    case 'lte':
    case '<=':
      return value <= expected;
      
    case 'in':
      return Array.isArray(expected) && expected.includes(value);
      
    case 'nin':
    case 'not_in':
      return !Array.isArray(expected) || !expected.includes(value);
      
    case 'contains':
      return typeof value === 'string' && value.includes(expected);
      
    case 'starts_with':
      return typeof value === 'string' && value.startsWith(expected);
      
    case 'ends_with':
      return typeof value === 'string' && value.endsWith(expected);
      
    case 'is_null':
      return value === null || value === undefined;
      
    case 'is_not_null':
      return value !== null && value !== undefined;
      
    case 'is_empty':
      return value === null || value === undefined || value === '' || 
             (Array.isArray(value) && value.length === 0);
      
    case 'is_not_empty':
      return value !== null && value !== undefined && value !== '' &&
             (!Array.isArray(value) || value.length > 0);
      
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * Condition action handler
 */
export async function conditionAction(instance, step, context) {
  const { field, operator, value, refresh = true } = step.config || {};
  
  if (!field || !operator) {
    throw new Error('Condition action requires field and operator in config');
  }
  
  // Get current entity data if refresh is enabled
  let entityData = context;
  if (refresh) {
    const freshData = await getEntityData(instance.entity_type, instance.entity_id);
    if (freshData) {
      entityData = { ...context, ...freshData };
    }
  }
  
  // Get field value (supports nested fields with dot notation)
  let fieldValue = entityData;
  for (const part of field.split('.')) {
    if (fieldValue === null || fieldValue === undefined) break;
    fieldValue = fieldValue[part];
  }
  
  // Evaluate condition
  const conditionMet = evaluateCondition(fieldValue, operator, value);
  
  logger.info('Condition evaluated', {
    instanceId: instance.id,
    field,
    operator,
    expectedValue: value,
    actualValue: fieldValue,
    conditionMet,
  });
  
  return {
    conditionMet,
    field,
    operator,
    expectedValue: value,
    actualValue: fieldValue,
  };
}

export default conditionAction;
