# Implementation Plan: Pricing Tabs UI Rebuild

## Overview
- **Feature**: Rebuild WorkforceTab and RatesTab to match `docs/reference/ui-prototypes/advanced-pricing-system.html`
- **Priority**: High
- **Effort**: Medium (4-5 hours)
- **Reference**: Lines 795-1034 (Workforce), Lines 1261-1478 (Rates) in HTML prototype

## Key Differences Identified

### WorkforceTab Current vs Required

| Element | Current | Required (from HTML) |
|---------|---------|---------------------|
| Avatar | Blue circle with User icon | **Gradient circle** (`from-sky-400 to-indigo-500`) with **initials** |
| Row metrics | Burden badge, Efficiency badge | **4 labeled columns**: Burden (amber), Efficiency (emerald), True Cost, Loaded (indigo) |
| Status badge | Missing | **Green "active" badge** next to name |
| Chevron | Rotates | Same |
| Burden Panel | Shows Payroll/FUTA/SUTA/WC/Benefits/401k | **Add Base Pay** as first line, **Dental/Vision** combined |
| Productivity Panel | Shows hours breakdown | **Add Unproductive Time list** at bottom |
| Vehicle Panel | Shows vehicle + monthly/hourly | **Add VIN**, **Add Total Cost Summary section** with True+Vehicle=Loaded breakdown |
| Action buttons | In row | **Move to bottom of expanded panel** |

### RatesTab Current vs Required

| Element | Current | Required (from HTML) |
|---------|---------|---------------------|
| Job Type Cards | 3-column grid, small cards | **Full-width stacked cards** |
| Header | Gradient with name + large rate | Same but **add description** (e.g., "2-4 Hours") |
| Fields | Display only | **Editable inputs** for Target Margin, Member Discount, Material Margin, Surcharge |
| Calculated Values | Member Rate, Min Invoice inline | **Separate styled boxes** at bottom |
| Markup Tiers | Table with edit buttons | **Inline editable inputs** + **$10→Sell, $100→Sell columns** |

## Requirements & Success Criteria

### Functional Requirements
1. WorkforceTab technician rows must be expandable with 3 colored panels
2. Each panel must contain exact line items from HTML prototype
3. RatesTab job type cards must have editable inputs that recalculate rates in real-time
4. Markup tier table must have inline edit capability

### Success Criteria
- [ ] Avatar shows gradient with initials
- [ ] 4-column metrics in collapsed row (Burden, Efficiency, True Cost, Loaded)
- [ ] Expanded panels show all line items from prototype
- [ ] Edit/Delete buttons in expanded panel footer
- [ ] RatesTab cards are full-width with gradient headers
- [ ] Editable inputs for margin/discount/surcharge
- [ ] Real-time recalculation on input change
- [ ] TypeScript compiles without errors

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `apps/web/app/pricebook/pricing/components/WorkforceTab.tsx` | REWRITE | Match HTML prototype structure |
| `apps/web/app/pricebook/pricing/components/RatesTab.tsx` | REWRITE | Match HTML prototype structure |
| `apps/web/app/pricebook/pricing/lib/types.ts` | CHECK | Ensure all required fields exist |

## Step-by-Step Implementation Tasks

### Phase 1: WorkforceTab Rebuild

#### Task 1.1: Update Collapsed Row Structure
Replace current technician row (lines 162-223) with:

```tsx
<div className="tech-row">
  <div
    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
    onClick={() => toggleTech(tech.id)}
  >
    <div className="flex items-center gap-4">
      {/* Gradient Avatar with Initials */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-semibold">
        {getInitials(tech.display_name || `${tech.first_name} ${tech.last_name}`)}
      </div>
      <div>
        <div className="font-medium text-slate-800">
          {tech.display_name || `${tech.first_name} ${tech.last_name}`}
        </div>
        <div className="text-sm text-slate-500">
          {tech.role} • {formatCurrency(tech.base_pay_rate || 0, 2)}/hr
        </div>
      </div>
      {/* Status Badge */}
      <span className={`px-2 py-0.5 rounded-full text-xs ${
        tech.status === 'active'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-600'
      }`}>
        {tech.status}
      </span>
    </div>

    {/* 4-Column Metrics */}
    <div className="flex items-center gap-8">
      <div className="text-center">
        <div className="text-xs text-slate-500">Burden</div>
        <div className="font-semibold text-amber-600">
          {formatPercent(metrics?.burdenPercent || 0)}
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs text-slate-500">Efficiency</div>
        <div className="font-semibold text-emerald-600">
          {formatPercent(metrics?.efficiencyPercent || 0)}
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs text-slate-500">True Cost</div>
        <div className="font-semibold">
          {formatCurrency(metrics?.trueCostPerHour || 0, 2)}
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs text-slate-500">Loaded</div>
        <div className="font-semibold text-indigo-600">
          {formatCurrency(metrics?.loadedCostPerHour || 0, 2)}
        </div>
      </div>
      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
    </div>
  </div>

  {/* Expanded Content */}
  {isExpanded && metrics && (
    <div className="bg-slate-50">
      <div className="p-4 grid grid-cols-3 gap-4">
        {/* AMBER: Burden Breakdown */}
        {/* EMERALD: Productivity Summary */}
        {/* VIOLET: Vehicle Assignment */}
      </div>
      {/* Action Buttons Footer */}
      <div className="px-4 pb-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEditTechnician(tech); }}>
          <Edit2 className="w-4 h-4 mr-1" /> Edit
        </Button>
        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); onDeleteTechnician?.(tech.id); }}>
          <Trash2 className="w-4 h-4 mr-1" /> Delete
        </Button>
      </div>
    </div>
  )}
</div>
```

#### Task 1.2: Update Amber Panel (Burden Breakdown)
Must include these exact line items:
- Base Pay
- Payroll Taxes (FICA)
- FUTA
- SUTA
- Workers Comp
- Health Insurance
- Dental/Vision (combined)
- 401k Match
- Other Benefits
- **Total Burden** (bordered separator)
- **Total Annual Cost** (bold amber)

#### Task 1.3: Update Emerald Panel (Productivity Summary)
Must include:
- Paid Hours/Day
- Paid Unproductive (red text with minus)
- Unpaid Time (slate text)
- **Billable Hours/Day** (bordered separator)
- Billable Hours/Year
- **Efficiency** (bold emerald)
- **Unproductive Time list** (each entry with name + hours + paid/unpaid)

#### Task 1.4: Update Violet Panel (Vehicle Assignment)
Must include:
- Vehicle (year make model)
- VIN
- Monthly Cost
- **Cost/Billable Hr** (semibold)
- **Total Cost Summary** section (bordered separator):
  - True Cost/Hr
  - Vehicle Cost/Hr (+prefix)
  - **Loaded Cost/Hr** (bold violet)

#### Task 1.5: Add Helper Function
Add at top of component:
```tsx
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
```

### Phase 2: RatesTab Rebuild

#### Task 2.1: Update Job Type Card Structure
Replace current 3-column grid (lines 163-250) with full-width stacked cards:

```tsx
<div className="p-4 space-y-6">
  {jobTypes.map((jobType, index) => {
    const hourlyRate = calcHourlyRate(loadedCost, jobType.target_gross_margin);
    const memberRate = hourlyRate * (1 - jobType.member_discount_percent / 100);
    const minInvoice = hourlyRate * jobType.min_hours + (jobType.flat_surcharge || 0);
    const gradient = gradients[index % gradients.length];

    return (
      <div key={jobType.id} className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${gradient} text-white p-4`}>
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-lg">{jobType.name}</h4>
              <p className="text-white/80 text-sm">
                {jobType.min_hours}-{jobType.max_hours || jobType.min_hours + 2} Hours
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{formatCurrency(hourlyRate, 2)}</div>
              <div className="text-white/80 text-sm">per hour</div>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="p-4 bg-slate-50">
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Target Margin Input */}
            {/* Member Discount Input */}
            {/* Material Margin Input */}
            {/* Surcharge Input */}
          </div>

          {/* Calculated Values */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-sm text-slate-500">Member Rate</div>
              <div className="text-xl font-bold text-emerald-600">
                {formatCurrency(memberRate, 2)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-sm text-slate-500">Min Invoice</div>
              <div className="text-xl font-bold">
                {formatCurrency(minInvoice, 2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  })}
</div>
```

#### Task 2.2: Create Editable Input Component
For each margin/discount field:
```tsx
<div>
  <label className="block text-sm text-slate-600 mb-1">Target Margin</label>
  <div className="relative">
    <Input
      type="number"
      step="1"
      min="0"
      max="99"
      value={localValues[jobType.id]?.targetMargin ?? jobType.target_gross_margin}
      onChange={(e) => handleFieldChange(jobType.id, 'target_gross_margin', parseFloat(e.target.value))}
      className="pr-8 text-lg font-medium"
    />
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
  </div>
</div>
```

#### Task 2.3: Add Local State for Real-Time Updates
```tsx
const [localJobTypes, setLocalJobTypes] = useState<Record<string, Partial<JobType>>>({});

const handleFieldChange = (jobTypeId: string, field: keyof JobType, value: number) => {
  setLocalJobTypes(prev => ({
    ...prev,
    [jobTypeId]: {
      ...prev[jobTypeId],
      [field]: value,
    }
  }));
  // Debounce the actual API update
  debouncedUpdate(jobTypeId, field, value);
};
```

#### Task 2.4: Update Markup Tier Table
Add inline editable inputs and additional columns:
- Cost Range (display)
- Gross Margin (editable input)
- Markup % (calculated)
- Multiplier (calculated)
- $10 → Sell (calculated)
- $100 → Sell (calculated)
- Actions (delete only)

### Phase 3: Validation & Polish

#### Task 3.1: Add Missing Type Imports
Ensure all types are imported in both files.

#### Task 3.2: Test Expandable Rows
Verify click to expand works and panels display correctly.

#### Task 3.3: Test Editable Inputs
Verify real-time recalculation works.

## Testing Strategy

### Manual Testing
1. Navigate to Pricing → Workforce tab
2. Click on technician row - verify expansion with 3 panels
3. Check all line items in each panel match prototype
4. Verify Edit/Delete buttons at bottom of expanded panel
5. Navigate to Pricing → Rates tab
6. Verify full-width job type cards with gradient headers
7. Edit margin values - verify rate recalculates immediately
8. Check markup tier table has inline editing

## Validation Commands

```bash
# TypeScript check
cd /opt/docker/apps/lazi/apps/web && npx tsc --noEmit --skipLibCheck

# Rebuild container
cd /opt/docker/apps/lazi && docker compose -f docker-compose.production.yml up -d --build lazi-web

# Check container status
docker ps | grep lazi-web
```

## Notes for Executing Agent

1. **Copy exact HTML structure** from prototype lines 846-967 (technician row) and 1306-1392 (job type cards)
2. **Convert vanilla HTML to React/TSX** - replace `onclick` with `onClick`, `class` with `className`
3. **Use existing shadcn/ui components** - Button, Input, Badge
4. **Preserve existing modal functionality** - TechnicianModal, JobTypeModal still work
5. **Keep all existing mutation handlers** - onCreateTechnician, onUpdateTechnician, etc.
6. **Use Tailwind classes exactly as in prototype** - gradients, colors, spacing

## Dependencies
- Existing calculation functions in `lib/calculations.ts`
- Existing type definitions in `lib/types.ts`
- shadcn/ui components (Button, Input, Badge)
- Lucide icons

## Rollback Plan
If issues occur:
1. Keep backup of original WorkforceTab.tsx and RatesTab.tsx
2. Revert to backup files if needed
3. Rebuild container
