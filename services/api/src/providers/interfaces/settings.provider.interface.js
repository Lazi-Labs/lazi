/**
 * Settings Provider Interface
 * Maps to: /settings/v2/tenant/{tenant}/*
 */

/**
 * @typedef {Object} BusinessUnit
 * @property {string} id
 * @property {string} name
 * @property {boolean} active
 */

/**
 * @typedef {Object} Tag
 * @property {string} id
 * @property {string} name
 * @property {string} type
 */

/**
 * @typedef {Object} ISettingsProvider
 * @property {function(string): Promise<BusinessUnit[]>} listBusinessUnits
 * @property {function(string): Promise<Tag[]>} listTags
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
