/**
 * ServiceTitan Pricebook Provider
 * Reads pricebook data from local cache (synced from ServiceTitan)
 */

import { query } from '../../db/schema-connection.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('st-pricebook-provider');

export class ServiceTitanPricebookProvider {
  /**
   * List categories with filters
   * @param {string} tenantId - Tenant ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Category[]>}
   */
  async listCategories(tenantId, filters = {}) {
    try {
      let sql = 'SELECT * FROM master.pricebook_categories WHERE tenant_id = $1';
      const params = [tenantId];
      
      if (filters.type) {
        sql += ` AND type = $${params.length + 1}`;
        params.push(filters.type);
      }
      
      if (!filters.includeInactive) {
        sql += ' AND is_active = true';
      }
      
      if (filters.parentId !== undefined) {
        if (filters.parentId === null) {
          sql += ' AND parent_id IS NULL';
        } else {
          sql += ` AND parent_id = $${params.length + 1}`;
          params.push(filters.parentId);
        }
      }
      
      sql += ' ORDER BY global_sort_order, name';
      
      const result = await query(sql, params);
      return result.rows.map(row => this.mapCategory(row));
    } catch (error) {
      logger.error({ error: error.message, tenantId, filters }, 'Error listing categories');
      throw error;
    }
  }
  
  /**
   * Get category by ID
   * @param {string} tenantId - Tenant ID
   * @param {string} id - Category ID (can be internal ID or ST ID)
   * @returns {Promise<Category|null>}
   */
  async getCategoryById(tenantId, id) {
    try {
      const result = await query(
        'SELECT * FROM master.pricebook_categories WHERE tenant_id = $1 AND (id = $2 OR st_id = $2)',
        [tenantId, id]
      );
      
      return result.rows[0] ? this.mapCategory(result.rows[0]) : null;
    } catch (error) {
      logger.error({ error: error.message, tenantId, id }, 'Error getting category by ID');
      throw error;
    }
  }
  
  /**
   * Create category
   * @param {string} tenantId - Tenant ID
   * @param {Object} data - Category data
   * @returns {Promise<Category>}
   */
  async createCategory(tenantId, data) {
    try {
      const result = await query(`
        INSERT INTO master.pricebook_categories (
          tenant_id, name, type, parent_id, is_active, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        tenantId,
        data.name,
        data.type || 'service',
        data.parentId || null,
        data.isActive !== false,
        data.createdBy || null,
      ]);
      
      return this.mapCategory(result.rows[0]);
    } catch (error) {
      logger.error({ error: error.message, tenantId, data }, 'Error creating category');
      throw error;
    }
  }
  
  /**
   * Update category
   * @param {string} tenantId - Tenant ID
   * @param {string} id - Category ID
   * @param {Object} data - Update data
   * @returns {Promise<Category>}
   */
  async updateCategory(tenantId, id, data) {
    try {
      const updates = [];
      const params = [tenantId, id];
      let paramIndex = 3;
      
      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(data.name);
      }
      
      if (data.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(data.isActive);
      }
      
      if (data.parentId !== undefined) {
        updates.push(`parent_id = $${paramIndex++}`);
        params.push(data.parentId);
      }
      
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      
      updates.push('updated_at = NOW()');
      
      const result = await query(`
        UPDATE master.pricebook_categories
        SET ${updates.join(', ')}
        WHERE tenant_id = $1 AND (id = $2 OR st_id = $2)
        RETURNING *
      `, params);
      
      if (!result.rows[0]) {
        throw new Error('Category not found');
      }
      
      return this.mapCategory(result.rows[0]);
    } catch (error) {
      logger.error({ error: error.message, tenantId, id, data }, 'Error updating category');
      throw error;
    }
  }
  
  /**
   * List services
   * @param {string} tenantId - Tenant ID
   * @param {string} categoryId - Optional category filter
   * @returns {Promise<Service[]>}
   */
  async listServices(tenantId, categoryId = null) {
    try {
      let sql = 'SELECT * FROM master.pricebook_services WHERE tenant_id = $1';
      const params = [tenantId];
      
      if (categoryId) {
        sql += ` AND category_id = $${params.length + 1}`;
        params.push(categoryId);
      }
      
      sql += ' ORDER BY display_name';
      
      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      logger.error({ error: error.message, tenantId, categoryId }, 'Error listing services');
      throw error;
    }
  }
  
  /**
   * List materials
   * @param {string} tenantId - Tenant ID
   * @param {string} categoryId - Optional category filter
   * @returns {Promise<Material[]>}
   */
  async listMaterials(tenantId, categoryId = null) {
    try {
      let sql = 'SELECT * FROM master.pricebook_materials WHERE tenant_id = $1';
      const params = [tenantId];
      
      if (categoryId) {
        sql += ` AND category_id = $${params.length + 1}`;
        params.push(categoryId);
      }
      
      sql += ' ORDER BY display_name';
      
      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      logger.error({ error: error.message, tenantId, categoryId }, 'Error listing materials');
      throw error;
    }
  }
  
  /**
   * Map database row to Category object
   * @param {Object} row - Database row
   * @returns {Category}
   */
  mapCategory(row) {
    return {
      id: row.id || row.st_id,
      tenantId: String(row.tenant_id),
      name: row.name,
      type: row.type,
      parentId: row.parent_id,
      path: row.path,
      isActive: row.is_active !== false,
      globalSortOrder: row.global_sort_order,
      _source: 'servicetitan',
      _stId: row.st_id,
    };
  }
}

export default ServiceTitanPricebookProvider;
