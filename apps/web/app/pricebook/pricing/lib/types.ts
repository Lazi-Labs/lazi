// Advanced Pricing System - TypeScript Interfaces
// Database schema: pricing.*

// ====================
// Enums
// ====================
export type EmployeeStatus = 'active' | 'inactive' | 'terminated' | 'on_leave';
export type PayType = 'hourly' | 'salary';
export type VehicleStatus = 'active' | 'reserve' | 'maintenance' | 'sold' | 'totaled';
export type ExpenseFrequency = 'monthly' | 'annual' | 'quarterly' | 'weekly' | 'one_time';

// ====================
// Organization Settings
// ====================
export interface OrganizationSettings {
  id: string;
  name: string;
  slug?: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country: string;
  timezone: string;
  currency: string;
  fiscal_year_start: number;
  working_days_per_year: number;        // Default: 260
  weeks_per_year: number;               // Default: 52
  default_billable_hours_per_day: number; // Default: 6
  target_annual_revenue: number;
  material_cost_percent: number;        // Default: 20
  default_payroll_tax_rate: number;     // Default: 7.65 (FICA)
  default_futa_rate: number;            // Default: 0.6
  default_suta_rate: number;            // Default: 2.7
  default_workers_comp_rate_field: number;  // Default: 8.5
  default_workers_comp_rate_office: number; // Default: 0.5
  servicetitan_tenant_id?: string;
  servicetitan_connected: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ====================
// Technician
// ====================
export interface Technician {
  id: string;
  organization_id: string;
  employee_number?: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  role: string;
  status: EmployeeStatus;
  email?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  hire_date?: string;
  termination_date?: string;
  department?: string;

  // Pay Configuration
  pay_type: PayType;
  base_pay_rate?: number;
  annual_salary?: number;
  overtime_multiplier: number;
  paid_hours_per_day: number;

  // Burden Rates (override org defaults if set)
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
  servicetitan_employee_id?: string;

  // Unproductive time entries (joined from separate table)
  unproductive_time?: UnproductiveTimeEntry[];

  // Calculated fields (stored in DB, updated on save)
  calculated_annual_base_pay?: number;
  calculated_total_burden_annual?: number;
  calculated_burden_percent?: number;
  calculated_billable_hours_per_year?: number;
  calculated_true_cost_per_hour?: number;
  calculated_efficiency_percent?: number;

  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ====================
// Unproductive Time Entry
// ====================
export interface UnproductiveTimeEntry {
  id: string;
  technician_id: string;
  category_id?: string;
  name: string;
  hours_per_day: number;
  is_paid: boolean;
  notes?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ====================
// Office Staff
// ====================
export interface OfficeStaff {
  id: string;
  organization_id: string;
  employee_number?: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  role: string;
  status: EmployeeStatus;
  email?: string;
  phone?: string;
  hire_date?: string;
  termination_date?: string;
  department?: string;

  // Pay Configuration
  pay_type: PayType;
  base_pay_rate?: number;
  annual_salary?: number;
  hours_per_week: number;

  // Burden Rates (override org defaults if set)
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

  // Calculated fields
  calculated_annual_base_pay?: number;
  calculated_total_burden_annual?: number;
  calculated_burden_percent?: number;
  calculated_monthly_cost?: number;

  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ====================
// Vehicle
// ====================
export interface Vehicle {
  id: string;
  organization_id: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  color?: string;
  vin?: string;
  license_plate?: string;
  status: VehicleStatus;

  // Financial
  purchase_date?: string;
  purchase_price?: number;
  loan_balance: number;
  monthly_payment: number;
  loan_interest_rate?: number;
  loan_term_months?: number;
  market_value: number;

  // Monthly Costs
  insurance_monthly: number;
  fuel_monthly: number;
  maintenance_monthly: number;
  registration_annual: number;

  // Usage
  odometer_current?: number;
  odometer_at_purchase?: number;
  fuel_type: string;
  mpg_average?: number;

  // Assignment
  assigned_driver_id?: string;
  servicetitan_equipment_id?: string;

  // Calculated fields
  calculated_equity?: number;
  calculated_total_monthly_cost?: number;

  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ====================
// Expense Category
// ====================
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ====================
// Expense Item
// ====================
export interface ExpenseItem {
  id: string;
  category_id: string;
  organization_id: string;
  name: string;
  description?: string;
  vendor?: string;
  amount: number;
  frequency: ExpenseFrequency;
  account_number?: string;
  is_tax_deductible: boolean;
  tax_category?: string;
  sort_order: number;
  effective_date?: string;
  end_date?: string;
  calculated_monthly_amount?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ====================
// Job Type
// ====================
export interface JobType {
  id: string;
  organization_id: string;
  name: string;
  code?: string;
  description?: string;
  min_hours: number;
  max_hours: number;
  typical_hours?: number;
  target_gross_margin: number;
  member_discount_percent: number;
  material_gross_margin: number;
  flat_surcharge: number;
  servicetitan_business_unit_id?: string;
  color: string;
  icon: string;
  sort_order: number;

  // Calculated fields
  calculated_hourly_rate?: number;
  calculated_member_rate?: number;
  calculated_min_invoice?: number;
  calculated_material_markup?: number;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ====================
// Markup Tier
// ====================
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ====================
// Scenario (What-If Analysis)
// ====================
export interface Scenario {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  snapshot_data: Record<string, unknown>;
  summary_tech_count?: number;
  summary_staff_count?: number;
  summary_vehicle_count?: number;
  summary_avg_burden_percent?: number;
  summary_avg_efficiency_percent?: number;
  summary_avg_true_cost_per_hour?: number;
  summary_fleet_cost_monthly?: number;
  summary_overhead_monthly?: number;
  summary_avg_hourly_rate?: number;
  summary_projected_revenue?: number;
  summary_projected_net_profit?: number;
  summary_net_profit_percent?: number;
  summary_break_even_monthly?: number;
  is_baseline: boolean;
  is_active: boolean;
  created_at: string;
  created_by?: string;
}

// ====================
// Calculation Results
// ====================
export interface TechnicianMetrics {
  id: string;
  name: string;
  annualBasePay: number;
  totalBurden: number;
  burdenPercent: number;
  totalCostAnnual: number;
  paidUnproductive: number;
  unpaidTime: number;
  billableHoursPerDay: number;
  billableHoursPerYear: number;
  efficiencyPercent: number;
  trueCostPerHour: number;
  vehicleMonthlyCost: number;
  vehicleCostPerHour: number;
  loadedCostPerHour: number;
  burdenBreakdown: BurdenBreakdown;
}

export interface BurdenBreakdown {
  payrollTaxes: number;
  futa: number;
  suta: number;
  workersComp: number;
  healthAnnual: number;
  dentalAnnual: number;
  visionAnnual: number;
  lifeAnnual: number;
  retirement: number;
  hsaAnnual: number;
  otherAnnual: number;
}

export interface FleetMetrics {
  totalVehicles: number;
  activeVehicles: number;
  totalPayments: number;
  totalInsurance: number;
  totalFuel: number;
  totalMaintenance: number;
  totalMonthly: number;
  totalAnnual: number;
  totalLoanBalance: number;
  totalMarketValue: number;
  totalEquity: number;
}

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
  monthlyOverhead: number; // expenses + staff
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

  // Detailed metrics
  technicianMetrics: TechnicianMetrics[];
  fleetMetrics: FleetMetrics;
}

// ====================
// API Response Types
// ====================
export interface PricingDataResponse {
  settings: OrganizationSettings;
  technicians: Technician[];
  unproductiveTimeMap: Record<string, UnproductiveTimeEntry[]>;
  officeStaff: OfficeStaff[];
  vehicles: Vehicle[];
  expenseCategories: ExpenseCategory[];
  jobTypes: JobType[];
  markupTiers: MarkupTier[];
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ====================
// Form Data Types (for modals)
// ====================
export interface TechnicianFormData {
  first_name: string;
  last_name: string;
  role: string;
  status: EmployeeStatus;
  email?: string;
  phone?: string;
  hire_date?: string;
  pay_type: PayType;
  base_pay_rate?: number;
  annual_salary?: number;
  paid_hours_per_day: number;
  payroll_tax_rate?: number;
  futa_rate?: number;
  suta_rate?: number;
  workers_comp_rate?: number;
  health_insurance_monthly: number;
  dental_insurance_monthly: number;
  vision_insurance_monthly: number;
  life_insurance_monthly: number;
  retirement_401k_match_percent: number;
  hsa_contribution_monthly: number;
  other_benefits_monthly: number;
  assigned_vehicle_id?: string;
  unproductive_time: {
    name: string;
    hours_per_day: number;
    is_paid: boolean;
  }[];
}

export interface OfficeStaffFormData {
  first_name: string;
  last_name: string;
  role: string;
  status: EmployeeStatus;
  email?: string;
  phone?: string;
  hire_date?: string;
  pay_type: PayType;
  base_pay_rate?: number;
  annual_salary?: number;
  hours_per_week: number;
  payroll_tax_rate?: number;
  futa_rate?: number;
  suta_rate?: number;
  workers_comp_rate?: number;
  health_insurance_monthly: number;
  dental_insurance_monthly: number;
  vision_insurance_monthly: number;
  life_insurance_monthly: number;
  retirement_401k_match_percent: number;
  hsa_contribution_monthly: number;
  other_benefits_monthly: number;
}

export interface VehicleFormData {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  license_plate?: string;
  status: VehicleStatus;
  loan_balance: number;
  monthly_payment: number;
  market_value: number;
  insurance_monthly: number;
  fuel_monthly: number;
  maintenance_monthly: number;
  registration_annual: number;
  fuel_type: string;
  assigned_driver_id?: string;
}

export interface ExpenseItemFormData {
  category_id: string;
  name: string;
  description?: string;
  vendor?: string;
  amount: number;
  frequency: ExpenseFrequency;
  is_tax_deductible: boolean;
}

export interface JobTypeFormData {
  name: string;
  code?: string;
  description?: string;
  min_hours: number;
  max_hours: number;
  target_gross_margin: number;
  member_discount_percent: number;
  material_gross_margin: number;
  flat_surcharge: number;
  color: string;
}

export interface MarkupTierFormData {
  name?: string;
  min_cost: number;
  max_cost: number;
  gross_margin_percent: number;
}
