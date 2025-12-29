/**
 * Job Routes
 * RESTful endpoints for job management
 */

import { Router } from 'express';
import * as jobController from './job.controller.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validateQuery, validateBody, validateParams } from '../../middleware/validate.js';
import { schemas } from '../../schemas/v2-schemas.js';

const router = Router();

// List jobs
router.get(
  '/',
  validateQuery(schemas.jobFilters),
  requirePermission('jobs', 'read'),
  jobController.listJobs
);

// Get jobs by customer
router.get(
  '/customer/:customerId',
  validateParams(schemas.numericId.extend({ customerId: schemas.numericId.shape.id })),
  validateQuery(schemas.pagination),
  requirePermission('jobs', 'read'),
  jobController.getJobsByCustomer
);

// Get jobs by location
router.get(
  '/location/:locationId',
  validateParams(schemas.numericId.extend({ locationId: schemas.numericId.shape.id })),
  validateQuery(schemas.pagination),
  requirePermission('jobs', 'read'),
  jobController.getJobsByLocation
);

// Get jobs by technician
router.get(
  '/technician/:technicianId',
  validateParams(schemas.numericId.extend({ technicianId: schemas.numericId.shape.id })),
  validateQuery(schemas.pagination),
  requirePermission('jobs', 'read'),
  jobController.getJobsByTechnician
);

// Get job by ID
router.get(
  '/:id',
  validateParams(schemas.numericId),
  requirePermission('jobs', 'read'),
  jobController.getJob
);

// Create job (not supported in ST provider mode)
router.post(
  '/',
  validateBody(schemas.createJob),
  requirePermission('jobs', 'create'),
  jobController.createJob
);

// Update job (not supported in ST provider mode)
router.patch(
  '/:id',
  validateParams(schemas.numericId),
  validateBody(schemas.updateJob),
  requirePermission('jobs', 'update'),
  jobController.updateJob
);

// Update job status (not supported in ST provider mode)
router.patch(
  '/:id/status',
  validateParams(schemas.numericId),
  validateBody(schemas.updateJobStatus),
  requirePermission('jobs', 'update'),
  jobController.updateJobStatus
);

// Assign technician (not supported in ST provider mode)
router.post(
  '/:id/assign',
  validateParams(schemas.numericId),
  validateBody(schemas.assignTechnician),
  requirePermission('jobs', 'update'),
  jobController.assignTechnician
);

// Cancel job (not supported in ST provider mode)
router.post(
  '/:id/cancel',
  validateParams(schemas.numericId),
  requirePermission('jobs', 'update'),
  jobController.cancelJob
);

// Sync jobs from ServiceTitan
router.post(
  '/sync',
  validateBody(schemas.syncOptions),
  requirePermission('jobs', 'admin'),
  jobController.syncJobs
);

export default router;
