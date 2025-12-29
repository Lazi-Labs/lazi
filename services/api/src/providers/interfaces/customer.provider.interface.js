/**
 * Customer Provider Interface
 * All customer data providers must implement this interface
 */

/**
 * @typedef {Object} Customer
 * @property {string} id - Customer ID
 * @property {string} tenantId - Tenant ID
 * @property {string} name - Customer name
 * @property {string} [email] - Email address
 * @property {string} [phone] - Phone number
 * @property {Object} [address] - Address object
 * @property {'active'|'inactive'} status - Customer status
 * @property {number} [balance] - Account balance
 * @property {'servicetitan'|'lazi'} _source - Data source
 * @property {string} [_stId] - ServiceTitan ID (if synced)
 * @property {Date} createdAt - Created timestamp
 * @property {Date} updatedAt - Updated timestamp
 */

/**
 * @typedef {Object} CustomerFilters
 * @property {string} [search] - Search term for name/email/phone
 * @property {'active'|'inactive'} [status] - Filter by status
 * @property {number} [limit] - Result limit
 * @property {number} [offset] - Result offset
 */

/**
 * @typedef {Object} CreateCustomerDTO
 * @property {string} name - Customer name
 * @property {string} [email] - Email address
 * @property {string} [phone] - Phone number
 * @property {Object} [address] - Address object
 */

/**
 * @typedef {Object} UpdateCustomerDTO
 * @property {string} [name] - Customer name
 * @property {string} [email] - Email address
 * @property {string} [phone] - Phone number
 * @property {Object} [address] - Address object
 * @property {'active'|'inactive'} [status] - Customer status
 */

/**
 * @typedef {Object} SyncResult
 * @property {number} synced - Number of records synced
 * @property {number} errors - Number of errors
 * @property {string} [lastError] - Last error message
 */

/**
 * @typedef {Object} ICustomerProvider
 * @property {function(string, string): Promise<Customer|null>} getById
 * @property {function(string, CustomerFilters=): Promise<Customer[]>} list
 * @property {function(string, CreateCustomerDTO): Promise<Customer>} create
 * @property {function(string, string, UpdateCustomerDTO): Promise<Customer>} update
 * @property {function(string, string): Promise<void>} delete
 * @property {function(string): Promise<SyncResult>} [syncFromExternal]
 */

export default {};
