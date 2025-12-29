/**
 * Pricebook Batch Sync Routes
 * Convenient endpoints to sync all pricebook entities at once
 */

import { Router } from 'express';
import { stRequest } from '../services/stClient.js';

const router = Router();

// Simple async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function getTenantId(req) {
  return req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
}

// ============================================================================
// POST /api/pricebook/sync/all
// Sync all pricebook entities (services, materials, equipment) in sequence
// ============================================================================

router.post(
  '/all',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const results = {
      services: { success: false },
      materials: { success: false },
      equipment: { success: false },
    };

    console.log(`[BATCH SYNC] Starting full pricebook sync for tenant ${tenantId}`);

    try {
      // 1. Sync Materials
      console.log('[BATCH SYNC] Step 1/3: Syncing materials from ServiceTitan...');
      try {
        const materialsResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/pricebook/materials/sync-from-st`, {
          method: 'POST',
          headers: { 'x-tenant-id': tenantId },
        });
        const materialsData = await materialsResponse.json();
        results.materials = materialsData;
        
        if (materialsData.success) {
          console.log(`[BATCH SYNC] Materials: ${materialsData.synced} synced to RAW`);
          
          // Sync to MASTER
          const materialsMasterResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/pricebook/materials/sync-to-master`, {
            method: 'POST',
            headers: { 'x-tenant-id': tenantId },
          });
          const materialsMasterData = await materialsMasterResponse.json();
          results.materials.masterSync = materialsMasterData;
          console.log(`[BATCH SYNC] Materials: ${materialsMasterData.synced} synced to MASTER`);
        }
      } catch (error) {
        console.error('[BATCH SYNC] Materials sync failed:', error.message);
        results.materials.error = error.message;
      }

      // 2. Sync Equipment
      console.log('[BATCH SYNC] Step 2/3: Syncing equipment from ServiceTitan...');
      try {
        const equipmentResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/pricebook/equipment/sync-from-st`, {
          method: 'POST',
          headers: { 'x-tenant-id': tenantId },
        });
        const equipmentData = await equipmentResponse.json();
        results.equipment = equipmentData;
        
        if (equipmentData.success) {
          console.log(`[BATCH SYNC] Equipment: ${equipmentData.synced} synced to RAW`);
          
          // Sync to MASTER
          const equipmentMasterResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/pricebook/equipment/sync-to-master`, {
            method: 'POST',
            headers: { 'x-tenant-id': tenantId },
          });
          const equipmentMasterData = await equipmentMasterResponse.json();
          results.equipment.masterSync = equipmentMasterData;
          console.log(`[BATCH SYNC] Equipment: ${equipmentMasterData.synced} synced to MASTER`);
        }
      } catch (error) {
        console.error('[BATCH SYNC] Equipment sync failed:', error.message);
        results.equipment.error = error.message;
      }

      // 3. Sync Services (RAW → MASTER only, assuming RAW is already populated)
      console.log('[BATCH SYNC] Step 3/3: Syncing services RAW → MASTER...');
      try {
        const servicesResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/pricebook/services/sync`, {
          method: 'POST',
          headers: { 'x-tenant-id': tenantId },
        });
        const servicesData = await servicesResponse.json();
        results.services = servicesData;
        console.log(`[BATCH SYNC] Services: ${servicesData.synced} synced to MASTER`);
      } catch (error) {
        console.error('[BATCH SYNC] Services sync failed:', error.message);
        results.services.error = error.message;
      }

      console.log('[BATCH SYNC] Completed full pricebook sync');

      res.json({
        success: true,
        message: 'Batch sync completed',
        results,
      });

    } catch (error) {
      console.error('[BATCH SYNC] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        results,
      });
    }
  })
);

// ============================================================================
// GET /api/pricebook/sync/status
// Get sync status for all pricebook entities
// ============================================================================

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);

    try {
      const [materialsStats, equipmentStats, servicesStats] = await Promise.all([
        fetch(`http://localhost:${process.env.PORT || 3000}/api/pricebook/materials/stats`, {
          headers: { 'x-tenant-id': tenantId },
        }).then(r => r.json()).catch(() => ({ error: 'Failed to fetch' })),
        
        fetch(`http://localhost:${process.env.PORT || 3000}/api/pricebook/equipment/stats`, {
          headers: { 'x-tenant-id': tenantId },
        }).then(r => r.json()).catch(() => ({ error: 'Failed to fetch' })),
        
        fetch(`http://localhost:${process.env.PORT || 3000}/api/pricebook/services/stats`, {
          headers: { 'x-tenant-id': tenantId },
        }).then(r => r.json()).catch(() => ({ error: 'Failed to fetch' })),
      ]);

      res.json({
        tenantId,
        materials: materialsStats,
        equipment: equipmentStats,
        services: servicesStats,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

export default router;
