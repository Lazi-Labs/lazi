/**
 * Location Provider Interface
 * Maps to: /crm/v2/tenant/{tenant}/locations
 */

/**
 * @typedef {Object} Location
 * @property {string} id
 * @property {string} tenantId
 * @property {string} customerId
 * @property {string} name
 * @property {LocationAddress} address
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [taxZoneId]
 * @property {string} [zoneId]
 * @property {boolean} active
 * @property {Date} createdOn
 * @property {Date} modifiedOn
 * @property {string} _source
 * @property {string} [_stId]
 */

/**
 * @typedef {Object} LocationAddress
 * @property {string} street
 * @property {string} [unit]
 * @property {string} city
 * @property {string} state
 * @property {string} zip
 * @property {string} [country]
 * @property {number} [latitude]
 * @property {number} [longitude]
 */

/**
 * @typedef {Object} ILocationProvider
 * @property {function(string, string): Promise<Location|null>} getById
 * @property {function(string, Object): Promise<Location[]>} list
 * @property {function(string, string): Promise<Location[]>} listByCustomer
 * @property {function(string, Partial<Location>): Promise<Location>} create
 * @property {function(string, string, Partial<Location>): Promise<Location>} update
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
