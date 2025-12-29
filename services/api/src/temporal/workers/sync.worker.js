/**
 * Sync Worker - Processes sync workflows
 */

import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from '../activities/index.js';

async function run() {
    console.log('Starting sync worker...');
    
    const connection = await NativeConnection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233'
    });
    
    const worker = await Worker.create({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
        taskQueue: 'sync-tasks',
        workflowsPath: new URL('../workflows/index.js', import.meta.url).pathname,
        activities,
        maxConcurrentActivityTaskExecutions: 10,
        maxConcurrentWorkflowTaskExecutions: 5
    });
    
    console.log('🔄 Sync worker started, listening on sync-tasks queue');
    
    // Graceful shutdown
    const shutdown = async () => {
        console.log('Shutting down sync worker...');
        await worker.shutdown();
        await connection.close();
        process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    await worker.run();
}

run().catch((err) => {
    console.error('Sync worker error:', err);
    process.exit(1);
});
