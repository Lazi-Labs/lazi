/**
 * Feature Flags System
 * Controls provider selection and feature toggles per tenant
 */

const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

/**
 * Get feature flag value with caching
 * @param {string} key - Feature flag key (e.g., 'tenant.3222348440.customers.provider')
 * @param {*} defaultValue - Default value if flag not found
 * @returns {*} Feature flag value
 */
export function getFeatureFlag(key, defaultValue) {
  const cached = cache.get(key);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  
  // TODO: In production, fetch from database or config service
  // For now, return default
  return defaultValue;
}

/**
 * Set feature flag value
 * @param {string} key - Feature flag key
 * @param {*} value - Feature flag value
 */
export async function setFeatureFlag(key, value) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

/**
 * Clear all feature flag cache
 */
export function clearFeatureFlagCache() {
  cache.clear();
}

/**
 * Get provider mode for a specific domain and tenant
 * @param {string} tenantId - Tenant ID
 * @param {string} domain - Domain (e.g., 'customers', 'jobs', 'pricebook')
 * @returns {'servicetitan'|'lazi'|'hybrid'} Provider mode
 */
export function getProviderMode(tenantId, domain) {
  const key = `tenant.${tenantId}.${domain}.provider`;
  return getFeatureFlag(key, 'servicetitan');
}

export default {
  getFeatureFlag,
  setFeatureFlag,
  clearFeatureFlagCache,
  getProviderMode,
};
