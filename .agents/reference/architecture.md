# LAZI System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │   apps/web       │  │ apps/pricing-    │  │   apps/mobile    │              │
│  │   (Next.js 14)   │  │    system        │  │   (planned)      │              │
│  │   Port: 3000     │  │   Port: 3002     │  │                  │              │
│  └────────┬─────────┘  └──────────────────┘  └──────────────────┘              │
│           │                                                                      │
│           │ HTTP/WebSocket                                                       │
│           ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js API Routes (/api/*)                            │  │
│  │                    Proxy layer to backend services                        │  │
│  └────────┬─────────────────────────────────────────────────────────────────┘  │
└───────────┼──────────────────────────────────────────────────────────────────────┘
            │
            │ HTTP (localhost:3001)
            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   BACKEND                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                     services/api (Express.js)                             │  │
│  │                     Port: 3001                                            │  │
│  │                                                                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│  │  │   Routes    │  │ Controllers │  │  Services   │  │ Middleware  │     │  │
│  │  │ 59 files    │  │ 6 files     │  │ 65+ files   │  │ 12 files    │     │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│  └────────┬─────────────────────────────────────────────────────────────────┘  │
│           │                                                                      │
│           ├──────────────────┬──────────────────┬──────────────────┐            │
│           ▼                  ▼                  ▼                  ▼            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │   Workers   │    │   Queues    │    │  Socket.io  │    │  Scrapers   │      │
│  │  (BullMQ)   │    │   (Redis)   │    │  Real-time  │    │  Data fetch │      │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘      │
└───────────┼──────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │   PostgreSQL     │  │     Redis        │  │   ServiceTitan   │              │
│  │   (Supabase)     │  │   (Cache/Queue)  │  │   (External API) │              │
│  │                  │  │                  │  │                  │              │
│  │  Schemas:        │  │  - BullMQ jobs   │  │  - Pricebook     │              │
│  │  - raw.*         │  │  - Session cache │  │  - CRM           │              │
│  │  - master.*      │  │  - Image cache   │  │  - Dispatch      │              │
│  │  - crm.*         │  │  - API cache     │  │  - Accounting    │              │
│  │  - sync.*        │  │                  │  │  - Inventory     │              │
│  │  - audit.*       │  │                  │  │                  │              │
│  │  - workflow.*    │  │                  │  │                  │              │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Database Schema Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PostgreSQL Database                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         raw.* (Raw Data Schema)                          │   │
│  │                                                                          │   │
│  │  Purpose: Store unprocessed data directly from ServiceTitan API          │   │
│  │  Rule: NEVER modify directly - only via sync workers                     │   │
│  │                                                                          │   │
│  │  Tables:                                                                 │   │
│  │  - st_pricebook_categories (104 rows)                                   │   │
│  │  - st_pricebook_materials (5719 rows)                                   │   │
│  │  - st_pricebook_services (2161 rows)                                    │   │
│  │  - st_pricebook_equipment (292 rows)                                    │   │
│  │  - st_appointment_assignments (6311 rows)                               │   │
│  │  - st_customers, st_jobs, st_invoices, etc.                             │   │
│  │  - sync_state (tracks last sync timestamps)                             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                        │
│                                        │ Sync Worker                            │
│                                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       master.* (Master Data Schema)                      │   │
│  │                                                                          │   │
│  │  Purpose: Normalized, processed data ready for CRM use                   │   │
│  │  Rule: Updated by sync workers, read by API                              │   │
│  │                                                                          │   │
│  │  Tables:                                                                 │   │
│  │  - pricebook_categories (104 rows) - with hierarchy (ltree)             │   │
│  │  - pricebook_subcategories (1439 rows)                                  │   │
│  │  - pricebook_materials (6011 rows)                                      │   │
│  │  - pricebook_services (2164 rows)                                       │   │
│  │  - pricebook_equipment (278 rows)                                       │   │
│  │  - material_kits, material_kit_items, material_kit_groups               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                        │
│                                        │ CRM Overrides                          │
│                                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         crm.* (CRM Schema)                               │   │
│  │                                                                          │   │
│  │  Purpose: Store local CRM customizations and pending changes             │   │
│  │  Rule: User edits go here, then push to ServiceTitan                     │   │
│  │                                                                          │   │
│  │  Tables:                                                                 │   │
│  │  - pricebook_overrides (local edits pending push)                       │   │
│  │  - pricebook_new_materials (new items not yet in ST)                    │   │
│  │  - pricebook_new_services                                               │   │
│  │  - pricebook_new_equipment                                              │   │
│  │  - pricebook_service_edits                                              │   │
│  │  - pipelines, pipeline_stages (CRM pipeline management)                 │   │
│  │  - contacts, opportunities (CRM entities)                               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Supporting Schemas                                                      │   │
│  │                                                                          │   │
│  │  sync.*    - outbound_queue, inbound_log, conflicts, locks              │   │
│  │  audit.*   - change_log, api_log, error_log (partitioned by year)       │   │
│  │  workflow.* - definitions, executions, messaging_templates              │   │
│  │  pricing.* - technicians, vehicles, expense_items, markup_tiers         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Pricebook Data Flow

### Pull Flow (ServiceTitan → CRM)

```
┌──────────────┐
│ User clicks  │
│ "Pull From   │
│  ST" button  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Frontend: components/pricebook/categories-panel.tsx                      │
│                                                                          │
│ handlePullFromST() → POST /api/pricebook/categories/sync                │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Next.js Proxy: apps/web/app/api/pricebook/categories/sync/route.ts      │
│                                                                          │
│ Forwards to → http://localhost:3001/api/pricebook/categories/sync       │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Backend Route: services/api/src/routes/pricebook-categories.js          │
│                                                                          │
│ POST /sync → Queues job to BullMQ (pricebook-category-sync)             │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Worker: services/api/src/workers/pricebook-category-sync.js             │
│                                                                          │
│ 1. Fetch from ServiceTitan API                                          │
│ 2. Store in raw.st_pricebook_categories                                 │
│ 3. Process and upsert to master.pricebook_categories                    │
│ 4. Emit Socket.io event for real-time UI update                         │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Result: master.* tables updated with fresh data from ServiceTitan       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Push Flow (CRM → ServiceTitan)

```
┌──────────────┐
│ User edits   │
│ item & clicks│
│ "Push to ST" │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Frontend: components/pricebook/material-detail-page.tsx                  │
│                                                                          │
│ 1. User edits fields → saves to crm.pricebook_overrides                 │
│ 2. handlePushToST() → POST /api/pricebook/materials/push                │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Backend Route: services/api/src/routes/pricebook-materials.js           │
│                                                                          │
│ POST /push:                                                              │
│ 1. Query crm.pricebook_overrides WHERE pending_sync = true              │
│ 2. For each pending override:                                           │
│    a. PATCH to ServiceTitan API                                         │
│    b. Update master.* with new values                                   │
│    c. Clear pending_sync flag                                           │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ ServiceTitan API                                                         │
│                                                                          │
│ PATCH /pricebook/v2/tenant/{id}/materials/{stId}                        │
│ POST  /pricebook/v2/tenant/{id}/images                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

## Image Serving Architecture

```
Browser requests: /api/pricebook/images/categories/61878867
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Next.js Proxy: apps/web/app/api/pricebook/images/categories/[id]/route.ts│
│                                                                          │
│ Forwards to → http://localhost:3001/images/db/categories/{id}           │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Backend: services/api/src/routes/images.routes.js                        │
│                                                                          │
│ GET /images/db/:type/:id                                                 │
│                                                                          │
│ 1. Check in-memory cache                                                 │
│    └─ HIT → Return cached image                                         │
│                                                                          │
│ 2. Check raw.pricebook_images table                                      │
│    └─ HIT → Return from database, cache it                              │
│                                                                          │
│ 3. Fetch from ServiceTitan API on-demand                                 │
│    └─ GET https://api.servicetitan.io/pricebook/v2/tenant/{id}/images   │
│    └─ Save to raw.pricebook_images for future requests                  │
│    └─ Return image                                                       │
│                                                                          │
│ 4. Return 404 if not found anywhere                                      │
└──────────────────────────────────────────────────────────────────────────┘

Image Sources Priority:
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Memory  │ → │  Database   │ → │ ServiceTitan │ → │    404      │
│ Cache   │    │ (Postgres)  │    │    API      │    │  Not Found  │
└─────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         JWT Authentication                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Login: POST /api/auth/login                                          │
│     - Validates email/password against public.app_users                  │
│     - Returns accessToken (15min) + refreshToken (7 days, httpOnly)     │
│                                                                          │
│  2. Protected Routes:                                                     │
│     - Authorization: Bearer <accessToken>                                │
│     - Middleware: authenticate() verifies JWT                            │
│     - Role-based: requireRole('admin', 'user')                          │
│                                                                          │
│  3. Token Refresh: POST /api/auth/refresh                                │
│     - Uses httpOnly cookie or body refreshToken                          │
│     - Returns new accessToken                                            │
│                                                                          │
│  4. ServiceTitan API Auth:                                               │
│     - OAuth2 client credentials flow                                     │
│     - Token cached in memory with auto-refresh                           │
│     - services/api/src/services/tokenManager.js                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Queue Architecture (BullMQ)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         BullMQ Job Queues                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Queue Names:                                                            │
│  - inbound-sync     (priority: 1) - ST → Database sync                  │
│  - outbound-sync    (priority: 2) - Database → ST push                  │
│  - workflow-execution (priority: 3) - Automation workflows              │
│  - notifications    (priority: 4) - Email/Slack notifications           │
│                                                                          │
│  Job Options:                                                            │
│  - attempts: 3-5 with exponential backoff                               │
│  - removeOnComplete: 24 hours / 1000 jobs                               │
│  - removeOnFail: 7 days                                                  │
│                                                                          │
│  Admin Dashboard: /admin (Bull Board)                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Temporal Workflows

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Temporal.io Workflows                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Location: workers/temporal/                                             │
│  UI: http://localhost:8088                                               │
│                                                                          │
│  Structure:                                                              │
│  - activities/   - Individual task implementations                       │
│  - workflows/    - Workflow definitions                                  │
│  - workers/      - Worker processes                                      │
│  - schedules/    - Cron-like scheduled workflows                        │
│  - client.js     - Temporal client connection                           │
│                                                                          │
│  Use Cases:                                                              │
│  - Long-running sync operations                                          │
│  - Multi-step data processing                                            │
│  - Scheduled maintenance tasks                                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Docker Services

```yaml
# docker-compose.yml services:
postgres:       # PostgreSQL 16 - Main database (port 5432)
redis:          # Redis 7 - Cache & BullMQ (port 6379)
temporal-db:    # PostgreSQL for Temporal
temporal:       # Temporal server (port 7233)
temporal-ui:    # Temporal dashboard (port 8088)
prometheus:     # Metrics collection (port 9090)
grafana:        # Dashboards (port 3031)
metabase:       # BI tool (port 3030)
supabase-meta:  # Postgres metadata
supabase-studio: # Database UI (port 54323)
lazi-api:       # Express API (port 3001)
```

## Key File Locations

### Frontend (apps/web)

| Path | Purpose |
|------|---------|
| `app/(dashboard)/pricebook/page.tsx` | Pricebook main page |
| `components/pricebook/` | 35+ pricebook components |
| `components/ui/` | 61 shadcn/ui components |
| `app/api/` | Next.js API proxy routes |
| `hooks/` | React Query hooks |
| `lib/api.ts` | API client utilities |
| `providers/index.tsx` | App providers (Query, Theme, Socket) |

### Backend (services/api)

| Path | Purpose |
|------|---------|
| `src/app.js` | Express app setup |
| `src/server.js` | HTTP server & Socket.io |
| `src/routes/` | 59 route files |
| `src/services/stClient.js` | ServiceTitan API client |
| `src/workers/` | BullMQ job processors |
| `src/sync/` | Sync engine modules |
| `src/middleware/` | Auth, logging, error handling |

### Database

| Path | Purpose |
|------|---------|
| `database/migrations/` | 23 SQL migration files |
| `database/scripts/` | 16 schema setup scripts |
| `services/api/prisma/` | Prisma schema |

---

*Architecture documentation generated from codebase analysis - January 2025*
