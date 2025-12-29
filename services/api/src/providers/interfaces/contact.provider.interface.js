/**
 * Contact Provider Interface
 * Maps to: /crm/v2/tenant/{tenant}/contacts
 */

/**
 * @typedef {Object} Contact
 * @property {string} id
 * @property {string} tenantId
 * @property {string} customerId
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [mobile]
 * @property {string} type - 'Primary' | 'Secondary' | 'Billing'
 * @property {boolean} active
 * @property {string} _source
 * @property {string} [_stId]
 */

/**
 * @typedef {Object} IContactProvider
 * @property {function(string, string): Promise<Contact|null>} getById
 * @property {function(string, Object): Promise<Contact[]>} list
 * @property {function(string, string): Promise<Contact[]>} listByCustomer
 * @property {function(string, Partial<Contact>): Promise<Contact>} create
 * @property {function(string, string, Partial<Contact>): Promise<Contact>} update
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
