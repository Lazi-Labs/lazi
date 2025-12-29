/**
 * Role-Based Access Control (RBAC) Middleware
 * Controls access to resources based on user roles
 */

import { createLogger } from '../lib/logger.js';

const logger = createLogger('rbac');

/**
 * Permission matrix
 * Maps permissions to allowed roles
 */
export const PERMISSIONS = {
  // Pricebook permissions
  'pricebook:read': ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER', 'TECHNICIAN', 'VIEWER'],
  'pricebook:write': ['OWNER', 'ADMIN'],
  'pricebook:sync': ['OWNER', 'ADMIN'],
  
  // Customer permissions
  'customers:read': ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER', 'TECHNICIAN', 'VIEWER'],
  'customers:write': ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER'],
  'customers:delete': ['OWNER', 'ADMIN'],
  
  // Job permissions
  'jobs:read': ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER', 'TECHNICIAN', 'VIEWER'],
  'jobs:write': ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER'],
  'jobs:assign': ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER'],
  'jobs:complete': ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER', 'TECHNICIAN'],
  
  // CRM permissions
  'crm:read': ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER', 'VIEWER'],
  'crm:write': ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER'],
  
  // Admin permissions
  'admin:users': ['OWNER', 'ADMIN'],
  'admin:settings': ['OWNER', 'ADMIN'],
  'admin:billing': ['OWNER'],
};

/**
 * Check if user has permission
 * @param {Object} user - User object with role
 * @param {string} permission - Permission to check
 * @returns {boolean} Has permission
 */
export function hasPermission(user, permission) {
  if (!user || !user.role) {
    return false;
  }
  
  const userRole = user.role.toUpperCase();
  const allowedRoles = PERMISSIONS[permission] || [];
  
  return allowedRoles.includes(userRole);
}

/**
 * Middleware to require specific permission
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      logger.warn({ permission, path: req.path }, 'No user context for permission check');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    
    if (!hasPermission(user, permission)) {
      logger.warn(
        { permission, role: user.role, userId: user.id, path: req.path },
        'Permission denied'
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Required: ${permission}`,
      });
    }
    
    logger.debug({ permission, role: user.role, userId: user.id }, 'Permission granted');
    next();
  };
};

/**
 * Middleware to require any of multiple permissions
 * @param {string[]} permissions - Array of acceptable permissions
 * @returns {Function} Express middleware
 */
export const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    
    const hasAnyPermission = permissions.some(perm => hasPermission(user, perm));
    
    if (!hasAnyPermission) {
      logger.warn(
        { permissions, role: user.role, userId: user.id, path: req.path },
        'Permission denied (none matched)'
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Required one of: ${permissions.join(', ')}`,
      });
    }
    
    next();
  };
};

export default {
  PERMISSIONS,
  hasPermission,
  requirePermission,
  requireAnyPermission,
};
