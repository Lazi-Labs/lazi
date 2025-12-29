# LAZI Windsurf Optimization Setup
## Rules & Workflows Configuration

**Purpose:** Configure Windsurf for optimal long-term LAZI development
**Last Updated:** December 26, 2024
**Verified Against:** Actual implementation

---

# Quick Setup Guide

## Step 1: Open Windsurf Settings

```
Settings → Rules, Memories & Workflows → Workspace tab
```

## Step 2: Add the Rules (8 total)

## Step 3: Add the Workflows (8 total)

---

# RULES

**Click: + Add Rule**

| Rule | Setting |
|------|---------|
| `lazi-project-context` | **Always On** |
| `lazi-code-standards` | **Always On** |
| `lazi-servicetitan-integration` | **Always On** |
| `lazi-provider-pattern` | **Always On** |
| `lazi-safety` | **Always On** |
| `lazi-sync-engine` | **Manual** |
| `lazi-pricebook` | **Manual** |
| `lazi-docker` | **Manual** |

---

## rule: lazi-project-context
**Setting: Always On**

```
LAZI PROJECT CONTEXT:

Project: LAZI AI - ServiceTitan Enhancement Platform
Purpose: Middleware between ServiceTitan (FSM) and business systems

Architecture:
- Provider Pattern: ServiceTitan → LAZI → Hybrid
- V2 API at /api/v2/* with X-Tenant-ID header
- Supabase database (8 schemas: raw, master, crm, sync, pricebook, servicetitan, integrations, public)
- Socket.io 4.7 for real-time updates
- BullMQ 5.66 + Redis for job queues
- Prisma ORM for database access
- Docker: lazi-api (3001), lazi-web (3000), lazi-redis (6379)

Completed:
- 17 provider interfaces, 6 ST providers implemented
- 35+ V2 endpoints, 478 ST endpoints cataloged
- Pricebook: 4 phases complete (nested subcats, auto-sync, Socket.io, drag-drop)
- Scheduling module: technicians, teams, zones, job types
- Production hardening complete

Key Discovery:
- Subcategories ARE categories in ST (same endpoint with parentId)
- Use Supabase ltree extension for hierarchical paths

Tenant ID: 3222348440

Key Files:
- stClient: services/api/src/services/stClient.js
- Factory: services/api/src/providers/factory.js
- V2 Routes: services/api/src/routes/v2.routes.js
- Prisma: services/api/prisma/schema.prisma
- Sync Engine: services/api/src/sync/
- Socket.io: services/api/src/lib/socket.js
- BullMQ: services/api/src/workers/bullmq/
- Docs: docs/CONSOLIDATED_DOCUMENTATION.md
```

---

## rule: lazi-code-standards
**Setting: Always On**

```
LAZI CODE STANDARDS:

File Structure:
- Routes: modules/{domain}/{domain}.routes.js
- Controllers: modules/{domain}/{domain}.controller.js
- Services: modules/{domain}/{domain}.service.js
- Providers: providers/servicetitan/{domain}.provider.js

Naming:
- Use camelCase for variables and functions
- Use PascalCase for classes
- Use kebab-case for file names
- Prefix ST IDs with st_id, LAZI IDs with id

Database (Supabase via Prisma):
- Raw ST data goes in raw.st_* tables
- Always include tenant_id in queries
- Store full API responses in full_data JSONB column
- Use fetched_at for cache invalidation
- Run migrations: npx prisma migrate deploy
- View data: npx prisma studio

API:
- All V2 endpoints require X-Tenant-ID header
- Return { success: true, data: ... } or { error: '...' }
- Use proper HTTP status codes (200, 201, 400, 404, 500)
```

---

## rule: lazi-servicetitan-integration
**Setting: Always On**

```
SERVICETITAN API RULES:

Authentication:
- OAuth 2.0 client credentials flow
- Token endpoint: https://auth.servicetitan.io/connect/token
- Refresh tokens 5 minutes before expiry
- Always include ST-App-Key header

API Calls:
- Base URL: https://api.servicetitan.io
- Path format: /{domain}/v2/tenant/{tenantId}/{resource}
- Handle pagination with page/pageSize params
- Respect rate limits with 250ms delay between requests

Data Handling:
- Store exact API responses without transformation first
- Map to LAZI types only in provider layer
- Cache in raw.st_* tables
- Update sync_state after each sync

Error Handling:
- Retry 401 with token refresh (once)
- Retry 429 with exponential backoff
- Retry 5xx up to 3 times
- Log all errors with context
```

---

## rule: lazi-provider-pattern
**Setting: Always On**

```
PROVIDER PATTERN RULES:

Interface First:
- Every provider must implement its interface
- Interfaces define the contract (list, get, create, update, delete, sync)
- Use JSDoc for type hints

Factory Pattern:
- Always get providers via factory: getCustomerProvider(tenantId)
- Factory checks feature flags for provider selection
- Default to 'servicetitan' provider

Data Flow:
1. Check local cache (raw.st_* table)
2. If miss or stale, fetch from ST API
3. Cache result before returning
4. Return mapped data (not raw ST format)

Feature Flags:
- Format: tenant.{tenantId}.{domain}.provider
- Values: 'servicetitan' | 'lazi' | 'hybrid'
- Check with getFeatureFlag(key, defaultValue)
```

---

## rule: lazi-safety
**Setting: Always On**

```
SAFETY RULES:

Never:
- Hardcode credentials or connection strings
- Commit .env files
- Return raw errors to clients
- Skip tenant isolation
- Allow cross-tenant data access
- Delete production data without confirmation

Always:
- Validate input before processing
- Log errors with request context
- Use Prisma parameterized queries (no SQL injection)
- Check tenant_id matches authenticated user
- Handle null/undefined gracefully
```

---

## rule: lazi-sync-engine
**Setting: Manual**

```
SYNC ENGINE RULES:

Pattern (3-layer):
- Fetchers: Retrieve data from ServiceTitan API
- Comparators: Detect changes between ST and local
- Appliers: Apply CRUD operations to Supabase via Prisma

File Structure:
- services/api/src/sync/{domain}/
  - fetcher.js - ST API calls with pagination
  - comparator.js - Change detection logic
  - applier.js - Database operations
  - index.js - Orchestration

Sync State:
- Track in raw.sync_state table
- Fields: table_name, last_sync, record_count, status
- Update after each sync operation

Real-time Events:
- Emit via Socket.io after sync completes
- Pattern: pricebook:categories:synced, sync:started, sync:completed
- Include counts and timestamps in payload

Scheduling:
- Full sync: 3:00 AM daily
- Incremental: Every 4 hours
- Use node-cron for scheduling
- BullMQ for job processing

Caching:
- Use node-cache with 15-minute TTL
- Cache capacity and availability data
- Invalidate on sync completion
```

---

## rule: lazi-pricebook
**Setting: Manual**

```
PRICEBOOK RULES:

Subcategory Handling:
- Subcategories ARE categories with parentId set
- Use recursive extraction for nested levels (up to 8 deep)
- Store hierarchy in ltree 'path' column
- Track depth with 'depth' column (1-8)

Database Schema:
- raw.st_pricebook_categories - ST category data
- pricebook.subcategories - Nested subcategory hierarchy
- Columns: st_id, parent_st_id, parent_subcategory_st_id, depth, path, name

Sync Order:
1. Fetch categories from ST
2. Extract subcategories recursively
3. Upsert to Supabase with ON CONFLICT
4. Update sync_state
5. Emit Socket.io event

Reordering (with @dnd-kit):
- PATCH /api/v2/pricebook/categories/:id/reorder
- PATCH /api/v2/pricebook/subcategories/:id/reorder
- Update sort_order in database
- Emit reorder event via Socket.io
```

---

## rule: lazi-docker
**Setting: Manual**

```
DOCKER RULES:

Containers:
- lazi-api: Express.js API (port 3001)
- lazi-web: Next.js frontend (port 3000)
- lazi-redis: Redis 7 Alpine (port 6379)

Commands:
- Start: docker-compose -f docker-compose.production.yml up -d
- Stop: docker-compose -f docker-compose.production.yml down
- Logs: docker logs lazi-api --tail 100
- Rebuild: docker-compose -f docker-compose.production.yml up -d --build

Health Checks:
- API: curl http://localhost:3001/health
- Ready: curl http://localhost:3001/ready
- Metrics: curl http://localhost:3001/metrics

Never:
- Run docker commands with --force-rm on production
- Delete volumes without backup
- Expose Redis port externally
```

---

# WORKFLOWS

**Click: + Add Workflow**

| Workflow | Setting |
|----------|---------|
| `add-new-provider` | **Manual** |
| `add-new-endpoint` | **Manual** |
| `sync-servicetitan-data` | **Manual** |
| `debug-api-issue` | **Manual** |
| `sync-pricebook` | **Manual** |
| `sync-scheduling` | **Manual** |
| `deploy-production` | **Manual** |
| `manage-bullmq-jobs` | **Manual** |

---

## workflow: add-new-provider
**Setting: Manual**

```
STEPS TO ADD A NEW PROVIDER:

1. CREATE INTERFACE
   File: providers/interfaces/I{Domain}Provider.js
   - Define types with JSDoc
   - Export interface methods: list, get, create, update, delete, syncFromExternal

2. CREATE ST PROVIDER
   File: providers/servicetitan/{domain}.provider.js
   - Import stClient
   - Import Prisma client
   - Implement all interface methods
   - Add caching logic
   - Add field mapping (ST → LAZI format)

3. CREATE LAZI PLACEHOLDER
   File: providers/lazi/{domain}.provider.js
   - Stub implementation
   - Throw 'Not implemented' for now

4. REGISTER IN FACTORY
   File: providers/factory.js
   - Add import for new provider
   - Add to PROVIDER_MAP
   - Export getter function: get{Domain}Provider(tenantId)

5. CREATE MODULE (if needed)
   Folder: modules/{domain}/
   - {domain}.routes.js - Express routes
   - {domain}.controller.js - Request handlers
   - {domain}.service.js - Business logic using provider

6. MOUNT ROUTES
   File: routes/v2.routes.js
   - Import module routes
   - Mount at /api/v2/{domain}

7. TEST
   - Add endpoint tests to tests/st-endpoints/config.js
   - Run test runner
   - Save reference responses
```

---

## workflow: add-new-endpoint
**Setting: Manual**

```
STEPS TO ADD A NEW ENDPOINT:

1. ADD ROUTE
   File: modules/{domain}/{domain}.routes.js

   router.get('/new-endpoint', rbac('domain:read'), controller.newEndpoint);

2. ADD CONTROLLER
   File: modules/{domain}/{domain}.controller.js

   const newEndpoint = async (req, res, next) => {
     try {
       const { tenantId } = req;
       const result = await service.newMethod(tenantId, req.params, req.query);
       res.json({ success: true, data: result });
     } catch (error) {
       next(error);
     }
   };

3. ADD SERVICE METHOD
   File: modules/{domain}/{domain}.service.js

   const newMethod = async (tenantId, params, query) => {
     const provider = get{Domain}Provider(tenantId);
     return provider.someMethod(tenantId, params);
   };

4. ADD TO PROVIDER (if needed)
   File: providers/servicetitan/{domain}.provider.js

   async someMethod(tenantId, params) {
     // Implementation
   }

5. ADD VALIDATION (recommended)
   File: middleware/validate.js

   Add schema for the new endpoint

6. TEST
   curl http://localhost:3001/api/v2/{domain}/new-endpoint \
     -H "X-Tenant-ID: 3222348440"
```

---

## workflow: sync-servicetitan-data
**Setting: Manual**

```
STEPS TO SYNC ST DATA:

1. TRIGGER SYNC VIA API
   curl -X POST http://localhost:3001/api/v2/{domain}/sync \
     -H "X-Tenant-ID: 3222348440"

2. OR TRIGGER PROGRAMMATICALLY
   const provider = get{Domain}Provider(tenantId);
   const result = await provider.syncFromExternal(tenantId);
   console.log(`Synced: ${result.synced}, Errors: ${result.errors}`);

3. VERIFY DATA (Prisma Studio)
   cd services/api && npx prisma studio
   # Browse raw.st_{domain} table

4. CHECK SYNC STATE
   SELECT * FROM raw.sync_state
   WHERE tenant_id = 3222348440 AND table_name = 'st_{domain}';

5. TROUBLESHOOT FAILURES
   - Check logs: docker logs lazi-api --tail 100
   - Verify ST credentials are valid
   - Check rate limit status
   - Review sync_state.error_message
```

---

## workflow: debug-api-issue
**Setting: Manual**

```
STEPS TO DEBUG API ISSUES:

1. CHECK SERVER STATUS
   curl http://localhost:3001/health

2. CHECK CONTAINER STATUS
   docker ps | grep lazi
   docker logs lazi-api --tail 50

3. CHECK ST AUTHENTICATION
   docker exec lazi-api node -e "
   import('./src/services/stClient.js').then(m =>
     m.default.authenticate().then(console.log).catch(console.error)
   );
   "

4. TEST ENDPOINT DIRECTLY
   curl -v http://localhost:3001/api/v2/{endpoint} \
     -H "X-Tenant-ID: 3222348440"

5. CHECK SUPABASE
   - Use Supabase Dashboard → Table Editor
   - Or: cd services/api && npx prisma studio

6. CHECK REDIS
   docker exec lazi-redis redis-cli PING
   docker exec lazi-redis redis-cli KEYS "*"

7. COMMON FIXES
   - 401: Refresh ST credentials
   - 403: Check tenant_id and RBAC
   - 404: Verify resource exists
   - 500: Check docker logs for stack trace
   - Container down: docker-compose -f docker-compose.production.yml up -d
```

---

## workflow: sync-pricebook
**Setting: Manual**

```
STEPS TO SYNC PRICEBOOK:

1. TRIGGER CATEGORY SYNC
   curl -X POST http://localhost:3001/api/v2/pricebook/categories/sync \
     -H "X-Tenant-ID: 3222348440"

2. VERIFY SYNC RESULTS (Prisma Studio or Supabase Dashboard)
   - Check raw.st_pricebook_categories count
   - Check pricebook.subcategories count
   - Verify max depth = 8

3. CHECK HIERARCHY
   SELECT path, depth, name
   FROM pricebook.subcategories
   WHERE depth > 1
   ORDER BY path
   LIMIT 20;

4. LISTEN FOR REAL-TIME UPDATES (Frontend)
   socket.on('pricebook:categories:synced', (data) => {
     console.log('Synced:', data.count, 'categories');
     queryClient.invalidateQueries(['pricebook', 'categories']);
   });

5. TEST DRAG-AND-DROP REORDER
   curl -X PATCH http://localhost:3001/api/v2/pricebook/categories/123/reorder \
     -H "X-Tenant-ID: 3222348440" \
     -H "Content-Type: application/json" \
     -d '{"newPosition": 5}'

6. TROUBLESHOOT
   - Check depth column (should be 1-8)
   - Verify path column uses ltree format (1234.5678.9012)
   - Confirm parent_subcategory_st_id for nested items
```

---

## workflow: sync-scheduling
**Setting: Manual**

```
STEPS TO MANAGE SCHEDULING SYNC:

1. TRIGGER FULL SYNC
   curl -X POST http://localhost:3001/api/sync/scheduling/full \
     -H "X-Tenant-ID: 3222348440"

2. CHECK SYNC STATUS
   SELECT * FROM sync.sync_log
   WHERE sync_type LIKE 'scheduling%'
   ORDER BY started_at DESC LIMIT 10;

3. VERIFY ENTITIES
   curl http://localhost:3001/scheduling/stats \
     -H "X-Tenant-ID: 3222348440"

   Expected: 9 technicians, 6 teams, 12 zones, 37 job types

4. QUERY TECHNICIANS BY SKILL
   curl "http://localhost:3001/scheduling/technicians/by-skills?skills=HVAC,Plumbing" \
     -H "X-Tenant-ID: 3222348440"

5. CHECK SCHEDULING RULES
   curl http://localhost:3001/scheduling/rules \
     -H "X-Tenant-ID: 3222348440"

   Default rules: skill_match, certification, zone_preference, travel, workload

6. MONITOR SCHEDULED SYNCS
   - Full sync: 3:00 AM daily
   - Incremental: Every 4 hours
   - Check logs: docker logs lazi-api | grep scheduling
```

---

## workflow: deploy-production
**Setting: Manual**

```
STEPS FOR PRODUCTION DEPLOYMENT:

1. PRE-FLIGHT CHECKS
   - All tests passing
   - Environment variables set in .env.production
   - Prisma migrations run
   - No hardcoded credentials

2. BUILD & DEPLOY
   cd /opt/docker/apps/lazi
   docker-compose -f docker-compose.production.yml up -d --build

3. VERIFY CONTAINERS
   docker ps | grep lazi
   # Should see: lazi-api, lazi-web, lazi-redis

4. VERIFY HEALTH
   curl http://localhost:3001/health
   curl http://localhost:3001/ready

5. TEST ENDPOINTS
   curl http://localhost:3001/api/v2/customers \
     -H "X-Tenant-ID: 3222348440"

6. CHECK LOGS
   docker logs lazi-api --tail 50
   docker logs lazi-web --tail 50

7. MONITOR
   - Check Supabase Dashboard for queries
   - Watch sync operations
   - Monitor Redis: docker exec lazi-redis redis-cli INFO

8. ROLLBACK (if needed)
   docker-compose -f docker-compose.production.yml down
   git checkout HEAD~1
   docker-compose -f docker-compose.production.yml up -d --build
```

---

## workflow: manage-bullmq-jobs
**Setting: Manual**

```
STEPS TO MANAGE BULLMQ JOBS:

1. START WORKERS
   docker exec lazi-api npm run worker:bullmq

2. CHECK QUEUE STATUS
   docker exec lazi-redis redis-cli KEYS "bull:*"

3. ADD JOB TO QUEUE (programmatically)
   import { syncQueue } from './workers/bullmq/queues.js';
   await syncQueue.add('sync-customers', { tenantId: '3222348440' });

4. MONITOR JOBS
   docker exec lazi-redis redis-cli LRANGE "bull:sync:waiting" 0 -1

5. CLEAR FAILED JOBS
   docker exec lazi-redis redis-cli DEL "bull:sync:failed"

6. TROUBLESHOOT
   - Check Redis connection: docker exec lazi-redis redis-cli PING
   - Check worker logs: docker logs lazi-api | grep bullmq
   - Verify REDIS_URL in .env
```

---

# RESUME PROMPTS

Use these to continue work efficiently:

```
Continue LAZI development. Check current state and suggest next actions. Reference docs/CONSOLIDATED_DOCUMENTATION.md for context.
```

```
Add a new ServiceTitan provider for {domain}. Follow the add-new-provider workflow.
```

```
Sync pricebook categories from ServiceTitan. Verify all 8 depth levels. Follow sync-pricebook workflow.
```

```
Debug and fix {issue description}. Follow debug-api-issue workflow.
```

```
Deploy LAZI to production. Follow deploy-production workflow.
```

---

# KEY REFERENCES

| Resource | Location |
|----------|----------|
| **Master Documentation** | `docs/CONSOLIDATED_DOCUMENTATION.md` |
| **Project Directory** | `docs/DIRECTORY.md` |
| **Quick Reference** | `docs/QUICK_REFERENCE.md` |
| stClient | `services/api/src/services/stClient.js` |
| Provider Factory | `services/api/src/providers/factory.js` |
| V2 Routes | `services/api/src/routes/v2.routes.js` |
| Prisma Schema | `services/api/prisma/schema.prisma` |
| ST Providers | `services/api/src/providers/servicetitan/` |
| Interfaces | `services/api/src/providers/interfaces/` |
| Sync Engine | `services/api/src/sync/` |
| Scheduling Sync | `services/api/src/sync/scheduling/` |
| Socket.io | `services/api/src/lib/socket.js` |
| BullMQ Workers | `services/api/src/workers/bullmq/` |
| Modules | `services/api/src/modules/` |
| Config | `services/api/src/config/index.js` |
| Tests | `services/api/src/tests/st-endpoints/` |
| API Registries | `docs/api/*.endpoint-registry.json` |
| Docker Compose | `docker-compose.production.yml` |

---

# VERIFIED TECH STACK

| Category | Technology | Version |
|----------|------------|---------|
| Frontend | Next.js | 15.x |
| Frontend | React | 19.x |
| Frontend | @dnd-kit | 6.3.1 |
| Backend | Express.js | 4.21.x |
| Backend | Socket.io | 4.7.2 |
| Database | Supabase | Hosted |
| ORM | Prisma | Latest |
| Queue | BullMQ | 5.66.2 |
| Cache | Redis | 7 Alpine |
| Cache | ioredis | 5.4.1 |
| Scheduler | node-cron | 3.0.3 |
| Container | Docker | Production |

---

# SETUP SUMMARY

**Add to Windsurf (Workspace tab):**

| Type | Name | Setting |
|------|------|---------|
| Rule | lazi-project-context | Always On |
| Rule | lazi-code-standards | Always On |
| Rule | lazi-servicetitan-integration | Always On |
| Rule | lazi-provider-pattern | Always On |
| Rule | lazi-safety | Always On |
| Rule | lazi-sync-engine | Manual |
| Rule | lazi-pricebook | Manual |
| Rule | lazi-docker | Manual |
| Workflow | add-new-provider | Manual |
| Workflow | add-new-endpoint | Manual |
| Workflow | sync-servicetitan-data | Manual |
| Workflow | debug-api-issue | Manual |
| Workflow | sync-pricebook | Manual |
| Workflow | sync-scheduling | Manual |
| Workflow | deploy-production | Manual |
| Workflow | manage-bullmq-jobs | Manual |

**Totals:** 8 Rules (5 Always On, 3 Manual) + 8 Workflows (all Manual) = **16 items**

---

*Generated: December 26, 2024*
*Verified against actual implementation*
