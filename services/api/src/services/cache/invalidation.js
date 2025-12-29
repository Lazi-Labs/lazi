/**
 * Cache Invalidation via PostgreSQL NOTIFY
 * Listens for database changes and invalidates corresponding cache entries
 */

import pg from 'pg';
import config from '../../config/index.js';
import { invalidateEntity, invalidate } from './index.js';
import { createModuleLogger } from '../../utils/logger.js';

const { Client } = pg;
const logger = createModuleLogger('cache-invalidation');

// Mapping from table names to cache entity types
const TABLE_TO_ENTITY = {
  'st_customers': 'customer',
  'st_customer_contacts': 'customer',
  'st_locations': 'location',
  'st_location_contacts': 'location',
  'st_jobs': 'job',
  'st_appointments': 'appointment',
  'st_appointment_assignments': 'appointment',
  'st_invoices': 'invoice',
  'st_payments': 'invoice',
  'st_estimates': 'estimate',
  'st_technicians': 'technician',
  'st_employees': 'technician',
  'st_business_units': 'businessUnit',
  'st_job_types': 'jobType',
  'st_campaigns': 'campaign',
  'st_pricebook_services': 'pricebook',
  'st_pricebook_materials': 'pricebook',
  'st_pricebook_equipment': 'pricebook',
  'st_pricebook_categories': 'pricebook',
  // Master tables
  'customers': 'customer',
  'locations': 'location',
  'jobs': 'job',
  'invoices': 'invoice',
  'estimates': 'estimate',
  'technicians': 'technician',
  'business_units': 'businessUnit',
  'job_types': 'jobType',
  'campaigns': 'campaign',
};

// Listener client
let listenerClient = null;
let isListening = false;

/**
 * Handle cache invalidation notification
 */
async function handleNotification(msg) {
  try {
    const payload = JSON.parse(msg.payload);
    const { schema, table, st_id, action } = payload;
    
    logger.debug('Cache invalidation received', { schema, table, st_id, action });
    
    // Get entity type from table name
    const entityType = TABLE_TO_ENTITY[table];
    
    if (!entityType) {
      logger.debug('No cache mapping for table', { table });
      return;
    }
    
    // Invalidate entity cache
    if (st_id) {
      await invalidateEntity(entityType, st_id);
    } else {
      // Invalidate all entries for this entity type
      await invalidateEntity(entityType);
    }
    
    // Also invalidate related list caches
    await invalidate(`list:${entityType}:*`);
    
    // Invalidate dashboard caches on any change
    await invalidate('dashboard:*');
    
    logger.info('Cache invalidated for notification', { 
      entityType, 
      st_id, 
      action 
    });
    
  } catch (error) {
    logger.error('Error handling cache invalidation', { 
      error: error.message,
      payload: msg.payload 
    });
  }
}

/**
 * Start listening for cache invalidation notifications
 */
export async function startCacheInvalidationListener() {
  if (isListening) {
    logger.warn('Cache invalidation listener already running');
    return;
  }
  
  if (!config.database.url) {
    logger.warn('DATABASE_URL not configured - cache invalidation disabled');
    return;
  }
  
  try {
    listenerClient = new Client({
      connectionString: config.database.url,
    });
    
    await listenerClient.connect();
    
    // Listen for cache_invalidate channel
    await listenerClient.query('LISTEN cache_invalidate');
    
    listenerClient.on('notification', handleNotification);
    
    listenerClient.on('error', (err) => {
      logger.error('Listener client error', { error: err.message });
      // Attempt to reconnect
      setTimeout(() => {
        stopCacheInvalidationListener();
        startCacheInvalidationListener();
      }, 5000);
    });
    
    isListening = true;
    logger.info('Cache invalidation listener started');
    
  } catch (error) {
    logger.error('Failed to start cache invalidation listener', { 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Stop listening for cache invalidation notifications
 */
export async function stopCacheInvalidationListener() {
  if (!listenerClient) {
    return;
  }
  
  try {
    await listenerClient.query('UNLISTEN cache_invalidate');
    await listenerClient.end();
    listenerClient = null;
    isListening = false;
    logger.info('Cache invalidation listener stopped');
  } catch (error) {
    logger.error('Error stopping cache invalidation listener', { 
      error: error.message 
    });
  }
}

/**
 * Check if listener is running
 */
export function isListenerRunning() {
  return isListening;
}

/**
 * Manually trigger cache invalidation (for testing or manual refresh)
 */
export async function triggerInvalidation(entityType, entityId = null) {
  logger.info('Manual cache invalidation triggered', { entityType, entityId });
  
  if (entityId) {
    await invalidateEntity(entityType, entityId);
  } else {
    await invalidateEntity(entityType);
  }
  
  // Also invalidate lists
  await invalidate(`list:${entityType}:*`);
}

export default {
  startCacheInvalidationListener,
  stopCacheInvalidationListener,
  isListenerRunning,
  triggerInvalidation,
};
