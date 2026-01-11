# LAZI Database Rules

## Schema Architecture

### Three-Schema Design

| Schema | Purpose | Mutability |
|--------|---------|------------|
| `raw` | Immutable ServiceTitan data | Read-only (sync only) |
| `master` | Processed/normalized data | Read-only (derived) |
| `crm` | Local overrides and new items | Read-write |
| `sync` | Sync state and queues | System managed |
| `audit` | Change history | Append-only |

### Schema Rules

1. **Never modify `raw.*` tables directly** - Only via sync workers
2. **Never modify `master.*` tables directly** - Derived from raw + crm
3. **All user edits go to `crm.*`** - As overrides or new items
4. **Always use schema prefix** - `master.pricebook_materials`, not `pricebook_materials`

---

## Naming Conventions

### Tables
- Plural, snake_case: `pricebook_materials`, `sync_state`
- Prefix with schema: `raw.st_customers`

### Columns
- snake_case: `created_at`, `st_id`
- ServiceTitan IDs: `st_id` (BIGINT)
- Foreign keys: `<table>_id` or `<table>_st_id`
- Timestamps: `*_at` suffix
- Booleans: `is_*` prefix

### Indexes
- Format: `idx_<table>_<column(s)>`
- Example: `idx_materials_tenant_id`

---

## Required Columns

### All Tables
```sql
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### ServiceTitan-Synced Tables
```sql
st_id BIGINT UNIQUE,           -- ServiceTitan ID
tenant_id VARCHAR(20) NOT NULL DEFAULT '3222348440',
fetched_at TIMESTAMPTZ,        -- Last sync time
full_data JSONB                -- Raw ST response
```

### Override Tables
```sql
pending_sync BOOLEAN DEFAULT true,
sync_error TEXT,
synced_at TIMESTAMPTZ
```

---

## Query Patterns

### Always Parameterized
```javascript
// CORRECT
const result = await pool.query(
    'SELECT * FROM master.pricebook_materials WHERE st_id = $1',
    [stId]
);

// WRONG - SQL injection risk
const result = await pool.query(
    `SELECT * FROM master.pricebook_materials WHERE st_id = ${stId}`
);
```

### Always Include Tenant
```javascript
// CORRECT
const result = await pool.query(
    'SELECT * FROM master.pricebook_materials WHERE tenant_id = $1',
    [tenantId]
);

// WRONG - Returns all tenants' data
const result = await pool.query(
    'SELECT * FROM master.pricebook_materials'
);
```

### Use Pagination
```javascript
// CORRECT
const result = await pool.query(
    `SELECT * FROM master.pricebook_materials 
     WHERE tenant_id = $1 
     ORDER BY name 
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
);

// WRONG - May return millions of rows
const result = await pool.query(
    'SELECT * FROM master.pricebook_materials'
);
```

---

## Migration Rules

### File Naming
```
database/migrations/XXX_description.sql
```
- XXX = 3-digit sequential number
- description = snake_case feature name

### Migration Structure
```sql
-- Migration: 025_feature_name
-- Description: What this migration does
-- Author: Name
-- Date: YYYY-MM-DD

BEGIN;

-- UP: Apply changes
CREATE TABLE ...;
ALTER TABLE ...;
CREATE INDEX ...;

-- DOWN (commented): Rollback
-- DROP TABLE IF EXISTS ...;
-- ALTER TABLE ... DROP COLUMN ...;

COMMIT;
```

### Rules
1. **Always wrap in transaction** (`BEGIN; ... COMMIT;`)
2. **Include rollback comments** (for manual rollback)
3. **Test on dev first** before production
4. **Never modify existing migrations** - Create new one
5. **Add indexes for foreign keys** and common query columns

---

## Index Guidelines

### When to Add Index
- Foreign key columns
- Columns used in WHERE clauses
- Columns used in ORDER BY
- Columns used in JOIN conditions

### When NOT to Add Index
- Columns rarely queried
- Tables with < 1000 rows
- Columns with low cardinality (few unique values)

### Index Types
```sql
-- B-tree (default) - equality and range
CREATE INDEX idx_materials_price ON master.pricebook_materials(price);

-- GIN - JSONB and arrays
CREATE INDEX idx_materials_category_ids ON master.pricebook_materials USING GIN(category_ids);

-- Partial - filtered subset
CREATE INDEX idx_materials_active ON master.pricebook_materials(st_id) WHERE is_active = true;
```

---

## Performance Rules

### Avoid N+1 Queries
```javascript
// WRONG - N+1 queries
for (const material of materials) {
    const category = await getCategory(material.category_id);
}

// CORRECT - Single query with JOIN
const result = await pool.query(`
    SELECT m.*, c.name as category_name
    FROM master.pricebook_materials m
    LEFT JOIN master.pricebook_categories c ON c.st_id = ANY(m.category_ids)
    WHERE m.tenant_id = $1
`, [tenantId]);
```

### Use EXPLAIN ANALYZE
```sql
EXPLAIN ANALYZE SELECT * FROM master.pricebook_materials WHERE name ILIKE '%pool%';
```

### Connection Pooling
- Max connections: 20 (default)
- Always release connections (use `finally`)
- Don't hold connections during async operations

---

## Data Integrity

### Constraints
```sql
-- NOT NULL for required fields
name VARCHAR(255) NOT NULL,

-- UNIQUE for natural keys
st_id BIGINT UNIQUE,

-- CHECK for valid values
price DECIMAL(10,2) CHECK (price >= 0),

-- FOREIGN KEY for relationships
FOREIGN KEY (category_id) REFERENCES master.pricebook_categories(st_id)
```

### Soft Deletes
```sql
-- Prefer soft delete
is_deleted BOOLEAN DEFAULT false,
deleted_at TIMESTAMPTZ

-- Query active records
WHERE is_deleted = false
```

---

## Backup & Recovery

### Before Destructive Operations
```bash
# Backup table
pg_dump -t schema.table_name "$DATABASE_URL" > backup.sql

# Or create copy
CREATE TABLE schema.table_name_backup AS SELECT * FROM schema.table_name;
```

### Rollback Migration
```sql
-- Use the DOWN section from migration
DROP TABLE IF EXISTS schema.new_table;
ALTER TABLE schema.table DROP COLUMN new_column;
```

---

*Database rules - LAZI AI*
