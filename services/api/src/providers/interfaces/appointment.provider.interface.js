/**
 * Appointment Provider Interface
 * Maps to: /jpm/v2/tenant/{tenant}/appointments
 */

/**
 * @typedef {Object} Appointment
 * @property {string} id
 * @property {string} tenantId
 * @property {string} jobId
 * @property {string} [technicianId]
 * @property {Date} start
 * @property {Date} end
 * @property {string} arrivalWindowStart
 * @property {string} arrivalWindowEnd
 * @property {string} status - 'Scheduled'|'Dispatched'|'OnTheWay'|'Arrived'|'Completed'|'Canceled'
 * @property {boolean} active
 * @property {string} _source
 * @property {string} [_stId]
 */

/**
 * @typedef {Object} IAppointmentProvider
 * @property {function(string, string): Promise<Appointment|null>} getById
 * @property {function(string, Object): Promise<Appointment[]>} list
 * @property {function(string, string): Promise<Appointment[]>} listByJob
 * @property {function(string, string, Date): Promise<Appointment[]>} listByTechnician
 * @property {function(string, Date, Date): Promise<Appointment[]>} listByDateRange
 * @property {function(string, Partial<Appointment>): Promise<Appointment>} create
 * @property {function(string, string, Partial<Appointment>): Promise<Appointment>} update
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
