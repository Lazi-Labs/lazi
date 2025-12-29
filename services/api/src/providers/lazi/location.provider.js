/**
 * LAZI Location Provider (Placeholder)
 * Native LAZI implementation for location management
 * 
 * TODO: Implement LAZI-native location provider
 */

import { query } from '../../db/schema-connection.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('lazi-location-provider');

export class LaziLocationProvider {
  async getById(tenantId, id) {
    throw new Error('LAZI location provider not yet implemented');
  }
  
  async list(tenantId, filters = {}) {
    throw new Error('LAZI location provider not yet implemented');
  }
  
  async listByCustomer(tenantId, customerId) {
    throw new Error('LAZI location provider not yet implemented');
  }
  
  async create(tenantId, data) {
    throw new Error('LAZI location provider not yet implemented');
  }
  
  async update(tenantId, id, data) {
    throw new Error('LAZI location provider not yet implemented');
  }
  
  async syncFromExternal(tenantId) {
    logger.warn({ tenantId }, 'syncFromExternal called on LAZI provider - not applicable');
    return { synced: 0, errors: 0 };
  }
  
  async syncToExternal(tenantId, id) {
    throw new Error('LAZI to ServiceTitan sync not yet implemented');
  }
}

export default LaziLocationProvider;
