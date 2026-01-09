# LAZI Pricebook Schema Parity - Complete ServiceTitan Alignment

## THE PRINCIPLE

**For bidirectional sync to work, every layer must be able to represent the FULL ServiceTitan schema.**

```
PULL: ServiceTitan → raw (full JSON) → master (all columns) → API → Frontend
PUSH: Frontend → API → CRM override → PATCH only changed fields → ServiceTitan
```

If ANY field is missing at ANY layer, the chain breaks.

---

## SERVICETITAN MATERIALS API REFERENCE

### Required Fields (ST always returns these, never null)

| ST Field | Type | Default | Master Column | CRM Override |
|----------|------|---------|---------------|--------------|
| `id` | int64 | (from ST) | `st_id` | `st_pricebook_id` |
| `code` | string | (required) | `code` | ❌ |
| `description` | string/html | `''` | `description` | `override_description` |
| `cost` | decimal | `0` | `cost` | `override_cost` |
| `price` | decimal | `0` | `price` | `override_price` |
| `memberPrice` | decimal | `0` | `member_price` | `override_member_price` |
| `addOnPrice` | decimal | `0` | `add_on_price` | `override_add_on_price` |
| `addOnMemberPrice` | decimal | `0` | `add_on_member_price` | `override_add_on_member_price` |
| `hours` | decimal | `0` | `hours` | `override_hours` |
| `bonus` | decimal | `0` | `bonus` | `override_bonus` |
| `commissionBonus` | decimal | `0` | `commission_bonus` | `override_commission_bonus` |
| `paysCommission` | boolean | `false` | `pays_commission` | `override_pays_commission` |
| `deductAsJobCost` | boolean | `false` | `deduct_as_job_cost` | `override_deduct_as_job_cost` |
| `isInventory` | boolean | `false` | `is_inventory` | `override_is_inventory` |
| `active` | boolean | `true` | `active` | `override_active` |
| `categories` | int64[] | `[]` | `categories` | ❌ |
| `assets` | array | `[]` | `assets` | ❌ |
| `isConfigurableMaterial` | boolean | `false` | `is_configurable_material` | ❌ |
| `chargeableByDefault` | boolean | `true` | `chargeable_by_default` | `override_chargeable_by_default` |
| `displayInAmount` | boolean | `false` | `display_in_amount` | ❌ |
| `isOtherDirectCost` | boolean | `false` | `is_other_direct_cost` | ❌ |
| `modifiedOn` | datetime | (auto) | `st_modified_on` | ❌ |
| `createdOn` | datetime | (auto) | `st_created_on` | ❌ |
| `createdById` | int64 | (auto) | `created_by_id` | ❌ |

### Nullable Fields (ST can return null)

| ST Field | Type | Master Column | CRM Override |
|----------|------|---------------|--------------|
| `displayName` | string | `display_name` | `override_name` |
| `unitOfMeasure` | string | `unit_of_measure` | `override_unit_of_measure` |
| `account` | string | `account` | ❌ |
| `costOfSaleAccount` | string | `cost_of_sale_account` | ❌ |
| `assetAccount` | string | `asset_account` | ❌ |
| `taxable` | boolean | `taxable` | `override_taxable` |
| `primaryVendor` | object | `primary_vendor` | `override_primary_vendor` |
| `otherVendors` | array | `other_vendors` | `override_other_vendors` |
| `businessUnitId` | int64 | `business_unit_id` | `override_business_unit_id` |
| `generalLedgerAccountId` | int64 | `general_ledger_account_id` | ❌ |
| `costTypeId` | int64 | `cost_type_id` | ❌ |
| `budgetCostCode` | string | `budget_cost_code` | ❌ |
| `budgetCostType` | string | `budget_cost_type` | ❌ |
| `defaultAssetUrl` | string | `default_asset_url` | ❌ |
| `source` | string | `source` | ❌ |
| `externalId` | string | `external_id` | ❌ |

### Key Insight: Partial Updates

**For PATCH/UPDATE: All fields are OPTIONAL.** You only need to send the fields you want to change.

**For POST/CREATE: Required fields must have values** (use defaults from table above).

---

## PHASE 1: AUDIT CURRENT SCHEMA vs SERVICETITAN

### 1.1 ServiceTitan Materials API - ALL Fields

These are ALL fields returned by ServiceTitan Pricebook Materials API:

```typescript
interface ServiceTitanMaterial {
  // IDENTITY
  id: number;                           // ST ID (required for updates)
  code: string;                         // SKU code
  
  // DISPLAY
  displayName: string | null;           // Display name
  description: string;                  // Description (HTML)
  
  // PRICING (ALL REQUIRED)
  cost: number;                         // Acquisition cost
  price: number;                        // Sell price
  memberPrice: number;                  // Member price
  addOnPrice: number;                   // Add-on price
  addOnMemberPrice: number;             // Add-on member price
  
  // LABOR & COMMISSION (ALL REQUIRED)
  hours: number;                        // Installation hours
  bonus: number;                        // Flat bonus
  commissionBonus: number;              // Commission %
  paysCommission: boolean;              // Pays commission?
  
  // FLAGS (ALL REQUIRED)
  active: boolean;
  taxable: boolean | null;
  deductAsJobCost: boolean;
  isInventory: boolean;
  isConfigurableMaterial: boolean;
  chargeableByDefault: boolean;
  displayInAmount: boolean;
  isOtherDirectCost: boolean;
  
  // CATEGORIZATION
  categories: number[];                 // Category IDs
  unitOfMeasure: string | null;
  
  // ACCOUNTING
  account: string | null;               // Income account
  costOfSaleAccount: string | null;     // COGS account
  assetAccount: string | null;          // Asset account
  generalLedgerAccountId: number | null;
  costTypeId: number | null;
  budgetCostCode: string | null;
  budgetCostType: string | null;
  
  // VENDORS
  primaryVendor: VendorInfo | null;
  otherVendors: VendorInfo[];
  
  // ASSETS
  assets: AssetInfo[];
  defaultAssetUrl: string | null;
  
  // BUSINESS
  businessUnitId: number | null;
  
  // EXTERNAL
  externalId: string | null;
  source: string | null;
  externalData: ExternalData[];
  variationsOrConfigurableMaterials: number[];
  
  // TIMESTAMPS
  createdOn: string;
  modifiedOn: string;
  createdById: number;
}
```

### 1.2 Check Current Master Schema

```bash
export DATABASE_URL="postgresql://postgres:Catchadmin%402025@db.cvqduvqzkvqnjouuzldk.supabase.co:6543/postgres"

echo "=== CURRENT MASTER.PRICEBOOK_MATERIALS SCHEMA ==="
psql "$DATABASE_URL" -c "
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'master' AND table_name = 'pricebook_materials'
ORDER BY ordinal_position;
"
```

### 1.3 Check Current CRM Overrides Schema

```bash
echo "=== CURRENT CRM.PRICEBOOK_OVERRIDES SCHEMA ==="
psql "$DATABASE_URL" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'crm' AND table_name = 'pricebook_overrides'
ORDER BY ordinal_position;
"
```

---

## PHASE 2: ADD MISSING COLUMNS

### 2.1 Master Table - Add ALL Missing Columns

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- MASTER.PRICEBOOK_MATERIALS - Complete Schema Alignment
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- REQUIRED FIELDS (ST always returns these, never null)
-- Based on ServiceTitan Pricebook Materials API v2 documentation
-- ═══════════════════════════════════════════════════════════════════════════

-- PRICING (ALL REQUIRED by ST - must have values, default 0)
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS cost DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS price DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS member_price DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS add_on_price DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS add_on_member_price DECIMAL(12,2) NOT NULL DEFAULT 0;

-- LABOR & COMMISSION (ALL REQUIRED by ST - must have values, default 0)
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS hours DECIMAL(8,2) NOT NULL DEFAULT 0;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS bonus DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS commission_bonus DECIMAL(8,2) NOT NULL DEFAULT 0;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS pays_commission BOOLEAN NOT NULL DEFAULT false;

-- FLAGS (ALL REQUIRED by ST - must have values)
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS deduct_as_job_cost BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS is_inventory BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS is_configurable_material BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS chargeable_by_default BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS display_in_amount BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS is_other_direct_cost BOOLEAN NOT NULL DEFAULT false;

-- CATEGORIES & ASSETS (REQUIRED by ST - arrays, default empty)
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS categories JSONB NOT NULL DEFAULT '[]';

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS assets JSONB NOT NULL DEFAULT '[]';

-- ACCOUNTING
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS account VARCHAR(255);

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS cost_of_sale_account VARCHAR(255);

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS asset_account VARCHAR(255);

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS general_ledger_account_id BIGINT;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS cost_type_id BIGINT;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS budget_cost_code VARCHAR(100);

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS budget_cost_type VARCHAR(100);

-- ═══════════════════════════════════════════════════════════════════════════
-- NULLABLE FIELDS (ST can return null for these)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(500);  -- nullable

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS taxable BOOLEAN;  -- nullable (no default)

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50);  -- nullable

-- VENDORS (nullable)
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS primary_vendor JSONB;  -- nullable

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS other_vendors JSONB DEFAULT '[]';  -- array, default empty

-- ASSETS
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS default_asset_url TEXT;  -- nullable

-- BUSINESS (nullable)
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS business_unit_id BIGINT;  -- nullable

-- EXTERNAL (nullable)
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);  -- nullable

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS source VARCHAR(255);  -- nullable

-- TIMESTAMPS
ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS st_created_on TIMESTAMPTZ;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS st_modified_on TIMESTAMPTZ;

ALTER TABLE master.pricebook_materials 
  ADD COLUMN IF NOT EXISTS created_by_id BIGINT;

-- Analyze table after changes
ANALYZE master.pricebook_materials;
```

### 2.2 CRM Overrides - Add Missing Override Columns

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- CRM.PRICEBOOK_OVERRIDES - Add Missing Override Columns
-- ═══════════════════════════════════════════════════════════════════════════

-- LABOR & COMMISSION
ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_hours DECIMAL(8,2);

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_commission_bonus DECIMAL(8,2);

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_bonus DECIMAL(12,2);

-- PRICING
ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_member_price DECIMAL(12,2);

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_add_on_price DECIMAL(12,2);

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_add_on_member_price DECIMAL(12,2);

-- FLAGS
ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_pays_commission BOOLEAN;

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_deduct_as_job_cost BOOLEAN;

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_is_inventory BOOLEAN;

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_chargeable_by_default BOOLEAN;

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_taxable BOOLEAN;

-- OTHER
ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_unit_of_measure VARCHAR(50);

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_primary_vendor JSONB;

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_other_vendors JSONB;

ALTER TABLE crm.pricebook_overrides 
  ADD COLUMN IF NOT EXISTS override_business_unit_id BIGINT;

-- Analyze table after changes
ANALYZE crm.pricebook_overrides;
```

---

## PHASE 3: SYNC RAW → MASTER WITH ALL FIELDS

### 3.1 Update the Sync Query

The sync from `raw.st_pricebook_materials` to `master.pricebook_materials` must extract ALL fields:

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- SYNC: RAW → MASTER (Extract ALL fields from full_data JSONB)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO master.pricebook_materials (
  st_id, tenant_id, code, display_name, name, description,
  -- Pricing
  cost, price, member_price, add_on_price, add_on_member_price,
  -- Labor & Commission
  hours, bonus, commission_bonus, pays_commission,
  -- Flags
  active, taxable, deduct_as_job_cost, is_inventory,
  is_configurable_material, chargeable_by_default, display_in_amount, is_other_direct_cost,
  -- Categorization
  categories, unit_of_measure,
  -- Accounting
  account, cost_of_sale_account, asset_account,
  general_ledger_account_id, cost_type_id, budget_cost_code, budget_cost_type,
  -- Vendors
  primary_vendor, other_vendors,
  -- Assets
  assets, default_asset_url, s3_image_url,
  -- Business
  business_unit_id,
  -- External
  external_id, source,
  -- Timestamps
  st_created_on, st_modified_on, created_by_id,
  last_synced_at
)
SELECT 
  st_id,
  tenant_id::text,
  code,
  display_name,
  COALESCE(display_name, code) as name,
  description,
  -- Pricing
  COALESCE(cost, 0),
  COALESCE(price, 0),
  COALESCE(member_price, 0),
  COALESCE(add_on_price, 0),
  COALESCE(add_on_member_price, 0),
  -- Labor & Commission
  COALESCE((full_data->>'hours')::decimal, 0),
  COALESCE(bonus, 0),
  COALESCE((full_data->>'commissionBonus')::decimal, 0),
  COALESCE((full_data->>'paysCommission')::boolean, false),
  -- Flags
  COALESCE(active, true),
  taxable,
  COALESCE((full_data->>'deductAsJobCost')::boolean, false),
  COALESCE((full_data->>'isInventory')::boolean, false),
  COALESCE((full_data->>'isConfigurableMaterial')::boolean, false),
  COALESCE((full_data->>'chargeableByDefault')::boolean, true),
  COALESCE((full_data->>'displayInAmount')::boolean, false),
  COALESCE((full_data->>'isOtherDirectCost')::boolean, false),
  -- Categorization
  categories,
  unit_of_measure,
  -- Accounting
  (full_data->>'account'),
  (full_data->>'costOfSaleAccount'),
  (full_data->>'assetAccount'),
  (full_data->>'generalLedgerAccountId')::bigint,
  (full_data->>'costTypeId')::bigint,
  (full_data->>'budgetCostCode'),
  (full_data->>'budgetCostType'),
  -- Vendors
  full_data->'primaryVendor',
  COALESCE(full_data->'otherVendors', '[]'::jsonb),
  -- Assets
  COALESCE(full_data->'assets', '[]'::jsonb),
  (full_data->>'defaultAssetUrl'),
  s3_image_url,
  -- Business
  (full_data->>'businessUnitId')::bigint,
  -- External
  (full_data->>'externalId'),
  (full_data->>'source'),
  -- Timestamps
  (full_data->>'createdOn')::timestamptz,
  (full_data->>'modifiedOn')::timestamptz,
  (full_data->>'createdById')::bigint,
  NOW()
FROM raw.st_pricebook_materials
WHERE tenant_id = 3222348440
ON CONFLICT (st_id, tenant_id) DO UPDATE SET
  code = EXCLUDED.code,
  display_name = EXCLUDED.display_name,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  cost = EXCLUDED.cost,
  price = EXCLUDED.price,
  member_price = EXCLUDED.member_price,
  add_on_price = EXCLUDED.add_on_price,
  add_on_member_price = EXCLUDED.add_on_member_price,
  hours = EXCLUDED.hours,
  bonus = EXCLUDED.bonus,
  commission_bonus = EXCLUDED.commission_bonus,
  pays_commission = EXCLUDED.pays_commission,
  active = EXCLUDED.active,
  taxable = EXCLUDED.taxable,
  deduct_as_job_cost = EXCLUDED.deduct_as_job_cost,
  is_inventory = EXCLUDED.is_inventory,
  is_configurable_material = EXCLUDED.is_configurable_material,
  chargeable_by_default = EXCLUDED.chargeable_by_default,
  display_in_amount = EXCLUDED.display_in_amount,
  is_other_direct_cost = EXCLUDED.is_other_direct_cost,
  categories = EXCLUDED.categories,
  unit_of_measure = EXCLUDED.unit_of_measure,
  account = EXCLUDED.account,
  cost_of_sale_account = EXCLUDED.cost_of_sale_account,
  asset_account = EXCLUDED.asset_account,
  general_ledger_account_id = EXCLUDED.general_ledger_account_id,
  cost_type_id = EXCLUDED.cost_type_id,
  budget_cost_code = EXCLUDED.budget_cost_code,
  budget_cost_type = EXCLUDED.budget_cost_type,
  primary_vendor = EXCLUDED.primary_vendor,
  other_vendors = EXCLUDED.other_vendors,
  assets = EXCLUDED.assets,
  default_asset_url = EXCLUDED.default_asset_url,
  business_unit_id = EXCLUDED.business_unit_id,
  external_id = EXCLUDED.external_id,
  source = EXCLUDED.source,
  st_created_on = EXCLUDED.st_created_on,
  st_modified_on = EXCLUDED.st_modified_on,
  created_by_id = EXCLUDED.created_by_id,
  last_synced_at = NOW();
```

---

## PHASE 4: UPDATE API RESPONSE

### 4.1 Update GET /api/pricebook/materials/:stId

The API must return ALL fields with COALESCE for overrides:

```javascript
router.get('/:stId', async (req, res) => {
  const { stId } = req.params;
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;

  try {
    const result = await pool.query(`
      SELECT 
        m.st_id,
        m.code,
        COALESCE(o.override_name, m.display_name, m.name) as display_name,
        COALESCE(o.override_description, m.description) as description,
        
        -- Pricing
        COALESCE(o.override_cost, m.cost) as cost,
        COALESCE(o.override_price, m.price) as price,
        COALESCE(o.override_member_price, m.member_price) as member_price,
        COALESCE(o.override_add_on_price, m.add_on_price) as add_on_price,
        COALESCE(o.override_add_on_member_price, m.add_on_member_price) as add_on_member_price,
        
        -- Labor & Commission
        COALESCE(o.override_hours, m.hours) as hours,
        COALESCE(o.override_bonus, m.bonus) as bonus,
        COALESCE(o.override_commission_bonus, m.commission_bonus) as commission_bonus,
        COALESCE(o.override_pays_commission, m.pays_commission) as pays_commission,
        
        -- Flags
        COALESCE(o.override_active, m.active) as active,
        COALESCE(o.override_taxable, m.taxable) as taxable,
        COALESCE(o.override_deduct_as_job_cost, m.deduct_as_job_cost) as deduct_as_job_cost,
        COALESCE(o.override_is_inventory, m.is_inventory) as is_inventory,
        m.is_configurable_material,
        COALESCE(o.override_chargeable_by_default, m.chargeable_by_default) as chargeable_by_default,
        m.display_in_amount,
        m.is_other_direct_cost,
        
        -- Categorization
        m.categories,
        COALESCE(o.override_unit_of_measure, m.unit_of_measure) as unit_of_measure,
        
        -- Accounting
        m.account,
        m.cost_of_sale_account,
        m.asset_account,
        m.general_ledger_account_id,
        m.cost_type_id,
        m.budget_cost_code,
        m.budget_cost_type,
        
        -- Vendors
        COALESCE(o.override_primary_vendor, m.primary_vendor) as primary_vendor,
        COALESCE(o.override_other_vendors, m.other_vendors) as other_vendors,
        
        -- Assets
        m.assets,
        m.default_asset_url,
        COALESCE(o.override_image_url, m.s3_image_url, m.default_asset_url) as image_url,
        
        -- Business
        COALESCE(o.override_business_unit_id, m.business_unit_id) as business_unit_id,
        
        -- External
        m.external_id,
        m.source,
        
        -- Timestamps
        m.st_created_on,
        m.st_modified_on,
        m.last_synced_at,
        
        -- CRM status
        o.pending_sync as has_pending_changes,
        o.sync_error,
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

    // Format response
    const material = result.rows[0];
    res.json({
      data: {
        id: material.st_id,
        stId: material.st_id,
        code: material.code,
        displayName: material.display_name,
        description: material.description,
        
        // Pricing
        cost: parseFloat(material.cost) || 0,
        price: parseFloat(material.price) || 0,
        memberPrice: parseFloat(material.member_price) || 0,
        addOnPrice: parseFloat(material.add_on_price) || 0,
        addOnMemberPrice: parseFloat(material.add_on_member_price) || 0,
        
        // Labor & Commission
        hours: parseFloat(material.hours) || 0,
        bonus: parseFloat(material.bonus) || 0,
        commissionBonus: parseFloat(material.commission_bonus) || 0,
        paysCommission: material.pays_commission || false,
        
        // Flags
        active: material.active !== false,
        taxable: material.taxable,
        deductAsJobCost: material.deduct_as_job_cost || false,
        isInventory: material.is_inventory || false,
        isConfigurableMaterial: material.is_configurable_material || false,
        chargeableByDefault: material.chargeable_by_default !== false,
        displayInAmount: material.display_in_amount || false,
        isOtherDirectCost: material.is_other_direct_cost || false,
        
        // Categorization
        categories: material.categories || [],
        unitOfMeasure: material.unit_of_measure,
        
        // Accounting
        account: material.account,
        costOfSaleAccount: material.cost_of_sale_account,
        assetAccount: material.asset_account,
        generalLedgerAccountId: material.general_ledger_account_id,
        costTypeId: material.cost_type_id,
        budgetCostCode: material.budget_cost_code,
        budgetCostType: material.budget_cost_type,
        
        // Vendors
        primaryVendor: material.primary_vendor,
        otherVendors: material.other_vendors || [],
        
        // Assets
        assets: material.assets || [],
        imageUrl: material.image_url,
        
        // Business
        businessUnitId: material.business_unit_id,
        
        // External
        externalId: material.external_id,
        source: material.source,
        
        // Timestamps
        createdOn: material.st_created_on,
        modifiedOn: material.st_modified_on,
        lastSyncedAt: material.last_synced_at,
        
        // CRM
        hasPendingChanges: material.has_pending_changes || false,
        syncError: material.sync_error,
        internalNotes: material.internal_notes,
      }
    });

  } catch (error) {
    console.error('[Materials] Get error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## PHASE 5: DUAL-FLOW PUSH LOGIC (UPDATE vs CREATE)

### 5.0 Critical: Two Different Flows

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTION                              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   EDIT EXISTING         │     │   CREATE NEW            │
│   (has st_id)           │     │   (no st_id)            │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ crm.pricebook_overrides │     │ crm.pricebook_new_      │
│ st_pricebook_id = 123   │     │ materials               │
│ override_price = 99.99  │     │ st_id = NULL            │
│ pending_sync = true     │     │ pushed_to_st = false    │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              │         PUSH BUTTON           │
              └───────────────┬───────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ PATCH /materials/{id}   │     │ POST /materials         │
│ { "price": 99.99 }      │     │ { all required fields } │
│ (partial update)        │     │ (full payload)          │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ Clear override          │     │ Get new st_id from ST   │
│ Update master table     │     │ Update local record     │
│                         │     │ Insert into master      │
└─────────────────────────┘     └─────────────────────────┘
```

### 5.1 Database Tables for Each Flow

| Table | Purpose | Has st_id? | When Used |
|-------|---------|------------|-----------|
| `master.pricebook_materials` | Materials synced FROM ServiceTitan | ✅ Always | Read/Display |
| `crm.pricebook_overrides` | Changes to EXISTING materials | ✅ References st_id | Edit existing |
| `crm.pricebook_new_materials` | NEW materials created in LAZI | ❌ Until pushed | Create new |

### 5.2 Create Table for NEW Materials

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: crm.pricebook_new_materials
-- Stores materials created in LAZI that don't exist in ServiceTitan yet
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm.pricebook_new_materials (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- REQUIRED FIELDS (must have values for ST POST)
  code VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
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
  chargeable_by_default BOOLEAN NOT NULL DEFAULT true,
  display_in_amount BOOLEAN NOT NULL DEFAULT false,
  is_other_direct_cost BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  categories JSONB NOT NULL DEFAULT '[]',
  
  -- NULLABLE FIELDS
  display_name VARCHAR(500),
  taxable BOOLEAN,
  unit_of_measure VARCHAR(50),
  account VARCHAR(255),
  cost_of_sale_account VARCHAR(255),
  asset_account VARCHAR(255),
  primary_vendor JSONB,
  other_vendors JSONB DEFAULT '[]',
  assets JSONB DEFAULT '[]',
  business_unit_id BIGINT,
  
  -- SYNC STATUS
  st_id BIGINT,                    -- NULL until pushed, then populated
  pushed_to_st BOOLEAN DEFAULT false,
  pushed_at TIMESTAMPTZ,
  push_error TEXT,
  
  -- TIMESTAMPS
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_new_materials_tenant 
ON crm.pricebook_new_materials(tenant_id);

CREATE INDEX IF NOT EXISTS idx_new_materials_pending 
ON crm.pricebook_new_materials(tenant_id, pushed_to_st) 
WHERE pushed_to_st = false;
```

### 5.3 Complete Push Route with Dual Flow

```javascript
/**
 * POST /api/pricebook/materials/push
 * Pushes pending materials to ServiceTitan
 * Handles BOTH new materials (POST) and modified materials (PATCH)
 */
router.post('/push', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const { materialIds } = req.body; // Optional: specific IDs to push
  
  const results = { created: [], updated: [], failed: [] };

  try {
    const token = await getServiceTitanToken(tenantId);

    // ═══════════════════════════════════════════════════════════════
    // PART 1: Push NEW materials (POST to ST)
    // Source: crm.pricebook_new_materials where pushed_to_st = false
    // ═══════════════════════════════════════════════════════════════
    
    const newMaterialsQuery = `
      SELECT * FROM crm.pricebook_new_materials
      WHERE tenant_id = $1 AND pushed_to_st = false
      ${materialIds ? 'AND id = ANY($2)' : ''}
      ORDER BY created_at
    `;
    const newMaterials = await pool.query(
      newMaterialsQuery, 
      materialIds ? [tenantId, materialIds] : [tenantId]
    );

    console.log(`[Push] Found ${newMaterials.rows.length} NEW materials to create`);

    for (const material of newMaterials.rows) {
      try {
        // Build FULL payload - ALL required fields must have values
        const payload = buildCreatePayload(material);
        
        console.log(`[Push] Creating material: ${material.code}`);

        // POST to ServiceTitan (CREATE NEW)
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
          const errorText = await response.text();
          throw new Error(`ST API ${response.status}: ${errorText}`);
        }

        const stMaterial = await response.json();
        console.log(`[Push] Created in ST with ID: ${stMaterial.id}`);

        // Update local record with the NEW st_id from ServiceTitan
        await pool.query(`
          UPDATE crm.pricebook_new_materials
          SET st_id = $1, 
              pushed_to_st = true, 
              pushed_at = NOW(),
              push_error = NULL
          WHERE id = $2
        `, [stMaterial.id, material.id]);

        // Insert into master table for future queries
        await insertIntoMaster(stMaterial, tenantId);

        results.created.push({ 
          localId: material.id, 
          stId: stMaterial.id, 
          code: material.code 
        });

      } catch (err) {
        console.error(`[Push] Failed to create ${material.code}:`, err.message);
        
        // Record the error
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

    // ═══════════════════════════════════════════════════════════════
    // PART 2: Push MODIFIED materials (PATCH to ST)
    // Source: crm.pricebook_overrides where pending_sync = true
    // ═══════════════════════════════════════════════════════════════
    
    const modifiedQuery = `
      SELECT 
        o.*,
        m.st_id,
        m.code
      FROM crm.pricebook_overrides o
      JOIN master.pricebook_materials m 
        ON o.st_pricebook_id = m.st_id AND o.tenant_id = m.tenant_id
      WHERE o.tenant_id = $1 
        AND o.item_type = 'material' 
        AND o.pending_sync = true
      ${materialIds ? 'AND o.st_pricebook_id = ANY($2)' : ''}
      ORDER BY o.updated_at
    `;
    const modifiedMaterials = await pool.query(
      modifiedQuery,
      materialIds ? [tenantId, materialIds] : [tenantId]
    );

    console.log(`[Push] Found ${modifiedMaterials.rows.length} MODIFIED materials to update`);

    for (const override of modifiedMaterials.rows) {
      try {
        // Build PARTIAL payload - only changed fields
        const payload = buildPartialUpdatePayload(override);
        
        // Skip if nothing to update
        if (Object.keys(payload).length === 0) {
          console.log(`[Push] No changes for ${override.code}, skipping`);
          continue;
        }

        console.log(`[Push] Updating material ${override.st_id}: ${override.code}`);
        console.log(`[Push] Payload:`, JSON.stringify(payload));

        // PATCH to ServiceTitan (UPDATE EXISTING)
        const response = await fetch(
          `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/materials/${override.st_id}`,
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
          const errorText = await response.text();
          throw new Error(`ST API ${response.status}: ${errorText}`);
        }

        console.log(`[Push] Updated successfully`);

        // Clear the override (changes are now in ST)
        await pool.query(`
          UPDATE crm.pricebook_overrides
          SET pending_sync = false,
              sync_error = NULL,
              last_synced_at = NOW(),
              -- Clear all override fields
              override_name = NULL,
              override_description = NULL,
              override_price = NULL,
              override_cost = NULL,
              override_active = NULL,
              override_member_price = NULL,
              override_add_on_price = NULL,
              override_add_on_member_price = NULL,
              override_hours = NULL,
              override_bonus = NULL,
              override_commission_bonus = NULL,
              override_pays_commission = NULL,
              override_deduct_as_job_cost = NULL,
              override_is_inventory = NULL,
              override_unit_of_measure = NULL,
              override_chargeable_by_default = NULL,
              override_taxable = NULL,
              override_primary_vendor = NULL,
              override_other_vendors = NULL
          WHERE id = $1
        `, [override.id]);

        // Update master table with new values
        await updateMasterFromOverride(override);

        results.updated.push({ 
          stId: override.st_id, 
          code: override.code 
        });

      } catch (err) {
        console.error(`[Push] Failed to update ${override.code}:`, err.message);
        
        // Record the error but don't clear pending_sync
        await pool.query(`
          UPDATE crm.pricebook_overrides
          SET sync_error = $1
          WHERE id = $2
        `, [err.message, override.id]);

        results.failed.push({ 
          stId: override.st_id, 
          code: override.code, 
          error: err.message 
        });
      }
    }

    // Return summary
    res.json({
      success: results.failed.length === 0,
      summary: {
        created: results.created.length,
        updated: results.updated.length,
        failed: results.failed.length,
      },
      results,
    });

  } catch (error) {
    console.error('[Push] Fatal error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 5.4 Helper: Build CREATE Payload (All Required Fields)

```javascript
/**
 * Build FULL payload for creating a new material in ST
 * All required fields must have values - use defaults if not set
 */
function buildCreatePayload(material) {
  return {
    // ═══════════════════════════════════════════════════════════════
    // REQUIRED FIELDS - Must always send, use defaults if null
    // ═══════════════════════════════════════════════════════════════
    code: material.code,
    description: material.description || '',
    cost: parseFloat(material.cost) || 0,
    price: parseFloat(material.price) || 0,
    memberPrice: parseFloat(material.member_price) || 0,
    addOnPrice: parseFloat(material.add_on_price) || 0,
    addOnMemberPrice: parseFloat(material.add_on_member_price) || 0,
    hours: parseFloat(material.hours) || 0,
    bonus: parseFloat(material.bonus) || 0,
    commissionBonus: parseFloat(material.commission_bonus) || 0,
    paysCommission: material.pays_commission ?? false,
    deductAsJobCost: material.deduct_as_job_cost ?? false,
    isInventory: material.is_inventory ?? false,
    isConfigurableMaterial: material.is_configurable_material ?? false,
    chargeableByDefault: material.chargeable_by_default ?? true,  // Default TRUE
    displayInAmount: material.display_in_amount ?? false,
    isOtherDirectCost: material.is_other_direct_cost ?? false,
    active: material.active ?? true,  // Default TRUE
    categories: parseJsonSafe(material.categories, []),
    
    // ═══════════════════════════════════════════════════════════════
    // OPTIONAL FIELDS - Only include if have values (not null)
    // ═══════════════════════════════════════════════════════════════
    ...(material.display_name && { displayName: material.display_name }),
    ...(material.taxable != null && { taxable: material.taxable }),
    ...(material.unit_of_measure && { unitOfMeasure: material.unit_of_measure }),
    ...(material.account && { account: material.account }),
    ...(material.cost_of_sale_account && { costOfSaleAccount: material.cost_of_sale_account }),
    ...(material.asset_account && { assetAccount: material.asset_account }),
    ...(material.primary_vendor && { primaryVendor: parseJsonSafe(material.primary_vendor, null) }),
    ...(material.other_vendors?.length && { otherVendors: parseJsonSafe(material.other_vendors, []) }),
    ...(material.business_unit_id && { businessUnitId: material.business_unit_id }),
  };
}
```

### 5.5 Helper: Build UPDATE Payload (Only Changed Fields)

```javascript
/**
 * Build PARTIAL payload for updating an existing material in ST
 * Only include fields that have override values (not null)
 */
function buildPartialUpdatePayload(override) {
  const payload = {};
  
  // Only add fields that have been overridden
  if (override.override_name != null) 
    payload.displayName = override.override_name;
  
  if (override.override_description != null) 
    payload.description = override.override_description;
  
  if (override.override_cost != null) 
    payload.cost = parseFloat(override.override_cost);
  
  if (override.override_price != null) 
    payload.price = parseFloat(override.override_price);
  
  if (override.override_member_price != null) 
    payload.memberPrice = parseFloat(override.override_member_price);
  
  if (override.override_add_on_price != null) 
    payload.addOnPrice = parseFloat(override.override_add_on_price);
  
  if (override.override_add_on_member_price != null) 
    payload.addOnMemberPrice = parseFloat(override.override_add_on_member_price);
  
  if (override.override_hours != null) 
    payload.hours = parseFloat(override.override_hours);
  
  if (override.override_bonus != null) 
    payload.bonus = parseFloat(override.override_bonus);
  
  if (override.override_commission_bonus != null) 
    payload.commissionBonus = parseFloat(override.override_commission_bonus);
  
  if (override.override_active != null) 
    payload.active = override.override_active;
  
  if (override.override_taxable != null) 
    payload.taxable = override.override_taxable;
  
  if (override.override_pays_commission != null) 
    payload.paysCommission = override.override_pays_commission;
  
  if (override.override_deduct_as_job_cost != null) 
    payload.deductAsJobCost = override.override_deduct_as_job_cost;
  
  if (override.override_is_inventory != null) 
    payload.isInventory = override.override_is_inventory;
  
  if (override.override_unit_of_measure != null) 
    payload.unitOfMeasure = override.override_unit_of_measure;
  
  if (override.override_chargeable_by_default != null) 
    payload.chargeableByDefault = override.override_chargeable_by_default;
  
  if (override.override_primary_vendor != null) 
    payload.primaryVendor = parseJsonSafe(override.override_primary_vendor, null);
  
  if (override.override_other_vendors != null) 
    payload.otherVendors = parseJsonSafe(override.override_other_vendors, []);
  
  return payload;
}
```

### 5.6 Helper: Insert New Material into Master

```javascript
/**
 * After creating a material in ST, insert it into master table
 */
async function insertIntoMaster(stMaterial, tenantId) {
  await pool.query(`
    INSERT INTO master.pricebook_materials (
      st_id, tenant_id, code, display_name, name, description,
      cost, price, member_price, add_on_price, add_on_member_price,
      hours, bonus, commission_bonus, pays_commission,
      active, taxable, deduct_as_job_cost, is_inventory,
      is_configurable_material, chargeable_by_default, display_in_amount, is_other_direct_cost,
      categories, unit_of_measure,
      account, cost_of_sale_account, asset_account,
      primary_vendor, other_vendors,
      business_unit_id,
      st_created_on, st_modified_on,
      last_synced_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18, $19,
      $20, $21, $22, $23,
      $24, $25,
      $26, $27, $28,
      $29, $30,
      $31,
      $32, $33,
      NOW()
    )
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      code = EXCLUDED.code,
      display_name = EXCLUDED.display_name,
      name = EXCLUDED.name,
      last_synced_at = NOW()
  `, [
    stMaterial.id,
    tenantId,
    stMaterial.code,
    stMaterial.displayName,
    stMaterial.displayName || stMaterial.code,
    stMaterial.description,
    stMaterial.cost,
    stMaterial.price,
    stMaterial.memberPrice,
    stMaterial.addOnPrice,
    stMaterial.addOnMemberPrice,
    stMaterial.hours,
    stMaterial.bonus,
    stMaterial.commissionBonus,
    stMaterial.paysCommission,
    stMaterial.active,
    stMaterial.taxable,
    stMaterial.deductAsJobCost,
    stMaterial.isInventory,
    stMaterial.isConfigurableMaterial,
    stMaterial.chargeableByDefault,
    stMaterial.displayInAmount,
    stMaterial.isOtherDirectCost,
    JSON.stringify(stMaterial.categories || []),
    stMaterial.unitOfMeasure,
    stMaterial.account,
    stMaterial.costOfSaleAccount,
    stMaterial.assetAccount,
    JSON.stringify(stMaterial.primaryVendor),
    JSON.stringify(stMaterial.otherVendors || []),
    stMaterial.businessUnitId,
    stMaterial.createdOn,
    stMaterial.modifiedOn,
  ]);
}
```

### 5.7 Helper: Update Master from Override

```javascript
/**
 * After pushing override to ST, update master table with new values
 */
async function updateMasterFromOverride(override) {
  const updates = [];
  const values = [];
  let idx = 1;

  if (override.override_name != null) {
    updates.push(`display_name = $${idx}`, `name = $${idx++}`);
    values.push(override.override_name);
  }
  if (override.override_description != null) {
    updates.push(`description = $${idx++}`);
    values.push(override.override_description);
  }
  if (override.override_price != null) {
    updates.push(`price = $${idx++}`);
    values.push(override.override_price);
  }
  if (override.override_cost != null) {
    updates.push(`cost = $${idx++}`);
    values.push(override.override_cost);
  }
  if (override.override_active != null) {
    updates.push(`active = $${idx++}`);
    values.push(override.override_active);
  }
  if (override.override_member_price != null) {
    updates.push(`member_price = $${idx++}`);
    values.push(override.override_member_price);
  }
  if (override.override_hours != null) {
    updates.push(`hours = $${idx++}`);
    values.push(override.override_hours);
  }
  if (override.override_primary_vendor != null) {
    updates.push(`primary_vendor = $${idx++}`);
    values.push(JSON.stringify(override.override_primary_vendor));
  }
  if (override.override_other_vendors != null) {
    updates.push(`other_vendors = $${idx++}`);
    values.push(JSON.stringify(override.override_other_vendors));
  }
  // ... add more fields as needed

  if (updates.length > 0) {
    updates.push(`last_synced_at = NOW()`);
    values.push(override.st_id, override.tenant_id);
    
    await pool.query(`
      UPDATE master.pricebook_materials
      SET ${updates.join(', ')}
      WHERE st_id = $${idx++} AND tenant_id = $${idx}
    `, values);
  }
}
```

### 5.8 Helper: Parse JSON Safely

```javascript
/**
 * Safely parse JSON, return default if invalid
 */
function parseJsonSafe(value, defaultValue) {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}
```

### 5.9 Get Pending Materials Endpoint

```javascript
/**
 * GET /api/pricebook/materials/pending
 * List all materials pending push to ServiceTitan
 */
router.get('/pending', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;

  try {
    const [newMaterials, modifiedMaterials] = await Promise.all([
      // NEW materials (not yet in ST)
      pool.query(`
        SELECT 
          id,
          code,
          display_name,
          price,
          cost,
          created_at,
          push_error,
          'new' as change_type
        FROM crm.pricebook_new_materials
        WHERE tenant_id = $1 AND pushed_to_st = false
        ORDER BY created_at DESC
      `, [tenantId]),

      // MODIFIED materials (changes pending)
      pool.query(`
        SELECT 
          o.st_pricebook_id as st_id,
          m.code,
          m.display_name,
          o.updated_at,
          o.sync_error as push_error,
          'modified' as change_type
        FROM crm.pricebook_overrides o
        JOIN master.pricebook_materials m 
          ON o.st_pricebook_id = m.st_id AND o.tenant_id = m.tenant_id
        WHERE o.tenant_id = $1 
          AND o.item_type = 'material' 
          AND o.pending_sync = true
        ORDER BY o.updated_at DESC
      `, [tenantId])
    ]);

    res.json({
      new: newMaterials.rows,
      modified: modifiedMaterials.rows,
      counts: {
        new: newMaterials.rows.length,
        modified: modifiedMaterials.rows.length,
        total: newMaterials.rows.length + modifiedMaterials.rows.length,
      }
    });

  } catch (error) {
    console.error('[Materials] Pending error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## PHASE 6: VERIFICATION

### 6.1 Verify Schema

```bash
export DATABASE_URL="postgresql://postgres:Catchadmin%402025@db.cvqduvqzkvqnjouuzldk.supabase.co:6543/postgres"

echo "=== MASTER COLUMNS COUNT ==="
psql "$DATABASE_URL" -c "
SELECT COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_schema = 'master' AND table_name = 'pricebook_materials';
"

echo ""
echo "=== VERIFY KEY COLUMNS EXIST ==="
psql "$DATABASE_URL" -c "
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'master' AND table_name = 'pricebook_materials'
AND column_name IN ('hours', 'commission_bonus', 'primary_vendor', 'other_vendors', 'account')
ORDER BY column_name;
"

echo ""
echo "=== SAMPLE MATERIAL WITH ALL FIELDS ==="
psql "$DATABASE_URL" -c "
SELECT 
  st_id, code, display_name, 
  cost, price, member_price, add_on_price,
  hours, bonus, commission_bonus,
  active, taxable, pays_commission,
  primary_vendor IS NOT NULL as has_primary_vendor,
  other_vendors IS NOT NULL as has_other_vendors
FROM master.pricebook_materials
WHERE st_id = 61931410;
"
```

### 6.2 Verify API Response

```bash
# Test that API returns all fields
curl -s "http://localhost:3001/api/pricebook/materials/61931410" \
  -H "x-tenant-id: 3222348440" | jq '{
    id: .data.id,
    code: .data.code,
    cost: .data.cost,
    price: .data.price,
    hours: .data.hours,
    commissionBonus: .data.commissionBonus,
    primaryVendor: (.data.primaryVendor != null),
    hasPendingChanges: .data.hasPendingChanges
  }'
```

---

## SUCCESS CRITERIA

| Check | Expected |
|-------|----------|
| Master has `hours` column | ✅ Yes |
| Master has `commission_bonus` column | ✅ Yes |
| Master has `primary_vendor` column | ✅ Yes |
| Master has `other_vendors` column | ✅ Yes |
| Sync extracts hours from full_data | ✅ Yes |
| Sync extracts commission_bonus from full_data | ✅ Yes |
| API returns hours | ✅ Number or 0 |
| API returns commissionBonus | ✅ Number or 0 |
| API returns primaryVendor | ✅ Object or null |
| Push builds complete ST payload | ✅ All required fields |

---

## THE PRINCIPLE RESTATED

```
Every field that ServiceTitan can return MUST be stored in master.
Every field that ServiceTitan accepts MUST be available for push.
No gaps allowed.
```

This ensures:
1. **PULL** brings in complete data
2. **Display** shows all information
3. **Edit** can modify any field
4. **PUSH** sends complete, valid payloads
