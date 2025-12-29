/**
 * Provider Factory
 * Returns the appropriate provider implementation based on feature flags
 * Supports all 17 ServiceTitan API domains with lazy loading
 */

import { getProviderMode } from '../lib/feature-flags.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('provider-factory');

/**
 * Provider map configuration
 * Maps domain names to their provider implementations
 */
const PROVIDER_MAP = {
  // CRM Domain
  customers: {
    servicetitan: () => {
      const { ServiceTitanCustomerProvider } = require('./servicetitan/customer.provider.js');
      return new ServiceTitanCustomerProvider();
    },
    lazi: () => {
      logger.warn('LAZI customer provider not yet implemented');
      return PROVIDER_MAP.customers.servicetitan();
    },
    hybrid: () => {
      logger.warn('Hybrid customer provider not yet implemented');
      return PROVIDER_MAP.customers.servicetitan();
    },
  },
  
  locations: {
    servicetitan: () => {
      const { ServiceTitanLocationProvider } = require('./servicetitan/location.provider.js');
      return new ServiceTitanLocationProvider();
    },
  },
  
  contacts: {
    servicetitan: () => {
      logger.warn('ServiceTitan contact provider not yet implemented');
      throw new Error('Contact provider not implemented');
    },
  },
  
  // Job Management Domain
  jobs: {
    servicetitan: () => {
      const { ServiceTitanJobProvider } = require('./servicetitan/job.provider.js');
      return new ServiceTitanJobProvider();
    },
    lazi: () => {
      logger.warn('LAZI job provider not yet implemented');
      return PROVIDER_MAP.jobs.servicetitan();
    },
  },
  
  appointments: {
    servicetitan: () => {
      const { ServiceTitanAppointmentProvider } = require('./servicetitan/appointment.provider.js');
      return new ServiceTitanAppointmentProvider();
    },
  },
  
  projects: {
    servicetitan: () => {
      logger.warn('ServiceTitan project provider not yet implemented');
      throw new Error('Project provider not implemented');
    },
  },
  
  // Pricebook Domain
  pricebook: {
    servicetitan: () => {
      const { ServiceTitanPricebookProvider } = require('./servicetitan/pricebook.provider.js');
      return new ServiceTitanPricebookProvider();
    },
    lazi: () => {
      logger.warn('LAZI pricebook provider not yet implemented');
      return PROVIDER_MAP.pricebook.servicetitan();
    },
  },
  
  // Dispatch Domain
  technicians: {
    servicetitan: () => {
      const { ServiceTitanTechnicianProvider } = require('./servicetitan/technician.provider.js');
      return new ServiceTitanTechnicianProvider();
    },
  },
  
  teams: {
    servicetitan: () => {
      logger.warn('ServiceTitan team provider not yet implemented');
      throw new Error('Team provider not implemented');
    },
  },
  
  zones: {
    servicetitan: () => {
      logger.warn('ServiceTitan zone provider not yet implemented');
      throw new Error('Zone provider not implemented');
    },
  },
  
  // Accounting Domain
  invoices: {
    servicetitan: () => {
      logger.warn('ServiceTitan invoice provider not yet implemented');
      throw new Error('Invoice provider not implemented');
    },
  },
  
  payments: {
    servicetitan: () => {
      logger.warn('ServiceTitan payment provider not yet implemented');
      throw new Error('Payment provider not implemented');
    },
  },
  
  // Inventory Domain
  inventory: {
    servicetitan: () => {
      logger.warn('ServiceTitan inventory provider not yet implemented');
      throw new Error('Inventory provider not implemented');
    },
  },
  
  // Equipment Domain
  equipment: {
    servicetitan: () => {
      logger.warn('ServiceTitan equipment provider not yet implemented');
      throw new Error('Equipment provider not implemented');
    },
  },
  
  // Forms Domain
  forms: {
    servicetitan: () => {
      logger.warn('ServiceTitan form provider not yet implemented');
      throw new Error('Form provider not implemented');
    },
  },
  
  // Marketing Domain
  marketing: {
    servicetitan: () => {
      logger.warn('ServiceTitan marketing provider not yet implemented');
      throw new Error('Marketing provider not implemented');
    },
  },
  
  // Settings Domain
  settings: {
    servicetitan: () => {
      logger.warn('ServiceTitan settings provider not yet implemented');
      throw new Error('Settings provider not implemented');
    },
  },
  
  // Timesheets Domain
  timesheets: {
    servicetitan: () => {
      logger.warn('ServiceTitan timesheet provider not yet implemented');
      throw new Error('Timesheet provider not implemented');
    },
  },
  
  // Telecom Domain
  telecom: {
    servicetitan: () => {
      logger.warn('ServiceTitan telecom provider not yet implemented');
      throw new Error('Telecom provider not implemented');
    },
  },
  
  // Task Management Domain
  tasks: {
    servicetitan: () => {
      logger.warn('ServiceTitan task provider not yet implemented');
      throw new Error('Task provider not implemented');
    },
  },
};

/**
 * Generic provider getter with lazy loading
 * @param {string} domain - Provider domain (e.g., 'customers', 'jobs', 'pricebook')
 * @param {string} tenantId - Tenant ID
 * @returns {Object} Provider instance
 */
export function getProvider(domain, tenantId) {
  const providers = PROVIDER_MAP[domain];
  
  if (!providers) {
    throw new Error(`Unknown provider domain: ${domain}`);
  }
  
  const mode = getProviderMode(tenantId, domain);
  const providerFactory = providers[mode] || providers.servicetitan;
  
  if (!providerFactory) {
    throw new Error(`No provider found for ${domain} in mode ${mode}`);
  }
  
  logger.debug({ domain, tenantId, mode }, 'Getting provider');
  
  return providerFactory();
}

// ══════════════════════════════════════════════════════════════════════════
// Convenience exports for each domain
// ══════════════════════════════════════════════════════════════════════════

// CRM Domain
export const getCustomerProvider = (tenantId) => getProvider('customers', tenantId);
export const getLocationProvider = (tenantId) => getProvider('locations', tenantId);
export const getContactProvider = (tenantId) => getProvider('contacts', tenantId);

// Job Management Domain
export const getJobProvider = (tenantId) => getProvider('jobs', tenantId);
export const getAppointmentProvider = (tenantId) => getProvider('appointments', tenantId);
export const getProjectProvider = (tenantId) => getProvider('projects', tenantId);

// Pricebook Domain
export const getPricebookProvider = (tenantId) => getProvider('pricebook', tenantId);

// Dispatch Domain
export const getTechnicianProvider = (tenantId) => getProvider('technicians', tenantId);
export const getTeamProvider = (tenantId) => getProvider('teams', tenantId);
export const getZoneProvider = (tenantId) => getProvider('zones', tenantId);

// Accounting Domain
export const getInvoiceProvider = (tenantId) => getProvider('invoices', tenantId);
export const getPaymentProvider = (tenantId) => getProvider('payments', tenantId);

// Inventory Domain
export const getInventoryProvider = (tenantId) => getProvider('inventory', tenantId);

// Equipment Domain
export const getEquipmentProvider = (tenantId) => getProvider('equipment', tenantId);

// Forms Domain
export const getFormProvider = (tenantId) => getProvider('forms', tenantId);

// Marketing Domain
export const getMarketingProvider = (tenantId) => getProvider('marketing', tenantId);

// Settings Domain
export const getSettingsProvider = (tenantId) => getProvider('settings', tenantId);

// Timesheets Domain
export const getTimesheetProvider = (tenantId) => getProvider('timesheets', tenantId);

// Telecom Domain
export const getTelecomProvider = (tenantId) => getProvider('telecom', tenantId);

// Task Management Domain
export const getTaskProvider = (tenantId) => getProvider('tasks', tenantId);

export default {
  getProvider,
  // CRM
  getCustomerProvider,
  getLocationProvider,
  getContactProvider,
  // Job Management
  getJobProvider,
  getAppointmentProvider,
  getProjectProvider,
  // Pricebook
  getPricebookProvider,
  // Dispatch
  getTechnicianProvider,
  getTeamProvider,
  getZoneProvider,
  // Accounting
  getInvoiceProvider,
  getPaymentProvider,
  // Inventory
  getInventoryProvider,
  // Equipment
  getEquipmentProvider,
  // Forms
  getFormProvider,
  // Marketing
  getMarketingProvider,
  // Settings
  getSettingsProvider,
  // Timesheets
  getTimesheetProvider,
  // Telecom
  getTelecomProvider,
  // Tasks
  getTaskProvider,
};
