/**
 * Job Service
 * Business logic for job operations
 */

import { getJobProvider } from '../../providers/factory.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('job-service');

/**
 * List jobs with filters
 */
export async function listJobs(tenantId, filters = {}) {
  const provider = getJobProvider(tenantId);
  return await provider.list(tenantId, filters);
}

/**
 * Get jobs by customer
 */
export async function getJobsByCustomer(tenantId, customerId) {
  const provider = getJobProvider(tenantId);
  return await provider.listByCustomer(tenantId, customerId);
}

/**
 * Get jobs by location
 */
export async function getJobsByLocation(tenantId, locationId) {
  const provider = getJobProvider(tenantId);
  return await provider.listByLocation(tenantId, locationId);
}

/**
 * Get jobs by technician
 */
export async function getJobsByTechnician(tenantId, technicianId, date) {
  const provider = getJobProvider(tenantId);
  return await provider.listByTechnician(tenantId, technicianId, date);
}

/**
 * Get job by ID
 */
export async function getJob(tenantId, jobId) {
  const provider = getJobProvider(tenantId);
  return await provider.getById(tenantId, jobId);
}

/**
 * Create job
 */
export async function createJob(tenantId, jobData) {
  const provider = getJobProvider(tenantId);
  return await provider.create(tenantId, jobData);
}

/**
 * Update job
 */
export async function updateJob(tenantId, jobId, updates) {
  const provider = getJobProvider(tenantId);
  return await provider.update(tenantId, jobId, updates);
}

/**
 * Update job status
 */
export async function updateJobStatus(tenantId, jobId, status) {
  const provider = getJobProvider(tenantId);
  return await provider.updateStatus(tenantId, jobId, status);
}

/**
 * Assign technician to job
 */
export async function assignTechnician(tenantId, jobId, technicianId) {
  const provider = getJobProvider(tenantId);
  return await provider.assignTechnician(tenantId, jobId, technicianId);
}

/**
 * Cancel job
 */
export async function cancelJob(tenantId, jobId) {
  const provider = getJobProvider(tenantId);
  return await provider.cancel(tenantId, jobId);
}

/**
 * Sync jobs from external source
 */
export async function syncJobs(tenantId) {
  const provider = getJobProvider(tenantId);
  return await provider.syncFromExternal(tenantId);
}
