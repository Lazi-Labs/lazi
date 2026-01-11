# Pricebook Organization Features - Integration Guide

## Overview

This guide shows how to integrate the new pricebook organization features into your existing LAZI codebase. The implementation follows your existing patterns exactly.

---

## Files Created

```
database/migrations/
└── 030_pricebook_organization.sql      # Database schema additions

apps/api/src/routes/
└── pricebook-organization.js           # New API routes (Express)

apps/web/hooks/
└── usePricebookOrganization.ts         # React Query hooks

apps/web/components/pricebook/organization/
└── PricebookHealthDashboard.tsx        # Health dashboard + Quick filters + Reviewed toggle
```

---

## Step 1: Run Database Migration

```bash
# From your project root
psql $DATABASE_URL -f database/migrations/030_pricebook_organization.sql
```

This migration:
- Adds `is_reviewed`, `reviewed_at`, `reviewed_by`, `health_score`, `priority_score` columns to `master.pricebook_materials` and `master.pricebook_services`
- Adds `has_local_changes`, `local_changes_at` columns for sync tracking
- Creates new CRM tables for saved views, audit log, duplicates, suggestions, progress tracking
- Creates views for health metrics, category completeness, and pending sync items
- Creates functions for health score calculation, duplicate detection, and pending sync counts
- Sets up audit triggers

---

## Step 2: Register API Routes

### Modify: `apps/api/src/index.js` (or wherever routes are registered)

```javascript
// Add import
import pricebookOrganizationRoutes from './routes/pricebook-organization.js';

// Add route registration (after other pricebook routes)
app.use('/api/pricebook/organization', pricebookOrganizationRoutes);
```

### New Endpoints Available

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pricebook/organization/health` | GET | Overall health dashboard |
| `/api/pricebook/organization/health/categories` | GET | Completeness by category |
| `/api/pricebook/organization/needs-attention` | GET | Prioritized work queue |
| `/api/pricebook/organization/duplicates` | GET | Potential duplicates |
| `/api/pricebook/organization/anomalies` | GET | Price/margin anomalies |
| `/api/pricebook/organization/bulk-update` | POST | Bulk update items |
| `/api/pricebook/organization/bulk-review` | POST | Bulk mark reviewed |
| `/api/pricebook/organization/audit-log` | GET | Recent changes |
| `/api/pricebook/organization/progress` | GET | User progress stats |
| `/api/pricebook/organization/saved-views` | CRUD | Saved filter views |
| `/api/pricebook/organization/pending-sync` | GET | Items with pending changes |
| `/api/pricebook/organization/pending-sync/counts` | GET | Count of pending items |
| `/api/pricebook/organization/pending-sync/push` | POST | Bulk push changes to ST |
| `/api/pricebook/organization/pending-sync/retry` | POST | Retry failed pushes |
| `/api/pricebook/organization/duplicates/merge` | POST | Merge duplicates |
| `/api/pricebook/organization/recalculate-health` | POST | Recalc health scores |

---

## Step 3: Update Existing API Routes

### Modify: `apps/api/src/routes/pricebook-services.js`

Add `is_reviewed` to the SELECT statement in the list endpoint:

```javascript
// Around line 99-128, update the SELECT query to include:
const query = `
  SELECT 
    s.id,
    s.st_id,
    s.code,
    s.name,
    s.display_name,
    s.description,
    s.price,
    s.member_price,
    s.add_on_price,
    s.cost,
    s.active,
    s.taxable,
    s.hours,
    s.is_labor,
    s.account,
    s.image_url,
    s.category_st_id,
    s.categories,
    s.warranty,
    s.is_reviewed,           -- ADD THIS
    s.reviewed_at,           -- ADD THIS
    s.health_score,          -- ADD THIS
    s.st_created_on,
    s.st_modified_on,
    s.created_at,
    s.updated_at
  FROM master.pricebook_services s
  WHERE ${whereClause}
  ORDER BY s.${safeSort} ${safeOrder}
  LIMIT $${params.length - 1} OFFSET $${params.length}
`;
```

Add filter support for `is_reviewed`:

```javascript
// Around line 56-77, add:
// Reviewed filter
if (req.query.is_reviewed === 'true') {
  whereConditions.push('s.is_reviewed = true');
} else if (req.query.is_reviewed === 'false') {
  whereConditions.push('s.is_reviewed = false');
}

// Issues filter (for needs-attention queue)
if (req.query.issue) {
  switch (req.query.issue) {
    case 'uncategorized':
      whereConditions.push('(s.category_st_id IS NULL OR s.category_st_id = 0)');
      break;
    case 'no_image':
      whereConditions.push("(s.image_url IS NULL OR s.image_url = '')");
      break;
    case 'zero_price':
      whereConditions.push('(s.price IS NULL OR s.price = 0)');
      break;
    case 'no_description':
      whereConditions.push("(s.description IS NULL OR s.description = '')");
      break;
  }
}
```

### Do the same for `pricebook-materials.js`

---

## Step 4: Integrate Frontend Components

### Add to: `apps/web/components/pricebook/services-panel.tsx`

```tsx
// Add imports at top
import { 
  PricebookHealthDashboard, 
  QuickFilters, 
  useQuickFilters,
  ReviewedBadge,
  type FilterType 
} from './organization/PricebookHealthDashboard';
import { useIssueCounts } from '@/hooks/usePricebookOrganization';

// Inside component:
export function ServicesPanel() {
  // Add quick filters hook
  const { activeFilters, toggleFilter, clearFilters } = useQuickFilters();
  const { combined: issueCounts } = useIssueCounts();

  // ... existing code ...

  return (
    <div className="flex h-full">
      {/* Add sidebar with health dashboard */}
      <div className="w-80 border-r p-4 overflow-auto hidden xl:block">
        <PricebookHealthDashboard 
          onFilterClick={(issue) => toggleFilter(issue as FilterType)}
          onViewAll={() => {/* navigate to triage view */}}
        />
      </div>

      <div className="flex-1 flex flex-col">
        {/* Add quick filters to toolbar */}
        <div className="p-4 border-b flex items-center gap-4">
          {/* existing toolbar items */}
          
          <QuickFilters
            activeFilters={activeFilters}
            onFilterToggle={toggleFilter}
            onClearAll={clearFilters}
            counts={issueCounts}
          />
        </div>

        {/* In your list/table rows, add the reviewed badge */}
        <div className="flex items-center gap-2">
          <span>{service.name}</span>
          <ReviewedBadge isReviewed={service.is_reviewed} />
        </div>
      </div>
    </div>
  );
}
```

### Add to: `apps/web/components/pricebook/service-detail-page.tsx`

```tsx
// Add import
import { ReviewedToggle } from './organization/PricebookHealthDashboard';
import { useBulkReview } from '@/hooks/usePricebookOrganization';

// Inside component, add to header section (around line 738-755 based on your architecture doc)
const reviewMutation = useBulkReview();

const handleToggleReviewed = async (reviewed: boolean) => {
  await reviewMutation.mutateAsync({
    entityType: 'services',
    stIds: [service.st_id],
    reviewed,
    userId: currentUserId, // however you get current user
  });
  // Refetch service detail
  refetch();
};

// In the render, add near the sync status badge:
<ReviewedToggle
  isReviewed={service.is_reviewed}
  onToggle={handleToggleReviewed}
  disabled={reviewMutation.isPending}
/>
```

---

## Step 5: Update Types

### Modify: `apps/web/types/pricebook.ts`

```typescript
// Add to Service interface
export interface Service {
  // ... existing fields ...
  is_reviewed?: boolean;
  reviewed_at?: string;
  reviewed_by?: string;
  health_score?: number;
}

// Add to Material interface (if separate)
export interface Material {
  // ... existing fields ...
  is_reviewed?: boolean;
  reviewed_at?: string;
  reviewed_by?: string;
  health_score?: number;
}
```

---

## Step 6: Add Organization Route/Page (Optional)

If you want a dedicated organization dashboard page:

### Create: `apps/web/app/dashboard/pricebook/organization/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PricebookHealthDashboard } from '@/components/pricebook/organization/PricebookHealthDashboard';
// Import other components as needed

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Pricebook Organization</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Health Dashboard</TabsTrigger>
          <TabsTrigger value="triage">Triage Queue</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
          <TabsTrigger value="anomalies">Price Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PricebookHealthDashboard />
            {/* Add more dashboard widgets */}
          </div>
        </TabsContent>

        {/* Other tabs */}
      </Tabs>
    </div>
  );
}
```

---

## Testing

### Test Health Endpoint
```bash
curl -X GET "http://localhost:3001/api/pricebook/organization/health" \
  -H "x-tenant-id: 3222348440"
```

### Test Bulk Review
```bash
curl -X POST "http://localhost:3001/api/pricebook/organization/bulk-review" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 3222348440" \
  -d '{"entityType": "services", "stIds": [12345, 67890], "reviewed": true, "userId": "test-user"}'
```

### Test Needs Attention Queue
```bash
curl -X GET "http://localhost:3001/api/pricebook/organization/needs-attention?entityType=materials&issueType=uncategorized&limit=20" \
  -H "x-tenant-id: 3222348440"
```

---

## Key Patterns Followed

1. **Database**: Uses your three-schema architecture (raw/master/crm). New columns added to existing `master.*` tables. New organization tables in `crm.*` schema.

2. **API Routes**: Follows your Express patterns with `asyncHandler`, `getTenantId`, `getPool`, cache utilities.

3. **React Hooks**: Uses `@tanstack/react-query` with query keys following your `['pricebook', ...]` pattern.

4. **Components**: Uses shadcn/ui components (Card, Button, Badge, Progress, etc.) with Tailwind and `cn()` utility.

5. **Caching**: Invalidates relevant caches after mutations using your `invalidateCache` utility.

---

## Next Steps

After basic integration, you can add:

1. **Split-Pane Triage View** - Rapid review without page navigation
2. **Duplicate Detector UI** - Review and merge similar items  
3. **Category Kanban** - Drag-drop category assignment
4. **Progress Tracker** - Gamification and achievements
5. **Import/Export** - Bulk data operations

These components are documented in the full implementation files.
