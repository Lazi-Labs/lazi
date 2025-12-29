/**
 * Health Routes
 * Endpoints for health checks and system status
 */

import { Router } from 'express';
import {
  ping,
  health,
  status,
  detailedHealth,
  workflowHealth,
  workerStatus
} from '../controllers/health.controller.js';

const router = Router();

// Simple ping - backward compatible with existing /ping
router.get('/ping', ping);

// Basic health check
router.get('/health', health);

// Detailed health check with all components
router.get('/health/detailed', detailedHealth);

// Workflow-specific health check
router.get('/health/workflows', workflowHealth);

// Worker health status
router.get('/health/workers', workerStatus);
router.get('/api/workers/status', workerStatus);

// Full status with metrics
router.get('/status', status);

export default router;
