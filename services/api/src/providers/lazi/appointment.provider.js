/**
 * LAZI Appointment Provider (Placeholder)
 * Native LAZI implementation for appointment management
 * 
 * TODO: Implement LAZI-native appointment provider
 */

import { query } from '../../db/schema-connection.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('lazi-appointment-provider');

export class LaziAppointmentProvider {
  async getById(tenantId, id) {
    throw new Error('LAZI appointment provider not yet implemented');
  }
  
  async list(tenantId, filters = {}) {
    throw new Error('LAZI appointment provider not yet implemented');
  }
  
  async listByJob(tenantId, jobId) {
    throw new Error('LAZI appointment provider not yet implemented');
  }
  
  async listByTechnician(tenantId, technicianId, date) {
    throw new Error('LAZI appointment provider not yet implemented');
  }
  
  async listByDateRange(tenantId, startDate, endDate) {
    throw new Error('LAZI appointment provider not yet implemented');
  }
  
  async create(tenantId, data) {
    throw new Error('LAZI appointment provider not yet implemented');
  }
  
  async update(tenantId, id, data) {
    throw new Error('LAZI appointment provider not yet implemented');
  }
  
  async syncFromExternal(tenantId) {
    logger.warn({ tenantId }, 'syncFromExternal called on LAZI provider - not applicable');
    return { synced: 0, errors: 0 };
  }
  
  async syncToExternal(tenantId, id) {
    throw new Error('LAZI to ServiceTitan sync not yet implemented');
  }
}

export default LaziAppointmentProvider;
