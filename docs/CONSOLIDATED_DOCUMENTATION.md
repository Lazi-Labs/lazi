# LAZI Platform Documentation
## Consolidated Reference - December 26, 2024

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Database Schema](#3-database-schema)
4. [ServiceTitan Integration](#4-servicetitan-integration)
5. [Sync Engine](#5-sync-engine)
6. [Pricebook Categories System](#6-pricebook-categories-system)
7. [Provider Architecture](#7-provider-architecture)
8. [API Reference](#8-api-reference)
9. [Real-time Updates](#9-real-time-updates)
10. [Frontend Integration](#10-frontend-integration)
11. [Deployment](#11-deployment)
12. [Production Hardening](#12-production-hardening)

---

## 1. Executive Summary

**LAZI** is a middleware platform that integrates with ServiceTitan's Field Service Management API to provide:

- **Bi-directional synchronization** with ServiceTitan (pull + push)
- **Pricebook management** with nested subcategories (8 levels deep)
- **Real-time updates** via Socket.io
- **Provider abstraction** for eventual ServiceTitan independence
- **CRM extensions** (contacts, opportunities, pipelines)

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js 20+, Express 4.21, ESM modules |
| **Database** | PostgreSQL 16+ with pgvector, ltree extensions |
| **Frontend** | Next.js 15, React 19, TanStack Query |
| **Queue** | BullMQ with Redis |
| **Real-time** | Socket.io |
| **Auth** | OAuth 2.0 (ServiceTitan), JWT (internal) |

### Key Statistics

- **50+ files** in provider/module architecture
- **~7,000+ lines** of restructured code
- **17 provider interfaces** (6 implemented)
- **28+ V2 API endpoints**
- **2,023 subcategories** synced across 8 depth levels

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LAZI PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Next.js    │────▶│   Express    │────▶│  PostgreSQL  │                │
│  │   Frontend   │     │   API        │     │  + pgvector  │                │
│  │   Port 3000  │     │   Port 3001  │     │              │                │
│  └──────────────┘     └──────┬───────┘     └──────────────┘                │
│                              │                                               │
│         ┌────────────────────┼────────────────────┐                         │
│         ▼                    ▼                    ▼                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   BullMQ     │     │  Socket.io   │     │ServiceTitan  │                │
│  │   + Redis    │     │  Real-time   │     │   API        │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Schemas

| Schema | Purpose |
|--------|---------|
| `raw` | ServiceTitan data mirror (st_*) |
| `master` | Enriched pricebook data with LTREE paths |
| `crm` | LAZI-owned data (contacts, opportunities, overrides) |
| `sync` | Sync state and history tracking |
| `servicetitan` | ST-specific metadata |
| `integrations` | Third-party integrations |

### Data Flow

```
ServiceTitan API
       │
       ▼
   [FETCHERS] ─────▶ raw.st_* tables
       │
       ▼
   [SYNC ENGINE] ──▶ master.* tables (enriched)
       │
       ├─▶ crm.* tables (overrides)
       │
       ▼
   [PUSH] ─────────▶ ServiceTitan API
```

---

## 3. Database Schema

### Core Tables

#### Pricebook Categories
```sql
master.pricebook_categories
├── id (UUID)
├── st_id (BIGINT) - ServiceTitan ID
├── tenant_id (BIGINT)
├── name, category_type
├── parent_st_id, depth, path (LTREE)
├── sort_order, global_sort_order
├── is_active, is_visible_crm
├── image_url
├── st_modified_on, last_synced_at
└── timestamps (created_at, updated_at)
```

#### Pricebook Subcategories
```sql
master.pricebook_subcategories
├── id (UUID)
├── st_id (BIGINT)
├── parent_st_id (category)
├── parent_subcategory_st_id (nested subcategory)
├── depth (1-8 levels)
├── path (LTREE for hierarchy)
├── name, image_url, sort_order
└── sync metadata
```

#### CRM Overrides
```sql
crm.pricebook_overrides
├── st_pricebook_id
├── item_type ('category', 'subcategory', 'service', 'material')
├── custom_name, custom_image_url, custom_position
├── pending_sync (boolean)
└── actual_item_type
```

### Key Indexes

```sql
-- Hierarchy queries
CREATE INDEX idx_subcategories_path ON master.pricebook_subcategories USING GIST(path);
CREATE INDEX idx_subcategories_depth ON master.pricebook_subcategories(depth);
CREATE INDEX idx_subcategories_parent_sub ON master.pricebook_subcategories(parent_subcategory_st_id);
```

---

## 4. ServiceTitan Integration

### Authentication

```javascript
// OAuth 2.0 Client Credentials Flow
POST https://auth.servicetitan.io/connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=${CLIENT_ID}
&client_secret=${CLIENT_SECRET}
```

### API Domains

| Domain | Endpoint Base | Description |
|--------|---------------|-------------|
| CRM | `/crm/v2/tenant/{tenant}` | Customers, Locations, Contacts |
| JPM | `/jpm/v2/tenant/{tenant}` | Jobs, Appointments |
| Pricebook | `/pricebook/v2/tenant/{tenant}` | Categories, Services, Materials |
| Dispatch | `/dispatch/v2/tenant/{tenant}` | Technicians, Teams, Zones |
| Accounting | `/accounting/v2/tenant/{tenant}` | Invoices, Payments |
| Settings | `/settings/v2/tenant/{tenant}` | Business Units, Tags |

### Environment Variables

```bash
SERVICE_TITAN_CLIENT_ID=cid.xxxxx
SERVICE_TITAN_CLIENT_SECRET=cs13.xxxxx
SERVICE_TITAN_APP_KEY=ak1.xxxxx
SERVICE_TITAN_TENANT_ID=3222348440
SERVICE_TITAN_API_BASE=https://api.servicetitan.io
SERVICE_TITAN_AUTH_URL=https://auth.servicetitan.io/connect/token
```

---

## 5. Sync Engine

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRICEBOOK SYNC ENGINE                         │
└──────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │   Fetchers   │  │  Comparators │  │   Appliers   │
        │              │  │              │  │              │
        │  • Categories│  │  • Detect    │  │  • Create    │
        │  • Materials │  │    changes   │  │  • Update    │
        │  • Services  │  │  • Find      │  │  • Delete    │
        │  • Equipment │  │    conflicts │  │  • Audit     │
        └──────────────┘  └──────────────┘  └──────────────┘
```

### Sync Types

| Type | Description | Schedule |
|------|-------------|----------|
| **Full Sync** | All records | Daily at 2 AM |
| **Incremental** | Modified since last sync | Every 6 hours |
| **On-demand** | Manual trigger | API endpoint |

### Sync Endpoints

```
POST /api/sync/pricebook/full          - Full sync
POST /api/sync/pricebook/incremental   - Incremental sync
GET  /api/sync/pricebook/status        - Sync status
GET  /api/sync/pricebook/logs          - Sync history
GET  /api/sync/pricebook/conflicts     - Unresolved conflicts
POST /api/sync/pricebook/resolve-conflict/:id
```

### Conflict Resolution

**Conflict Types:**
1. `both_modified` - Both ST and local modified since last sync
2. `local_deleted_st_modified` - Deleted locally, modified in ST
3. `st_deleted_local_modified` - Deleted in ST, modified locally

**Resolution Strategies:**
- `keep_st` - Accept ServiceTitan version
- `keep_local` - Keep local version
- `manual` - Flag for manual review

---

## 6. Pricebook Categories System

### Nested Subcategories (8 Levels)

| Depth | Count | Description |
|-------|-------|-------------|
| 1 | 209 | Direct subcategories |
| 2 | 650 | Sub-subcategories |
| 3 | 681 | Level 3 |
| 4 | 264 | Level 4 |
| 5 | 123 | Level 5 |
| 6 | 49 | Level 6 |
| 7 | 39 | Level 7 |
| 8 | 8 | Level 8 |
| **Total** | **2,023** | All subcategories |

### Key Discovery

**Subcategories ARE categories in ServiceTitan** - they use the same `/categories` endpoint with a `parentId` set. This means:
- ✅ Create subcategories via API
- ✅ Update subcategories via API
- ✅ Delete subcategories via API
- ✅ Push changes (images, names, positions) to ST

### Hierarchy Extraction

```javascript
function extractAllSubcategories(
  subcategories,
  categoryStId,
  tenantId,
  parentSubcategoryStId = null,
  depth = 1,
  parentPath = ''
) {
  const results = [];

  for (const sub of subcategories) {
    const path = parentPath
      ? `${parentPath}.${sub.id}`
      : `${categoryStId}.${sub.id}`;

    results.push({
      stId: sub.id,
      parentStId: categoryStId,
      parentSubcategoryStId,
      depth,
      path,
      name: sub.name,
      // ... other fields
    });

    // Recursively process nested subcategories
    if (sub.subcategories?.length > 0) {
      results.push(...extractAllSubcategories(
        sub.subcategories, categoryStId, tenantId,
        sub.id, depth + 1, path
      ));
    }
  }

  return results;
}
```

### Category API Endpoints

```
GET  /api/pricebook/categories                     - List categories
GET  /api/pricebook/categories/:stId               - Get category
GET  /api/pricebook/categories/:stId/subcategories/tree   - Nested tree
GET  /api/pricebook/categories/:stId/subcategories/flat   - Flat list
POST /api/pricebook/categories/sync                - Pull from ST
POST /api/pricebook/categories/push                - Push to ST
POST /api/pricebook/categories/:stId/reorder       - Reorder category
POST /api/pricebook/categories/subcategories/:stId/reorder - Reorder subcategory
GET  /api/pricebook/categories/pending             - Pending changes count
```

### Drag-and-Drop Reorder

Frontend uses `@dnd-kit` library:
- `@dnd-kit/core` - Core drag-and-drop
- `@dnd-kit/sortable` - Sortable lists
- `@dnd-kit/utilities` - Transform utilities

---

## 7. Provider Architecture

### Provider Pattern Overview

```
Routes → Controllers → Services → Providers → Data Sources
                                      ↓
                        [ServiceTitan | LAZI | Hybrid]
```

### Provider Interfaces (17 Domains)

| Domain | Status | Priority |
|--------|--------|----------|
| Customers | ✅ Implemented | HIGH |
| Locations | ✅ Implemented | HIGH |
| Jobs | ✅ Implemented | HIGH |
| Appointments | ✅ Implemented | HIGH |
| Pricebook | ✅ Implemented | HIGH |
| Technicians | ✅ Implemented | HIGH |
| Contacts | 📋 Interface only | MEDIUM |
| Invoices | 📋 Interface only | MEDIUM |
| Payments | 📋 Interface only | MEDIUM |
| Inventory | 📋 Interface only | MEDIUM |
| Equipment | 📋 Interface only | MEDIUM |
| Forms | 📋 Interface only | LOW |
| Marketing | 📋 Interface only | LOW |
| Settings | 📋 Interface only | MEDIUM |
| Timesheets | 📋 Interface only | LOW |
| Telecom | 📋 Interface only | LOW |
| Tasks | 📋 Interface only | LOW |

### Feature Flags

```javascript
// Per-tenant provider selection
await setFeatureFlag('tenant.3222348440.customers.provider', 'servicetitan');
await setFeatureFlag('tenant.3222348440.customers.provider', 'lazi');
await setFeatureFlag('tenant.3222348440.customers.provider', 'hybrid');
```

### Provider Factory

```javascript
function getCustomerProvider(tenantId) {
  const mode = getFeatureFlag(`tenant.${tenantId}.customers.provider`, 'servicetitan');

  switch (mode) {
    case 'lazi':
      return new LaziCustomerProvider();
    case 'hybrid':
      return new HybridCustomerProvider();
    default:
      return new ServiceTitanCustomerProvider();
  }
}
```

### RBAC Permissions

| Permission | Roles |
|------------|-------|
| `pricebook:read` | OWNER, ADMIN, MANAGER, DISPATCHER, TECHNICIAN, VIEWER |
| `pricebook:write` | OWNER, ADMIN |
| `customers:write` | OWNER, ADMIN, MANAGER, DISPATCHER |
| `jobs:assign` | OWNER, ADMIN, MANAGER, DISPATCHER |

---

## 8. API Reference

### V2 Endpoints

#### Customers (`/api/v2/customers`)
```
GET  /                    - List customers
GET  /search?q=term       - Search customers
GET  /:id                 - Get customer
POST /                    - Create customer
PATCH /:id                - Update customer
DELETE /:id               - Delete customer
POST /sync                - Sync from ServiceTitan
```

#### Jobs (`/api/v2/jobs`)
```
GET  /                    - List jobs
GET  /customer/:id        - Jobs by customer
GET  /location/:id        - Jobs by location
GET  /technician/:id      - Jobs by technician
GET  /:id                 - Get job
POST /                    - Create job
PATCH /:id                - Update job
PATCH /:id/status         - Update status
POST /:id/assign          - Assign technician
POST /:id/cancel          - Cancel job
POST /sync                - Sync from ServiceTitan
```

#### Technicians (`/api/v2/technicians`)
```
GET  /                    - List technicians
GET  /availability        - Get availability
GET  /team/:id            - By team
GET  /business-unit/:id   - By business unit
GET  /:id                 - Get technician
GET  /teams/all           - List teams
GET  /zones/all           - List zones
POST /sync                - Sync from ServiceTitan
```

#### Pricebook (`/api/v2/pricebook`)
```
GET  /categories          - List categories
GET  /categories/:id      - Get category
GET  /services            - List services
GET  /materials           - List materials
GET  /equipment           - List equipment
POST /sync                - Sync from ServiceTitan
```

### Headers

All V2 endpoints require:
```
X-Tenant-ID: 3222348440
Authorization: Bearer <token>  (if auth enabled)
```

---

## 9. Real-time Updates

### Socket.io Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `sync:started` | Sync begins | `{ entity, message, timestamp }` |
| `sync:completed` | Sync ends | `{ entity, fetched, duration }` |
| `sync:failed` | Sync error | `{ entity, error, message }` |
| `pricebook:categories:synced` | Pull complete | `{ count, type, incremental }` |
| `pricebook:categories:pushed` | Push complete | `{ count, success, failed }` |
| `pricebook:categories:updated` | Category edited | `{ stId, name, changes }` |

### Frontend Integration

```typescript
// Socket Provider
const socket = io(apiUrl, {
  auth: { tenantId },
  transports: ['websocket', 'polling'],
});

socket.on('pricebook:categories:synced', (data) => {
  toast.success(`Synced ${data.count} categories`);
  queryClient.invalidateQueries({ queryKey: ['pricebook-categories'] });
});
```

### Backend Event Emission

```javascript
const { emitCategoriesSynced } = require('../utils/socket-events');

emitCategoriesSynced(tenantId, {
  count: result.fetched,
  type: 'all',
  incremental: false,
});
```

---

## 10. Frontend Integration

### Technology Stack

- **Next.js 15** with App Router
- **React 19**
- **TanStack Query** (React Query)
- **@dnd-kit** for drag-and-drop
- **Tailwind CSS** for styling
- **Sonner** for toast notifications

### API Client Setup

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchCategories(tenantId: string) {
  const response = await fetch(`${API_BASE}/api/pricebook/categories`, {
    headers: { 'X-Tenant-ID': tenantId }
  });
  return response.json();
}
```

### React Query Hooks

```typescript
export function useCategories(tenantId: string) {
  return useQuery({
    queryKey: ['pricebook-categories', tenantId],
    queryFn: () => fetchCategories(tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

---

## 11. Deployment

### Docker Compose (Production)

```yaml
services:
  api:
    build: ./services/api
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - SERVICE_TITAN_CLIENT_ID=${ST_CLIENT_ID}
    depends_on:
      - redis

  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:3001

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
```

### Database Migrations

```bash
# Run all migrations
cd /opt/docker/apps/lazi/services/api
./scripts/run-lazi-migrations.sh

# Or individually
psql $DATABASE_URL -f migrations/001_create_raw_schema.sql
psql $DATABASE_URL -f migrations/002_create_st_locations.sql
# ... etc
```

### Health Check

```bash
curl http://localhost:3001/health
# {"status":"healthy","timestamp":"..."}
```

---

## 12. Production Hardening

### Security Checklist

- [ ] Tenant isolation middleware on all routes
- [ ] RBAC middleware on write endpoints
- [ ] ServiceTitan credentials in environment variables (not code)
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)

### Monitoring

- [ ] Sync operation logging to `sync.sync_history`
- [ ] Error tracking (Sentry/Datadog)
- [ ] API response time monitoring
- [ ] Queue depth monitoring (BullMQ)

### Backup Strategy

- PostgreSQL daily backups
- Redis persistence enabled
- Sync conflict data preserved for audit

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/lazi
SERVICE_TITAN_CLIENT_ID=...
SERVICE_TITAN_CLIENT_SECRET=...
SERVICE_TITAN_APP_KEY=...
SERVICE_TITAN_TENANT_ID=...

# Optional
REDIS_URL=redis://localhost:6379
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://yourdomain.com
SYNC_FULL_CRON=0 2 * * *
SYNC_INCREMENTAL_CRON=0 */6 * * *
```

---

## Quick Reference

### Common Commands

```bash
# Start development
cd services/api && npm run dev
cd apps/web && npm run dev

# Trigger sync
curl -X POST http://localhost:3001/api/pricebook/categories/sync \
  -H "x-tenant-id: 3222348440"

# Push to ServiceTitan
curl -X POST http://localhost:3001/api/pricebook/categories/push \
  -H "x-tenant-id: 3222348440"

# Check sync status
curl http://localhost:3001/api/sync/pricebook/status

# View pending changes
curl http://localhost:3001/api/pricebook/categories/pending
```

### Key File Locations

| Component | Location |
|-----------|----------|
| API Server | `services/api/src/server.js` |
| Routes | `services/api/src/routes/` |
| Sync Engine | `services/api/src/sync/pricebook/` |
| Workers | `services/api/src/workers/` |
| Providers | `services/api/src/providers/` |
| Modules | `services/api/src/modules/` |
| Frontend | `apps/web/` |
| Migrations | `services/api/migrations/` |

---

**Document Version:** 2.0
**Last Updated:** December 26, 2024
**Status:** Production Ready
