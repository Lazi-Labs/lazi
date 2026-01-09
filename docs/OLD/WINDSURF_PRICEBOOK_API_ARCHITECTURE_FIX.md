# LAZI Pricebook API - Complete Architecture Audit & Fix

## MISSION

The current pricebook API is querying `raw.*` tables directly instead of following the three-tier architecture (raw → master → crm). This needs to be fixed for ALL pricebook entities.

**Current (Wrong):**
```
Frontend → Backend → raw.st_pricebook_services (direct query)
```

**Correct:**
```
Frontend → Backend → master.* LEFT JOIN crm.pricebook_overrides
```

---

## PHASE 1: AUDIT CURRENT API ROUTES

### 1.1 Find all pricebook routes

```bash
cd /opt/docker/apps/lazi

echo "=== Backend Pricebook Routes ==="
grep -rn "router\.\(get\|post\|put\|delete\)" services/api/src/routes/pricebook*.js | head -50

echo ""
echo "=== Frontend API Routes ==="
find apps/web/app/api/pricebook -name "route.ts" -exec echo "--- {} ---" \; -exec head -30 {} \;
```

### 1.2 Identify which tables each route queries

```bash
echo "=== Tables Being Queried ==="
grep -rn "FROM raw\.\|FROM master\.\|FROM crm\." services/api/src/routes/pricebook*.js
```

### 1.3 Check if master tables exist

```bash
export SUPABASE_URL="postgresql://postgres:Catchpool2025@db.cvqduvqzkvqnjouuzldk.supabase.co:5432/postgres"

psql "$SUPABASE_URL" -c "
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'pricebook%' OR table_name LIKE 'st_pricebook%'
ORDER BY table_schema, table_name;
"
```

---

## PHASE 2: DEFINE CORRECT TABLE STRUCTURE

### 2.1 Required Tables

| Schema | Table | Purpose |
|--------|-------|---------|
| raw | st_pricebook_services | Exact ST API response |
| raw | st_pricebook_materials | Exact ST API response |
| raw | st_pricebook_equipment | Exact ST API response |
| raw | st_pricebook_categories | Exact ST API response |
| master | pricebook_services | Normalized, CRM-ready |
| master | pricebook_materials | Normalized, CRM-ready |
| master | pricebook_equipment | Normalized, CRM-ready |
| master | pricebook_categories | Normalized, CRM-ready |
| master | pricebook_subcategories | Flattened from JSONB |
| crm | pricebook_overrides | Local changes (all types) |

### 2.2 Create master.pricebook_services (if missing)

```sql
CREATE TABLE IF NOT EXISTS master.pricebook_services (
  id SERIAL PRIMARY KEY,
  st_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- Core fields
  name VARCHAR(500) NOT NULL,
  description TEXT,
  code VARCHAR(100),
  sku VARCHAR(100),
  active BOOLEAN DEFAULT true,
  
  -- Pricing
  price DECIMAL(12, 2),
  cost DECIMAL(12, 2),
  unit_of_measure VARCHAR(50),
  is_taxable BOOLEAN DEFAULT true,
  
  -- Categorization
  category_st_id BIGINT,
  category_name VARCHAR(500),
  service_type VARCHAR(100),
  
  -- Image (S3 after migration)
  image_url TEXT,
  image_path VARCHAR(500),
  image_migrated_at TIMESTAMPTZ,
  
  -- Business Units
  business_unit_ids JSONB DEFAULT '[]',
  
  -- Warranty
  warranty_duration INTEGER,
  warranty_duration_unit VARCHAR(50),
  
  -- Display
  sort_order INTEGER DEFAULT 0,
  is_visible_crm BOOLEAN DEFAULT true,
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_id, tenant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_master_services_tenant ON master.pricebook_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_master_services_category ON master.pricebook_services(category_st_id);
CREATE INDEX IF NOT EXISTS idx_master_services_active ON master.pricebook_services(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_master_services_search ON master.pricebook_services USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

### 2.3 Create master.pricebook_materials (if missing)

```sql
CREATE TABLE IF NOT EXISTS master.pricebook_materials (
  id SERIAL PRIMARY KEY,
  st_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- Core fields
  name VARCHAR(500) NOT NULL,
  description TEXT,
  code VARCHAR(100),
  sku VARCHAR(100),
  active BOOLEAN DEFAULT true,
  
  -- Pricing
  price DECIMAL(12, 2),
  cost DECIMAL(12, 2),
  unit_of_measure VARCHAR(50),
  is_taxable BOOLEAN DEFAULT true,
  
  -- Categorization
  category_st_id BIGINT,
  category_name VARCHAR(500),
  
  -- Vendor
  vendor_st_id BIGINT,
  vendor_name VARCHAR(500),
  manufacturer VARCHAR(500),
  
  -- Image
  image_url TEXT,
  image_path VARCHAR(500),
  image_migrated_at TIMESTAMPTZ,
  
  -- Business Units
  business_unit_ids JSONB DEFAULT '[]',
  
  -- Display
  sort_order INTEGER DEFAULT 0,
  is_visible_crm BOOLEAN DEFAULT true,
  
  -- Sync
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_id, tenant_id)
);
```

### 2.4 Create master.pricebook_equipment (if missing)

```sql
CREATE TABLE IF NOT EXISTS master.pricebook_equipment (
  id SERIAL PRIMARY KEY,
  st_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- Core fields
  name VARCHAR(500) NOT NULL,
  description TEXT,
  code VARCHAR(100),
  sku VARCHAR(100),
  active BOOLEAN DEFAULT true,
  
  -- Pricing
  price DECIMAL(12, 2),
  cost DECIMAL(12, 2),
  unit_of_measure VARCHAR(50),
  is_taxable BOOLEAN DEFAULT true,
  
  -- Categorization
  category_st_id BIGINT,
  category_name VARCHAR(500),
  equipment_type VARCHAR(100),
  
  -- Vendor
  vendor_st_id BIGINT,
  vendor_name VARCHAR(500),
  manufacturer VARCHAR(500),
  model VARCHAR(500),
  
  -- Image
  image_url TEXT,
  image_path VARCHAR(500),
  image_migrated_at TIMESTAMPTZ,
  
  -- Business Units
  business_unit_ids JSONB DEFAULT '[]',
  
  -- Display
  sort_order INTEGER DEFAULT 0,
  is_visible_crm BOOLEAN DEFAULT true,
  
  -- Sync
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_id, tenant_id)
);
```

### 2.5 Create unified crm.pricebook_overrides (if missing)

```sql
CREATE TABLE IF NOT EXISTS crm.pricebook_overrides (
  id SERIAL PRIMARY KEY,
  st_pricebook_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(50) NOT NULL,  -- 'service', 'material', 'equipment', 'category', 'subcategory'
  
  -- Override values (NULL = use original)
  override_name VARCHAR(500),
  override_description TEXT,
  override_code VARCHAR(100),
  override_price DECIMAL(12, 2),
  override_cost DECIMAL(12, 2),
  override_active BOOLEAN,
  override_category_st_id BIGINT,
  override_sort_order INTEGER,
  override_business_unit_ids JSONB,
  
  -- Custom image (uploaded by user)
  override_image_url TEXT,
  
  -- Internal CRM fields (not synced to ST)
  internal_notes TEXT,
  custom_tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  
  -- Sync status
  pending_sync BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_pricebook_id, tenant_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_crm_overrides_pending 
ON crm.pricebook_overrides(tenant_id, pending_sync) 
WHERE pending_sync = true;

CREATE INDEX IF NOT EXISTS idx_crm_overrides_type 
ON crm.pricebook_overrides(tenant_id, item_type);
```

---

## PHASE 3: POPULATE MASTER TABLES FROM RAW

### 3.1 Sync raw → master for services

```sql
-- Populate master.pricebook_services from raw
INSERT INTO master.pricebook_services (
  st_id, tenant_id, name, description, code, sku, active,
  price, cost, unit_of_measure, is_taxable,
  category_st_id, service_type,
  image_url, image_path, image_migrated_at,
  business_unit_ids, sort_order,
  last_synced_at, created_at, updated_at
)
SELECT 
  r.st_id,
  r.tenant_id::VARCHAR,
  r.name,
  r.description,
  r.code,
  r.sku,
  COALESCE(r.active, true),
  r.price,
  r.cost,
  r.unit_of_measure,
  COALESCE(r.is_taxable, true),
  (r.categories->0->>'id')::BIGINT,
  r.service_type,
  r.s3_image_url,
  r.assets->0->>'url',
  r.image_migrated_at,
  COALESCE(r.business_unit_ids, '[]'::JSONB),
  COALESCE(r.sort_order, 0),
  NOW(),
  COALESCE(r.created_at, NOW()),
  NOW()
FROM raw.st_pricebook_services r
ON CONFLICT (st_id, tenant_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  code = EXCLUDED.code,
  sku = EXCLUDED.sku,
  active = EXCLUDED.active,
  price = EXCLUDED.price,
  cost = EXCLUDED.cost,
  unit_of_measure = EXCLUDED.unit_of_measure,
  is_taxable = EXCLUDED.is_taxable,
  category_st_id = EXCLUDED.category_st_id,
  service_type = EXCLUDED.service_type,
  image_url = COALESCE(EXCLUDED.image_url, master.pricebook_services.image_url),
  image_path = EXCLUDED.image_path,
  business_unit_ids = EXCLUDED.business_unit_ids,
  sort_order = EXCLUDED.sort_order,
  last_synced_at = NOW(),
  updated_at = NOW();
```

### 3.2 Sync raw → master for materials

```sql
INSERT INTO master.pricebook_materials (
  st_id, tenant_id, name, description, code, sku, active,
  price, cost, unit_of_measure, is_taxable,
  category_st_id, vendor_st_id, vendor_name, manufacturer,
  image_url, image_path, image_migrated_at,
  business_unit_ids, sort_order,
  last_synced_at, created_at, updated_at
)
SELECT 
  r.st_id,
  r.tenant_id::VARCHAR,
  r.name,
  r.description,
  r.code,
  r.sku,
  COALESCE(r.active, true),
  r.price,
  r.cost,
  r.unit_of_measure,
  COALESCE(r.is_taxable, true),
  (r.categories->0->>'id')::BIGINT,
  r.vendor_id,
  r.vendor_name,
  r.manufacturer,
  r.s3_image_url,
  r.assets->0->>'url',
  r.image_migrated_at,
  COALESCE(r.business_unit_ids, '[]'::JSONB),
  COALESCE(r.sort_order, 0),
  NOW(),
  COALESCE(r.created_at, NOW()),
  NOW()
FROM raw.st_pricebook_materials r
ON CONFLICT (st_id, tenant_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  cost = EXCLUDED.cost,
  category_st_id = EXCLUDED.category_st_id,
  vendor_st_id = EXCLUDED.vendor_st_id,
  vendor_name = EXCLUDED.vendor_name,
  image_url = COALESCE(EXCLUDED.image_url, master.pricebook_materials.image_url),
  last_synced_at = NOW(),
  updated_at = NOW();
```

### 3.3 Sync raw → master for equipment

```sql
INSERT INTO master.pricebook_equipment (
  st_id, tenant_id, name, description, code, sku, active,
  price, cost, unit_of_measure, is_taxable,
  category_st_id, equipment_type,
  vendor_st_id, vendor_name, manufacturer, model,
  image_url, image_path, image_migrated_at,
  business_unit_ids, sort_order,
  last_synced_at, created_at, updated_at
)
SELECT 
  r.st_id,
  r.tenant_id::VARCHAR,
  r.name,
  r.description,
  r.code,
  r.sku,
  COALESCE(r.active, true),
  r.price,
  r.cost,
  r.unit_of_measure,
  COALESCE(r.is_taxable, true),
  (r.categories->0->>'id')::BIGINT,
  r.equipment_type,
  r.vendor_id,
  r.vendor_name,
  r.manufacturer,
  r.model,
  r.s3_image_url,
  r.assets->0->>'url',
  r.image_migrated_at,
  COALESCE(r.business_unit_ids, '[]'::JSONB),
  COALESCE(r.sort_order, 0),
  NOW(),
  COALESCE(r.created_at, NOW()),
  NOW()
FROM raw.st_pricebook_equipment r
ON CONFLICT (st_id, tenant_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = COALESCE(EXCLUDED.image_url, master.pricebook_equipment.image_url),
  last_synced_at = NOW(),
  updated_at = NOW();
```

---

## PHASE 4: REWRITE API ROUTES

### 4.1 Create unified pricebook routes file

Replace/update `services/api/src/routes/pricebook.routes.js`:

```javascript
/**
 * Pricebook API Routes
 * 
 * All routes query master.* tables with CRM overrides applied via COALESCE.
 * Never query raw.* tables directly in API responses.
 */

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// ═══════════════════════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /pricebook/services
 * List services with CRM overrides applied
 */
router.get('/services', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const {
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    search,
    categoryId,
    active,
    sortBy = 'name',
    sortOrder = 'asc',
  } = req.query;

  const limit = Math.min(parseInt(pageSize), MAX_PAGE_SIZE);
  const offset = (parseInt(page) - 1) * limit;

  try {
    // Build WHERE clause
    const conditions = ['s.tenant_id = $1'];
    const params = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions.push(`(
        s.name ILIKE $${paramIndex} OR 
        s.description ILIKE $${paramIndex} OR 
        s.code ILIKE $${paramIndex} OR
        s.sku ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`s.category_st_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }

    if (active !== undefined) {
      conditions.push(`COALESCE(o.override_active, s.active) = $${paramIndex}`);
      params.push(active === 'true');
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM master.pricebook_services s
      LEFT JOIN crm.pricebook_overrides o 
        ON o.st_pricebook_id = s.st_id 
        AND o.tenant_id = s.tenant_id
        AND o.item_type = 'service'
      WHERE ${whereClause}
    `;

    // Data query with COALESCE for overrides
    const dataQuery = `
      SELECT 
        s.st_id,
        s.tenant_id,
        COALESCE(o.override_name, s.name) AS name,
        COALESCE(o.override_description, s.description) AS description,
        COALESCE(o.override_code, s.code) AS code,
        s.sku,
        COALESCE(o.override_active, s.active) AS active,
        COALESCE(o.override_price, s.price) AS price,
        COALESCE(o.override_cost, s.cost) AS cost,
        s.unit_of_measure,
        s.is_taxable,
        COALESCE(o.override_category_st_id, s.category_st_id) AS category_st_id,
        s.category_name,
        s.service_type,
        COALESCE(o.override_image_url, s.image_url) AS image_url,
        COALESCE(o.override_business_unit_ids, s.business_unit_ids) AS business_unit_ids,
        s.warranty_duration,
        s.warranty_duration_unit,
        COALESCE(o.override_sort_order, s.sort_order) AS sort_order,
        s.is_visible_crm,
        o.id AS override_id,
        o.pending_sync,
        o.sync_error,
        o.internal_notes,
        o.custom_tags,
        s.last_synced_at,
        s.updated_at
      FROM master.pricebook_services s
      LEFT JOIN crm.pricebook_overrides o 
        ON o.st_pricebook_id = s.st_id 
        AND o.tenant_id = s.tenant_id
        AND o.item_type = 'service'
      WHERE ${whereClause}
      ORDER BY ${getSortColumn(sortBy)} ${sortOrder === 'desc' ? 'DESC' : 'ASC'}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, paramIndex - 1)),
      pool.query(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const services = dataResult.rows.map(formatServiceResponse);

    res.json({
      data: services,
      pagination: {
        page: parseInt(page),
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Services] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /pricebook/services/:stId
 * Get single service with overrides
 */
router.get('/services/:stId', async (req, res) => {
  const { stId } = req.params;
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;

  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        COALESCE(o.override_name, s.name) AS name,
        COALESCE(o.override_description, s.description) AS description,
        COALESCE(o.override_price, s.price) AS price,
        COALESCE(o.override_cost, s.cost) AS cost,
        COALESCE(o.override_active, s.active) AS active,
        COALESCE(o.override_image_url, s.image_url) AS image_url,
        o.pending_sync,
        o.internal_notes,
        o.custom_tags
      FROM master.pricebook_services s
      LEFT JOIN crm.pricebook_overrides o 
        ON o.st_pricebook_id = s.st_id 
        AND o.tenant_id = s.tenant_id
        AND o.item_type = 'service'
      WHERE s.st_id = $1 AND s.tenant_id = $2
    `, [stId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ data: formatServiceResponse(result.rows[0]) });
  } catch (error) {
    console.error('[Services] Get error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /pricebook/services/:stId/override
 * Create or update override for a service
 */
router.post('/services/:stId/override', async (req, res) => {
  const { stId } = req.params;
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const {
    name,
    description,
    code,
    price,
    cost,
    active,
    categoryId,
    sortOrder,
    businessUnitIds,
    imageUrl,
    internalNotes,
    customTags,
  } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO crm.pricebook_overrides (
        st_pricebook_id, tenant_id, item_type,
        override_name, override_description, override_code,
        override_price, override_cost, override_active,
        override_category_st_id, override_sort_order,
        override_business_unit_ids, override_image_url,
        internal_notes, custom_tags,
        pending_sync, updated_at
      ) VALUES ($1, $2, 'service', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, NOW())
      ON CONFLICT (st_pricebook_id, tenant_id, item_type) DO UPDATE SET
        override_name = COALESCE($3, crm.pricebook_overrides.override_name),
        override_description = COALESCE($4, crm.pricebook_overrides.override_description),
        override_code = COALESCE($5, crm.pricebook_overrides.override_code),
        override_price = COALESCE($6, crm.pricebook_overrides.override_price),
        override_cost = COALESCE($7, crm.pricebook_overrides.override_cost),
        override_active = COALESCE($8, crm.pricebook_overrides.override_active),
        override_category_st_id = COALESCE($9, crm.pricebook_overrides.override_category_st_id),
        override_sort_order = COALESCE($10, crm.pricebook_overrides.override_sort_order),
        override_business_unit_ids = COALESCE($11, crm.pricebook_overrides.override_business_unit_ids),
        override_image_url = COALESCE($12, crm.pricebook_overrides.override_image_url),
        internal_notes = COALESCE($13, crm.pricebook_overrides.internal_notes),
        custom_tags = COALESCE($14, crm.pricebook_overrides.custom_tags),
        pending_sync = true,
        updated_at = NOW()
      RETURNING *
    `, [
      stId, tenantId,
      name, description, code,
      price, cost, active,
      categoryId, sortOrder,
      businessUnitIds ? JSON.stringify(businessUnitIds) : null,
      imageUrl, internalNotes,
      customTags ? JSON.stringify(customTags) : null,
    ]);

    res.json({
      success: true,
      override: result.rows[0],
      message: 'Override saved. Changes are pending sync to ServiceTitan.',
    });
  } catch (error) {
    console.error('[Services] Override error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MATERIALS (Same pattern as services)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/materials', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE, search, categoryId, active } = req.query;

  const limit = Math.min(parseInt(pageSize), MAX_PAGE_SIZE);
  const offset = (parseInt(page) - 1) * limit;

  try {
    const conditions = ['m.tenant_id = $1'];
    const params = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions.push(`(m.name ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`m.category_st_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }

    if (active !== undefined) {
      conditions.push(`COALESCE(o.override_active, m.active) = $${paramIndex}`);
      params.push(active === 'true');
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countQuery = `
      SELECT COUNT(*) as total
      FROM master.pricebook_materials m
      LEFT JOIN crm.pricebook_overrides o ON o.st_pricebook_id = m.st_id AND o.item_type = 'material'
      WHERE ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        m.st_id,
        m.tenant_id,
        COALESCE(o.override_name, m.name) AS name,
        COALESCE(o.override_description, m.description) AS description,
        m.code,
        m.sku,
        COALESCE(o.override_active, m.active) AS active,
        COALESCE(o.override_price, m.price) AS price,
        COALESCE(o.override_cost, m.cost) AS cost,
        m.unit_of_measure,
        m.category_st_id,
        m.category_name,
        m.vendor_st_id,
        m.vendor_name,
        m.manufacturer,
        COALESCE(o.override_image_url, m.image_url) AS image_url,
        m.business_unit_ids,
        o.pending_sync,
        o.internal_notes
      FROM master.pricebook_materials m
      LEFT JOIN crm.pricebook_overrides o 
        ON o.st_pricebook_id = m.st_id 
        AND o.tenant_id = m.tenant_id
        AND o.item_type = 'material'
      WHERE ${whereClause}
      ORDER BY m.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, paramIndex - 1)),
      pool.query(dataQuery, params),
    ]);

    res.json({
      data: dataResult.rows.map(formatMaterialResponse),
      pagination: {
        page: parseInt(page),
        pageSize: limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
      },
    });
  } catch (error) {
    console.error('[Materials] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EQUIPMENT (Same pattern as services)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/equipment', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE, search, categoryId, active } = req.query;

  const limit = Math.min(parseInt(pageSize), MAX_PAGE_SIZE);
  const offset = (parseInt(page) - 1) * limit;

  try {
    const conditions = ['e.tenant_id = $1'];
    const params = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions.push(`(e.name ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countQuery = `
      SELECT COUNT(*) as total
      FROM master.pricebook_equipment e
      WHERE ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        e.st_id,
        e.tenant_id,
        COALESCE(o.override_name, e.name) AS name,
        COALESCE(o.override_description, e.description) AS description,
        e.code,
        e.sku,
        COALESCE(o.override_active, e.active) AS active,
        COALESCE(o.override_price, e.price) AS price,
        COALESCE(o.override_cost, e.cost) AS cost,
        e.unit_of_measure,
        e.category_st_id,
        e.category_name,
        e.equipment_type,
        e.vendor_st_id,
        e.vendor_name,
        e.manufacturer,
        e.model,
        COALESCE(o.override_image_url, e.image_url) AS image_url,
        e.business_unit_ids,
        o.pending_sync
      FROM master.pricebook_equipment e
      LEFT JOIN crm.pricebook_overrides o 
        ON o.st_pricebook_id = e.st_id 
        AND o.tenant_id = e.tenant_id
        AND o.item_type = 'equipment'
      WHERE ${whereClause}
      ORDER BY e.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, paramIndex - 1)),
      pool.query(dataQuery, params),
    ]);

    res.json({
      data: dataResult.rows.map(formatEquipmentResponse),
      pagination: {
        page: parseInt(page),
        pageSize: limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
      },
    });
  } catch (error) {
    console.error('[Equipment] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES (Already implemented in previous prompt)
// ═══════════════════════════════════════════════════════════════════════════

// See WINDSURF_CATEGORIES_ARCHITECTURE_AUDIT.md for category routes

// ═══════════════════════════════════════════════════════════════════════════
// PUSH TO SERVICETITAN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /pricebook/push
 * Push all pending overrides to ServiceTitan
 */
router.post('/push', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const { itemType } = req.query; // Optional filter: 'service', 'material', etc.

  try {
    const typeCondition = itemType ? `AND item_type = '${itemType}'` : '';
    
    const pending = await pool.query(`
      SELECT * FROM crm.pricebook_overrides
      WHERE tenant_id = $1 AND pending_sync = true ${typeCondition}
      ORDER BY item_type, st_pricebook_id
    `, [tenantId]);

    if (pending.rows.length === 0) {
      return res.json({ success: true, pushed: 0, message: 'No pending changes' });
    }

    const results = { success: [], failed: [] };

    for (const override of pending.rows) {
      try {
        // Build ST API payload
        const payload = buildServiceTitanPayload(override);
        
        // Call ST API based on item type
        await pushToServiceTitan(override.item_type, override.st_pricebook_id, payload, tenantId);

        // Clear override values after successful push
        await pool.query(`
          UPDATE crm.pricebook_overrides
          SET 
            pending_sync = false,
            override_name = NULL,
            override_description = NULL,
            override_code = NULL,
            override_price = NULL,
            override_cost = NULL,
            override_active = NULL,
            override_category_st_id = NULL,
            override_sort_order = NULL,
            override_business_unit_ids = NULL,
            sync_error = NULL,
            last_synced_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
        `, [override.id]);

        // Update master table
        await updateMasterAfterPush(override);

        results.success.push({
          stId: override.st_pricebook_id,
          type: override.item_type,
        });
      } catch (err) {
        console.error(`[Push] Failed ${override.item_type}/${override.st_pricebook_id}:`, err.message);
        
        await pool.query(`
          UPDATE crm.pricebook_overrides
          SET sync_error = $1, updated_at = NOW()
          WHERE id = $2
        `, [err.message, override.id]);

        results.failed.push({
          stId: override.st_pricebook_id,
          type: override.item_type,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      pushed: results.success.length,
      failed: results.failed.length,
      results,
    });
  } catch (error) {
    console.error('[Push] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /pricebook/pending
 * Get all pending overrides
 */
router.get('/pending', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;

  try {
    const result = await pool.query(`
      SELECT 
        o.*,
        CASE o.item_type
          WHEN 'service' THEN s.name
          WHEN 'material' THEN m.name
          WHEN 'equipment' THEN e.name
          WHEN 'category' THEN c.name
          ELSE 'Unknown'
        END AS original_name
      FROM crm.pricebook_overrides o
      LEFT JOIN master.pricebook_services s 
        ON o.st_pricebook_id = s.st_id AND o.item_type = 'service'
      LEFT JOIN master.pricebook_materials m 
        ON o.st_pricebook_id = m.st_id AND o.item_type = 'material'
      LEFT JOIN master.pricebook_equipment e 
        ON o.st_pricebook_id = e.st_id AND o.item_type = 'equipment'
      LEFT JOIN master.pricebook_categories c 
        ON o.st_pricebook_id = c.st_id AND o.item_type = 'category'
      WHERE o.tenant_id = $1 AND o.pending_sync = true
      ORDER BY o.updated_at DESC
    `, [tenantId]);

    // Group by type
    const grouped = {
      services: result.rows.filter(r => r.item_type === 'service'),
      materials: result.rows.filter(r => r.item_type === 'material'),
      equipment: result.rows.filter(r => r.item_type === 'equipment'),
      categories: result.rows.filter(r => r.item_type === 'category'),
      subcategories: result.rows.filter(r => r.item_type === 'subcategory'),
    };

    res.json({
      data: grouped,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[Pending] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getSortColumn(sortBy) {
  const columns = {
    name: 'COALESCE(o.override_name, s.name)',
    price: 'COALESCE(o.override_price, s.price)',
    sort_order: 'COALESCE(o.override_sort_order, s.sort_order)',
    updated_at: 's.updated_at',
  };
  return columns[sortBy] || columns.name;
}

function formatServiceResponse(row) {
  return {
    ...row,
    business_unit_ids: parseJsonSafe(row.business_unit_ids, []),
    custom_tags: parseJsonSafe(row.custom_tags, []),
    has_pending_changes: row.pending_sync === true,
  };
}

function formatMaterialResponse(row) {
  return {
    ...row,
    business_unit_ids: parseJsonSafe(row.business_unit_ids, []),
    has_pending_changes: row.pending_sync === true,
  };
}

function formatEquipmentResponse(row) {
  return {
    ...row,
    business_unit_ids: parseJsonSafe(row.business_unit_ids, []),
    has_pending_changes: row.pending_sync === true,
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

function buildServiceTitanPayload(override) {
  const payload = {};
  if (override.override_name) payload.name = override.override_name;
  if (override.override_description !== null) payload.description = override.override_description;
  if (override.override_code) payload.code = override.override_code;
  if (override.override_price !== null) payload.price = override.override_price;
  if (override.override_cost !== null) payload.cost = override.override_cost;
  if (override.override_active !== null) payload.active = override.override_active;
  if (override.override_category_st_id) payload.categoryId = override.override_category_st_id;
  if (override.override_sort_order !== null) payload.position = override.override_sort_order;
  if (override.override_business_unit_ids) {
    payload.businessUnitIds = parseJsonSafe(override.override_business_unit_ids, []);
  }
  return payload;
}

async function pushToServiceTitan(itemType, stId, payload, tenantId) {
  const st = require('../services/servicetitan');
  
  const endpoints = {
    service: () => st.updateService(stId, payload, tenantId),
    material: () => st.updateMaterial(stId, payload, tenantId),
    equipment: () => st.updateEquipment(stId, payload, tenantId),
    category: () => st.updateCategory(stId, payload, tenantId),
  };

  const handler = endpoints[itemType];
  if (!handler) {
    throw new Error(`Unknown item type: ${itemType}`);
  }

  return handler();
}

async function updateMasterAfterPush(override) {
  const tables = {
    service: 'master.pricebook_services',
    material: 'master.pricebook_materials',
    equipment: 'master.pricebook_equipment',
    category: 'master.pricebook_categories',
  };

  const tableName = tables[override.item_type];
  if (!tableName) return;

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (override.override_name) {
    updates.push(`name = $${paramIndex++}`);
    values.push(override.override_name);
  }
  if (override.override_price !== null) {
    updates.push(`price = $${paramIndex++}`);
    values.push(override.override_price);
  }
  if (override.override_active !== null) {
    updates.push(`active = $${paramIndex++}`);
    values.push(override.override_active);
  }
  if (override.override_sort_order !== null) {
    updates.push(`sort_order = $${paramIndex++}`);
    values.push(override.override_sort_order);
  }

  if (updates.length > 0) {
    updates.push(`updated_at = NOW()`);
    values.push(override.st_pricebook_id);
    values.push(override.tenant_id);

    await pool.query(`
      UPDATE ${tableName}
      SET ${updates.join(', ')}
      WHERE st_id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    `, values);
  }
}

module.exports = router;
```

---

## PHASE 5: UPDATE NEXT.JS PROXY ROUTES

### 5.1 Fix services proxy

Update `apps/web/app/api/pricebook/services/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://lazi-api:3001';
const TENANT_ID = process.env.SERVICE_TITAN_TENANT_ID || '3222348440';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  
  try {
    // Call backend API (which now queries master.* with overrides)
    const response = await fetch(
      `${API_URL}/pricebook/services${queryString ? `?${queryString}` : ''}`,
      {
        headers: {
          'x-tenant-id': TENANT_ID,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Services Proxy] Backend error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Services Proxy] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Handle override creation
  try {
    const body = await request.json();
    const { stId, ...changes } = body;

    const response = await fetch(
      `${API_URL}/pricebook/services/${stId}/override`,
      {
        method: 'POST',
        headers: {
          'x-tenant-id': TENANT_ID,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changes),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## PHASE 6: CREATE RAW → MASTER SYNC SCRIPT

Create `services/api/scripts/sync-raw-to-master.js`:

```javascript
#!/usr/bin/env node
/**
 * Sync Raw Tables to Master Tables
 * 
 * Populates master.pricebook_* tables from raw.st_pricebook_* tables.
 * Run this after initial ST sync or whenever raw data is updated.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TENANT_ID = process.env.SERVICE_TITAN_TENANT_ID || '3222348440';

async function syncServices() {
  console.log('Syncing services...');
  
  const result = await pool.query(`
    INSERT INTO master.pricebook_services (
      st_id, tenant_id, name, description, code, sku, active,
      price, cost, unit_of_measure, is_taxable,
      category_st_id, service_type,
      image_url, image_path, image_migrated_at,
      business_unit_ids, sort_order,
      last_synced_at
    )
    SELECT 
      r.st_id,
      r.tenant_id::VARCHAR,
      r.name,
      r.description,
      r.code,
      r.sku,
      COALESCE(r.active, true),
      r.price,
      r.cost,
      r.unit_of_measure,
      COALESCE(r.is_taxable, true),
      (r.categories->0->>'id')::BIGINT,
      r.service_type,
      r.s3_image_url,
      r.assets->0->>'url',
      r.image_migrated_at,
      COALESCE(r.business_unit_ids, '[]'::JSONB),
      COALESCE(r.sort_order, 0),
      NOW()
    FROM raw.st_pricebook_services r
    WHERE r.tenant_id = $1
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      code = EXCLUDED.code,
      active = EXCLUDED.active,
      price = EXCLUDED.price,
      cost = EXCLUDED.cost,
      category_st_id = EXCLUDED.category_st_id,
      image_url = COALESCE(EXCLUDED.image_url, master.pricebook_services.image_url),
      business_unit_ids = EXCLUDED.business_unit_ids,
      last_synced_at = NOW(),
      updated_at = NOW()
  `, [TENANT_ID]);

  console.log(`Services synced: ${result.rowCount} rows`);
}

async function syncMaterials() {
  console.log('Syncing materials...');
  
  const result = await pool.query(`
    INSERT INTO master.pricebook_materials (
      st_id, tenant_id, name, description, code, sku, active,
      price, cost, unit_of_measure, is_taxable,
      category_st_id, vendor_st_id, vendor_name, manufacturer,
      image_url, image_path, image_migrated_at,
      business_unit_ids, sort_order,
      last_synced_at
    )
    SELECT 
      r.st_id,
      r.tenant_id::VARCHAR,
      r.name,
      r.description,
      r.code,
      r.sku,
      COALESCE(r.active, true),
      r.price,
      r.cost,
      r.unit_of_measure,
      COALESCE(r.is_taxable, true),
      (r.categories->0->>'id')::BIGINT,
      r.vendor_id,
      r.vendor_name,
      r.manufacturer,
      r.s3_image_url,
      r.assets->0->>'url',
      r.image_migrated_at,
      COALESCE(r.business_unit_ids, '[]'::JSONB),
      COALESCE(r.sort_order, 0),
      NOW()
    FROM raw.st_pricebook_materials r
    WHERE r.tenant_id = $1
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      cost = EXCLUDED.cost,
      image_url = COALESCE(EXCLUDED.image_url, master.pricebook_materials.image_url),
      last_synced_at = NOW(),
      updated_at = NOW()
  `, [TENANT_ID]);

  console.log(`Materials synced: ${result.rowCount} rows`);
}

async function syncEquipment() {
  console.log('Syncing equipment...');
  
  const result = await pool.query(`
    INSERT INTO master.pricebook_equipment (
      st_id, tenant_id, name, description, code, sku, active,
      price, cost, unit_of_measure, is_taxable,
      category_st_id, equipment_type,
      vendor_st_id, vendor_name, manufacturer, model,
      image_url, image_path, image_migrated_at,
      business_unit_ids, sort_order,
      last_synced_at
    )
    SELECT 
      r.st_id,
      r.tenant_id::VARCHAR,
      r.name,
      r.description,
      r.code,
      r.sku,
      COALESCE(r.active, true),
      r.price,
      r.cost,
      r.unit_of_measure,
      COALESCE(r.is_taxable, true),
      (r.categories->0->>'id')::BIGINT,
      r.equipment_type,
      r.vendor_id,
      r.vendor_name,
      r.manufacturer,
      r.model,
      r.s3_image_url,
      r.assets->0->>'url',
      r.image_migrated_at,
      COALESCE(r.business_unit_ids, '[]'::JSONB),
      COALESCE(r.sort_order, 0),
      NOW()
    FROM raw.st_pricebook_equipment r
    WHERE r.tenant_id = $1
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      image_url = COALESCE(EXCLUDED.image_url, master.pricebook_equipment.image_url),
      last_synced_at = NOW(),
      updated_at = NOW()
  `, [TENANT_ID]);

  console.log(`Equipment synced: ${result.rowCount} rows`);
}

async function syncCategories() {
  console.log('Syncing categories...');
  
  const result = await pool.query(`
    INSERT INTO master.pricebook_categories (
      st_id, tenant_id, name, description, active,
      sort_order, parent_st_id, depth, category_type,
      image_url, image_path,
      business_unit_ids,
      last_synced_at
    )
    SELECT 
      r.st_id,
      r.tenant_id::VARCHAR,
      r.name,
      r.description,
      COALESCE(r.active, true),
      COALESCE(r.position, 0),
      r.parent_id,
      CASE WHEN r.parent_id IS NULL THEN 0 ELSE 1 END,
      r.category_type,
      r.s3_image_url,
      r.image,
      COALESCE(r.business_unit_ids, '[]'::JSONB),
      NOW()
    FROM raw.st_pricebook_categories r
    WHERE r.tenant_id = $1
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      active = EXCLUDED.active,
      sort_order = EXCLUDED.sort_order,
      parent_st_id = EXCLUDED.parent_st_id,
      category_type = EXCLUDED.category_type,
      image_url = COALESCE(EXCLUDED.image_url, master.pricebook_categories.image_url),
      business_unit_ids = EXCLUDED.business_unit_ids,
      last_synced_at = NOW(),
      updated_at = NOW()
  `, [TENANT_ID]);

  console.log(`Categories synced: ${result.rowCount} rows`);
}

async function main() {
  console.log('=== Syncing Raw → Master ===');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log('');

  try {
    await syncServices();
    await syncMaterials();
    await syncEquipment();
    await syncCategories();

    console.log('');
    console.log('=== Sync Complete ===');

    // Show summary
    const summary = await pool.query(`
      SELECT 'services' as type, COUNT(*) as count FROM master.pricebook_services WHERE tenant_id = $1
      UNION ALL
      SELECT 'materials', COUNT(*) FROM master.pricebook_materials WHERE tenant_id = $1
      UNION ALL
      SELECT 'equipment', COUNT(*) FROM master.pricebook_equipment WHERE tenant_id = $1
      UNION ALL
      SELECT 'categories', COUNT(*) FROM master.pricebook_categories WHERE tenant_id = $1
    `, [TENANT_ID]);

    console.log('\nMaster table counts:');
    console.table(summary.rows);

  } catch (error) {
    console.error('Sync error:', error);
    process.exit(1);
  }

  await pool.end();
}

main();
```

---

## PHASE 7: VERIFICATION

### 7.1 Verify master tables populated

```bash
psql "$SUPABASE_URL" -c "
SELECT 
  'services' as table_name,
  COUNT(*) as total,
  COUNT(image_url) as with_image
FROM master.pricebook_services WHERE tenant_id = '3222348440'
UNION ALL
SELECT 'materials', COUNT(*), COUNT(image_url) 
FROM master.pricebook_materials WHERE tenant_id = '3222348440'
UNION ALL
SELECT 'equipment', COUNT(*), COUNT(image_url)
FROM master.pricebook_equipment WHERE tenant_id = '3222348440'
UNION ALL
SELECT 'categories', COUNT(*), COUNT(image_url)
FROM master.pricebook_categories WHERE tenant_id = '3222348440';
"
```

### 7.2 Test API endpoints

```bash
# Test services endpoint
curl -s "http://localhost:3001/pricebook/services?pageSize=5" \
  -H "x-tenant-id: 3222348440" | jq '.data[0] | {name, price, image_url, has_pending_changes}'

# Test override
curl -X POST "http://localhost:3001/pricebook/services/12345/override" \
  -H "x-tenant-id: 3222348440" \
  -H "Content-Type: application/json" \
  -d '{"price": 99.99}' | jq '.'

# Test pending
curl -s "http://localhost:3001/pricebook/pending" \
  -H "x-tenant-id: 3222348440" | jq '.total'
```

### 7.3 Test frontend

1. Open https://lazilabs.com/dashboard/pricebook
2. Verify services load with images
3. Edit a service price
4. Verify "Pending" badge appears
5. Click "Push to ServiceTitan"
6. Verify changes sync

---

## FINAL CHECKLIST

### Database
- [ ] master.pricebook_services exists with correct columns
- [ ] master.pricebook_materials exists with correct columns
- [ ] master.pricebook_equipment exists with correct columns
- [ ] master.pricebook_categories exists with correct columns
- [ ] crm.pricebook_overrides exists with all item types
- [ ] Raw → Master sync script works

### Backend API
- [ ] GET /pricebook/services queries master with COALESCE
- [ ] GET /pricebook/materials queries master with COALESCE
- [ ] GET /pricebook/equipment queries master with COALESCE
- [ ] POST /pricebook/services/:stId/override works
- [ ] POST /pricebook/push sends to ST and clears overrides
- [ ] GET /pricebook/pending shows grouped changes

### Frontend
- [ ] Services page loads data
- [ ] Images display (S3 URLs)
- [ ] Edit creates override
- [ ] Pending badge shows
- [ ] Push syncs to ST
