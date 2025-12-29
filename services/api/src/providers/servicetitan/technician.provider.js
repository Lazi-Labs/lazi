/**
 * ServiceTitan Technician Provider
 * Fetches technician data from ServiceTitan API and caches locally
 * Maps to: /dispatch/v2/tenant/{tenant}/technicians
 */

import stClient from '../../services/stClient.js';
import { query } from '../../db/schema-connection.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('st-technician-provider');

export class ServiceTitanTechnicianProvider {
  /**
   * Get technician by ID
   * @param {string} tenantId - Tenant ID
   * @param {string} id - Technician ID (ST ID)
   * @returns {Promise<Technician|null>}
   */
  async getById(tenantId, id) {
    try {
      // Check local cache first
      const cached = await query(
        'SELECT * FROM raw.st_technicians WHERE tenant_id = $1 AND st_id = $2',
        [tenantId, id]
      );
      
      if (cached.rows[0]) {
        return this.mapToTechnician(cached.rows[0]);
      }
      
      // Fallback to ST API if not in cache
      const stTechnician = await stClient.technicians.get(id);
      await this.cacheTechnician(tenantId, stTechnician);
      return this.mapToTechnician(stTechnician);
    } catch (error) {
      logger.error({ error: error.message, tenantId, id }, 'Error getting technician by ID');
      throw error;
    }
  }
  
  /**
   * List technicians with filters
   * @param {string} tenantId - Tenant ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Technician[]>}
   */
  async list(tenantId, filters = {}) {
    try {
      let sql = 'SELECT * FROM raw.st_technicians WHERE tenant_id = $1';
      const params = [tenantId];
      
      if (filters.active !== undefined) {
        sql += ` AND active = $${params.length + 1}`;
        params.push(filters.active);
      }
      
      if (filters.teamId) {
        sql += ` AND team_id = $${params.length + 1}`;
        params.push(filters.teamId);
      }
      
      if (filters.businessUnitId) {
        sql += ` AND business_unit_id = $${params.length + 1}`;
        params.push(filters.businessUnitId);
      }
      
      sql += ' ORDER BY name';
      
      if (filters.limit) {
        sql += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      } else {
        sql += ' LIMIT 100';
      }
      
      const result = await query(sql, params);
      return result.rows.map(row => this.mapToTechnician(row));
    } catch (error) {
      logger.error({ error: error.message, tenantId, filters }, 'Error listing technicians');
      throw error;
    }
  }
  
  /**
   * List technicians by team
   * @param {string} tenantId - Tenant ID
   * @param {string} teamId - Team ID
   * @returns {Promise<Technician[]>}
   */
  async listByTeam(tenantId, teamId) {
    return this.list(tenantId, { teamId });
  }
  
  /**
   * List technicians by business unit
   * @param {string} tenantId - Tenant ID
   * @param {string} businessUnitId - Business Unit ID
   * @returns {Promise<Technician[]>}
   */
  async listByBusinessUnit(tenantId, businessUnitId) {
    return this.list(tenantId, { businessUnitId });
  }
  
  /**
   * Get technician availability
   * @param {string} tenantId - Tenant ID
   * @param {Date} date - Date to check availability
   * @returns {Promise<Object>}
   */
  async getAvailability(tenantId, date) {
    try {
      // Get all active technicians
      const technicians = await this.list(tenantId, { active: true });
      
      // Get appointments for the date
      const dateStr = date.toISOString().split('T')[0];
      const appointments = await query(`
        SELECT technician_id, COUNT(*) as appointment_count,
               SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600) as hours_scheduled
        FROM raw.st_appointments
        WHERE tenant_id = $1
        AND DATE(start_time) = $2
        AND active = true
        GROUP BY technician_id
      `, [tenantId, dateStr]);
      
      const appointmentMap = new Map(
        appointments.rows.map(row => [row.technician_id, {
          appointmentCount: parseInt(row.appointment_count),
          hoursScheduled: parseFloat(row.hours_scheduled),
        }])
      );
      
      return technicians.map(tech => ({
        technician: tech,
        appointmentCount: appointmentMap.get(tech.id)?.appointmentCount || 0,
        hoursScheduled: appointmentMap.get(tech.id)?.hoursScheduled || 0,
        available: (appointmentMap.get(tech.id)?.hoursScheduled || 0) < 8,
      }));
    } catch (error) {
      logger.error({ error: error.message, tenantId, date }, 'Error getting technician availability');
      throw error;
    }
  }
  
  /**
   * Create technician (not supported - ST is source of truth)
   */
  async create(tenantId, data) {
    throw new Error('Technician creation not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Update technician (not supported - ST is source of truth)
   */
  async update(tenantId, id, data) {
    throw new Error('Technician updates not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Sync technicians from ServiceTitan API
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<SyncResult>}
   */
  async syncFromExternal(tenantId) {
    try {
      const technicians = await stClient.technicians.list();
      let synced = 0;
      
      for (const technician of technicians) {
        await this.cacheTechnician(tenantId, technician);
        synced++;
      }
      
      await query(
        `INSERT INTO raw.sync_state (tenant_id, table_name, last_full_sync, records_synced)
         VALUES ($1, 'st_technicians', NOW(), $2)
         ON CONFLICT (tenant_id, table_name) 
         DO UPDATE SET last_full_sync = NOW(), records_synced = $2`,
        [tenantId, synced]
      );
      
      logger.info({ tenantId, synced }, 'Technicians synced from ServiceTitan');
      return { synced, errors: 0 };
    } catch (error) {
      logger.error({ error: error.message, tenantId }, 'Error syncing technicians');
      return { synced: 0, errors: 1, lastError: error.message };
    }
  }
  
  /**
   * List teams
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Team[]>}
   */
  async listTeams(tenantId) {
    try {
      const teams = await stClient.teams.list();
      return teams.map(team => ({
        id: String(team.id),
        tenantId,
        name: team.name,
        businessUnitId: team.businessUnitId,
        active: team.active !== false,
      }));
    } catch (error) {
      logger.error({ error: error.message, tenantId }, 'Error listing teams');
      throw error;
    }
  }
  
  /**
   * Get team by ID
   * @param {string} tenantId - Tenant ID
   * @param {string} id - Team ID
   * @returns {Promise<Team|null>}
   */
  async getTeamById(tenantId, id) {
    try {
      const team = await stClient.teams.get(id);
      return {
        id: String(team.id),
        tenantId,
        name: team.name,
        businessUnitId: team.businessUnitId,
        active: team.active !== false,
      };
    } catch (error) {
      logger.error({ error: error.message, tenantId, id }, 'Error getting team by ID');
      return null;
    }
  }
  
  /**
   * List zones
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Zone[]>}
   */
  async listZones(tenantId) {
    try {
      const zones = await stClient.zones.list();
      return zones.map(zone => ({
        id: String(zone.id),
        tenantId,
        name: zone.name,
        zipCodes: zone.zipCodes || [],
        active: zone.active !== false,
      }));
    } catch (error) {
      logger.error({ error: error.message, tenantId }, 'Error listing zones');
      throw error;
    }
  }
  
  /**
   * Get zone by ID
   * @param {string} tenantId - Tenant ID
   * @param {string} id - Zone ID
   * @returns {Promise<Zone|null>}
   */
  async getZoneById(tenantId, id) {
    try {
      const zone = await stClient.zones.get(id);
      return {
        id: String(zone.id),
        tenantId,
        name: zone.name,
        zipCodes: zone.zipCodes || [],
        active: zone.active !== false,
      };
    } catch (error) {
      logger.error({ error: error.message, tenantId, id }, 'Error getting zone by ID');
      return null;
    }
  }
  
  /**
   * Map database row to Technician object
   * @param {Object} row - Database row
   * @returns {Technician}
   */
  mapToTechnician(row) {
    return {
      id: row.st_id || String(row.id),
      tenantId: String(row.tenant_id),
      name: row.name,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      mobile: row.mobile,
      businessUnitId: row.business_unit_id,
      teamId: row.team_id,
      zoneId: row.zone_id,
      skills: row.skills || [],
      role: row.role,
      active: row.active !== false,
      hireDate: row.hire_date,
      color: row.color,
      _source: 'servicetitan',
      _stId: row.st_id || String(row.id),
    };
  }
  
  /**
   * Cache technician data locally
   * @param {string} tenantId - Tenant ID
   * @param {Object} technician - Technician data from ST API
   */
  async cacheTechnician(tenantId, technician) {
    await query(`
      INSERT INTO raw.st_technicians (
        tenant_id, st_id, name, first_name, last_name,
        email, phone, mobile, business_unit_id, team_id, zone_id,
        skills, role, active, hire_date, color, full_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      ON CONFLICT (tenant_id, st_id) 
      DO UPDATE SET 
        name = $3, first_name = $4, last_name = $5,
        email = $6, phone = $7, mobile = $8,
        business_unit_id = $9, team_id = $10, zone_id = $11,
        skills = $12, role = $13, active = $14, hire_date = $15, color = $16,
        full_data = $17, synced_at = NOW(), updated_at = NOW()
    `, [
      tenantId,
      String(technician.id),
      technician.name,
      technician.firstName,
      technician.lastName,
      technician.email,
      technician.phone,
      technician.mobile,
      technician.businessUnitId,
      technician.teamId,
      technician.zoneId,
      JSON.stringify(technician.skills || []),
      technician.role,
      technician.active !== false,
      technician.hireDate,
      technician.color,
      JSON.stringify(technician),
    ]);
  }
}

export default ServiceTitanTechnicianProvider;
