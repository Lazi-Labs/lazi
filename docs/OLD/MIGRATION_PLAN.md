# LAZI Supabase Migration Plan

> Step-by-step guide to migrate LAZI from local PostgreSQL to Supabase
> Generated: December 2024

---

## Overview

This document provides a complete migration plan for moving the LAZI database to Supabase. The project is **already configured** to use Supabase in `services/api/.env`.

### Current State
- **Supabase Project:** `cvqduvqzkvqnjouuzldk`
- **Region:** `aws-1-us-east-2`
- **Connection:** Pooler (port 5432)
- **Database:** `postgres`

### Connection String
```
postgresql://postgres.cvqduvqzkvqnjouuzldk:Catchadmin202525@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require
```

---

## Pre-Migration Checklist

### 1. Supabase Project Setup
- [x] Supabase project created
- [x] Connection string configured in `.env`
- [ ] Enable required extensions in Supabase Dashboard
- [ ] Verify connection from local machine

### 2. Required Extensions
Enable these in Supabase Dashboard → Database → Extensions:

| Extension | Purpose | Status |
|-----------|---------|--------|
| `uuid-ossp` | UUID generation | Usually enabled by default |
| `pg_trgm` | Text search (trigram) | Enable manually |
| `pgvector` | Vector embeddings | Enable if using AI features |

### 3. Backup Current Data (if any)
```bash
# Export from local PostgreSQL
pg_dump -h localhost -U postgres -d perfectcatch -F c -f backup_$(date +%Y%m%d).dump
```

---

## Migration Steps

### Step 1: Test Supabase Connection

```bash
# Test connection from terminal
psql "postgresql://postgres.cvqduvqzkvqnjouuzldk:Catchadmin202525@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require" -c "SELECT NOW();"
```

### Step 2: Enable Extensions

Connect to Supabase and run:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Optional: Enable vector extension for AI features
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- Verify extensions
SELECT * FROM pg_extension;
```

### Step 3: Run Prisma Migrations

The project uses Prisma as the primary ORM. Run migrations:

```bash
cd services/api

# Generate Prisma client
npx prisma generate

# Push schema to Supabase (creates tables)
npx prisma db push

# Or run migrations if you have migration files
npx prisma migrate deploy
```

### Step 4: Verify Tables Created

```sql
-- Check all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should see tables like:
-- callrail_calls
-- chat_sessions
-- ghl_contacts
-- ghl_opportunities
-- messaging_log
-- raw_st_customers
-- raw_st_jobs
-- st_customers
-- st_jobs
-- workflow_definitions
-- etc.
```

### Step 5: Initialize Sync State

```sql
-- Insert initial sync state for all ServiceTitan endpoints
INSERT INTO raw_sync_state (table_name, endpoint, sync_status) VALUES 
    ('raw_st_customers', '/crm/v2/customers', 'pending'),
    ('raw_st_locations', '/crm/v2/locations', 'pending'),
    ('raw_st_jobs', '/jpm/v2/jobs', 'pending'),
    ('raw_st_appointments', '/jpm/v2/appointments', 'pending'),
    ('raw_st_estimates', '/sales/v2/estimates', 'pending'),
    ('raw_st_invoices', '/accounting/v2/invoices', 'pending'),
    ('raw_st_payments', '/accounting/v2/payments', 'pending'),
    ('raw_st_technicians', '/settings/v2/technicians', 'pending'),
    ('raw_st_employees', '/settings/v2/employees', 'pending'),
    ('raw_st_business_units', '/settings/v2/business-units', 'pending'),
    ('raw_st_campaigns', '/settings/v2/campaigns', 'pending'),
    ('raw_st_job_types', '/jpm/v2/job-types', 'pending'),
    ('raw_st_tag_types', '/settings/v2/tag-types', 'pending'),
    ('raw_st_pricebook_categories', '/pricebook/v2/categories', 'pending'),
    ('raw_st_pricebook_materials', '/pricebook/v2/materials', 'pending'),
    ('raw_st_pricebook_services', '/pricebook/v2/services', 'pending'),
    ('raw_st_pricebook_equipment', '/pricebook/v2/equipment', 'pending')
ON CONFLICT (table_name) DO NOTHING;
```

### Step 6: Test API Connection

```bash
cd services/api

# Start the API server
npm run dev

# Test health endpoint
curl http://localhost:3001/api/health
```

### Step 7: Run Initial Data Sync

Trigger a full sync from ServiceTitan:

```bash
# Via API endpoint (if available)
curl -X POST http://localhost:3001/api/sync/full

# Or manually trigger sync workers
# The API will automatically sync on startup if configured
```

---

## Environment Configuration

### Production Environment Variables

Create/update `services/api/.env.production`:

```bash
# ============================================
# LAZI Production Environment
# ============================================

NODE_ENV=production
PORT=3001

# Database - Supabase
DATABASE_URL="postgresql://postgres.cvqduvqzkvqnjouuzldk:Catchadmin202525@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require"
SERVICETITAN_DATABASE_URL="postgresql://postgres.cvqduvqzkvqnjouuzldk:Catchadmin202525@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require"

# Redis (required for job queues)
REDIS_URL="redis://localhost:6379"

# ServiceTitan API
SERVICE_TITAN_CLIENT_ID=cid.xghkglqvj2akkx3ws4x6jrvxa
SERVICE_TITAN_CLIENT_SECRET=cs12.rd0iu7fd04xfcugls7qzwww4e1qb8ak4pp54v8p624rhqibx0c
SERVICE_TITAN_APP_KEY=ak1.v91sddwsy32cykc7k75qsq2un
SERVICE_TITAN_TENANT_ID=3222348440

# Sync Configuration
PRICEBOOK_SYNC_SCHEDULER_ENABLED=true
PRICEBOOK_FULL_SYNC_CRON="0 2 * * *"
PRICEBOOK_INCREMENTAL_SYNC_CRON="0 */6 * * *"

# GHL Sync (disabled by default)
GHL_SYNC_ENABLED=false

# CRM Sync
CRM_SYNC_ENABLED=true
CRM_API_URL=http://localhost:3005
CRM_WEBHOOK_SECRET=pc-crm-webhook-secret-2025
```

---

## Supabase-Specific Considerations

### 1. Connection Pooling

Supabase uses PgBouncer for connection pooling. The code already handles this:

```javascript
// services/api/src/db/schema-connection.js
pool = new Pool({
  connectionString,
  max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false,
});
```

### 2. SSL Configuration

SSL is required for Supabase. The connection string includes `?sslmode=require`.

### 3. Row Level Security (RLS)

Supabase enables RLS by default on new tables. For the API to work:

```sql
-- Option 1: Disable RLS on tables (simpler for backend-only access)
ALTER TABLE st_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE st_jobs DISABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Option 2: Create policies for service role
-- The service role key bypasses RLS automatically
```

### 4. Database Limits

Supabase Free Tier limits:
- 500MB database size
- 2GB bandwidth per month
- 50MB file storage

For production, consider upgrading to Pro tier.

---

## Verification Queries

After migration, run these queries to verify:

```sql
-- 1. Check table counts
SELECT 
    schemaname,
    relname as table_name,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 2. Check sync state
SELECT table_name, sync_status, last_full_sync, records_count
FROM raw_sync_state
ORDER BY table_name;

-- 3. Check for data in key tables
SELECT COUNT(*) as customers FROM st_customers;
SELECT COUNT(*) as jobs FROM st_jobs;
SELECT COUNT(*) as invoices FROM st_invoices;
SELECT COUNT(*) as pricebook_services FROM raw_st_pricebook_services;

-- 4. Check indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## Rollback Plan

If migration fails:

### 1. Revert to Local PostgreSQL

Update `services/api/.env`:
```bash
DATABASE_URL=postgresql://postgres:perfectcatch2025@localhost:5432/perfectcatch
```

### 2. Restart Services
```bash
cd services/api
npm run dev
```

### 3. Restore from Backup (if needed)
```bash
pg_restore -h localhost -U postgres -d perfectcatch backup_YYYYMMDD.dump
```

---

## Post-Migration Tasks

### 1. Update DNS/Firewall
- Ensure server can reach Supabase endpoints
- Whitelist Supabase IPs if needed

### 2. Set Up Monitoring
- Enable Supabase database monitoring
- Set up alerts for connection issues

### 3. Configure Backups
- Supabase Pro includes daily backups
- Consider additional backup strategy for critical data

### 4. Performance Tuning
```sql
-- Analyze tables for query optimization
ANALYZE;

-- Check for missing indexes
SELECT 
    schemaname,
    relname,
    seq_scan,
    idx_scan,
    seq_tup_read,
    idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_tup_read DESC;
```

---

## Migration Checklist

### Pre-Migration
- [ ] Supabase project created
- [ ] Extensions enabled (uuid-ossp, pg_trgm)
- [ ] Connection tested from local machine
- [ ] Current data backed up (if any)

### Migration
- [ ] Prisma schema pushed to Supabase
- [ ] All tables created successfully
- [ ] Indexes created
- [ ] Sync state initialized
- [ ] RLS configured appropriately

### Post-Migration
- [ ] API connects successfully
- [ ] Health check passes
- [ ] ServiceTitan sync works
- [ ] Data appears in tables
- [ ] Frontend can query data

### Production Deployment
- [ ] Production .env configured
- [ ] Redis available for job queues
- [ ] SSL certificates configured
- [ ] Monitoring set up
- [ ] Backup strategy confirmed

---

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED
```
**Solution:** Check firewall rules, ensure Supabase project is active.

### SSL Required
```
Error: SSL connection is required
```
**Solution:** Add `?sslmode=require` to connection string.

### Permission Denied
```
Error: permission denied for table
```
**Solution:** Disable RLS or use service role key.

### Prepared Statement Error (PgBouncer)
```
Error: prepared statement does not exist
```
**Solution:** Use transaction mode or disable prepared statements in Prisma:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add this for PgBouncer compatibility
  directUrl = env("DIRECT_URL")
}
```

---

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma with Supabase](https://supabase.com/docs/guides/integrations/prisma)
- [PgBouncer Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
