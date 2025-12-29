/**
 * Timesheet Provider Interface
 * Maps to: /timesheets/v2/tenant/{tenant}/*
 */

/**
 * @typedef {Object} Timesheet
 * @property {string} id
 * @property {string} technicianId
 * @property {Date} date
 * @property {number} regularHours
 * @property {number} [overtimeHours]
 * @property {string} status
 */

/**
 * @typedef {Object} ITimesheetProvider
 * @property {function(string, Object): Promise<Timesheet[]>} list
 * @property {function(string, string, Date): Promise<Timesheet[]>} listByTechnician
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
