# Database Migrations

This directory contains SQL migration scripts for the LAZI restructure.

## Migration Order

Run migrations in numerical order:

1. **001_create_raw_schema.sql** - Creates the `raw` schema and sync state tracking
2. **002_create_st_locations.sql** - Creates locations cache table
3. **003_create_st_jobs.sql** - Creates jobs cache table
4. **004_create_st_appointments.sql** - Creates appointments cache table
5. **005_create_st_technicians.sql** - Creates technicians cache table

## Running Migrations

### Option 1: Using psql

```bash
# Connect to your database
psql -h localhost -U your_user -d your_database

# Run each migration
\i migrations/001_create_raw_schema.sql
\i migrations/002_create_st_locations.sql
\i migrations/003_create_st_jobs.sql
\i migrations/004_create_st_appointments.sql
\i migrations/005_create_st_technicians.sql
```

### Option 2: Using a migration script

```bash
#!/bin/bash
# run-migrations.sh

DB_HOST="localhost"
DB_USER="your_user"
DB_NAME="your_database"

for file in migrations/*.sql; do
  echo "Running $file..."
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $file
done
```

### Option 3: All at once

```bash
cat migrations/*.sql | psql -h localhost -U your_user -d your_database
```

## Schema Overview

### raw.sync_state
Tracks synchronization status for each cached table per tenant.

**Columns:**
- `tenant_id` - Tenant identifier
- `table_name` - Name of the cached table
- `last_full_sync` - Timestamp of last full sync
- `last_incremental_sync` - Timestamp of last incremental sync
- `records_synced` - Number of records synced in last operation
- `last_error` - Last error message if sync failed

### raw.st_locations
Caches location data from ServiceTitan.

**Key Features:**
- Full address support with geocoding
- Customer relationship
- Zone and tax zone references
- Active status tracking
- JSONB storage for complete API response

### raw.st_jobs
Caches job data from ServiceTitan.

**Key Features:**
- Job lifecycle tracking (status, priority)
- Customer and location relationships
- Scheduling information
- Technician assignments (in full_data JSONB)
- Business unit and campaign tracking

### raw.st_appointments
Caches appointment data from ServiceTitan.

**Key Features:**
- Job and technician relationships
- Start/end times with arrival windows
- Status tracking
- Optimized for schedule queries

### raw.st_technicians
Caches technician data from ServiceTitan.

**Key Features:**
- Contact information
- Team and business unit assignments
- Skills and certifications (JSONB)
- Zone assignments
- Active status tracking

## Indexes

All tables include optimized indexes for:
- Tenant isolation queries
- Common filter combinations
- Date range queries
- JSONB searches (using GIN indexes)

## Performance Considerations

1. **JSONB Indexes**: GIN indexes on `full_data` columns enable fast JSON queries
2. **Composite Indexes**: Multi-column indexes for common query patterns
3. **Date Indexes**: Optimized for schedule and availability queries
4. **Tenant Isolation**: All queries are scoped by `tenant_id`

## Rollback

To rollback migrations:

```sql
-- Drop tables in reverse order
DROP TABLE IF EXISTS raw.st_technicians CASCADE;
DROP TABLE IF EXISTS raw.st_appointments CASCADE;
DROP TABLE IF EXISTS raw.st_jobs CASCADE;
DROP TABLE IF EXISTS raw.st_locations CASCADE;
DROP TABLE IF EXISTS raw.sync_state CASCADE;

-- Drop schema
DROP SCHEMA IF EXISTS raw CASCADE;
```

## Future Migrations

Additional migrations will be added for:
- LAZI-native tables (lazi.customers, lazi.jobs, etc.)
- Hybrid sync tables
- Audit logging tables
- Analytics and reporting tables
