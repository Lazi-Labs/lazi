# WINDSURF PROMPT: Phase 2 - ServiceTitan Endpoint Testing & Reference Storage

**CONTEXT:** Phase 1 is COMPLETE. You have already created:
- ✅ 17 provider interfaces in `providers/interfaces/`
- ✅ stClient with all 17 API domains in `services/stClient.js`
- ✅ 6 ServiceTitan providers (customers, locations, contacts, jobs, appointments, pricebook)
- ✅ 4 modules with V2 routes mounted at `/api/v2`
- ✅ Feature flags, tenant isolation, RBAC middleware

**GOAL:** Test ALL ServiceTitan API endpoints, store reference responses, and verify the complete integration.

---

## PHASE 2A: Pre-Flight Checks

### Step 1: Verify Existing Implementation

First, verify what's already built:

```bash
# Check stClient has all domains
grep -E "^\s+(customers|locations|contacts|jobs|appointments|pricebook|technicians|invoices|payments|inventory|equipmentSystems|forms|marketing|settings|timesheets|telecom|tasks|payroll|reporting)\s*=" services/api/src/services/stClient.js

# Check provider interfaces exist
ls -la services/api/src/providers/interfaces/

# Check ServiceTitan providers exist
ls -la services/api/src/providers/servicetitan/

# Check modules exist
ls -la services/api/src/modules/
```

### Step 2: Verify Environment Variables

```bash
# Check required env vars are set
echo "SERVICETITAN_CLIENT_ID: ${SERVICETITAN_CLIENT_ID:0:10}..."
echo "SERVICETITAN_CLIENT_SECRET: ${SERVICETITAN_CLIENT_SECRET:0:5}..."
echo "SERVICETITAN_TENANT_ID: ${SERVICETITAN_TENANT_ID:-3222348440}"
```

### Step 3: Run Existing Server (if possible)

```bash
cd /opt/docker/apps/lazi/services/api
npm start &
sleep 5

# Test if server is running
curl -s http://localhost:3001/health || echo "Server not responding"
```

---

## PHASE 2B: Create ST Endpoint Test Runner

### Step 1: Create Test Directory Structure

```bash
cd /opt/docker/apps/lazi/services/api

# Create test infrastructure
mkdir -p src/tests/st-endpoints

# Create reference storage directories (one per API domain)
mkdir -p src/reference/st-responses/{crm,jpm,pricebook,dispatch,accounting,inventory,equipment-systems,forms,marketing,settings,sales,timesheets,telecom,task-management,payroll,reporting}
```

### Step 2: Create Test Configuration

Create `src/tests/st-endpoints/config.js`:

```javascript
/**
 * ServiceTitan Endpoint Test Configuration
 * 
 * This config uses the EXISTING stClient to test all endpoints.
 * Reference: /opt/docker/apps/lazi/docs-backup/api/tenant-*.json
 */

const path = require('path');

module.exports = {
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
  tenantId: process.env.SERVICETITAN_TENANT_ID || '3222348440',
  
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
    
    // ═══════════════════════════════════════════════════════════════════════
    // INVENTORY DOMAIN - tenant-inventory-v2.json
    // stClient: inventory
    // ═══════════════════════════════════════════════════════════════════════
    inventory: {
      'items.list': {
        clientMethod: 'inventory.items.list',
        params: { pageSize: 10 },
        description: 'List inventory items',
        saveAs: 'items.list.json',
      },
      'warehouses.list': {
        clientMethod: 'inventory.warehouses.list',
        description: 'List warehouses',
        saveAs: 'warehouses.list.json',
      },
      'vendors.list': {
        clientMethod: 'inventory.vendors.list',
        params: { pageSize: 10 },
        description: 'List vendors',
        saveAs: 'vendors.list.json',
      },
      'purchaseOrders.list': {
        clientMethod: 'inventory.purchaseOrders.list',
        params: { pageSize: 10 },
        description: 'List purchase orders',
        saveAs: 'purchaseOrders.list.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // EQUIPMENT SYSTEMS DOMAIN - tenant-equipment-systems-v2.json
    // stClient: equipmentSystems
    // ═══════════════════════════════════════════════════════════════════════
    equipmentSystems: {
      'installedEquipment.list': {
        clientMethod: 'equipmentSystems.list',
        params: { pageSize: 10 },
        description: 'List installed equipment',
        saveAs: 'installedEquipment.list.json',
      },
      'installedEquipment.get': {
        clientMethod: 'equipmentSystems.get',
        requiresId: true,
        idFrom: 'installedEquipment.list',
        description: 'Get installed equipment by ID',
        saveAs: 'installedEquipment.get.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // FORMS DOMAIN - tenant-forms-v2.json
    // stClient: forms
    // ═══════════════════════════════════════════════════════════════════════
    forms: {
      'definitions.list': {
        clientMethod: 'forms.definitions.list',
        description: 'List form definitions',
        saveAs: 'definitions.list.json',
      },
      'submissions.list': {
        clientMethod: 'forms.submissions.list',
        params: { pageSize: 10 },
        description: 'List form submissions',
        saveAs: 'submissions.list.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // MARKETING DOMAIN - tenant-marketing-v2.json
    // stClient: marketing
    // ═══════════════════════════════════════════════════════════════════════
    marketing: {
      'campaigns.list': {
        clientMethod: 'marketing.campaigns.list',
        description: 'List campaigns',
        saveAs: 'campaigns.list.json',
      },
      'campaigns.get': {
        clientMethod: 'marketing.campaigns.get',
        requiresId: true,
        idFrom: 'campaigns.list',
        description: 'Get campaign by ID',
        saveAs: 'campaigns.get.json',
      },
      'categories.list': {
        clientMethod: 'marketing.categories.list',
        description: 'List marketing categories',
        saveAs: 'categories.list.json',
      },
      'costs.list': {
        clientMethod: 'marketing.costs.list',
        params: { pageSize: 10 },
        description: 'List marketing costs',
        saveAs: 'costs.list.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // SETTINGS DOMAIN - tenant-settings-v2.json
    // stClient: settings
    // ═══════════════════════════════════════════════════════════════════════
    settings: {
      'businessUnits.list': {
        clientMethod: 'settings.businessUnits.list',
        description: 'List business units',
        saveAs: 'businessUnits.list.json',
      },
      'businessUnits.get': {
        clientMethod: 'settings.businessUnits.get',
        requiresId: true,
        idFrom: 'businessUnits.list',
        description: 'Get business unit by ID',
        saveAs: 'businessUnits.get.json',
      },
      'employees.list': {
        clientMethod: 'settings.employees.list',
        params: { pageSize: 50 },
        description: 'List employees',
        saveAs: 'employees.list.json',
      },
      'tags.list': {
        clientMethod: 'settings.tags.list',
        description: 'List tag types',
        saveAs: 'tags.list.json',
      },
      'memberships.list': {
        clientMethod: 'settings.memberships.list',
        description: 'List membership types',
        saveAs: 'memberships.list.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // TIMESHEETS DOMAIN - tenant-timesheets-v2.json
    // stClient: timesheets
    // ═══════════════════════════════════════════════════════════════════════
    timesheets: {
      'timesheets.list': {
        clientMethod: 'timesheets.list',
        params: { pageSize: 10 },
        description: 'List timesheets',
        saveAs: 'timesheets.list.json',
      },
      'codes.list': {
        clientMethod: 'timesheets.codes.list',
        description: 'List timesheet codes',
        saveAs: 'codes.list.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // TELECOM DOMAIN - tenant-telecom-v2.json
    // stClient: telecom
    // ═══════════════════════════════════════════════════════════════════════
    telecom: {
      'calls.list': {
        clientMethod: 'telecom.calls.list',
        params: { pageSize: 10 },
        description: 'List calls',
        saveAs: 'calls.list.json',
      },
      'calls.get': {
        clientMethod: 'telecom.calls.get',
        requiresId: true,
        idFrom: 'calls.list',
        description: 'Get call by ID',
        saveAs: 'calls.get.json',
      },
      'callReasons.list': {
        clientMethod: 'telecom.callReasons.list',
        description: 'List call reasons',
        saveAs: 'callReasons.list.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // TASK MANAGEMENT DOMAIN - tenant-task-management-v2.json
    // stClient: tasks
    // ═══════════════════════════════════════════════════════════════════════
    taskManagement: {
      'tasks.list': {
        clientMethod: 'tasks.list',
        params: { pageSize: 10 },
        description: 'List tasks',
        saveAs: 'tasks.list.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // PAYROLL DOMAIN - tenant-payroll-v2.json
    // stClient: payroll
    // ═══════════════════════════════════════════════════════════════════════
    payroll: {
      'adjustments.list': {
        clientMethod: 'payroll.adjustments.list',
        params: { pageSize: 10 },
        description: 'List payroll adjustments',
        saveAs: 'adjustments.list.json',
      },
      'grossPayItems.list': {
        clientMethod: 'payroll.grossPayItems.list',
        params: { pageSize: 10 },
        description: 'List gross pay items',
        saveAs: 'grossPayItems.list.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // REPORTING DOMAIN - tenant-reporting-v2.json
    // stClient: reporting
    // ═══════════════════════════════════════════════════════════════════════
    reporting: {
      'categories.list': {
        clientMethod: 'reporting.categories.list',
        description: 'List report categories',
        saveAs: 'categories.list.json',
      },
      'reports.list': {
        clientMethod: 'reporting.reports.list',
        description: 'List reports',
        saveAs: 'reports.list.json',
      },
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // SALES/ESTIMATES DOMAIN
    // stClient: estimates (if exists)
    // ═══════════════════════════════════════════════════════════════════════
    sales: {
      'estimates.list': {
        clientMethod: 'estimates.list',
        params: { pageSize: 10 },
        description: 'List estimates',
        saveAs: 'estimates.list.json',
        optional: true,  // May not exist in stClient
      },
    },
  },
};
```

### Step 3: Create Test Runner

Create `src/tests/st-endpoints/runner.js`:

```javascript
/**
 * ServiceTitan Endpoint Test Runner
 * 
 * Uses the EXISTING stClient to test all endpoints and save responses.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

// Import the existing stClient
const stClient = require('../../services/stClient');

class STEndpointTestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
    };
    this.idCache = {};
  }
  
  // Get nested property from object using dot notation
  getNestedMethod(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  // Extract ID from response
  extractId(data) {
    if (!data) return null;
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data[0].id;
    }
    if (Array.isArray(data) && data.length > 0) {
      return data[0].id;
    }
    if (data.id) return data.id;
    return null;
  }
  
  // Save response to file
  saveResponse(domain, filename, data, isError = false) {
    const domainDir = path.join(config.referenceDir, domain);
    
    if (!fs.existsSync(domainDir)) {
      fs.mkdirSync(domainDir, { recursive: true });
    }
    
    const filePath = path.join(domainDir, isError ? `${filename}.error.json` : filename);
    
    const content = {
      _meta: {
        savedAt: new Date().toISOString(),
        tenantId: config.tenantId,
        isError,
        recordCount: Array.isArray(data?.data) ? data.data.length : (data ? 1 : 0),
      },
      response: data,
    };
    
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`   📁 Saved: ${filePath}`);
  }
  
  // Run a single test
  async runTest(domain, testName, testConfig) {
    const fullName = `${domain}.${testName}`;
    this.results.total++;
    
    console.log(`\n🧪 ${fullName}`);
    console.log(`   ${testConfig.description}`);
    
    // Check if optional and method doesn't exist
    const method = this.getNestedMethod(stClient, testConfig.clientMethod);
    if (!method) {
      if (testConfig.optional) {
        console.log(`   ⏭️  SKIP (optional, method not found)`);
        this.results.skipped++;
        this.results.tests.push({ name: fullName, status: 'skipped', reason: 'Method not found' });
        return;
      }
      console.log(`   ❌ FAIL (method not found: ${testConfig.clientMethod})`);
      this.results.failed++;
      this.results.tests.push({ name: fullName, status: 'failed', error: 'Method not found' });
      return;
    }
    
    // Get ID if required
    let testId = null;
    if (testConfig.requiresId) {
      testId = this.idCache[`${domain}.${testConfig.idFrom}`];
      if (!testId) {
        console.log(`   ⏭️  SKIP (no ID from ${testConfig.idFrom})`);
        this.results.skipped++;
        this.results.tests.push({ name: fullName, status: 'skipped', reason: 'No ID available' });
        return;
      }
      console.log(`   Using ID: ${testId}`);
    }
    
    try {
      const startTime = Date.now();
      
      // Call the method
      let result;
      if (testConfig.requiresId) {
        result = await method(testId);
      } else if (testConfig.params) {
        result = await method(testConfig.params);
      } else {
        result = await method();
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ PASS (${duration}ms)`);
      
      // Save response
      if (config.test.saveResponses) {
        this.saveResponse(domain, testConfig.saveAs, result);
      }
      
      // Cache ID for dependent tests
      const extractedId = this.extractId(result);
      if (extractedId) {
        this.idCache[`${domain}.${testName}`] = extractedId;
        console.log(`   🔑 Cached ID: ${extractedId}`);
      }
      
      // Log count
      if (result?.data && Array.isArray(result.data)) {
        console.log(`   📊 Records: ${result.data.length}`);
      }
      
      this.results.passed++;
      this.results.tests.push({
        name: fullName,
        status: 'passed',
        duration,
        recordCount: result?.data?.length,
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ FAIL (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      
      if (config.test.saveErrors) {
        this.saveResponse(domain, testConfig.saveAs, { error: error.message, status: error.response?.status }, true);
      }
      
      this.results.failed++;
      this.results.tests.push({
        name: fullName,
        status: 'failed',
        duration,
        error: error.message,
      });
    }
    
    // Delay between requests
    await new Promise(r => setTimeout(r, config.test.requestDelay));
  }
  
  // Run all tests
  async runAll() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║       SERVICETITAN ENDPOINT TEST RUNNER                        ║');
    console.log('║       Using existing stClient                                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`\nTenant ID: ${config.tenantId}`);
    console.log(`Reference Dir: ${config.referenceDir}\n`);
    
    for (const [domain, tests] of Object.entries(config.endpoints)) {
      console.log(`\n═══════════════════════════════════════════════════════════════`);
      console.log(`  DOMAIN: ${domain.toUpperCase()}`);
      console.log(`═══════════════════════════════════════════════════════════════`);
      
      // Run list tests first (to get IDs)
      for (const [testName, testConfig] of Object.entries(tests)) {
        if (testName.includes('.list') || testName.endsWith('.list')) {
          await this.runTest(domain, testName, testConfig);
        }
      }
      
      // Run other tests
      for (const [testName, testConfig] of Object.entries(tests)) {
        if (!testName.includes('.list') && !testName.endsWith('.list')) {
          await this.runTest(domain, testName, testConfig);
        }
      }
    }
    
    this.printSummary();
    this.saveResults();
    
    return this.results;
  }
  
  // Run single domain
  async runDomain(domainName) {
    const domain = config.endpoints[domainName];
    if (!domain) {
      console.error(`Domain not found: ${domainName}`);
      return this.results;
    }
    
    console.log(`\nRunning tests for domain: ${domainName}\n`);
    
    for (const [testName, testConfig] of Object.entries(domain)) {
      if (testName.includes('.list')) {
        await this.runTest(domainName, testName, testConfig);
      }
    }
    
    for (const [testName, testConfig] of Object.entries(domain)) {
      if (!testName.includes('.list')) {
        await this.runTest(domainName, testName, testConfig);
      }
    }
    
    this.printSummary();
    this.saveResults();
    
    return this.results;
  }
  
  printSummary() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                        TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total:   ${this.results.total}`);
    console.log(`Passed:  ${this.results.passed} ✅`);
    console.log(`Failed:  ${this.results.failed} ❌`);
    console.log(`Skipped: ${this.results.skipped} ⏭️`);
    
    const successRate = this.results.total - this.results.skipped > 0
      ? ((this.results.passed / (this.results.total - this.results.skipped)) * 100).toFixed(1)
      : 0;
    console.log(`Success: ${successRate}%`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (this.results.failed > 0) {
      console.log('FAILED TESTS:');
      this.results.tests
        .filter(t => t.status === 'failed')
        .forEach(t => console.log(`  ❌ ${t.name}: ${t.error}`));
    }
  }
  
  saveResults() {
    const resultsFile = path.join(config.referenceDir, 'test-results.json');
    
    const fullResults = {
      _meta: {
        runAt: new Date().toISOString(),
        tenantId: config.tenantId,
      },
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
      },
      tests: this.results.tests,
    };
    
    fs.writeFileSync(resultsFile, JSON.stringify(fullResults, null, 2));
    console.log(`\n📄 Results saved: ${resultsFile}`);
  }
}

// CLI
async function main() {
  const runner = new STEndpointTestRunner();
  const domain = process.argv[2];
  
  if (domain && domain !== '--all') {
    await runner.runDomain(domain);
  } else {
    await runner.runAll();
  }
}

main().catch(console.error);

module.exports = STEndpointTestRunner;
```

### Step 4: Create Shell Script

Create `scripts/test-st-endpoints.sh`:

```bash
#!/bin/bash
# ServiceTitan Endpoint Test Runner

cd /opt/docker/apps/lazi/services/api

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     SERVICETITAN ENDPOINT TESTING                              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# Load environment
if [ -f ../../.env.production ]; then
  source ../../.env.production
fi

# Check credentials
if [ -z "$SERVICETITAN_CLIENT_ID" ]; then
  echo "❌ Missing SERVICETITAN_CLIENT_ID"
  exit 1
fi

DOMAIN=${1:-"all"}
echo "Testing: $DOMAIN"
echo ""

if [ "$DOMAIN" == "all" ]; then
  node src/tests/st-endpoints/runner.js --all
else
  node src/tests/st-endpoints/runner.js $DOMAIN
fi

echo ""
echo "Reference responses: src/reference/st-responses/"
```

---

## PHASE 2C: Execute & Verify

### Step 1: Run Tests

```bash
chmod +x scripts/test-st-endpoints.sh

# Test all endpoints
./scripts/test-st-endpoints.sh all

# Or test by domain
./scripts/test-st-endpoints.sh crm
./scripts/test-st-endpoints.sh pricebook
./scripts/test-st-endpoints.sh jpm
./scripts/test-st-endpoints.sh dispatch
```

### Step 2: Verify Results

```bash
# Check test results
cat src/reference/st-responses/test-results.json | jq '.summary'

# Count reference files
find src/reference/st-responses -name "*.json" -not -name "test-results.json" | wc -l

# List saved responses by domain
for domain in crm pricebook jpm dispatch accounting inventory; do
  echo "=== $domain ==="
  ls -la src/reference/st-responses/$domain/ 2>/dev/null || echo "(empty)"
done
```

### Step 3: Review Sample Response

```bash
# Example: View a customer response
cat src/reference/st-responses/crm/customers.list.json | jq '.response.data[0]'

# Example: View a job response  
cat src/reference/st-responses/jpm/jobs.list.json | jq '.response.data[0]'
```

---

## SUCCESS CRITERIA

After completion:

```
✅ Test runner created and working
✅ All stClient methods tested
✅ Reference responses saved (~50+ files)
✅ test-results.json shows pass/fail
✅ No authentication errors
✅ Actual data structure documented

Run verification:
cat src/reference/st-responses/test-results.json | jq '.summary'

Expected output:
{
  "total": 60,
  "passed": 55,
  "failed": 2,
  "skipped": 3
}
```

---

## IMPORTANT NOTES

1. **Uses EXISTING stClient** - Don't create new API client, use what's already built
2. **Tests actual endpoints** - Real API calls to ServiceTitan
3. **Saves real responses** - Use as reference for typing and testing
4. **Respects rate limits** - 250ms delay between requests
5. **Handles missing methods** - Marks as skipped if stClient method doesn't exist

---

START NOW. First verify the existing stClient, then create the test config and runner.