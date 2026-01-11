# Implementation Plan: Pricing Builder Tabs Alignment

## Overview
- **Feature**: Align pricing builder tabs (Workforce, Fleet, Expenses, Rates, P&L) with design reference
- **Reference**: `docs/reference/ui-prototypes/advanced-pricing-system.html`
- **Priority**: High
- **Effort**: Medium (3-4 hours)
- **Target Directory**: `apps/web/app/pricebook/pricing/`

## Current State Analysis

### Existing Implementation (Already Complete)
The current implementation is **largely complete** and well-structured. After thorough analysis:

1. **WorkforceTab.tsx** (423 lines) - COMPLETE
   - Technician list with expandable rows
   - Burden breakdown panel (amber)
   - Productivity panel (emerald)
   - Vehicle assignment panel (violet)
   - Add/Edit/Delete modals working
   - Summary metrics at top

2. **FleetTab.tsx** (279 lines) - COMPLETE
   - Vehicle cards with status badges
   - Cost breakdown per vehicle
   - Equity calculations
   - Monthly fleet totals summary
   - Add/Edit/Delete modals working

3. **ExpensesTab.tsx** (307 lines) - COMPLETE
   - Collapsible expense categories
   - Items within categories
   - Frequency-based calculations
   - Add/Edit/Delete modals working
   - Total overhead display

4. **RatesTab.tsx** (366 lines) - COMPLETE
   - Job type rate cards with gradient headers
   - Material markup tier table
   - Material price calculator
   - Add/Edit/Delete modals working

5. **PLTab.tsx** (271 lines) - COMPLETE
   - Projected P&L statement
   - Break-even analysis cards
   - Revenue allocation bar chart
   - Revenue per technician metrics

6. **OverviewTab.tsx** (294 lines) - COMPLETE
   - Summary metrics grid
   - Workforce/Fleet/Overhead summaries
   - Break-even analysis
   - Cost build-up visualization

### Calculations Library (485 lines) - COMPLETE
All financial calculations implemented in `lib/calculations.ts`:
- Technician burden calculations (FICA, FUTA, SUTA, workers comp, benefits)
- Office staff metrics
- Fleet cost allocation
- Expense normalization
- Rate calculations from margin
- Material markup tiers
- Full P&L summary

### Type Definitions (585 lines) - COMPLETE
All TypeScript types defined in `lib/types.ts`:
- All entity types
- Form data types
- Calculation result types
- API response types

### Modals (7 files) - COMPLETE
- TechnicianModal
- OfficeStaffModal
- VehicleModal
- ExpenseItemModal
- JobTypeModal
- MarkupTierModal

## Gap Analysis

After comparing with the HTML prototype, the current implementation **already matches the design reference**. The following minor enhancements could improve the experience:

### Minor Gaps Identified

1. **Data Mutation Support** - The tab components have mutation handlers defined but they're not connected to the page-level mutations
2. **Unproductive Time Categories** - Missing the category dropdown for unproductive time entries
3. **Markup Tier Delete Button** - Missing delete functionality on markup tier rows

## Requirements & Success Criteria

### Functional Requirements
1. All CRUD operations must work for:
   - Technicians (including unproductive time)
   - Office Staff
   - Vehicles
   - Expenses
   - Job Types
   - Markup Tiers

2. All calculations must update in real-time when data changes

3. All modals must properly validate input

### Success Criteria
- [ ] Create/Update/Delete technicians works with API
- [ ] Create/Update/Delete office staff works with API
- [ ] Create/Update/Delete vehicles works with API
- [ ] Create/Update/Delete expenses works with API
- [ ] Create/Update/Delete job types works with API
- [ ] Create/Update/Delete markup tiers works with API
- [ ] Data refreshes after mutations
- [ ] No TypeScript errors
- [ ] No console errors

## Files to Modify

### Primary Files
| File | Action | Description |
|------|--------|-------------|
| `apps/web/app/pricebook/pricing/page.tsx` | MODIFY | Wire up mutation handlers to tab components |
| `apps/web/app/pricebook/pricing/components/RatesTab.tsx` | MODIFY | Add delete button for markup tiers |

### API Routes (Already Exist)
| File | Status |
|------|--------|
| `apps/web/app/pricebook/pricing/api/technicians/route.ts` | EXISTS |
| `apps/web/app/pricebook/pricing/api/technicians/[id]/route.ts` | EXISTS |
| `apps/web/app/pricebook/pricing/api/office-staff/route.ts` | EXISTS |
| `apps/web/app/pricebook/pricing/api/office-staff/[id]/route.ts` | EXISTS |
| `apps/web/app/pricebook/pricing/api/vehicles/route.ts` | EXISTS |
| `apps/web/app/pricebook/pricing/api/vehicles/[id]/route.ts` | EXISTS |
| `apps/web/app/pricebook/pricing/api/expenses/route.ts` | EXISTS |
| `apps/web/app/pricebook/pricing/api/expenses/[id]/route.ts` | EXISTS |
| `apps/web/app/pricebook/pricing/api/job-types/route.ts` | EXISTS |
| `apps/web/app/pricebook/pricing/api/job-types/[id]/route.ts` | EXISTS |

### New Files Needed
| File | Purpose |
|------|---------|
| `apps/web/app/pricebook/pricing/api/markup-tiers/route.ts` | Create markup tiers endpoint |
| `apps/web/app/pricebook/pricing/api/markup-tiers/[id]/route.ts` | Update/Delete markup tiers |

## Step-by-Step Implementation Tasks

### Phase 1: Wire Up Mutations in Main Page (Priority: High)

#### Task 1.1: Add TanStack Query Mutations
File: `apps/web/app/pricebook/pricing/page.tsx`

```typescript
// Add these imports
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Add mutation hooks after the query
const queryClient = useQueryClient();

// Technician mutations
const createTechnicianMutation = useMutation({
  mutationFn: async (data: TechnicianFormData) => {
    const res = await fetch(apiUrl('/pricebook/pricing/api/technicians'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create technician');
    return res.json();
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pricing-data'] }),
});

// Add similar mutations for:
// - updateTechnicianMutation
// - deleteTechnicianMutation
// - createOfficeStaffMutation
// - updateOfficeStaffMutation
// - deleteOfficeStaffMutation
// - createVehicleMutation
// - updateVehicleMutation
// - deleteVehicleMutation
// - createExpenseMutation
// - updateExpenseMutation
// - deleteExpenseMutation
// - createJobTypeMutation
// - updateJobTypeMutation
// - deleteJobTypeMutation
// - createMarkupTierMutation
// - updateMarkupTierMutation
// - deleteMarkupTierMutation
```

#### Task 1.2: Pass Handlers to Tab Components
```typescript
{activeTab === 'workforce' && (
  <WorkforceTab
    data={data}
    calculations={calculations}
    onCreateTechnician={(data) => createTechnicianMutation.mutate(data)}
    onUpdateTechnician={(id, data) => updateTechnicianMutation.mutate({ id, data })}
    onDeleteTechnician={(id) => deleteTechnicianMutation.mutate(id)}
    onCreateOfficeStaff={(data) => createOfficeStaffMutation.mutate(data)}
    onUpdateOfficeStaff={(id, data) => updateOfficeStaffMutation.mutate({ id, data })}
    onDeleteOfficeStaff={(id) => deleteOfficeStaffMutation.mutate(id)}
    isLoading={
      createTechnicianMutation.isPending ||
      updateTechnicianMutation.isPending ||
      deleteTechnicianMutation.isPending
    }
  />
)}
```

### Phase 2: Create Markup Tier API Routes (Priority: High)

#### Task 2.1: Create Collection Route
File: `apps/web/app/pricebook/pricing/api/markup-tiers/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { apiUrl } from '@/lib/api';

export async function GET() {
  const res = await fetch(apiUrl('/pricing/markup-tiers'));
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(apiUrl('/pricing/markup-tiers'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 201 : 400 });
}
```

#### Task 2.2: Create Individual Route
File: `apps/web/app/pricebook/pricing/api/markup-tiers/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { apiUrl } from '@/lib/api';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const res = await fetch(apiUrl(`/pricing/markup-tiers/${params.id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : 400 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const res = await fetch(apiUrl(`/pricing/markup-tiers/${params.id}`), {
    method: 'DELETE',
  });
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
```

### Phase 3: Add Delete Button to Markup Tiers (Priority: Medium)

#### Task 3.1: Update RatesTab
File: `apps/web/app/pricebook/pricing/components/RatesTab.tsx`

Add delete button to markup tier table rows:
```typescript
// Line ~294-297, add after edit button:
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7 text-red-500 hover:text-red-600"
  onClick={() => onDeleteMarkupTier?.(tier.id)}
>
  <Trash2 className="h-3 w-3" />
</Button>
```

### Phase 4: Backend API Routes (if not exist)

#### Task 4.1: Check Express.js Routes
Verify these routes exist in `services/api/src/routes/`:
- `pricing-technicians.js`
- `pricing-office-staff.js`
- `pricing-vehicles.js`
- `pricing-expenses.js`
- `pricing-job-types.js`
- `pricing-markup-tiers.js`

If missing, create them following the pattern in existing route files.

### Phase 5: Validation & Polish (Priority: Low)

#### Task 5.1: Add Confirmation Dialogs for Delete
Consider adding confirmation dialogs before delete operations

#### Task 5.2: Add Toast Notifications
Add success/error toasts after mutations

#### Task 5.3: Add Loading States
Show loading spinners during mutations

## Testing Strategy

### Manual Testing Checklist
1. **Workforce Tab**
   - [ ] Add new technician
   - [ ] Edit technician
   - [ ] Delete technician
   - [ ] Add office staff
   - [ ] Edit office staff
   - [ ] Delete office staff
   - [ ] Verify calculations update

2. **Fleet Tab**
   - [ ] Add new vehicle
   - [ ] Edit vehicle
   - [ ] Delete vehicle
   - [ ] Verify equity calculations

3. **Expenses Tab**
   - [ ] Add expense item
   - [ ] Edit expense item
   - [ ] Delete expense item
   - [ ] Verify monthly totals

4. **Rates Tab**
   - [ ] Add job type
   - [ ] Edit job type
   - [ ] Delete job type (if implemented)
   - [ ] Add markup tier
   - [ ] Edit markup tier
   - [ ] Delete markup tier
   - [ ] Test material price calculator

5. **P&L Tab**
   - [ ] Verify projections update with data changes
   - [ ] Verify break-even calculations

6. **Overview Tab**
   - [ ] Verify all metrics reflect current data

## Validation Commands

```bash
# TypeScript check
cd apps/web && pnpm typecheck

# Lint check
cd apps/web && pnpm lint

# Build check
cd apps/web && pnpm build

# Run dev server and test manually
cd apps/web && pnpm dev
```

## Notes for Executing Agent

1. **Start with Phase 1** - The mutations are the critical missing piece
2. **Test each mutation individually** before moving to the next
3. **Check API response format** - Make sure the API returns the expected shape
4. **Invalidate queries properly** - Use `queryClient.invalidateQueries` to refresh data
5. **Handle errors gracefully** - Show user-friendly error messages
6. **The UI components are already complete** - Focus on wiring up the data flow

## Dependencies

- TanStack Query (already installed)
- shadcn/ui components (already installed)
- Express.js backend routes (verify exist)
- PostgreSQL pricing schema (already created)

## Rollback Plan

If issues arise:
1. Revert page.tsx to remove mutation wiring
2. Keep tab components as-is (they're display-only without handlers)
3. Debug API routes independently
