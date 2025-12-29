/**
 * Technician Controller
 * Handles HTTP request/response for technician endpoints
 */

import * as technicianService from './technician.service.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('technician-controller');

/**
 * List technicians
 * GET /api/technicians
 */
export async function listTechnicians(req, res) {
  try {
    const tenantId = req.tenantId;
    const filters = {
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      teamId: req.query.teamId,
      businessUnitId: req.query.businessUnitId,
      limit: parseInt(req.query.limit) || 100,
    };

    const technicians = await technicianService.listTechnicians(tenantId, filters);
    
    res.json({
      success: true,
      data: technicians,
      count: technicians.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error listing technicians');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get technician availability
 * GET /api/technicians/availability?date=YYYY-MM-DD
 */
export async function getTechnicianAvailability(req, res) {
  try {
    const tenantId = req.tenantId;
    const date = req.query.date ? new Date(req.query.date) : new Date();

    const availability = await technicianService.getTechnicianAvailability(tenantId, date);
    
    res.json({
      success: true,
      data: availability,
      date: date.toISOString().split('T')[0],
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error getting technician availability');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get technicians by team
 * GET /api/technicians/team/:teamId
 */
export async function getTechniciansByTeam(req, res) {
  try {
    const tenantId = req.tenantId;
    const teamId = req.params.teamId;

    const technicians = await technicianService.getTechniciansByTeam(tenantId, teamId);
    
    res.json({
      success: true,
      data: technicians,
      count: technicians.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, teamId: req.params.teamId }, 'Error getting technicians by team');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get technicians by business unit
 * GET /api/technicians/business-unit/:businessUnitId
 */
export async function getTechniciansByBusinessUnit(req, res) {
  try {
    const tenantId = req.tenantId;
    const businessUnitId = req.params.businessUnitId;

    const technicians = await technicianService.getTechniciansByBusinessUnit(tenantId, businessUnitId);
    
    res.json({
      success: true,
      data: technicians,
      count: technicians.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, businessUnitId: req.params.businessUnitId }, 'Error getting technicians by business unit');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get technician by ID
 * GET /api/technicians/:id
 */
export async function getTechnician(req, res) {
  try {
    const tenantId = req.tenantId;
    const technicianId = req.params.id;

    const technician = await technicianService.getTechnician(tenantId, technicianId);
    
    if (!technician) {
      return res.status(404).json({
        success: false,
        error: 'Technician not found',
      });
    }

    res.json({
      success: true,
      data: technician,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, technicianId: req.params.id }, 'Error getting technician');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * List teams
 * GET /api/technicians/teams/all
 */
export async function listTeams(req, res) {
  try {
    const tenantId = req.tenantId;

    const teams = await technicianService.listTeams(tenantId);
    
    res.json({
      success: true,
      data: teams,
      count: teams.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error listing teams');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get team by ID
 * GET /api/technicians/teams/:id
 */
export async function getTeam(req, res) {
  try {
    const tenantId = req.tenantId;
    const teamId = req.params.id;

    const team = await technicianService.getTeam(tenantId, teamId);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found',
      });
    }

    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, teamId: req.params.id }, 'Error getting team');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * List zones
 * GET /api/technicians/zones/all
 */
export async function listZones(req, res) {
  try {
    const tenantId = req.tenantId;

    const zones = await technicianService.listZones(tenantId);
    
    res.json({
      success: true,
      data: zones,
      count: zones.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error listing zones');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get zone by ID
 * GET /api/technicians/zones/:id
 */
export async function getZone(req, res) {
  try {
    const tenantId = req.tenantId;
    const zoneId = req.params.id;

    const zone = await technicianService.getZone(tenantId, zoneId);
    
    if (!zone) {
      return res.status(404).json({
        success: false,
        error: 'Zone not found',
      });
    }

    res.json({
      success: true,
      data: zone,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, zoneId: req.params.id }, 'Error getting zone');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Sync technicians from ServiceTitan
 * POST /api/technicians/sync
 */
export async function syncTechnicians(req, res) {
  try {
    const tenantId = req.tenantId;

    const result = await technicianService.syncTechnicians(tenantId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error syncing technicians');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
