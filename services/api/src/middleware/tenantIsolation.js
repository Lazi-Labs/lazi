/**
 * Tenant Isolation Middleware
 * Ensures all requests are scoped to a single tenant
 * Prevents cross-tenant data access
 */

import { createLogger } from '../lib/logger.js';

const logger = createLogger('tenant-isolation');

/**
 * Extract tenant ID from authenticated user
 * @param {Object} req - Express request
 * @returns {string|null} Tenant ID
 */
function extractTenantId(req) {
  // Priority 1: From authenticated user (JWT/session)
  if (req.user?.tenantId) {
    return String(req.user.tenantId);
  }
  
  // Priority 2: From header (for development/testing)
  if (req.headers['x-tenant-id']) {
    return String(req.headers['x-tenant-id']);
  }
  
  // Priority 3: Default tenant (for development only)
  if (process.env.NODE_ENV === 'development' && process.env.DEFAULT_TENANT_ID) {
    return String(process.env.DEFAULT_TENANT_ID);
  }
  
  return null;
}

/**
 * Tenant isolation middleware
 * Attaches tenantId to request and validates tenant access
 */
export const tenantIsolation = (req, res, next) => {
  const tenantId = extractTenantId(req);
  
  if (!tenantId) {
    logger.warn({ path: req.path, method: req.method }, 'No tenant context found');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No tenant context available',
    });
  }
  
  // Attach tenant ID to request
  req.tenantId = tenantId;
  
  // Block tenant_id mismatch in request body
  if (req.body?.tenant_id && String(req.body.tenant_id) !== tenantId) {
    logger.warn(
      { requestTenant: req.body.tenant_id, userTenant: tenantId },
      'Tenant mismatch attempt'
    );
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Tenant ID mismatch',
    });
  }
  
  // Remove tenant_id from body to prevent injection
  delete req.body?.tenant_id;
  
  logger.debug({ tenantId, path: req.path }, 'Tenant context established');
  next();
};

export default { tenantIsolation };
