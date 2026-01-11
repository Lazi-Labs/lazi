---
description: Create a new database migration
argument-hint: [migration-name]
allowed-tools: Bash(*), Read, Write, Edit
---

# Command: /migration-create

Create a new database migration.

## Usage
```
/migration-create <description>
```

## Process

### 1. Determine Next Number
```bash
ls database/migrations/ | tail -5
# Find highest number, increment by 1
```

### 2. Create Migration File
```
database/migrations/XXX_<description>.sql
```

### 3. Write Migration

```sql
-- Migration: XXX_<description>
-- Description: <what this does>
-- Author: <name>
-- Date: <YYYY-MM-DD>

BEGIN;

-- ============================================
-- UP Migration
-- ============================================

-- Create table
CREATE TABLE schema.table_name (
    id SERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE,
    tenant_id VARCHAR(20) NOT NULL DEFAULT '3222348440',
    -- columns
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_table_column ON schema.table(column);

-- ============================================
-- DOWN Migration (commented)
-- ============================================
-- DROP TABLE IF EXISTS schema.table_name;

COMMIT;
```

## LAZI Schema Rules

| Schema | Purpose | Use For |
|--------|---------|---------|
| `raw` | Immutable ST data | ST sync tables |
| `master` | Processed data | Normalized entities |
| `crm` | Local overrides | User edits, new items |
| `sync` | Sync tracking | Sync state, queues |
| `audit` | Change history | Audit logs |

## Naming Conventions
- Tables: `snake_case`, plural
- Columns: `snake_case`
- ST IDs: `st_id` (BIGINT)
- Timestamps: `*_at` suffix
- Booleans: `is_*` prefix

## Run Migration
```bash
psql "$DATABASE_URL" -f database/migrations/XXX_description.sql
```
