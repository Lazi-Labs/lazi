/**
 * Route Aggregator
 * Combines all route modules and exports a single router
 * 
 * Total Modules: 19
 * Total Endpoints: 372+
 * Generated: 2025-12-04
 */

import { Router } from 'express';

// Health routes
import healthRoutes from './health.routes.js';

// Existing routes (jpm, crm, sales, salestech)
import jobsRoutes from './jobs.routes.js';
import customersRoutes from './customers.routes.js';
import estimatesRoutes from './estimates.routes.js';
import opportunitiesRoutes from './opportunities.routes.js';

// Core modules from OpenAPI specs
import accountingRoutes from './accounting.routes.js';
import dispatchRoutes from './dispatch.routes.js';
import pricebookRoutes from './pricebook.routes.js';
import payrollRoutes from './payroll.routes.js';
import settingsRoutes from './settings.routes.js';
import equipmentRoutes from './equipment.routes.js';
import jbceRoutes from './jbce.routes.js';

// New modules added
import formsRoutes from './forms.routes.js';
import inventoryRoutes from './inventory.routes.js';
import jpmRoutes from './jpm.routes.js';
import marketingRoutes from './marketing.routes.js';
import marketingadsRoutes from './marketingads.routes.js';
import reportingRoutes from './reporting.routes.js';
import taskmanagementRoutes from './taskmanagement.routes.js';
import telecomRoutes from './telecom.routes.js';
import timesheetsRoutes from './timesheets.routes.js';

// Chat routes
import pricebookChatRoutes from './pricebook-chat.routes.js';

// Image proxy routes
import imagesRoutes from './images.routes.js';
import imageQueueRoutes from './image-queue.routes.js';
import pricebookImagesRoutes from './pricebook-images.js';

// Scraper routes
import scrapersRoutes from './scrapers.routes.js';

// VAPI routes (voice AI integration)
import vapiRoutes from './vapi.routes.js';

// Database sync routes (PostgreSQL job sync)
import dbSyncRoutes from './db-sync.routes.js';

// Slack integration routes
import slackRoutes from './slack.routes.js';

// Scheduling routes (hybrid architecture)
import schedulingRoutes from './scheduling.routes.js';

// CRM integration routes (Perfect Catch CRM pipeline sync)
import crmRoutes from './crm.routes.js';

// Contacts routes (customer contacts sync)
import contactsRoutes from './contacts.routes.js';

// Monitoring routes (real-time sync monitoring dashboard)
import monitorRoutes from './monitor.routes.js';

// System routes (developer dashboard API)
import systemRoutes from './system.routes.js';

// Workflow visualizer routes (visual workflow system)
import workflowVisualizerRoutes from './workflow-visualizer.routes.js';

// Plaid banking integration routes
import plaidRoutes from './plaid.routes.js';

// Accounting transactions routes
import accountingTransactionsRoutes from './accounting.transactions.routes.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK ROUTES (mounted at root)
// ═══════════════════════════════════════════════════════════════
router.use('/', healthRoutes);

// ═══════════════════════════════════════════════════════════════
// EXISTING API ROUTES
// ═══════════════════════════════════════════════════════════════
router.use('/jobs', jobsRoutes);
router.use('/customers', customersRoutes);
router.use('/estimates', estimatesRoutes);
router.use('/opportunities', opportunitiesRoutes);

// ═══════════════════════════════════════════════════════════════
// CORE API ROUTES (from OpenAPI specs)
// ═══════════════════════════════════════════════════════════════
router.use('/accounting', accountingRoutes);
router.use('/dispatch', dispatchRoutes);
router.use('/pricebook', pricebookRoutes);
router.use('/payroll', payrollRoutes);
router.use('/settings', settingsRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/jbce', jbceRoutes);

// ═══════════════════════════════════════════════════════════════
// NEW API ROUTES (added 2025-12-04)
// ═══════════════════════════════════════════════════════════════
router.use('/forms', formsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/jpm', jpmRoutes);
router.use('/marketing', marketingRoutes);
router.use('/marketing-ads', marketingadsRoutes);
router.use('/reporting', reportingRoutes);
router.use('/task-management', taskmanagementRoutes);
router.use('/telecom', telecomRoutes);
router.use('/timesheets', timesheetsRoutes);

// ═══════════════════════════════════════════════════════════════
// CHAT ROUTES (AI-powered conversational interface)
// ═══════════════════════════════════════════════════════════════
router.use('/chat', pricebookChatRoutes);

// ═══════════════════════════════════════════════════════════════
// IMAGE PROXY ROUTES (serves ST images from our domain)
// ═══════════════════════════════════════════════════════════════
router.use('/images', imagesRoutes);
router.use('/images', imageQueueRoutes);
router.use('/pricebook/images', pricebookImagesRoutes);

// ═══════════════════════════════════════════════════════════════
// SCRAPER ROUTES (vendor price scraping)
// ═══════════════════════════════════════════════════════════════
router.use('/scrapers', scrapersRoutes);

// ═══════════════════════════════════════════════════════════════
// VAPI ROUTES (voice AI integration for real-time availability)
// ═══════════════════════════════════════════════════════════════
router.use('/vapi', vapiRoutes);

// ═══════════════════════════════════════════════════════════════
// DATABASE SYNC ROUTES (PostgreSQL job sync - replaces Airtable)
// ═══════════════════════════════════════════════════════════════
router.use('/db', dbSyncRoutes);

// ═══════════════════════════════════════════════════════════════
// SLACK INTEGRATION ROUTES (Batch 9 - conversational bot, commands)
// ═══════════════════════════════════════════════════════════════
router.use('/slack', slackRoutes);

// ═══════════════════════════════════════════════════════════════
// SCHEDULING ROUTES (hybrid architecture: cached + real-time)
// ═══════════════════════════════════════════════════════════════
router.use('/scheduling', schedulingRoutes);

// ═══════════════════════════════════════════════════════════════
// CRM INTEGRATION ROUTES (Perfect Catch CRM pipeline sync)
// ═══════════════════════════════════════════════════════════════
router.use('/crm', crmRoutes);

// ═══════════════════════════════════════════════════════════════
// CONTACTS ROUTES (customer contacts sync from ServiceTitan)
// ═══════════════════════════════════════════════════════════════
router.use('/contacts', contactsRoutes);

// ═══════════════════════════════════════════════════════════════
// MONITORING ROUTES (real-time sync monitoring with SSE)
// ═══════════════════════════════════════════════════════════════
router.use('/api/monitor', monitorRoutes);

// ═══════════════════════════════════════════════════════════════
// SYSTEM ROUTES (developer dashboard API)
// ═══════════════════════════════════════════════════════════════
router.use('/system', systemRoutes);

// ═══════════════════════════════════════════════════════════════
// WORKFLOW VISUALIZER ROUTES (visual workflow system with live data)
// ═══════════════════════════════════════════════════════════════
router.use('/workflows', workflowVisualizerRoutes);

// ═══════════════════════════════════════════════════════════════
// PLAID ROUTES (bank connection and transaction sync)
// ═══════════════════════════════════════════════════════════════
router.use('/plaid', plaidRoutes);

// ═══════════════════════════════════════════════════════════════
// ACCOUNTING ROUTES (bank transactions and reconciliation)
// ═══════════════════════════════════════════════════════════════
router.use('/accounting', accountingTransactionsRoutes);

export default router;
