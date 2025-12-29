/**
 * Form Provider Interface
 * Maps to: /forms/v2/tenant/{tenant}/*
 */

/**
 * @typedef {Object} FormDefinition
 * @property {string} id
 * @property {string} name
 * @property {FormField[]} fields
 * @property {boolean} active
 */

/**
 * @typedef {Object} FormField
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {boolean} required
 */

/**
 * @typedef {Object} FormSubmission
 * @property {string} id
 * @property {string} formDefinitionId
 * @property {string} [jobId]
 * @property {Object} data
 * @property {Date} submittedOn
 */

/**
 * @typedef {Object} IFormProvider
 * @property {function(string): Promise<FormDefinition[]>} listDefinitions
 * @property {function(string, Object): Promise<FormSubmission[]>} listSubmissions
 * @property {function(string, string): Promise<FormSubmission[]>} listByJob
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
