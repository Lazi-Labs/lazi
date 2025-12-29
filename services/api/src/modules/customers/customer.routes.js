/**
 * Customer Routes
 * RESTful endpoints for customer management
 */

import { Router } from 'express';
import * as customerController from './customer.controller.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validateQuery, validateBody, validateParams } from '../../middleware/validate.js';
import { schemas } from '../../schemas/v2-schemas.js';

const router = Router();

// List customers
router.get(
  '/',
  validateQuery(schemas.pagination),
  requirePermission('customers', 'read'),
  customerController.listCustomers
);

// Search customers
router.get(
  '/search',
  validateQuery(schemas.search),
  requirePermission('customers', 'read'),
  customerController.searchCustomers
);

// Get customer by ID
router.get(
  '/:id',
  validateParams(schemas.numericId),
  requirePermission('customers', 'read'),
  customerController.getCustomer
);

// Create customer (not supported in ST provider mode)
router.post(
  '/',
  validateBody(schemas.createCustomer),
  requirePermission('customers', 'create'),
  customerController.createCustomer
);

// Update customer (not supported in ST provider mode)
router.patch(
  '/:id',
  validateParams(schemas.numericId),
  validateBody(schemas.updateCustomer),
  requirePermission('customers', 'update'),
  customerController.updateCustomer
);

// Delete customer (not supported in ST provider mode)
router.delete(
  '/:id',
  validateParams(schemas.numericId),
  requirePermission('customers', 'delete'),
  customerController.deleteCustomer
);

// Sync customers from ServiceTitan
router.post(
  '/sync',
  validateBody(schemas.syncOptions),
  requirePermission('customers', 'admin'),
  customerController.syncCustomers
);

export default router;
