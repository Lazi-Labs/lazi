# RCA: Pricing Builder Data Binding and API Routes Broken

## Summary
- **Description**: Multiple UI and data binding issues in the pricing builder panel
- **Severity**: HIGH
- **Status**: IDENTIFIED - Requires implementation fix
- **Affected Component**: `/components/pricebook/pricing-builder-panel.tsx`

## Problem

### Expected Behavior
1. Edit modals should populate with existing entity data when clicking "Edit"
2. Expanded technician panels should show real data, not calculations from potentially stale data
3. Job type cards should display actual member_discount_percent, material_gross_margin, and flat_surcharge
4. Users should see toast notifications on successful save/delete operations

### Actual Behavior
1. **Edit modals open with blank/default fields** - not populating existing values
2. WorkforceTab expanded panels calculate values correctly BUT rely on technicianMetrics which may lag behind
3. **Job type cards show hardcoded placeholders**: "10%", "25%", "$0"
4. **No toast notifications** - mutations appear to fail silently

### Reproduction Steps
1. Navigate to https://lazilabs.com/dashboard/pricebook?section=pricing-builder
2. Go to Workforce tab
3. Click on any technician row to expand
4. Click "Edit" button
5. Observe: Form fields are empty/default, not populated with technician data

## Root Cause Analysis

### Issue 1: Form useState Doesn't React to Prop Changes

**Location**: `pricing-builder-panel.tsx` lines 250-266, 477-491, 688-694

**Problem**: React's `useState` only uses its initial value on first mount. When the parent component changes the `technician`, `vehicle`, or `item` prop, the form state doesn't update.

```tsx
// CURRENT (BROKEN):
const [formData, setFormData] = useState<Partial<Technician>>(
  technician || { first_name: '', ... }  // Only evaluated on mount!
);
```

**Fix Required**: Add useEffect to sync props to state:
```tsx
// FIX:
const [formData, setFormData] = useState<Partial<Technician>>(
  technician || { first_name: '', ... }
);

useEffect(() => {
  if (technician) {
    setFormData(technician);
  } else {
    setFormData({ first_name: '', ... });
  }
}, [technician, open]); // Reset when dialog opens or technician changes
```

### Issue 2: Hardcoded Values in Rates Tab

**Location**: `pricing-builder-panel.tsx` lines 1636-1651

**Problem**: Member Discount, Material Margin, and Surcharge are hardcoded:
```tsx
<span className="text-lg font-medium">10%</span>  // Line 1638
<span className="text-lg font-medium">25%</span>  // Line 1644
<span className="text-lg font-medium">$0</span>   // Line 1650
```

**API Response Has Real Data**:
```json
{
  "member_discount_percent": 10,
  "material_gross_margin": 40,
  "flat_surcharge": 0
}
```

### Issue 3: jobTypeRates Interface Missing Fields

**Location**: `pricing-builder-panel.tsx` lines 130-138

**Current Interface**:
```tsx
jobTypeRates: Array<{
  jobTypeId: string;
  name: string;
  code: string | null;
  hourlyRate: number;
  memberRate: number;
  minInvoice: number;
  targetMargin: number;
  // MISSING: member_discount_percent, material_gross_margin, flat_surcharge
}>;
```

**Required**: Add missing fields to interface OR fetch job types separately.

### Issue 4: No Toast Notifications

**Location**: Entire `pricing-builder-panel.tsx`

**Problem**: No import or usage of toast/notification system. Mutations complete (or fail) with no user feedback.

**Required**:
1. Import toast: `import { toast } from '@/components/ui/use-toast';`
2. Add onSuccess/onError handlers to all mutations

## Proposed Fix

### Files to Modify

| File | Changes |
|------|---------|
| `components/pricebook/pricing-builder-panel.tsx` | Add useEffect to sync form state, add toast notifications, fix hardcoded values |

### Implementation Steps

#### Step 1: Fix Form State Synchronization
Add `useEffect` to all three form dialogs:

```tsx
// TechnicianFormDialog - after useState
useEffect(() => {
  if (open) {
    setFormData(technician || {
      first_name: '',
      last_name: '',
      role: 'Technician',
      status: 'active',
      pay_type: 'hourly',
      base_pay_rate: 0,
      paid_hours_per_day: 8,
      payroll_tax_rate: 7.65,
      futa_rate: 0.6,
      suta_rate: 2.7,
      workers_comp_rate: 8.5,
      health_insurance_monthly: 0,
      retirement_401k_match_percent: 0,
    });
  }
}, [technician, open]);
```

#### Step 2: Add Toast Notifications
```tsx
import { useToast } from '@/components/ui/use-toast';

// In PricingBuilderPanel:
const { toast } = useToast();

// Update mutations:
const saveTechMutation = useMutation({
  mutationFn: async (data) => { ... },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['pricing-technicians'] });
    queryClient.invalidateQueries({ queryKey: ['pricing-calculations'] });
    setTechDialogOpen(false);
    setEditingTech(null);
    toast({
      title: editingTech ? 'Technician Updated' : 'Technician Created',
      description: 'Changes saved successfully.',
    });
  },
  onError: (error) => {
    toast({
      title: 'Error',
      description: error.message || 'Failed to save technician.',
      variant: 'destructive',
    });
  },
});
```

#### Step 3: Update jobTypeRates Interface (Optional - for Rates Tab)
```tsx
jobTypeRates: Array<{
  jobTypeId: string;
  name: string;
  code: string | null;
  hourlyRate: number;
  memberRate: number;
  minInvoice: number;
  targetMargin: number;
  memberDiscountPercent: number;      // ADD
  materialGrossMargin: number;        // ADD
  flatSurcharge: number;              // ADD
}>;
```

Then update the Rates Tab to use these values instead of hardcoded strings.

## Testing Requirements

### Manual Testing Checklist
- [ ] Workforce Tab: Click Edit on technician → Fields populate with existing data
- [ ] Workforce Tab: Save technician → Toast notification appears
- [ ] Workforce Tab: Delete technician → Toast notification appears
- [ ] Fleet Tab: Click Edit on vehicle → Fields populate with existing data
- [ ] Fleet Tab: Save vehicle → Toast notification appears
- [ ] Expenses Tab: Click Edit on expense → Fields populate with existing data
- [ ] Rates Tab: Job type cards show real member_discount_percent values (not "10%")

### Validation Commands
```bash
# TypeScript check
cd /opt/docker/apps/lazi/apps/web && npx tsc --noEmit --skipLibCheck

# Rebuild container
cd /opt/docker/apps/lazi/infrastructure/docker && docker compose -f docker-compose.production.yml --env-file ../../.env up -d --build lazi-web
```

## API Verification (Completed)

All API endpoints are functional. External service at `pricing.lazilabs.com` returns correct data:

```bash
# Technicians - Returns 4 technicians with all fields
curl https://pricing.lazilabs.com/api/pricing/technicians
# ✅ Response: {"data":[{id, first_name, last_name, base_pay_rate, ...}], "error": null}

# Vehicles - Returns vehicle fleet
curl https://pricing.lazilabs.com/api/pricing/vehicles
# ✅ Working

# Job Types - Returns 3 job types with member_discount_percent, material_gross_margin
curl https://pricing.lazilabs.com/api/pricing/job-types
# ✅ Response: {"data":[{member_discount_percent: 0, material_gross_margin: 40, ...}]}
```

## Conclusion

The API layer is functioning correctly. The issues are all in the frontend React component:

1. **Form state not syncing with props** - needs useEffect
2. **Hardcoded values in Rates tab** - needs to use actual data
3. **No user feedback** - needs toast notifications

**Next Step**: `/implement-fix pricing-builder-data-binding`
