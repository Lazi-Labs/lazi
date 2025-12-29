/**
 * V2 API Routes
 * New modular architecture with provider abstraction
 * 
 * Features:
 * - Provider abstraction (ServiceTitan, LAZI, Hybrid)
 * - Tenant isolation
 * - RBAC middleware
 * - Feature flag support
 */

import { Router } from 'express';
import { tenantIsolation } from '../middleware/tenantIsolation.js';

// Import new modular routes
import customerRoutes from '../modules/customers/customer.routes.js';
import jobRoutes from '../modules/jobs/job.routes.js';
import technicianRoutes from '../modules/technicians/technician.routes.js';
import pricebookRoutes from '../modules/pricebook/pricebook.routes.js';
import workflowRoutes from '../modules/workflows/workflow.routes.js';

const router = Router();

// Apply tenant isolation to all v2 routes
router.use(tenantIsolation);

// Mount modular routes
router.use('/customers', customerRoutes);
router.use('/jobs', jobRoutes);
router.use('/technicians', technicianRoutes);
router.use('/pricebook', pricebookRoutes);
router.use('/workflows', workflowRoutes);

export default router;
