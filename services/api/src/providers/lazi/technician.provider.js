/**
 * LAZI Technician Provider (Placeholder)
 * Native LAZI implementation for technician management
 * 
 * TODO: Implement LAZI-native technician provider
 */

import { query } from '../../db/schema-connection.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('lazi-technician-provider');

export class LaziTechnicianProvider {
  async getById(tenantId, id) {
    throw new Error('LAZI technician provider not yet implemented');
  }
  
  async list(tenantId, filters = {}) {
    throw new Error('LAZI technician provider not yet implemented');
  }
  
  async listByTeam(tenantId, teamId) {
    throw new Error('LAZI technician provider not yet implemented');
  }
  
  async listByBusinessUnit(tenantId, businessUnitId) {
    throw new Error('LAZI technician provider not yet implemented');
  }
  
  async getAvailability(tenantId, date) {
    throw new Error('LAZI technician provider not yet implemented');
  }
  
  async create(tenantId, data) {
    throw new Error('LAZI technician provider not yet implemented');
  }
  
  async update(tenantId, id, data) {
    throw new Error('LAZI technician provider not yet implemented');
  }
  
  async syncFromExternal(tenantId) {
    logger.warn({ tenantId }, 'syncFromExternal called on LAZI provider - not applicable');
    return { synced: 0, errors: 0 };
  }
  
  async syncToExternal(tenantId, id) {
    throw new Error('LAZI to ServiceTitan sync not yet implemented');
  }
  
  async listTeams(tenantId) {
    throw new Error('LAZI technician provider not yet implemented');
  }
  
  async getTeamById(tenantId, id) {
    throw new Error('LAZI technician provider not yet implemented');
  }
  
  async listZones(tenantId) {
    throw new Error('LAZI technician provider not yet implemented');
  }
  
  async getZoneById(tenantId, id) {
    throw new Error('LAZI technician provider not yet implemented');
  }
}

export default LaziTechnicianProvider;
