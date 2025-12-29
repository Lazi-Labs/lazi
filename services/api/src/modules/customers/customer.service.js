/**
 * Customer Service
 * Business logic for customer operations
 */

import { getCustomerProvider } from '../../providers/factory.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('customer-service');

/**
 * List customers with filters
 */
export async function listCustomers(tenantId, filters = {}) {
  const provider = getCustomerProvider(tenantId);
  return await provider.list(tenantId, filters);
}

/**
 * Search customers by term
 */
export async function searchCustomers(tenantId, searchTerm) {
  const provider = getCustomerProvider(tenantId);
  return await provider.search(tenantId, searchTerm);
}

/**
 * Get customer by ID
 */
export async function getCustomer(tenantId, customerId) {
  const provider = getCustomerProvider(tenantId);
  return await provider.getById(tenantId, customerId);
}

/**
 * Create customer
 */
export async function createCustomer(tenantId, customerData) {
  const provider = getCustomerProvider(tenantId);
  return await provider.create(tenantId, customerData);
}

/**
 * Update customer
 */
export async function updateCustomer(tenantId, customerId, updates) {
  const provider = getCustomerProvider(tenantId);
  return await provider.update(tenantId, customerId, updates);
}

/**
 * Delete customer
 */
export async function deleteCustomer(tenantId, customerId) {
  const provider = getCustomerProvider(tenantId);
  return await provider.delete(tenantId, customerId);
}

/**
 * Sync customers from external source
 */
export async function syncCustomers(tenantId) {
  const provider = getCustomerProvider(tenantId);
  return await provider.syncFromExternal(tenantId);
}

/**
 * Get customer count
 */
export async function getCustomerCount(tenantId, filters = {}) {
  const provider = getCustomerProvider(tenantId);
  return await provider.count(tenantId, filters);
}
