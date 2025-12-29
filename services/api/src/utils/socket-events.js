/**
 * Socket.io event emitter utility
 * Centralizes all real-time event emissions for pricebook sync
 */

let io = null;

/**
 * Initialize with Socket.io instance
 * @param {import('socket.io').Server} socketIo
 */
export function initSocketEvents(socketIo) {
  io = socketIo;
  console.log('[SOCKET] Event emitter initialized');
}

/**
 * Get the Socket.io instance
 * @returns {import('socket.io').Server|null}
 */
export function getIo() {
  return io;
}

/**
 * Emit event to specific tenant room
 * @param {string} tenantId
 * @param {string} event
 * @param {object} data
 */
export function emitToTenant(tenantId, event, data) {
  if (!io) {
    console.warn('[SOCKET] io not initialized, skipping emit');
    return;
  }

  io.to(`tenant:${tenantId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });

  console.log(`[SOCKET] Emitted ${event} to tenant:${tenantId}`);
}

/**
 * Emit to all connected clients
 * @param {string} event
 * @param {object} data
 */
export function emitToAll(event, data) {
  if (!io) return;

  io.emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// Specific Event Emitters
// ============================================================================

/**
 * Emit when categories are synced from ServiceTitan
 */
export function emitCategoriesSynced(tenantId, data) {
  emitToTenant(tenantId, 'pricebook:categories:synced', {
    count: data.count,
    type: data.type || 'all',
    incremental: data.incremental || false,
  });
}

/**
 * Emit when a category is updated
 */
export function emitCategoryUpdated(tenantId, data) {
  emitToTenant(tenantId, 'pricebook:categories:updated', {
    stId: data.stId,
    name: data.name,
    changes: data.changes,
  });
}

/**
 * Emit when categories are pushed to ServiceTitan
 */
export function emitCategoriesPushed(tenantId, data) {
  emitToTenant(tenantId, 'pricebook:categories:pushed', {
    count: data.count,
    success: data.success,
    failed: data.failed,
  });
}

/**
 * Emit when a subcategory is updated
 */
export function emitSubcategoryUpdated(tenantId, data) {
  emitToTenant(tenantId, 'pricebook:subcategories:updated', {
    stId: data.stId,
    parentStId: data.parentStId,
    name: data.name,
    changes: data.changes,
  });
}

/**
 * Emit when sync starts
 */
export function emitSyncStarted(tenantId, entity) {
  emitToTenant(tenantId, 'sync:started', {
    entity,
    message: `Syncing ${entity}...`,
  });
}

/**
 * Emit when sync completes successfully
 */
export function emitSyncCompleted(tenantId, data) {
  emitToTenant(tenantId, 'sync:completed', {
    entity: data.entity,
    fetched: data.fetched,
    duration: data.duration,
    message: `Synced ${data.fetched} ${data.entity}`,
  });
}

/**
 * Emit when sync fails
 */
export function emitSyncFailed(tenantId, data) {
  emitToTenant(tenantId, 'sync:failed', {
    entity: data.entity,
    error: data.error,
    message: `Failed to sync ${data.entity}: ${data.error}`,
  });
}
