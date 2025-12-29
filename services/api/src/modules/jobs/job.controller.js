/**
 * Job Controller
 * Handles HTTP request/response for job endpoints
 */

import * as jobService from './job.service.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('job-controller');

/**
 * List jobs
 * GET /api/jobs
 */
export async function listJobs(req, res) {
  try {
    const tenantId = req.tenantId;
    const filters = {
      status: req.query.status,
      customerId: req.query.customerId,
      locationId: req.query.locationId,
      businessUnitId: req.query.businessUnitId,
      limit: parseInt(req.query.limit) || 100,
    };

    const jobs = await jobService.listJobs(tenantId, filters);
    
    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error listing jobs');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get jobs by customer
 * GET /api/jobs/customer/:customerId
 */
export async function getJobsByCustomer(req, res) {
  try {
    const tenantId = req.tenantId;
    const customerId = req.params.customerId;

    const jobs = await jobService.getJobsByCustomer(tenantId, customerId);
    
    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, customerId: req.params.customerId }, 'Error getting jobs by customer');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get jobs by location
 * GET /api/jobs/location/:locationId
 */
export async function getJobsByLocation(req, res) {
  try {
    const tenantId = req.tenantId;
    const locationId = req.params.locationId;

    const jobs = await jobService.getJobsByLocation(tenantId, locationId);
    
    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, locationId: req.params.locationId }, 'Error getting jobs by location');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get jobs by technician
 * GET /api/jobs/technician/:technicianId?date=YYYY-MM-DD
 */
export async function getJobsByTechnician(req, res) {
  try {
    const tenantId = req.tenantId;
    const technicianId = req.params.technicianId;
    const date = req.query.date ? new Date(req.query.date) : new Date();

    const jobs = await jobService.getJobsByTechnician(tenantId, technicianId, date);
    
    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
      date: date.toISOString().split('T')[0],
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, technicianId: req.params.technicianId }, 'Error getting jobs by technician');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get job by ID
 * GET /api/jobs/:id
 */
export async function getJob(req, res) {
  try {
    const tenantId = req.tenantId;
    const jobId = req.params.id;

    const job = await jobService.getJob(tenantId, jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, jobId: req.params.id }, 'Error getting job');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Create job
 * POST /api/jobs
 */
export async function createJob(req, res) {
  try {
    const tenantId = req.tenantId;
    const jobData = req.body;

    const job = await jobService.createJob(tenantId, jobData);
    
    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error creating job');
    
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
 * Update job
 * PATCH /api/jobs/:id
 */
export async function updateJob(req, res) {
  try {
    const tenantId = req.tenantId;
    const jobId = req.params.id;
    const updates = req.body;

    const job = await jobService.updateJob(tenantId, jobId, updates);
    
    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, jobId: req.params.id }, 'Error updating job');
    
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
 * Update job status
 * PATCH /api/jobs/:id/status
 */
export async function updateJobStatus(req, res) {
  try {
    const tenantId = req.tenantId;
    const jobId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const job = await jobService.updateJobStatus(tenantId, jobId, status);
    
    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, jobId: req.params.id }, 'Error updating job status');
    
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
 * Assign technician to job
 * POST /api/jobs/:id/assign
 */
export async function assignTechnician(req, res) {
  try {
    const tenantId = req.tenantId;
    const jobId = req.params.id;
    const { technicianId } = req.body;

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        error: 'Technician ID is required',
      });
    }

    const job = await jobService.assignTechnician(tenantId, jobId, technicianId);
    
    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, jobId: req.params.id }, 'Error assigning technician');
    
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
 * Cancel job
 * POST /api/jobs/:id/cancel
 */
export async function cancelJob(req, res) {
  try {
    const tenantId = req.tenantId;
    const jobId = req.params.id;

    await jobService.cancelJob(tenantId, jobId);
    
    res.json({
      success: true,
      message: 'Job cancelled',
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, jobId: req.params.id }, 'Error cancelling job');
    
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
 * Sync jobs from ServiceTitan
 * POST /api/jobs/sync
 */
export async function syncJobs(req, res) {
  try {
    const tenantId = req.tenantId;

    const result = await jobService.syncJobs(tenantId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error syncing jobs');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
