# Pricebook Organization - Frontend Implementation (Windsurf)

Backend API is ready at `/api/pricebook/organization/*`. Create the frontend components.

---

## Files to Create

### 1. `apps/web/hooks/usePricebookOrganization.ts`

React Query hooks following patterns from `usePricebookCategories.ts`:

```typescript
// Hooks needed:
- usePricebookHealth() - GET /health
- useCategoryCompleteness(entityType) - GET /health/categories
- useNeedsAttention({ entityType, issueType, limit, offset }) - GET /needs-attention
- useDuplicates(entityType, threshold) - GET /duplicates
- useAnomalies() - GET /anomalies
- useBulkUpdate() - POST /bulk-update
- useBulkReview() - POST /bulk-review
- useAuditLog({ userId, entityType, days }) - GET /audit-log
- useProgress(userId) - GET /progress
- useSavedViews(userId, entityType) - GET /saved-views
- useCreateSavedView() - POST /saved-views
- useDeleteSavedView() - DELETE /saved-views/:id
- usePendingSyncCounts() - GET /pending-sync/counts (refetch every 60s)
- usePendingSync({ entityType, status, limit }) - GET /pending-sync
- usePushToServiceTitan() - POST /pending-sync/push
- useRetryPendingSync() - POST /pending-sync/retry
- useIssueCounts() - derived from usePricebookHealth for filter badges
```

API base: `${process.env.NEXT_PUBLIC_API_URL}/api/pricebook/organization`
Headers: `'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID || '3222348440'`

---

### 2. `apps/web/components/pricebook/organization/PricebookHealthDashboard.tsx`

Health dashboard card showing overall pricebook quality.

**Props:**
```typescript
interface PricebookHealthDashboardProps {
  onFilterClick?: (issueType: string, entityType?: string) => void;
  onViewAll?: () => void;
  className?: string;
  compact?: boolean; // For sidebar use
}
```

**UI Elements:**
- Overall score as large number with A-F grade badge
- Progress bar for score visualization
- Issue cards grid (2x2): Uncategorized, No Image, Zero Price, No Description
  - Each card shows count, clickable to filter
  - Green checkmark if count is 0
- Entity breakdown: Materials score, Services score with review progress
- "View X Items Needing Attention" button

**Use:** shadcn Card, Badge, Progress, Button. Lucide icons.

---

### 3. `apps/web/components/pricebook/organization/QuickFilters.tsx`

Horizontal filter bar with toggle buttons.

**Props:**
```typescript
interface QuickFiltersProps {
  activeFilters: FilterType[];
  onFilterToggle: (filter: FilterType) => void;
  onClearAll: () => void;
  counts?: Partial<Record<FilterType, number>>;
  className?: string;
}

type FilterType = 'uncategorized' | 'no_image' | 'zero_price' | 'no_description' | 'unreviewed' | 'reviewed' | 'pending_sync';
```

**UI Elements:**
- Row of small buttons, each with icon + label + count badge
- Active state: filled button, inactive: outline
- "Clear (N)" link when filters active
- Include `useQuickFilters()` hook for state management

**Filters:**
| ID | Label | Icon | Color |
|----|-------|------|-------|
| uncategorized | Uncategorized | FolderOpen | yellow |
| no_image | No Image | Image | orange |
| zero_price | Zero Price | DollarSign | red |
| no_description | No Description | FileText | blue |
| unreviewed | Needs Review | XCircle | gray |
| reviewed | Reviewed | CheckCircle2 | green |
| pending_sync | Pending Sync | Upload | orange |

---

### 4. `apps/web/components/pricebook/organization/ReviewedToggle.tsx`

Button to mark item as reviewed/field-ready.

**Props:**
```typescript
interface ReviewedToggleProps {
  isReviewed: boolean;
  onToggle: (reviewed: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}
```

**UI:**
- When reviewed: Green filled button with checkmark, "FIELD READY"
- When not reviewed: Outline button, "Mark Reviewed"
- Uses `useBulkReview` hook internally or accepts callback

**Also export:** `ReviewedBadge` - small inline badge for list rows (green checkmark when reviewed)

---

### 5. `apps/web/components/pricebook/organization/PendingSyncBadge.tsx`

Header indicator showing items pending push to ServiceTitan.

**Props:**
```typescript
interface PendingSyncBadgeProps {
  onClick?: () => void;
  className?: string;
}
```

**UI:**
- Uses `usePendingSyncCounts()` hook
- Badge with Upload icon + count
- Orange background for pending, red for errors
- Tooltip: "X items pending sync to ServiceTitan"
- Pulsing animation if count > 0
- Click opens PendingSyncPanel modal/drawer

---

### 6. `apps/web/components/pricebook/organization/PendingSyncPanel.tsx`

Panel/modal showing items with local changes not pushed to ST.

**Props:**
```typescript
interface PendingSyncPanelProps {
  open: boolean;
  onClose: () => void;
  entityType?: 'material' | 'service' | 'all';
}
```

**UI Elements:**
- Header: "Pending Sync to ServiceTitan" with count
- Tabs or filter: All | Services | Materials | Errors
- Table columns:
  - Checkbox (for bulk selection)
  - Type icon (Package for material, Wrench for service)
  - Code
  - Name
  - Changes (pills showing what changed: "price", "name", "description")
  - Pending Since (relative time)
  - Status (pending badge or error with message)
- Action buttons:
  - "Push Selected (N)" - disabled if none selected
  - "Push All Pending"
  - "Retry Failed" - only if errors exist
- Loading states during push
- Success/error toast notifications

**Hooks used:**
- `usePendingSync()` for data
- `usePushToServiceTitan()` for push action
- `useRetryPendingSync()` for retry

---

### 7. Integration into `services-panel.tsx`

Add organization features to existing services list.

**Changes:**

```tsx
// 1. Import new components
import { PricebookHealthDashboard } from './organization/PricebookHealthDashboard';
import { QuickFilters, useQuickFilters } from './organization/QuickFilters';
import { ReviewedBadge } from './organization/ReviewedToggle';
import { PendingSyncBadge } from './organization/PendingSyncBadge';
import { PendingSyncPanel } from './organization/PendingSyncPanel';
import { useIssueCounts, usePendingSyncCounts } from '@/hooks/usePricebookOrganization';

// 2. Add state
const { activeFilters, toggleFilter, clearFilters } = useQuickFilters();
const { combined: issueCounts } = useIssueCounts();
const { data: syncCounts } = usePendingSyncCounts();
const [syncPanelOpen, setSyncPanelOpen] = useState(false);

// 3. Add to sidebar (if exists) or as collapsible section
<div className="w-80 border-r p-4 hidden xl:block">
  <PricebookHealthDashboard 
    onFilterClick={(issue) => toggleFilter(issue)}
    compact
  />
</div>

// 4. Add to header/toolbar area
<div className="flex items-center gap-2">
  <PendingSyncBadge onClick={() => setSyncPanelOpen(true)} />
  {/* existing toolbar items */}
</div>

// 5. Add quick filters below search
<QuickFilters
  activeFilters={activeFilters}
  onFilterToggle={toggleFilter}
  onClearAll={clearFilters}
  counts={{ ...issueCounts, pending_sync: syncCounts?.totalPending }}
/>

// 6. In list row, add badges
<div className="flex items-center gap-2">
  <span>{service.name}</span>
  <ReviewedBadge isReviewed={service.is_reviewed} />
  {service.has_local_changes && (
    <span className="w-2 h-2 rounded-full bg-yellow-500" title="Pending sync" />
  )}
</div>

// 7. Add pending sync panel
<PendingSyncPanel
  open={syncPanelOpen}
  onClose={() => setSyncPanelOpen(false)}
  entityType="service"
/>

// 8. Update query to include filters
// Add is_reviewed and issue filters to your existing fetch
```

---

## API Response Shapes

### GET /health
```json
{
  "success": true,
  "data": {
    "overallScore": 72,
    "scores": { "materials": 68, "services": 76 },
    "stats": {
      "materials": { "total": 500, "active": 450, "reviewed": 200, "uncategorized": 50, "no_image": 120, "zero_price": 15, "no_description": 80 },
      "services": { "total": 300, "active": 280, "reviewed": 150, "uncategorized": 20, "no_image": 60, "zero_price": 5, "no_description": 40 }
    },
    "grade": "C",
    "totalIssues": 390
  }
}
```

### GET /pending-sync/counts
```json
{
  "success": true,
  "data": {
    "service": { "pending": 12, "errors": 2, "oldest": "2025-01-08T..." },
    "material": { "pending": 5, "errors": 0, "oldest": "2025-01-09T..." }
  },
  "totalPending": 17,
  "totalErrors": 2
}
```

### GET /pending-sync
```json
{
  "success": true,
  "data": [
    {
      "entity_type": "service",
      "st_id": 12345,
      "code": "SVC-001",
      "name": "Pool Cleaning",
      "sync_status": "pending",
      "sync_error": null,
      "pending_since": "2025-01-08T10:30:00Z",
      "pending_changes": { "price": 150, "name": null, "description": "Updated desc" }
    }
  ],
  "counts": { ... },
  "total": 17
}
```

### POST /pending-sync/push
Request: `{ "entityType": "service", "stIds": [12345, 67890], "userId": "user-123" }`
Response:
```json
{
  "success": true,
  "pushed": 2,
  "failed": 0,
  "errors": []
}
```

---

## Styling Notes

- Use shadcn/ui components: Card, Badge, Button, Progress, Checkbox, Dialog/Sheet
- Icons from lucide-react
- Tailwind for layout, use `cn()` utility for conditional classes
- Match existing panel styling from services-panel.tsx
- Mobile responsive: hide sidebar health dashboard on small screens, show compact version in header

---

## Testing Checklist

After implementation:
- [ ] Health dashboard loads and shows correct scores
- [ ] Quick filters toggle and filter the list
- [ ] Review toggle updates item and shows toast
- [ ] Pending sync badge shows correct count
- [ ] Pending sync panel lists items correctly
- [ ] Bulk push works and updates counts
- [ ] Error retry works
- [ ] All loading/error states handled
