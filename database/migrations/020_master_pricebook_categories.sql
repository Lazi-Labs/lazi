-- ============================================================================
-- Master Pricebook Categories Schema
-- Migration: 020_master_pricebook_categories.sql
-- Description: Creates master.pricebook_categories and related objects for
--              CRM-ready category management with hierarchy, reordering, and
--              visibility controls.
-- ============================================================================

-- Enable ltree extension for hierarchical path queries
CREATE EXTENSION IF NOT EXISTS ltree;

-- ============================================================================
-- TABLE: master.pricebook_categories
-- Main categories table with hierarchy support
-- ============================================================================

CREATE TABLE IF NOT EXISTS master.pricebook_categories (
    -- Identity & Source Tracking
    id SERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id VARCHAR(50) NOT NULL,
    raw_id BIGINT REFERENCES raw.st_pricebook_categories(id) ON DELETE SET NULL,
    
    -- Category Data
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    image_url TEXT,
    category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('Materials', 'Services')),
    
    -- Hierarchy Management
    parent_st_id BIGINT REFERENCES master.pricebook_categories(st_id) ON DELETE SET NULL,
    depth INT NOT NULL DEFAULT 0,
    path LTREE,
    sort_order INT NOT NULL DEFAULT 0,
    global_sort_order INT,
    
    -- Status & Visibility
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_visible_crm BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    
    -- Business Unit Association
    business_unit_ids BIGINT[] DEFAULT '{}',
    
    -- Metadata
    item_count INT NOT NULL DEFAULT 0,
    subcategory_count INT NOT NULL DEFAULT 0,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE master.pricebook_categories IS 'Master pricebook categories with CRM customization and hierarchy support';
COMMENT ON COLUMN master.pricebook_categories.st_id IS 'ServiceTitan category ID';
COMMENT ON COLUMN master.pricebook_categories.display_name IS 'CRM-customizable display name (overrides name)';
COMMENT ON COLUMN master.pricebook_categories.path IS 'LTREE path for efficient hierarchy queries (e.g., root.parent.child)';
COMMENT ON COLUMN master.pricebook_categories.sort_order IS 'Position within parent category';
COMMENT ON COLUMN master.pricebook_categories.global_sort_order IS 'Computed global position for flat list rendering';
COMMENT ON COLUMN master.pricebook_categories.is_visible_crm IS 'CRM visibility override (independent of ST active status)';
COMMENT ON COLUMN master.pricebook_categories.is_archived IS 'Soft delete flag for CRM';

-- ============================================================================
-- TABLE: master.pricebook_subcategories
-- Flattened subcategories for direct access
-- ============================================================================

CREATE TABLE IF NOT EXISTS master.pricebook_subcategories (
    id SERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    parent_st_id BIGINT NOT NULL REFERENCES master.pricebook_categories(st_id) ON DELETE CASCADE,
    tenant_id VARCHAR(50) NOT NULL,
    
    -- Subcategory Data
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    image_url TEXT,
    
    -- Ordering & Status
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_visible_crm BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    item_count INT NOT NULL DEFAULT 0,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE master.pricebook_subcategories IS 'Flattened subcategories for direct CRM access';
COMMENT ON COLUMN master.pricebook_subcategories.parent_st_id IS 'Parent category ServiceTitan ID';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_pricebook_categories_st_id 
    ON master.pricebook_categories(st_id);

CREATE INDEX IF NOT EXISTS idx_pricebook_categories_tenant 
    ON master.pricebook_categories(tenant_id);

CREATE INDEX IF NOT EXISTS idx_pricebook_categories_type 
    ON master.pricebook_categories(category_type);

CREATE INDEX IF NOT EXISTS idx_pricebook_categories_parent 
    ON master.pricebook_categories(parent_st_id);

-- Active/visible filtering
CREATE INDEX IF NOT EXISTS idx_pricebook_categories_active 
    ON master.pricebook_categories(is_active, is_visible_crm) 
    WHERE is_archived = false;

-- Hierarchy path queries (GIST for ltree)
CREATE INDEX IF NOT EXISTS idx_pricebook_categories_path 
    ON master.pricebook_categories USING GIST(path);

-- Sorting queries
CREATE INDEX IF NOT EXISTS idx_pricebook_categories_sort 
    ON master.pricebook_categories(category_type, global_sort_order);

CREATE INDEX IF NOT EXISTS idx_pricebook_categories_parent_sort 
    ON master.pricebook_categories(parent_st_id, sort_order);

-- Subcategories indexes
CREATE INDEX IF NOT EXISTS idx_pricebook_subcategories_st_id 
    ON master.pricebook_subcategories(st_id);

CREATE INDEX IF NOT EXISTS idx_pricebook_subcategories_parent 
    ON master.pricebook_subcategories(parent_st_id);

CREATE INDEX IF NOT EXISTS idx_pricebook_subcategories_active 
    ON master.pricebook_subcategories(is_active, is_visible_crm);

CREATE INDEX IF NOT EXISTS idx_pricebook_subcategories_sort 
    ON master.pricebook_subcategories(parent_st_id, sort_order);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION master.update_pricebook_category_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pricebook_categories_updated ON master.pricebook_categories;
CREATE TRIGGER trg_pricebook_categories_updated
    BEFORE UPDATE ON master.pricebook_categories
    FOR EACH ROW
    EXECUTE FUNCTION master.update_pricebook_category_timestamp();

DROP TRIGGER IF EXISTS trg_pricebook_subcategories_updated ON master.pricebook_subcategories;
CREATE TRIGGER trg_pricebook_subcategories_updated
    BEFORE UPDATE ON master.pricebook_subcategories
    FOR EACH ROW
    EXECUTE FUNCTION master.update_pricebook_category_timestamp();

-- ============================================================================
-- TRIGGER: Auto-update subcategory_count on parent
-- ============================================================================

CREATE OR REPLACE FUNCTION master.update_subcategory_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE master.pricebook_categories 
        SET subcategory_count = subcategory_count + 1
        WHERE st_id = NEW.parent_st_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE master.pricebook_categories 
        SET subcategory_count = subcategory_count - 1
        WHERE st_id = OLD.parent_st_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' AND OLD.parent_st_id != NEW.parent_st_id THEN
        UPDATE master.pricebook_categories 
        SET subcategory_count = subcategory_count - 1
        WHERE st_id = OLD.parent_st_id;
        UPDATE master.pricebook_categories 
        SET subcategory_count = subcategory_count + 1
        WHERE st_id = NEW.parent_st_id;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subcategory_count ON master.pricebook_subcategories;
CREATE TRIGGER trg_subcategory_count
    AFTER INSERT OR UPDATE OR DELETE ON master.pricebook_subcategories
    FOR EACH ROW
    EXECUTE FUNCTION master.update_subcategory_count();

-- ============================================================================
-- VIEW: master.v_active_service_categories
-- Active, visible service categories for CRM
-- ============================================================================

CREATE OR REPLACE VIEW master.v_active_service_categories AS
SELECT 
    pc.id,
    pc.st_id,
    pc.tenant_id,
    COALESCE(pc.display_name, pc.name) AS name,
    pc.description,
    pc.image_url,
    pc.parent_st_id,
    pc.depth,
    pc.path,
    pc.sort_order,
    pc.global_sort_order,
    pc.business_unit_ids,
    pc.item_count,
    pc.subcategory_count,
    pc.last_synced_at,
    pc.created_at,
    pc.updated_at
FROM master.pricebook_categories pc
WHERE pc.category_type = 'Services'
  AND pc.is_active = true
  AND pc.is_visible_crm = true
  AND pc.is_archived = false
ORDER BY pc.global_sort_order NULLS LAST, pc.sort_order;

COMMENT ON VIEW master.v_active_service_categories IS 'Active, visible service categories ordered by global sort';

-- ============================================================================
-- VIEW: master.v_active_material_categories
-- Active, visible material categories for CRM
-- ============================================================================

CREATE OR REPLACE VIEW master.v_active_material_categories AS
SELECT 
    pc.id,
    pc.st_id,
    pc.tenant_id,
    COALESCE(pc.display_name, pc.name) AS name,
    pc.description,
    pc.image_url,
    pc.parent_st_id,
    pc.depth,
    pc.path,
    pc.sort_order,
    pc.global_sort_order,
    pc.business_unit_ids,
    pc.item_count,
    pc.subcategory_count,
    pc.last_synced_at,
    pc.created_at,
    pc.updated_at
FROM master.pricebook_categories pc
WHERE pc.category_type = 'Materials'
  AND pc.is_active = true
  AND pc.is_visible_crm = true
  AND pc.is_archived = false
ORDER BY pc.global_sort_order NULLS LAST, pc.sort_order;

COMMENT ON VIEW master.v_active_material_categories IS 'Active, visible material categories ordered by global sort';

-- ============================================================================
-- VIEW: master.v_category_tree
-- Full hierarchical view with JSON children aggregation
-- ============================================================================

CREATE OR REPLACE VIEW master.v_category_tree AS
WITH RECURSIVE category_tree AS (
    -- Root categories (no parent)
    SELECT 
        pc.id,
        pc.st_id,
        pc.tenant_id,
        COALESCE(pc.display_name, pc.name) AS name,
        pc.description,
        pc.image_url,
        pc.category_type,
        pc.parent_st_id,
        pc.depth,
        pc.path,
        pc.sort_order,
        pc.global_sort_order,
        pc.is_active,
        pc.is_visible_crm,
        pc.is_archived,
        pc.business_unit_ids,
        pc.item_count,
        pc.subcategory_count,
        pc.st_id::text AS path_ids,
        1 AS level
    FROM master.pricebook_categories pc
    WHERE pc.parent_st_id IS NULL
    
    UNION ALL
    
    -- Child categories
    SELECT 
        child.id,
        child.st_id,
        child.tenant_id,
        COALESCE(child.display_name, child.name) AS name,
        child.description,
        child.image_url,
        child.category_type,
        child.parent_st_id,
        child.depth,
        child.path,
        child.sort_order,
        child.global_sort_order,
        child.is_active,
        child.is_visible_crm,
        child.is_archived,
        child.business_unit_ids,
        child.item_count,
        child.subcategory_count,
        ct.path_ids || '.' || child.st_id::text,
        ct.level + 1
    FROM master.pricebook_categories child
    JOIN category_tree ct ON child.parent_st_id = ct.st_id
)
SELECT 
    ct.*,
    (
        SELECT COALESCE(json_agg(
            json_build_object(
                'st_id', sub.st_id,
                'name', COALESCE(sub.display_name, sub.name),
                'image_url', sub.image_url,
                'sort_order', sub.sort_order,
                'is_active', sub.is_active,
                'item_count', sub.item_count
            ) ORDER BY sub.sort_order
        ), '[]'::json)
        FROM master.pricebook_subcategories sub
        WHERE sub.parent_st_id = ct.st_id
          AND sub.is_active = true
          AND sub.is_visible_crm = true
    ) AS subcategories_json
FROM category_tree ct
ORDER BY ct.category_type, ct.global_sort_order NULLS LAST, ct.sort_order;

COMMENT ON VIEW master.v_category_tree IS 'Full category tree with recursive hierarchy and subcategories JSON';

-- ============================================================================
-- FUNCTION: master.reorder_category
-- Reorder a category within its parent or move to new parent
-- ============================================================================

CREATE OR REPLACE FUNCTION master.reorder_category(
    p_category_st_id BIGINT,
    p_new_position INT,
    p_new_parent_st_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    affected_count INT
) AS $$
DECLARE
    v_current_parent BIGINT;
    v_current_position INT;
    v_category_type VARCHAR(20);
    v_affected INT := 0;
BEGIN
    -- Get current category info
    SELECT parent_st_id, sort_order, category_type
    INTO v_current_parent, v_current_position, v_category_type
    FROM master.pricebook_categories
    WHERE st_id = p_category_st_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Category not found'::TEXT, 0;
        RETURN;
    END IF;
    
    -- If moving to a new parent
    IF p_new_parent_st_id IS DISTINCT FROM v_current_parent THEN
        -- Validate new parent exists and is same type
        IF p_new_parent_st_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM master.pricebook_categories 
                WHERE st_id = p_new_parent_st_id 
                  AND category_type = v_category_type
            ) THEN
                RETURN QUERY SELECT false, 'Invalid parent category'::TEXT, 0;
                RETURN;
            END IF;
        END IF;
        
        -- Close gap in old parent
        UPDATE master.pricebook_categories
        SET sort_order = sort_order - 1
        WHERE parent_st_id IS NOT DISTINCT FROM v_current_parent
          AND sort_order > v_current_position
          AND category_type = v_category_type;
        
        GET DIAGNOSTICS v_affected = ROW_COUNT;
        
        -- Make room in new parent
        UPDATE master.pricebook_categories
        SET sort_order = sort_order + 1
        WHERE parent_st_id IS NOT DISTINCT FROM p_new_parent_st_id
          AND sort_order >= p_new_position
          AND category_type = v_category_type;
        
        -- Move the category
        UPDATE master.pricebook_categories
        SET parent_st_id = p_new_parent_st_id,
            sort_order = p_new_position,
            depth = CASE 
                WHEN p_new_parent_st_id IS NULL THEN 0
                ELSE (SELECT depth + 1 FROM master.pricebook_categories WHERE st_id = p_new_parent_st_id)
            END
        WHERE st_id = p_category_st_id;
        
    ELSE
        -- Reordering within same parent
        IF p_new_position < v_current_position THEN
            -- Moving up: shift items down
            UPDATE master.pricebook_categories
            SET sort_order = sort_order + 1
            WHERE parent_st_id IS NOT DISTINCT FROM v_current_parent
              AND sort_order >= p_new_position
              AND sort_order < v_current_position
              AND category_type = v_category_type;
        ELSIF p_new_position > v_current_position THEN
            -- Moving down: shift items up
            UPDATE master.pricebook_categories
            SET sort_order = sort_order - 1
            WHERE parent_st_id IS NOT DISTINCT FROM v_current_parent
              AND sort_order > v_current_position
              AND sort_order <= p_new_position
              AND category_type = v_category_type;
        END IF;
        
        GET DIAGNOSTICS v_affected = ROW_COUNT;
        
        -- Update the category position
        UPDATE master.pricebook_categories
        SET sort_order = p_new_position
        WHERE st_id = p_category_st_id;
    END IF;
    
    -- Recalculate global sort order
    PERFORM master.recalculate_global_sort(v_category_type);
    
    -- Update paths
    PERFORM master.rebuild_category_paths();
    
    RETURN QUERY SELECT true, 'Category reordered successfully'::TEXT, v_affected + 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION master.reorder_category IS 'Reorder a category within its parent or move to a new parent';

-- ============================================================================
-- FUNCTION: master.toggle_category_visibility
-- Toggle CRM visibility for a category
-- ============================================================================

CREATE OR REPLACE FUNCTION master.toggle_category_visibility(
    p_category_st_id BIGINT,
    p_visible BOOLEAN,
    p_cascade BOOLEAN DEFAULT false
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    affected_count INT
) AS $$
DECLARE
    v_affected INT := 0;
BEGIN
    -- Update the category
    UPDATE master.pricebook_categories
    SET is_visible_crm = p_visible
    WHERE st_id = p_category_st_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Category not found'::TEXT, 0;
        RETURN;
    END IF;
    
    v_affected := 1;
    
    -- Cascade to subcategories if requested
    IF p_cascade THEN
        UPDATE master.pricebook_subcategories
        SET is_visible_crm = p_visible
        WHERE parent_st_id = p_category_st_id;
        
        v_affected := v_affected + (SELECT COUNT(*) FROM master.pricebook_subcategories WHERE parent_st_id = p_category_st_id);
        
        -- Cascade to child categories (recursive via path)
        UPDATE master.pricebook_categories
        SET is_visible_crm = p_visible
        WHERE path <@ (SELECT path FROM master.pricebook_categories WHERE st_id = p_category_st_id)
          AND st_id != p_category_st_id;
        
        v_affected := v_affected + (SELECT COUNT(*) FROM master.pricebook_categories 
            WHERE path <@ (SELECT path FROM master.pricebook_categories WHERE st_id = p_category_st_id)
            AND st_id != p_category_st_id);
    END IF;
    
    RETURN QUERY SELECT true, 'Visibility updated'::TEXT, v_affected;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION master.toggle_category_visibility IS 'Toggle CRM visibility with optional cascade to children';

-- ============================================================================
-- FUNCTION: master.get_category_tree
-- Returns nested JSON tree structure for frontend rendering
-- ============================================================================

CREATE OR REPLACE FUNCTION master.get_category_tree(
    p_category_type VARCHAR(20) DEFAULT NULL,
    p_include_inactive BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH RECURSIVE tree AS (
        -- Root categories
        SELECT 
            pc.st_id,
            COALESCE(pc.display_name, pc.name) AS name,
            pc.description,
            pc.image_url,
            pc.category_type,
            pc.sort_order,
            pc.global_sort_order,
            pc.is_active,
            pc.is_visible_crm,
            pc.item_count,
            pc.subcategory_count,
            pc.depth,
            0 AS level,
            ARRAY[pc.sort_order] AS sort_path
        FROM master.pricebook_categories pc
        WHERE pc.parent_st_id IS NULL
          AND pc.is_archived = false
          AND (p_category_type IS NULL OR pc.category_type = p_category_type)
          AND (p_include_inactive OR (pc.is_active AND pc.is_visible_crm))
        
        UNION ALL
        
        -- Children
        SELECT 
            child.st_id,
            COALESCE(child.display_name, child.name) AS name,
            child.description,
            child.image_url,
            child.category_type,
            child.sort_order,
            child.global_sort_order,
            child.is_active,
            child.is_visible_crm,
            child.item_count,
            child.subcategory_count,
            child.depth,
            t.level + 1,
            t.sort_path || child.sort_order
        FROM master.pricebook_categories child
        JOIN tree t ON child.parent_st_id = t.st_id
        WHERE child.is_archived = false
          AND (p_include_inactive OR (child.is_active AND child.is_visible_crm))
    ),
    with_subcategories AS (
        SELECT 
            t.*,
            (
                SELECT COALESCE(json_agg(
                    json_build_object(
                        'st_id', s.st_id,
                        'name', COALESCE(s.display_name, s.name),
                        'image_url', s.image_url,
                        'sort_order', s.sort_order,
                        'is_active', s.is_active,
                        'item_count', s.item_count
                    ) ORDER BY s.sort_order
                ), '[]'::json)
                FROM master.pricebook_subcategories s
                WHERE s.parent_st_id = t.st_id
                  AND (p_include_inactive OR (s.is_active AND s.is_visible_crm))
            ) AS subcategories
        FROM tree t
    ),
    with_children AS (
        SELECT 
            ws.*,
            (
                SELECT COALESCE(json_agg(
                    json_build_object(
                        'st_id', c.st_id,
                        'name', c.name,
                        'description', c.description,
                        'image_url', c.image_url,
                        'sort_order', c.sort_order,
                        'is_active', c.is_active,
                        'item_count', c.item_count,
                        'subcategory_count', c.subcategory_count,
                        'subcategories', c.subcategories
                    ) ORDER BY c.sort_order
                ), '[]'::json)
                FROM with_subcategories c
                WHERE c.level = ws.level + 1
            ) AS children
        FROM with_subcategories ws
        WHERE ws.level = 0
    )
    SELECT json_agg(
        json_build_object(
            'st_id', wc.st_id,
            'name', wc.name,
            'description', wc.description,
            'image_url', wc.image_url,
            'category_type', wc.category_type,
            'sort_order', wc.sort_order,
            'is_active', wc.is_active,
            'item_count', wc.item_count,
            'subcategory_count', wc.subcategory_count,
            'subcategories', wc.subcategories,
            'children', COALESCE(wc.children, '[]'::json)
        ) ORDER BY wc.category_type, wc.sort_path
    )
    INTO v_result
    FROM with_children wc;
    
    RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION master.get_category_tree IS 'Returns nested JSON tree for frontend category rendering';

-- ============================================================================
-- FUNCTION: master.recalculate_global_sort
-- Rebuilds global_sort_order based on hierarchy and local sort_order
-- ============================================================================

CREATE OR REPLACE FUNCTION master.recalculate_global_sort(
    p_category_type VARCHAR(20) DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
    v_counter INT := 0;
    v_record RECORD;
BEGIN
    -- Use recursive CTE to traverse in correct order
    FOR v_record IN
        WITH RECURSIVE ordered_tree AS (
            -- Root categories first
            SELECT 
                st_id,
                category_type,
                sort_order,
                0 AS depth,
                ARRAY[sort_order] AS sort_path
            FROM master.pricebook_categories
            WHERE parent_st_id IS NULL
              AND is_archived = false
              AND (p_category_type IS NULL OR category_type = p_category_type)
            
            UNION ALL
            
            -- Then children in order
            SELECT 
                c.st_id,
                c.category_type,
                c.sort_order,
                ot.depth + 1,
                ot.sort_path || c.sort_order
            FROM master.pricebook_categories c
            JOIN ordered_tree ot ON c.parent_st_id = ot.st_id
            WHERE c.is_archived = false
        )
        SELECT st_id, category_type
        FROM ordered_tree
        ORDER BY category_type, sort_path
    LOOP
        v_counter := v_counter + 1;
        
        UPDATE master.pricebook_categories
        SET global_sort_order = v_counter
        WHERE st_id = v_record.st_id;
    END LOOP;
    
    RETURN v_counter;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION master.recalculate_global_sort IS 'Rebuilds global_sort_order for all categories';

-- ============================================================================
-- FUNCTION: master.rebuild_category_paths
-- Rebuilds LTREE paths for all categories
-- ============================================================================

CREATE OR REPLACE FUNCTION master.rebuild_category_paths()
RETURNS INT AS $$
DECLARE
    v_updated INT := 0;
BEGIN
    WITH RECURSIVE path_builder AS (
        -- Root categories
        SELECT 
            st_id,
            st_id::text::ltree AS computed_path,
            0 AS depth
        FROM master.pricebook_categories
        WHERE parent_st_id IS NULL
        
        UNION ALL
        
        -- Children
        SELECT 
            c.st_id,
            (pb.computed_path || c.st_id::text)::ltree,
            pb.depth + 1
        FROM master.pricebook_categories c
        JOIN path_builder pb ON c.parent_st_id = pb.st_id
    )
    UPDATE master.pricebook_categories pc
    SET path = pb.computed_path,
        depth = pb.depth
    FROM path_builder pb
    WHERE pc.st_id = pb.st_id
      AND (pc.path IS DISTINCT FROM pb.computed_path OR pc.depth != pb.depth);
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION master.rebuild_category_paths IS 'Rebuilds LTREE paths for hierarchy queries';

-- ============================================================================
-- FUNCTION: master.sync_pricebook_categories_from_raw
-- Syncs categories from raw.st_pricebook_categories to master
-- ============================================================================

CREATE OR REPLACE FUNCTION master.sync_pricebook_categories_from_raw()
RETURNS TABLE (
    inserted INT,
    updated INT,
    subcategories_synced INT
) AS $$
DECLARE
    v_inserted INT := 0;
    v_updated INT := 0;
    v_subcategories INT := 0;
    v_record RECORD;
    v_sub RECORD;
BEGIN
    -- Upsert categories from raw
    FOR v_record IN
        SELECT 
            r.id AS raw_id,
            r.st_id,
            r.tenant_id::varchar(50),
            r.name,
            r.description,
            r.image,
            r.parent_id,
            r.position,
            r.category_type,
            r.subcategories,
            r.business_unit_ids,
            r.active,
            r.fetched_at
        FROM raw.st_pricebook_categories r
    LOOP
        INSERT INTO master.pricebook_categories (
            st_id, tenant_id, raw_id, name, description, image_url,
            parent_st_id, sort_order, category_type, business_unit_ids,
            is_active, last_synced_at
        ) VALUES (
            v_record.st_id,
            v_record.tenant_id,
            v_record.raw_id,
            v_record.name,
            v_record.description,
            v_record.image,
            v_record.parent_id,
            COALESCE(v_record.position, 0),
            v_record.category_type,
            v_record.business_unit_ids,
            v_record.active,
            v_record.fetched_at
        )
        ON CONFLICT (st_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            image_url = EXCLUDED.image_url,
            parent_st_id = EXCLUDED.parent_st_id,
            sort_order = EXCLUDED.sort_order,
            business_unit_ids = EXCLUDED.business_unit_ids,
            is_active = EXCLUDED.is_active,
            last_synced_at = EXCLUDED.last_synced_at,
            raw_id = EXCLUDED.raw_id;
        
        v_updated := v_updated + 1;
        
        -- Sync subcategories from JSONB array
        IF v_record.subcategories IS NOT NULL AND jsonb_array_length(v_record.subcategories) > 0 THEN
            FOR v_sub IN
                SELECT 
                    (elem->>'id')::bigint AS st_id,
                    elem->>'name' AS name,
                    elem->>'image' AS image,
                    (elem->>'position')::int AS position,
                    COALESCE((elem->>'active')::boolean, true) AS active
                FROM jsonb_array_elements(v_record.subcategories) AS elem
            LOOP
                INSERT INTO master.pricebook_subcategories (
                    st_id, parent_st_id, tenant_id, name, image_url,
                    sort_order, is_active, last_synced_at
                ) VALUES (
                    v_sub.st_id,
                    v_record.st_id,
                    v_record.tenant_id,
                    v_sub.name,
                    v_sub.image,
                    COALESCE(v_sub.position, 0),
                    v_sub.active,
                    v_record.fetched_at
                )
                ON CONFLICT (st_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    image_url = EXCLUDED.image_url,
                    sort_order = EXCLUDED.sort_order,
                    is_active = EXCLUDED.is_active,
                    last_synced_at = EXCLUDED.last_synced_at;
                
                v_subcategories := v_subcategories + 1;
            END LOOP;
        END IF;
    END LOOP;
    
    -- Rebuild paths and global sort
    PERFORM master.rebuild_category_paths();
    PERFORM master.recalculate_global_sort();
    
    RETURN QUERY SELECT v_inserted, v_updated, v_subcategories;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION master.sync_pricebook_categories_from_raw IS 'Syncs categories and subcategories from raw to master schema';

-- ============================================================================
-- Initial sync from raw data
-- ============================================================================

SELECT * FROM master.sync_pricebook_categories_from_raw();

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT ON master.pricebook_categories TO PUBLIC;
GRANT SELECT ON master.pricebook_subcategories TO PUBLIC;
GRANT SELECT ON master.v_active_service_categories TO PUBLIC;
GRANT SELECT ON master.v_active_material_categories TO PUBLIC;
GRANT SELECT ON master.v_category_tree TO PUBLIC;
