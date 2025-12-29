/**
 * Server Entry Point
 * Loads configuration and starts the Express server
 */

import http from 'http';
import { Server as SocketServer } from 'socket.io';
import config from './config/index.js';
import app from './app.js';
import { logger } from './lib/logger.js';

// Pricebook Category Sync Worker - loaded dynamically
let initializePricebookCategorySyncWorker = null;
let shutdownPricebookCategorySyncWorker = null;
let queueFullSync = null;
let queueCategorySync = null;

// BullMQ Workers - loaded dynamically
let startAllWorkers = null;
let stopAllWorkers = null;

// Cache service - loaded dynamically
let connectCache = null;
let disconnectCache = null;
let startCacheInvalidationListener = null;
let stopCacheInvalidationListener = null;
let warmupCache = null;

// CRM Sync Scheduler - loaded dynamically to prevent startup failures
let startCRMSyncScheduler = null;
let stopCRMSyncScheduler = null;

// Pricebook Sync Scheduler - loaded dynamically
let pricebookSyncScheduler = null;

const PORT = config.port;

// Create HTTP server and Socket.io instance
const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.debug({ socketId: socket.id }, 'Socket.io client connected');

  // Join tenant room for real-time updates
  socket.on('join:tenant', (tenantId) => {
    socket.join(`tenant:${tenantId}`);
    logger.debug({ socketId: socket.id, tenantId }, 'Client joined tenant room');
  });

  socket.on('disconnect', () => {
    logger.debug({ socketId: socket.id }, 'Socket.io client disconnected');
  });
});

// Make io available to app
app.set('io', io);

// Initialize socket event emitter
import { initSocketEvents } from './utils/socket-events.js';
initSocketEvents(io);

// Start server
const server = httpServer.listen(PORT, () => {
  logger.info({
    port: PORT,
    environment: config.nodeEnv,
    version: '2.0.0',
  }, 'ServiceTitan API server started');

  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Perfect Catch ST Automation Server v2.0.0                ║
╠════════════════════════════════════════════════════════════╣
║   Port:        ${PORT}                                         ║
║   Environment: ${config.nodeEnv.padEnd(41)}║
║   API Docs:    http://localhost:${PORT}/                       ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Start CRM Sync Scheduler (every 5 minutes)
  if (process.env.CRM_SYNC_ENABLED === 'true') {
    (async () => {
      try {
        const crmSync = await import('./sync/crm/index.js');
        startCRMSyncScheduler = crmSync.startCRMSyncScheduler;
        stopCRMSyncScheduler = crmSync.stopCRMSyncScheduler;
        startCRMSyncScheduler();
        logger.info('CRM Sync Scheduler started (every 5 minutes)');
      } catch (error) {
        logger.error({ error: error.message }, 'Failed to start CRM Sync Scheduler');
      }
    })();
  } else {
    logger.info('CRM Sync Scheduler disabled (CRM_SYNC_ENABLED!=true)');
  }

  // Start Pricebook Sync Scheduler (if enabled)
  if (process.env.PRICEBOOK_SYNC_SCHEDULER_ENABLED === 'true') {
    (async () => {
      try {
        const { SyncScheduler } = await import('./sync/pricebook/sync-scheduler.js');
        
        // Create a simple sync engine adapter that calls the sync endpoint
        const syncEngineAdapter = {
          async sync(options) {
            const tenantId = process.env.SERVICE_TITAN_TENANT_ID;
            logger.info({ options, tenantId }, '[SCHEDULER] Running pricebook sync');
            
            try {
              // Use internal fetch to trigger sync
              const response = await fetch(`http://localhost:${PORT}/api/pricebook/categories/sync`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-tenant-id': tenantId,
                },
                body: JSON.stringify({ incremental: !options.fullSync }),
              });
              
              const result = await response.json();
              logger.info({ result }, '[SCHEDULER] Pricebook sync completed');
              return { status: 'completed', stats: result };
            } catch (error) {
              logger.error({ error: error.message }, '[SCHEDULER] Pricebook sync failed');
              throw error;
            }
          }
        };
        
        pricebookSyncScheduler = new SyncScheduler(syncEngineAdapter, {
          fullSyncCron: process.env.PRICEBOOK_FULL_SYNC_CRON || '0 2 * * *',      // Daily at 2 AM
          incrementalSyncCron: process.env.PRICEBOOK_INCREMENTAL_SYNC_CRON || '0 */6 * * *', // Every 6 hours
          enabled: true,
        });
        
        pricebookSyncScheduler.start();
        logger.info('[SCHEDULER] Pricebook Sync Scheduler started');
      } catch (error) {
        logger.error({ error: error.message }, 'Failed to start Pricebook Sync Scheduler');
      }
    })();
  } else {
    logger.info('Pricebook Sync Scheduler disabled (PRICEBOOK_SYNC_SCHEDULER_ENABLED!=true)');
  }

  // Start BullMQ Workers (if enabled)
  if (process.env.BULLMQ_WORKERS_ENABLED !== 'false') {
    (async () => {
      try {
        const workers = await import('./workers/bullmq/index.js');
        startAllWorkers = workers.startAllWorkers;
        stopAllWorkers = workers.stopAllWorkers;
        await startAllWorkers();
        logger.info('BullMQ Workers started');
      } catch (error) {
        logger.error({ error: error.message }, 'Failed to start BullMQ Workers');
      }
    })();
  } else {
    logger.info('BullMQ Workers disabled (BULLMQ_WORKERS_ENABLED=false)');
  }

  // Start Pricebook Category Sync Worker (if Redis is available)
  if (process.env.REDIS_URL && process.env.PRICEBOOK_SYNC_ENABLED !== 'false') {
    (async () => {
      try {
        const pricebookWorker = await import('./workers/pricebook-category-sync.js');
        initializePricebookCategorySyncWorker = pricebookWorker.initializePricebookCategorySyncWorker;
        shutdownPricebookCategorySyncWorker = pricebookWorker.shutdownPricebookCategorySyncWorker;
        queueFullSync = pricebookWorker.queueFullSync;
        queueCategorySync = pricebookWorker.queueCategorySync;
        
        // Initialize worker with Socket.io
        await initializePricebookCategorySyncWorker(io);
        
        // Inject worker functions into routes
        const { setWorkerFunctions } = await import('./routes/pricebook-categories.js');
        setWorkerFunctions(queueFullSync, queueCategorySync);
        
        // Start image download worker
        const { createImageDownloadWorker } = await import('./workers/pricebook-image-download.worker.js');
        createImageDownloadWorker();
        
        logger.info('Pricebook Category Sync Worker started');
        logger.info('Image download worker started');
      } catch (error) {
        logger.error({ error: error.message }, 'Failed to start Pricebook Category Sync Worker');
      }
    })();
  } else {
    logger.info('Pricebook Category Sync Worker disabled (REDIS_URL not set or PRICEBOOK_SYNC_ENABLED=false)');
  }

  // Start Redis Cache (if enabled)
  if (process.env.CACHE_ENABLED !== 'false') {
    (async () => {
      try {
        const cacheClient = await import('./services/cache/redis-client.js');
        const cacheInvalidation = await import('./services/cache/invalidation.js');
        const cacheWarmup = await import('./services/cache/warmup.js');
        
        connectCache = cacheClient.connectCache;
        disconnectCache = cacheClient.disconnectCache;
        startCacheInvalidationListener = cacheInvalidation.startCacheInvalidationListener;
        stopCacheInvalidationListener = cacheInvalidation.stopCacheInvalidationListener;
        warmupCache = cacheWarmup.warmupCache;
        
        // Connect to Redis
        await connectCache();
        logger.info('Redis Cache connected');
        
        // Start cache invalidation listener
        await startCacheInvalidationListener();
        logger.info('Cache invalidation listener started');
        
        // Run cache warmup
        if (process.env.CACHE_WARMUP_ON_START !== 'false') {
          const warmupResult = await warmupCache();
          logger.info({ warmed: warmupResult.warmed?.length || 0 }, 'Cache warmup completed');
        }
        
      } catch (error) {
        logger.error({ error: error.message }, 'Failed to start Redis Cache');
      }
    })();
  } else {
    logger.info('Redis Cache disabled (CACHE_ENABLED=false)');
  }
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  logger.info({ signal }, 'Received shutdown signal');

  // Stop CRM Sync Scheduler
  if (stopCRMSyncScheduler) {
    try {
      stopCRMSyncScheduler();
      logger.info('CRM Sync Scheduler stopped');
    } catch (error) {
      logger.error({ error: error.message }, 'Error stopping CRM Sync Scheduler');
    }
  }

  // Stop Pricebook Sync Scheduler
  if (pricebookSyncScheduler) {
    try {
      pricebookSyncScheduler.stop();
      logger.info('Pricebook Sync Scheduler stopped');
    } catch (error) {
      logger.error({ error: error.message }, 'Error stopping Pricebook Sync Scheduler');
    }
  }

  // Stop Pricebook Category Sync Worker
  if (shutdownPricebookCategorySyncWorker) {
    (async () => {
      try {
        await shutdownPricebookCategorySyncWorker();
        logger.info('Pricebook Category Sync Worker stopped');
      } catch (error) {
        logger.error({ error: error.message }, 'Error stopping Pricebook Category Sync Worker');
      }
    })();
  }

  // Stop BullMQ Workers
  if (stopAllWorkers) {
    (async () => {
      try {
        await stopAllWorkers();
        logger.info('BullMQ Workers stopped');
      } catch (error) {
        logger.error({ error: error.message }, 'Error stopping BullMQ Workers');
      }
    })();
  }

  // Stop Redis Cache
  if (stopCacheInvalidationListener) {
    (async () => {
      try {
        await stopCacheInvalidationListener();
        logger.info('Cache invalidation listener stopped');
      } catch (error) {
        logger.error({ error: error.message }, 'Error stopping cache invalidation listener');
      }
    })();
  }
  
  if (disconnectCache) {
    (async () => {
      try {
        await disconnectCache();
        logger.info('Redis Cache disconnected');
      } catch (error) {
        logger.error({ error: error.message }, 'Error disconnecting Redis Cache');
      }
    })();
  }

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
});

export default server;
