/**
 * Marketing Provider Interface
 * Maps to: /marketing/v2/tenant/{tenant}/*
 */

/**
 * @typedef {Object} Campaign
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {boolean} active
 */

/**
 * @typedef {Object} IMarketingProvider
 * @property {function(string): Promise<Campaign[]>} listCampaigns
 * @property {function(string, string): Promise<Campaign|null>} getCampaignById
 * @property {function(string): Promise<SyncResult>} syncFromExternal
 */

export default {};
