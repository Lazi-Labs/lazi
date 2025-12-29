/**
 * ServiceTitan Job Provider
 * Fetches job data from ServiceTitan API and caches locally
 * Maps to: /jpm/v2/tenant/{tenant}/jobs
 */

import stClient from '../../services/stClient.js';
import { query } from '../../db/schema-connection.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('st-job-provider');

export class ServiceTitanJobProvider {
  /**
   * Get job by ID
   * @param {string} tenantId - Tenant ID
   * @param {string} id - Job ID (ST ID)
   * @returns {Promise<Job|null>}
   */
  async getById(tenantId, id) {
    try {
      // Check local cache first
      const cached = await query(
        'SELECT * FROM raw.st_jobs WHERE tenant_id = $1 AND st_id = $2',
        [tenantId, id]
      );
      
      if (cached.rows[0]) {
        return this.mapToJob(cached.rows[0]);
      }
      
      // Fallback to ST API if not in cache
      const stJob = await stClient.jobs.get(id);
      await this.cacheJob(tenantId, stJob);
      return this.mapToJob(stJob);
    } catch (error) {
      logger.error({ error: error.message, tenantId, id }, 'Error getting job by ID');
      throw error;
    }
  }
  
  /**
   * List jobs with filters
   * @param {string} tenantId - Tenant ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Job[]>}
   */
  async list(tenantId, filters = {}) {
    try {
      let sql = 'SELECT * FROM raw.st_jobs WHERE tenant_id = $1';
      const params = [tenantId];
      
      if (filters.status) {
        sql += ` AND status = $${params.length + 1}`;
        params.push(filters.status);
      }
      
      if (filters.customerId) {
        sql += ` AND customer_id = $${params.length + 1}`;
        params.push(filters.customerId);
      }
      
      if (filters.locationId) {
        sql += ` AND location_id = $${params.length + 1}`;
        params.push(filters.locationId);
      }
      
      if (filters.businessUnitId) {
        sql += ` AND business_unit_id = $${params.length + 1}`;
        params.push(filters.businessUnitId);
      }
      
      sql += ' ORDER BY created_on DESC';
      
      if (filters.limit) {
        sql += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      } else {
        sql += ' LIMIT 100';
      }
      
      const result = await query(sql, params);
      return result.rows.map(row => this.mapToJob(row));
    } catch (error) {
      logger.error({ error: error.message, tenantId, filters }, 'Error listing jobs');
      throw error;
    }
  }
  
  /**
   * List jobs by customer
   * @param {string} tenantId - Tenant ID
   * @param {string} customerId - Customer ID
   * @returns {Promise<Job[]>}
   */
  async listByCustomer(tenantId, customerId) {
    return this.list(tenantId, { customerId });
  }
  
  /**
   * List jobs by location
   * @param {string} tenantId - Tenant ID
   * @param {string} locationId - Location ID
   * @returns {Promise<Job[]>}
   */
  async listByLocation(tenantId, locationId) {
    return this.list(tenantId, { locationId });
  }
  
  /**
   * List jobs by technician
   * @param {string} tenantId - Tenant ID
   * @param {string} technicianId - Technician ID
   * @param {Date} date - Date to filter by
   * @returns {Promise<Job[]>}
   */
  async listByTechnician(tenantId, technicianId, date) {
    try {
      // Query jobs with technician assignment
      const sql = `
        SELECT j.* FROM raw.st_jobs j
        WHERE j.tenant_id = $1
        AND j.full_data->'technicians' @> $2::jsonb
        AND DATE(j.scheduled_start) = $3
        ORDER BY j.scheduled_start
      `;
      
      const result = await query(sql, [
        tenantId,
        JSON.stringify([{ technicianId }]),
        date.toISOString().split('T')[0],
      ]);
      
      return result.rows.map(row => this.mapToJob(row));
    } catch (error) {
      logger.error({ error: error.message, tenantId, technicianId }, 'Error listing jobs by technician');
      throw error;
    }
  }
  
  /**
   * Create job (not supported - ST is source of truth)
   */
  async create(tenantId, data) {
    throw new Error('Job creation not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Update job (not supported - ST is source of truth)
   */
  async update(tenantId, id, data) {
    throw new Error('Job updates not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Update job status (not supported - ST is source of truth)
   */
  async updateStatus(tenantId, id, status) {
    throw new Error('Job status updates not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Assign technician to job (not supported - ST is source of truth)
   */
  async assignTechnician(tenantId, id, technicianId) {
    throw new Error('Technician assignment not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Cancel job (not supported - ST is source of truth)
   */
  async cancel(tenantId, id) {
    throw new Error('Job cancellation not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Sync jobs from ServiceTitan API
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<SyncResult>}
   */
  async syncFromExternal(tenantId) {
    try {
      // Sync recent jobs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const jobs = await stClient.jobs.list({
        modifiedOnOrAfter: thirtyDaysAgo.toISOString(),
      });
      
      let synced = 0;
      
      for (const job of jobs) {
        await this.cacheJob(tenantId, job);
        synced++;
      }
      
      await query(
        `INSERT INTO raw.sync_state (tenant_id, table_name, last_full_sync, records_synced)
         VALUES ($1, 'st_jobs', NOW(), $2)
         ON CONFLICT (tenant_id, table_name) 
         DO UPDATE SET last_full_sync = NOW(), records_synced = $2`,
        [tenantId, synced]
      );
      
      logger.info({ tenantId, synced }, 'Jobs synced from ServiceTitan');
      return { synced, errors: 0 };
    } catch (error) {
      logger.error({ error: error.message, tenantId }, 'Error syncing jobs');
      return { synced: 0, errors: 1, lastError: error.message };
    }
  }
  
  /**
   * Map database row to Job object
   * @param {Object} row - Database row
   * @returns {Job}
   */
  mapToJob(row) {
    return {
      id: row.st_id || String(row.id),
      tenantId: String(row.tenant_id),
      jobNumber: row.job_number,
      customerId: row.customer_id,
      locationId: row.location_id,
      projectId: row.project_id,
      businessUnitId: row.business_unit_id,
      jobTypeId: row.job_type_id,
      campaignId: row.campaign_id,
      status: row.status,
      priority: row.priority,
      summary: row.summary,
      scheduledStart: row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      actualStart: row.actual_start,
      actualEnd: row.actual_end,
      duration: row.duration,
      technicians: row.full_data?.technicians || [],
      total: parseFloat(row.total) || 0,
      active: row.active !== false,
      createdOn: row.created_on,
      modifiedOn: row.modified_on,
      _source: 'servicetitan',
      _stId: row.st_id || String(row.id),
    };
  }
  
  /**
   * Cache job data locally
   * @param {string} tenantId - Tenant ID
   * @param {Object} job - Job data from ST API
   */
  async cacheJob(tenantId, job) {
    await query(`
      INSERT INTO raw.st_jobs (
        tenant_id, st_id, job_number, customer_id, location_id, project_id,
        business_unit_id, job_type_id, campaign_id, status, priority, summary,
        scheduled_start, scheduled_end, actual_start, actual_end, duration,
        total, active, created_on, modified_on, full_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW())
      ON CONFLICT (tenant_id, st_id) 
      DO UPDATE SET 
        job_number = $3, customer_id = $4, location_id = $5, project_id = $6,
        business_unit_id = $7, job_type_id = $8, campaign_id = $9,
        status = $10, priority = $11, summary = $12,
        scheduled_start = $13, scheduled_end = $14, actual_start = $15, actual_end = $16,
        duration = $17, total = $18, active = $19,
        modified_on = $21, full_data = $22, synced_at = NOW(), updated_at = NOW()
    `, [
      tenantId,
      String(job.id),
      job.jobNumber,
      job.customerId,
      job.locationId,
      job.projectId,
      job.businessUnitId,
      job.jobTypeId,
      job.campaignId,
      job.status,
      job.priority,
      job.summary,
      job.scheduledStart,
      job.scheduledEnd,
      job.actualStart,
      job.actualEnd,
      job.duration,
      job.total,
      job.active !== false,
      job.createdOn,
      job.modifiedOn,
      JSON.stringify(job),
    ]);
  }
}

export default ServiceTitanJobProvider;
