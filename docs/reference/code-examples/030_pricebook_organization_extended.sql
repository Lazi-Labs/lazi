-- ============================================================================
-- Migration: 030_pricebook_organization.sql
-- Purpose: Add organization, health tracking, and cleanup features to pricebook
-- Dependencies: 001_pricebook_schema.sql, 015_materials_st_fields.sql
-- ============================================================================

-- ============================================================================
-- 1. ADD REVIEW/ORGANIZATION COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Materials: Add review tracking and health score columns
ALTER TABLE master.pricebook_materials 
ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS health_score SMALLINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority_score SMALLINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ;

COMMENT ON COLUMN master.pricebook_materials.is_reviewed IS 'Whether item has been reviewed and is field-ready';
COMMENT ON COLUMN master.pricebook_materials.health_score IS 'Data completeness score 0-100';
COMMENT ON COLUMN master.pricebook_materials.priority_score IS 'Priority for attention queue (higher = more urgent)';

-- Services: Add review tracking and health score columns
ALTER TABLE master.pricebook_services
ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS health_score SMALLINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority_score SMALLINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ;

-- Equipment: Add review tracking (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'master' AND table_name = 'pricebook_equipment') THEN
    ALTER TABLE master.pricebook_equipment
    ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
    ADD COLUMN IF NOT EXISTS health_score SMALLINT DEFAULT 0;
  END IF;
END $$;

-- Indexes for filtering by review status
CREATE INDEX IF NOT EXISTS idx_materials_is_reviewed ON master.pricebook_materials(is_reviewed) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_services_is_reviewed ON master.pricebook_services(is_reviewed) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_materials_health_score ON master.pricebook_materials(health_score) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_services_health_score ON master.pricebook_services(health_score) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_materials_priority ON master.pricebook_materials(priority_score DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_services_priority ON master.pricebook_services(priority_score DESC) WHERE active = true;

-- ============================================================================
-- 2. CREATE CRM ORGANIZATION TABLES
-- ============================================================================

-- User Saved Views (filter presets)
CREATE TABLE IF NOT EXISTS crm.pricebook_saved_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT '3222348440',
    user_id TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('materials', 'services', 'equipment', 'all')),
    filters JSONB NOT NULL DEFAULT '{}',
    sort_config JSONB DEFAULT '{}',
    visible_columns JSONB DEFAULT '[]',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_user ON crm.pricebook_saved_views(tenant_id, user_id, entity_type);

-- Audit Log for tracking changes
CREATE TABLE IF NOT EXISTS crm.pricebook_audit_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT '3222348440',
    user_id TEXT,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('material', 'service', 'equipment', 'category')),
    entity_id BIGINT,
    entity_st_id BIGINT,
    entity_name TEXT,
    changes JSONB,
    batch_id UUID,
    source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'bulk', 'sync', 'ai')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON crm.pricebook_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON crm.pricebook_audit_log(entity_type, entity_st_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_batch ON crm.pricebook_audit_log(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON crm.pricebook_audit_log(user_id, created_at DESC);

-- Duplicate Detection Groups
CREATE TABLE IF NOT EXISTS crm.pricebook_duplicate_groups (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT '3222348440',
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('materials', 'services')),
    member_st_ids BIGINT[] NOT NULL,
    similarity_score DECIMAL(5,2),
    match_reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'merged', 'dismissed')),
    merged_into_st_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_duplicate_groups_pending ON crm.pricebook_duplicate_groups(tenant_id, entity_type, status) WHERE status = 'pending';

-- Category Suggestions (AI-assisted categorization)
CREATE TABLE IF NOT EXISTS crm.pricebook_category_suggestions (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT '3222348440',
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('materials', 'services')),
    entity_st_id BIGINT NOT NULL,
    suggested_category_st_id BIGINT NOT NULL,
    confidence SMALLINT CHECK (confidence BETWEEN 0 AND 100),
    reasoning TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_category_suggestions_pending ON crm.pricebook_category_suggestions(tenant_id, entity_type, status) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_suggestions_unique ON crm.pricebook_category_suggestions(tenant_id, entity_type, entity_st_id) WHERE status = 'pending';

-- Progress Tracking (daily stats per user)
CREATE TABLE IF NOT EXISTS crm.pricebook_progress (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT '3222348440',
    user_id TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    items_reviewed INT DEFAULT 0,
    items_categorized INT DEFAULT 0,
    items_priced INT DEFAULT 0,
    items_imaged INT DEFAULT 0,
    duplicates_resolved INT DEFAULT 0,
    total_actions INT DEFAULT 0,
    UNIQUE(tenant_id, user_id, date)
);

-- Achievements
CREATE TABLE IF NOT EXISTS crm.pricebook_achievements (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT '3222348440',
    user_id TEXT NOT NULL,
    achievement_key VARCHAR(50) NOT NULL,
    achieved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, achievement_key)
);

-- ============================================================================
-- 3. CREATE HEALTH METRICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW crm.v_pricebook_health AS
WITH material_stats AS (
    SELECT 
        tenant_id,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE active = true) as active,
        COUNT(*) FILTER (WHERE is_reviewed = true) as reviewed,
        COUNT(*) FILTER (WHERE category_st_id IS NULL OR category_st_id = 0) as uncategorized,
        COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') as no_image,
        COUNT(*) FILTER (WHERE (price IS NULL OR price = 0) AND active = true) as zero_price,
        COUNT(*) FILTER (WHERE description IS NULL OR description = '') as no_description,
        COUNT(*) FILTER (WHERE cost > 0 AND price > 0 AND price < cost) as negative_margin,
        COUNT(*) FILTER (WHERE cost > 0 AND price > 0 AND (price - cost) / NULLIF(price, 0) > 0.8) as high_margin
    FROM master.pricebook_materials
    GROUP BY tenant_id
),
service_stats AS (
    SELECT 
        tenant_id,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE active = true) as active,
        COUNT(*) FILTER (WHERE is_reviewed = true) as reviewed,
        COUNT(*) FILTER (WHERE category_st_id IS NULL OR category_st_id = 0) as uncategorized,
        COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') as no_image,
        COUNT(*) FILTER (WHERE (price IS NULL OR price = 0) AND active = true) as zero_price,
        COUNT(*) FILTER (WHERE description IS NULL OR description = '') as no_description,
        0 as negative_margin,
        0 as high_margin
    FROM master.pricebook_services
    GROUP BY tenant_id
)
SELECT 
    'materials' as entity_type,
    m.*
FROM material_stats m
UNION ALL
SELECT 
    'services' as entity_type,
    s.*
FROM service_stats s;

-- ============================================================================
-- 4. CREATE CATEGORY COMPLETENESS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW crm.v_category_completeness AS
SELECT 
    c.st_id as category_st_id,
    c.name as category_name,
    c.tenant_id,
    'materials' as entity_type,
    COUNT(m.id) as total_items,
    ROUND(100.0 * COUNT(m.id) FILTER (WHERE m.description IS NOT NULL AND m.description != '') / NULLIF(COUNT(m.id), 0), 1) as description_pct,
    ROUND(100.0 * COUNT(m.id) FILTER (WHERE m.image_url IS NOT NULL AND m.image_url != '') / NULLIF(COUNT(m.id), 0), 1) as image_pct,
    ROUND(100.0 * COUNT(m.id) FILTER (WHERE m.price > 0) / NULLIF(COUNT(m.id), 0), 1) as price_pct,
    ROUND(100.0 * COUNT(m.id) FILTER (WHERE m.cost > 0) / NULLIF(COUNT(m.id), 0), 1) as cost_pct,
    ROUND(100.0 * COUNT(m.id) FILTER (WHERE m.is_reviewed = true) / NULLIF(COUNT(m.id), 0), 1) as reviewed_pct
FROM master.pricebook_categories c
LEFT JOIN master.pricebook_materials m ON m.category_st_id = c.st_id AND m.tenant_id = c.tenant_id AND m.active = true
WHERE c.category_type = 'Materials'
GROUP BY c.st_id, c.name, c.tenant_id

UNION ALL

SELECT 
    c.st_id as category_st_id,
    c.name as category_name,
    c.tenant_id,
    'services' as entity_type,
    COUNT(s.id) as total_items,
    ROUND(100.0 * COUNT(s.id) FILTER (WHERE s.description IS NOT NULL AND s.description != '') / NULLIF(COUNT(s.id), 0), 1) as description_pct,
    ROUND(100.0 * COUNT(s.id) FILTER (WHERE s.image_url IS NOT NULL AND s.image_url != '') / NULLIF(COUNT(s.id), 0), 1) as image_pct,
    ROUND(100.0 * COUNT(s.id) FILTER (WHERE s.price > 0) / NULLIF(COUNT(s.id), 0), 1) as price_pct,
    0 as cost_pct,
    ROUND(100.0 * COUNT(s.id) FILTER (WHERE s.is_reviewed = true) / NULLIF(COUNT(s.id), 0), 1) as reviewed_pct
FROM master.pricebook_categories c
LEFT JOIN master.pricebook_services s ON s.category_st_id = c.st_id AND s.tenant_id = c.tenant_id AND s.active = true
WHERE c.category_type = 'Services'
GROUP BY c.st_id, c.name, c.tenant_id;

-- ============================================================================
-- 5. HEALTH SCORE CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION crm.calculate_health_score(
    p_has_price BOOLEAN,
    p_has_cost BOOLEAN,
    p_has_image BOOLEAN,
    p_has_description BOOLEAN,
    p_has_category BOOLEAN,
    p_is_reviewed BOOLEAN,
    p_margin_ok BOOLEAN DEFAULT true
) RETURNS SMALLINT AS $$
DECLARE
    score SMALLINT := 0;
BEGIN
    IF p_has_price THEN score := score + 20; END IF;
    IF p_has_cost THEN score := score + 15; END IF;
    IF p_has_image THEN score := score + 15; END IF;
    IF p_has_description THEN score := score + 15; END IF;
    IF p_has_category THEN score := score + 15; END IF;
    IF p_is_reviewed THEN score := score + 10; END IF;
    IF p_margin_ok THEN score := score + 10; END IF;
    RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 6. BATCH UPDATE HEALTH SCORES FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION crm.update_health_scores(p_tenant_id TEXT DEFAULT '3222348440') 
RETURNS TABLE(materials_updated INT, services_updated INT) AS $$
DECLARE
    v_materials INT;
    v_services INT;
BEGIN
    -- Update materials health scores
    UPDATE master.pricebook_materials m
    SET 
        health_score = crm.calculate_health_score(
            price > 0,
            cost > 0,
            image_url IS NOT NULL AND image_url != '',
            description IS NOT NULL AND description != '',
            category_st_id IS NOT NULL AND category_st_id > 0,
            is_reviewed,
            CASE WHEN cost > 0 AND price > 0 THEN (price - cost) / price BETWEEN 0.05 AND 0.85 ELSE true END
        ),
        last_health_check = NOW()
    WHERE tenant_id = p_tenant_id;
    
    GET DIAGNOSTICS v_materials = ROW_COUNT;

    -- Update services health scores
    UPDATE master.pricebook_services s
    SET 
        health_score = crm.calculate_health_score(
            price > 0,
            true, -- services don't track cost the same way
            image_url IS NOT NULL AND image_url != '',
            description IS NOT NULL AND description != '',
            category_st_id IS NOT NULL AND category_st_id > 0,
            is_reviewed,
            true
        ),
        last_health_check = NOW()
    WHERE tenant_id = p_tenant_id;
    
    GET DIAGNOSTICS v_services = ROW_COUNT;

    RETURN QUERY SELECT v_materials, v_services;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. PENDING SYNC TRACKING
-- ============================================================================

-- Add sync tracking columns to master tables
ALTER TABLE master.pricebook_materials 
ADD COLUMN IF NOT EXISTS has_local_changes BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS local_changes_at TIMESTAMPTZ;

ALTER TABLE master.pricebook_services
ADD COLUMN IF NOT EXISTS has_local_changes BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS local_changes_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_materials_has_local_changes ON master.pricebook_materials(has_local_changes) WHERE has_local_changes = true;
CREATE INDEX IF NOT EXISTS idx_services_has_local_changes ON master.pricebook_services(has_local_changes) WHERE has_local_changes = true;

-- View for items with pending changes not pushed to ServiceTitan
CREATE OR REPLACE VIEW crm.v_pricebook_pending_sync AS
-- Services with local edits pending push
SELECT 
    'service' as entity_type,
    e.st_pricebook_id as st_id,
    s.code,
    s.name,
    e.sync_status,
    e.sync_error,
    e.updated_at as pending_since,
    s.tenant_id,
    jsonb_build_object(
        'price', e.override_price,
        'name', e.override_name,
        'description', e.override_description,
        'active', e.override_active,
        'category_st_id', e.override_category_st_id
    ) as pending_changes
FROM crm.pricebook_service_edits e
JOIN master.pricebook_services s ON s.st_id = e.st_pricebook_id AND s.tenant_id = e.tenant_id
WHERE e.sync_status IN ('pending', 'error')

UNION ALL

-- New materials created locally, not yet in ST
SELECT 
    'material' as entity_type,
    m.id::bigint as st_id,
    m.code,
    m.name,
    CASE WHEN m.sync_error IS NOT NULL THEN 'error' ELSE 'pending' END as sync_status,
    m.sync_error,
    m.created_at as pending_since,
    m.tenant_id,
    jsonb_build_object(
        'price', m.price,
        'cost', m.cost,
        'description', m.description,
        'category_st_id', m.category_st_id
    ) as pending_changes
FROM crm.pricebook_new_materials m
WHERE m.pushed_to_st = false;

-- Function to get pending sync counts
CREATE OR REPLACE FUNCTION crm.get_pending_sync_counts(p_tenant_id TEXT DEFAULT '3222348440')
RETURNS TABLE (
    entity_type TEXT,
    pending_count BIGINT,
    error_count BIGINT,
    oldest_pending TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.entity_type,
        COUNT(*) FILTER (WHERE v.sync_status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE v.sync_status = 'error') as error_count,
        MIN(v.pending_since) FILTER (WHERE v.sync_status = 'pending') as oldest_pending
    FROM crm.v_pricebook_pending_sync v
    WHERE v.tenant_id = p_tenant_id
    GROUP BY v.entity_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. FIND DUPLICATE MATERIALS FUNCTION
-- ============================================================================

-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_materials_name_trgm ON master.pricebook_materials USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_services_name_trgm ON master.pricebook_services USING gin (name gin_trgm_ops);

CREATE OR REPLACE FUNCTION crm.find_potential_duplicates(
    p_tenant_id TEXT DEFAULT '3222348440',
    p_entity_type TEXT DEFAULT 'materials',
    p_threshold DECIMAL DEFAULT 0.7,
    p_limit INT DEFAULT 100
) RETURNS TABLE (
    st_id_1 BIGINT,
    name_1 TEXT,
    code_1 TEXT,
    st_id_2 BIGINT,
    name_2 TEXT,
    code_2 TEXT,
    similarity DECIMAL
) AS $$
BEGIN
    IF p_entity_type = 'materials' THEN
        RETURN QUERY
        SELECT 
            m1.st_id as st_id_1,
            m1.name as name_1,
            m1.code as code_1,
            m2.st_id as st_id_2,
            m2.name as name_2,
            m2.code as code_2,
            ROUND(similarity(LOWER(m1.name), LOWER(m2.name))::decimal, 3) as similarity
        FROM master.pricebook_materials m1
        JOIN master.pricebook_materials m2 ON m1.st_id < m2.st_id AND m1.tenant_id = m2.tenant_id
        WHERE m1.tenant_id = p_tenant_id
        AND m1.active = true AND m2.active = true
        AND similarity(LOWER(m1.name), LOWER(m2.name)) >= p_threshold
        ORDER BY similarity DESC
        LIMIT p_limit;
    ELSE
        RETURN QUERY
        SELECT 
            s1.st_id as st_id_1,
            s1.name as name_1,
            s1.code as code_1,
            s2.st_id as st_id_2,
            s2.name as name_2,
            s2.code as code_2,
            ROUND(similarity(LOWER(s1.name), LOWER(s2.name))::decimal, 3) as similarity
        FROM master.pricebook_services s1
        JOIN master.pricebook_services s2 ON s1.st_id < s2.st_id AND s1.tenant_id = s2.tenant_id
        WHERE s1.tenant_id = p_tenant_id
        AND s1.active = true AND s2.active = true
        AND similarity(LOWER(s1.name), LOWER(s2.name)) >= p_threshold
        ORDER BY similarity DESC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. AUDIT LOG TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION crm.log_pricebook_change() RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB;
    v_entity_type TEXT;
BEGIN
    -- Determine entity type from table name
    v_entity_type := CASE TG_TABLE_NAME
        WHEN 'pricebook_materials' THEN 'material'
        WHEN 'pricebook_services' THEN 'service'
        WHEN 'pricebook_equipment' THEN 'equipment'
        WHEN 'pricebook_categories' THEN 'category'
        ELSE TG_TABLE_NAME
    END;

    IF TG_OP = 'UPDATE' THEN
        -- Build changes object for key fields
        v_changes := jsonb_build_object();
        
        IF OLD.name IS DISTINCT FROM NEW.name THEN
            v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
        END IF;
        IF OLD.price IS DISTINCT FROM NEW.price THEN
            v_changes := v_changes || jsonb_build_object('price', jsonb_build_object('old', OLD.price, 'new', NEW.price));
        END IF;
        IF OLD.active IS DISTINCT FROM NEW.active THEN
            v_changes := v_changes || jsonb_build_object('active', jsonb_build_object('old', OLD.active, 'new', NEW.active));
        END IF;
        IF OLD.is_reviewed IS DISTINCT FROM NEW.is_reviewed THEN
            v_changes := v_changes || jsonb_build_object('is_reviewed', jsonb_build_object('old', OLD.is_reviewed, 'new', NEW.is_reviewed));
        END IF;
        IF OLD.category_st_id IS DISTINCT FROM NEW.category_st_id THEN
            v_changes := v_changes || jsonb_build_object('category_st_id', jsonb_build_object('old', OLD.category_st_id, 'new', NEW.category_st_id));
        END IF;

        -- Only log if there were tracked changes
        IF v_changes != '{}'::jsonb THEN
            INSERT INTO crm.pricebook_audit_log (
                tenant_id, action, entity_type, entity_st_id, entity_name, changes, source
            ) VALUES (
                NEW.tenant_id, 'update', v_entity_type, NEW.st_id, NEW.name, v_changes, 'manual'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (drop first if exist to avoid errors)
DROP TRIGGER IF EXISTS trg_materials_audit ON master.pricebook_materials;
DROP TRIGGER IF EXISTS trg_services_audit ON master.pricebook_services;

CREATE TRIGGER trg_materials_audit
    AFTER UPDATE ON master.pricebook_materials
    FOR EACH ROW EXECUTE FUNCTION crm.log_pricebook_change();

CREATE TRIGGER trg_services_audit
    AFTER UPDATE ON master.pricebook_services
    FOR EACH ROW EXECUTE FUNCTION crm.log_pricebook_change();

-- ============================================================================
-- 10. INITIAL HEALTH SCORE CALCULATION
-- ============================================================================

-- Run initial health score calculation for default tenant
SELECT * FROM crm.update_health_scores('3222348440');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE crm.pricebook_saved_views IS 'User-defined filter/view presets for pricebook lists';
COMMENT ON TABLE crm.pricebook_audit_log IS 'Tracks all changes to pricebook items for undo and audit';
COMMENT ON TABLE crm.pricebook_duplicate_groups IS 'Potential duplicate items detected for review';
COMMENT ON TABLE crm.pricebook_category_suggestions IS 'AI-suggested category assignments';
COMMENT ON TABLE crm.pricebook_progress IS 'Daily progress tracking per user for gamification';
COMMENT ON TABLE crm.pricebook_achievements IS 'Unlocked achievements per user';
