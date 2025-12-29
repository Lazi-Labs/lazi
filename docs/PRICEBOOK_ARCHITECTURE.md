# LAZI Pricebook Architecture

## Overview

The pricebook system manages services, materials, equipment, and categories synced from ServiceTitan with local CRM overrides.

## Database Schema

### Three-Tier Architecture

```
ServiceTitan API
      ↓
  [Sync Worker]
      ↓
raw.st_pricebook_* (stores full_data JSONB - source of truth from ST)
      ↓
  [Sync to Master]
      ↓
master.pricebook_* (normalized, indexed, query-ready)
      ↓
  [API Query with LEFT JOIN]
      ↓
crm.pricebook_overrides (COALESCE for user overrides)
      ↓
  [Response]
```

### Tables

| Schema | Table | Purpose | Updated By |
|--------|-------|---------|------------|
| `raw` | `st_pricebook_services` | ST API response | Sync worker only |
| `raw` | `st_pricebook_materials` | ST API response | Sync worker only |
| `raw` | `st_pricebook_equipment` | ST API response | Sync worker only |
| `raw` | `st_pricebook_categories` | ST API response | Sync worker only |
| `master` | `pricebook_services` | Query-ready data | Sync worker only |
| `master` | `pricebook_materials` | Query-ready data | Sync worker only |
| `master` | `pricebook_equipment` | Query-ready data | Sync worker only |
| `master` | `pricebook_categories` | Query-ready data | Sync worker only |
| `master` | `pricebook_subcategories` | Flattened subcategories | Sync worker only |
| `crm` | `pricebook_overrides` | User changes pending push to ST | API routes |

### Row Counts (as of 2025-12-29)

| Table | Count |
|-------|-------|
| Services | 2,161 |
| Materials | 5,523 |
| Equipment | 278 |
| Categories | 104 |
| Subcategories | 1,439 |

## API Routes

### Consolidated Endpoints (Use These)

All routes in `/services/api/src/routes/pricebook-{type}.js`

| Route | Method | Description | File |
|-------|--------|-------------|------|
| `/api/pricebook/services` | GET | List services with CRM overrides | pricebook-services.js |
| `/api/pricebook/services/:stId` | GET | Get single service | pricebook-services.js |
| `/api/pricebook/materials` | GET | List materials with CRM overrides | pricebook-materials.js |
| `/api/pricebook/materials/:stId` | GET | Get single material | pricebook-materials.js |
| `/api/pricebook/equipment` | GET | List equipment with CRM overrides | pricebook-equipment.js |
| `/api/pricebook/equipment/:stId` | GET | Get single equipment | pricebook-equipment.js |
| `/api/pricebook/categories` | GET | List categories | pricebook-categories.js |
| `/api/pricebook/categories/:stId` | GET | Get single category | pricebook-categories.js |
| `/api/pricebook/health/status` | GET | Health check | pricebook-health.js |

### Query Parameters (All List Endpoints)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 100 | Items per page (max 500) |
| `active` | string | 'true' | Filter: 'true', 'false', or 'all' |
| `search` | string | - | Search name, code, description |
| `category_id` | number | - | Filter by category ST ID |
| `sort_by` | string | 'name' | Sort field |
| `sort_order` | string | 'asc' | Sort direction: 'asc' or 'desc' |

### Response Shape (Standardized)

```json
{
  "data": [
    {
      "id": 1234,
      "st_id": "61883299",
      "code": "SVC001",
      "name": "Service Name",
      "description": "...",
      "price": "150.00",
      "cost": "50.00",
      "active": true,
      "image_url": "https://...",
      "has_pending_changes": false,
      "override_id": null,
      "internal_notes": null,
      "custom_tags": []
    }
  ],
  "total": 2161,
  "page": 1,
  "limit": 100,
  "totalPages": 22
}
```

## CRM Override Pattern

All list endpoints use this SQL pattern:

```sql
SELECT 
  m.id,
  m.st_id,
  m.code,
  COALESCE(o.override_name, m.name) as name,
  COALESCE(o.override_description, m.description) as description,
  COALESCE(o.override_price, m.price) as price,
  COALESCE(o.override_cost, m.cost) as cost,
  COALESCE(o.override_active, m.active) as active,
  COALESCE(o.override_image_url, m.s3_image_url) as image_url,
  o.id as override_id,
  o.pending_sync as has_pending_changes,
  o.internal_notes,
  o.custom_tags
FROM master.pricebook_{type} m
LEFT JOIN crm.pricebook_overrides o 
  ON o.st_pricebook_id = m.st_id 
  AND o.tenant_id = m.tenant_id
  AND o.item_type = '{type}'
WHERE m.tenant_id = $1
```

### Override Fields in `crm.pricebook_overrides`

| Column | Type | Description |
|--------|------|-------------|
| `st_pricebook_id` | bigint | ServiceTitan item ID |
| `item_type` | varchar(20) | 'service', 'material', 'equipment', 'category' |
| `tenant_id` | varchar(50) | Tenant ID |
| `override_name` | varchar(255) | Custom name |
| `override_price` | numeric(12,2) | Custom price |
| `override_cost` | numeric(12,2) | Custom cost |
| `override_active` | boolean | Custom active status |
| `override_description` | text | Custom description |
| `override_image_url` | text | Custom image URL |
| `pending_sync` | boolean | True if changes need to be pushed to ST |
| `internal_notes` | text | Internal notes (not synced to ST) |
| `custom_tags` | jsonb | Custom tags array |

## Frontend Integration

### Next.js API Proxy Routes

Located in `/apps/web/app/api/pricebook/`

| Frontend Route | Backend Endpoint |
|----------------|------------------|
| `/api/pricebook/services` | `/api/pricebook/services` |
| `/api/pricebook/materials` | `/api/pricebook/materials` |
| `/api/pricebook/equipment` | `/api/pricebook/equipment` |
| `/api/pricebook/categories` | `/api/pricebook/categories` |

### Required Headers

```typescript
headers: {
  'Content-Type': 'application/json',
  'x-tenant-id': '3222348440',
}
```

## DO NOT

- ❌ Query `raw.*` tables directly from API routes
- ❌ Modify `raw.*` tables except during sync
- ❌ Create new route files (use existing pricebook-{type}.js)
- ❌ Skip the COALESCE pattern for overrides
- ❌ Use `/pricebook/db/*` endpoints (deprecated)

## Health Check

```bash
curl -s "http://localhost:3001/api/pricebook/health/status" \
  -H "x-tenant-id: 3222348440"
```

Expected response:
```json
{
  "tenant_id": "3222348440",
  "timestamp": "2025-12-29T12:08:49.520Z",
  "entities": {
    "services": { "raw": 2161, "master": 2161, "sync_rate": "100.0%", "status": "✅ Synced" },
    "materials": { "raw": 5523, "master": 5523, "sync_rate": "100.0%", "status": "✅ Synced" },
    "equipment": { "raw": 278, "master": 278, "sync_rate": "100.0%", "status": "✅ Synced" },
    "categories": { "raw": 104, "master": 104, "sync_rate": "100.0%", "status": "✅ Synced" }
  },
  "overall_health": "✅ Healthy"
}
```

## Troubleshooting

### "No data returned"
1. Check master tables have data: `SELECT COUNT(*) FROM master.pricebook_services`
2. Check tenant_id matches: `SELECT DISTINCT tenant_id FROM master.pricebook_services`
3. Check API logs: `docker logs lazi-api --tail 50`

### "Override not applied"
1. Check `crm.pricebook_overrides` has data for the item
2. Check JOIN condition: `st_pricebook_id = m.st_id AND item_type = 'service'`
3. Check COALESCE order: `COALESCE(o.override_*, m.*)`

### "Connection refused"
1. Check container running: `docker ps | grep lazi-api`
2. Check DATABASE_URL in container: `docker exec lazi-api env | grep DATABASE`

---

*Last updated: 2025-12-29*
*Architecture version: 2.0*
