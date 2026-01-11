# LAZI API Endpoints Reference

## Overview

- **Backend**: Express.js on port 3001
- **Frontend Proxy**: Next.js API routes on port 3000
- **Total Endpoints**: 372+ across 59 route files
- **Auth**: JWT Bearer tokens + API key optional

## Base URLs

```bash
# Backend (direct)
http://localhost:3001

# Frontend proxy (recommended)
http://localhost:3000/api
```

---

## Health & System

### Health Checks
```bash
GET /health              # Liveness probe
GET /ready               # Readiness check (DB + ST)
GET /metrics             # Memory/uptime metrics
GET /api/health          # Detailed health status
GET /api/system/status   # Full system status
```

---

## Authentication

### Public Routes
```bash
POST /api/auth/login
# Body: { email, password }
# Returns: { accessToken, user }
# Sets: refreshToken cookie (httpOnly)

POST /api/auth/refresh
# Body: { refreshToken } or uses cookie
# Returns: { accessToken, user }

POST /api/auth/logout
# Clears session and cookie

POST /api/auth/forgot-password
# Body: { email }

POST /api/auth/reset-password
# Body: { token, password }
```

### Protected Routes
```bash
# Header: Authorization: Bearer <accessToken>

GET /api/auth/me         # Get current user
PUT /api/auth/profile    # Update profile
PUT /api/auth/password   # Change password
```

---

## Pricebook - Categories

### List & Get
```bash
GET /api/pricebook/categories
# Query: type=Materials|Services, active=true|false, visible=true|false
#        parent=<stId>|null, search=<term>, page=1, limit=100
#        sortBy=global_sort_order|name, sortOrder=asc|desc

GET /api/pricebook/categories/:stId
# Returns category with subcategories

GET /api/pricebook/categories/tree
# Returns hierarchical tree structure
```

### Sync Operations
```bash
POST /api/pricebook/categories/sync
# Body: { incremental: false }
# Triggers full pull from ServiceTitan

POST /api/pricebook/categories/:stId/pull
# Pull single category from ST

POST /api/pricebook/categories/push
# Push all pending changes to ServiceTitan
```

### Local Overrides
```bash
POST /api/pricebook/categories/:stId/override
# Body: { name?, description?, image?, position?, parentId? }
# Creates/updates crm.pricebook_overrides

PATCH /api/pricebook/categories/:stId/visibility
# Body: { visible: boolean }

POST /api/pricebook/categories/:stId/reorder
# Body: { newPosition, newParentId? }
```

---

## Pricebook - Materials

### List & Get
```bash
GET /api/pricebook/materials
# Query: categoryId, active, search, page, limit, sortBy, sortOrder
#        reviewed=true|false, hasImage=true|false

GET /api/pricebook/materials/:stId
# Returns full material details with categories
```

### CRUD Operations
```bash
POST /api/pricebook/materials
# Body: { code, name, description, cost, price, memberPrice, ... }
# Creates in crm.pricebook_new_materials (pending push)

PUT /api/pricebook/materials/:stId
# Body: { name?, price?, description?, ... }
# Creates override in crm.pricebook_overrides

DELETE /api/pricebook/materials/:stId
# Soft delete (marks inactive)
```

### Sync Operations
```bash
POST /api/pricebook/materials/sync
# Pull all materials from ServiceTitan

POST /api/pricebook/materials/push
# Push pending changes to ServiceTitan

GET /api/pricebook/materials/pending
# List materials with pending changes
```

### Review & Organization
```bash
PATCH /api/pricebook/materials/:stId/review
# Body: { reviewed: boolean }

POST /api/pricebook/materials/bulk-review
# Body: { stIds: number[], reviewed: boolean }
```

---

## Pricebook - Services

### List & Get
```bash
GET /api/pricebook/services
# Query: categoryId, active, search, page, limit

GET /api/pricebook/services/:stId
# Returns service with materials, equipment, recommendations
```

### CRUD Operations
```bash
POST /api/pricebook/services
# Body: { code, name, price, durationHours, materials?, equipment? }

PUT /api/pricebook/services/:stId
# Body: { name?, price?, materials?, ... }

POST /api/pricebook/services/:stId/materials
# Body: { materialStId, quantity }
# Add material to service

DELETE /api/pricebook/services/:stId/materials/:materialStId
# Remove material from service
```

### Sync Operations
```bash
POST /api/pricebook/services/sync
POST /api/pricebook/services/push
GET /api/pricebook/services/pending
```

---

## Pricebook - Equipment

### List & Get
```bash
GET /api/pricebook/equipment
GET /api/pricebook/equipment/:stId
```

### CRUD Operations
```bash
POST /api/pricebook/equipment
PUT /api/pricebook/equipment/:stId
DELETE /api/pricebook/equipment/:stId
```

### Sync
```bash
POST /api/pricebook/equipment/sync
POST /api/pricebook/equipment/push
```

---

## Pricebook - Material Kits (LAZI-only)

```bash
GET /api/pricebook/kits
# List all kits with items

GET /api/pricebook/kits/:id
# Get kit with items and materials

POST /api/pricebook/kits
# Body: { name, description, groupId?, items: [{ materialStId, quantity }] }

PUT /api/pricebook/kits/:id
# Update kit details and items

DELETE /api/pricebook/kits/:id

# Kit Groups
GET /api/pricebook/kits/groups
POST /api/pricebook/kits/groups
PUT /api/pricebook/kits/groups/:id
DELETE /api/pricebook/kits/groups/:id
```

---

## Pricebook - Organization

### Health Metrics
```bash
GET /api/pricebook/organization/health
# Returns: { overallScore, scores, stats, grade, totalIssues }

GET /api/pricebook/organization/category-completeness
# Returns completeness scores per category

GET /api/pricebook/organization/needs-attention
# Query: entityType=material|service, limit=50
# Returns items with issues (no image, no price, etc.)
```

### Duplicates
```bash
GET /api/pricebook/organization/duplicates
# Query: entityType, threshold=0.8
# Returns potential duplicate groups

POST /api/pricebook/organization/duplicates/merge
# Body: { keepId, mergeIds, entityType }

POST /api/pricebook/organization/duplicates/dismiss
# Body: { groupId }
```

### Bulk Operations
```bash
POST /api/pricebook/organization/bulk-update
# Body: { entityType, stIds, updates }

POST /api/pricebook/organization/bulk-categorize
# Body: { entityType, stIds, categoryIds }

POST /api/pricebook/organization/bulk-activate
# Body: { entityType, stIds, active }
```

### Audit Log
```bash
GET /api/pricebook/organization/audit-log
# Query: entityType, entityId, action, startDate, endDate, page, limit
```

---

## Images

### Serve Images
```bash
GET /images/db/categories/:stId
GET /images/db/subcategories/:stId
GET /images/db/materials/:stId
GET /images/db/services/:stId
GET /images/db/equipment/:stId

GET /images/st/*
# Proxy to ServiceTitan CDN
```

### Image Management
```bash
POST /api/pricebook/images/upload
# Multipart form: file, entityType, entityId

DELETE /api/pricebook/images/:entityType/:entityId

GET /api/pricebook/images/migrate/status
# Image migration status

POST /api/pricebook/images/migrate/start
# Start S3 migration
```

---

## Batch Sync

```bash
POST /api/pricebook/sync/full
# Trigger full sync of all pricebook data

POST /api/pricebook/sync/incremental
# Sync only changed items since last sync

GET /api/pricebook/sync/status
# Current sync status and progress

POST /api/pricebook/sync/cancel
# Cancel running sync job
```

---

## CRM

### Contacts
```bash
GET /api/crm/contacts
# Query: search, stage, pipeline, page, limit

GET /api/crm/contacts/:id
POST /api/crm/contacts
PUT /api/crm/contacts/:id
DELETE /api/crm/contacts/:id
```

### Pipelines
```bash
GET /api/crm/pipelines
GET /api/crm/pipelines/:id
POST /api/crm/pipelines
PUT /api/crm/pipelines/:id
DELETE /api/crm/pipelines/:id

# Stages
GET /api/crm/pipelines/:id/stages
POST /api/crm/pipelines/:id/stages
PUT /api/crm/pipelines/:pipelineId/stages/:stageId
DELETE /api/crm/pipelines/:pipelineId/stages/:stageId
```

### Opportunities
```bash
GET /api/crm/opportunities
# Query: pipelineId, stageId, contactId, status

GET /api/crm/opportunities/:id
POST /api/crm/opportunities
PUT /api/crm/opportunities/:id
DELETE /api/crm/opportunities/:id

PATCH /api/crm/opportunities/:id/stage
# Body: { stageId }
```

---

## Scheduling

```bash
GET /scheduling/availability
# Query: date, technicianIds, zoneId

GET /scheduling/technicians
GET /scheduling/zones
GET /scheduling/teams

POST /scheduling/appointments
# Body: { customerId, technicianId, startTime, endTime, jobTypeId }

GET /scheduling/appointments
# Query: date, technicianId, status
```

---

## ServiceTitan Proxy

Direct proxy to ServiceTitan API (authenticated):

```bash
# Customers
GET /customers
GET /customers/:id

# Jobs
GET /jobs
GET /jobs/:id

# Estimates
GET /estimates
GET /estimates/:id

# Invoices
GET /accounting/invoices
GET /accounting/invoices/:id

# Dispatch
GET /dispatch/technicians
GET /dispatch/zones
GET /dispatch/teams
```

---

## Plaid Integration

```bash
POST /api/plaid/create-link-token
GET /api/plaid/accounts
POST /api/plaid/exchange-token
# Body: { publicToken }

GET /api/plaid/transactions
# Query: accountId, startDate, endDate

POST /api/plaid/sync-transactions
```

---

## Admin & Monitoring

```bash
# Bull Board Dashboard
GET /admin/queues          # Queue dashboard UI

# Queue Management
GET /admin/status          # All queue statuses
POST /admin/sync/trigger   # Trigger sync job
# Body: { syncType: 'full' | 'incremental' }

# Cache Management
GET /api/cache/stats
GET /api/cache/health
POST /api/cache/warmup
DELETE /api/cache/clear
# Query: pattern=pricebook:*

# Monitoring
GET /api/monitor/events    # SSE stream of sync events
GET /api/monitor/metrics
```

---

## Workflows

```bash
GET /api/workflows
GET /api/workflows/:id
POST /api/workflows
PUT /api/workflows/:id
DELETE /api/workflows/:id

POST /api/workflows/:id/execute
GET /api/workflows/:id/executions
```

---

## Temporal

```bash
GET /api/temporal/workflows
GET /api/temporal/workflows/:workflowId
POST /api/temporal/workflows/:workflowId/cancel
GET /api/temporal/schedules
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `ST_API_ERROR` | 502 | ServiceTitan API error |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

- **General API**: 100 requests/minute per tenant
- **Write Operations**: 20 requests/minute per tenant
- **ServiceTitan Proxy**: Subject to ST rate limits (automatic retry)

---

*API documentation generated from route analysis - January 2025*
