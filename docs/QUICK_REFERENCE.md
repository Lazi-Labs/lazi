# LAZI Quick Reference

> Essential commands and information for LAZI project
> Generated: December 2024

---

## Project Structure

```
lazi/
├── apps/
│   └── web/                 # Next.js frontend (port 3000)
├── services/
│   └── api/                 # Express.js API (port 3001)
│       ├── src/
│       │   ├── routes/      # API endpoints
│       │   ├── workers/     # Sync workers
│       │   ├── sync/        # Sync logic
│       │   └── db/          # Database connections
│       └── prisma/          # Prisma schema
├── database/
│   ├── scripts/             # SQL schema files (01-14)
│   └── migrations/          # SQL migrations
├── docs/                    # Documentation
└── scripts/                 # Utility scripts
```

---

## Quick Start

### Development
```bash
# Start all services (from root)
pnpm dev

# Start API only
cd services/api && npm run dev

# Start web only
cd apps/web && npm run dev
```

### Database
```bash
# Generate Prisma client
cd services/api && npx prisma generate

# Push schema to database
cd services/api && npx prisma db push

# Open Prisma Studio
cd services/api && npx prisma studio
```

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SERVICE_TITAN_CLIENT_ID` | ServiceTitan OAuth client ID |
| `SERVICE_TITAN_CLIENT_SECRET` | ServiceTitan OAuth secret |
| `SERVICE_TITAN_APP_KEY` | ServiceTitan app key |
| `SERVICE_TITAN_TENANT_ID` | ServiceTitan tenant ID |

### Current Supabase Connection
```
postgresql://postgres.cvqduvqzkvqnjouuzldk:Catchadmin202525@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require
```

---

## API Endpoints

### Health & Status
- `GET /api/health` - Health check
- `GET /api/system/status` - System status

### Sync
- `POST /api/sync/full` - Trigger full sync
- `GET /api/sync/status` - Sync status

### Pricebook
- `GET /api/pricebook/categories` - List categories
- `GET /api/pricebook/services` - List services
- `GET /api/pricebook/materials` - List materials
- `GET /api/pricebook/equipment` - List equipment

### Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer

### Jobs
- `GET /api/jobs` - List jobs
- `GET /api/jobs/:id` - Get job

---

## Database Schemas

| Schema | Purpose | Tables |
|--------|---------|--------|
| `public` | Main tables (Prisma) | st_*, raw_st_*, workflow_*, etc. |
| `raw` | Raw ST data (SQL scripts) | st_customers, st_jobs, etc. |
| `master` | Denormalized views (SQL scripts) | customers, jobs, etc. |
| `crm` | CRM tables (SQL scripts) | contacts, pipelines, etc. |
| `workflow` | Automation (SQL scripts) | definitions, executions, etc. |
| `sync` | Sync tracking (SQL scripts) | outbound_queue, inbound_log, etc. |
| `audit` | Change history (SQL scripts) | change_log, api_log, etc. |

**Note:** Prisma uses `public` schema. SQL scripts define multi-schema architecture.

---

## Key Files

| File | Purpose |
|------|---------|
| `services/api/.env` | API environment config |
| `services/api/prisma/schema.prisma` | Database schema (Prisma) |
| `services/api/src/db/prisma.js` | Prisma client singleton |
| `services/api/src/db/schema-connection.js` | pg Pool connection |
| `services/api/src/server.js` | API entry point |
| `database/scripts/*.sql` | SQL schema definitions |

---

## Useful Commands

### Database
```bash
# Connect to Supabase
psql "$DATABASE_URL"

# Check table counts
psql "$DATABASE_URL" -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

# Check sync state
psql "$DATABASE_URL" -c "SELECT table_name, sync_status, records_count FROM raw_sync_state;"

# List all tables
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

### Docker
```bash
# Start all containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all containers
docker-compose down
```

### PM2 (Production)
```bash
# Start services
pm2 start ecosystem.config.js --env production

# View status
pm2 status

# View logs
pm2 logs

# Restart all
pm2 reload all
```

---

## Troubleshooting

### API won't start
1. Check `DATABASE_URL` is set correctly
2. Ensure Redis is running: `redis-cli ping`
3. Run `npx prisma generate`

### Database connection failed
1. Check connection string has `?sslmode=require` for Supabase
2. Verify network connectivity
3. Check Supabase project is active

### Sync not working
1. Check ServiceTitan credentials in `.env`
2. Verify `PRICEBOOK_SYNC_SCHEDULER_ENABLED=true`
3. Check sync logs: `pm2 logs lazi-api`

---

## Documentation

| Document | Description |
|----------|-------------|
| `docs/SCHEMA_INVENTORY.md` | Complete database schema reference |
| `docs/MIGRATION_PLAN.md` | Supabase migration guide |
| `docs/SERVER_DEPLOYMENT.md` | Production deployment guide |
| `docs/CONSOLIDATED_SCHEMA.sql` | All SQL in one file |

---

## Support

- **ServiceTitan Tenant ID:** 3222348440
- **Supabase Project:** cvqduvqzkvqnjouuzldk
- **Region:** aws-1-us-east-2
