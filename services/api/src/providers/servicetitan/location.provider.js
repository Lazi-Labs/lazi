/**
 * ServiceTitan Location Provider
 * Fetches location data from ServiceTitan API and caches locally
 * Maps to: /crm/v2/tenant/{tenant}/locations
 */

import stClient from '../../services/stClient.js';
import { query } from '../../db/schema-connection.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('st-location-provider');

export class ServiceTitanLocationProvider {
  /**
   * Get location by ID
   * @param {string} tenantId - Tenant ID
   * @param {string} id - Location ID (ST ID)
   * @returns {Promise<Location|null>}
   */
  async getById(tenantId, id) {
    try {
      // Check local cache first
      const cached = await query(
        'SELECT * FROM raw.st_locations WHERE tenant_id = $1 AND st_id = $2',
        [tenantId, id]
      );
      
      if (cached.rows[0]) {
        return this.mapToLocation(cached.rows[0]);
      }
      
      // Fallback to ST API if not in cache
      const stLocation = await stClient.locations.get(id);
      await this.cacheLocation(tenantId, stLocation);
      return this.mapToLocation(stLocation);
    } catch (error) {
      logger.error({ error: error.message, tenantId, id }, 'Error getting location by ID');
      throw error;
    }
  }
  
  /**
   * List locations with filters
   * @param {string} tenantId - Tenant ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Location[]>}
   */
  async list(tenantId, filters = {}) {
    try {
      let sql = 'SELECT * FROM raw.st_locations WHERE tenant_id = $1';
      const params = [tenantId];
      
      if (filters.customerId) {
        sql += ' AND customer_id = $2';
        params.push(filters.customerId);
      }
      
      if (filters.active !== undefined) {
        sql += ` AND active = $${params.length + 1}`;
        params.push(filters.active);
      }
      
      sql += ' ORDER BY name';
      
      if (filters.limit) {
        sql += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      } else {
        sql += ' LIMIT 100';
      }
      
      const result = await query(sql, params);
      return result.rows.map(row => this.mapToLocation(row));
    } catch (error) {
      logger.error({ error: error.message, tenantId, filters }, 'Error listing locations');
      throw error;
    }
  }
  
  /**
   * List locations by customer
   * @param {string} tenantId - Tenant ID
   * @param {string} customerId - Customer ID
   * @returns {Promise<Location[]>}
   */
  async listByCustomer(tenantId, customerId) {
    return this.list(tenantId, { customerId });
  }
  
  /**
   * Create location (not supported - ST is source of truth)
   */
  async create(tenantId, data) {
    throw new Error('Location creation not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Update location (not supported - ST is source of truth)
   */
  async update(tenantId, id, data) {
    throw new Error('Location updates not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Sync locations from ServiceTitan API
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<SyncResult>}
   */
  async syncFromExternal(tenantId) {
    try {
      const locations = await stClient.locations.list();
      let synced = 0;
      
      for (const location of locations) {
        await this.cacheLocation(tenantId, location);
        synced++;
      }
      
      await query(
        `INSERT INTO raw.sync_state (tenant_id, table_name, last_full_sync, records_synced)
         VALUES ($1, 'st_locations', NOW(), $2)
         ON CONFLICT (tenant_id, table_name) 
         DO UPDATE SET last_full_sync = NOW(), records_synced = $2`,
        [tenantId, synced]
      );
      
      logger.info({ tenantId, synced }, 'Locations synced from ServiceTitan');
      return { synced, errors: 0 };
    } catch (error) {
      logger.error({ error: error.message, tenantId }, 'Error syncing locations');
      return { synced: 0, errors: 1, lastError: error.message };
    }
  }
  
  /**
   * Map database row to Location object
   * @param {Object} row - Database row
   * @returns {Location}
   */
  mapToLocation(row) {
    return {
      id: row.st_id || String(row.id),
      tenantId: String(row.tenant_id),
      customerId: row.customer_id,
      name: row.name,
      address: {
        street: row.address_street,
        unit: row.address_unit,
        city: row.address_city,
        state: row.address_state,
        zip: row.address_zip,
        country: row.address_country,
        latitude: row.latitude,
        longitude: row.longitude,
      },
      phone: row.phone,
      email: row.email,
      taxZoneId: row.tax_zone_id,
      zoneId: row.zone_id,
      active: row.active !== false,
      createdOn: row.created_on,
      modifiedOn: row.modified_on,
      _source: 'servicetitan',
      _stId: row.st_id || String(row.id),
    };
  }
  
  /**
   * Cache location data locally
   * @param {string} tenantId - Tenant ID
   * @param {Object} location - Location data from ST API
   */
  async cacheLocation(tenantId, location) {
    const addr = location.address || {};
    
    await query(`
      INSERT INTO raw.st_locations (
        tenant_id, st_id, customer_id, name,
        address_street, address_unit, address_city, address_state, address_zip, address_country,
        latitude, longitude, phone, email, tax_zone_id, zone_id,
        active, created_on, modified_on, full_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
      ON CONFLICT (tenant_id, st_id) 
      DO UPDATE SET 
        customer_id = $3, name = $4,
        address_street = $5, address_unit = $6, address_city = $7, address_state = $8, 
        address_zip = $9, address_country = $10,
        latitude = $11, longitude = $12, phone = $13, email = $14,
        tax_zone_id = $15, zone_id = $16, active = $17,
        modified_on = $19, full_data = $20, synced_at = NOW(), updated_at = NOW()
    `, [
      tenantId,
      String(location.id),
      location.customerId,
      location.name,
      addr.street,
      addr.unit,
      addr.city,
      addr.state,
      addr.zip,
      addr.country,
      addr.latitude,
      addr.longitude,
      location.phone,
      location.email,
      location.taxZoneId,
      location.zoneId,
      location.active !== false,
      location.createdOn,
      location.modifiedOn,
      JSON.stringify(location),
    ]);
  }
}

export default ServiceTitanLocationProvider;
