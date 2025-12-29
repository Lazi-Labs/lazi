/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import config from './config/index.js';
import routes from './routes/index.js';
import { requestLogger, apiKeyAuth, notFound } from './middleware/index.js';
import { errorHandler } from './lib/errors.js';
import { getPool } from './db/schema-connection.js';
import { createLogger } from './lib/logger.js';
import crmRoutes from './routes/crm.js';
import auditRoutes from './routes/audit.js';
import healthRoutes from './routes/health.js';
import docsRoutes from './routes/docs.js';
import temporalRoutes from './routes/temporal.js';
import authRoutes from './routes/auth.routes.js';
import pricebookCategoriesRoutes from './routes/pricebook-categories.js';
import pricebookServicesRoutes from './routes/pricebook-services.js';
import pricebookMaterialsRoutes from './routes/pricebook-materials.js';
import pricebookEquipmentRoutes from './routes/pricebook-equipment.js';
import pricebookBatchSyncRoutes from './routes/pricebook-batch-sync.js';
import pricebookCategoriesSyncRoutes from './routes/pricebook-categories-sync.js';
import pricebookHealthRoutes from './routes/pricebook-health.js';
import pricebookImagesRoutes from './routes/pricebook-images.js';
import pricebookImageManagerRoutes from './routes/pricebook-image-manager.js';

const logger = createLogger('app');

// Handle BigInt serialization for JSON responses
BigInt.prototype.toJSON = function() {
  return this.toString();
};

// Create Express app
const app = express();

// ---------------------------------------------------------------
// HEALTH CHECK ENDPOINTS (before authentication)
// ---------------------------------------------------------------

// Simple health check - liveness probe
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness check - checks dependencies
app.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    serviceTitan: false,
  };
  
  let allHealthy = true;
  
  // Check database
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    checks.database = true;
  } catch (error) {
    allHealthy = false;
    checks.database = { error: error.message };
  }
  
  // Check ServiceTitan auth (if stClient is available)
  try {
    const { stClient } = await import('./services/stClient.js');
    await stClient.ensureAuthenticated();
    checks.serviceTitan = true;
  } catch (error) {
    allHealthy = false;
    checks.serviceTitan = { error: error.message };
  }
  
  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    },
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------
// OPTIONAL: PRICEBOOK ENGINE INITIALIZATION (requires DATABASE_URL)
// ---------------------------------------------------------------

let syncEngine = null;
let syncScheduler = null;
let schedulingSyncEngine = null;
let schedulingSyncScheduler = null;

/**
 * Initialize optional pricebook sync engine
 * Only initializes if DATABASE_URL is configured and modules exist
 */
async function initializeOptionalEngines() {
  // Skip if DATABASE_URL not configured
  if (!process.env.DATABASE_URL) {
    logger.info('DATABASE_URL not configured - Sync engine features disabled (this is OK)');
    return;
  }

  try {
    // Dynamically import optional modules (they may not exist in all deployments)
    const { getPrismaClient, checkDatabaseConnection } = await import('./db/prisma.js');
    const { stRequest } = await import('./services/stClient.js');
    
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      logger.warn('Database connection failed - Sync engine disabled');
      return;
    }

    const prisma = getPrismaClient();
    const stClient = { stRequest };

    // Try to load pricebook sync engine (optional)
    try {
      const { PricebookSyncEngine, SyncScheduler, createSyncRouter } = await import('./sync/pricebook/index.js');
      syncEngine = new PricebookSyncEngine(prisma, stClient);
      syncScheduler = new SyncScheduler(syncEngine, {
        enabled: process.env.SYNC_SCHEDULER_ENABLED !== 'false',
      });
      app.set('syncEngine', syncEngine);
      app.set('syncScheduler', syncScheduler);

      if (process.env.SYNC_SCHEDULER_ENABLED !== 'false') {
        syncScheduler.start();
      }
      logger.info('Pricebook sync engine initialized');
    } catch (e) {
      logger.debug('Pricebook sync engine modules not available (optional)');
    }

    // Try to load scheduling sync engine (optional)
    try {
      const { SchedulingSyncEngine, SchedulingSyncScheduler, createSchedulingSyncRouter } = await import('./sync/scheduling/index.js');
      schedulingSyncEngine = new SchedulingSyncEngine(stClient);
      schedulingSyncScheduler = new SchedulingSyncScheduler(schedulingSyncEngine, {
        enabled: process.env.SCHEDULING_SYNC_ENABLED !== 'false',
      });
      app.set('schedulingSyncEngine', schedulingSyncEngine);
      app.set('schedulingSyncScheduler', schedulingSyncScheduler);

      if (process.env.SCHEDULING_SYNC_ENABLED !== 'false') {
        schedulingSyncScheduler.start();
      }
      logger.info('Scheduling sync engine initialized');
    } catch (e) {
      logger.debug('Scheduling sync engine modules not available (optional)');
    }

    // Try to load n8n integration (optional)
    try {
      const { N8nWebhookHandler, WebhookSender, pricebookEvents } = await import('./integrations/n8n/index.js');
      const n8nHandler = new N8nWebhookHandler(prisma, stClient);
      const webhookSender = new WebhookSender(prisma);
      pricebookEvents.setWebhookSender(webhookSender);
      app.set('n8nHandler', n8nHandler);
      app.set('webhookSender', webhookSender);
      logger.info('n8n webhook integration initialized');
    } catch (e) {
      logger.debug('n8n integration modules not available (optional)');
    }

    app.set('prisma', prisma);
  } catch (error) {
    logger.warn({ error: error.message }, 'Optional engine initialization skipped');
  }
}

// Initialize optional engines (non-blocking)
initializeOptionalEngines();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// ---------------------------------------------------------------
// GLOBAL MIDDLEWARE
// ---------------------------------------------------------------

// Request logging
app.use(requestLogger);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Parse cookies (for refresh tokens)
app.use(cookieParser());

// Rate limiting (if configured)
if (config.rateLimit.maxRequests > 0) {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    },
  });
  app.use(limiter);
}

// Optional API key authentication (if API_KEY is set)
app.use(apiKeyAuth);

// CORS headers for n8n and other clients
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow specific origins for credentials, or * for non-credential requests
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, ST-App-Key, x-tenant-id');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// ---------------------------------------------------------------
// STATIC FILES (monitoring dashboard)
// ---------------------------------------------------------------
app.use('/dashboard', express.static(path.join(__dirname, '..', 'public')));

// Serve monitor dashboard at /monitor
app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'monitor.html'));
});

// ---------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------

// Mount all routes
app.use('/', routes);

// Mount pricebook sync routes (conditionally - requires sync engine)
app.use('/api/sync/pricebook', async (req, res, next) => {
  const syncEngine = app.get('syncEngine');
  const syncScheduler = app.get('syncScheduler');
  
  if (!syncEngine || !syncScheduler) {
    return res.status(503).json({
      success: false,
      error: 'Pricebook sync engine not initialized. Check DATABASE_URL configuration.',
    });
  }
  
  try {
    const { createSyncRouter } = await import('./sync/pricebook/index.js');
    const syncRouter = createSyncRouter(syncEngine, syncScheduler);
    syncRouter(req, res, next);
  } catch (e) {
    return res.status(503).json({ success: false, error: 'Sync module not available' });
  }
});

// Mount scheduling sync routes (conditionally - requires scheduling sync engine)
app.use('/api/sync/scheduling', async (req, res, next) => {
  const schedulingSyncEngine = app.get('schedulingSyncEngine');
  const schedulingSyncScheduler = app.get('schedulingSyncScheduler');

  if (!schedulingSyncEngine || !schedulingSyncScheduler) {
    return res.status(503).json({
      success: false,
      error: 'Scheduling sync engine not initialized. Check DATABASE_URL configuration.',
    });
  }

  try {
    const { createSchedulingSyncRouter } = await import('./sync/scheduling/index.js');
    const schedulingSyncRouter = createSchedulingSyncRouter(schedulingSyncEngine, schedulingSyncScheduler);
    schedulingSyncRouter(req, res, next);
  } catch (e) {
    return res.status(503).json({ success: false, error: 'Scheduling sync module not available' });
  }
});

// Mount Salesforce routes (conditionally - requires Redis)
app.use('/api/salesforce', async (req, res, next) => {
  try {
    const salesforceRoutes = (await import('./routes/salesforce.routes.js')).default;
    salesforceRoutes(req, res, next);
  } catch (e) {
    return res.status(503).json({ success: false, error: 'Salesforce module not available: ' + e.message });
  }
});

// Mount n8n routes (conditionally - requires n8n integration)
app.use('/api/n8n', async (req, res, next) => {
  const n8nHandler = app.get('n8nHandler');
  const webhookSender = app.get('webhookSender');
  const prisma = app.get('prisma');
  
  if (!n8nHandler || !webhookSender || !prisma) {
    return res.status(503).json({
      success: false,
      error: 'n8n integration not initialized. Check DATABASE_URL configuration.',
    });
  }
  
  try {
    const { createN8nRouter } = await import('./integrations/n8n/index.js');
    const n8nRouter = createN8nRouter(n8nHandler, webhookSender, prisma);
    n8nRouter(req, res, next);
  } catch (e) {
    return res.status(503).json({ success: false, error: 'n8n module not available' });
  }
});

// Mount admin routes (Bull Board dashboard and queue management)
app.use('/admin', async (req, res, next) => {
  try {
    const adminRoutes = (await import('./routes/admin.js')).default;
    adminRoutes(req, res, next);
  } catch (e) {
    logger.error({ error: e.message }, 'Admin routes not available');
    return res.status(503).json({ success: false, error: 'Admin module not available: ' + e.message });
  }
});

// Mount cache management routes
app.use('/api/cache', async (req, res, next) => {
  try {
    const cacheRoutes = (await import('./routes/cache.js')).default;
    cacheRoutes(req, res, next);
  } catch (e) {
    logger.error({ error: e.message }, 'Cache routes not available');
    return res.status(503).json({ success: false, error: 'Cache module not available: ' + e.message });
  }
});

// Mount workflow routes
app.use('/api/workflows', async (req, res, next) => {
  try {
    const workflowRoutes = (await import('./routes/workflow.js')).default;
    workflowRoutes(req, res, next);
  } catch (e) {
    logger.error({ error: e.message }, 'Workflow routes not available');
    return res.status(503).json({ success: false, error: 'Workflow module not available: ' + e.message });
  }
});

// Mount Auth routes
app.use('/api/auth', authRoutes);

// Mount CRM routes
app.use('/api/crm', crmRoutes);

// Mount audit routes
app.use('/api/audit', auditRoutes);

// Mount health routes
app.use('/api/health', healthRoutes);

// Mount API documentation routes
app.use('/api/docs', docsRoutes);

// Mount Temporal routes
app.use('/api/temporal', temporalRoutes);

// Mount Pricebook Categories routes
app.use('/api/pricebook/categories', pricebookCategoriesRoutes);

// Mount Pricebook Services routes
app.use('/api/pricebook/services', pricebookServicesRoutes);

// Mount Pricebook Materials routes
app.use('/api/pricebook/materials', pricebookMaterialsRoutes);

// Mount Pricebook Equipment routes
app.use('/api/pricebook/equipment', pricebookEquipmentRoutes);

// Mount Pricebook Batch Sync routes
app.use('/api/pricebook/sync', pricebookBatchSyncRoutes);

// Mount Pricebook Categories Sync routes (separate from main categories to avoid conflicts)
app.use('/api/pricebook/categories-sync', pricebookCategoriesSyncRoutes);

// Mount Pricebook Health Dashboard routes
app.use('/api/pricebook/health', pricebookHealthRoutes);

// Mount Pricebook Images Migration routes (MUST be first - more specific path)
app.use('/api/pricebook/images/migrate', pricebookImagesRoutes);

// Mount Pricebook Image Manager routes (SECOND - catches everything else)
app.use('/api/pricebook/images', pricebookImageManagerRoutes);

// ---------------------------------------------------------------
// RATE LIMITING
// ---------------------------------------------------------------

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter: 60,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-tenant-id'] || req.ip,
  skip: (req) => req.path === '/health' || req.path === '/ready' || req.path === '/metrics',
});

// Stricter rate limiter for write operations
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 writes per minute
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many write requests, please try again later',
      retryAfter: 60,
    },
  },
  keyGenerator: (req) => req.headers['x-tenant-id'] || req.ip,
});

// ---------------------------------------------------------------
// V2 API ROUTES (New Modular Architecture)
// ---------------------------------------------------------------

// Apply rate limiting to V2 API
app.use('/api/v2', apiLimiter);

// Apply stricter rate limiting to write operations
app.use('/api/v2', (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

app.use('/api/v2', async (req, res, next) => {
  try {
    const v2Routes = (await import('./routes/v2.routes.js')).default;
    v2Routes(req, res, next);
  } catch (e) {
    logger.error({ error: e.message }, 'V2 routes not available');
    return res.status(503).json({ success: false, error: 'V2 API module not available: ' + e.message });
  }
});

// ---------------------------------------------------------------
// ERROR HANDLING
// ---------------------------------------------------------------

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
