/**
 * ServiceTitan Endpoint Test Runner
 * 
 * Uses the EXISTING stClient to test all endpoints and save responses.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the existing stClient
let stClient;
let config;

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
  
  async initialize() {
    // Dynamically import stClient and config
    const configModule = await import('./config.js');
    config = configModule.default;
    
    const stClientModule = await import('../../services/stClient.js');
    stClient = stClientModule.default || stClientModule.stClient || stClientModule;
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
    console.log(`   📁 Saved: ${path.relative(process.cwd(), filePath)}`);
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
    
    const startTime = Date.now();
    
    try {
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
        this.saveResponse(domain, testConfig.saveAs, { 
          error: error.message, 
          status: error.response?.status,
          stack: error.stack 
        }, true);
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
    console.log(`\n📄 Results saved: ${path.relative(process.cwd(), resultsFile)}`);
  }
}

// CLI
async function main() {
  const runner = new STEndpointTestRunner();
  await runner.initialize();
  
  const domain = process.argv[2];
  
  if (domain && domain !== '--all') {
    await runner.runDomain(domain);
  } else {
    await runner.runAll();
  }
}

main().catch(console.error);

export default STEndpointTestRunner;
