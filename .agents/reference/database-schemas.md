# LAZI Database Schema Reference

## Overview

- **Database**: PostgreSQL 16 (hosted on Supabase)
- **Total Tables**: 169 across 8 schemas
- **Extensions**: uuid-ossp, vector, pg_trgm, ltree

## Schema Summary

| Schema | Tables | Purpose |
|--------|--------|---------|
| `raw` | 25 | Immutable ServiceTitan API data |
| `master` | 17 | Normalized/computed CRM data |
| `crm` | 16 | Local overrides & CRM entities |
| `pricing` | 14 | Pricing calculator data |
| `public` | 54 | Auth, Plaid, legacy tables |
| `sync` | 5 | Sync queue & tracking |
| `audit` | 9 | Change logs (partitioned) |
| `workflow` | 8 | Automation definitions |

---

## raw.* Schema (ServiceTitan Data)

### st_pricebook_categories
```sql
CREATE TABLE raw.st_pricebook_categories (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,        -- ServiceTitan ID
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    image TEXT,                           -- ST image path
    subcategories JSONB,                  -- Nested subcategories
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    raw_data JSONB                        -- Full API response
);
```

### st_pricebook_materials
```sql
CREATE TABLE raw.st_pricebook_materials (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    cost DECIMAL(18,4),
    price DECIMAL(18,4),
    member_price DECIMAL(18,4),
    add_on_price DECIMAL(18,4),
    active BOOLEAN DEFAULT true,
    category_ids BIGINT[],
    images JSONB DEFAULT '[]',
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    raw_data JSONB
);
```

### st_pricebook_services
```sql
CREATE TABLE raw.st_pricebook_services (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    price DECIMAL(18,4),
    member_price DECIMAL(18,4),
    duration_hours DECIMAL(10,4),
    active BOOLEAN DEFAULT true,
    category_ids BIGINT[],
    materials JSONB DEFAULT '[]',        -- Service materials
    equipment JSONB DEFAULT '[]',        -- Service equipment
    images JSONB DEFAULT '[]',
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    raw_data JSONB
);
```

### st_pricebook_equipment
```sql
CREATE TABLE raw.st_pricebook_equipment (
    id BIGSERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    cost DECIMAL(18,4),
    price DECIMAL(18,4),
    active BOOLEAN DEFAULT true,
    category_ids BIGINT[],
    images JSONB DEFAULT '[]',
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    raw_data JSONB
);
```

### sync_state
```sql
CREATE TABLE raw.sync_state (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) UNIQUE NOT NULL,
    last_sync_at TIMESTAMPTZ,
    last_modified_on TIMESTAMPTZ,        -- ST modifiedOn cursor
    records_count INT DEFAULT 0,
    sync_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);
```

---

## master.* Schema (CRM-Ready Data)

### pricebook_categories
```sql
CREATE TABLE master.pricebook_categories (
    id SERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id VARCHAR(50) NOT NULL,
    raw_id BIGINT REFERENCES raw.st_pricebook_categories(id),
    
    -- Category Data
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),           -- CRM override
    description TEXT,
    image_url TEXT,
    category_type VARCHAR(20) NOT NULL,  -- 'Materials' or 'Services'
    
    -- Hierarchy (ltree extension)
    parent_st_id BIGINT REFERENCES master.pricebook_categories(st_id),
    depth INT NOT NULL DEFAULT 0,
    path LTREE,                          -- e.g., 'root.parent.child'
    sort_order INT NOT NULL DEFAULT 0,
    global_sort_order INT,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_visible_crm BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    business_unit_ids BIGINT[] DEFAULT '{}',
    item_count INT NOT NULL DEFAULT 0,
    subcategory_count INT NOT NULL DEFAULT 0,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Key indexes
CREATE INDEX idx_pricebook_categories_path ON master.pricebook_categories USING GIST(path);
CREATE INDEX idx_pricebook_categories_type ON master.pricebook_categories(category_type);
CREATE INDEX idx_pricebook_categories_parent ON master.pricebook_categories(parent_st_id);
```

### pricebook_subcategories
```sql
CREATE TABLE master.pricebook_subcategories (
    id SERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    parent_st_id BIGINT NOT NULL REFERENCES master.pricebook_categories(st_id),
    tenant_id VARCHAR(50) NOT NULL,
    
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    image_url TEXT,
    
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_visible_crm BOOLEAN NOT NULL DEFAULT true,
    
    item_count INT NOT NULL DEFAULT 0,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### pricebook_materials
```sql
CREATE TABLE master.pricebook_materials (
    id SERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id VARCHAR(50) NOT NULL,
    
    -- Basic Info
    code VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    display_name VARCHAR(500),
    description TEXT,
    
    -- Pricing
    cost DECIMAL(18,4),
    price DECIMAL(18,4),
    member_price DECIMAL(18,4),
    add_on_price DECIMAL(18,4),
    add_on_member_price DECIMAL(18,4),
    
    -- Labor & Commission
    hours DECIMAL(10,4),
    bonus DECIMAL(18,4),
    commission_bonus DECIMAL(18,4),
    pays_commission BOOLEAN DEFAULT false,
    deduct_as_job_cost BOOLEAN DEFAULT false,
    
    -- Flags
    active BOOLEAN DEFAULT true,
    taxable BOOLEAN DEFAULT true,
    is_inventory BOOLEAN DEFAULT false,
    is_configurable_material BOOLEAN DEFAULT false,
    display_in_amount BOOLEAN DEFAULT true,
    is_other_direct_cost BOOLEAN DEFAULT false,
    chargeable_by_default BOOLEAN DEFAULT true,
    
    -- Product Details
    manufacturer VARCHAR(255),
    model_number VARCHAR(255),
    unit_of_measure VARCHAR(50),
    
    -- Categories & Images
    category_ids BIGINT[],
    images JSONB DEFAULT '[]',
    default_image_url TEXT,
    
    -- Review Status
    is_reviewed BOOLEAN DEFAULT false,
    reviewed_at TIMESTAMPTZ,
    reviewed_by VARCHAR(255),
    
    -- Timestamps
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### pricebook_services
```sql
CREATE TABLE master.pricebook_services (
    id SERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE NOT NULL,
    tenant_id VARCHAR(50) NOT NULL,
    
    -- Basic Info
    code VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    display_name VARCHAR(500),
    description TEXT,
    
    -- Pricing
    price DECIMAL(18,4),
    member_price DECIMAL(18,4),
    add_on_price DECIMAL(18,4),
    member_add_on_price DECIMAL(18,4),
    
    -- Labor
    duration_hours DECIMAL(10,4),
    labor_cost DECIMAL(18,4),
    material_cost DECIMAL(18,4),
    
    -- Commission
    bonus DECIMAL(18,4),
    surcharge_percent DECIMAL(10,4),
    margin_percent DECIMAL(10,4),
    
    -- Flags
    active BOOLEAN DEFAULT true,
    taxable BOOLEAN DEFAULT true,
    no_discounts BOOLEAN DEFAULT false,
    
    -- Categories & Images
    category_ids BIGINT[],
    images JSONB DEFAULT '[]',
    default_image_url TEXT,
    
    -- Service Components
    materials JSONB DEFAULT '[]',
    equipment JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    upgrades JSONB DEFAULT '[]',
    
    -- Review Status
    is_reviewed BOOLEAN DEFAULT false,
    
    -- Timestamps
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### material_kits (LAZI-only feature)
```sql
CREATE TABLE master.material_kits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    group_id INT REFERENCES master.material_kit_groups(id),
    tenant_id VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE master.material_kit_items (
    id SERIAL PRIMARY KEY,
    kit_id INT NOT NULL REFERENCES master.material_kits(id) ON DELETE CASCADE,
    material_st_id BIGINT NOT NULL,
    quantity DECIMAL(10,4) NOT NULL DEFAULT 1,
    sort_order INT DEFAULT 0
);

CREATE TABLE master.material_kit_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50),
    tenant_id VARCHAR(50) NOT NULL,
    sort_order INT DEFAULT 0
);
```

---

## crm.* Schema (Local Overrides)

### pricebook_overrides
```sql
CREATE TABLE crm.pricebook_overrides (
    id SERIAL PRIMARY KEY,
    st_pricebook_id BIGINT NOT NULL,      -- References master.* st_id
    tenant_id VARCHAR(50) NOT NULL,
    item_type VARCHAR(50) NOT NULL,       -- 'category', 'material', 'service', 'equipment'
    
    -- Override Fields
    override_name VARCHAR(500),
    override_description TEXT,
    override_price DECIMAL(18,4),
    override_member_price DECIMAL(18,4),
    override_cost DECIMAL(18,4),
    override_image_data BYTEA,            -- Local image pending upload
    override_image_mime_type VARCHAR(100),
    delete_image BOOLEAN DEFAULT false,
    override_position INT,
    override_parent_id BIGINT,
    
    -- Material-specific overrides
    override_add_on_price DECIMAL(18,4),
    override_add_on_member_price DECIMAL(18,4),
    override_hours DECIMAL(10,4),
    override_bonus DECIMAL(18,4),
    override_commission_bonus DECIMAL(18,4),
    override_pays_commission BOOLEAN,
    override_deduct_as_job_cost BOOLEAN,
    override_is_inventory BOOLEAN,
    override_unit_of_measure VARCHAR(50),
    
    -- Sync Status
    pending_sync BOOLEAN DEFAULT true,
    sync_error TEXT,
    last_synced_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(st_pricebook_id, item_type, tenant_id)
);
```

### pricebook_new_materials
```sql
CREATE TABLE crm.pricebook_new_materials (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    
    -- Material Data (not yet in ServiceTitan)
    code VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    cost DECIMAL(18,4),
    price DECIMAL(18,4),
    member_price DECIMAL(18,4),
    add_on_price DECIMAL(18,4),
    unit_of_measure VARCHAR(50),
    category_ids BIGINT[],
    
    -- Image
    image_data BYTEA,
    image_mime_type VARCHAR(100),
    
    -- Sync Status
    pending_push BOOLEAN DEFAULT true,
    st_id BIGINT,                         -- Populated after push
    push_error TEXT,
    pushed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### pipelines & pipeline_stages
```sql
CREATE TABLE crm.pipelines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    tenant_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE crm.pipeline_stages (
    id SERIAL PRIMARY KEY,
    pipeline_id INT NOT NULL REFERENCES crm.pipelines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT '#6B7280',
    display_order INT NOT NULL DEFAULT 0,
    is_won BOOLEAN DEFAULT false,
    is_lost BOOLEAN DEFAULT false,
    probability_percent INT DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## public.* Schema (Auth & Integrations)

### app_users
```sql
CREATE TABLE public.app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',      -- 'admin', 'user', 'viewer'
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### app_sessions
```sql
CREATE TABLE public.app_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(50),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### bank_transactions (Plaid)
```sql
CREATE TABLE public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plaid_transaction_id VARCHAR(255) UNIQUE,
    account_id UUID REFERENCES public.plaid_accounts(id),
    amount DECIMAL(18,4) NOT NULL,
    date DATE NOT NULL,
    name VARCHAR(500),
    merchant_name VARCHAR(255),
    category JSONB,
    pending BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## sync.* Schema

### outbound_queue
```sql
CREATE TABLE sync.outbound_queue (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,     -- 'material', 'service', 'category'
    entity_id BIGINT NOT NULL,
    operation VARCHAR(20) NOT NULL,       -- 'create', 'update', 'delete'
    payload JSONB NOT NULL,
    priority INT DEFAULT 5,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## audit.* Schema (Partitioned)

### change_log
```sql
CREATE TABLE audit.change_log (
    id BIGSERIAL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL,          -- 'create', 'update', 'delete'
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    user_id VARCHAR(100),
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions
CREATE TABLE audit.change_log_2024 PARTITION OF audit.change_log
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE audit.change_log_2025 PARTITION OF audit.change_log
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit.change_log_2026 PARTITION OF audit.change_log
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

---

## Common Queries

### Get categories with pending changes
```sql
SELECT 
    c.*,
    po.override_name,
    po.pending_sync
FROM master.pricebook_categories c
LEFT JOIN crm.pricebook_overrides po 
    ON po.st_pricebook_id = c.st_id 
    AND po.item_type = 'category'
WHERE po.pending_sync = true;
```

### Get materials with review status
```sql
SELECT 
    m.st_id,
    m.code,
    m.name,
    m.price,
    m.is_reviewed,
    CASE 
        WHEN m.default_image_url IS NULL THEN 'no_image'
        WHEN m.description IS NULL THEN 'no_description'
        WHEN m.price = 0 THEN 'zero_price'
        ELSE 'complete'
    END as status
FROM master.pricebook_materials m
WHERE m.active = true
ORDER BY m.is_reviewed ASC, m.name;
```

### Get category tree with counts
```sql
WITH RECURSIVE category_tree AS (
    SELECT 
        id, st_id, name, parent_st_id, depth, path,
        item_count, subcategory_count
    FROM master.pricebook_categories
    WHERE parent_st_id IS NULL AND category_type = 'Materials'
    
    UNION ALL
    
    SELECT 
        c.id, c.st_id, c.name, c.parent_st_id, c.depth, c.path,
        c.item_count, c.subcategory_count
    FROM master.pricebook_categories c
    JOIN category_tree ct ON c.parent_st_id = ct.st_id
)
SELECT * FROM category_tree ORDER BY path;
```

---

## Migrations

Located in `database/migrations/`:

| File | Purpose |
|------|---------|
| `001_pricebook_schema.sql` | Core pricebook tables |
| `002_servicetitan_complete.sql` | Full ST entity tables |
| `003_workflow_engine.sql` | Workflow automation |
| `011_crm_sync.sql` | CRM pipeline sync |
| `015_materials_st_fields.sql` | Material CRUD fields |
| `020_master_pricebook_categories.sql` | Category hierarchy |
| `023_material_kits.sql` | Kit feature |
| `026_kanban_boards.sql` | Kanban UI support |
| `027_service_edits.sql` | Service edit tracking |

---

*Database documentation generated from schema analysis - January 2025*
