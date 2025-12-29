/**
 * Telecom Provider Interface
 * Maps to: /telecom/v2/tenant/{tenant}/*
 */

/**
 * @typedef {Object} Call
 * @property {string} id
 * @property {string} [customerId]
 * @property {string} direction - 'Inbound'|'Outbound'
 * @property {string} from
 * @property {string} to
 * @property {number} duration
 * @property {string} [recordingUrl]
 * @property {Date} startTime
 */

/**
 * @typedef {Object} ITelecomProvider
 * @property {function(string, Object): Promise<Call[]>} listCalls
 * @property {function(string, string): Promise<Call|null>} getCallById
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
