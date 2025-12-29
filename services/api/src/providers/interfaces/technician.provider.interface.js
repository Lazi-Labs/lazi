/**
 * Technician Provider Interface
 * Maps to: /dispatch/v2/tenant/{tenant}/technicians
 */

/**
 * @typedef {Object} Technician
 * @property {string} id
 * @property {string} tenantId
 * @property {string} name
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [mobile]
 * @property {string} [businessUnitId]
 * @property {string} [teamId]
 * @property {string} [zoneId]
 * @property {string[]} [skills]
 * @property {string} role - 'Technician'|'Helper'|'Apprentice'
 * @property {boolean} active
 * @property {Date} [hireDate]
 * @property {string} [color] - Calendar color
 * @property {string} _source
 * @property {string} [_stId]
 */

/**
 * @typedef {Object} Team
 * @property {string} id
 * @property {string} tenantId
 * @property {string} name
 * @property {string} [businessUnitId]
 * @property {boolean} active
 */

/**
 * @typedef {Object} Zone
 * @property {string} id
 * @property {string} tenantId
 * @property {string} name
 * @property {string[]} [zipCodes]
 * @property {boolean} active
 */

/**
 * @typedef {Object} ITechnicianProvider
 * @property {function(string, string): Promise<Technician|null>} getById
 * @property {function(string, Object): Promise<Technician[]>} list
 * @property {function(string, string): Promise<Technician[]>} listByTeam
 * @property {function(string, string): Promise<Technician[]>} listByBusinessUnit
 * @property {function(string, Date): Promise<Object>} getAvailability
 * @property {function(string, Partial<Technician>): Promise<Technician>} create
 * @property {function(string, string, Partial<Technician>): Promise<Technician>} update
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 * @property {function(string): Promise<Team[]>} listTeams
 * @property {function(string, string): Promise<Team|null>} getTeamById
 * @property {function(string): Promise<Zone[]>} listZones
 * @property {function(string, string): Promise<Zone|null>} getZoneById
 */

export default {};
