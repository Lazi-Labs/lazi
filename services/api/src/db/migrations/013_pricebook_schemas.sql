-- =============================================================================
-- PRICEBOOK SCHEMA MIGRATION
-- Migration 013: Pricebook Categories with 3-tier schema architecture
-- =============================================================================
-- Schemas: raw -> master -> crm
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- =============================================================================
-- SCHEMAS
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS master;
CREATE SCHEMA IF NOT EXISTS crm;

-- =============================================================================
-- RAW SCHEMA - ServiceTitan API Responses
-- =============================================================================

-- Raw pricebook categories (from ST API)
CREATE TABLE IF NOT EXISTS raw.st_pricebook_categories (
    id SERIAL PRIMARY KEY,
    st_id BIGINT NOT NULL UNIQUE,
    tenant_id VARCHAR(50) NOT NULL,

    -- Core fields from API
    name VARCHAR(255),
    active BOOLEAN DEFAULT true,
    description TEXT,
    image TEXT,
    parent_id BIGINT,
    position INT DEFAULT 0,
    category_type VARCHAR(50),
    subcategories JSONB DEFAULT '[]',
    business_unit_ids BIGINT[] DEFAULT '{}',

    -- Timestamps
    fetched_at TIMESTAMPTZ DEFAULT NOW(),

    -- Full API response for reference
    full_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_st_pb_cat_st_id ON raw.st_pricebook_categories(st_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_pb_cat_parent ON raw.st_pricebook_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_raw_st_pb_cat_type ON raw.st_pricebook_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_raw_st_pb_cat_tenant ON raw.st_pricebook_categories(tenant_id);

-- =============================================================================
-- MASTER SCHEMA - Denormalized, query-optimized data
-- =============================================================================

-- Master pricebook categories
CREATE TABLE IF NOT EXISTS master.pricebook_categories (
    id SERIAL PRIMARY KEY,
    st_id BIGINT NOT NULL UNIQUE,
    tenant_id VARCHAR(50) NOT NULL,
    raw_id INTEGER REFERENCES raw.st_pricebook_categories(id) ON DELETE SET NULL,

    -- Category info
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    image_url TEXT,
    category_type VARCHAR(50),

    -- Hierarchy
    parent_st_id BIGINT,
    depth INT DEFAULT 0,
    path ltree,
    sort_order INT DEFAULT 0,
    global_sort_order INT DEFAULT 0,

    -- Status flags
    is_active BOOLEAN DEFAULT true,
    is_visible_crm BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,

    -- Business units
    business_unit_ids BIGINT[] DEFAULT '{}',

    -- Counts (denormalized for performance)
    item_count INT DEFAULT 0,
    subcategory_count INT DEFAULT 0,

    -- Sync metadata
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_pb_cat_st_id ON master.pricebook_categories(st_id);
CREATE INDEX IF NOT EXISTS idx_master_pb_cat_tenant ON master.pricebook_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_master_pb_cat_parent ON master.pricebook_categories(parent_st_id);
CREATE INDEX IF NOT EXISTS idx_master_pb_cat_type ON master.pricebook_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_master_pb_cat_path ON master.pricebook_categories USING gist(path);
CREATE INDEX IF NOT EXISTS idx_master_pb_cat_sort ON master.pricebook_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_master_pb_cat_active ON master.pricebook_categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_master_pb_cat_visible ON master.pricebook_categories(is_visible_crm) WHERE is_visible_crm = true;
CREATE INDEX IF NOT EXISTS idx_master_pb_cat_global_sort ON master.pricebook_categories(global_sort_order);

-- Master pricebook subcategories (flattened from nested JSON)
CREATE TABLE IF NOT EXISTS master.pricebook_subcategories (
    id SERIAL PRIMARY KEY,
    st_id BIGINT NOT NULL UNIQUE,
    parent_st_id BIGINT NOT NULL,
    parent_subcategory_st_id BIGINT,
    tenant_id VARCHAR(50) NOT NULL,

    -- Subcategory info
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    image_url TEXT,

    -- Hierarchy within subcategories
    sort_order INT DEFAULT 0,
    depth INT DEFAULT 1,
    path ltree,

    -- Status flags
    is_active BOOLEAN DEFAULT true,
    is_visible_crm BOOLEAN DEFAULT true,

    -- Counts
    item_count INT DEFAULT 0,

    -- Sync metadata
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_pb_subcat_st_id ON master.pricebook_subcategories(st_id);
CREATE INDEX IF NOT EXISTS idx_master_pb_subcat_parent ON master.pricebook_subcategories(parent_st_id);
CREATE INDEX IF NOT EXISTS idx_master_pb_subcat_parent_sub ON master.pricebook_subcategories(parent_subcategory_st_id);
CREATE INDEX IF NOT EXISTS idx_master_pb_subcat_tenant ON master.pricebook_subcategories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_master_pb_subcat_depth ON master.pricebook_subcategories(depth);
CREATE INDEX IF NOT EXISTS idx_master_pb_subcat_path ON master.pricebook_subcategories USING gist(path);

-- =============================================================================
-- CRM SCHEMA - User-editable overrides
-- =============================================================================

-- Pricebook overrides (for categories and subcategories)
CREATE TABLE IF NOT EXISTS crm.pricebook_overrides (
    id SERIAL PRIMARY KEY,
    st_pricebook_id BIGINT NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('category', 'subcategory', 'service', 'material', 'equipment')),

    -- Override fields
    override_name VARCHAR(255),
    override_description TEXT,
    override_position INT,
    override_parent_id BIGINT,

    -- Image overrides
    override_image_data BYTEA,
    override_image_mime_type VARCHAR(100),
    override_image_filename VARCHAR(255),
    delete_image BOOLEAN DEFAULT false,

    -- CRM-specific fields
    internal_notes TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',

    -- Sync tracking
    pending_sync BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    sync_error TEXT,

    -- Audit
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one override per item
    UNIQUE(st_pricebook_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_crm_pb_override_st_id ON crm.pricebook_overrides(st_pricebook_id);
CREATE INDEX IF NOT EXISTS idx_crm_pb_override_type ON crm.pricebook_overrides(item_type);
CREATE INDEX IF NOT EXISTS idx_crm_pb_override_pending ON crm.pricebook_overrides(pending_sync) WHERE pending_sync = true;

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to recalculate global sort order for categories
CREATE OR REPLACE FUNCTION master.recalculate_global_sort(p_tenant_id VARCHAR, p_category_type VARCHAR)
RETURNS void AS $$
DECLARE
    v_counter INT := 0;
    v_cat RECORD;
BEGIN
    -- Order by parent hierarchy then by sort_order
    FOR v_cat IN (
        SELECT st_id
        FROM master.pricebook_categories
        WHERE tenant_id = p_tenant_id
          AND category_type = p_category_type
          AND is_archived = false
        ORDER BY parent_st_id NULLS FIRST, sort_order, name
    ) LOOP
        UPDATE master.pricebook_categories
        SET global_sort_order = v_counter
        WHERE st_id = v_cat.st_id;
        v_counter := v_counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to rebuild category paths
CREATE OR REPLACE FUNCTION master.rebuild_category_paths()
RETURNS void AS $$
DECLARE
    v_cat RECORD;
    v_parent_path ltree;
BEGIN
    -- First, set path for root categories
    UPDATE master.pricebook_categories
    SET path = st_id::text::ltree, depth = 0
    WHERE parent_st_id IS NULL;

    -- Then, recursively set paths for child categories
    FOR v_cat IN (
        SELECT c.st_id, c.parent_st_id
        FROM master.pricebook_categories c
        WHERE c.parent_st_id IS NOT NULL
        ORDER BY (
            SELECT COALESCE(p.depth, 0) + 1
            FROM master.pricebook_categories p
            WHERE p.st_id = c.parent_st_id
        )
    ) LOOP
        SELECT path INTO v_parent_path
        FROM master.pricebook_categories
        WHERE st_id = v_cat.parent_st_id;

        IF v_parent_path IS NOT NULL THEN
            UPDATE master.pricebook_categories
            SET
                path = v_parent_path || v_cat.st_id::text::ltree,
                depth = nlevel(v_parent_path)
            WHERE st_id = v_cat.st_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle category visibility
CREATE OR REPLACE FUNCTION master.toggle_category_visibility(
    p_st_id BIGINT,
    p_visible BOOLEAN,
    p_cascade BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_updated INT;
BEGIN
    -- Update the target category
    UPDATE master.pricebook_categories
    SET is_visible_crm = p_visible, updated_at = NOW()
    WHERE st_id = p_st_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    v_result := jsonb_build_object('target_updated', v_updated > 0);

    -- If cascade, update children
    IF p_cascade THEN
        UPDATE master.pricebook_categories
        SET is_visible_crm = p_visible, updated_at = NOW()
        WHERE parent_st_id = p_st_id;

        GET DIAGNOSTICS v_updated = ROW_COUNT;
        v_result := v_result || jsonb_build_object('children_updated', v_updated);

        -- Also update subcategories
        UPDATE master.pricebook_subcategories
        SET is_visible_crm = p_visible, updated_at = NOW()
        WHERE parent_st_id = p_st_id;

        GET DIAGNOSTICS v_updated = ROW_COUNT;
        v_result := v_result || jsonb_build_object('subcategories_updated', v_updated);
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get category tree (JSON format)
CREATE OR REPLACE FUNCTION master.get_category_tree(
    p_tenant_id VARCHAR,
    p_category_type VARCHAR DEFAULT NULL,
    p_include_inactive BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH RECURSIVE category_tree AS (
        -- Root categories
        SELECT
            c.st_id,
            c.name,
            c.display_name,
            c.image_url,
            c.category_type,
            c.sort_order,
            c.is_active,
            c.is_visible_crm,
            c.item_count,
            c.subcategory_count,
            0 as level,
            ARRAY[c.sort_order, c.st_id::int] as sort_path
        FROM master.pricebook_categories c
        WHERE c.tenant_id = p_tenant_id
          AND c.parent_st_id IS NULL
          AND c.is_archived = false
          AND (p_category_type IS NULL OR c.category_type = p_category_type)
          AND (p_include_inactive OR c.is_active)

        UNION ALL

        -- Child categories
        SELECT
            c.st_id,
            c.name,
            c.display_name,
            c.image_url,
            c.category_type,
            c.sort_order,
            c.is_active,
            c.is_visible_crm,
            c.item_count,
            c.subcategory_count,
            ct.level + 1,
            ct.sort_path || ARRAY[c.sort_order, c.st_id::int]
        FROM master.pricebook_categories c
        JOIN category_tree ct ON c.parent_st_id = ct.st_id
        WHERE c.is_archived = false
          AND (p_include_inactive OR c.is_active)
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'st_id', st_id,
            'name', COALESCE(display_name, name),
            'image_url', image_url,
            'category_type', category_type,
            'sort_order', sort_order,
            'is_active', is_active,
            'is_visible_crm', is_visible_crm,
            'item_count', item_count,
            'subcategory_count', subcategory_count,
            'level', level
        ) ORDER BY sort_path
    ) INTO v_result
    FROM category_tree;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION master.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_master_pb_cat_updated ON master.pricebook_categories;
CREATE TRIGGER trg_master_pb_cat_updated
    BEFORE UPDATE ON master.pricebook_categories
    FOR EACH ROW EXECUTE FUNCTION master.update_updated_at();

DROP TRIGGER IF EXISTS trg_master_pb_subcat_updated ON master.pricebook_subcategories;
CREATE TRIGGER trg_master_pb_subcat_updated
    BEFORE UPDATE ON master.pricebook_subcategories
    FOR EACH ROW EXECUTE FUNCTION master.update_updated_at();

DROP TRIGGER IF EXISTS trg_crm_pb_override_updated ON crm.pricebook_overrides;
CREATE TRIGGER trg_crm_pb_override_updated
    BEFORE UPDATE ON crm.pricebook_overrides
    FOR EACH ROW EXECUTE FUNCTION master.update_updated_at();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON SCHEMA raw IS 'Raw ServiceTitan API responses - immutable source of truth';
COMMENT ON SCHEMA master IS 'Denormalized, query-optimized data synced from raw';
COMMENT ON SCHEMA crm IS 'User-editable CRM overrides and extensions';

COMMENT ON TABLE raw.st_pricebook_categories IS 'Raw pricebook categories from ServiceTitan API';
COMMENT ON TABLE master.pricebook_categories IS 'Denormalized pricebook categories for CRM display';
COMMENT ON TABLE master.pricebook_subcategories IS 'Flattened subcategories from nested JSON';
COMMENT ON TABLE crm.pricebook_overrides IS 'User overrides for pricebook items (pending sync to ST)';

-- =============================================================================
-- END OF MIGRATION 013
-- =============================================================================
