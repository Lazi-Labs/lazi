/**
 * Job Provider Interface
 * Maps to: /jpm/v2/tenant/{tenant}/jobs
 */

/**
 * @typedef {Object} Job
 * @property {string} id
 * @property {string} tenantId
 * @property {string} jobNumber
 * @property {string} customerId
 * @property {string} locationId
 * @property {string} [projectId]
 * @property {string} businessUnitId
 * @property {string} jobTypeId
 * @property {string} campaignId
 * @property {string} status - 'Pending'|'Scheduled'|'Dispatched'|'Working'|'Completed'|'Canceled'
 * @property {string} [priority] - 'Low'|'Normal'|'High'|'Urgent'
 * @property {string} summary
 * @property {Date} [scheduledStart]
 * @property {Date} [scheduledEnd]
 * @property {Date} [actualStart]
 * @property {Date} [actualEnd]
 * @property {number} [duration]
 * @property {JobTechnician[]} [technicians]
 * @property {number} [total]
 * @property {boolean} active
 * @property {Date} createdOn
 * @property {Date} modifiedOn
 * @property {string} _source
 * @property {string} [_stId]
 */

/**
 * @typedef {Object} JobTechnician
 * @property {string} technicianId
 * @property {boolean} isPrimary
 */

/**
 * @typedef {Object} JobFilters
 * @property {string} [status]
 * @property {string} [customerId]
 * @property {string} [locationId]
 * @property {string} [technicianId]
 * @property {string} [businessUnitId]
 * @property {Date} [scheduledOnOrAfter]
 * @property {Date} [scheduledBefore]
 * @property {Date} [completedOnOrAfter]
 * @property {Date} [modifiedOnOrAfter]
 */

/**
 * @typedef {Object} IJobProvider
 * @property {function(string, string): Promise<Job|null>} getById
 * @property {function(string, JobFilters): Promise<Job[]>} list
 * @property {function(string, string): Promise<Job[]>} listByCustomer
 * @property {function(string, string): Promise<Job[]>} listByLocation
 * @property {function(string, string, Date): Promise<Job[]>} listByTechnician
 * @property {function(string, Partial<Job>): Promise<Job>} create
 * @property {function(string, string, Partial<Job>): Promise<Job>} update
 * @property {function(string, string, string): Promise<Job>} updateStatus
 * @property {function(string, string, string): Promise<Job>} assignTechnician
 * @property {function(string, string): Promise<void>} cancel
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
