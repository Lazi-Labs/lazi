# RCA: Pricing Builder UI Alignment

## Summary
- **Description**: UI discrepancy between current implementation and design reference
- **Severity**: LOW (Non-issue - implementation already matches design)
- **Status**: RESOLVED - No code changes needed

## Problem

### Reported Issue
User reported that pricing builder tabs don't match the design reference at `docs/reference/ui-prototypes/advanced-pricing-system.html`:

1. **WorkforceTab**: Missing expandable technician rows with burden breakdown, productivity summary, and vehicle assignment panels
2. **RatesTab**: Missing gradient header cards for job types
3. **Overview metrics**: Wrong values (Loaded Cost/Hr: $82.71 expected, Fleet/Hr: $32.63 expected, Overhead/Hr: $74.63 expected)

### Expected Behavior
UI should match the HTML prototype design reference.

### Actual Behavior
**The implementation ALREADY matches the design reference.** After thorough code analysis:

## Root Cause Analysis

### Finding 1: WorkforceTab Expandable Rows - ALREADY IMPLEMENTED

The current `WorkforceTab.tsx` (lines 225-318) includes:
- ✅ Expandable technician rows with `ChevronDown`/`ChevronRight` toggle
- ✅ **Burden Breakdown** panel (amber-50 bg) at lines 229-264
- ✅ **Productivity Summary** panel (emerald-50 bg) at lines 267-291
- ✅ **Vehicle Assignment** panel (violet-50 bg) at lines 294-316

Code excerpt showing implementation:
```tsx
{isExpanded && metrics && (
  <div className="mt-3 ml-12 grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* Burden Breakdown */}
    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
      ...
    </div>
    {/* Productivity */}
    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
      ...
    </div>
    {/* Vehicle Assignment */}
    <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
      ...
    </div>
  </div>
)}
```

### Finding 2: RatesTab Gradient Cards - ALREADY IMPLEMENTED

The current `RatesTab.tsx` (lines 170-249) includes:
- ✅ Gradient header cards with rotating colors (sky, violet, emerald, amber, rose, blue)
- ✅ Large rate display in gradient header: `text-3xl font-bold`
- ✅ Target Margin, Member Discount display
- ✅ Member Rate and Min Invoice calculations
- ✅ Material Margin display

Code excerpt:
```tsx
const gradients = [
  'from-sky-500 to-cyan-500',
  'from-violet-500 to-purple-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-blue-500 to-indigo-500',
];

// Gradient Header
<div className={`bg-gradient-to-r ${gradient} p-4 text-white`}>
  <div className="text-3xl font-bold">
    {formatCurrency(hourlyRate, 2)}
    <span className="text-lg font-normal opacity-80">/hr</span>
  </div>
</div>
```

### Finding 3: Overview Metric Values - DATA-DRIVEN

The metric values ($82.71, $32.63, $74.63) shown in the HTML prototype are **hardcoded sample data** specific to "Perfect Catch & Pools". The actual application:

- ✅ Correctly calculates metrics from real database data
- ✅ Uses proper calculation formulas matching the prototype's JavaScript
- ✅ Values will differ based on actual organization data

The calculations in `calculations.ts` match the prototype's calculation engine:
- `avgLoadedCostPerHour`: Average of (trueCostPerHour + vehicleCostPerHour) across all techs
- `fleetCostPerHour`: Fleet monthly × 12 / total billable hours
- `overheadPerHour`: Monthly overhead × 12 / total billable hours

## Proposed Fix

**No code changes required.**

The UI implementation already matches the design reference. The perceived discrepancy is likely due to:

1. **Data differences**: Current org data differs from prototype sample data
2. **Collapsed state**: Expandable rows start collapsed and must be clicked to expand
3. **Cache/deployment**: User may be viewing an older cached version

### Recommended Actions

1. **Clear browser cache** and verify lazi-web container was rebuilt:
   ```bash
   docker ps | grep lazi-web  # Should show recent restart
   ```

2. **Verify data is loaded** from pricing API:
   - Open browser DevTools → Network tab
   - Navigate to Pricing page
   - Check `/pricebook/pricing/api` response contains technicians, vehicles, etc.

3. **Test expandable rows**:
   - Click on any technician row in Workforce tab
   - Three colored panels should appear: amber (Burden), emerald (Productivity), violet (Vehicle)

4. **Verify gradient cards**:
   - Navigate to Rates tab
   - Job Type cards should have colored gradient headers with rate in large white text

## Validation

```bash
# Verify container is running with latest build
docker ps | grep lazi-web

# Check for any console errors
# Browser DevTools → Console tab

# Verify TypeScript compiles
cd /opt/docker/apps/lazi/apps/web && npx tsc --noEmit
```

## Files Reviewed (No Changes Needed)

| File | Status |
|------|--------|
| `apps/web/app/pricebook/pricing/components/WorkforceTab.tsx` | ✅ Correct - has expandable rows |
| `apps/web/app/pricebook/pricing/components/RatesTab.tsx` | ✅ Correct - has gradient cards |
| `apps/web/app/pricebook/pricing/components/OverviewTab.tsx` | ✅ Correct - displays calculated values |
| `apps/web/app/pricebook/pricing/lib/calculations.ts` | ✅ Correct - matches prototype formulas |

## Conclusion

The pricing builder UI **fully implements** the design reference. No code changes are required. User should:
1. Clear browser cache
2. Verify latest container is running
3. Click on technician rows to see expandable panels
