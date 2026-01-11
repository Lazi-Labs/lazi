# Claude Code Implementation Prompt
## Advanced Pricing System - LAZI AI Platform

---

## OBJECTIVE

Implement the Advanced Pricing System UI based on the reference HTML file, integrated with the existing Supabase/PostgreSQL database schema. The system calculates labor rates based on technician costs, fleet costs, overhead expenses, and target profit margins.

---

## REFERENCE FILES

1. **UI Reference**: `docs/pricing_system/advanced-pricing-system.html` - Open this file in browser to see exact UI design
2. **Database Schema**: `docs/pricing_system/pricing-system-schema.sql` - PostgreSQL schema with all tables
3. **Documentation**: `docs/pricing_system/PRICING-SYSTEM-DOCUMENTATION.md` - Full architecture specs

---

## TECH STACK

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase PostgreSQL (schema: `pricing`)
- **State**: React useState/useReducer + React Query for server state
- **Icons**: Lucide React

---

## DATABASE TABLES (pricing schema)

All tables are in the `pricing` schema with RLS enabled for organization isolation.

### Core Tables:

```sql
pricing.organizations        -- Root tenant table
pricing.technicians          -- Field technicians (billable)
pricing.technician_unproductive_time  -- Unproductive time entries per tech
pricing.office_staff         -- Office employees (non-billable, flows to overhead)
pricing.vehicles             -- Fleet vehicles
pricing.expense_categories   -- Expense category groups
pricing.expense_items        -- Individual expense line items
pricing.job_types            -- Job type rate cards
pricing.markup_tiers         -- Material markup tiers
pricing.scenarios            -- Saved what-if scenarios
pricing.settings             -- Key-value org settings
```

---

## TASK 1: Project Structure

Create the following file structure:

```
/app/pricebook/pricing/
├── page.tsx                    # Main pricing page with tabs
├── components/
│   ├── PricingTabs.tsx         # Tab navigation
│   ├── OverviewTab.tsx         # Dashboard overview
│   ├── WorkforceTab.tsx        # Technicians + Office Staff
│   ├── FleetTab.tsx            # Vehicles
│   ├── ExpensesTab.tsx         # Expense categories/items
│   ├── RatesTab.tsx            # Job types + markup tiers
│   ├── PLTab.tsx               # P&L projections
│   ├── modals/
│   │   ├── TechnicianModal.tsx
│   │   ├── OfficeStaffModal.tsx
│   │   ├── VehicleModal.tsx
│   │   ├── ExpenseItemModal.tsx
│   │   └── MarkupTierModal.tsx
│   └── shared/
│       ├── MetricCard.tsx
│       ├── SectionCard.tsx
│       └── ExpandableRow.tsx
├── hooks/
│   ├── usePricingData.ts       # Fetch all pricing data
│   ├── useTechnicians.ts       # CRUD for technicians
│   ├── useOfficeStaff.ts       # CRUD for office staff
│   ├── useVehicles.ts          # CRUD for vehicles
│   ├── useExpenses.ts          # CRUD for expenses
│   ├── useJobTypes.ts          # CRUD for job types
│   └── useCalculations.ts      # All calculation logic
├── lib/
│   ├── calculations.ts         # Pure calculation functions
│   └── types.ts                # TypeScript interfaces
└── api/
    └── pricing/
        ├── route.ts            # GET all data
        ├── technicians/
        │   └── route.ts        # GET, POST
        │   └── [id]/route.ts   # PATCH, DELETE
        ├── office-staff/
        │   └── route.ts
        │   └── [id]/route.ts
        ├── vehicles/
        │   └── route.ts
        │   └── [id]/route.ts
        ├── expenses/
        │   └── route.ts
        │   └── [id]/route.ts
        └── job-types/
            └── route.ts
            └── [id]/route.ts
```

---

## TASK 2: TypeScript Interfaces

Create `/app/pricebook/pricing/lib/types.ts`:

```typescript
// Organization Settings
export interface OrganizationSettings {
  id: string;
  name: string;
  working_days_per_year: number;        // Default: 260
  weeks_per_year: number;                // Default: 52
  target_annual_revenue: number;
  material_cost_percent: number;         // Default: 20
  default_payroll_tax_rate: number;      // Default: 7.65
  default_futa_rate: number;             // Default: 0.6
  default_suta_rate: number;             // Default: 2.7
  default_workers_comp_rate_field: number;  // Default: 8.5
  default_workers_comp_rate_office: number; // Default: 0.5
}

// Technician
export interface Technician {
  id: string;
  organization_id: string;
  employee_number?: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  role: string;
  status: 'active' | 'inactive' | 'terminated' | 'on_leave';
  email?: string;
  phone?: string;
  hire_date?: string;
  
  // Pay
  pay_type: 'hourly' | 'salary';
  base_pay_rate?: number;
  annual_salary?: number;
  paid_hours_per_day: number;
  
  // Burden Rates (override org defaults)
  payroll_tax_rate?: number;
  futa_rate?: number;
  suta_rate?: number;
  workers_comp_rate?: number;
  
  // Benefits (monthly)
  health_insurance_monthly: number;
  dental_insurance_monthly: number;
  vision_insurance_monthly: number;
  life_insurance_monthly: number;
  retirement_401k_match_percent: number;
  hsa_contribution_monthly: number;
  other_benefits_monthly: number;
  
  // Assignment
  assigned_vehicle_id?: string;
  
  // Calculated (stored in DB, updated on save)
  calculated_annual_base_pay?: number;
  calculated_total_burden_annual?: number;
  calculated_burden_percent?: number;
  calculated_billable_hours_per_year?: number;
  calculated_true_cost_per_hour?: number;
  calculated_efficiency_percent?: number;
}

// Unproductive Time Entry
export interface UnproductiveTimeEntry {
  id: string;
  technician_id: string;
  category_id?: string;
  name: string;
  hours_per_day: number;
  is_paid: boolean;
  notes?: string;
  sort_order: number;
}

// Office Staff
export interface OfficeStaff {
  id: string;
  organization_id: string;
  employee_number?: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  role: string;
  status: 'active' | 'inactive' | 'terminated' | 'on_leave';
  
  pay_type: 'hourly' | 'salary';
  base_pay_rate?: number;
  annual_salary?: number;
  hours_per_week: number;
  
  // Burden (same structure as tech, but lower workers comp)
  payroll_tax_rate?: number;
  futa_rate?: number;
  suta_rate?: number;
  workers_comp_rate?: number;
  
  // Benefits
  health_insurance_monthly: number;
  dental_insurance_monthly: number;
  vision_insurance_monthly: number;
  retirement_401k_match_percent: number;
  other_benefits_monthly: number;
  
  // Calculated
  calculated_annual_base_pay?: number;
  calculated_total_burden_annual?: number;
  calculated_burden_percent?: number;
  calculated_monthly_cost?: number;
}

// Vehicle
export interface Vehicle {
  id: string;
  organization_id: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  vin?: string;
  license_plate?: string;
  status: 'active' | 'reserve' | 'maintenance' | 'sold' | 'totaled';
  
  // Financial
  loan_balance: number;
  monthly_payment: number;
  market_value: number;
  
  // Monthly costs
  insurance_monthly: number;
  fuel_monthly: number;
  maintenance_monthly: number;
  registration_annual: number;
  
  // Assignment
  assigned_driver_id?: string;
  
  // Calculated
  calculated_equity?: number;
  calculated_total_monthly_cost?: number;
}

// Expense Category
export interface ExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  is_payroll: boolean;
  is_fleet: boolean;
  is_system: boolean;
  sort_order: number;
  is_collapsed: boolean;
  calculated_monthly_total?: number;
  items: ExpenseItem[];
}

// Expense Item
export interface ExpenseItem {
  id: string;
  category_id: string;
  organization_id: string;
  name: string;
  description?: string;
  vendor?: string;
  amount: number;
  frequency: 'monthly' | 'annual' | 'quarterly' | 'weekly' | 'one_time';
  is_tax_deductible: boolean;
  sort_order: number;
  calculated_monthly_amount?: number;
}

// Job Type
export interface JobType {
  id: string;
  organization_id: string;
  name: string;
  code?: string;
  description?: string;
  min_hours: number;
  max_hours: number;
  target_gross_margin: number;
  member_discount_percent: number;
  material_gross_margin: number;
  flat_surcharge: number;
  color?: string;
  sort_order: number;
  
  // Calculated
  calculated_hourly_rate?: number;
  calculated_member_rate?: number;
  calculated_min_invoice?: number;
}

// Markup Tier
export interface MarkupTier {
  id: string;
  organization_id: string;
  name?: string;
  min_cost: number;
  max_cost: number;
  gross_margin_percent: number;
  calculated_markup_percent?: number;
  calculated_multiplier?: number;
  sort_order: number;
}

// Calculation Results
export interface CalculationResults {
  // Workforce
  techCount: number;
  staffCount: number;
  avgBurdenPercent: number;
  avgEfficiencyPercent: number;
  avgTrueCostPerHour: number;
  totalBillableHoursPerYear: number;
  totalTechCostAnnual: number;
  totalStaffCostAnnual: number;
  
  // Fleet
  totalVehicles: number;
  activeVehicles: number;
  fleetCostMonthly: number;
  fleetCostPerHour: number;
  totalEquity: number;
  
  // Overhead
  monthlyExpenses: number;
  monthlyOverhead: number;  // expenses + staff
  overheadPerHour: number;
  
  // Loaded Cost
  avgLoadedCostPerHour: number;
  
  // P&L
  projectedRevenue: number;
  materialsCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  netProfit: number;
  netMarginPercent: number;
  
  // Break-even
  breakEvenMonthly: number;
  breakEvenDaily: number;
  breakEvenAnnual: number;
  
  // Per-tech
  revenuePerTechAnnual: number;
  revenuePerTechMonthly: number;
}
```

---

## TASK 3: Calculation Functions

Create `/app/pricebook/pricing/lib/calculations.ts`:

```typescript
import { 
  Technician, OfficeStaff, Vehicle, ExpenseCategory, 
  JobType, OrganizationSettings, UnproductiveTimeEntry,
  CalculationResults 
} from './types';

// Get effective burden rates (tech override OR org default)
function getEffectiveBurdenRates(
  tech: Technician | OfficeStaff, 
  settings: OrganizationSettings,
  isOffice: boolean = false
) {
  return {
    payrollTax: tech.payroll_tax_rate ?? settings.default_payroll_tax_rate,
    futa: tech.futa_rate ?? settings.default_futa_rate,
    suta: tech.suta_rate ?? settings.default_suta_rate,
    workersComp: tech.workers_comp_rate ?? 
      (isOffice ? settings.default_workers_comp_rate_office : settings.default_workers_comp_rate_field)
  };
}

// Calculate technician metrics
export function calcTechnicianMetrics(
  tech: Technician,
  unproductiveTime: UnproductiveTimeEntry[],
  settings: OrganizationSettings,
  vehicle?: Vehicle
) {
  const rates = getEffectiveBurdenRates(tech, settings, false);
  
  // Annual base pay
  const hoursPerYear = tech.paid_hours_per_day * settings.working_days_per_year;
  const annualBasePay = tech.pay_type === 'salary' 
    ? tech.annual_salary! 
    : tech.base_pay_rate! * hoursPerYear;
  
  // Burden calculations
  const payrollTaxes = annualBasePay * (rates.payrollTax / 100);
  const futa = Math.min(annualBasePay, 7000) * (rates.futa / 100);
  const suta = annualBasePay * (rates.suta / 100);
  const workersComp = annualBasePay * (rates.workersComp / 100);
  
  const healthAnnual = tech.health_insurance_monthly * 12;
  const dentalAnnual = tech.dental_insurance_monthly * 12;
  const visionAnnual = tech.vision_insurance_monthly * 12;
  const lifeAnnual = tech.life_insurance_monthly * 12;
  const retirement = annualBasePay * (tech.retirement_401k_match_percent / 100);
  const hsaAnnual = tech.hsa_contribution_monthly * 12;
  const otherAnnual = tech.other_benefits_monthly * 12;
  
  const totalBurden = payrollTaxes + futa + suta + workersComp + 
    healthAnnual + dentalAnnual + visionAnnual + lifeAnnual + 
    retirement + hsaAnnual + otherAnnual;
  
  const burdenPercent = (totalBurden / annualBasePay) * 100;
  const totalCostAnnual = annualBasePay + totalBurden;
  
  // Productivity
  const paidUnproductive = unproductiveTime
    .filter(t => t.is_paid)
    .reduce((sum, t) => sum + t.hours_per_day, 0);
  const unpaidTime = unproductiveTime
    .filter(t => !t.is_paid)
    .reduce((sum, t) => sum + t.hours_per_day, 0);
  
  const billableHoursPerDay = tech.paid_hours_per_day - paidUnproductive;
  const billableHoursPerYear = billableHoursPerDay * settings.working_days_per_year;
  const efficiencyPercent = (billableHoursPerDay / tech.paid_hours_per_day) * 100;
  
  // True cost
  const trueCostPerHour = billableHoursPerYear > 0 
    ? totalCostAnnual / billableHoursPerYear 
    : 0;
  
  // Vehicle cost
  const vehicleMonthlyCost = vehicle 
    ? vehicle.monthly_payment + vehicle.insurance_monthly + 
      vehicle.fuel_monthly + vehicle.maintenance_monthly
    : 0;
  const billableHoursPerMonth = billableHoursPerYear / 12;
  const vehicleCostPerHour = billableHoursPerMonth > 0 
    ? vehicleMonthlyCost / billableHoursPerMonth 
    : 0;
  
  const loadedCostPerHour = trueCostPerHour + vehicleCostPerHour;
  
  return {
    annualBasePay,
    totalBurden,
    burdenPercent,
    totalCostAnnual,
    paidUnproductive,
    unpaidTime,
    billableHoursPerDay,
    billableHoursPerYear,
    efficiencyPercent,
    trueCostPerHour,
    vehicleMonthlyCost,
    vehicleCostPerHour,
    loadedCostPerHour,
    // Burden breakdown
    burdenBreakdown: {
      payrollTaxes, futa, suta, workersComp,
      healthAnnual, dentalAnnual, visionAnnual, lifeAnnual,
      retirement, hsaAnnual, otherAnnual
    }
  };
}

// Calculate office staff metrics
export function calcOfficeStaffMetrics(
  staff: OfficeStaff,
  settings: OrganizationSettings
) {
  const rates = getEffectiveBurdenRates(staff, settings, true);
  
  const hoursPerYear = staff.hours_per_week * settings.weeks_per_year;
  const annualBasePay = staff.pay_type === 'salary'
    ? staff.annual_salary!
    : staff.base_pay_rate! * hoursPerYear;
  
  const payrollTaxes = annualBasePay * (rates.payrollTax / 100);
  const futa = Math.min(annualBasePay, 7000) * (rates.futa / 100);
  const suta = annualBasePay * (rates.suta / 100);
  const workersComp = annualBasePay * (rates.workersComp / 100);
  
  const healthAnnual = staff.health_insurance_monthly * 12;
  const dentalAnnual = staff.dental_insurance_monthly * 12;
  const visionAnnual = staff.vision_insurance_monthly * 12;
  const retirement = annualBasePay * (staff.retirement_401k_match_percent / 100);
  const otherAnnual = staff.other_benefits_monthly * 12;
  
  const totalBurden = payrollTaxes + futa + suta + workersComp +
    healthAnnual + dentalAnnual + visionAnnual + retirement + otherAnnual;
  
  const burdenPercent = (totalBurden / annualBasePay) * 100;
  const totalCostAnnual = annualBasePay + totalBurden;
  const monthlyCost = totalCostAnnual / 12;
  
  return { annualBasePay, totalBurden, burdenPercent, totalCostAnnual, monthlyCost };
}

// Calculate fleet metrics
export function calcFleetMetrics(vehicles: Vehicle[]) {
  const active = vehicles.filter(v => 
    ['active', 'reserve', 'maintenance'].includes(v.status)
  );
  
  const totalPayments = active.reduce((s, v) => s + v.monthly_payment, 0);
  const totalInsurance = active.reduce((s, v) => s + v.insurance_monthly, 0);
  const totalFuel = active.reduce((s, v) => s + v.fuel_monthly, 0);
  const totalMaintenance = active.reduce((s, v) => s + v.maintenance_monthly, 0);
  const totalMonthly = totalPayments + totalInsurance + totalFuel + totalMaintenance;
  
  const totalLoanBalance = active.reduce((s, v) => s + v.loan_balance, 0);
  const totalMarketValue = active.reduce((s, v) => s + v.market_value, 0);
  const totalEquity = totalMarketValue - totalLoanBalance;
  
  return {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.status === 'active').length,
    totalPayments, totalInsurance, totalFuel, totalMaintenance,
    totalMonthly,
    totalAnnual: totalMonthly * 12,
    totalLoanBalance, totalMarketValue, totalEquity
  };
}

// Calculate expense monthly amount
export function calcExpenseMonthly(item: { amount: number; frequency: string }) {
  switch (item.frequency) {
    case 'annual': return item.amount / 12;
    case 'quarterly': return item.amount / 3;
    case 'weekly': return item.amount * 4.333;
    case 'one_time': return 0;
    default: return item.amount; // monthly
  }
}

// Calculate total expenses
export function calcTotalExpenses(categories: ExpenseCategory[]) {
  return categories.reduce((total, cat) => {
    return total + cat.items.reduce((catTotal, item) => {
      return catTotal + calcExpenseMonthly(item);
    }, 0);
  }, 0);
}

// Calculate hourly rate from loaded cost and margin
export function calcHourlyRate(loadedCost: number, targetMarginPercent: number) {
  if (targetMarginPercent >= 100) return 0;
  return loadedCost / (1 - targetMarginPercent / 100);
}

// Calculate markup from margin
export function calcMarkupFromMargin(marginPercent: number) {
  if (marginPercent >= 100) return 999999;
  return (marginPercent / (100 - marginPercent)) * 100;
}

// Calculate multiplier from margin
export function calcMultiplierFromMargin(marginPercent: number) {
  if (marginPercent >= 100) return 999;
  return 1 / (1 - marginPercent / 100);
}

// Calculate full summary
export function calcFullSummary(
  technicians: Technician[],
  unproductiveTimeMap: Map<string, UnproductiveTimeEntry[]>,
  officeStaff: OfficeStaff[],
  vehicles: Vehicle[],
  expenseCategories: ExpenseCategory[],
  settings: OrganizationSettings
): CalculationResults {
  const activeTechs = technicians.filter(t => t.status === 'active');
  const activeStaff = officeStaff.filter(s => s.status === 'active');
  
  // Tech metrics
  let totalTechCost = 0;
  let totalBillableHours = 0;
  let sumBurdenPercent = 0;
  let sumEfficiency = 0;
  let sumTrueCost = 0;
  let sumLoadedCost = 0;
  
  activeTechs.forEach(tech => {
    const unproductive = unproductiveTimeMap.get(tech.id) || [];
    const vehicle = vehicles.find(v => v.id === tech.assigned_vehicle_id);
    const metrics = calcTechnicianMetrics(tech, unproductive, settings, vehicle);
    
    totalTechCost += metrics.totalCostAnnual;
    totalBillableHours += metrics.billableHoursPerYear;
    sumBurdenPercent += metrics.burdenPercent;
    sumEfficiency += metrics.efficiencyPercent;
    sumTrueCost += metrics.trueCostPerHour;
    sumLoadedCost += metrics.loadedCostPerHour;
  });
  
  // Staff metrics
  let totalStaffCost = 0;
  activeStaff.forEach(staff => {
    const metrics = calcOfficeStaffMetrics(staff, settings);
    totalStaffCost += metrics.totalCostAnnual;
  });
  
  // Fleet metrics
  const fleet = calcFleetMetrics(vehicles);
  
  // Expenses
  const monthlyExpenses = calcTotalExpenses(expenseCategories);
  const monthlyOverhead = monthlyExpenses + (totalStaffCost / 12);
  
  // Averages
  const techCount = activeTechs.length;
  const avgBurdenPercent = techCount > 0 ? sumBurdenPercent / techCount : 0;
  const avgEfficiencyPercent = techCount > 0 ? sumEfficiency / techCount : 0;
  const avgTrueCostPerHour = techCount > 0 ? sumTrueCost / techCount : 0;
  const avgLoadedCostPerHour = techCount > 0 ? sumLoadedCost / techCount : 0;
  
  // Cost allocations
  const fleetCostPerHour = totalBillableHours > 0 
    ? (fleet.totalMonthly * 12) / totalBillableHours 
    : 0;
  const overheadPerHour = totalBillableHours > 0 
    ? (monthlyOverhead * 12) / totalBillableHours 
    : 0;
  
  // P&L
  const revenue = settings.target_annual_revenue;
  const materialsCost = revenue * (settings.material_cost_percent / 100);
  const grossProfit = revenue - materialsCost - totalTechCost;
  const netProfit = grossProfit - (monthlyOverhead * 12);
  const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMarginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  
  // Break-even
  const contributionMargin = 1 - (settings.material_cost_percent / 100);
  const breakEvenMonthly = contributionMargin > 0 
    ? ((totalTechCost / 12) + monthlyOverhead) / contributionMargin 
    : 0;
  
  return {
    techCount,
    staffCount: activeStaff.length,
    avgBurdenPercent,
    avgEfficiencyPercent,
    avgTrueCostPerHour,
    totalBillableHoursPerYear: totalBillableHours,
    totalTechCostAnnual: totalTechCost,
    totalStaffCostAnnual: totalStaffCost,
    
    totalVehicles: fleet.totalVehicles,
    activeVehicles: fleet.activeVehicles,
    fleetCostMonthly: fleet.totalMonthly,
    fleetCostPerHour,
    totalEquity: fleet.totalEquity,
    
    monthlyExpenses,
    monthlyOverhead,
    overheadPerHour,
    
    avgLoadedCostPerHour,
    
    projectedRevenue: revenue,
    materialsCost,
    grossProfit,
    grossMarginPercent,
    netProfit,
    netMarginPercent,
    
    breakEvenMonthly,
    breakEvenDaily: breakEvenMonthly / 21.67,
    breakEvenAnnual: breakEvenMonthly * 12,
    
    revenuePerTechAnnual: techCount > 0 ? revenue / techCount : 0,
    revenuePerTechMonthly: techCount > 0 ? revenue / techCount / 12 : 0
  };
}
```

---

## TASK 4: API Routes

### GET all pricing data `/app/api/pricebook/pricing/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  
  // Get user's organization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { data: profile } = await supabase
    .from('pricing.users')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single();
  
  const orgId = profile?.organization_id;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });
  
  // Fetch all data in parallel
  const [
    { data: settings },
    { data: technicians },
    { data: unproductiveTime },
    { data: officeStaff },
    { data: vehicles },
    { data: expenseCategories },
    { data: expenseItems },
    { data: jobTypes },
    { data: markupTiers }
  ] = await Promise.all([
    supabase.from('pricing.organizations').select('*').eq('id', orgId).single(),
    supabase.from('pricing.technicians').select('*').eq('organization_id', orgId),
    supabase.from('pricing.technician_unproductive_time').select('*'),
    supabase.from('pricing.office_staff').select('*').eq('organization_id', orgId),
    supabase.from('pricing.vehicles').select('*').eq('organization_id', orgId),
    supabase.from('pricing.expense_categories').select('*').eq('organization_id', orgId).order('sort_order'),
    supabase.from('pricing.expense_items').select('*').eq('organization_id', orgId),
    supabase.from('pricing.job_types').select('*').eq('organization_id', orgId).order('sort_order'),
    supabase.from('pricing.markup_tiers').select('*').eq('organization_id', orgId).order('min_cost')
  ]);
  
  // Nest expense items under categories
  const categoriesWithItems = expenseCategories?.map(cat => ({
    ...cat,
    items: expenseItems?.filter(item => item.category_id === cat.id) || []
  }));
  
  // Group unproductive time by technician
  const unproductiveTimeMap: Record<string, any[]> = {};
  unproductiveTime?.forEach(ut => {
    if (!unproductiveTimeMap[ut.technician_id]) {
      unproductiveTimeMap[ut.technician_id] = [];
    }
    unproductiveTimeMap[ut.technician_id].push(ut);
  });
  
  return NextResponse.json({
    settings,
    technicians: technicians || [],
    unproductiveTimeMap,
    officeStaff: officeStaff || [],
    vehicles: vehicles || [],
    expenseCategories: categoriesWithItems || [],
    jobTypes: jobTypes || [],
    markupTiers: markupTiers || []
  });
}
```

### Technicians CRUD `/app/api/pricebook/pricing/technicians/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const body = await request.json();
  
  // Get org ID from auth
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('pricing.users')
    .select('organization_id')
    .eq('auth_user_id', user?.id)
    .single();
  
  const orgId = profile?.organization_id;
  
  // Insert technician
  const { data: tech, error } = await supabase
    .from('pricing.technicians')
    .insert({
      organization_id: orgId,
      first_name: body.first_name,
      last_name: body.last_name,
      role: body.role,
      status: body.status || 'active',
      pay_type: body.pay_type,
      base_pay_rate: body.base_pay_rate,
      annual_salary: body.annual_salary,
      paid_hours_per_day: body.paid_hours_per_day || 8,
      payroll_tax_rate: body.payroll_tax_rate,
      futa_rate: body.futa_rate,
      suta_rate: body.suta_rate,
      workers_comp_rate: body.workers_comp_rate,
      health_insurance_monthly: body.health_insurance_monthly || 0,
      dental_insurance_monthly: body.dental_insurance_monthly || 0,
      vision_insurance_monthly: body.vision_insurance_monthly || 0,
      life_insurance_monthly: body.life_insurance_monthly || 0,
      retirement_401k_match_percent: body.retirement_401k_match_percent || 0,
      hsa_contribution_monthly: body.hsa_contribution_monthly || 0,
      other_benefits_monthly: body.other_benefits_monthly || 0,
      assigned_vehicle_id: body.assigned_vehicle_id
    })
    .select()
    .single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  
  // Insert unproductive time entries
  if (body.unproductive_time?.length > 0) {
    await supabase
      .from('pricing.technician_unproductive_time')
      .insert(
        body.unproductive_time.map((ut: any, idx: number) => ({
          technician_id: tech.id,
          name: ut.name,
          hours_per_day: ut.hours_per_day,
          is_paid: ut.is_paid,
          sort_order: idx
        }))
      );
  }
  
  return NextResponse.json(tech);
}
```

### Technician Update/Delete `/app/api/pricebook/pricing/technicians/[id]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const body = await request.json();
  const { id } = params;
  
  // Update technician
  const { data, error } = await supabase
    .from('pricing.technicians')
    .update({
      first_name: body.first_name,
      last_name: body.last_name,
      role: body.role,
      status: body.status,
      pay_type: body.pay_type,
      base_pay_rate: body.base_pay_rate,
      annual_salary: body.annual_salary,
      paid_hours_per_day: body.paid_hours_per_day,
      payroll_tax_rate: body.payroll_tax_rate,
      futa_rate: body.futa_rate,
      suta_rate: body.suta_rate,
      workers_comp_rate: body.workers_comp_rate,
      health_insurance_monthly: body.health_insurance_monthly,
      dental_insurance_monthly: body.dental_insurance_monthly,
      vision_insurance_monthly: body.vision_insurance_monthly,
      life_insurance_monthly: body.life_insurance_monthly,
      retirement_401k_match_percent: body.retirement_401k_match_percent,
      hsa_contribution_monthly: body.hsa_contribution_monthly,
      other_benefits_monthly: body.other_benefits_monthly,
      assigned_vehicle_id: body.assigned_vehicle_id
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  
  // Update unproductive time (delete and re-insert)
  if (body.unproductive_time !== undefined) {
    await supabase
      .from('pricing.technician_unproductive_time')
      .delete()
      .eq('technician_id', id);
    
    if (body.unproductive_time?.length > 0) {
      await supabase
        .from('pricing.technician_unproductive_time')
        .insert(
          body.unproductive_time.map((ut: any, idx: number) => ({
            technician_id: id,
            name: ut.name,
            hours_per_day: ut.hours_per_day,
            is_paid: ut.is_paid,
            sort_order: idx
          }))
        );
    }
  }
  
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  
  // Delete unproductive time first (FK constraint)
  await supabase
    .from('pricing.technician_unproductive_time')
    .delete()
    .eq('technician_id', params.id);
  
  // Delete technician
  const { error } = await supabase
    .from('pricing.technicians')
    .delete()
    .eq('id', params.id);
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  
  return NextResponse.json({ success: true });
}
```

---

## TASK 5: UI Components

### Main Page `/app/pricebook/pricing/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Users, Truck, Receipt, Calculator, TrendingUp } from 'lucide-react';
import OverviewTab from './components/OverviewTab';
import WorkforceTab from './components/WorkforceTab';
import FleetTab from './components/FleetTab';
import ExpensesTab from './components/ExpensesTab';
import RatesTab from './components/RatesTab';
import PLTab from './components/PLTab';

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'workforce', label: 'Workforce', icon: Users },
  { id: 'fleet', label: 'Fleet', icon: Truck },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'rates', label: 'Rates', icon: Calculator },
  { id: 'pl', label: 'P&L', icon: TrendingUp },
];

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['pricing-data'],
    queryFn: async () => {
      const res = await fetch('/api/pricebook/pricing');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  
  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">Error loading data</div>;
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Advanced Pricing System</h1>
          <p className="text-slate-500 text-sm">{data.settings?.name}</p>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="bg-slate-100 p-1 rounded-xl mb-6 inline-flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
              activeTab === tab.id 
                ? 'bg-white shadow-sm' 
                : 'hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab data={data} />}
      {activeTab === 'workforce' && <WorkforceTab data={data} />}
      {activeTab === 'fleet' && <FleetTab data={data} />}
      {activeTab === 'expenses' && <ExpensesTab data={data} />}
      {activeTab === 'rates' && <RatesTab data={data} />}
      {activeTab === 'pl' && <PLTab data={data} />}
    </div>
  );
}
```

---

## TASK 6: Key UI Features to Implement

Reference the HTML file (`docs/pricing_system/advanced-pricing-system.html`) for exact styling. Key features:

### 1. Metric Cards
- White background with border
- Icon in top-right
- Large bold value
- Small gray subtitle

### 2. Technician Edit Modal
- Must include **Unproductive Time section** with:
  - Add/Remove time entries
  - Name, Hours, Paid checkbox per entry
  - Live Productivity Summary (billable hrs, efficiency %)
- Vehicle Assignment section with cost display

### 3. Job Type Rate Cards (Rates Tab)
- **Gradient headers** (sky-to-cyan, violet-to-purple, emerald-to-teal)
- Large rate display in header
- Editable inputs for: Target Margin, Member Discount, Material Margin, Surcharge
- Live calculated Member Rate and Min Invoice

### 4. Expandable Rows
- Technician rows expand to show:
  - Burden breakdown (amber background)
  - Productivity summary (emerald background)
  - Vehicle assignment (violet background)

### 5. Material Markup Tiers
- Inline editable gross margin
- Calculated markup % and multiplier
- Add/Delete tiers
- Material Price Calculator at bottom

---

## TASK 7: Database Field Mapping

When saving data, map UI fields to DB columns:

### Technician Form → DB:
```
Name → first_name, last_name (split)
Role → role
Base Pay Rate → base_pay_rate
Paid Hours/Day → paid_hours_per_day
FICA % → payroll_tax_rate
FUTA % → futa_rate
SUTA % → suta_rate
Workers Comp % → workers_comp_rate
Health $ → health_insurance_monthly
Dental/Vision $ → dental_insurance_monthly + vision_insurance_monthly
401k Match % → retirement_401k_match_percent
Other $ → other_benefits_monthly
Assigned Vehicle → assigned_vehicle_id
Unproductive Time → pricing.technician_unproductive_time (separate table)
```

### Vehicle Form → DB:
```
Year → year
Make → make
Model → model
VIN → vin
Status → status
Assigned Driver → assigned_driver_id
Loan Balance → loan_balance
Monthly Payment → monthly_payment
Market Value → market_value
Insurance → insurance_monthly
Fuel → fuel_monthly
Maintenance → maintenance_monthly
```

### Job Type → DB:
```
Target Margin → target_gross_margin
Member Discount → member_discount_percent
Material Margin → material_gross_margin
Surcharge → flat_surcharge
```

---

## EXECUTION ORDER

1. Create types (`lib/types.ts`)
2. Create calculation functions (`lib/calculations.ts`)
3. Create API routes (all CRUD endpoints)
4. Create main page with tab structure
5. Create each tab component one by one:
   - OverviewTab (read-only summary)
   - WorkforceTab (technicians + office staff with modals)
   - FleetTab (vehicles with modal)
   - ExpensesTab (categories + items with modals)
   - RatesTab (job types + markup tiers - editable)
   - PLTab (read-only P&L)
6. Test all CRUD operations
7. Verify calculations match the HTML version

---

## SAMPLE DATA (for testing)

After building, seed with this data to verify:

```sql
-- Insert sample technicians
INSERT INTO pricing.technicians (organization_id, first_name, last_name, role, status, pay_type, base_pay_rate, paid_hours_per_day, health_insurance_monthly, retirement_401k_match_percent)
VALUES 
  ('YOUR_ORG_ID', 'Mike', 'Johnson', 'Lead Technician', 'active', 'hourly', 35, 8, 450, 3),
  ('YOUR_ORG_ID', 'David', 'Rodriguez', 'Lead Technician', 'active', 'hourly', 35, 8, 450, 3),
  ('YOUR_ORG_ID', 'Chris', 'Thompson', 'Lead Technician', 'active', 'hourly', 32, 8, 450, 3),
  ('YOUR_ORG_ID', 'Alex', 'Martinez', 'Helper', 'active', 'hourly', 22, 8, 300, 3);
```

---

## START COMMAND

```
Start with Task 1 (project structure) and Task 2 (types). Show me the file structure and types.ts file when done.
```
