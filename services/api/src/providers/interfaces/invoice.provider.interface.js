/**
 * Invoice Provider Interface
 * Maps to: /accounting/v2/tenant/{tenant}/invoices
 */

/**
 * @typedef {Object} Invoice
 * @property {string} id
 * @property {string} tenantId
 * @property {string} invoiceNumber
 * @property {string} customerId
 * @property {string} locationId
 * @property {string} [jobId]
 * @property {string} status - 'Draft'|'Pending'|'Paid'|'PartiallyPaid'|'Void'
 * @property {number} subtotal
 * @property {number} tax
 * @property {number} total
 * @property {number} balance
 * @property {InvoiceItem[]} items
 * @property {Date} invoiceDate
 * @property {Date} [dueDate]
 * @property {Date} createdOn
 * @property {Date} modifiedOn
 * @property {string} _source
 * @property {string} [_stId]
 */

/**
 * @typedef {Object} InvoiceItem
 * @property {string} id
 * @property {string} type - 'Service'|'Material'|'Equipment'
 * @property {string} [serviceId]
 * @property {string} [materialId]
 * @property {string} name
 * @property {string} [description]
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} total
 * @property {boolean} taxable
 */

/**
 * @typedef {Object} IInvoiceProvider
 * @property {function(string, string): Promise<Invoice|null>} getById
 * @property {function(string, Object): Promise<Invoice[]>} list
 * @property {function(string, string): Promise<Invoice[]>} listByCustomer
 * @property {function(string, string): Promise<Invoice[]>} listByJob
 * @property {function(string, Object): Promise<number>} getOutstandingBalance
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
