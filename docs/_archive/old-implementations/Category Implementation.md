# LAZI Categories System - Complete Architecture Audit & Fix

## MISSION

1. **Verify Database Schema** - Confirm storage format matches ServiceTitan hierarchy
2. **Audit Sync Logic** - Ensure pull correctly mirrors ST hierarchy
3. **Implement CRM Override Workflow** - Real-time local changes → pending → push to ST
4. **Fix Frontend Connection** - Categories not displaying photos, business units, or hierarchy

---

## CURRENT KNOWN ISSUES

| Issue | Symptom |
|-------|---------|
| Images not displaying | Frontend not fetching from correct endpoint |
| Business units missing | Not being synced or not displayed |
| Hierarchy unclear | Subcategories in JSONB vs flat table confusion |
| CRM overrides | Workflow not fully implemented |

---

## PHASE 1: DATABASE SCHEMA AUDIT

### 1.1 Document current raw table structure

```bash
export SUPABASE_URL="postgresql://postgres:Catchpool2025@db.cvqduvqzkvqnjouuzldk.supabase.co:5432/postgres"

echo "=== RAW.ST_PRICEBOOK_CATEGORIES ==="
psql "$SUPABASE_URL" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'raw' AND table_name = 'st_pricebook_categories'
ORDER BY ordinal_position;
"

echo ""
echo "=== Sample Data ==="
psql "$SUPABASE_URL" -c "
SELECT st_id, name, position, parent_id, category_type, active,
       image IS NOT NULL as has_image,
       jsonb_array_length(COALESCE(subcategories, '[]'::jsonb)) as subcat_count,
       jsonb_array_length(COALESCE(business_unit_ids, '[]'::jsonb)) as bu_count
FROM raw.st_pricebook_categories
WHERE tenant_id = '3222348440'
ORDER BY position
LIMIT 15;
"
```

### 1.2 Document master table structure

```bash
echo "=== MASTER.PRICEBOOK_CATEGORIES ==="
psql "$SUPABASE_URL" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'master' AND table_name = 'pricebook_categories'
ORDER BY ordinal_position;
"

echo ""
echo "=== Sample Data ==="
psql "$SUPABASE_URL" -c "
SELECT st_id, name, sort_order, parent_st_id, depth, category_type, active,
       image_url IS NOT NULL as has_image
FROM master.pricebook_categories
WHERE tenant_id = '3222348440'
ORDER BY sort_order
LIMIT 15;
"
```

### 1.3 Document subcategories table structure

```bash
echo "=== MASTER.PRICEBOOK_SUBCATEGORIES ==="
psql "$SUPABASE_URL" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'master' AND table_name = 'pricebook_subcategories'
ORDER BY ordinal_position;
"

echo ""
echo "=== Sample Data (by depth) ==="
psql "$SUPABASE_URL" -c "
SELECT depth, COUNT(*) as count,
       COUNT(image_url) FILTER (WHERE image_url IS NOT NULL) as with_image
FROM master.pricebook_subcategories
WHERE tenant_id = '3222348440'
GROUP BY depth
ORDER BY depth;
"
```

### 1.4 Document CRM overrides table structure

```bash
echo "=== CRM.PRICEBOOK_OVERRIDES ==="
psql "$SUPABASE_URL" -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'crm' AND table_name = 'pricebook_overrides'
ORDER BY ordinal_position;
"

echo ""
echo "=== Pending Overrides ==="
psql "$SUPABASE_URL" -c "
SELECT st_pricebook_id, item_type, 
       override_position, override_parent_id, override_name,
       pending_sync
FROM crm.pricebook_overrides
WHERE tenant_id = '3222348440' AND pending_sync = true
LIMIT 10;
"
```

### 1.5 Check business_unit_ids storage

```bash
echo "=== Business Unit IDs in Raw Table ==="
psql "$SUPABASE_URL" -c "
SELECT st_id, name, business_unit_ids
FROM raw.st_pricebook_categories
WHERE tenant_id = '3222348440'
  AND business_unit_ids IS NOT NULL
  AND jsonb_array_length(business_unit_ids) > 0
LIMIT 5;
"

echo ""
echo "=== Business Units Reference Table ==="
psql "$SUPABASE_URL" -c "
SELECT st_id, name, active
FROM raw.st_business_units
WHERE tenant_id = '3222348440'
LIMIT 10;
" 2>/dev/null || echo "Table raw.st_business_units may not exist"
```

---

## PHASE 2: VERIFY SERVICETITAN HIERARCHY MATCHING

### 2.1 Compare raw vs ServiceTitan position

The `position` field in ServiceTitan determines sort order. Verify it's being stored correctly:

```bash
echo "=== Position Values in Raw ==="
psql "$SUPABASE_URL" -c "
SELECT st_id, name, position, parent_id
FROM raw.st_pricebook_categories
WHERE tenant_id = '3222348440' AND parent_id IS NULL
ORDER BY position
LIMIT 20;
"
```

### 2.2 Compare master.sort_order to raw.position

```bash
echo "=== Comparing Raw Position to Master Sort Order ==="
psql "$SUPABASE_URL" -c "
SELECT 
  r.st_id,
  r.name,
  r.position as raw_position,
  m.sort_order as master_sort_order,
  CASE WHEN r.position = m.sort_order THEN '✓' ELSE '✗ MISMATCH' END as status
FROM raw.st_pricebook_categories r
JOIN master.pricebook_categories m ON r.st_id = m.st_id
WHERE r.tenant_id = '3222348440' AND r.parent_id IS NULL
ORDER BY r.position
LIMIT 20;
"
```

### 2.3 Verify subcategory hierarchy

```bash
echo "=== Subcategory Parent Chain ==="
psql "$SUPABASE_URL" -c "
SELECT 
  st_id, 
  name, 
  parent_st_id, 
  root_category_st_id,
  depth,
  path
FROM master.pricebook_subcategories
WHERE tenant_id = '3222348440'
ORDER BY root_category_st_id, depth, sort_order
LIMIT 30;
"
```

---

## PHASE 3: DEFINE CORRECT SCHEMA

### 3.1 Required Schema: raw.st_pricebook_categories

This is the **source of truth** from ServiceTitan:

```sql
-- Verify/create raw table with all required columns
CREATE TABLE IF NOT EXISTS raw.st_pricebook_categories (
  id SERIAL PRIMARY KEY,
  st_id BIGINT NOT NULL,
  tenant_id BIGINT NOT NULL,
  
  -- Core fields from ST
  name VARCHAR(500),
  description TEXT,
  active BOOLEAN DEFAULT true,
  position INTEGER,                    -- ST sort order (CRITICAL)
  parent_id BIGINT,                    -- Parent category ST ID (NULL = top-level)
  category_type VARCHAR(50),           -- 'Service' or 'Material'
  
  -- Image
  image VARCHAR(500),                  -- ST image path
  image_data BYTEA,                    -- Downloaded binary (if using DB storage)
  image_content_type VARCHAR(100),
  image_downloaded_at TIMESTAMPTZ,
  
  -- Business Units
  business_unit_ids JSONB DEFAULT '[]', -- Array of BU IDs
  
  -- Nested Subcategories (from ST API response)
  subcategories JSONB DEFAULT '[]',    -- Nested up to 6 levels
  
  -- Full API response
  full_data JSONB,
  
  -- Sync tracking
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_id, tenant_id)
);
```

### 3.2 Required Schema: master.pricebook_categories

This is the **CRM-ready** normalized view:

```sql
-- Verify/create master table
CREATE TABLE IF NOT EXISTS master.pricebook_categories (
  id SERIAL PRIMARY KEY,
  st_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- Core fields
  name VARCHAR(500) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,        -- Copied from raw.position
  parent_st_id BIGINT,                 -- NULL = top-level category
  depth INTEGER DEFAULT 0,             -- 0 = top-level, 1+ = subcategory
  category_type VARCHAR(50),
  
  -- Image (S3 URL after migration)
  image_url TEXT,
  image_path VARCHAR(500),             -- Original ST path
  s3_image_key VARCHAR(500),
  image_migrated_at TIMESTAMPTZ,
  
  -- Business Units (denormalized for easy querying)
  business_unit_ids JSONB DEFAULT '[]',
  
  -- Computed/cached
  global_sort_order INTEGER,           -- For flat list sorting
  path TEXT,                           -- "Parent > Child > Grandchild"
  
  -- Visibility
  is_visible_crm BOOLEAN DEFAULT true,
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_id, tenant_id)
);
```

### 3.3 Required Schema: master.pricebook_subcategories

Flattened subcategories for easier querying:

```sql
-- Verify/create subcategories table
CREATE TABLE IF NOT EXISTS master.pricebook_subcategories (
  id SERIAL PRIMARY KEY,
  st_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  
  -- Hierarchy
  parent_st_id BIGINT NOT NULL,        -- Immediate parent
  root_category_st_id BIGINT NOT NULL, -- Top-level category
  depth INTEGER NOT NULL,              -- 1-6
  path TEXT,                           -- Full path string
  
  -- Core fields
  name VARCHAR(500) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  category_type VARCHAR(50),
  
  -- Image
  image_url TEXT,                      -- S3 URL
  image_path VARCHAR(500),             -- Original ST path
  s3_image_url TEXT,
  s3_image_key VARCHAR(500),
  image_migrated_at TIMESTAMPTZ,
  
  -- Business Units
  business_unit_ids JSONB DEFAULT '[]',
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_id, tenant_id)
);
```

### 3.4 Required Schema: crm.pricebook_overrides

Local changes before pushing to ST:

```sql
-- Verify/create CRM overrides table
CREATE TABLE IF NOT EXISTS crm.pricebook_overrides (
  id SERIAL PRIMARY KEY,
  st_pricebook_id BIGINT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(50) NOT NULL,      -- 'category', 'subcategory', 'service', etc.
  
  -- Override values (NULL = use original)
  override_name VARCHAR(500),
  override_description TEXT,
  override_position INTEGER,           -- Local sort order change
  override_parent_id BIGINT,           -- Move to different parent
  override_active BOOLEAN,
  override_business_unit_ids JSONB,
  
  -- Custom image (uploaded by user)
  override_image_url TEXT,
  override_image_data BYTEA,
  override_image_mime_type VARCHAR(100),
  delete_image BOOLEAN DEFAULT false,
  
  -- Internal CRM fields (not synced to ST)
  internal_notes TEXT,
  custom_tags JSONB DEFAULT '[]',
  
  -- Sync status
  pending_sync BOOLEAN DEFAULT false,  -- True = needs push to ST
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(st_pricebook_id, tenant_id, item_type)
);

-- Index for finding pending syncs
CREATE INDEX IF NOT EXISTS idx_crm_overrides_pending 
ON crm.pricebook_overrides(tenant_id, pending_sync) 
WHERE pending_sync = true;
```

### 3.5 Add missing columns

```bash
psql "$SUPABASE_URL" << 'EOF'
-- Add business_unit_ids to master if missing
ALTER TABLE master.pricebook_categories 
ADD COLUMN IF NOT EXISTS business_unit_ids JSONB DEFAULT '[]';

-- Add path column if missing
ALTER TABLE master.pricebook_categories 
ADD COLUMN IF NOT EXISTS path TEXT;

-- Add is_visible_crm if missing
ALTER TABLE master.pricebook_categories 
ADD COLUMN IF NOT EXISTS is_visible_crm BOOLEAN DEFAULT true;

-- Add override_business_unit_ids to CRM if missing
ALTER TABLE crm.pricebook_overrides 
ADD COLUMN IF NOT EXISTS override_business_unit_ids JSONB;

-- Add sync_error if missing
ALTER TABLE crm.pricebook_overrides 
ADD COLUMN IF NOT EXISTS sync_error TEXT;

SELECT 'Schema updates complete' as status;
EOF
```

---

## PHASE 4: FIX SYNC LOGIC (Pull from ServiceTitan)

### 4.1 Review current sync worker

```bash
# Find sync worker file
find /opt/docker/apps/lazi/services/api -name "*sync*" -type f | head -20

# Check category sync logic
cat /opt/docker/apps/lazi/services/api/src/workers/pricebook-category-sync.js 2>/dev/null | head -100
```

### 4.2 Correct sync logic

The sync worker should:

```javascript
/**
 * Category Sync Worker - Correct Implementation
 * 
 * Flow:
 * 1. Fetch from ST API
 * 2. Upsert to raw.st_pricebook_categories
 * 3. Transform and upsert to master.pricebook_categories
 * 4. Flatten subcategories to master.pricebook_subcategories
 * 5. Queue image downloads (BullMQ)
 */

async function syncCategoriesFromServiceTitan(tenantId, mode = 'incremental') {
  const st = getServiceTitanClient();
  
  // 1. Fetch from ST
  const categories = await st.fetchAllCategories({
    modifiedOnOrAfter: mode === 'incremental' ? getLastSyncTime() : null,
  });
  
  console.log(`[Sync] Fetched ${categories.length} categories from ST`);
  
  for (const category of categories) {
    // 2. Upsert to RAW table (source of truth)
    await upsertToRaw(category, tenantId);
    
    // 3. Transform and upsert to MASTER table
    await upsertToMaster(category, tenantId);
    
    // 4. Flatten subcategories
    if (category.subcategories?.length > 0) {
      await flattenSubcategories(
        category.subcategories,
        category.id,      // parentStId
        category.id,      // rootCategoryStId
        tenantId,
        1,                // depth
        category.name     // path
      );
    }
    
    // 5. Queue image download if needed
    if (category.image) {
      await queueImageDownload({
        stId: category.id,
        imagePath: typeof category.image === 'string' ? category.image : category.image.url,
        itemType: 'category',
        tenantId,
      });
    }
  }
}

async function upsertToRaw(category, tenantId) {
  await pool.query(`
    INSERT INTO raw.st_pricebook_categories (
      st_id, tenant_id, name, description, active,
      position, parent_id, category_type, image,
      business_unit_ids, subcategories, full_data,
      fetched_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      active = EXCLUDED.active,
      position = EXCLUDED.position,              -- CRITICAL: Update position
      parent_id = EXCLUDED.parent_id,
      category_type = EXCLUDED.category_type,
      image = EXCLUDED.image,
      business_unit_ids = EXCLUDED.business_unit_ids,
      subcategories = EXCLUDED.subcategories,
      full_data = EXCLUDED.full_data,
      fetched_at = NOW(),
      updated_at = NOW()
  `, [
    category.id,
    tenantId,
    category.name,
    category.description,
    category.active,
    category.position,                          // ST sort order
    category.parentId,
    category.categoryType,
    category.image?.url || category.image,
    JSON.stringify(category.businessUnitIds || []),
    JSON.stringify(category.subcategories || []),
    JSON.stringify(category),
  ]);
}

async function upsertToMaster(category, tenantId) {
  await pool.query(`
    INSERT INTO master.pricebook_categories (
      st_id, tenant_id, name, description, active,
      sort_order, parent_st_id, depth, category_type,
      image_path, business_unit_ids,
      last_synced_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    ON CONFLICT (st_id, tenant_id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      active = EXCLUDED.active,
      sort_order = EXCLUDED.sort_order,          -- CRITICAL: Copy position → sort_order
      parent_st_id = EXCLUDED.parent_st_id,
      depth = EXCLUDED.depth,
      category_type = EXCLUDED.category_type,
      image_path = EXCLUDED.image_path,
      business_unit_ids = EXCLUDED.business_unit_ids,
      last_synced_at = NOW(),
      updated_at = NOW()
  `, [
    category.id,
    tenantId.toString(),
    category.name,
    category.description,
    category.active,
    category.position,                          // position → sort_order
    category.parentId,
    category.parentId ? 1 : 0,                  // depth (will be calculated recursively)
    category.categoryType,
    category.image?.url || category.image,
    JSON.stringify(category.businessUnitIds || []),
  ]);
}

async function flattenSubcategories(subcategories, parentStId, rootCategoryStId, tenantId, depth, parentPath) {
  for (const sub of subcategories) {
    const currentPath = `${parentPath} > ${sub.name}`;
    
    await pool.query(`
      INSERT INTO master.pricebook_subcategories (
        st_id, tenant_id, parent_st_id, root_category_st_id,
        depth, path, name, description, active, sort_order,
        category_type, image_path, business_unit_ids,
        last_synced_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      ON CONFLICT (st_id, tenant_id) DO UPDATE SET
        parent_st_id = EXCLUDED.parent_st_id,
        root_category_st_id = EXCLUDED.root_category_st_id,
        depth = EXCLUDED.depth,
        path = EXCLUDED.path,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        active = EXCLUDED.active,
        sort_order = EXCLUDED.sort_order,
        category_type = EXCLUDED.category_type,
        image_path = COALESCE(EXCLUDED.image_path, master.pricebook_subcategories.image_path),
        business_unit_ids = EXCLUDED.business_unit_ids,
        last_synced_at = NOW(),
        updated_at = NOW()
    `, [
      sub.id,
      tenantId.toString(),
      parentStId,
      rootCategoryStId,
      depth,
      currentPath,
      sub.name,
      sub.description,
      sub.active !== false,
      sub.position || 0,
      sub.categoryType,
      sub.image?.url || sub.image,
      JSON.stringify(sub.businessUnitIds || []),
    ]);
    
    // Queue image download
    if (sub.image) {
      await queueImageDownload({
        stId: sub.id,
        imagePath: typeof sub.image === 'string' ? sub.image : sub.image.url,
        itemType: 'subcategory',
        tenantId,
      });
    }
    
    // Recurse into nested subcategories
    if (sub.subcategories?.length > 0 && depth < 6) {
      await flattenSubcategories(
        sub.subcategories,
        sub.id,
        rootCategoryStId,
        tenantId,
        depth + 1,
        currentPath
      );
    }
  }
}
```

---

## PHASE 5: IMPLEMENT CRM OVERRIDE WORKFLOW

### 5.1 Create override when user makes changes

```javascript
/**
 * POST /api/pricebook/categories/:stId/override
 * Create or update a local override (doesn't push to ST yet)
 */
router.post('/:stId/override', async (req, res) => {
  const { stId } = req.params;
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const {
    name,
    description,
    position,
    parentId,
    active,
    businessUnitIds,
  } = req.body;

  try {
    // Determine item type
    const catCheck = await pool.query(
      'SELECT 1 FROM master.pricebook_categories WHERE st_id = $1 AND tenant_id = $2',
      [stId, tenantId]
    );
    const itemType = catCheck.rows.length > 0 ? 'category' : 'subcategory';

    // Upsert override
    const result = await pool.query(`
      INSERT INTO crm.pricebook_overrides (
        st_pricebook_id, tenant_id, item_type,
        override_name, override_description, override_position,
        override_parent_id, override_active, override_business_unit_ids,
        pending_sync, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
      ON CONFLICT (st_pricebook_id, tenant_id, item_type) DO UPDATE SET
        override_name = COALESCE($4, crm.pricebook_overrides.override_name),
        override_description = COALESCE($5, crm.pricebook_overrides.override_description),
        override_position = COALESCE($6, crm.pricebook_overrides.override_position),
        override_parent_id = COALESCE($7, crm.pricebook_overrides.override_parent_id),
        override_active = COALESCE($8, crm.pricebook_overrides.override_active),
        override_business_unit_ids = COALESCE($9, crm.pricebook_overrides.override_business_unit_ids),
        pending_sync = true,
        updated_at = NOW()
      RETURNING *
    `, [
      stId,
      tenantId,
      itemType,
      name || null,
      description || null,
      position || null,
      parentId || null,
      active,
      businessUnitIds ? JSON.stringify(businessUnitIds) : null,
    ]);

    // Emit socket event for real-time UI update
    io.to(`tenant:${tenantId}`).emit('category:override:created', {
      stId,
      itemType,
      override: result.rows[0],
    });

    res.json({
      success: true,
      override: result.rows[0],
      message: 'Override saved. Use /push to sync to ServiceTitan.',
    });
  } catch (error) {
    console.error('[Override] Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 5.2 Get merged data (master + overrides)

```javascript
/**
 * GET /api/pricebook/categories
 * Returns categories with CRM overrides applied
 */
router.get('/', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const { parentId, includeInactive } = req.query;

  try {
    const query = `
      SELECT 
        c.st_id,
        c.tenant_id,
        -- Apply overrides with COALESCE
        COALESCE(o.override_name, c.name) AS name,
        COALESCE(o.override_description, c.description) AS description,
        COALESCE(o.override_active, c.active) AS active,
        COALESCE(o.override_position, c.sort_order) AS sort_order,
        COALESCE(o.override_parent_id, c.parent_st_id) AS parent_st_id,
        COALESCE(o.override_business_unit_ids, c.business_unit_ids) AS business_unit_ids,
        c.depth,
        c.category_type,
        c.path,
        
        -- Image (prefer override, then S3, then original path)
        COALESCE(o.override_image_url, c.image_url, c.image_path) AS image_url,
        
        -- CRM metadata
        c.is_visible_crm,
        
        -- Override status
        o.id AS override_id,
        o.pending_sync,
        o.sync_error,
        
        -- Timestamps
        c.last_synced_at,
        c.updated_at
        
      FROM master.pricebook_categories c
      LEFT JOIN crm.pricebook_overrides o 
        ON o.st_pricebook_id = c.st_id 
        AND o.tenant_id = c.tenant_id
        AND o.item_type = 'category'
      WHERE c.tenant_id = $1
        ${parentId ? 'AND COALESCE(o.override_parent_id, c.parent_st_id) = $2' : 'AND c.parent_st_id IS NULL'}
        ${!includeInactive ? 'AND COALESCE(o.override_active, c.active) = true' : ''}
      ORDER BY COALESCE(o.override_position, c.sort_order) ASC
    `;

    const params = [tenantId];
    if (parentId) params.push(parentId);

    const result = await pool.query(query, params);

    // Parse business_unit_ids JSON
    const categories = result.rows.map(row => ({
      ...row,
      business_unit_ids: typeof row.business_unit_ids === 'string' 
        ? JSON.parse(row.business_unit_ids) 
        : row.business_unit_ids,
      has_pending_changes: row.pending_sync === true,
    }));

    res.json({
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error('[Categories] List error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 5.3 Push overrides to ServiceTitan

```javascript
/**
 * POST /api/pricebook/categories/push
 * Push all pending overrides to ServiceTitan
 */
router.post('/push', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;
  const st = getServiceTitanClient();

  try {
    // Get all pending overrides
    const pending = await pool.query(`
      SELECT o.*, c.name as original_name
      FROM crm.pricebook_overrides o
      LEFT JOIN master.pricebook_categories c 
        ON c.st_id = o.st_pricebook_id AND c.tenant_id = o.tenant_id
      WHERE o.tenant_id = $1 AND o.pending_sync = true
    `, [tenantId]);

    if (pending.rows.length === 0) {
      return res.json({ success: true, pushed: 0, message: 'No pending changes' });
    }

    const results = { success: [], failed: [] };

    for (const override of pending.rows) {
      try {
        // Build ST update payload
        const payload = {};
        if (override.override_name) payload.name = override.override_name;
        if (override.override_description !== null) payload.description = override.override_description;
        if (override.override_position !== null) payload.position = override.override_position;
        if (override.override_parent_id !== null) payload.parentId = override.override_parent_id;
        if (override.override_active !== null) payload.active = override.override_active;
        if (override.override_business_unit_ids) {
          payload.businessUnitIds = JSON.parse(override.override_business_unit_ids);
        }

        // Push to ServiceTitan
        await st.updateCategory(override.st_pricebook_id, payload);

        // ═══════════════════════════════════════════════════════════════
        // CRITICAL: Clear override values after successful push
        // ═══════════════════════════════════════════════════════════════
        await pool.query(`
          UPDATE crm.pricebook_overrides
          SET 
            pending_sync = false,
            override_position = NULL,
            override_parent_id = NULL,
            override_name = NULL,
            override_description = NULL,
            override_active = NULL,
            override_business_unit_ids = NULL,
            sync_error = NULL,
            last_synced_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
        `, [override.id]);

        // Update master table with pushed values
        if (override.override_position !== null) {
          await pool.query(`
            UPDATE master.pricebook_categories
            SET sort_order = $1, updated_at = NOW()
            WHERE st_id = $2 AND tenant_id = $3
          `, [override.override_position, override.st_pricebook_id, tenantId]);

          await pool.query(`
            UPDATE raw.st_pricebook_categories
            SET position = $1, updated_at = NOW()
            WHERE st_id = $2 AND tenant_id = $3
          `, [override.override_position, override.st_pricebook_id, tenantId]);
        }

        results.success.push(override.st_pricebook_id);
      } catch (err) {
        console.error(`[Push] Failed ${override.st_pricebook_id}:`, err.message);
        
        // Store error
        await pool.query(`
          UPDATE crm.pricebook_overrides
          SET sync_error = $1, updated_at = NOW()
          WHERE id = $2
        `, [err.message, override.id]);

        results.failed.push({ 
          stId: override.st_pricebook_id, 
          error: err.message 
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
```

### 5.4 Revert/discard override

```javascript
/**
 * DELETE /api/pricebook/categories/:stId/override
 * Discard local changes and revert to ST values
 */
router.delete('/:stId/override', async (req, res) => {
  const { stId } = req.params;
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;

  try {
    await pool.query(`
      DELETE FROM crm.pricebook_overrides
      WHERE st_pricebook_id = $1 AND tenant_id = $2
    `, [stId, tenantId]);

    res.json({
      success: true,
      message: 'Override discarded. Category reverted to ServiceTitan values.',
    });
  } catch (error) {
    console.error('[Override] Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## PHASE 6: FIX FRONTEND CONNECTION

### 6.1 Find frontend category components

```bash
find /opt/docker/apps/lazi/apps/web -name "*.tsx" -o -name "*.ts" | xargs grep -l "categor" | head -20
```

### 6.2 Check current API calls

```bash
grep -rn "api.*categor\|fetch.*categor" /opt/docker/apps/lazi/apps/web/components/ | head -30
grep -rn "api.*categor\|fetch.*categor" /opt/docker/apps/lazi/apps/web/app/ | head -30
```

### 6.3 Required API Response Shape

The frontend expects this data structure:

```typescript
interface Category {
  st_id: number;
  name: string;
  description: string | null;
  active: boolean;
  sort_order: number;
  parent_st_id: number | null;
  depth: number;
  category_type: 'Service' | 'Material';
  
  // Image URL (S3 or fallback)
  image_url: string | null;
  
  // Business units
  business_unit_ids: number[];
  business_units?: BusinessUnit[];  // Resolved names
  
  // CRM status
  is_visible_crm: boolean;
  has_pending_changes: boolean;
  
  // Subcategories (for tree view)
  subcategories?: Subcategory[];
}

interface Subcategory {
  st_id: number;
  name: string;
  description: string | null;
  active: boolean;
  sort_order: number;
  parent_st_id: number;
  root_category_st_id: number;
  depth: number;
  path: string;
  image_url: string | null;
  business_unit_ids: number[];
  has_pending_changes: boolean;
  subcategories?: Subcategory[];  // Nested
}
```

### 6.4 Create complete categories API route

Create/update `services/api/src/routes/pricebook-categories.js`:

```javascript
/**
 * GET /api/pricebook/categories/tree
 * Returns full hierarchy with subcategories nested
 */
router.get('/tree', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID;

  try {
    // Get all categories
    const categoriesResult = await pool.query(`
      SELECT 
        c.st_id,
        COALESCE(o.override_name, c.name) AS name,
        COALESCE(o.override_description, c.description) AS description,
        COALESCE(o.override_active, c.active) AS active,
        COALESCE(o.override_position, c.sort_order) AS sort_order,
        c.category_type,
        c.image_url,
        c.image_path,
        COALESCE(o.override_business_unit_ids, c.business_unit_ids) AS business_unit_ids,
        c.is_visible_crm,
        o.pending_sync AS has_pending_changes
      FROM master.pricebook_categories c
      LEFT JOIN crm.pricebook_overrides o 
        ON o.st_pricebook_id = c.st_id 
        AND o.tenant_id = c.tenant_id
        AND o.item_type = 'category'
      WHERE c.tenant_id = $1 AND c.parent_st_id IS NULL
      ORDER BY COALESCE(o.override_position, c.sort_order)
    `, [tenantId]);

    // Get all subcategories
    const subcatsResult = await pool.query(`
      SELECT 
        s.st_id,
        s.parent_st_id,
        s.root_category_st_id,
        s.depth,
        s.path,
        COALESCE(o.override_name, s.name) AS name,
        COALESCE(o.override_description, s.description) AS description,
        COALESCE(o.override_active, s.active) AS active,
        COALESCE(o.override_position, s.sort_order) AS sort_order,
        s.category_type,
        COALESCE(s.s3_image_url, s.image_url, s.image_path) AS image_url,
        COALESCE(o.override_business_unit_ids, s.business_unit_ids) AS business_unit_ids,
        o.pending_sync AS has_pending_changes
      FROM master.pricebook_subcategories s
      LEFT JOIN crm.pricebook_overrides o 
        ON o.st_pricebook_id = s.st_id 
        AND o.tenant_id = s.tenant_id
        AND o.item_type = 'subcategory'
      WHERE s.tenant_id = $1
      ORDER BY s.depth, COALESCE(o.override_position, s.sort_order)
    `, [tenantId]);

    // Get business units for resolving names
    const busResult = await pool.query(`
      SELECT st_id, name FROM raw.st_business_units WHERE tenant_id = $1
    `, [tenantId]);
    
    const businessUnitsMap = new Map(busResult.rows.map(b => [b.st_id.toString(), b.name]));

    // Build hierarchy
    const categories = categoriesResult.rows.map(cat => ({
      ...cat,
      depth: 0,
      parent_st_id: null,
      business_unit_ids: parseJson(cat.business_unit_ids, []),
      business_units: resolveBusinessUnits(cat.business_unit_ids, businessUnitsMap),
      subcategories: buildSubcategoryTree(
        subcatsResult.rows.filter(s => s.root_category_st_id === cat.st_id),
        cat.st_id,
        1,
        businessUnitsMap
      ),
    }));

    res.json({
      data: categories,
      count: categories.length,
      total_subcategories: subcatsResult.rows.length,
    });
  } catch (error) {
    console.error('[Categories] Tree error:', error);
    res.status(500).json({ error: error.message });
  }
});

function buildSubcategoryTree(subcats, parentStId, depth, businessUnitsMap) {
  return subcats
    .filter(s => s.parent_st_id === parentStId && s.depth === depth)
    .map(s => ({
      ...s,
      business_unit_ids: parseJson(s.business_unit_ids, []),
      business_units: resolveBusinessUnits(s.business_unit_ids, businessUnitsMap),
      subcategories: buildSubcategoryTree(subcats, s.st_id, depth + 1, businessUnitsMap),
    }));
}

function parseJson(value, defaultValue) {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

function resolveBusinessUnits(ids, map) {
  const parsed = parseJson(ids, []);
  return parsed.map(id => ({
    st_id: id,
    name: map.get(id.toString()) || `BU ${id}`,
  }));
}
```

### 6.5 Create frontend API hook

Create `apps/web/hooks/usePricebookCategories.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Category {
  st_id: number;
  name: string;
  description: string | null;
  active: boolean;
  sort_order: number;
  parent_st_id: number | null;
  depth: number;
  category_type: string;
  image_url: string | null;
  business_unit_ids: number[];
  business_units: { st_id: number; name: string }[];
  is_visible_crm: boolean;
  has_pending_changes: boolean;
  subcategories: Category[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch(`${API_URL}/api/pricebook/categories/tree`, {
    headers: {
      'x-tenant-id': TENANT_ID,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  
  const data = await response.json();
  return data.data;
}

export function usePricebookCategories() {
  return useQuery({
    queryKey: ['pricebook', 'categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCategoryOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stId, changes }: { stId: number; changes: Partial<Category> }) => {
      const response = await fetch(`${API_URL}/api/pricebook/categories/${stId}/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify(changes),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save override');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook', 'categories'] });
    },
  });
}

export function usePushToServiceTitan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/api/pricebook/categories/push`, {
        method: 'POST',
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to push to ServiceTitan');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook', 'categories'] });
    },
  });
}
```

### 6.6 Fix category card component

Update category display to show images and business units:

```typescript
// components/pricebook/CategoryCard.tsx

interface CategoryCardProps {
  category: Category;
  onEdit?: (category: Category) => void;
  onToggleVisibility?: (category: Category) => void;
}

export function CategoryCard({ category, onEdit, onToggleVisibility }: CategoryCardProps) {
  const imageUrl = category.image_url 
    ? (category.image_url.startsWith('http') 
        ? category.image_url 
        : `/api/pricebook/images/categories/${category.st_id}`)
    : null;

  return (
    <div className={cn(
      "rounded-lg border p-4 transition-all",
      category.has_pending_changes && "border-yellow-500 bg-yellow-50",
      !category.active && "opacity-50"
    )}>
      {/* Image */}
      <div className="relative h-32 w-full mb-3 rounded-md overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={category.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-category.png';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
        
        {category.has_pending_changes && (
          <span className="absolute top-2 right-2 px-2 py-1 text-xs bg-yellow-500 text-white rounded">
            Pending
          </span>
        )}
      </div>

      {/* Name & Type */}
      <h3 className="font-semibold text-lg">{category.name}</h3>
      <p className="text-sm text-gray-500">{category.category_type}</p>

      {/* Business Units */}
      {category.business_units && category.business_units.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {category.business_units.map(bu => (
            <span 
              key={bu.st_id}
              className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
            >
              {bu.name}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {category.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
          {category.description}
        </p>
      )}

      {/* Stats */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>{category.subcategories?.length || 0} subcategories</span>
        <span>Position: {category.sort_order}</span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button 
          onClick={() => onEdit?.(category)}
          className="flex-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
        >
          Edit
        </button>
        <button 
          onClick={() => onToggleVisibility?.(category)}
          className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
        >
          {category.active ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}
```

---

## PHASE 7: TESTING & VERIFICATION

### 7.1 Test API endpoints

```bash
# Test categories list
curl -s "http://localhost:3001/api/pricebook/categories" \
  -H "x-tenant-id: 3222348440" | jq '.data[0]'

# Test tree endpoint
curl -s "http://localhost:3001/api/pricebook/categories/tree" \
  -H "x-tenant-id: 3222348440" | jq '.data[0] | {name, image_url, business_units, subcategories: .subcategories | length}'

# Test override
curl -X POST "http://localhost:3001/api/pricebook/categories/12345/override" \
  -H "x-tenant-id: 3222348440" \
  -H "Content-Type: application/json" \
  -d '{"position": 5}' | jq '.'

# Test pending
curl -s "http://localhost:3001/api/pricebook/categories/pending" \
  -H "x-tenant-id: 3222348440" | jq '.'
```

### 7.2 Verify database state

```bash
psql "$SUPABASE_URL" -c "
SELECT 
  'categories' as table_name,
  COUNT(*) as total,
  COUNT(image_url) as with_image,
  COUNT(business_unit_ids) FILTER (WHERE jsonb_array_length(business_unit_ids) > 0) as with_bus
FROM master.pricebook_categories
WHERE tenant_id = '3222348440'

UNION ALL

SELECT 
  'subcategories' as table_name,
  COUNT(*) as total,
  COUNT(COALESCE(s3_image_url, image_url)) as with_image,
  COUNT(business_unit_ids) FILTER (WHERE business_unit_ids IS NOT NULL) as with_bus
FROM master.pricebook_subcategories
WHERE tenant_id = '3222348440';
"
```

### 7.3 Test frontend

1. Open https://lazilabs.com/pricebook/categories
2. Verify:
   - [ ] Categories display with images
   - [ ] Business unit badges show
   - [ ] Subcategories expandable
   - [ ] Sort order matches ServiceTitan
   - [ ] Pending changes indicator works
   - [ ] Pull/Push buttons function

---

## FINAL CHECKLIST

### Database
- [ ] raw.st_pricebook_categories has position, business_unit_ids
- [ ] master.pricebook_categories has sort_order, business_unit_ids, image_url
- [ ] master.pricebook_subcategories fully populated
- [ ] crm.pricebook_overrides ready for changes

### Sync Logic
- [ ] Pull copies position → sort_order
- [ ] Pull stores business_unit_ids
- [ ] Pull flattens subcategories
- [ ] Image downloads queued

### CRM Workflow
- [ ] POST /override creates local change
- [ ] GET /categories applies overrides with COALESCE
- [ ] POST /push sends to ST and clears overrides
- [ ] DELETE /override reverts changes

### Frontend
- [ ] Categories load from /tree endpoint
- [ ] Images display (S3 URLs)
- [ ] Business units show as badges
- [ ] Pending changes highlighted
- [ ] Edit/Push/Pull buttons work