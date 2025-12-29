/**
 * V2 API Validation Schemas
 * Zod schemas for all V2 endpoints
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────
// COMMON SCHEMAS
// ─────────────────────────────────────────────────────────

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const search = z.object({
  q: z.string().min(2).max(100),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const numericId = z.object({
  id: z.coerce.number().int().positive(),
});

export const dateRange = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ─────────────────────────────────────────────────────────
// CUSTOMER SCHEMAS
// ─────────────────────────────────────────────────────────

export const createCustomer = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  type: z.enum(['Residential', 'Commercial']).default('Residential'),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().length(2).optional(),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateCustomer = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  type: z.enum(['Residential', 'Commercial']).optional(),
  active: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// ─────────────────────────────────────────────────────────
// JOB SCHEMAS
// ─────────────────────────────────────────────────────────

export const createJob = z.object({
  customerId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  jobTypeId: z.number().int().positive(),
  businessUnitId: z.number().int().positive().optional(),
  summary: z.string().max(1000).optional(),
  priority: z.enum(['Low', 'Normal', 'High', 'Emergency']).default('Normal'),
  campaignId: z.number().int().positive().optional(),
});

export const updateJob = z.object({
  status: z.enum(['Pending', 'Scheduled', 'Dispatched', 'Working', 'Completed', 'Canceled']).optional(),
  summary: z.string().max(1000).optional(),
  priority: z.enum(['Low', 'Normal', 'High', 'Emergency']).optional(),
});

export const assignTechnician = z.object({
  technicianId: z.number().int().positive(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  arrivalWindowStart: z.string().datetime().optional(),
  arrivalWindowEnd: z.string().datetime().optional(),
});

export const updateJobStatus = z.object({
  status: z.enum(['Pending', 'Scheduled', 'Dispatched', 'Working', 'Completed', 'Canceled']),
  notes: z.string().max(500).optional(),
});

export const jobFilters = z.object({
  status: z.enum(['Pending', 'Scheduled', 'Dispatched', 'Working', 'Completed', 'Canceled']).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  technicianId: z.coerce.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

// ─────────────────────────────────────────────────────────
// TECHNICIAN SCHEMAS
// ─────────────────────────────────────────────────────────

export const createTechnician = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  employeeId: z.string().max(50).optional(),
  businessUnitId: z.number().int().positive(),
  teamId: z.number().int().positive().optional(),
  zoneId: z.number().int().positive().optional(),
  active: z.boolean().default(true),
});

export const updateTechnician = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  teamId: z.number().int().positive().optional(),
  zoneId: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

export const technicianAvailability = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  teamId: z.coerce.number().int().positive().optional(),
  zoneId: z.coerce.number().int().positive().optional(),
});

// ─────────────────────────────────────────────────────────
// PRICEBOOK SCHEMAS
// ─────────────────────────────────────────────────────────

export const pricebookFilters = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().min(2).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const createService = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  categoryId: z.number().int().positive(),
  price: z.number().min(0),
  cost: z.number().min(0).optional(),
  active: z.boolean().default(true),
});

export const updateService = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────
// SYNC SCHEMAS
// ─────────────────────────────────────────────────────────

export const syncOptions = z.object({
  force: z.coerce.boolean().default(false),
  incremental: z.coerce.boolean().default(true),
  modifiedSince: z.string().datetime().optional(),
});

// ─────────────────────────────────────────────────────────
// EXPORT ALL SCHEMAS
// ─────────────────────────────────────────────────────────

export const schemas = {
  // Common
  pagination,
  search,
  numericId,
  dateRange,
  
  // Customers
  createCustomer,
  updateCustomer,
  
  // Jobs
  createJob,
  updateJob,
  assignTechnician,
  updateJobStatus,
  jobFilters,
  
  // Technicians
  createTechnician,
  updateTechnician,
  technicianAvailability,
  
  // Pricebook
  pricebookFilters,
  createService,
  updateService,
  
  // Sync
  syncOptions,
};

export default schemas;
