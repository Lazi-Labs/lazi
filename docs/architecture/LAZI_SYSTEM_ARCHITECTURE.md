# Lazi CRM - System Architecture

## Overview

Lazi is a comprehensive CRM system that integrates with ServiceTitan to manage pricebook data, scheduling, dispatch, and more. The system uses a monorepo structure with multiple applications and services.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │   apps/web       │  │ apps/customer-   │  │   apps/mobile    │              │
│  │   (Next.js 14)   │  │    portal        │  │   (React Native) │              │
│  │   Port: 3000     │  │                  │  │                  │              │
│  └────────┬─────────┘  └──────────────────┘  └──────────────────┘              │
│           │                                                                      │
│           │ HTTP/WebSocket                                                       │
│           ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js API Routes (/api/*)                            │  │
│  │                    Proxy layer to backend services                        │  │
│  └────────┬─────────────────────────────────────────────────────────────────┘  │
│           │                                                                      │
└───────────┼──────────────────────────────────────────────────────────────────────┘
            │
            │ HTTP (localhost:3001)
            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   BACKEND                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                     services/api (Express.js)                             │  │
│  │                     Port: 3001                                            │  │
│  │                                                                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│  │  │   Routes    │  │ Controllers │  │  Services   │  │ Middleware  │     │  │
│  │  │             │  │             │  │             │  │             │     │  │
│  │  │ /api/       │  │ Business    │  │ External    │  │ Auth, CORS  │     │  │
│  │  │ pricebook/  │  │ Logic       │  │ API calls   │  │ Logging     │     │  │
│  │  │ scheduling/ │  │             │  │             │  │             │     │  │
│  │  │ dispatch/   │  │             │  │             │  │             │     │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│  └────────┬─────────────────────────────────────────────────────────────────┘  │
│           │                                                                      │
│           ├──────────────────┬──────────────────┬──────────────────┐            │
│           ▼                  ▼                  ▼                  ▼            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │   Workers   │    │   Queues    │    │  Socket.io  │    │  Scrapers   │      │
│  │  (BullMQ)   │    │   (Redis)   │    │  Real-time  │    │  Data fetch │      │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                                                  │
└───────────┼──────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │   PostgreSQL     │  │     Redis        │  │   ServiceTitan   │              │
│  │   (Supabase)     │  │   (Cache/Queue)  │  │   (External API) │              │
│  │                  │  │                  │  │                  │              │
│  │  Schemas:        │  │  - BullMQ jobs   │  │  - Pricebook     │              │
│  │  - raw.*         │  │  - Session cache │  │  - Categories    │              │
│  │  - master.*      │  │  - Image cache   │  │  - Scheduling    │              │
│  │  - crm.*         │  │                  │  │  - Dispatch      │              │
│  │  - sync.*        │  │                  │  │  - Customers     │              │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

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
│  │                                                                          │   │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐              │   │
│  │  │ st_pricebook_categories │  │   pricebook_images      │              │   │
│  │  │                         │  │                         │              │   │
│  │  │ - st_id (PK)           │  │ - image_path (PK)       │              │   │
│  │  │ - tenant_id            │  │ - image_data (bytea)    │              │   │
│  │  │ - name                 │  │ - content_type          │              │   │
│  │  │ - image (path)         │  │ - downloaded_at         │              │   │
│  │  │ - subcategories (JSONB)│  │                         │              │   │
│  │  │ - fetched_at           │  │                         │              │   │
│  │  └─────────────────────────┘  └─────────────────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                        │
│                                        │ Sync Worker                            │
│                                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       master.* (Master Data Schema)                      │   │
│  │                                                                          │   │
│  │  Purpose: Normalized, processed data ready for CRM use                   │   │
│  │                                                                          │   │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐              │   │
│  │  │  pricebook_categories   │  │ pricebook_subcategories │              │   │
│  │  │                         │  │                         │              │   │
│  │  │ - st_id (PK)           │  │ - st_id (PK)            │              │   │
│  │  │ - tenant_id            │  │ - parent_st_id (FK)     │              │   │
│  │  │ - name                 │  │ - parent_subcategory_id │              │   │
│  │  │ - display_name         │  │ - name                  │              │   │
│  │  │ - image_url            │  │ - image_url             │              │   │
│  │  │ - sort_order           │  │ - depth                 │              │   │
│  │  │ - is_visible_crm       │  │ - is_visible_crm        │              │   │
│  │  │ - last_synced_at       │  │ - last_synced_at        │              │   │
│  │  └─────────────────────────┘  └─────────────────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                        │
│                                        │ CRM Overrides                          │
│                                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         crm.* (CRM Schema)                               │   │
│  │                                                                          │   │
│  │  Purpose: Store local CRM customizations and pending changes             │   │
│  │                                                                          │   │
│  │  ┌─────────────────────────┐                                            │   │
│  │  │   pricebook_overrides   │                                            │   │
│  │  │                         │                                            │   │
│  │  │ - id (PK)              │                                            │   │
│  │  │ - st_pricebook_id (FK) │  ◄── Links to master.pricebook_*           │   │
│  │  │ - item_type            │      ('category' or 'subcategory')         │   │
│  │  │ - override_name        │                                            │   │
│  │  │ - override_image_data  │  ◄── Local image storage (bytea)           │   │
│  │  │ - pending_sync         │  ◄── Flag for push to ServiceTitan         │   │
│  │  │ - last_synced_at       │                                            │   │
│  │  └─────────────────────────┘                                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Pricebook Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PRICEBOOK PULL FLOW (ST → CRM)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐                                                               │
│  │ User clicks  │                                                               │
│  │ "Pull From   │                                                               │
│  │  ST" button  │                                                               │
│  └──────┬───────┘                                                               │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Frontend: categories-panel.tsx                                            │  │
│  │                                                                           │  │
│  │ handlePullFromST() → POST /api/pricebook/categories/sync                 │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Next.js Proxy: apps/web/app/api/pricebook/categories/sync/route.ts       │  │
│  │                                                                           │  │
│  │ Forwards to → http://localhost:3001/api/pricebook/categories/sync        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Backend Route: services/api/src/routes/pricebook-categories.js           │  │
│  │                                                                           │  │
│  │ POST /sync → Queues job to BullMQ (pricebook-category-sync)              │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Worker: services/api/src/workers/pricebook-category-sync.js              │  │
│  │                                                                           │  │
│  │ Data Flow: ST Automation → raw.* → BullMQ Worker → master.*              │  │
│  │                                                                           │  │
│  │ 1. Read categories from raw.st_pricebook_categories (pre-fetched)        │  │
│  │ 2. For each category:                                                    │  │
│  │    a. Upsert to master.pricebook_categories                              │  │
│  │    b. For each subcategory (recursive, up to 8 levels deep):             │  │
│  │       - Fetch from ServiceTitan API to get correct image                 │  │
│  │       - Upsert to master.pricebook_subcategories with depth/path         │  │
│  │ 3. Emit Socket.io event for real-time UI update                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Result: master.* tables updated with fresh data from ServiceTitan        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PRICEBOOK PUSH FLOW (CRM → ST)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐                                                               │
│  │ User clicks  │                                                               │
│  │ "Push To ST" │                                                               │
│  │   button     │                                                               │
│  └──────┬───────┘                                                               │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Frontend: categories-panel.tsx                                            │  │
│  │                                                                           │  │
│  │ handlePushToST() → POST /api/pricebook/categories/push                   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Backend Route: services/api/src/routes/pricebook-categories.js           │  │
│  │                                                                           │  │
│  │ POST /push:                                                               │  │
│  │ 1. Query crm.pricebook_overrides WHERE pending_sync = true               │  │
│  │ 2. For each pending override:                                            │  │
│  │    a. If category: PATCH to ServiceTitan API                             │  │
│  │    b. If has image: Upload image to ServiceTitan                         │  │
│  │    c. Update master.* with new values                                    │  │
│  │    d. Clear pending_sync flag                                            │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ ServiceTitan API                                                          │  │
│  │                                                                           │  │
│  │ PATCH /pricebook/v2/tenant/{id}/categories/{stId}                        │  │
│  │ POST  /pricebook/v2/tenant/{id}/images                                   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Image Serving Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           IMAGE SERVING FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Browser requests: /api/pricebook/images/categories/61878867                    │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Next.js Proxy: apps/web/app/api/pricebook/images/categories/[id]/route.ts│  │
│  │                                                                           │  │
│  │ Forwards to → http://localhost:3001/images/db/categories/{id}            │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Backend: services/api/src/routes/images.routes.js                         │  │
│  │                                                                           │  │
│  │ GET /images/db/:type/:id                                                  │  │
│  │                                                                           │  │
│  │ 1. Check in-memory cache                                                  │  │
│  │    └─ HIT → Return cached image                                          │  │
│  │                                                                           │  │
│  │ 2. Check raw.pricebook_images table                                       │  │
│  │    └─ HIT → Return from database, cache it                               │  │
│  │                                                                           │  │
│  │ 3. Fetch from ServiceTitan API on-demand                                  │  │
│  │    └─ GET https://api.servicetitan.io/pricebook/v2/tenant/{id}/images    │  │
│  │    └─ Save to raw.pricebook_images for future requests                   │  │
│  │    └─ Return image                                                        │  │
│  │                                                                           │  │
│  │ 4. Return 404 if not found anywhere                                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  Image Sources Priority:                                                         │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ Memory  │ → │  Database   │ → │ ServiceTitan │ → │    404      │          │
│  │ Cache   │    │ (Postgres)  │    │    API      │    │  Not Found  │          │
│  └─────────┘    └─────────────┘    └─────────────┘    └─────────────┘          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Files Reference

### Frontend (apps/web)

| File | Purpose |
|------|---------|
| `app/(dashboard)/pricebook/page.tsx` | Pricebook main page |
| `components/pricebook/categories-panel.tsx` | Category list with Pull/Push buttons |
| `app/api/pricebook/categories/route.ts` | Proxy to backend, transforms data |
| `app/api/pricebook/images/*/route.ts` | Image proxy routes |
| `app/(dashboard)/developer/page.tsx` | Developer dashboard with error handling |

### Backend (services/api)

| File | Purpose |
|------|---------|
| `src/routes/pricebook-categories.js` | All pricebook category API endpoints |
| `src/routes/images.routes.js` | Image serving with on-demand ST fetch |
| `src/workers/pricebook-category-sync.js` | BullMQ worker for sync jobs |
| `src/routes/index.js` | Route aggregation and mounting |
| `src/app.js` | Express app configuration |
| `src/server.js` | HTTP server and Socket.io setup |

### Database

| Schema | Purpose |
|--------|---------|
| `raw.*` | Unprocessed data from ServiceTitan |
| `master.*` | Normalized data for CRM use |
| `crm.*` | Local overrides and pending changes |
| `sync.*` | Outbound queue and sync history |

---

## API Endpoints

### Pricebook Categories

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/pricebook/categories` | List all categories |
| GET | `/api/pricebook/categories/:stId` | Get single category with subcategories |
| POST | `/api/pricebook/categories/sync` | Trigger pull from ServiceTitan |
| POST | `/api/pricebook/categories/push` | Push pending changes to ServiceTitan |
| POST | `/api/pricebook/categories/:stId/pull` | Pull single category from ST |
| POST | `/api/pricebook/categories/:stId/override` | Save local override |
| GET | `/api/pricebook/categories/errors` | List sync errors |
| POST | `/api/pricebook/categories/errors/:id/auto-fix` | Attempt auto-fix |

### Images

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/images/db/categories/:id` | Serve category image |
| GET | `/images/db/subcategories/:id` | Serve subcategory image |
| GET | `/images/st/*` | Proxy ServiceTitan CDN images |

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Redis (for BullMQ queues)
REDIS_URL=redis://localhost:6379

# ServiceTitan API
SERVICE_TITAN_CLIENT_ID=...
SERVICE_TITAN_CLIENT_SECRET=...
SERVICE_TITAN_APP_KEY=...
DEFAULT_TENANT_ID=3222348440

# Backend URL (for Next.js proxy)
ST_AUTOMATION_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## Known Issues & Solutions

### Issue: Subcategory images show as null

**Cause**: ServiceTitan's bulk category API returns `"image": null` for nested subcategories, even when they have images.

**Solution**: The sync worker now fetches each subcategory individually from ServiceTitan API to get the correct image data.

### Issue: Images not displaying after pull

**Cause**: Image data wasn't being downloaded from ServiceTitan.

**Solution**: The image route now fetches images on-demand from ServiceTitan if not found in the database, then caches them.

---

## Running the System

```bash
# Terminal 1: Start backend API
cd services/api
node src/server.js

# Terminal 2: Start frontend
cd apps/web
npm run dev

# Access:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:3001
# - Pricebook: http://localhost:3000/pricebook
# - Developer Dashboard: http://localhost:3000/developer
```
