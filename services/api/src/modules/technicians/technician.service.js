/**
 * Technician Service
 * Business logic for technician operations
 */

import { getTechnicianProvider } from '../../providers/factory.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('technician-service');

/**
 * List technicians with filters
 */
export async function listTechnicians(tenantId, filters = {}) {
  const provider = getTechnicianProvider(tenantId);
  return await provider.list(tenantId, filters);
}

/**
 * Get technician availability
 */
export async function getTechnicianAvailability(tenantId, date) {
  const provider = getTechnicianProvider(tenantId);
  return await provider.getAvailability(tenantId, date);
}

/**
 * Get technicians by team
 */
export async function getTechniciansByTeam(tenantId, teamId) {
  const provider = getTechnicianProvider(tenantId);
  return await provider.listByTeam(tenantId, teamId);
}

/**
 * Get technicians by business unit
 */
export async function getTechniciansByBusinessUnit(tenantId, businessUnitId) {
  const provider = getTechnicianProvider(tenantId);
  return await provider.listByBusinessUnit(tenantId, businessUnitId);
}

/**
 * Get technician by ID
 */
export async function getTechnician(tenantId, technicianId) {
  const provider = getTechnicianProvider(tenantId);
  return await provider.getById(tenantId, technicianId);
}

/**
 * List teams
 */
export async function listTeams(tenantId) {
  const provider = getTechnicianProvider(tenantId);
  return await provider.listTeams(tenantId);
}

/**
 * Get team by ID
 */
export async function getTeam(tenantId, teamId) {
  const provider = getTechnicianProvider(tenantId);
  return await provider.getTeamById(tenantId, teamId);
}

/**
 * List zones
 */
export async function listZones(tenantId) {
  const provider = getTechnicianProvider(tenantId);
  return await provider.listZones(tenantId);
}

/**
 * Get zone by ID
 */
export async function getZone(tenantId, zoneId) {
  const provider = getTechnicianProvider(tenantId);
  return await provider.getZoneById(tenantId, zoneId);
}

/**
 * Sync technicians from external source
 */
export async function syncTechnicians(tenantId) {
  const provider = getTechnicianProvider(tenantId);
  return await provider.syncFromExternal(tenantId);
}
