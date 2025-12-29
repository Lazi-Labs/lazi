/**
 * Installed Equipment Provider Interface
 * Maps to: /equipment-systems/v2/tenant/{tenant}/*
 */

/**
 * @typedef {Object} InstalledEquipment
 * @property {string} id
 * @property {string} tenantId
 * @property {string} locationId
 * @property {string} [customerId]
 * @property {string} name
 * @property {string} [manufacturer]
 * @property {string} [model]
 * @property {string} [serialNumber]
 * @property {Date} [installDate]
 * @property {Date} [warrantyStart]
 * @property {Date} [warrantyEnd]
 * @property {string} status - 'Active'|'Inactive'|'Replaced'
 * @property {string} [notes]
 * @property {string} _source
 * @property {string} [_stId]
 */

/**
 * @typedef {Object} IEquipmentProvider
 * @property {function(string, string): Promise<InstalledEquipment|null>} getById
 * @property {function(string, Object): Promise<InstalledEquipment[]>} list
 * @property {function(string, string): Promise<InstalledEquipment[]>} listByLocation
 * @property {function(string, string): Promise<InstalledEquipment[]>} listByCustomer
 * @property {function(string, Partial<InstalledEquipment>): Promise<InstalledEquipment>} create
 * @property {function(string, string, Partial<InstalledEquipment>): Promise<InstalledEquipment>} update
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
