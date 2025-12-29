/**
 * Customer Controller
 * Handles HTTP request/response for customer endpoints
 */

import * as customerService from './customer.service.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('customer-controller');

/**
 * List customers
 * GET /api/customers
 */
export async function listCustomers(req, res) {
  try {
    const tenantId = req.tenantId;
    const filters = {
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      type: req.query.type,
      search: req.query.search,
      modifiedOnOrAfter: req.query.modifiedOnOrAfter,
      createdOnOrAfter: req.query.createdOnOrAfter,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 50,
    };

    const customers = await customerService.listCustomers(tenantId, filters);
    
    res.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error listing customers');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Search customers
 * GET /api/customers/search?q=searchTerm
 */
export async function searchCustomers(req, res) {
  try {
    const tenantId = req.tenantId;
    const searchTerm = req.query.q;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Search term (q) is required',
      });
    }

    const customers = await customerService.searchCustomers(tenantId, searchTerm);
    
    res.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error searching customers');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get customer by ID
 * GET /api/customers/:id
 */
export async function getCustomer(req, res) {
  try {
    const tenantId = req.tenantId;
    const customerId = req.params.id;

    const customer = await customerService.getCustomer(tenantId, customerId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, customerId: req.params.id }, 'Error getting customer');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Create customer
 * POST /api/customers
 */
export async function createCustomer(req, res) {
  try {
    const tenantId = req.tenantId;
    const customerData = req.body;

    const customer = await customerService.createCustomer(tenantId, customerData);
    
    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error creating customer');
    
    if (error.message.includes('not supported')) {
      return res.status(501).json({
        success: false,
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Update customer
 * PATCH /api/customers/:id
 */
export async function updateCustomer(req, res) {
  try {
    const tenantId = req.tenantId;
    const customerId = req.params.id;
    const updates = req.body;

    const customer = await customerService.updateCustomer(tenantId, customerId, updates);
    
    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, customerId: req.params.id }, 'Error updating customer');
    
    if (error.message.includes('not supported')) {
      return res.status(501).json({
        success: false,
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Delete customer
 * DELETE /api/customers/:id
 */
export async function deleteCustomer(req, res) {
  try {
    const tenantId = req.tenantId;
    const customerId = req.params.id;

    await customerService.deleteCustomer(tenantId, customerId);
    
    res.json({
      success: true,
      message: 'Customer deleted',
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, customerId: req.params.id }, 'Error deleting customer');
    
    if (error.message.includes('not supported')) {
      return res.status(501).json({
        success: false,
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Sync customers from ServiceTitan
 * POST /api/customers/sync
 */
export async function syncCustomers(req, res) {
  try {
    const tenantId = req.tenantId;

    const result = await customerService.syncCustomers(tenantId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error syncing customers');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
