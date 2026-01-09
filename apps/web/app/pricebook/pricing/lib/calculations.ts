// Advanced Pricing System - Calculation Functions
import {
  Technician,
  OfficeStaff,
  Vehicle,
  ExpenseCategory,
  ExpenseItem,
  JobType,
  MarkupTier,
  OrganizationSettings,
  UnproductiveTimeEntry,
  CalculationResults,
  TechnicianMetrics,
  BurdenBreakdown,
  FleetMetrics,
} from './types';

// ====================
// Helper: Get effective burden rates (tech override OR org default)
// ====================
interface EffectiveBurdenRates {
  payrollTax: number;
  futa: number;
  suta: number;
  workersComp: number;
}

export function getEffectiveBurdenRates(
  employee: Technician | OfficeStaff,
  settings: OrganizationSettings,
  isOffice: boolean = false
): EffectiveBurdenRates {
  return {
    payrollTax: employee.payroll_tax_rate ?? settings.default_payroll_tax_rate,
    futa: employee.futa_rate ?? settings.default_futa_rate,
    suta: employee.suta_rate ?? settings.default_suta_rate,
    workersComp: employee.workers_comp_rate ??
      (isOffice ? settings.default_workers_comp_rate_office : settings.default_workers_comp_rate_field),
  };
}

// ====================
// Calculate Technician Metrics
// ====================
export function calcTechnicianMetrics(
  tech: Technician,
  unproductiveTime: UnproductiveTimeEntry[],
  settings: OrganizationSettings,
  vehicle?: Vehicle
): TechnicianMetrics {
  const rates = getEffectiveBurdenRates(tech, settings, false);

  // Annual base pay
  const hoursPerYear = tech.paid_hours_per_day * settings.working_days_per_year;
  const annualBasePay = tech.pay_type === 'salary'
    ? (tech.annual_salary || 0)
    : (tech.base_pay_rate || 0) * hoursPerYear;

  // Burden calculations
  const payrollTaxes = annualBasePay * (rates.payrollTax / 100);
  const futa = Math.min(annualBasePay, 7000) * (rates.futa / 100); // FUTA only on first $7k
  const suta = annualBasePay * (rates.suta / 100);
  const workersComp = annualBasePay * (rates.workersComp / 100);

  // Benefits (annual)
  const healthAnnual = tech.health_insurance_monthly * 12;
  const dentalAnnual = tech.dental_insurance_monthly * 12;
  const visionAnnual = tech.vision_insurance_monthly * 12;
  const lifeAnnual = tech.life_insurance_monthly * 12;
  const retirement = annualBasePay * (tech.retirement_401k_match_percent / 100);
  const hsaAnnual = tech.hsa_contribution_monthly * 12;
  const otherAnnual = tech.other_benefits_monthly * 12;

  // Total burden
  const totalBurden =
    payrollTaxes + futa + suta + workersComp +
    healthAnnual + dentalAnnual + visionAnnual + lifeAnnual +
    retirement + hsaAnnual + otherAnnual;

  const burdenPercent = annualBasePay > 0 ? (totalBurden / annualBasePay) * 100 : 0;
  const totalCostAnnual = annualBasePay + totalBurden;

  // Productivity (unproductive time)
  const paidUnproductive = unproductiveTime
    .filter((t) => t.is_paid)
    .reduce((sum, t) => sum + t.hours_per_day, 0);
  const unpaidTime = unproductiveTime
    .filter((t) => !t.is_paid)
    .reduce((sum, t) => sum + t.hours_per_day, 0);

  const billableHoursPerDay = Math.max(0, tech.paid_hours_per_day - paidUnproductive);
  const billableHoursPerYear = billableHoursPerDay * settings.working_days_per_year;
  const efficiencyPercent = tech.paid_hours_per_day > 0
    ? (billableHoursPerDay / tech.paid_hours_per_day) * 100
    : 0;

  // True cost per billable hour
  const trueCostPerHour = billableHoursPerYear > 0
    ? totalCostAnnual / billableHoursPerYear
    : 0;

  // Vehicle cost allocation
  const vehicleMonthlyCost = vehicle
    ? (vehicle.monthly_payment || 0) +
      (vehicle.insurance_monthly || 0) +
      (vehicle.fuel_monthly || 0) +
      (vehicle.maintenance_monthly || 0)
    : 0;
  const billableHoursPerMonth = billableHoursPerYear / 12;
  const vehicleCostPerHour = billableHoursPerMonth > 0
    ? vehicleMonthlyCost / billableHoursPerMonth
    : 0;

  // Loaded cost (true cost + vehicle)
  const loadedCostPerHour = trueCostPerHour + vehicleCostPerHour;

  return {
    id: tech.id,
    name: tech.display_name || `${tech.first_name} ${tech.last_name}`,
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
    burdenBreakdown: {
      payrollTaxes,
      futa,
      suta,
      workersComp,
      healthAnnual,
      dentalAnnual,
      visionAnnual,
      lifeAnnual,
      retirement,
      hsaAnnual,
      otherAnnual,
    },
  };
}

// ====================
// Calculate Office Staff Metrics
// ====================
export interface OfficeStaffMetrics {
  annualBasePay: number;
  totalBurden: number;
  burdenPercent: number;
  totalCostAnnual: number;
  monthlyCost: number;
}

export function calcOfficeStaffMetrics(
  staff: OfficeStaff,
  settings: OrganizationSettings
): OfficeStaffMetrics {
  const rates = getEffectiveBurdenRates(staff, settings, true);

  const hoursPerYear = staff.hours_per_week * settings.weeks_per_year;
  const annualBasePay = staff.pay_type === 'salary'
    ? (staff.annual_salary || 0)
    : (staff.base_pay_rate || 0) * hoursPerYear;

  // Burden calculations
  const payrollTaxes = annualBasePay * (rates.payrollTax / 100);
  const futa = Math.min(annualBasePay, 7000) * (rates.futa / 100);
  const suta = annualBasePay * (rates.suta / 100);
  const workersComp = annualBasePay * (rates.workersComp / 100);

  // Benefits (annual)
  const healthAnnual = staff.health_insurance_monthly * 12;
  const dentalAnnual = staff.dental_insurance_monthly * 12;
  const visionAnnual = staff.vision_insurance_monthly * 12;
  const lifeAnnual = (staff.life_insurance_monthly || 0) * 12;
  const retirement = annualBasePay * (staff.retirement_401k_match_percent / 100);
  const hsaAnnual = (staff.hsa_contribution_monthly || 0) * 12;
  const otherAnnual = staff.other_benefits_monthly * 12;

  const totalBurden =
    payrollTaxes + futa + suta + workersComp +
    healthAnnual + dentalAnnual + visionAnnual + lifeAnnual +
    retirement + hsaAnnual + otherAnnual;

  const burdenPercent = annualBasePay > 0 ? (totalBurden / annualBasePay) * 100 : 0;
  const totalCostAnnual = annualBasePay + totalBurden;
  const monthlyCost = totalCostAnnual / 12;

  return { annualBasePay, totalBurden, burdenPercent, totalCostAnnual, monthlyCost };
}

// ====================
// Calculate Fleet Metrics
// ====================
export function calcFleetMetrics(vehicles: Vehicle[]): FleetMetrics {
  // Active vehicles include active, reserve, and maintenance status
  const activeVehicles = vehicles.filter((v) =>
    ['active', 'reserve', 'maintenance'].includes(v.status)
  );

  const totalPayments = activeVehicles.reduce((s, v) => s + (v.monthly_payment || 0), 0);
  const totalInsurance = activeVehicles.reduce((s, v) => s + (v.insurance_monthly || 0), 0);
  const totalFuel = activeVehicles.reduce((s, v) => s + (v.fuel_monthly || 0), 0);
  const totalMaintenance = activeVehicles.reduce((s, v) => s + (v.maintenance_monthly || 0), 0);
  const totalMonthly = totalPayments + totalInsurance + totalFuel + totalMaintenance;

  const totalLoanBalance = activeVehicles.reduce((s, v) => s + (v.loan_balance || 0), 0);
  const totalMarketValue = activeVehicles.reduce((s, v) => s + (v.market_value || 0), 0);
  const totalEquity = totalMarketValue - totalLoanBalance;

  return {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter((v) => v.status === 'active').length,
    totalPayments,
    totalInsurance,
    totalFuel,
    totalMaintenance,
    totalMonthly,
    totalAnnual: totalMonthly * 12,
    totalLoanBalance,
    totalMarketValue,
    totalEquity,
  };
}

// ====================
// Calculate Expense Monthly Amount
// ====================
export function calcExpenseMonthly(item: ExpenseItem | { amount: number; frequency: string }): number {
  switch (item.frequency) {
    case 'annual':
      return item.amount / 12;
    case 'quarterly':
      return item.amount / 3;
    case 'weekly':
      return item.amount * 4.333; // Average weeks per month
    case 'one_time':
      return 0; // One-time expenses don't contribute to monthly
    default:
      return item.amount; // monthly
  }
}

// ====================
// Calculate Total Expenses
// ====================
export function calcTotalExpenses(categories: ExpenseCategory[]): number {
  return categories.reduce((total, cat) => {
    return (
      total +
      (cat.items || []).reduce((catTotal, item) => {
        return catTotal + calcExpenseMonthly(item);
      }, 0)
    );
  }, 0);
}

// ====================
// Calculate Hourly Rate from Loaded Cost and Margin
// ====================
export function calcHourlyRate(loadedCost: number, targetMarginPercent: number): number {
  if (targetMarginPercent >= 100) return 0;
  return loadedCost / (1 - targetMarginPercent / 100);
}

// ====================
// Calculate Markup from Margin
// ====================
export function calcMarkupFromMargin(marginPercent: number): number {
  if (marginPercent >= 100) return 999999;
  return (marginPercent / (100 - marginPercent)) * 100;
}

// ====================
// Calculate Multiplier from Margin
// ====================
export function calcMultiplierFromMargin(marginPercent: number): number {
  if (marginPercent >= 100) return 999;
  return 1 / (1 - marginPercent / 100);
}

// ====================
// Calculate Job Type Rate
// ====================
export function calcJobTypeRate(
  jobType: JobType,
  loadedCostPerHour: number
): { hourlyRate: number; memberRate: number; minInvoice: number } {
  const hourlyRate = calcHourlyRate(loadedCostPerHour, jobType.target_gross_margin);
  const memberRate = hourlyRate * (1 - jobType.member_discount_percent / 100);
  const minInvoice = hourlyRate * jobType.min_hours + (jobType.flat_surcharge || 0);

  return { hourlyRate, memberRate, minInvoice };
}

// ====================
// Calculate Markup Tier
// ====================
export function calcMarkupTier(
  tier: MarkupTier
): { markupPercent: number; multiplier: number } {
  const markupPercent = calcMarkupFromMargin(tier.gross_margin_percent);
  const multiplier = calcMultiplierFromMargin(tier.gross_margin_percent);

  return { markupPercent, multiplier };
}

// ====================
// Calculate Material Sell Price
// ====================
export function calcMaterialSellPrice(
  cost: number,
  tiers: MarkupTier[]
): { tier: MarkupTier | null; sellPrice: number; grossMargin: number } {
  // Find the appropriate tier based on cost
  const tier = tiers.find((t) => cost >= t.min_cost && cost < t.max_cost) || null;

  if (!tier) {
    return { tier: null, sellPrice: cost, grossMargin: 0 };
  }

  const multiplier = calcMultiplierFromMargin(tier.gross_margin_percent);
  const sellPrice = cost * multiplier;
  const grossMargin = sellPrice - cost;

  return { tier, sellPrice, grossMargin };
}

// ====================
// Calculate Full Summary
// ====================
export function calcFullSummary(
  technicians: Technician[],
  unproductiveTimeMap: Map<string, UnproductiveTimeEntry[]> | Record<string, UnproductiveTimeEntry[]>,
  officeStaff: OfficeStaff[],
  vehicles: Vehicle[],
  expenseCategories: ExpenseCategory[],
  settings: OrganizationSettings
): CalculationResults {
  // Convert Record to Map if needed
  const timeMap =
    unproductiveTimeMap instanceof Map
      ? unproductiveTimeMap
      : new Map(Object.entries(unproductiveTimeMap));

  const activeTechs = technicians.filter((t) => t.status === 'active');
  const activeStaff = officeStaff.filter((s) => s.status === 'active');

  // Technician metrics
  let totalTechCost = 0;
  let totalBillableHours = 0;
  let sumBurdenPercent = 0;
  let sumEfficiency = 0;
  let sumTrueCost = 0;
  let sumLoadedCost = 0;
  const technicianMetrics: TechnicianMetrics[] = [];

  activeTechs.forEach((tech) => {
    const unproductive = timeMap.get(tech.id) || [];
    const vehicle = vehicles.find((v) => v.id === tech.assigned_vehicle_id);
    const metrics = calcTechnicianMetrics(tech, unproductive, settings, vehicle);

    technicianMetrics.push(metrics);
    totalTechCost += metrics.totalCostAnnual;
    totalBillableHours += metrics.billableHoursPerYear;
    sumBurdenPercent += metrics.burdenPercent;
    sumEfficiency += metrics.efficiencyPercent;
    sumTrueCost += metrics.trueCostPerHour;
    sumLoadedCost += metrics.loadedCostPerHour;
  });

  // Staff metrics
  let totalStaffCost = 0;
  activeStaff.forEach((staff) => {
    const metrics = calcOfficeStaffMetrics(staff, settings);
    totalStaffCost += metrics.totalCostAnnual;
  });

  // Fleet metrics
  const fleetMetrics = calcFleetMetrics(vehicles);

  // Expenses
  const monthlyExpenses = calcTotalExpenses(expenseCategories);
  const monthlyOverhead = monthlyExpenses + totalStaffCost / 12;

  // Averages
  const techCount = activeTechs.length;
  const avgBurdenPercent = techCount > 0 ? sumBurdenPercent / techCount : 0;
  const avgEfficiencyPercent = techCount > 0 ? sumEfficiency / techCount : 0;
  const avgTrueCostPerHour = techCount > 0 ? sumTrueCost / techCount : 0;
  const avgLoadedCostPerHour = techCount > 0 ? sumLoadedCost / techCount : 0;

  // Cost allocations per billable hour
  const fleetCostPerHour =
    totalBillableHours > 0 ? (fleetMetrics.totalMonthly * 12) / totalBillableHours : 0;
  const overheadPerHour =
    totalBillableHours > 0 ? (monthlyOverhead * 12) / totalBillableHours : 0;

  // P&L projections
  const revenue = settings.target_annual_revenue || 0;
  const materialsCost = revenue * (settings.material_cost_percent / 100);
  const grossProfit = revenue - materialsCost - totalTechCost;
  const netProfit = grossProfit - monthlyOverhead * 12;
  const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMarginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  // Break-even analysis
  const contributionMargin = 1 - settings.material_cost_percent / 100;
  const breakEvenMonthly =
    contributionMargin > 0
      ? (totalTechCost / 12 + monthlyOverhead) / contributionMargin
      : 0;
  const breakEvenDaily = breakEvenMonthly / 21.67; // Average working days per month
  const breakEvenAnnual = breakEvenMonthly * 12;

  return {
    techCount,
    staffCount: activeStaff.length,
    avgBurdenPercent,
    avgEfficiencyPercent,
    avgTrueCostPerHour,
    totalBillableHoursPerYear: totalBillableHours,
    totalTechCostAnnual: totalTechCost,
    totalStaffCostAnnual: totalStaffCost,

    totalVehicles: fleetMetrics.totalVehicles,
    activeVehicles: fleetMetrics.activeVehicles,
    fleetCostMonthly: fleetMetrics.totalMonthly,
    fleetCostPerHour,
    totalEquity: fleetMetrics.totalEquity,

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
    breakEvenDaily,
    breakEvenAnnual,

    revenuePerTechAnnual: techCount > 0 ? revenue / techCount : 0,
    revenuePerTechMonthly: techCount > 0 ? revenue / techCount / 12 : 0,

    technicianMetrics,
    fleetMetrics,
  };
}

// ====================
// Formatting Helpers
// ====================
export function formatCurrency(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
