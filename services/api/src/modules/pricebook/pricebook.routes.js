/**
 * Pricebook Routes
 * Thin routing layer - delegates to controller
 */

import { Router } from 'express';
import * as controller from './pricebook.controller.js';
import { requirePermission } from '../../middleware/rbac.js';

const router = Router();

// Category routes
router.get('/categories', controller.listCategories);
router.get('/categories/tree', controller.getCategoryTree);
router.get('/categories/:id', controller.getCategoryById);
router.post('/categories', requirePermission('pricebook:write'), controller.createCategory);
router.put('/categories/:id', requirePermission('pricebook:write'), controller.updateCategory);

// Service routes
router.get('/services', controller.listServices);

// Material routes
router.get('/materials', controller.listMaterials);

export default router;
