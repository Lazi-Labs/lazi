/**
 * Pricebook Provider Interface
 * All pricebook data providers must implement this interface
 */

/**
 * @typedef {Object} Category
 * @property {string} id - Category ID
 * @property {string} tenantId - Tenant ID
 * @property {string} name - Category name
 * @property {string} [parentId] - Parent category ID
 * @property {string} [path] - Hierarchical path
 * @property {boolean} isActive - Active status
 * @property {'servicetitan'|'lazi'} _source - Data source
 * @property {string} [_stId] - ServiceTitan ID (if synced)
 */

/**
 * @typedef {Object} Service
 * @property {string} id - Service ID
 * @property {string} tenantId - Tenant ID
 * @property {string} categoryId - Category ID
 * @property {string} name - Service name
 * @property {string} [code] - Service code
 * @property {number} price - Service price
 * @property {string} [description] - Description
 * @property {boolean} isActive - Active status
 */

/**
 * @typedef {Object} Material
 * @property {string} id - Material ID
 * @property {string} tenantId - Tenant ID
 * @property {string} categoryId - Category ID
 * @property {string} name - Material name
 * @property {string} [code] - Material code
 * @property {number} price - Material price
 * @property {string} [description] - Description
 * @property {boolean} isActive - Active status
 */

/**
 * @typedef {Object} IPricebookProvider
 * @property {function(string, Object=): Promise<Category[]>} listCategories
 * @property {function(string, string): Promise<Category|null>} getCategoryById
 * @property {function(string, Object): Promise<Category>} createCategory
 * @property {function(string, string, Object): Promise<Category>} updateCategory
 * @property {function(string, string=): Promise<Service[]>} listServices
 * @property {function(string, string=): Promise<Material[]>} listMaterials
 */

export default {};
