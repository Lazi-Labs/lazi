# Pricebook System Architecture Extraction

> **Generated:** 2025-01-09  
> **Purpose:** Complete architecture documentation for the LAZI pricebook system to enable seamless integration of new organization/cleanup features.

---

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [API Routes & Endpoints](#2-api-routes--endpoints)
3. [Database Connection & Query Patterns](#3-database-connection--query-patterns)
4. [React Components - Pricebook UI](#4-react-components---pricebook-ui)
5. [Custom Hooks & Utilities](#5-custom-hooks--utilities)
6. [Type Definitions](#6-type-definitions)
7. [State Management](#7-state-management)
8. [Existing Patterns to Match](#8-existing-patterns-to-match)
9. [Project Structure](#9-project-structure)
10. [Environment & Configuration](#10-environment--configuration)

---

## 1. Database Schema

The pricebook system uses a **three-schema architecture**:
- **`raw`** - Raw data synced directly from ServiceTitan API
- **`master`** - Normalized/enriched data for CRM use
- **`crm`** - Local overrides and new items not yet in ServiceTitan

### Key Migration Files

| File | Purpose |
|------|---------|
| `database/migrations/001_pricebook_schema.sql` | Core pricebook tables, enums, triggers, views |
| `database/migrations/015_materials_st_fields.sql` | Additional ST fields for materials, CRM overrides |
| `database/migrations/016_schema_parity.sql` | Schema parity for bidirectional sync |
| `database/migrations/020_master_pricebook_categories.sql` | Master categories with LTREE hierarchy |
| `database/migrations/023_material_kits.sql` | Material kits (LAZI-only feature) |
| `database/migrations/027_service_edits.sql` | Service edits and new services tables |

### Core Tables

#### master.pricebook_categories
- **Identity:** `id` (SERIAL), `st_id` (BIGINT UNIQUE), `tenant_id`
- **Hierarchy:** `parent_st_id`, `depth`, `path` (LTREE), `sort_order`, `global_sort_order`
- **Status:** `is_active`, `is_visible_crm`, `is_archived`
- **Type:** `category_type` ('Materials' | 'Services')
- **Metadata:** `item_count`, `subcategory_count`, `business_unit_ids[]`

#### master.pricebook_materials
- **Identity:** `id`, `st_id`, `tenant_id`, `code`, `name`
- **Pricing:** `cost`, `price`, `member_price`, `add_on_price`, `add_on_member_price`
- **Labor:** `hours`, `commission_bonus`, `bonus`, `pays_commission`
- **Flags:** `active`, `taxable`, `is_inventory`, `chargeable_by_default`
- **Assets:** `assets` (JSONB), `primary_vendor`, `other_vendors`
- **AI:** `embedding` (vector 1536)

#### master.pricebook_services
- **Identity:** `id`, `st_id`, `tenant_id`, `code`, `name`
- **Pricing:** `price`, `member_price`, `add_on_price`, `hours`
- **Related:** `service_materials` (JSONB), `service_equipment` (JSONB)
- **Extras:** `warranty`, `upgrades`, `recommendations`

#### crm.pricebook_service_edits
- Stores local edits before pushing to ServiceTitan
- `sync_status`: 'pending' | 'synced' | 'error'
- All editable fields nullable (NULL = no override)

#### crm.pricebook_new_materials
- Materials created in CRM not yet in ServiceTitan
- `pushed_to_st` flag, `st_id` populated after push

#### pricebook.material_kits
- LAZI-only feature for material bundles
- Groups, items, kit-to-kit includes

### Key Database Functions

```sql
master.reorder_category(st_id, new_position, new_parent_st_id)
master.toggle_category_visibility(st_id, visible, cascade)
master.get_category_tree(category_type, include_inactive)
master.recalculate_global_sort(category_type)
master.rebuild_category_paths()
master.sync_pricebook_categories_from_raw()
```

---

## 2. API Routes & Endpoints

### Backend Express Routes (`apps/api/src/routes/`)

| Route File | Key Endpoints |
|------------|---------------|
| `pricebook-materials.js` | `/sync-from-st`, `/sync-to-master`, `/stats` |
| `pricebook-services.js` | `/`, `/:stId`, `/sync`, `/stats`, `/sync-from-st`, `/sync-to-master` |
| `pricebook-equipment.js` | `/sync-from-st`, `/sync-to-master`, `/stats` |
| `pricebook-categories.ts` | `/`, `/tree`, `/:stId`, `/:stId/reorder`, `/:stId/visibility`, `/sync`, `/stats/summary`, `/bulk-visibility` |
| `pricebook.routes.js` | `/db/services`, `/db/services/:id`, `/db/services/:id/push`, `/db/services/:id/pull`, `/db/materials` |

### Next.js API Routes (`apps/web/app/api/pricebook/`)

```
categories/    - Category management (8 items)
equipment/     - Equipment CRUD (1 item)
images/        - Image handling (4 items)
kits/          - Material kits (4 items)
materials/     - Materials CRUD (5 items)
pricing/       - Pricing rules (10 items)
services/      - Services CRUD (4 items)
subcategories/ - Subcategory management (2 items)
```

---

## 3. Database Connection & Query Patterns

### Connection Pool

```javascript
function getPool() {
  return new Pool({
    connectionString: config.database.url,
    max: 10,
    ssl: connectionString?.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
}
```

### Tenant ID Extraction

```javascript
function getTenantId(req) {
  return req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
}
```

### Dynamic Query Building

```javascript
const conditions = ['s.tenant_id = $1'];
const params = [tenantId];
if (search) {
  params.push(`%${search}%`);
  conditions.push(`(s.name ILIKE $${params.length})`);
}
const whereClause = conditions.join(' AND ');
```

### Caching Pattern

```javascript
import { getCache, setCache, invalidateCache, cacheKey, CACHE_TTL } from '../utils/cache.js';
// Check cache, fetch if miss, invalidate on mutations
```

---

## 4. React Components - Pricebook UI

### Component Directory (`apps/web/components/pricebook/`)

| Component | Size | Purpose |
|-----------|------|---------|
| `material-detail-page.tsx` | 77KB | Full material editor with ST sync |
| `service-detail-page.tsx` | 74KB | Full service editor with ST sync |
| `pricing-builder-panel.tsx` | 63KB | Pricing rules builder |
| `categories-panel.tsx` | 42KB | Category management with drag-drop |
| `services-panel.tsx` | 36KB | Services list with inline edit |
| `materials-panel.tsx` | 21KB | Materials list with filters |
| `category-tree-filter.tsx` | 9KB | Hierarchical category picker |

### Key Patterns

- **Data Fetching:** `@tanstack/react-query` with query keys
- **Forms:** `react-hook-form` for complex forms
- **UI Library:** shadcn/ui components (Button, Input, Dialog, etc.)
- **Icons:** Lucide React
- **Styling:** Tailwind CSS with `cn()` utility

---

## 5. Custom Hooks & Utilities

### usePricebookCategories (`hooks/usePricebookCategories.ts`)

```typescript
usePricebookCategories(type?, includeInactive?)
usePendingOverrides()
useCategoryOverride()
useDiscardOverride()
usePushToServiceTitan()
```

### useKits (`hooks/pricebook/useKits.ts`)

```typescript
useKits(params?)
useKit(id)
useCreateKit()
useUpdateKit()
useDeleteKit()
useDuplicateKit()
useApplyKit()
```

### API Utility (`lib/api.ts`)

```typescript
export const BASE_PATH = '/dashboard';
export function apiUrl(path: string): string;
export const api = { get, post, patch, delete };
```

---

## 6. Type Definitions

### Key Types (`types/pricebook.ts`)

```typescript
interface Service { id, name, code, category, hours, staticPrice, ... }
interface ColumnConfig { id, label, checked, disabled? }
interface ServicesPageParams { page?, limit?, search?, category?, sortBy?, sortOrder? }
```

### Column Configuration

- `DEFAULT_COLUMNS` - Always visible columns
- `ADDITIONAL_COLUMNS` - Optional columns
- `COLUMNS_STORAGE_KEY = 'lazi-services-columns'`

---

## 7. State Management

### React Query (Primary)

Query key patterns:
- `['pricebook-categories', type, 'active']`
- `['pricebook-materials', category, search, filters, page, limit]`
- `['material', materialId]`
- `['service-detail', serviceId]`

### Local State Patterns

```typescript
// Filter state
const [filters, setFilters] = useState<FilterState>(defaultFilters);
const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);

// Sync state
const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('synced');
const [hasChanges, setHasChanges] = useState(false);
```

---

## 8. Existing Patterns to Match

### Bulk Operations

```typescript
// categories-panel.tsx - Bulk visibility
POST /api/pricebook/categories/bulk-visibility
Body: { stIds: number[], visible: boolean }
```

### Filter Dropdowns

```typescript
interface FilterState {
  category: string;
  costMin: string;
  costMax: string;
  priceMin: string;
  priceMax: string;
  status: 'active' | 'inactive' | 'all';
  images: 'any' | 'has' | 'none';
  vendor: string;
}
```

### Push/Pull Workflow

1. Edit locally → `sync_status = 'pending'`
2. Save to CRM table (overrides or edits)
3. Push to ServiceTitan API
4. Update `sync_status = 'synced'` or `'error'`

### Column Customization

```typescript
// Saved to localStorage
localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
// EditColumnsDrawer component for UI
```

---

## 9. Project Structure

```
/opt/docker/apps/lazi/
├── apps/
│   ├── api/src/routes/          # Express API routes
│   └── web/
│       ├── app/api/pricebook/   # Next.js API routes
│       ├── components/pricebook/ # React components
│       ├── hooks/pricebook/     # Custom hooks
│       ├── lib/                 # Utilities
│       └── types/               # TypeScript types
├── database/
│   └── migrations/              # SQL migrations
└── docs/                        # Documentation
```

---

## 10. Environment & Configuration

### Key Environment Variables

```
DATABASE_URL - PostgreSQL connection string
NEXT_PUBLIC_API_URL - API base URL
NEXT_PUBLIC_TENANT_ID - Default ServiceTitan tenant
SERVICE_TITAN_TENANT_ID - Backend tenant ID
```

### Dependencies

- **UI:** shadcn/ui, Tailwind CSS, Lucide icons
- **Data:** @tanstack/react-query, react-hook-form
- **Database:** pg (node-postgres)
- **Build:** Turbo (monorepo), pnpm

---

## Checklist

- [x] All pricebook database tables with full schemas
- [x] All pricebook API endpoints with their implementations
- [x] All pricebook React components with their patterns
- [x] Database connection and query patterns
- [x] TypeScript interfaces for all pricebook entities
- [x] Existing similar features (bulk ops, filters, etc.)
- [x] Project structure overview
- [x] Key dependencies
