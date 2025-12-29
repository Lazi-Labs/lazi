/**
 * Task Provider Interface
 * Maps to: /task-management/v2/tenant/{tenant}/*
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} [assignedToId]
 * @property {string} [customerId]
 * @property {string} [jobId]
 * @property {Date} [dueDate]
 * @property {string} status - 'Pending'|'InProgress'|'Completed'
 * @property {string} priority - 'Low'|'Normal'|'High'
 */

/**
 * @typedef {Object} ITaskProvider
 * @property {function(string, Object): Promise<Task[]>} list
 * @property {function(string, string): Promise<Task|null>} getById
 * @property {function(string, Partial<Task>): Promise<Task>} create
 * @property {function(string, string, Partial<Task>): Promise<Task>} update
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
