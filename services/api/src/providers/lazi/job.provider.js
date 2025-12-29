/**
 * LAZI Job Provider (Placeholder)
 * Native LAZI implementation for job management
 * 
 * TODO: Implement LAZI-native job provider
 */

import { query } from '../../db/schema-connection.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('lazi-job-provider');

export class LaziJobProvider {
  async getById(tenantId, id) {
    throw new Error('LAZI job provider not yet implemented');
  }
  
  async list(tenantId, filters = {}) {
    throw new Error('LAZI job provider not yet implemented');
  }
  
  async listByCustomer(tenantId, customerId) {
    throw new Error('LAZI job provider not yet implemented');
  }
  
  async listByLocation(tenantId, locationId) {
    throw new Error('LAZI job provider not yet implemented');
  }
  
  async listByTechnician(tenantId, technicianId, date) {
    throw new Error('LAZI job provider not yet implemented');
  }
  
  async create(tenantId, data) {
    throw new Error('LAZI job provider not yet implemented');
  }
  
  async update(tenantId, id, data) {
    throw new Error('LAZI job provider not yet implemented');
  }
  
  async updateStatus(tenantId, id, status) {
    throw new Error('LAZI job provider not yet implemented');
  }
  
  async assignTechnician(tenantId, id, technicianId) {
    throw new Error('LAZI job provider not yet implemented');
  }
  
  async cancel(tenantId, id) {
    throw new Error('LAZI job provider not yet implemented');
  }
  
  async syncFromExternal(tenantId) {
    logger.warn({ tenantId }, 'syncFromExternal called on LAZI provider - not applicable');
    return { synced: 0, errors: 0 };
  }
  
  async syncToExternal(tenantId, id) {
    throw new Error('LAZI to ServiceTitan sync not yet implemented');
  }
}

export default LaziJobProvider;
