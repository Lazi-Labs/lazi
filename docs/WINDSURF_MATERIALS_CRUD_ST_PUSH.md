# LAZI Materials - Complete CRUD & ServiceTitan Push Workflow

## MISSION

Build a complete materials management system that:
1. Displays all ServiceTitan material fields in the detail form
2. Allows creating new materials locally (stored in CRM)
3. Allows editing existing materials (creates CRM overrides)
4. Pushes new/modified materials to ServiceTitan when user clicks "PUSH"

---

## PHASE 1: SERVICETITAN API SCHEMA ANALYSIS

### 1.1 Required Fields for POST/PUT to ServiceTitan

Based on the ServiceTitan Pricebook Materials API, these fields are **REQUIRED**:

```typescript
interface ServiceTitanMaterialRequired {
  // REQUIRED - Must have values
  code: string;                    // Material code/SKU
  description: string;             // Description (HTML format supported)
  cost: number;                    // Acquisition cost
  active: boolean;                 // Is material active
  price: number;                   // Sell price
  memberPrice: number;             // Member discount price
  addOnPrice: number;              // Add-on sell price
  addOnMemberPrice: number;        // Add-on member price
  hours: number;                   // Installation hours
  bonus: number;                   // Flat rate bonus
  commissionBonus: number;         // Commission percentage
  paysCommission: boolean;         // Pays commission?
  deductAsJobCost: boolean;        // Deduct as job cost?
  isInventory: boolean;            // Part of inventory?
  categories: number[];            // Category IDs (at least one)
  isConfigurableMaterial: boolean; // Is configurable?
  chargeableByDefault: boolean;    // Chargeable by default?
  displayInAmount: boolean;        // Display in amount?
  isOtherDirectCost: boolean;      // Is other direct cost?
}
```

### 1.2 Optional Fields

```typescript
interface ServiceTitanMaterialOptional {
  displayName?: string;            // Display name (nullable)
  unitOfMeasure?: string;          // Unit of measure
  account?: string;                // Accounting account
  costOfSaleAccount?: string;      // Cost of sale account
  assetAccount?: string;           // Asset account
  taxable?: boolean;               // Is taxable
  businessUnitId?: number;         // Business unit
  generalLedgerAccountId?: number; // GL account ID
  costTypeId?: number;             // Cost type ID
  budgetCostCode?: string;         // Budget cost code
  budgetCostType?: string;         // Budget cost type
  externalId?: string;             // External ID
  source?: string;                 // Source catalog
  
  // Vendor information
  primaryVendor?: {
    vendorId: number;
    vendorName: string;
    vendorPart: string;
    cost: number;
    active: boolean;
    memo?: string;
  };
  otherVendors?: Array<{...}>;
  
  // Assets/Images
  assets?: Array<{
    alias: string;
    fileName: string;
    url: string;
    isDefault: boolean;
    type: string;
  }>;
}
```

### 1.3 Field Mapping: Current UI vs Required

| UI Field | ST API Field | Required? | Current Status |
|----------|--------------|-----------|----------------|
| CODE | code | ✅ Yes | ✅ Has |
| NAME | displayName | No | ✅ Has |
| DESC | description | ✅ Yes | ✅ Has |
| COST | cost | ✅ Yes | ✅ Has |
| SELL PRICE | price | ✅ Yes | ✅ Has (calculated) |
| ACTIVE | active | ✅ Yes | ✅ Has |
| Taxable | taxable | No | ✅ Has |
| Chargeable by Default | chargeableByDefault | ✅ Yes | ✅ Has |
| MARGIN | (calculated) | No | ✅ Has |
| CAT | categories | ✅ Yes | ✅ Has |
| Vendor section | primaryVendor/otherVendors | No | ✅ Has |
| Image | assets | No | ✅ Has |
| -- | memberPrice | ✅ Yes | ❌ **MISSING** |
| -- | addOnPrice | ✅ Yes | ❌ **MISSING** |
| -- | addOnMemberPrice | ✅ Yes | ❌ **MISSING** |
| -- | hours | ✅ Yes | ❌ **MISSING** |
| -- | bonus | ✅ Yes | ❌ **MISSING** |
| -- | commissionBonus | ✅ Yes | ❌ **MISSING** |
| -- | paysCommission | ✅ Yes | ❌ **MISSING** |
| -- | deductAsJobCost | ✅ Yes | ❌ **MISSING** |
| -- | isInventory | ✅ Yes | ❌ **MISSING** (TRACK STOCK?) |
| -- | isConfigurableMaterial | ✅ Yes | ❌ **MISSING** |
| -- | displayInAmount | ✅ Yes | ❌ **MISSING** |
| -- | isOtherDirectCost | ✅ Yes | ❌ **MISSING** |
| -- | unitOfMeasure | No | ❌ **MISSING** |
| -- | account | No | ⚠️ Partial (ACCOUNT...) |
| -- | businessUnitId | No | ❌ **MISSING** |

---

## PHASE 2: DATABASE SCHEMA UPDATES

### 2.1 Verify master.pricebook_materials has all columns

```bash
export DATABASE_URL="postgresql://postgres:Catchadmin%402025@db.cvqduvqzkvqnjouuzldk.supabase.co:6543/postgres"

psql "$DATABASE_URL" -c "\d master.pricebook_materials"
```

### 2.2 Add missing columns to master table

```sql
-- Add missing columns for ServiceTitan compatibility
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS member_price DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS add_on_price DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS add_on_member_price DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hours DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_bonus DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pays_commission BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deduct_as_job_cost BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_inventory BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_configurable_material BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_in_amount BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_other_direct_cost BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50),
  ADD COLUMN IF NOT EXISTS account VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cost_of_sale_account VARCHAR(100),
  ADD COLUMN IF NOT EXISTS asset_account VARCHAR(100),
  ADD COLUMN IF NOT EXISTS business_unit_id BIGINT,
  ADD COLUMN IF NOT EXISTS general_ledger_account_id BIGINT,
  ADD COLUMN IF NOT EXISTS cost_type_id BIGINT,
  ADD COLUMN IF NOT EXISTS budget_cost_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS budget_cost_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS chargeable_by_default BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- Add vendor columns if storing denormalized
ALTER TABLE master.pricebook_materials
  ADD COLUMN IF NOT EXISTS primary_vendor JSONB,
  ADD COLUMN IF NOT EXISTS other_vendors JSONB DEFAULT '[]';
```

### 2.3 Update CRM overrides table for materials

```sql
-- Ensure crm.pricebook_overrides can handle all material fields
ALTER TABLE crm.pricebook_overrides
  ADD COLUMN IF NOT EXISTS override_member_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS override_add_on_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS override_add_on_member_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS override_hours DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS override_bonus DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS override_commission_bonus DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS override_pays_commission BOOLEAN,
  ADD COLUMN IF NOT EXISTS override_deduct_as_job_cost BOOLEAN,
  ADD COLUMN IF NOT EXISTS override_is_inventory BOOLEAN,
  ADD COLUMN IF NOT EXISTS override_unit_of_measure VARCHAR(50),
  ADD COLUMN IF NOT EXISTS override_chargeable_by_default BOOLEAN,
  ADD COLUMN IF NOT EXISTS override_primary_vendor JSONB,
  ADD COLUMN IF NOT EXISTS override_other_vendors JSONB;
```

### 2.4 Create table for NEW materials (not yet in ST)

```sql
-- Table for materials created in CRM that don't exist in ST yet
CREATE TABLE IF NOT EXISTS crm.pricebook_new_materials (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- All ST required fields
  code VARCHAR(100) NOT NULL,
  display_name VARCHAR(500),
  description TEXT NOT NULL,
  cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  member_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  add_on_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  add_on_member_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  bonus DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission_bonus DECIMAL(8,2) NOT NULL DEFAULT 0,
  pays_commission BOOLEAN NOT NULL DEFAULT false,
  deduct_as_job_cost BOOLEAN NOT NULL DEFAULT false,
  is_inventory BOOLEAN NOT NULL DEFAULT false,
  is_configurable_material BOOLEAN NOT NULL DEFAULT false,
  display_in_amount BOOLEAN NOT NULL DEFAULT false,
  is_other_direct_cost BOOLEAN NOT NULL DEFAULT false,
  chargeable_by_default BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  taxable BOOLEAN DEFAULT true,
  
  -- Optional fields
  unit_of_measure VARCHAR(50),
  account VARCHAR(100),
  cost_of_sale_account VARCHAR(100),
  asset_account VARCHAR(100),
  business_unit_id BIGINT,
  general_ledger_account_id BIGINT,
  cost_type_id BIGINT,
  budget_cost_code VARCHAR(100),
  budget_cost_type VARCHAR(100),
  
  -- Categories (array of ST category IDs)
  categories JSONB NOT NULL DEFAULT '[]',
  
  -- Vendors
  primary_vendor JSONB,
  other_vendors JSONB DEFAULT '[]',
  
  -- Assets/Images
  assets JSONB DEFAULT '[]',
  
  -- Sync status
  st_id BIGINT,  -- Populated after push to ST
  pushed_to_st BOOLEAN DEFAULT false,
  pushed_at TIMESTAMPTZ,
  push_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_crm_new_materials_tenant 
ON crm.pricebook_new_materials(tenant_id);

CREATE INDEX IF NOT EXISTS idx_crm_new_materials_pending 
ON crm.pricebook_new_materials(tenant_id, pushed_to_st) 
WHERE pushed_to_st = false;
```

---

## PHASE 3: BACKEND API ROUTES

### 3.1 Create materials CRUD routes

Create/update `services/api/src/routes/pricebook-materials.js`:

```javascript
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// ═══════════════════════════════════════════════════════════════════════════
// GET / - List materials (already implemented)
// ═══════════════════════════════════════════════════════════════════════════

// (Keep existing implementation)

// ═══════════════════════════════════════════════════════════════════════════
// GET /:stId - Get single material with all fields
// ═══════════════════════════════════════════════════════════════════════════

router.get('/:stId', async (req, res) => {
  const { stId } = req.params;
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;

  try {
    // Check if it's a new material (negative ID or string prefix)
    const isNewMaterial = stId.startsWith('new_') || parseInt(stId) < 0;

    if (isNewMaterial) {
      // Fetch from crm.pricebook_new_materials
      const result = await pool.query(`
        SELECT * FROM crm.pricebook_new_materials
        WHERE tenant_id = $1 AND (id::text = $2 OR code = $2)
      `, [tenantId, stId.replace('new_', '')]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found' });
      }

      return res.json({ 
        data: formatMaterialResponse(result.rows[0], true),
        isNew: true
      });
    }

    // Fetch from master with CRM overrides
    const result = await pool.query(`
      SELECT 
        m.*,
        COALESCE(o.override_name, m.display_name, m.name) as name,
        COALESCE(o.override_description, m.description) as description,
        COALESCE(o.override_price, m.price) as price,
        COALESCE(o.override_cost, m.cost) as cost,
        COALESCE(o.override_active, m.active) as active,
        COALESCE(o.override_member_price, m.member_price) as member_price,
        COALESCE(o.override_add_on_price, m.add_on_price) as add_on_price,
        COALESCE(o.override_hours, m.hours) as hours,
        COALESCE(o.override_unit_of_measure, m.unit_of_measure) as unit_of_measure,
        COALESCE(o.override_chargeable_by_default, m.chargeable_by_default) as chargeable_by_default,
        COALESCE(o.override_primary_vendor, m.primary_vendor) as primary_vendor,
        COALESCE(o.override_other_vendors, m.other_vendors) as other_vendors,
        o.pending_sync,
        o.internal_notes
      FROM master.pricebook_materials m
      LEFT JOIN crm.pricebook_overrides o 
        ON o.st_pricebook_id = m.st_id 
        AND o.tenant_id = m.tenant_id
        AND o.item_type = 'material'
      WHERE m.st_id = $1 AND m.tenant_id = $2
    `, [stId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json({ 
      data: formatMaterialResponse(result.rows[0], false),
      isNew: false
    });

  } catch (error) {
    console.error('[Materials] Get error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST / - Create new material (stores in CRM, pending push to ST)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const material = req.body;

  // Validate required fields
  const requiredFields = ['code', 'description', 'cost', 'price'];
  const missing = requiredFields.filter(f => material[f] === undefined || material[f] === null);
  if (missing.length > 0) {
    return res.status(400).json({ 
      error: 'Missing required fields', 
      fields: missing 
    });
  }

  try {
    // Check if code already exists
    const existing = await pool.query(`
      SELECT 1 FROM master.pricebook_materials WHERE code = $1 AND tenant_id = $2
      UNION
      SELECT 1 FROM crm.pricebook_new_materials WHERE code = $1 AND tenant_id = $2
    `, [material.code, tenantId]);

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Material code already exists' });
    }

    // Insert new material
    const result = await pool.query(`
      INSERT INTO crm.pricebook_new_materials (
        tenant_id, code, display_name, description,
        cost, price, member_price, add_on_price, add_on_member_price,
        hours, bonus, commission_bonus,
        pays_commission, deduct_as_job_cost, is_inventory,
        is_configurable_material, display_in_amount, is_other_direct_cost,
        chargeable_by_default, active, taxable,
        unit_of_measure, account, business_unit_id,
        categories, primary_vendor, other_vendors, assets,
        created_by
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24,
        $25, $26, $27, $28,
        $29
      )
      RETURNING *
    `, [
      tenantId,
      material.code,
      material.displayName || material.name,
      material.description,
      material.cost || 0,
      material.price || 0,
      material.memberPrice || 0,
      material.addOnPrice || 0,
      material.addOnMemberPrice || 0,
      material.hours || 0,
      material.bonus || 0,
      material.commissionBonus || 0,
      material.paysCommission || false,
      material.deductAsJobCost || false,
      material.isInventory || false,
      material.isConfigurableMaterial || false,
      material.displayInAmount || false,
      material.isOtherDirectCost || false,
      material.chargeableByDefault !== false,
      material.active !== false,
      material.taxable !== false,
      material.unitOfMeasure,
      material.account,
      material.businessUnitId,
      JSON.stringify(material.categories || []),
      JSON.stringify(material.primaryVendor || null),
      JSON.stringify(material.otherVendors || []),
      JSON.stringify(material.assets || []),
      material.createdBy || 'system'
    ]);

    res.status(201).json({
      success: true,
      data: formatMaterialResponse(result.rows[0], true),
      message: 'Material created. Click PUSH to sync to ServiceTitan.',
      isNew: true
    });

  } catch (error) {
    console.error('[Materials] Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /:stId - Update existing material (creates CRM override)
// ═══════════════════════════════════════════════════════════════════════════

router.put('/:stId', async (req, res) => {
  const { stId } = req.params;
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const changes = req.body;

  try {
    const isNewMaterial = stId.startsWith('new_') || parseInt(stId) < 0;

    if (isNewMaterial) {
      // Update the new material directly
      const id = stId.replace('new_', '');
      const result = await pool.query(`
        UPDATE crm.pricebook_new_materials SET
          display_name = COALESCE($3, display_name),
          description = COALESCE($4, description),
          cost = COALESCE($5, cost),
          price = COALESCE($6, price),
          member_price = COALESCE($7, member_price),
          add_on_price = COALESCE($8, add_on_price),
          hours = COALESCE($9, hours),
          active = COALESCE($10, active),
          taxable = COALESCE($11, taxable),
          chargeable_by_default = COALESCE($12, chargeable_by_default),
          unit_of_measure = COALESCE($13, unit_of_measure),
          categories = COALESCE($14, categories),
          primary_vendor = COALESCE($15, primary_vendor),
          other_vendors = COALESCE($16, other_vendors),
          updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, [
        id, tenantId,
        changes.displayName || changes.name,
        changes.description,
        changes.cost,
        changes.price,
        changes.memberPrice,
        changes.addOnPrice,
        changes.hours,
        changes.active,
        changes.taxable,
        changes.chargeableByDefault,
        changes.unitOfMeasure,
        changes.categories ? JSON.stringify(changes.categories) : null,
        changes.primaryVendor ? JSON.stringify(changes.primaryVendor) : null,
        changes.otherVendors ? JSON.stringify(changes.otherVendors) : null
      ]);

      return res.json({
        success: true,
        data: formatMaterialResponse(result.rows[0], true),
        message: 'Material updated. Click PUSH to sync to ServiceTitan.'
      });
    }

    // Create/update override for existing material
    const result = await pool.query(`
      INSERT INTO crm.pricebook_overrides (
        st_pricebook_id, tenant_id, item_type,
        override_name, override_description, override_price, override_cost,
        override_active, override_member_price, override_add_on_price,
        override_hours, override_unit_of_measure, override_chargeable_by_default,
        override_primary_vendor, override_other_vendors,
        pending_sync, updated_at
      ) VALUES ($1, $2, 'material', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, NOW())
      ON CONFLICT (st_pricebook_id, tenant_id, item_type) DO UPDATE SET
        override_name = COALESCE($3, crm.pricebook_overrides.override_name),
        override_description = COALESCE($4, crm.pricebook_overrides.override_description),
        override_price = COALESCE($5, crm.pricebook_overrides.override_price),
        override_cost = COALESCE($6, crm.pricebook_overrides.override_cost),
        override_active = COALESCE($7, crm.pricebook_overrides.override_active),
        override_member_price = COALESCE($8, crm.pricebook_overrides.override_member_price),
        override_add_on_price = COALESCE($9, crm.pricebook_overrides.override_add_on_price),
        override_hours = COALESCE($10, crm.pricebook_overrides.override_hours),
        override_unit_of_measure = COALESCE($11, crm.pricebook_overrides.override_unit_of_measure),
        override_chargeable_by_default = COALESCE($12, crm.pricebook_overrides.override_chargeable_by_default),
        override_primary_vendor = COALESCE($13, crm.pricebook_overrides.override_primary_vendor),
        override_other_vendors = COALESCE($14, crm.pricebook_overrides.override_other_vendors),
        pending_sync = true,
        updated_at = NOW()
      RETURNING *
    `, [
      stId, tenantId,
      changes.displayName || changes.name,
      changes.description,
      changes.price,
      changes.cost,
      changes.active,
      changes.memberPrice,
      changes.addOnPrice,
      changes.hours,
      changes.unitOfMeasure,
      changes.chargeableByDefault,
      changes.primaryVendor ? JSON.stringify(changes.primaryVendor) : null,
      changes.otherVendors ? JSON.stringify(changes.otherVendors) : null
    ]);

    res.json({
      success: true,
      override: result.rows[0],
      message: 'Changes saved. Click PUSH to sync to ServiceTitan.'
    });

  } catch (error) {
    console.error('[Materials] Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /push - Push pending materials to ServiceTitan
// ═══════════════════════════════════════════════════════════════════════════

router.post('/push', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const { stIds } = req.body; // Optional: specific IDs to push

  try {
    const results = { created: [], updated: [], failed: [] };

    // 1. Push NEW materials (create in ST)
    const newMaterials = await pool.query(`
      SELECT * FROM crm.pricebook_new_materials
      WHERE tenant_id = $1 AND pushed_to_st = false
      ${stIds ? 'AND id = ANY($2)' : ''}
    `, stIds ? [tenantId, stIds] : [tenantId]);

    for (const material of newMaterials.rows) {
      try {
        // Build ST API payload
        const payload = buildServiceTitanPayload(material);
        
        // Call ST API to create material
        const stResponse = await createMaterialInServiceTitan(payload, tenantId);
        
        // Update local record with ST ID
        await pool.query(`
          UPDATE crm.pricebook_new_materials
          SET st_id = $1, pushed_to_st = true, pushed_at = NOW(), push_error = NULL
          WHERE id = $2
        `, [stResponse.id, material.id]);

        // Also insert into master table for future queries
        await insertIntoMaster(stResponse, tenantId);

        results.created.push({ 
          localId: material.id, 
          stId: stResponse.id, 
          code: material.code 
        });

      } catch (err) {
        await pool.query(`
          UPDATE crm.pricebook_new_materials
          SET push_error = $1
          WHERE id = $2
        `, [err.message, material.id]);

        results.failed.push({ 
          localId: material.id, 
          code: material.code, 
          error: err.message 
        });
      }
    }

    // 2. Push MODIFIED materials (update in ST)
    const overrides = await pool.query(`
      SELECT o.*, m.code, m.st_id
      FROM crm.pricebook_overrides o
      JOIN master.pricebook_materials m ON o.st_pricebook_id = m.st_id
      WHERE o.tenant_id = $1 AND o.item_type = 'material' AND o.pending_sync = true
      ${stIds ? 'AND o.st_pricebook_id = ANY($2)' : ''}
    `, stIds ? [tenantId, stIds] : [tenantId]);

    for (const override of overrides.rows) {
      try {
        // Build update payload (only changed fields)
        const payload = buildUpdatePayload(override);
        
        // Call ST API to update material
        await updateMaterialInServiceTitan(override.st_pricebook_id, payload, tenantId);
        
        // Clear override (changes now in ST)
        await pool.query(`
          UPDATE crm.pricebook_overrides
          SET pending_sync = false, 
              override_name = NULL, override_description = NULL,
              override_price = NULL, override_cost = NULL,
              override_active = NULL, override_member_price = NULL,
              last_synced_at = NOW()
          WHERE id = $1
        `, [override.id]);

        // Update master table
        await updateMasterFromOverride(override);

        results.updated.push({ 
          stId: override.st_pricebook_id, 
          code: override.code 
        });

      } catch (err) {
        await pool.query(`
          UPDATE crm.pricebook_overrides
          SET sync_error = $1
          WHERE id = $2
        `, [err.message, override.id]);

        results.failed.push({ 
          stId: override.st_pricebook_id, 
          code: override.code, 
          error: err.message 
        });
      }
    }

    res.json({
      success: results.failed.length === 0,
      results,
      message: `Created: ${results.created.length}, Updated: ${results.updated.length}, Failed: ${results.failed.length}`
    });

  } catch (error) {
    console.error('[Materials] Push error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /pending - List materials pending push
// ═══════════════════════════════════════════════════════════════════════════

router.get('/pending', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;

  try {
    const [newMaterials, modifiedMaterials] = await Promise.all([
      pool.query(`
        SELECT id, code, display_name, price, cost, created_at, push_error
        FROM crm.pricebook_new_materials
        WHERE tenant_id = $1 AND pushed_to_st = false
        ORDER BY created_at DESC
      `, [tenantId]),

      pool.query(`
        SELECT o.st_pricebook_id, m.code, m.display_name, o.updated_at, o.sync_error
        FROM crm.pricebook_overrides o
        JOIN master.pricebook_materials m ON o.st_pricebook_id = m.st_id
        WHERE o.tenant_id = $1 AND o.item_type = 'material' AND o.pending_sync = true
        ORDER BY o.updated_at DESC
      `, [tenantId])
    ]);

    res.json({
      new: newMaterials.rows,
      modified: modifiedMaterials.rows,
      total: newMaterials.rows.length + modifiedMaterials.rows.length
    });

  } catch (error) {
    console.error('[Materials] Pending error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function formatMaterialResponse(row, isNew = false) {
  return {
    id: isNew ? `new_${row.id}` : row.st_id,
    stId: row.st_id,
    code: row.code,
    name: row.display_name || row.name,
    displayName: row.display_name,
    description: row.description,
    cost: parseFloat(row.cost) || 0,
    price: parseFloat(row.price) || 0,
    memberPrice: parseFloat(row.member_price) || 0,
    addOnPrice: parseFloat(row.add_on_price) || 0,
    addOnMemberPrice: parseFloat(row.add_on_member_price) || 0,
    hours: parseFloat(row.hours) || 0,
    bonus: parseFloat(row.bonus) || 0,
    commissionBonus: parseFloat(row.commission_bonus) || 0,
    paysCommission: row.pays_commission || false,
    deductAsJobCost: row.deduct_as_job_cost || false,
    isInventory: row.is_inventory || false,
    isConfigurableMaterial: row.is_configurable_material || false,
    displayInAmount: row.display_in_amount || false,
    isOtherDirectCost: row.is_other_direct_cost || false,
    chargeableByDefault: row.chargeable_by_default !== false,
    active: row.active !== false,
    taxable: row.taxable,
    unitOfMeasure: row.unit_of_measure,
    account: row.account,
    businessUnitId: row.business_unit_id,
    categories: parseJsonSafe(row.categories, []),
    primaryVendor: parseJsonSafe(row.primary_vendor, null),
    otherVendors: parseJsonSafe(row.other_vendors, []),
    assets: parseJsonSafe(row.assets, []),
    imageUrl: row.s3_image_url || row.image_url,
    hasPendingChanges: row.pending_sync === true,
    isNew: isNew,
    pushedToSt: row.pushed_to_st,
    pushError: row.push_error,
    updatedAt: row.updated_at,
  };
}

function parseJsonSafe(value, defaultValue) {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

function buildServiceTitanPayload(material) {
  return {
    code: material.code,
    displayName: material.display_name,
    description: material.description || '',
    cost: parseFloat(material.cost) || 0,
    price: parseFloat(material.price) || 0,
    memberPrice: parseFloat(material.member_price) || 0,
    addOnPrice: parseFloat(material.add_on_price) || 0,
    addOnMemberPrice: parseFloat(material.add_on_member_price) || 0,
    hours: parseFloat(material.hours) || 0,
    bonus: parseFloat(material.bonus) || 0,
    commissionBonus: parseFloat(material.commission_bonus) || 0,
    paysCommission: material.pays_commission || false,
    deductAsJobCost: material.deduct_as_job_cost || false,
    isInventory: material.is_inventory || false,
    isConfigurableMaterial: material.is_configurable_material || false,
    displayInAmount: material.display_in_amount || false,
    isOtherDirectCost: material.is_other_direct_cost || false,
    chargeableByDefault: material.chargeable_by_default !== false,
    active: material.active !== false,
    taxable: material.taxable,
    unitOfMeasure: material.unit_of_measure,
    account: material.account,
    categories: parseJsonSafe(material.categories, []),
    primaryVendor: parseJsonSafe(material.primary_vendor, null),
    otherVendors: parseJsonSafe(material.other_vendors, []),
  };
}

function buildUpdatePayload(override) {
  const payload = {};
  if (override.override_name) payload.displayName = override.override_name;
  if (override.override_description) payload.description = override.override_description;
  if (override.override_price !== null) payload.price = override.override_price;
  if (override.override_cost !== null) payload.cost = override.override_cost;
  if (override.override_active !== null) payload.active = override.override_active;
  if (override.override_member_price !== null) payload.memberPrice = override.override_member_price;
  if (override.override_add_on_price !== null) payload.addOnPrice = override.override_add_on_price;
  if (override.override_hours !== null) payload.hours = override.override_hours;
  if (override.override_unit_of_measure) payload.unitOfMeasure = override.override_unit_of_measure;
  if (override.override_chargeable_by_default !== null) payload.chargeableByDefault = override.override_chargeable_by_default;
  return payload;
}

async function createMaterialInServiceTitan(payload, tenantId) {
  const st = require('../services/servicetitan');
  return st.createMaterial(payload, tenantId);
}

async function updateMaterialInServiceTitan(stId, payload, tenantId) {
  const st = require('../services/servicetitan');
  return st.updateMaterial(stId, payload, tenantId);
}

async function insertIntoMaster(stResponse, tenantId) {
  await pool.query(`
    INSERT INTO master.pricebook_materials (
      st_id, tenant_id, code, display_name, description,
      cost, price, member_price, active, taxable,
      chargeable_by_default, categories, last_synced_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      last_synced_at = NOW()
  `, [
    stResponse.id, tenantId, stResponse.code, stResponse.displayName,
    stResponse.description, stResponse.cost, stResponse.price,
    stResponse.memberPrice, stResponse.active, stResponse.taxable,
    stResponse.chargeableByDefault, JSON.stringify(stResponse.categories || [])
  ]);
}

async function updateMasterFromOverride(override) {
  const updates = [];
  const values = [];
  let idx = 1;

  if (override.override_name) {
    updates.push(`display_name = $${idx++}`);
    values.push(override.override_name);
  }
  if (override.override_price !== null) {
    updates.push(`price = $${idx++}`);
    values.push(override.override_price);
  }
  if (override.override_cost !== null) {
    updates.push(`cost = $${idx++}`);
    values.push(override.override_cost);
  }
  if (override.override_active !== null) {
    updates.push(`active = $${idx++}`);
    values.push(override.override_active);
  }

  if (updates.length > 0) {
    updates.push(`updated_at = NOW()`);
    values.push(override.st_pricebook_id, override.tenant_id);
    
    await pool.query(`
      UPDATE master.pricebook_materials
      SET ${updates.join(', ')}
      WHERE st_id = $${idx++} AND tenant_id = $${idx}
    `, values);
  }
}

module.exports = router;
```

### 3.2 Add ServiceTitan API methods

Add to `services/api/src/services/servicetitan.js`:

```javascript
/**
 * Create a new material in ServiceTitan
 */
async function createMaterial(payload, tenantId) {
  const token = await getAccessToken(tenantId);
  
  const response = await fetch(
    `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/materials`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ServiceTitan API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Update an existing material in ServiceTitan
 */
async function updateMaterial(stId, payload, tenantId) {
  const token = await getAccessToken(tenantId);
  
  const response = await fetch(
    `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/materials/${stId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ServiceTitan API error: ${response.status} - ${error}`);
  }

  return response.json();
}

module.exports = {
  // ... existing exports
  createMaterial,
  updateMaterial,
};
```

---

## PHASE 4: FRONTEND UPDATES

### 4.1 Update Material Detail Page

Update the materials detail page to include all required fields:

```typescript
// apps/web/app/(dashboard)/pricebook/materials/[stId]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Material {
  id: string;
  stId?: number;
  code: string;
  name: string;
  displayName: string;
  description: string;
  cost: number;
  price: number;
  memberPrice: number;
  addOnPrice: number;
  addOnMemberPrice: number;
  hours: number;
  bonus: number;
  commissionBonus: number;
  paysCommission: boolean;
  deductAsJobCost: boolean;
  isInventory: boolean;
  isConfigurableMaterial: boolean;
  displayInAmount: boolean;
  isOtherDirectCost: boolean;
  chargeableByDefault: boolean;
  active: boolean;
  taxable: boolean;
  unitOfMeasure: string;
  account: string;
  businessUnitId: number;
  categories: number[];
  primaryVendor: any;
  otherVendors: any[];
  assets: any[];
  imageUrl: string;
  hasPendingChanges: boolean;
  isNew: boolean;
}

export default function MaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stId = params.stId as string;
  const isNew = stId === 'new';

  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load material data
  useEffect(() => {
    if (isNew) {
      // Initialize empty material for creation
      setMaterial({
        id: 'new',
        code: '',
        name: '',
        displayName: '',
        description: '',
        cost: 0,
        price: 0,
        memberPrice: 0,
        addOnPrice: 0,
        addOnMemberPrice: 0,
        hours: 0,
        bonus: 0,
        commissionBonus: 0,
        paysCommission: false,
        deductAsJobCost: false,
        isInventory: false,
        isConfigurableMaterial: false,
        displayInAmount: false,
        isOtherDirectCost: false,
        chargeableByDefault: true,
        active: true,
        taxable: true,
        unitOfMeasure: '',
        account: '',
        businessUnitId: 0,
        categories: [],
        primaryVendor: null,
        otherVendors: [],
        assets: [],
        imageUrl: '',
        hasPendingChanges: false,
        isNew: true,
      });
      setLoading(false);
      return;
    }

    fetch(`/api/pricebook/materials/${stId}`)
      .then(res => res.json())
      .then(data => {
        setMaterial(data.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [stId, isNew]);

  // Handle field changes
  const handleChange = (field: keyof Material, value: any) => {
    setMaterial(prev => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
  };

  // Calculate sell price from cost and margin
  const calculatePrice = (cost: number, margin: number) => {
    if (margin >= 100) return cost;
    return cost / (1 - margin / 100);
  };

  // Save changes
  const handleSave = async () => {
    if (!material) return;
    setSaving(true);
    setError(null);

    try {
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew 
        ? '/api/pricebook/materials' 
        : `/api/pricebook/materials/${stId}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(material),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save');
      }

      setMaterial(result.data);
      setHasChanges(false);

      if (isNew && result.data.id) {
        // Redirect to the new material's page
        router.push(`/dashboard/pricebook/materials/${result.data.id}`);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Push to ServiceTitan
  const handlePush = async () => {
    if (!material) return;
    setPushing(true);
    setError(null);

    try {
      // Save first if there are changes
      if (hasChanges) {
        await handleSave();
      }

      const response = await fetch('/api/pricebook/materials/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stIds: material.isNew ? [material.id] : [material.stId] 
        }),
      });

      const result = await response.json();
      
      if (!response.ok || result.failed?.length > 0) {
        throw new Error(result.failed?.[0]?.error || 'Push failed');
      }

      // Reload material to get updated state
      window.location.reload();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setPushing(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error && !material) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!material) return <div className="p-4">Material not found</div>;

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard/pricebook/materials')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to List
            </button>
            <h1 className="text-2xl font-bold">
              {isNew ? 'New Material' : 'Materials'}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {material.hasPendingChanges && (
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                Pending Changes
              </span>
            )}
            {material.isNew && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                Not in ServiceTitan
              </span>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Basic Information */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">CODE *</label>
                <input
                  type="text"
                  value={material.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  disabled={!isNew}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">NAME</label>
                <input
                  type="text"
                  value={material.displayName || material.name}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">DESCRIPTION *</label>
                <textarea
                  value={material.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">UNIT OF MEASURE</label>
                <input
                  type="text"
                  value={material.unitOfMeasure || ''}
                  onChange={(e) => handleChange('unitOfMeasure', e.target.value)}
                  placeholder="e.g., Each, Box, Foot"
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">ACCOUNT</label>
                <input
                  type="text"
                  value={material.account || ''}
                  onChange={(e) => handleChange('account', e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Pricing</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">COST *</label>
                <input
                  type="number"
                  step="0.01"
                  value={material.cost}
                  onChange={(e) => handleChange('cost', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">SELL PRICE *</label>
                <input
                  type="number"
                  step="0.01"
                  value={material.price}
                  onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">MARGIN %</label>
                <input
                  type="number"
                  step="1"
                  value={material.cost > 0 ? Math.round((1 - material.cost / material.price) * 100) : 0}
                  onChange={(e) => {
                    const margin = parseFloat(e.target.value) || 0;
                    const newPrice = calculatePrice(material.cost, margin);
                    handleChange('price', Math.round(newPrice * 100) / 100);
                  }}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">MEMBER PRICE *</label>
                <input
                  type="number"
                  step="0.01"
                  value={material.memberPrice}
                  onChange={(e) => handleChange('memberPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">ADD-ON PRICE *</label>
                <input
                  type="number"
                  step="0.01"
                  value={material.addOnPrice}
                  onChange={(e) => handleChange('addOnPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">ADD-ON MEMBER PRICE *</label>
                <input
                  type="number"
                  step="0.01"
                  value={material.addOnMemberPrice}
                  onChange={(e) => handleChange('addOnMemberPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Labor & Commission */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Labor & Commission</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">HOURS *</label>
                <input
                  type="number"
                  step="0.25"
                  value={material.hours}
                  onChange={(e) => handleChange('hours', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">BONUS *</label>
                <input
                  type="number"
                  step="0.01"
                  value={material.bonus}
                  onChange={(e) => handleChange('bonus', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">COMMISSION BONUS % *</label>
                <input
                  type="number"
                  step="0.1"
                  value={material.commissionBonus}
                  onChange={(e) => handleChange('commissionBonus', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Toggles */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Settings</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'active', label: 'Active' },
                { key: 'taxable', label: 'Taxable' },
                { key: 'chargeableByDefault', label: 'Chargeable by Default' },
                { key: 'paysCommission', label: 'Pays Commission' },
                { key: 'deductAsJobCost', label: 'Deduct as Job Cost' },
                { key: 'isInventory', label: 'Track Inventory' },
                { key: 'isConfigurableMaterial', label: 'Configurable Material' },
                { key: 'displayInAmount', label: 'Display in Amount' },
                { key: 'isOtherDirectCost', label: 'Other Direct Cost' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={material[key as keyof Material] as boolean}
                    onChange={(e) => handleChange(key as keyof Material, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Categories */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Categories</h2>
            <div className="text-sm text-gray-500">
              {material.categories?.length > 0 
                ? `${material.categories.length} categories assigned`
                : 'No categories assigned'}
            </div>
            {/* TODO: Category picker component */}
          </section>

          {/* Vendors */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Vendors</h2>
            {material.primaryVendor ? (
              <div className="p-3 border rounded">
                <div className="font-medium">{material.primaryVendor.vendorName}</div>
                <div className="text-sm text-gray-500">
                  Part: {material.primaryVendor.vendorPart} | 
                  Cost: ${material.primaryVendor.cost}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No primary vendor</div>
            )}
            {/* TODO: Vendor management component */}
          </section>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l bg-gray-50 p-4">
        {/* Image */}
        <div className="mb-6">
          {material.imageUrl ? (
            <img 
              src={material.imageUrl} 
              alt={material.name}
              className="w-full h-48 object-cover rounded"
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          <button className="mt-2 w-full py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Add an Image
          </button>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            onClick={handlePush}
            disabled={pushing}
            className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {pushing ? 'Pushing...' : 'Push to ServiceTitan'}
          </button>
        </div>

        {/* Status */}
        {material.isNew && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            This material exists only in LAZI CRM. Click "Push to ServiceTitan" to create it in ST.
          </div>
        )}
        
        {material.hasPendingChanges && !material.isNew && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            You have unsaved changes. Click "Push to ServiceTitan" to sync.
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4.2 Update Frontend API Proxy

Add PUT and POST support to `apps/web/app/api/pricebook/materials/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://lazi-api:3001';
const TENANT_ID = process.env.SERVICE_TITAN_TENANT_ID || '3222348440';

export async function GET(request: NextRequest) {
  // ... existing implementation
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_URL}/api/pricebook/materials`, {
      method: 'POST',
      headers: {
        'x-tenant-id': TENANT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Add `apps/web/app/api/pricebook/materials/[stId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://lazi-api:3001';
const TENANT_ID = process.env.SERVICE_TITAN_TENANT_ID || '3222348440';

export async function GET(
  request: NextRequest,
  { params }: { params: { stId: string } }
) {
  try {
    const response = await fetch(
      `${API_URL}/api/pricebook/materials/${params.stId}`,
      {
        headers: { 'x-tenant-id': TENANT_ID },
        cache: 'no-store',
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { stId: string } }
) {
  try {
    const body = await request.json();
    
    const response = await fetch(
      `${API_URL}/api/pricebook/materials/${params.stId}`,
      {
        method: 'PUT',
        headers: {
          'x-tenant-id': TENANT_ID,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Add `apps/web/app/api/pricebook/materials/push/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://lazi-api:3001';
const TENANT_ID = process.env.SERVICE_TITAN_TENANT_ID || '3222348440';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_URL}/api/pricebook/materials/push`, {
      method: 'POST',
      headers: {
        'x-tenant-id': TENANT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## PHASE 5: TESTING

### 5.1 Test Database Schema

```bash
export DATABASE_URL="postgresql://postgres:Catchadmin%402025@db.cvqduvqzkvqnjouuzldk.supabase.co:6543/postgres"

# Verify crm.pricebook_new_materials exists
psql "$DATABASE_URL" -c "\d crm.pricebook_new_materials"

# Verify columns added to master.pricebook_materials
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_schema = 'master' AND table_name = 'pricebook_materials' ORDER BY ordinal_position"
```

### 5.2 Test API Endpoints

```bash
# Create new material
curl -X POST "http://localhost:3001/api/pricebook/materials" \
  -H "x-tenant-id: 3222348440" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST-001",
    "displayName": "Test Material",
    "description": "Test description",
    "cost": 10.00,
    "price": 25.00,
    "memberPrice": 20.00,
    "addOnPrice": 22.00,
    "addOnMemberPrice": 18.00,
    "hours": 0.5,
    "bonus": 0,
    "commissionBonus": 0,
    "paysCommission": false,
    "deductAsJobCost": false,
    "isInventory": true,
    "chargeableByDefault": true,
    "active": true,
    "categories": []
  }' | jq '.'

# Get pending materials
curl "http://localhost:3001/api/pricebook/materials/pending" \
  -H "x-tenant-id: 3222348440" | jq '.'

# Update existing material
curl -X PUT "http://localhost:3001/api/pricebook/materials/12345" \
  -H "x-tenant-id: 3222348440" \
  -H "Content-Type: application/json" \
  -d '{"price": 30.00}' | jq '.'

# Push to ServiceTitan
curl -X POST "http://localhost:3001/api/pricebook/materials/push" \
  -H "x-tenant-id: 3222348440" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'
```

### 5.3 Test Frontend

1. Navigate to `/dashboard/pricebook/materials`
2. Click "NEW" to create a new material
3. Fill in all required fields
4. Click "Save Changes"
5. Verify material appears in list with "Not in ServiceTitan" badge
6. Click "Push to ServiceTitan"
7. Verify material now has ST ID

---

## PHASE 6: SUCCESS CRITERIA

- [ ] All required ST API fields are in the form
- [ ] New materials can be created and saved locally
- [ ] Existing materials can be edited (creates CRM override)
- [ ] "Pending Changes" badge shows for modified materials
- [ ] "Not in ServiceTitan" badge shows for new materials
- [ ] PUSH button successfully creates materials in ST
- [ ] PUSH button successfully updates materials in ST
- [ ] After push, material has ST ID and is synced
- [ ] Validation prevents saving without required fields
