/**
 * Payment Provider Interface
 * Maps to: /accounting/v2/tenant/{tenant}/payments
 */

/**
 * @typedef {Object} Payment
 * @property {string} id
 * @property {string} tenantId
 * @property {string} customerId
 * @property {string} [invoiceId]
 * @property {string} type - 'Cash'|'Check'|'CreditCard'|'ACH'|'Financing'
 * @property {number} amount
 * @property {string} status - 'Pending'|'Completed'|'Failed'|'Refunded'
 * @property {string} [referenceNumber]
 * @property {string} [checkNumber]
 * @property {string} [last4]
 * @property {Date} paymentDate
 * @property {Date} createdOn
 * @property {string} _source
 * @property {string} [_stId]
 */

/**
 * @typedef {Object} IPaymentProvider
 * @property {function(string, string): Promise<Payment|null>} getById
 * @property {function(string, Object): Promise<Payment[]>} list
 * @property {function(string, string): Promise<Payment[]>} listByCustomer
 * @property {function(string, string): Promise<Payment[]>} listByInvoice
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
