/**
 * Pricebook Sync Scheduler
 * Runs automatic syncs every 15 minutes
 */

import cron from 'node-cron';

export function startSyncScheduler(syncFunctions) {
  console.log('[SCHEDULER] Starting pricebook sync scheduler');
  
  // Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[SCHEDULER] Running pricebook sync...');
    try {
      if (syncFunctions.syncMaterials) {
        await syncFunctions.syncMaterials();
      }
      console.log('[SCHEDULER] Pricebook sync completed');
    } catch (error) {
      console.error('[SCHEDULER] Pricebook sync failed:', error);
    }
  });
  
  console.log('[SCHEDULER] Scheduled: Pricebook sync every 15 minutes');
}
