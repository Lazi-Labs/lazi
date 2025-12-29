/**
 * LAZI Pricebook Provider (Placeholder)
 * Native LAZI implementation for pricebook management
 * 
 * TODO: Implement LAZI-native pricebook provider
 */

import { query } from '../../db/schema-connection.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('lazi-pricebook-provider');

export class LaziPricebookProvider {
  async getCategories(tenantId, filters = {}) {
    throw new Error('LAZI pricebook provider not yet implemented');
  }
  
  async getCategoryById(tenantId, id) {
    throw new Error('LAZI pricebook provider not yet implemented');
  }
  
  async getServices(tenantId, categoryId, filters = {}) {
    throw new Error('LAZI pricebook provider not yet implemented');
  }
  
  async getServiceById(tenantId, id) {
    throw new Error('LAZI pricebook provider not yet implemented');
  }
  
  async getMaterials(tenantId, filters = {}) {
    throw new Error('LAZI pricebook provider not yet implemented');
  }
  
  async getMaterialById(tenantId, id) {
    throw new Error('LAZI pricebook provider not yet implemented');
  }
  
  async getEquipment(tenantId, filters = {}) {
    throw new Error('LAZI pricebook provider not yet implemented');
  }
  
  async getEquipmentById(tenantId, id) {
    throw new Error('LAZI pricebook provider not yet implemented');
  }
  
  async syncFromExternal(tenantId) {
    logger.warn({ tenantId }, 'syncFromExternal called on LAZI provider - not applicable');
    return { synced: 0, errors: 0 };
  }
  
  async syncToExternal(tenantId) {
    throw new Error('LAZI to ServiceTitan sync not yet implemented');
  }
}

export default LaziPricebookProvider;
