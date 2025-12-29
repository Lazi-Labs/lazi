#!/usr/bin/env node
/**
 * Standalone image download worker process
 * 
 * Run with: node src/workers/start-image-worker.js
 */

import 'dotenv/config';
import { createImageDownloadWorker } from './pricebook-image-download.worker.js';

console.log('Starting image download worker...');
console.log(`Database: ${process.env.DATABASE_URL?.substring(0, 30)}...`);
console.log(`Redis: ${process.env.REDIS_URL}`);

const worker = createImageDownloadWorker();

process.on('SIGTERM', async () => {
  console.log('Shutting down image worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down image worker...');
  await worker.close();
  process.exit(0);
});
