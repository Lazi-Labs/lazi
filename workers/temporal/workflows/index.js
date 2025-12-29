/**
 * Temporal Workflows
 */

import { proxyActivities, sleep, defineSignal, setHandler } from '@temporalio/workflow';

// Import activity types
const activities = proxyActivities({
    startToCloseTimeout: '5 minutes',
    retry: {
        initialInterval: '1 second',
        backoffCoefficient: 2,
        maximumAttempts: 5,
        maximumInterval: '1 minute'
    }
});

// Signals for workflow control
export const cancelSignal = defineSignal('cancel');
export const pauseSignal = defineSignal('pause');
export const resumeSignal = defineSignal('resume');

// ─────────────────────────────────────────────────────────────────────────────
// FULL SYNC WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

export async function fullSyncWorkflow(options = {}) {
    const { entities = ['customers', 'jobs', 'invoices', 'estimates'], notify = true } = options;
    
    let cancelled = false;
    let paused = false;
    
    setHandler(cancelSignal, () => { cancelled = true; });
    setHandler(pauseSignal, () => { paused = true; });
    setHandler(resumeSignal, () => { paused = false; });
    
    const results = [];
    const startTime = Date.now();
    
    const fetchers = {
        customers: activities.fetchCustomers,
        jobs: activities.fetchJobs,
        invoices: activities.fetchInvoices,
        estimates: activities.fetchEstimates
    };
    
    for (const entity of entities) {
        if (cancelled) break;
        
        // Wait if paused
        while (paused && !cancelled) {
            await sleep('5 seconds');
        }
        
        const entityStart = Date.now();
        let totalRecords = 0;
        let pageToken = undefined;
        
        console.log(`Syncing ${entity}...`);
        
        // Paginate through all records
        do {
            if (cancelled) break;
            
            const fetcher = fetchers[entity];
            const result = await fetcher(undefined, pageToken);
            totalRecords += result.recordsFetched;
            pageToken = result.hasMore ? result.continuationToken : undefined;
            
            if (result.hasMore) {
                await sleep('200 milliseconds');
            }
        } while (pageToken);
        
        // Update sync state
        await activities.updateSyncState(entity, 'full', totalRecords);
        
        const finalCount = await activities.getRecordCount(entity);
        results.push({
            entity,
            recordCount: finalCount,
            duration: Date.now() - entityStart
        });
        
        console.log(`✅ ${entity}: ${finalCount} records`);
        await sleep('1 second');
    }
    
    const totalDuration = Date.now() - startTime;
    
    if (notify) {
        const summary = results.map(r => `• ${r.entity}: ${r.recordCount}`).join('\n');
        await activities.sendSlackNotification(
            '#sync-alerts',
            `✅ Full sync completed in ${Math.round(totalDuration / 1000)}s\n${summary}`
        );
    }
    
    return {
        success: !cancelled,
        results,
        totalDuration
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// INCREMENTAL SYNC WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

export async function incrementalSyncWorkflow() {
    const entities = ['customers', 'jobs', 'invoices', 'estimates'];
    const results = [];
    const startTime = Date.now();
    
    const fetchers = {
        customers: activities.fetchCustomers,
        jobs: activities.fetchJobs,
        invoices: activities.fetchInvoices,
        estimates: activities.fetchEstimates
    };
    
    for (const entity of entities) {
        const syncState = await activities.getSyncState(entity);
        const modifiedSince = syncState.lastIncrementalSync || syncState.lastFullSync;
        
        if (!modifiedSince) {
            console.log(`No previous sync for ${entity}, skipping`);
            continue;
        }
        
        let totalUpdated = 0;
        let pageToken = undefined;
        
        do {
            const fetcher = fetchers[entity];
            const result = await fetcher(modifiedSince, pageToken);
            totalUpdated += result.recordsFetched;
            pageToken = result.hasMore ? result.continuationToken : undefined;
            
            if (result.hasMore) {
                await sleep('200 milliseconds');
            }
        } while (pageToken);
        
        if (totalUpdated > 0) {
            await activities.updateSyncState(entity, 'incremental', totalUpdated);
            results.push({ entity, count: totalUpdated });
            console.log(`📥 ${entity}: ${totalUpdated} updated`);
        }
        
        await sleep('500 milliseconds');
    }
    
    return {
        success: true,
        results,
        duration: Date.now() - startTime
    };
}
