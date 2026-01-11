# LAZI Pricebook System Reference

## Overview

The Pricebook is the core data model for field service pricing. It contains all materials, services, equipment, and categories that technicians use to build estimates and invoices. LAZI syncs this data bidirectionally with ServiceTitan.

---

## Business Domain

### What is a Pricebook?

A **Pricebook** is a catalog of everything a field service company can sell:

- **Materials**: Physical items (pool chemicals, parts, equipment)
- **Services**: Labor and work performed (pool cleaning, repairs)
- **Equipment**: Large items tracked separately (pumps, heaters)
- **Categories**: Organizational hierarchy for items

### Why Pricebook Management Matters

1. **Pricing Accuracy**: Ensure technicians quote correct prices
2. **Inventory Tracking**: Know what materials are used
3. **Profitability**: Track costs vs. selling prices
4. **Consistency**: Same pricing across all technicians
5. **Compliance**: Maintain accurate records for auditing

---

## Data Model

### Entity Relationship

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Pricebook Data Model                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Categories                                   │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │   │
│  │  │  Materials  │    │  Services   │    │  Equipment  │             │   │
│  │  │  Category   │    │  Category   │    │  Category   │             │   │
│  │  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘             │   │
│  │         │                  │                  │                     │   │
│  │         ▼                  ▼                  ▼                     │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │   │
│  │  │Subcategories│    │Subcategories│    │Subcategories│             │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           Items                                      │   │
│  │                                                                      │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │   │
│  │  │  Materials  │    │  Services   │    │  Equipment  │             │   │
│  │  │  ~6,000     │    │  ~2,100     │    │  ~280       │             │   │
│  │  │             │    │             │    │             │             │   │
│  │  │ • Code      │    │ • Code      │    │ • Code      │             │   │
│  │  │ • Name      │    │ • Name      │    │ • Name      │             │   │
│  │  │ • Cost      │    │ • Price     │    │ • Cost      │             │   │
│  │  │ • Price     │    │ • Duration  │    │ • Price     │             │   │
│  │  │ • Images    │    │ • Materials │    │ • Images    │             │   │
│  │  └─────────────┘    │ • Equipment │    └─────────────┘             │   │
│  │                     └─────────────┘                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Material Kits (LAZI-only)                         │   │
│  │                                                                      │   │
│  │  Kit = Collection of materials with quantities                       │   │
│  │  Example: "Pool Opening Kit" = Shock + Algaecide + Test Strips      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Tables

#### Categories (`master.pricebook_categories`)

| Column | Type | Description |
|--------|------|-------------|
| `st_id` | BigInt | ServiceTitan ID |
| `tenant_id` | String | Tenant identifier |
| `name` | String | Category name |
| `display_name` | String | CRM display name |
| `category_type` | Enum | 'Materials' or 'Services' |
| `parent_st_id` | BigInt | Parent category (hierarchy) |
| `depth` | Int | Nesting level (0 = root) |
| `path` | ltree | Full hierarchy path |
| `sort_order` | Int | Display order |
| `is_active` | Boolean | Active status |
| `is_visible_crm` | Boolean | Show in CRM UI |
| `item_count` | Int | Items in category |
| `subcategory_count` | Int | Child categories |

#### Materials (`master.pricebook_materials`)

| Column | Type | Description |
|--------|------|-------------|
| `st_id` | BigInt | ServiceTitan ID |
| `code` | String | SKU/Part number |
| `name` | String | Material name |
| `description` | Text | Full description |
| `cost` | Decimal | Purchase cost |
| `price` | Decimal | Selling price |
| `member_price` | Decimal | Member discount price |
| `add_on_price` | Decimal | Add-on pricing |
| `hours` | Decimal | Labor hours included |
| `bonus` | Decimal | Technician bonus |
| `pays_commission` | Boolean | Commission eligible |
| `is_inventory` | Boolean | Track inventory |
| `unit_of_measure` | String | Each, Gallon, etc. |
| `category_ids` | BigInt[] | Assigned categories |
| `images` | JSONB | Image assets |
| `is_reviewed` | Boolean | QA review status |

#### Services (`master.pricebook_services`)

| Column | Type | Description |
|--------|------|-------------|
| `st_id` | BigInt | ServiceTitan ID |
| `code` | String | Service code |
| `name` | String | Service name |
| `description` | Text | Full description |
| `price` | Decimal | Service price |
| `member_price` | Decimal | Member price |
| `duration_hours` | Decimal | Estimated duration |
| `materials` | JSONB | Included materials |
| `equipment` | JSONB | Required equipment |
| `recommendations` | JSONB | Upsell suggestions |
| `upgrades` | JSONB | Upgrade options |
| `category_ids` | BigInt[] | Assigned categories |

#### Material Kits (`master.material_kits`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | Serial | Kit ID |
| `name` | String | Kit name |
| `description` | Text | Kit description |
| `group_id` | Int | Kit group |
| `tenant_id` | String | Tenant |
| `is_active` | Boolean | Active status |

---

## CRUD Operations

### Categories

```bash
# List categories
GET /api/pricebook/categories
GET /api/pricebook/categories?type=Materials&parent=null

# Get single category
GET /api/pricebook/categories/:stId

# Get category tree
GET /api/pricebook/categories/tree

# Update category (creates override)
POST /api/pricebook/categories/:stId/override
Body: { name, description, position, parentId }

# Toggle visibility
PATCH /api/pricebook/categories/:stId/visibility
Body: { visible: boolean }
```

### Materials

```bash
# List materials
GET /api/pricebook/materials
GET /api/pricebook/materials?categoryId=123&search=chlorine

# Get single material
GET /api/pricebook/materials/:stId

# Create new material (pending push)
POST /api/pricebook/materials
Body: { code, name, cost, price, ... }

# Update material (creates override)
PUT /api/pricebook/materials/:stId
Body: { name, price, description, ... }

# Mark as reviewed
PATCH /api/pricebook/materials/:stId/review
Body: { reviewed: true }
```

### Services

```bash
# List services
GET /api/pricebook/services

# Get service with materials
GET /api/pricebook/services/:stId

# Update service
PUT /api/pricebook/services/:stId
Body: { name, price, materials, ... }

# Add material to service
POST /api/pricebook/services/:stId/materials
Body: { materialStId, quantity }
```

### Material Kits

```bash
# List kits
GET /api/pricebook/kits

# Get kit with items
GET /api/pricebook/kits/:id

# Create kit
POST /api/pricebook/kits
Body: { name, description, items: [{ materialStId, quantity }] }

# Update kit
PUT /api/pricebook/kits/:id

# Delete kit
DELETE /api/pricebook/kits/:id
```

---

## ServiceTitan Sync Flow

### Pull Flow (ST → LAZI)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Trigger    │ ──▶ │  Fetch from  │ ──▶ │  Store in    │ ──▶ │  Process to  │
│  (Manual/    │     │  ST API      │     │  raw.*       │     │  master.*    │
│   Scheduled) │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Trigger**: User clicks "Pull" or scheduled job runs
2. **Fetch**: Call ST API with pagination (100 items/page)
3. **Store Raw**: Insert into `raw.st_pricebook_*` tables
4. **Process**: Transform and upsert to `master.pricebook_*`
5. **Emit**: Socket.io event for real-time UI update

### Push Flow (LAZI → ST)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User Edit  │ ──▶ │  Store in    │ ──▶ │  Push to     │ ──▶ │  Update      │
│  in UI       │     │  crm.*       │     │  ST API      │     │  master.*    │
│              │     │  overrides   │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Edit**: User modifies item in UI
2. **Store Override**: Save to `crm.pricebook_overrides` with `pending_sync=true`
3. **Push**: Call ST API to update item
4. **Update Master**: Apply changes to `master.*` tables
5. **Clear Flag**: Set `pending_sync=false`

### Sync API Endpoints

```bash
# Full sync (all items)
POST /api/pricebook/sync/full

# Incremental sync (changes only)
POST /api/pricebook/sync/incremental

# Sync specific entity
POST /api/pricebook/categories/sync
POST /api/pricebook/materials/sync
POST /api/pricebook/services/sync

# Push pending changes
POST /api/pricebook/categories/push
POST /api/pricebook/materials/push
POST /api/pricebook/services/push

# Check sync status
GET /api/pricebook/sync/status
```

---

## Pricing Calculations

### Material Pricing

```
Selling Price = Cost × (1 + Markup%)
Member Price = Selling Price × (1 - Member Discount%)
Add-On Price = Selling Price × Add-On Multiplier
```

### Service Pricing

```
Service Price = Labor Cost + Material Cost + Markup
Labor Cost = Duration Hours × Hourly Rate
Material Cost = Σ(Material Price × Quantity)
```

### Margin Calculation

```
Margin % = ((Price - Cost) / Price) × 100
Markup % = ((Price - Cost) / Cost) × 100
```

---

## UI Components

### Main Pages

| Page | Path | Component |
|------|------|-----------|
| Pricebook Home | `/pricebook` | `PricebookPage` |
| Categories | `/pricebook/categories` | `CategoriesPanel` |
| Materials | `/pricebook/materials` | `MaterialsPanel` |
| Services | `/pricebook/services` | `ServicesPanel` |
| Equipment | `/pricebook/equipment` | `EquipmentPanel` |
| Kits | `/pricebook/kits` | `KitsPanel` |
| Organization | `/pricebook/organization` | `OrganizationDashboard` |

### Key Components

| Component | Purpose |
|-----------|---------|
| `CategoriesPanel` | Category tree with drag-drop reordering |
| `MaterialDetailPage` | Full material edit form (77KB) |
| `ServiceDetailPage` | Service edit with materials/equipment |
| `CategoryImage` | Image display with fallback |
| `PendingChangesBar` | Shows pending push count |
| `VirtualizedCategoryList` | Performance for large lists |
| `KitSelectorModal` | Add kit to service |
| `CategorySelectorModal` | Assign categories |

### Component Locations

```
apps/web/components/pricebook/
├── categories-panel.tsx
├── materials-panel.tsx
├── services-panel.tsx
├── equipment-panel.tsx
├── material-detail-page.tsx
├── service-detail-page.tsx
├── CategoryImage.tsx
├── PendingChangesBar.tsx
├── kits/
│   ├── KitsPanel.tsx
│   ├── KitDetailPage.tsx
│   └── KitSelectorModal.tsx
└── organization/
    ├── HealthDashboard.tsx
    ├── DuplicateManager.tsx
    └── BulkEditor.tsx
```

---

## Organization Features

### Health Scoring

The Organization Dashboard provides health metrics:

```javascript
// Health score calculation
const healthScore = {
  materials: calculateEntityHealth(materials),
  services: calculateEntityHealth(services),
  overall: (materials + services) / 2
};

function calculateEntityHealth(items) {
  const issues = items.filter(i => 
    !i.image || !i.description || i.price === 0
  );
  return ((items.length - issues.length) / items.length) * 100;
}
```

### Issue Detection

| Issue | Detection |
|-------|-----------|
| No Image | `default_image_url IS NULL` |
| No Description | `description IS NULL OR description = ''` |
| Zero Price | `price = 0` |
| Uncategorized | `category_ids IS NULL OR array_length(category_ids, 1) = 0` |
| Not Reviewed | `is_reviewed = false` |

### Duplicate Detection

```sql
-- Find potential duplicates by name similarity
SELECT a.st_id, a.name, b.st_id, b.name,
       similarity(a.name, b.name) as score
FROM master.pricebook_materials a
JOIN master.pricebook_materials b ON a.st_id < b.st_id
WHERE similarity(a.name, b.name) > 0.8;
```

---

## Best Practices

### For Developers

1. **Always use st_id** for ServiceTitan entity references
2. **Never modify raw.*** tables directly - only via sync
3. **Store edits in crm.*** as overrides until pushed
4. **Use TanStack Query** for data fetching with proper cache keys
5. **Emit Socket.io events** after sync operations

### For Users

1. **Review items** before pushing to ServiceTitan
2. **Use bulk operations** for large changes
3. **Check health dashboard** regularly
4. **Resolve duplicates** to keep data clean
5. **Sync incrementally** to avoid rate limits

---

## Related Files

### Backend
- `services/api/src/routes/pricebook-categories.js`
- `services/api/src/routes/pricebook-materials.js`
- `services/api/src/routes/pricebook-services.js`
- `services/api/src/routes/pricebook-equipment.js`
- `services/api/src/routes/pricebook-kits.js`
- `services/api/src/workers/pricebook-category-sync.js`

### Frontend
- `apps/web/app/(dashboard)/pricebook/page.tsx`
- `apps/web/components/pricebook/*.tsx`
- `apps/web/hooks/usePricebookCategories.ts`
- `apps/web/hooks/usePricebookOrganization.ts`

### Database
- `database/migrations/001_pricebook_schema.sql`
- `database/migrations/015_materials_st_fields.sql`
- `database/migrations/020_master_pricebook_categories.sql`
- `database/migrations/023_material_kits.sql`

---

*Pricebook system documentation - January 2025*
