/**
 * ServiceTitan Endpoint Test Configuration
 * 
 * This config uses the EXISTING stClient to test all endpoints.
 * Reference: /opt/docker/apps/lazi/docs-backup/api/tenant-*.json
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  // Use existing stClient for API calls
  useExistingClient: true,
  
  // Test settings
  test: {
    pageSize: 10,           // Records per list request
    requestDelay: 250,      // Delay between requests (ms)
    timeout: 30000,         // Request timeout (ms)
    saveResponses: true,    // Save successful responses
    saveErrors: true,       // Save error responses too
  },
  
  // Reference storage location
  referenceDir: path.join(__dirname, '../../reference/st-responses'),
  
  // Tenant ID for tests
  tenantId: process.env.SERVICE_TITAN_TENANT_ID || process.env.SERVICETITAN_TENANT_ID || '3222348440',
  
  // All endpoints organized by API domain
  // These map to the stClient methods
  endpoints: {
    
    // ═══════════════════════════════════════════════════════════════════════
    // CRM DOMAIN - tenant-crm-v2.json
    // stClient: customers, locations, contacts
    // ═══════════════════════════════════════════════════════════════════════
    crm: {
      // Customers
      'customers.list': {
        clientMethod: 'customers.list',
        params: { pageSize: 10 },
        description: 'List customers',
        saveAs: 'customers.list.json',
      },
      'customers.get': {
        clientMethod: 'customers.get',
        requiresId: true,
        idFrom: 'customers.list',
        description: 'Get customer by ID',
        saveAs: 'customers.get.json',
      },
      
      // Locations
      'locations.list': {
        clientMethod: 'locations.list',
        params: { pageSize: 10 },
        description: 'List locations',
        saveAs: 'locations.list.json',
      },
      'locations.get': {
        clientMethod: 'locations.get',
        requiresId: true,
        idFrom: 'locations.list',
        description: 'Get location by ID',
        saveAs: 'locations.get.json',
      },
      
      // Contacts
      'contacts.list': {
        clientMethod: 'contacts.list',
        params: { pageSize: 10 },
        description: 'List contacts',
        saveAs: 'contacts.list.json',
      },
      'contacts.get': {
        clientMethod: 'contacts.get',
        requiresId: true,
        idFrom: 'contacts.list',
        description: 'Get contact by ID',
        saveAs: 'contacts.get.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // PRICEBOOK DOMAIN - tenant-pricebook-v2.json
    // stClient: pricebook.categories, pricebook.services, etc.
    // ═══════════════════════════════════════════════════════════════════════
    pricebook: {
      'categories.list': {
        clientMethod: 'pricebook.categories.list',
        params: { pageSize: 100 },
        description: 'List pricebook categories',
        saveAs: 'categories.list.json',
      },
      'categories.get': {
        clientMethod: 'pricebook.categories.get',
        requiresId: true,
        idFrom: 'categories.list',
        description: 'Get category by ID',
        saveAs: 'categories.get.json',
      },
      'services.list': {
        clientMethod: 'pricebook.services.list',
        params: { pageSize: 10 },
        description: 'List pricebook services',
        saveAs: 'services.list.json',
      },
      'services.get': {
        clientMethod: 'pricebook.services.get',
        requiresId: true,
        idFrom: 'services.list',
        description: 'Get service by ID',
        saveAs: 'services.get.json',
      },
      'materials.list': {
        clientMethod: 'pricebook.materials.list',
        params: { pageSize: 10 },
        description: 'List pricebook materials',
        saveAs: 'materials.list.json',
      },
      'materials.get': {
        clientMethod: 'pricebook.materials.get',
        requiresId: true,
        idFrom: 'materials.list',
        description: 'Get material by ID',
        saveAs: 'materials.get.json',
      },
      'equipment.list': {
        clientMethod: 'pricebook.equipment.list',
        params: { pageSize: 10 },
        description: 'List pricebook equipment',
        saveAs: 'equipment.list.json',
      },
      'discounts.list': {
        clientMethod: 'pricebook.discounts.list',
        description: 'List discounts and fees',
        saveAs: 'discounts.list.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // JOB MANAGEMENT DOMAIN - tenant-jpm-v2.json
    // stClient: jobs, appointments, projects
    // ═══════════════════════════════════════════════════════════════════════
    jpm: {
      'jobs.list': {
        clientMethod: 'jobs.list',
        params: { pageSize: 10 },
        description: 'List jobs',
        saveAs: 'jobs.list.json',
      },
      'jobs.get': {
        clientMethod: 'jobs.get',
        requiresId: true,
        idFrom: 'jobs.list',
        description: 'Get job by ID',
        saveAs: 'jobs.get.json',
      },
      'appointments.list': {
        clientMethod: 'appointments.list',
        params: { pageSize: 10 },
        description: 'List appointments',
        saveAs: 'appointments.list.json',
      },
      'appointments.get': {
        clientMethod: 'appointments.get',
        requiresId: true,
        idFrom: 'appointments.list',
        description: 'Get appointment by ID',
        saveAs: 'appointments.get.json',
      },
      'projects.list': {
        clientMethod: 'projects.list',
        params: { pageSize: 10 },
        description: 'List projects',
        saveAs: 'projects.list.json',
      },
      'jobTypes.list': {
        clientMethod: 'jobTypes.list',
        description: 'List job types',
        saveAs: 'jobTypes.list.json',
        optional: true,
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // DISPATCH DOMAIN - tenant-dispatch-v2.json
    // stClient: technicians, teams, zones
    // ═══════════════════════════════════════════════════════════════════════
    dispatch: {
      'technicians.list': {
        clientMethod: 'technicians.list',
        params: { pageSize: 50 },
        description: 'List technicians',
        saveAs: 'technicians.list.json',
      },
      'technicians.get': {
        clientMethod: 'technicians.get',
        requiresId: true,
        idFrom: 'technicians.list',
        description: 'Get technician by ID',
        saveAs: 'technicians.get.json',
      },
      'teams.list': {
        clientMethod: 'teams.list',
        description: 'List teams',
        saveAs: 'teams.list.json',
      },
      'zones.list': {
        clientMethod: 'zones.list',
        description: 'List zones',
        saveAs: 'zones.list.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // ACCOUNTING DOMAIN - tenant-accounting-v2.json
    // stClient: invoices, payments
    // ═══════════════════════════════════════════════════════════════════════
    accounting: {
      'invoices.list': {
        clientMethod: 'invoices.list',
        params: { pageSize: 10 },
        description: 'List invoices',
        saveAs: 'invoices.list.json',
      },
      'invoices.get': {
        clientMethod: 'invoices.get',
        requiresId: true,
        idFrom: 'invoices.list',
        description: 'Get invoice by ID',
        saveAs: 'invoices.get.json',
      },
      'payments.list': {
        clientMethod: 'payments.list',
        params: { pageSize: 10 },
        description: 'List payments',
        saveAs: 'payments.list.json',
      },
      'paymentTypes.list': {
        clientMethod: 'paymentTypes.list',
        description: 'List payment types',
        saveAs: 'paymentTypes.list.json',
      },
      'taxZones.list': {
        clientMethod: 'taxZones.list',
        description: 'List tax zones',
        saveAs: 'taxZones.list.json',
      },
    },
    
    // Additional domains with optional flag since they may not all be implemented
    inventory: {
      'items.list': {
        clientMethod: 'inventory.items.list',
        params: { pageSize: 10 },
        description: 'List inventory items',
        saveAs: 'items.list.json',
        optional: true,
      },
    },
    
    settings: {
      'businessUnits.list': {
        clientMethod: 'settings.businessUnits.list',
        description: 'List business units',
        saveAs: 'businessUnits.list.json',
        optional: true,
      },
    },
  },
};
