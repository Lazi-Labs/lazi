/**
 * Outbound Sync Worker
 * 
 * Handles synchronization of data from Lazi to ServiceTitan
 */

import { Worker, Job } from 'bullmq';

interface OutboundSyncJob {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
}

export async function processOutboundSync(job: Job<OutboundSyncJob>) {
  const { entityType, entityId, action, payload } = job.data;
  
  console.log(`Processing outbound sync: ${action} ${entityType} ${entityId}`);
  
  // Implementation will depend on entity type
  switch (entityType) {
    case 'customer':
      // await syncCustomerToST(entityId, action, payload);
      break;
    case 'pricebook-category':
      // await syncPricebookCategoryToST(entityId, action, payload);
      break;
    default:
      console.warn(`Unknown entity type: ${entityType}`);
  }
  
  return { success: true, entityType, entityId, action };
}

export function createOutboundSyncWorker(connection: any) {
  return new Worker('outbound-sync', processOutboundSync, {
    connection,
    concurrency: 5,
  });
}
