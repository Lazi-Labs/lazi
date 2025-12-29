/**
 * Technician Routes
 * RESTful endpoints for technician management
 */

import { Router } from 'express';
import * as technicianController from './technician.controller.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validateQuery, validateBody, validateParams } from '../../middleware/validate.js';
import { schemas } from '../../schemas/v2-schemas.js';

const router = Router();

// List technicians
router.get(
  '/',
  validateQuery(schemas.pagination),
  requirePermission('technicians', 'read'),
  technicianController.listTechnicians
);

// Get technician availability
router.get(
  '/availability',
  validateQuery(schemas.technicianAvailability),
  requirePermission('technicians', 'read'),
  technicianController.getTechnicianAvailability
);

// Get technicians by team
router.get(
  '/team/:teamId',
  validateParams(schemas.numericId.extend({ teamId: schemas.numericId.shape.id })),
  validateQuery(schemas.pagination),
  requirePermission('technicians', 'read'),
  technicianController.getTechniciansByTeam
);

// Get technicians by business unit
router.get(
  '/business-unit/:businessUnitId',
  validateParams(schemas.numericId.extend({ businessUnitId: schemas.numericId.shape.id })),
  validateQuery(schemas.pagination),
  requirePermission('technicians', 'read'),
  technicianController.getTechniciansByBusinessUnit
);

// Get technician by ID
router.get(
  '/:id',
  validateParams(schemas.numericId),
  requirePermission('technicians', 'read'),
  technicianController.getTechnician
);

// List teams
router.get(
  '/teams/all',
  validateQuery(schemas.pagination),
  requirePermission('technicians', 'read'),
  technicianController.listTeams
);

// Get team by ID
router.get(
  '/teams/:id',
  validateParams(schemas.numericId),
  requirePermission('technicians', 'read'),
  technicianController.getTeam
);

// List zones
router.get(
  '/zones/all',
  validateQuery(schemas.pagination),
  requirePermission('technicians', 'read'),
  technicianController.listZones
);

// Get zone by ID
router.get(
  '/zones/:id',
  validateParams(schemas.numericId),
  requirePermission('technicians', 'read'),
  technicianController.getZone
);

// Sync technicians from ServiceTitan
router.post(
  '/sync',
  validateBody(schemas.syncOptions),
  requirePermission('technicians', 'admin'),
  technicianController.syncTechnicians
);

export default router;
