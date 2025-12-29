/**
 * ServiceTitan Appointment Provider
 * Fetches appointment data from ServiceTitan API and caches locally
 * Maps to: /jpm/v2/tenant/{tenant}/appointments
 */

import stClient from '../../services/stClient.js';
import { query } from '../../db/schema-connection.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('st-appointment-provider');

export class ServiceTitanAppointmentProvider {
  /**
   * Get appointment by ID
   * @param {string} tenantId - Tenant ID
   * @param {string} id - Appointment ID (ST ID)
   * @returns {Promise<Appointment|null>}
   */
  async getById(tenantId, id) {
    try {
      // Check local cache first
      const cached = await query(
        'SELECT * FROM raw.st_appointments WHERE tenant_id = $1 AND st_id = $2',
        [tenantId, id]
      );
      
      if (cached.rows[0]) {
        return this.mapToAppointment(cached.rows[0]);
      }
      
      // Fallback to ST API if not in cache
      const stAppointment = await stClient.appointments.get(id);
      await this.cacheAppointment(tenantId, stAppointment);
      return this.mapToAppointment(stAppointment);
    } catch (error) {
      logger.error({ error: error.message, tenantId, id }, 'Error getting appointment by ID');
      throw error;
    }
  }
  
  /**
   * List appointments with filters
   * @param {string} tenantId - Tenant ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Appointment[]>}
   */
  async list(tenantId, filters = {}) {
    try {
      let sql = 'SELECT * FROM raw.st_appointments WHERE tenant_id = $1';
      const params = [tenantId];
      
      if (filters.status) {
        sql += ` AND status = $${params.length + 1}`;
        params.push(filters.status);
      }
      
      if (filters.jobId) {
        sql += ` AND job_id = $${params.length + 1}`;
        params.push(filters.jobId);
      }
      
      if (filters.technicianId) {
        sql += ` AND technician_id = $${params.length + 1}`;
        params.push(filters.technicianId);
      }
      
      sql += ' ORDER BY start_time DESC';
      
      if (filters.limit) {
        sql += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      } else {
        sql += ' LIMIT 100';
      }
      
      const result = await query(sql, params);
      return result.rows.map(row => this.mapToAppointment(row));
    } catch (error) {
      logger.error({ error: error.message, tenantId, filters }, 'Error listing appointments');
      throw error;
    }
  }
  
  /**
   * List appointments by job
   * @param {string} tenantId - Tenant ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Appointment[]>}
   */
  async listByJob(tenantId, jobId) {
    return this.list(tenantId, { jobId });
  }
  
  /**
   * List appointments by technician
   * @param {string} tenantId - Tenant ID
   * @param {string} technicianId - Technician ID
   * @param {Date} date - Date to filter by
   * @returns {Promise<Appointment[]>}
   */
  async listByTechnician(tenantId, technicianId, date) {
    try {
      const sql = `
        SELECT * FROM raw.st_appointments
        WHERE tenant_id = $1
        AND technician_id = $2
        AND DATE(start_time) = $3
        ORDER BY start_time
      `;
      
      const result = await query(sql, [
        tenantId,
        technicianId,
        date.toISOString().split('T')[0],
      ]);
      
      return result.rows.map(row => this.mapToAppointment(row));
    } catch (error) {
      logger.error({ error: error.message, tenantId, technicianId }, 'Error listing appointments by technician');
      throw error;
    }
  }
  
  /**
   * List appointments by date range
   * @param {string} tenantId - Tenant ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Appointment[]>}
   */
  async listByDateRange(tenantId, startDate, endDate) {
    try {
      const sql = `
        SELECT * FROM raw.st_appointments
        WHERE tenant_id = $1
        AND start_time >= $2
        AND start_time <= $3
        ORDER BY start_time
      `;
      
      const result = await query(sql, [tenantId, startDate, endDate]);
      return result.rows.map(row => this.mapToAppointment(row));
    } catch (error) {
      logger.error({ error: error.message, tenantId, startDate, endDate }, 'Error listing appointments by date range');
      throw error;
    }
  }
  
  /**
   * Create appointment (not supported - ST is source of truth)
   */
  async create(tenantId, data) {
    throw new Error('Appointment creation not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Update appointment (not supported - ST is source of truth)
   */
  async update(tenantId, id, data) {
    throw new Error('Appointment updates not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Sync appointments from ServiceTitan API
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<SyncResult>}
   */
  async syncFromExternal(tenantId) {
    try {
      // Sync recent appointments (last 30 days and next 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const appointments = await stClient.appointments.list({
        startsOnOrAfter: thirtyDaysAgo.toISOString(),
      });
      
      let synced = 0;
      
      for (const appointment of appointments) {
        await this.cacheAppointment(tenantId, appointment);
        synced++;
      }
      
      await query(
        `INSERT INTO raw.sync_state (tenant_id, table_name, last_full_sync, records_synced)
         VALUES ($1, 'st_appointments', NOW(), $2)
         ON CONFLICT (tenant_id, table_name) 
         DO UPDATE SET last_full_sync = NOW(), records_synced = $2`,
        [tenantId, synced]
      );
      
      logger.info({ tenantId, synced }, 'Appointments synced from ServiceTitan');
      return { synced, errors: 0 };
    } catch (error) {
      logger.error({ error: error.message, tenantId }, 'Error syncing appointments');
      return { synced: 0, errors: 1, lastError: error.message };
    }
  }
  
  /**
   * Map database row to Appointment object
   * @param {Object} row - Database row
   * @returns {Appointment}
   */
  mapToAppointment(row) {
    return {
      id: row.st_id || String(row.id),
      tenantId: String(row.tenant_id),
      jobId: row.job_id,
      technicianId: row.technician_id,
      start: row.start_time,
      end: row.end_time,
      arrivalWindowStart: row.arrival_window_start,
      arrivalWindowEnd: row.arrival_window_end,
      status: row.status,
      active: row.active !== false,
      _source: 'servicetitan',
      _stId: row.st_id || String(row.id),
    };
  }
  
  /**
   * Cache appointment data locally
   * @param {string} tenantId - Tenant ID
   * @param {Object} appointment - Appointment data from ST API
   */
  async cacheAppointment(tenantId, appointment) {
    await query(`
      INSERT INTO raw.st_appointments (
        tenant_id, st_id, job_id, technician_id,
        start_time, end_time, arrival_window_start, arrival_window_end,
        status, active, full_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (tenant_id, st_id) 
      DO UPDATE SET 
        job_id = $3, technician_id = $4,
        start_time = $5, end_time = $6,
        arrival_window_start = $7, arrival_window_end = $8,
        status = $9, active = $10, full_data = $11,
        synced_at = NOW(), updated_at = NOW()
    `, [
      tenantId,
      String(appointment.id),
      appointment.jobId,
      appointment.technicianId,
      appointment.start,
      appointment.end,
      appointment.arrivalWindowStart,
      appointment.arrivalWindowEnd,
      appointment.status,
      appointment.active !== false,
      JSON.stringify(appointment),
    ]);
  }
}

export default ServiceTitanAppointmentProvider;
