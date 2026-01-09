// Pricing system TypeScript interfaces

export type EmployeeStatus = "active" | "inactive" | "terminated" | "on_leave";
export type PayType = "hourly" | "salary";
export type VehicleStatus = "active" | "reserve" | "maintenance" | "sold" | "totaled";
export type ExpenseFrequency = "monthly" | "annual" | "quarterly" | "weekly" | "one_time";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  legalName?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  timezone: string;
  currency: string;
  fiscalYearStart: number;
  workingDaysPerYear: number;
  weeksPerYear: number;
  defaultBillableHoursPerDay: number;
  targetAnnualRevenue: number;
  materialCostPercent: number;
  defaultPayrollTaxRate: number;
  defaultFutaRate: number;
  defaultSutaRate: number;
  defaultWorkersCompRateField: number;
  defaultWorkersCompRateOffice: number;
  servicetitanTenantId?: string;
  servicetitanConnected: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnproductiveTime {
  id: string;
  name: string;
  hoursPerDay: number;
  isPaid: boolean;
  notes?: string;
}

export interface Technician {
  id: string;
  organizationId: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  status: EmployeeStatus;
  email?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  hireDate?: string;
  terminationDate?: string;
  department?: string;
  payType: PayType;
  basePayRate?: number;
  annualSalary?: number;
  overtimeMultiplier: number;
  paidHoursPerDay: number;
  payrollTaxRate?: number;
  futaRate?: number;
  sutaRate?: number;
  workersCompRate?: number;
  healthInsuranceMonthly: number;
  dentalInsuranceMonthly: number;
  visionInsuranceMonthly: number;
  lifeInsuranceMonthly: number;
  retirement401kMatchPercent: number;
  hsaContributionMonthly: number;
  otherBenefitsMonthly: number;
  assignedVehicleId?: string;
  servicetitanEmployeeId?: string;
  unproductiveTime: UnproductiveTime[];
  // Calculated fields
  calculatedAnnualBasePay?: number;
  calculatedTotalBurdenAnnual?: number;
  calculatedBurdenPercent?: number;
  calculatedBillableHoursPerYear?: number;
  calculatedTrueCostPerHour?: number;
  calculatedEfficiencyPercent?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeStaff {
  id: string;
  organizationId: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  status: EmployeeStatus;
  email?: string;
  phone?: string;
  hireDate?: string;
  terminationDate?: string;
  department?: string;
  payType: PayType;
  basePayRate?: number;
  annualSalary?: number;
  hoursPerWeek: number;
  payrollTaxRate?: number;
  futaRate?: number;
  sutaRate?: number;
  workersCompRate?: number;
  healthInsuranceMonthly: number;
  dentalInsuranceMonthly: number;
  visionInsuranceMonthly: number;
  lifeInsuranceMonthly: number;
  retirement401kMatchPercent: number;
  hsaContributionMonthly: number;
  otherBenefitsMonthly: number;
  // Calculated fields
  calculatedAnnualBasePay?: number;
  calculatedTotalBurdenAnnual?: number;
  calculatedBurdenPercent?: number;
  calculatedMonthlyCost?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  organizationId: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  color?: string;
  vin?: string;
  licensePlate?: string;
  status: VehicleStatus;
  assignedDriverId?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  loanBalance: number;
  monthlyPayment: number;
  loanInterestRate?: number;
  loanTermMonths?: number;
  marketValue: number;
  insuranceMonthly: number;
  fuelMonthly: number;
  maintenanceMonthly: number;
  registrationAnnual: number;
  odometerCurrent?: number;
  odometerAtPurchase?: number;
  fuelType: string;
  mpgAverage?: number;
  servicetitanEquipmentId?: string;
  // Calculated fields
  calculatedEquity?: number;
  calculatedTotalMonthlyCost?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategory {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  isPayroll: boolean;
  isFleet: boolean;
  isSystem: boolean;
  sortOrder: number;
  isCollapsed: boolean;
  calculatedMonthlyTotal: number;
  items: ExpenseItem[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseItem {
  id: string;
  categoryId: string;
  organizationId: string;
  name: string;
  description?: string;
  vendor?: string;
  amount: number;
  frequency: ExpenseFrequency;
  calculatedMonthlyAmount?: number;
  accountNumber?: string;
  isTaxDeductible: boolean;
  taxCategory?: string;
  sortOrder: number;
  isActive: boolean;
  effectiveDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobType {
  id: string;
  organizationId: string;
  name: string;
  code?: string;
  description?: string;
  minHours: number;
  maxHours: number;
  typicalHours?: number;
  targetGrossMargin: number;
  memberDiscountPercent: number;
  materialGrossMargin: number;
  flatSurcharge: number;
  // Calculated fields
  calculatedHourlyRate?: number;
  calculatedMemberRate?: number;
  calculatedMinInvoice?: number;
  calculatedMaterialMarkup?: number;
  servicetitanBusinessUnitId?: string;
  color: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Scenario {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  snapshotData: Record<string, unknown>;
  summaryTechCount?: number;
  summaryStaffCount?: number;
  summaryVehicleCount?: number;
  summaryAvgBurdenPercent?: number;
  summaryAvgEfficiencyPercent?: number;
  summaryAvgTrueCostPerHour?: number;
  summaryFleetCostMonthly?: number;
  summaryOverheadMonthly?: number;
  summaryAvgHourlyRate?: number;
  summaryProjectedRevenue?: number;
  summaryProjectedNetProfit?: number;
  summaryNetProfitPercent?: number;
  summaryBreakEvenMonthly?: number;
  isBaseline: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
}

// API response types
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

// Calculation results
export interface CalculationResults {
  // Workforce totals
  totalTechnicians: number;
  totalOfficeStaff: number;
  avgBurdenPercent: number;
  avgEfficiencyPercent: number;
  avgTrueCostPerHour: number;
  totalBillableHoursPerYear: number;
  totalLaborCostAnnual: number;

  // Fleet totals
  totalVehicles: number;
  activeVehicles: number;
  fleetCostMonthly: number;
  fleetCostPerBillableHour: number;
  totalEquity: number;

  // Overhead
  overheadMonthly: number;
  overheadAnnual: number;
  overheadPerBillableHour: number;

  // Loaded cost
  loadedCostPerHour: number;

  // Job type rates
  jobTypeRates: {
    jobTypeId: string;
    name: string;
    hourlyRate: number;
    memberRate: number;
    minInvoice: number;
    materialMarkup: number;
  }[];

  // P&L projections
  projectedRevenue: number;
  materialCost: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  breakEvenMonthly: number;
  breakEvenDaily: number;

  // Per-tech metrics
  revenuePerTechAnnual: number;
  revenuePerTechMonthly: number;
}
