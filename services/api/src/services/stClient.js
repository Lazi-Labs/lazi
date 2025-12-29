/**
 * ServiceTitan API Client
 * Handles all HTTP communication with ServiceTitan APIs
 * Features: automatic token refresh, retry logic, error normalization
 */

import fetch from 'node-fetch';
import config from '../config/index.js';
import { createLogger } from '../lib/logger.js';
import { getAccessToken } from './tokenManager.js';
import { RateLimitError, ServiceTitanError } from '../lib/errors.js';

const logger = createLogger('stClient');

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build URL with query parameters
 */
function buildUrl(baseUrl, queryParams = {}) {
  const url = new URL(baseUrl);

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value));
    }
  });

  return url.toString();
}

/**
 * Make a request to the ServiceTitan API
 *
 * @param {string} url - The full ServiceTitan API URL
 * @param {object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {object} options.query - Query parameters to append to URL
 * @param {object} options.body - Request body for POST/PUT/PATCH
 * @param {number} options.retryCount - Current retry attempt (internal use)
 * @returns {Promise<{status: number, data: object}>}
 */
export async function stRequest(url, options = {}) {
  const { method = 'GET', query = {}, body = null, retryCount = 0 } = options;

  // Build final URL with query params
  const finalUrl = Object.keys(query).length > 0 ? buildUrl(url, query) : url;

  // Get access token (with caching)
  const token = await getAccessToken();

  const requestOptions = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'ST-App-Key': config.serviceTitan.appKey,
      'Content-Type': 'application/json',
    },
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  logger.debug({ method, url: finalUrl }, 'ServiceTitan API request');

  try {
    const response = await fetch(finalUrl, requestOptions);
    let data;

    // Try to parse JSON response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // For non-JSON responses (empty bodies, etc.)
      const text = await response.text();
      data = text ? { message: text } : {};
    }

    // Handle retry-able errors
    if (response.status === 429 || response.status >= 500) {
      if (retryCount < config.retry.maxRetries) {
        const retryAfter = response.headers.get('retry-after');
        const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : config.retry.delayMs * (retryCount + 1);

        logger.warn(
          { status: response.status, retryCount: retryCount + 1, delayMs },
          'Retrying ServiceTitan request'
        );

        await sleep(delayMs);
        return stRequest(url, { ...options, retryCount: retryCount + 1 });
      }

      // Max retries exceeded
      logger.error({ status: response.status, retries: retryCount }, 'Max retries exceeded');
      throw response.status === 429
        ? new RateLimitError()
        : new ServiceTitanError('ServiceTitan API unavailable after retries', response.status);
    }

    // Log non-2xx responses
    if (!response.ok) {
      logger.warn({ status: response.status, data }, 'ServiceTitan API error response');
    } else {
      logger.debug({ status: response.status }, 'ServiceTitan API success');
    }

    return {
      status: response.status,
      data,
      ok: response.ok,
    };
  } catch (error) {
    // If it's already our error type, rethrow
    if (error.isOperational) {
      throw error;
    }

    // Network or other errors
    logger.error({ error: error.message, url: finalUrl }, 'ServiceTitan request failed');
    throw new ServiceTitanError(`Request failed: ${error.message}`, 500);
  }
}

/**
 * ServiceTitan API Client Class
 * Provides organized access to all ServiceTitan API endpoints
 */
class ServiceTitanClient {
  constructor() {
    this.baseUrl = config.serviceTitan.apiBaseUrl;
    this.tenantId = config.serviceTitan.tenantId;
  }

  /**
   * Fetch all pages from a paginated endpoint
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options
   * @returns {Promise<Array>} All data from all pages
   */
  async fetchAllPages(endpoint, options = {}) {
    const allData = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 100; // Safety limit

    while (hasMore && page <= maxPages) {
      const response = await stRequest(endpoint, {
        ...options,
        query: { ...options.query, page, pageSize: 100 },
      });

      if (response.ok && response.data.data?.length) {
        allData.push(...response.data.data);
        hasMore = response.data.hasMore && response.data.data.length === 100;
      } else {
        hasMore = false;
      }

      page++;
      if (hasMore) await sleep(200); // Rate limiting
    }

    return allData;
  }

  /**
   * Make a single request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options
   * @returns {Promise<object>} Response data
   */
  async request(endpoint, options = {}) {
    const response = await stRequest(endpoint, options);
    return response.data;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CRM API (tenant-crm-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  customers = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/customers`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/customers/${id}`),
    create: (data) => this.request(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/customers`, { method: 'POST', body: data }),
    update: (id, data) => this.request(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/customers/${id}`, { method: 'PATCH', body: data }),
  };

  locations = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/locations`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/locations/${id}`),
    create: (data) => this.request(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/locations`, { method: 'POST', body: data }),
    update: (id, data) => this.request(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/locations/${id}`, { method: 'PATCH', body: data }),
  };

  contacts = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/contacts`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/contacts/${id}`),
    create: (data) => this.request(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/contacts`, { method: 'POST', body: data }),
    update: (id, data) => this.request(`${this.baseUrl}/crm/v2/tenant/${this.tenantId}/contacts/${id}`, { method: 'PATCH', body: data }),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // JOB MANAGEMENT API (tenant-jpm-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  jobs = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/jobs`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/jobs/${id}`),
    create: (data) => this.request(`${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/jobs`, { method: 'POST', body: data }),
    update: (id, data) => this.request(`${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/jobs/${id}`, { method: 'PATCH', body: data }),
    cancel: (id, reason) => this.request(`${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/jobs/${id}/cancel`, { method: 'POST', body: { reason } }),
  };

  appointments = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/appointments`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/appointments/${id}`),
    create: (data) => this.request(`${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/appointments`, { method: 'POST', body: data }),
    update: (id, data) => this.request(`${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/appointments/${id}`, { method: 'PATCH', body: data }),
  };

  projects = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/projects`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/projects/${id}`),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PRICEBOOK API (tenant-pricebook-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  pricebook = {
    categories: {
      list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/pricebook/v2/tenant/${this.tenantId}/categories`, { query: params }),
      get: (id) => this.request(`${this.baseUrl}/pricebook/v2/tenant/${this.tenantId}/categories/${id}`),
    },
    services: {
      list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/pricebook/v2/tenant/${this.tenantId}/services`, { query: params }),
      get: (id) => this.request(`${this.baseUrl}/pricebook/v2/tenant/${this.tenantId}/services/${id}`),
    },
    materials: {
      list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/pricebook/v2/tenant/${this.tenantId}/materials`, { query: params }),
      get: (id) => this.request(`${this.baseUrl}/pricebook/v2/tenant/${this.tenantId}/materials/${id}`),
    },
    equipment: {
      list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/pricebook/v2/tenant/${this.tenantId}/equipment`, { query: params }),
      get: (id) => this.request(`${this.baseUrl}/pricebook/v2/tenant/${this.tenantId}/equipment/${id}`),
    },
    discounts: {
      list: () => this.fetchAllPages(`${this.baseUrl}/pricebook/v2/tenant/${this.tenantId}/discounts-and-fees`),
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DISPATCH API (tenant-dispatch-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  technicians = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/dispatch/v2/tenant/${this.tenantId}/technicians`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/dispatch/v2/tenant/${this.tenantId}/technicians/${id}`),
  };

  teams = {
    list: () => this.fetchAllPages(`${this.baseUrl}/dispatch/v2/tenant/${this.tenantId}/teams`),
    get: (id) => this.request(`${this.baseUrl}/dispatch/v2/tenant/${this.tenantId}/teams/${id}`),
  };

  zones = {
    list: () => this.fetchAllPages(`${this.baseUrl}/dispatch/v2/tenant/${this.tenantId}/zones`),
    get: (id) => this.request(`${this.baseUrl}/dispatch/v2/tenant/${this.tenantId}/zones/${id}`),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ACCOUNTING API (tenant-accounting-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  invoices = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/accounting/v2/tenant/${this.tenantId}/invoices`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/accounting/v2/tenant/${this.tenantId}/invoices/${id}`),
  };

  payments = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/accounting/v2/tenant/${this.tenantId}/payments`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/accounting/v2/tenant/${this.tenantId}/payments/${id}`),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // INVENTORY API (tenant-inventory-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  inventory = {
    items: {
      list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/inventory/v2/tenant/${this.tenantId}/inventory`, { query: params }),
      get: (id) => this.request(`${this.baseUrl}/inventory/v2/tenant/${this.tenantId}/inventory/${id}`),
    },
    warehouses: {
      list: () => this.fetchAllPages(`${this.baseUrl}/inventory/v2/tenant/${this.tenantId}/warehouses`),
      get: (id) => this.request(`${this.baseUrl}/inventory/v2/tenant/${this.tenantId}/warehouses/${id}`),
    },
    purchaseOrders: {
      list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/inventory/v2/tenant/${this.tenantId}/purchase-orders`, { query: params }),
      get: (id) => this.request(`${this.baseUrl}/inventory/v2/tenant/${this.tenantId}/purchase-orders/${id}`),
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // EQUIPMENT SYSTEMS API (tenant-equipment-systems-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  equipmentSystems = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/equipment-systems/v2/tenant/${this.tenantId}/installed-equipment`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/equipment-systems/v2/tenant/${this.tenantId}/installed-equipment/${id}`),
    create: (data) => this.request(`${this.baseUrl}/equipment-systems/v2/tenant/${this.tenantId}/installed-equipment`, { method: 'POST', body: data }),
    update: (id, data) => this.request(`${this.baseUrl}/equipment-systems/v2/tenant/${this.tenantId}/installed-equipment/${id}`, { method: 'PATCH', body: data }),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // FORMS API (tenant-forms-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  forms = {
    definitions: {
      list: () => this.fetchAllPages(`${this.baseUrl}/forms/v2/tenant/${this.tenantId}/form-definitions`),
      get: (id) => this.request(`${this.baseUrl}/forms/v2/tenant/${this.tenantId}/form-definitions/${id}`),
    },
    submissions: {
      list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/forms/v2/tenant/${this.tenantId}/form-submissions`, { query: params }),
      get: (id) => this.request(`${this.baseUrl}/forms/v2/tenant/${this.tenantId}/form-submissions/${id}`),
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MARKETING API (tenant-marketing-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  marketing = {
    campaigns: {
      list: () => this.fetchAllPages(`${this.baseUrl}/marketing/v2/tenant/${this.tenantId}/campaigns`),
      get: (id) => this.request(`${this.baseUrl}/marketing/v2/tenant/${this.tenantId}/campaigns/${id}`),
    },
    costs: {
      list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/marketing/v2/tenant/${this.tenantId}/costs`, { query: params }),
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SETTINGS API (tenant-settings-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  settings = {
    businessUnits: {
      list: () => this.fetchAllPages(`${this.baseUrl}/settings/v2/tenant/${this.tenantId}/business-units`),
      get: (id) => this.request(`${this.baseUrl}/settings/v2/tenant/${this.tenantId}/business-units/${id}`),
    },
    tags: {
      list: () => this.fetchAllPages(`${this.baseUrl}/settings/v2/tenant/${this.tenantId}/tags`),
    },
    memberships: {
      list: () => this.fetchAllPages(`${this.baseUrl}/settings/v2/tenant/${this.tenantId}/memberships`),
      get: (id) => this.request(`${this.baseUrl}/settings/v2/tenant/${this.tenantId}/memberships/${id}`),
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // TIMESHEETS API (tenant-timesheets-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  timesheets = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/timesheets/v2/tenant/${this.tenantId}/timesheets`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/timesheets/v2/tenant/${this.tenantId}/timesheets/${id}`),
    codes: {
      list: () => this.fetchAllPages(`${this.baseUrl}/timesheets/v2/tenant/${this.tenantId}/timesheet-codes`),
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // TELECOM API (tenant-telecom-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  telecom = {
    calls: {
      list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/telecom/v2/tenant/${this.tenantId}/calls`, { query: params }),
      get: (id) => this.request(`${this.baseUrl}/telecom/v2/tenant/${this.tenantId}/calls/${id}`),
    },
    callReasons: {
      list: () => this.fetchAllPages(`${this.baseUrl}/telecom/v2/tenant/${this.tenantId}/call-reasons`),
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // TASK MANAGEMENT API (tenant-task-management-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  tasks = {
    list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/task-management/v2/tenant/${this.tenantId}/tasks`, { query: params }),
    get: (id) => this.request(`${this.baseUrl}/task-management/v2/tenant/${this.tenantId}/tasks/${id}`),
    create: (data) => this.request(`${this.baseUrl}/task-management/v2/tenant/${this.tenantId}/tasks`, { method: 'POST', body: data }),
    update: (id, data) => this.request(`${this.baseUrl}/task-management/v2/tenant/${this.tenantId}/tasks/${id}`, { method: 'PATCH', body: data }),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAYROLL API (tenant-payroll-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  payroll = {
    adjustments: {
      list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/payroll/v2/tenant/${this.tenantId}/payroll-adjustments`, { query: params }),
    },
    grossPayItems: {
      list: (params = {}) => this.fetchAllPages(`${this.baseUrl}/payroll/v2/tenant/${this.tenantId}/gross-pay-items`, { query: params }),
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // REPORTING API (tenant-reporting-v2.json)
  // ══════════════════════════════════════════════════════════════════════════

  reporting = {
    categories: {
      list: () => this.fetchAllPages(`${this.baseUrl}/reporting/v2/tenant/${this.tenantId}/report-categories`),
    },
    reports: {
      list: (categoryId) => this.fetchAllPages(`${this.baseUrl}/reporting/v2/tenant/${this.tenantId}/reports`, { query: { categoryId } }),
      getData: (id, params) => this.request(`${this.baseUrl}/reporting/v2/tenant/${this.tenantId}/reports/${id}/data`, { method: 'POST', body: params }),
    },
  };
}

// Export singleton instance
const stClient = new ServiceTitanClient();

export default stClient;
export { stClient };
