# RCA: Pricing Builder UI Empty Despite API Working

## Summary
- **Description**: Pricing Builder UI shows "No technicians configured" and 0 counts despite individual API endpoints returning data
- **Severity**: High - Core feature completely broken

## Problem

### Expected
- UI loads data from `/pricebook/pricing/api`
- Technicians, vehicles, expenses, etc. display correctly

### Actual
- UI shows empty state "No technicians added yet"
- All metric cards show 0 values
- Individual endpoints (`/api/technicians`, `/api/vehicles`) work correctly

### Reproduction Steps
1. Navigate to `/dashboard/pricebook/pricing`
2. Observe "No organization data found" or empty data states
3. Test individual endpoints - they return data correctly

## Root Cause

**File**: `apps/web/app/pricebook/pricing/api/route.ts`

The main data aggregation endpoint (`/pricebook/pricing/api`) is still a **proxy route** that calls the now-stopped `lazi-pricing` microservice:

```typescript
const PRICING_API_URL = process.env.PRICING_API_URL || 'https://pricing.lazilabs.com';

export async function GET() {
  const response = await fetch(`${PRICING_API_URL}/api/pricing`, { ... });
  // ...
}
```

During the consolidation, only the individual CRUD endpoints were converted to direct Supabase queries. The main aggregation route was missed because:
1. It wasn't in the list of proxy routes that were replaced
2. The `/api/pricing` endpoint never existed in the pricing-system (404)
3. The frontend expects a combined `PricingDataResponse` object with all entities

### Why Individual Endpoints Work
The individual endpoints (`/technicians`, `/vehicles`, etc.) were properly converted to direct Supabase queries and work correctly.

### Why UI is Empty
The page.tsx fetches ALL data from a single endpoint:
```typescript
const res = await fetch(apiUrl('/pricebook/pricing/api'));
return res.json();
```

This route returns an error because:
1. It tries to proxy to `pricing.lazilabs.com/api/pricing`
2. That endpoint returns 404 (never existed)
3. The microservice container was also stopped

## Proposed Fix

### Files to Modify
- `apps/web/app/pricebook/pricing/api/route.ts` - Replace proxy with Supabase aggregation

### Implementation
Replace the proxy route with a direct Supabase query that aggregates all required data:

```typescript
export async function GET() {
  const supabase = createServerClient();
  const orgId = await getOrgId();

  // Fetch all data in parallel
  const [org, techs, staff, vehicles, expenses, jobTypes, tiers] = await Promise.all([
    supabase.from("pricing_organizations").select("*").eq("id", orgId).single(),
    supabase.from("pricing_technicians").select("*").eq("organization_id", orgId),
    supabase.from("pricing_office_staff").select("*").eq("organization_id", orgId),
    supabase.from("pricing_vehicles").select("*").eq("organization_id", orgId),
    supabase.from("pricing_expense_categories").select("*, items:pricing_expense_items(*)"),
    supabase.from("pricing_job_types").select("*").eq("organization_id", orgId),
    supabase.from("pricing_markup_tiers").select("*").eq("organization_id", orgId),
  ]);

  return successResponse({
    settings: org.data,
    technicians: techs.data,
    officeStaff: staff.data,
    vehicles: vehicles.data,
    expenseCategories: expenses.data,
    jobTypes: jobTypes.data,
    markupTiers: tiers.data,
    unproductiveTimeMap: buildUnproductiveTimeMap(techs.data),
  });
}
```

### Testing Requirements
1. After fix, load `/dashboard/pricebook/pricing`
2. Verify all tabs show data:
   - Overview metrics populated
   - Workforce tab shows technicians
   - Fleet tab shows vehicles
   - Expenses tab shows categories
   - Rates tab shows job types
3. Verify CRUD still works (create/update/delete operations)

### Validation Commands
```bash
# Test aggregation endpoint
curl -s http://172.27.0.24:3000/dashboard/pricebook/pricing/api | jq 'keys'
# Expected: ["settings", "technicians", "officeStaff", "vehicles", ...]

# Verify data count
curl -s http://172.27.0.24:3000/dashboard/pricebook/pricing/api | jq '.technicians | length'
# Expected: 6
```

## Timeline
- Introduced: During pricing-system consolidation (this session)
- Root cause: Missing aggregation route from migration scope
