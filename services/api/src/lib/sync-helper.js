/**
 * Sync State Management Helper
 * Provides utilities for tracking sync progress and state
 */

import { v4 as uuid } from 'uuid';
import { query } from '../db/schema-connection.js';
import { SyncError } from './errors.js';
import { createLogger } from './logger.js';

const logger = createLogger('sync-helper');

/**
 * Start a sync operation
 * Records sync start in sync_state table
 */
export async function startSync(tenantId, entityType) {
  const syncId = uuid();
  
  try {
    await query(`
      INSERT INTO raw.sync_state (tenant_id, entity_type, sync_id, status, started_at)
      VALUES ($1, $2, $3, 'running', NOW())
      ON CONFLICT (tenant_id, entity_type) 
      DO UPDATE SET 
        sync_id = $3, 
        status = 'running', 
        started_at = NOW(),
        error_message = NULL,
        records_synced = 0
    `, [tenantId, entityType, syncId]);
    
    logger.info({ tenantId, entityType, syncId }, 'Sync started');
    return syncId;
  } catch (error) {
    logger.error({ error: error.message, tenantId, entityType }, 'Failed to start sync');
    throw new SyncError('Failed to start sync operation', { tenantId, entityType, error: error.message });
  }
}

/**
 * Update sync progress
 * Updates record count during sync
 */
export async function updateSyncProgress(tenantId, entityType, syncId, recordsSynced) {
  try {
    await query(`
      UPDATE raw.sync_state 
      SET records_synced = $1, last_updated_at = NOW()
      WHERE tenant_id = $2 AND entity_type = $3 AND sync_id = $4
    `, [recordsSynced, tenantId, entityType, syncId]);
  } catch (error) {
    logger.error({ error: error.message, tenantId, entityType, syncId }, 'Failed to update sync progress');
    // Don't throw - progress update failure shouldn't stop sync
  }
}

/**
 * Complete a sync operation successfully
 */
export async function completeSync(tenantId, entityType, syncId, recordsSynced, errorCount = 0) {
  try {
    await query(`
      UPDATE raw.sync_state 
      SET 
        status = 'completed', 
        completed_at = NOW(), 
        last_sync_at = NOW(),
        records_synced = $1,
        error_count = $2
      WHERE tenant_id = $3 AND entity_type = $4 AND sync_id = $5
    `, [recordsSynced, errorCount, tenantId, entityType, syncId]);
    
    logger.info({ tenantId, entityType, syncId, recordsSynced, errorCount }, 'Sync completed');
  } catch (error) {
    logger.error({ error: error.message, tenantId, entityType, syncId }, 'Failed to complete sync');
    throw new SyncError('Failed to complete sync operation', { tenantId, entityType, syncId, error: error.message });
  }
}

/**
 * Fail a sync operation
 */
export async function failSync(tenantId, entityType, syncId, errorMessage) {
  try {
    await query(`
      UPDATE raw.sync_state 
      SET 
        status = 'failed', 
        error_message = $1, 
        completed_at = NOW()
      WHERE tenant_id = $2 AND entity_type = $3 AND sync_id = $4
    `, [errorMessage, tenantId, entityType, syncId]);
    
    logger.error({ tenantId, entityType, syncId, errorMessage }, 'Sync failed');
  } catch (error) {
    logger.error({ error: error.message, tenantId, entityType, syncId }, 'Failed to record sync failure');
    // Don't throw - we're already in error state
  }
}

/**
 * Get sync status for an entity
 */
export async function getSyncStatus(tenantId, entityType) {
  try {
    const result = await query(`
      SELECT 
        entity_type,
        sync_id,
        status,
        started_at,
        completed_at,
        last_sync_at,
        records_synced,
        error_count,
        error_message,
        last_updated_at
      FROM raw.sync_state
      WHERE tenant_id = $1 AND entity_type = $2
    `, [tenantId, entityType]);
    
    return result.rows[0] || null;
  } catch (error) {
    logger.error({ error: error.message, tenantId, entityType }, 'Failed to get sync status');
    throw new SyncError('Failed to get sync status', { tenantId, entityType, error: error.message });
  }
}

/**
 * Get last sync timestamp for incremental sync
 */
export async function getLastSyncTimestamp(tenantId, entityType) {
  try {
    const result = await query(`
      SELECT last_sync_at 
      FROM raw.sync_state 
      WHERE tenant_id = $1 AND entity_type = $2 AND status = 'completed'
    `, [tenantId, entityType]);
    
    return result.rows[0]?.last_sync_at || null;
  } catch (error) {
    logger.error({ error: error.message, tenantId, entityType }, 'Failed to get last sync timestamp');
    return null; // Return null on error - will trigger full sync
  }
}

/**
 * Wrap a sync operation with state management
 * Usage: await withSyncTracking(tenantId, 'st_customers', async (syncId) => { ... })
 */
export async function withSyncTracking(tenantId, entityType, syncFn) {
  const syncId = await startSync(tenantId, entityType);
  
  try {
    const result = await syncFn(syncId);
    await completeSync(tenantId, entityType, syncId, result.synced, result.errors || 0);
    return result;
  } catch (error) {
    await failSync(tenantId, entityType, syncId, error.message);
    throw error;
  }
}

export default {
  startSync,
  updateSyncProgress,
  completeSync,
  failSync,
  getSyncStatus,
  getLastSyncTimestamp,
  withSyncTracking,
};
