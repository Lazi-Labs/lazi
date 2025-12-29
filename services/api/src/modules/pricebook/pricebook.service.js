/**
 * Pricebook Service
 * Business logic layer - uses provider pattern for data access
 */

import { getPricebookProvider } from '../../providers/factory.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('pricebook-service');

/**
 * List categories
 * @param {string} tenantId - Tenant ID
 * @param {Object} options - Filter options
 * @returns {Promise<Category[]>}
 */
export const listCategories = async (tenantId, options = {}) => {
  const provider = getPricebookProvider(tenantId);
  return provider.listCategories(tenantId, options);
};

/**
 * Get category tree (hierarchical structure)
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object[]>}
 */
export const getCategoryTree = async (tenantId) => {
  const provider = getPricebookProvider(tenantId);
  const categories = await provider.listCategories(tenantId, { includeInactive: false });
  
  return buildTree(categories);
};

/**
 * Get category by ID
 * @param {string} tenantId - Tenant ID
 * @param {string} id - Category ID
 * @returns {Promise<Category|null>}
 */
export const getCategoryById = async (tenantId, id) => {
  const provider = getPricebookProvider(tenantId);
  return provider.getCategoryById(tenantId, id);
};

/**
 * Create category
 * @param {string} tenantId - Tenant ID
 * @param {Object} data - Category data
 * @returns {Promise<Category>}
 */
export const createCategory = async (tenantId, data) => {
  const provider = getPricebookProvider(tenantId);
  
  // Validate required fields
  if (!data.name) {
    throw new Error('Category name is required');
  }
  
  return provider.createCategory(tenantId, data);
};

/**
 * Update category
 * @param {string} tenantId - Tenant ID
 * @param {string} id - Category ID
 * @param {Object} data - Update data
 * @returns {Promise<Category>}
 */
export const updateCategory = async (tenantId, id, data) => {
  const provider = getPricebookProvider(tenantId);
  return provider.updateCategory(tenantId, id, data);
};

/**
 * List services
 * @param {string} tenantId - Tenant ID
 * @param {string} categoryId - Optional category filter
 * @returns {Promise<Service[]>}
 */
export const listServices = async (tenantId, categoryId = null) => {
  const provider = getPricebookProvider(tenantId);
  return provider.listServices(tenantId, categoryId);
};

/**
 * List materials
 * @param {string} tenantId - Tenant ID
 * @param {string} categoryId - Optional category filter
 * @returns {Promise<Material[]>}
 */
export const listMaterials = async (tenantId, categoryId = null) => {
  const provider = getPricebookProvider(tenantId);
  return provider.listMaterials(tenantId, categoryId);
};

/**
 * Build hierarchical tree from flat category list
 * @param {Category[]} categories - Flat category list
 * @returns {Object[]} Tree structure
 */
function buildTree(categories) {
  const map = new Map();
  const roots = [];
  
  // Create map of all categories
  categories.forEach(cat => {
    map.set(cat.id, { ...cat, children: [] });
  });
  
  // Build tree structure
  categories.forEach(cat => {
    const node = map.get(cat.id);
    
    if (cat.parentId && map.has(cat.parentId)) {
      // Add to parent's children
      map.get(cat.parentId).children.push(node);
    } else {
      // Root level category
      roots.push(node);
    }
  });
  
  return roots;
}
