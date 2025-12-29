/**
 * Pricebook Controller
 * Handles request/response for pricebook endpoints
 */

import * as service from './pricebook.service.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('pricebook-controller');

/**
 * List categories
 */
export const listCategories = async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { type, includeInactive, parentId } = req.query;
    
    const categories = await service.listCategories(tenantId, {
      type,
      includeInactive: includeInactive === 'true',
      parentId: parentId === 'null' ? null : parentId,
    });
    
    res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error listing categories');
    next(error);
  }
};

/**
 * Get category tree
 */
export const getCategoryTree = async (req, res, next) => {
  try {
    const { tenantId } = req;
    const tree = await service.getCategoryTree(tenantId);
    
    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error getting category tree');
    next(error);
  }
};

/**
 * Get category by ID
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;
    
    const category = await service.getCategoryById(tenantId, id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }
    
    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, id: req.params.id }, 'Error getting category');
    next(error);
  }
};

/**
 * Create category
 */
export const createCategory = async (req, res, next) => {
  try {
    const { tenantId } = req;
    const userId = req.user?.id;
    
    const category = await service.createCategory(tenantId, {
      ...req.body,
      createdBy: userId,
    });
    
    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, data: req.body }, 'Error creating category');
    next(error);
  }
};

/**
 * Update category
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;
    
    const category = await service.updateCategory(tenantId, id, req.body);
    
    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId, id: req.params.id }, 'Error updating category');
    next(error);
  }
};

/**
 * List services
 */
export const listServices = async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { categoryId } = req.query;
    
    const services = await service.listServices(tenantId, categoryId);
    
    res.json({
      success: true,
      data: services,
      count: services.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error listing services');
    next(error);
  }
};

/**
 * List materials
 */
export const listMaterials = async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { categoryId } = req.query;
    
    const materials = await service.listMaterials(tenantId, categoryId);
    
    res.json({
      success: true,
      data: materials,
      count: materials.length,
    });
  } catch (error) {
    logger.error({ error: error.message, tenantId: req.tenantId }, 'Error listing materials');
    next(error);
  }
};
