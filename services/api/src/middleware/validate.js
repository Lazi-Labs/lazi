/**
 * Request Validation Middleware
 * Uses Zod for schema validation
 */

import { z } from 'zod';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('validation');

/**
 * Validate request body against a Zod schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation failed', { errors: error.errors });
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Query validation failed', { errors: error.errors });
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

/**
 * Validate URL parameters against a Zod schema
 */
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Params validation failed', { errors: error.errors });
        return res.status(400).json({
          success: false,
          error: 'Invalid URL parameters',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

// ─────────────────────────────────────────────────────────
// COMMON SCHEMAS
// ─────────────────────────────────────────────────────────

export const schemas = {
  // Pagination
  pagination: z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
  }),

  // UUID parameter
  uuid: z.object({
    id: z.string().uuid(),
  }),

  // Numeric ID parameter
  numericId: z.object({
    id: z.coerce.number().int().positive(),
  }),

  // Date range
  dateRange: z.object({
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
  }),

  // CRM Contact update
  contactUpdate: z.object({
    stage: z.string().max(100).optional(),
    pipeline_id: z.number().int().positive().optional(),
    owner_id: z.number().int().positive().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    custom_fields: z.record(z.any()).optional(),
    lead_source: z.string().max(100).optional(),
    lead_score: z.number().int().min(0).max(100).optional(),
    next_followup_at: z.string().datetime().optional(),
    do_not_contact: z.boolean().optional(),
  }),

  // CRM Opportunity create
  opportunityCreate: z.object({
    contact_id: z.number().int().positive().optional(),
    st_estimate_id: z.number().int().positive().optional(),
    pipeline_id: z.number().int().positive().optional(),
    stage_id: z.number().int().positive().optional(),
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    value: z.number().min(0).default(0),
    expected_close_date: z.string().datetime().optional(),
    owner_id: z.number().int().positive().optional(),
  }),

  // CRM Opportunity update
  opportunityUpdate: z.object({
    stage_id: z.number().int().positive().optional(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    value: z.number().min(0).optional(),
    probability: z.number().int().min(0).max(100).optional(),
    expected_close_date: z.string().datetime().optional(),
    status: z.enum(['Open', 'Won', 'Lost']).optional(),
    lost_reason: z.string().max(255).optional(),
    owner_id: z.number().int().positive().optional(),
  }),

  // Activity log
  activityCreate: z.object({
    type: z.enum(['note', 'call', 'email', 'meeting', 'task']),
    subject: z.string().max(255).optional(),
    body: z.string().optional(),
    call_duration: z.number().int().min(0).optional(),
    call_outcome: z.enum(['connected', 'voicemail', 'no-answer']).optional(),
    created_by: z.number().int().positive().optional(),
  }),

  // Task create
  taskCreate: z.object({
    contact_id: z.number().int().positive().optional(),
    opportunity_id: z.number().int().positive().optional(),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    due_date: z.string().datetime().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    assigned_to: z.number().int().positive().optional(),
    created_by: z.number().int().positive().optional(),
  }),

  // Workflow trigger
  workflowTrigger: z.object({
    entity_type: z.string().min(1),
    entity_id: z.string().min(1),
    context: z.record(z.any()).optional(),
  }),
};

export default {
  validateBody,
  validateQuery,
  validateParams,
  schemas,
};
