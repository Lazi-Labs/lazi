/**
 * Contact Fetcher Service
 * Fetches contacts from ServiceTitan API
 */

import { stRequest } from '../stClient.js';
import { stEndpoints } from '../../lib/stEndpoints.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('contact-fetcher');

/**
 * Fetch contacts from ServiceTitan API
 */
export async function fetchContacts(options = {}) {
  const { customerId, modifiedOnOrAfter, page = 1, pageSize = 100 } = options;
  
  const params = {
    page: page.toString(),
    pageSize: pageSize.toString(),
  };

  if (customerId) {
    params.customerId = customerId.toString();
  }
  
  if (modifiedOnOrAfter) {
    params.modifiedOnOrAfter = modifiedOnOrAfter.toISOString();
  }

  try {
    const response = await stRequest(stEndpoints.customers.contacts.list(), {
      method: 'GET',
      query: params,
    });

    return response.data || [];
  } catch (error) {
    logger.error({ error: error.message, options }, 'Failed to fetch contacts from ServiceTitan');
    throw error;
  }
}

/**
 * Fetch all contacts with pagination
 */
export async function fetchAllContacts(options = {}) {
  const allContacts = [];
  let page = 1;
  let hasMore = true;
  const pageSize = options.pageSize || 100;

  while (hasMore) {
    const contacts = await fetchContacts({ ...options, page, pageSize });
    allContacts.push(...contacts);
    
    hasMore = contacts.length === pageSize;
    page++;

    // Rate limiting protection
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  logger.info({ total: allContacts.length }, 'Fetched all contacts');
  return allContacts;
}

/**
 * Fetch a single contact by ID
 */
export async function fetchContact(contactId) {
  try {
    // ServiceTitan doesn't have a direct get contact by ID endpoint
    // We need to list contacts and filter
    const response = await stRequest(stEndpoints.customers.contacts.list(), {
      method: 'GET',
      query: { ids: contactId.toString() },
    });
    return response.data?.[0] || null;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch contacts for a specific customer
 */
export async function fetchContactsByCustomer(customerId) {
  return fetchAllContacts({ customerId });
}

export default {
  fetchContacts,
  fetchAllContacts,
  fetchContact,
  fetchContactsByCustomer,
};
