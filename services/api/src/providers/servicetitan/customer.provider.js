/**
 * ServiceTitan Customer Provider
 * Fetches customer data from ServiceTitan API and caches locally
 */

import { query } from '../../db/schema-connection.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('st-customer-provider');

export class ServiceTitanCustomerProvider {
  /**
   * Get customer by ID
   * @param {string} tenantId - Tenant ID
   * @param {string} id - Customer ID (ST ID)
   * @returns {Promise<Customer|null>}
   */
  async getById(tenantId, id) {
    try {
      // Check local cache first
      const cached = await query(
        'SELECT * FROM raw.st_customers WHERE tenant_id = $1 AND st_id = $2',
        [tenantId, id]
      );
      
      if (cached.rows[0]) {
        return this.mapToCustomer(cached.rows[0]);
      }
      
      // TODO: Fallback to ST API if not in cache
      logger.warn({ tenantId, id }, 'Customer not in cache, ST API fetch not yet implemented');
      return null;
    } catch (error) {
      logger.error({ error: error.message, tenantId, id }, 'Error getting customer by ID');
      throw error;
    }
  }
  
  /**
   * List customers with filters
   * @param {string} tenantId - Tenant ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Customer[]>}
   */
  async list(tenantId, filters = {}) {
    try {
      let sql = 'SELECT * FROM raw.st_customers WHERE tenant_id = $1';
      const params = [tenantId];
      
      if (filters.search) {
        sql += ' AND (name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)';
        params.push(`%${filters.search}%`);
      }
      
      if (filters.status) {
        const statusParam = filters.status === 'active';
        sql += ` AND active = $${params.length + 1}`;
        params.push(statusParam);
      }
      
      sql += ' ORDER BY name';
      
      if (filters.limit) {
        sql += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      } else {
        sql += ' LIMIT 100';
      }
      
      if (filters.offset) {
        sql += ` OFFSET $${params.length + 1}`;
        params.push(filters.offset);
      }
      
      const result = await query(sql, params);
      return result.rows.map(row => this.mapToCustomer(row));
    } catch (error) {
      logger.error({ error: error.message, tenantId, filters }, 'Error listing customers');
      throw error;
    }
  }
  
  /**
   * Create customer (not supported - ST is source of truth)
   */
  async create(tenantId, data) {
    throw new Error('Customer creation not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Update customer (not supported - ST is source of truth)
   */
  async update(tenantId, id, data) {
    throw new Error('Customer updates not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Delete customer (not supported - ST is source of truth)
   */
  async delete(tenantId, id) {
    throw new Error('Customer deletion not supported in ServiceTitan provider mode. Use ServiceTitan directly.');
  }
  
  /**
   * Sync customers from ServiceTitan API
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<SyncResult>}
   */
  async syncFromExternal(tenantId) {
    try {
      // TODO: Implement full sync from ST API
      logger.warn({ tenantId }, 'Customer sync from ST not yet implemented');
      return { synced: 0, errors: 0 };
    } catch (error) {
      logger.error({ error: error.message, tenantId }, 'Error syncing customers');
      return { synced: 0, errors: 1, lastError: error.message };
    }
  }
  
  /**
   * Map database row to Customer object
   * @param {Object} row - Database row
   * @returns {Customer}
   */
  mapToCustomer(row) {
    return {
      id: row.st_id || String(row.id),
      tenantId: String(row.tenant_id),
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: {
        street: row.address_street,
        city: row.address_city,
        state: row.address_state,
        zip: row.address_zip,
      },
      status: row.active === false ? 'inactive' : 'active',
      balance: parseFloat(row.balance) || 0,
      _source: 'servicetitan',
      _stId: row.st_id || String(row.id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  
  /**
   * Cache customer data locally
   * @param {string} tenantId - Tenant ID
   * @param {Object} customer - Customer data from ST API
   */
  async cacheCustomer(tenantId, customer) {
    const addr = customer.address || customer.addresses?.[0] || {};
    
    await query(`
      INSERT INTO raw.st_customers (
        tenant_id, st_id, name, email, phone,
        address_street, address_city, address_state, address_zip,
        active, balance, full_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (tenant_id, st_id) 
      DO UPDATE SET 
        name = $3, email = $4, phone = $5,
        address_street = $6, address_city = $7, address_state = $8, address_zip = $9,
        active = $10, balance = $11, full_data = $12, synced_at = NOW(), updated_at = NOW()
    `, [
      tenantId,
      String(customer.id),
      customer.name,
      customer.email,
      customer.phone,
      addr.street,
      addr.city,
      addr.state,
      addr.zip,
      customer.active !== false,
      customer.balance || 0,
      JSON.stringify(customer),
    ]);
  }
}

export default ServiceTitanCustomerProvider;
