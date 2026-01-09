import { createServerClient } from "@/lib/supabase";
import { successResponse, errorResponse, getOrgId } from "@/lib/api-helpers";

interface Technician {
  id: string;
  display_name: string;
  status: string;
  pay_type: string;
  base_pay_rate: number | null;
  annual_salary: number | null;
  paid_hours_per_day: number;
  payroll_tax_rate: number | null;
  futa_rate: number | null;
  suta_rate: number | null;
  workers_comp_rate: number | null;
  health_insurance_monthly: number;
  dental_insurance_monthly: number;
  vision_insurance_monthly: number;
  life_insurance_monthly: number;
  retirement_401k_match_percent: number;
  hsa_contribution_monthly: number;
  other_benefits_monthly: number;
  assigned_vehicle_id: string | null;
  unproductive_time: Array<{
    hours_per_day: number;
    is_paid: boolean;
  }>;
}

interface Vehicle {
  id: string;
  status: string;
  calculated_total_monthly_cost: number | null;
}

interface Organization {
  working_days_per_year: number;
  target_annual_revenue: number;
  material_cost_percent: number;
  default_payroll_tax_rate: number;
  default_futa_rate: number;
  default_suta_rate: number;
  default_workers_comp_rate_field: number;
}

interface JobType {
  id: string;
  name: string;
  code: string | null;
  min_hours: number;
  target_gross_margin: number;
  member_discount_percent: number;
  flat_surcharge: number;
}

interface ExpenseItem {
  calculated_monthly_amount: number | null;
  is_active: boolean;
}

interface ExpenseCategory {
  is_payroll: boolean;
  is_fleet: boolean;
  items: ExpenseItem[];
}

// GET /api/pricing/calculate - Get all computed pricing values
export async function GET() {
  try {
    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const supabase = createServerClient();

    // Fetch all required data in parallel (no embedded relations for view compatibility)
    const [orgResult, techResult, unproductiveTimeResult, staffResult, vehicleResult, expenseCatResult, expenseItemResult, jobTypeResult] = await Promise.all([
      supabase.from("pricing_organizations").select("*").eq("id", orgId).single(),
      supabase.from("pricing_technicians").select("*").eq("organization_id", orgId).eq("status", "active"),
      supabase.from("pricing_technician_unproductive_time").select("*"),
      supabase.from("pricing_office_staff").select("*").eq("organization_id", orgId).eq("status", "active"),
      supabase.from("pricing_vehicles").select("*").eq("organization_id", orgId).in("status", ["active", "reserve", "maintenance"]),
      supabase.from("pricing_expense_categories").select("*").eq("organization_id", orgId).eq("is_active", true),
      supabase.from("pricing_expense_items").select("*").eq("is_active", true),
      supabase.from("pricing_job_types").select("*").eq("organization_id", orgId).eq("is_active", true),
    ]);

    if (orgResult.error) {
      return errorResponse("Failed to fetch organization", 500);
    }

    const org = orgResult.data as Organization;
    const unproductiveTimeData = unproductiveTimeResult.data || [];

    // Combine technicians with their unproductive time manually
    const techniciansRaw = (techResult.data || []) as Array<Omit<Technician, 'unproductive_time'> & { id: string }>;
    const technicians = techniciansRaw.map(tech => ({
      ...tech,
      unproductive_time: unproductiveTimeData
        .filter((ut: { technician_id: string }) => ut.technician_id === tech.id)
        .map((ut: { hours_per_day: number; is_paid: boolean }) => ({
          hours_per_day: ut.hours_per_day,
          is_paid: ut.is_paid
        }))
    })) as Technician[];

    const officeStaff = (staffResult.data || []) as Array<{
      pay_type: string;
      base_pay_rate: number | null;
      annual_salary: number | null;
      hours_per_week: number;
    }>;
    const vehicles = (vehicleResult.data || []) as Vehicle[];

    // Combine expense categories with their items manually
    const expenseCats = (expenseCatResult.data || []) as Array<Omit<ExpenseCategory, 'items'> & { id: string }>;
    const expenseItems = (expenseItemResult.data || []) as Array<ExpenseItem & { category_id: string }>;
    const expenseCategories = expenseCats.map(cat => ({
      ...cat,
      items: expenseItems.filter(item => item.category_id === cat.id)
    })) as ExpenseCategory[];

    const jobTypes = (jobTypeResult.data || []) as JobType[];

    // Calculate technician metrics
    const techMetrics = technicians.map(tech => {
      // Annual base pay
      let annualBasePay = 0;
      if (tech.pay_type === "hourly" && tech.base_pay_rate) {
        annualBasePay = tech.base_pay_rate * tech.paid_hours_per_day * org.working_days_per_year;
      } else if (tech.annual_salary) {
        annualBasePay = tech.annual_salary;
      }

      // Get burden rates (use org defaults if not set)
      const payrollTaxRate = tech.payroll_tax_rate ?? org.default_payroll_tax_rate;
      const futaRate = tech.futa_rate ?? org.default_futa_rate;
      const sutaRate = tech.suta_rate ?? org.default_suta_rate;
      const workersCompRate = tech.workers_comp_rate ?? org.default_workers_comp_rate_field;

      // Calculate burden
      const payrollTax = annualBasePay * (payrollTaxRate / 100);
      const futa = Math.min(annualBasePay, 7000) * (futaRate / 100);
      const suta = annualBasePay * (sutaRate / 100);
      const workersComp = annualBasePay * (workersCompRate / 100);
      const healthInsurance = tech.health_insurance_monthly * 12;
      const dentalVision = (tech.dental_insurance_monthly + tech.vision_insurance_monthly) * 12;
      const retirement = annualBasePay * (tech.retirement_401k_match_percent / 100);
      const otherBenefits = (tech.life_insurance_monthly + tech.hsa_contribution_monthly + tech.other_benefits_monthly) * 12;

      const totalBurden = payrollTax + futa + suta + workersComp + healthInsurance + dentalVision + retirement + otherBenefits;
      const burdenPercent = annualBasePay > 0 ? (totalBurden / annualBasePay) * 100 : 0;

      // Calculate unproductive time
      const paidUnproductiveHours = (tech.unproductive_time || [])
        .filter(ut => ut.is_paid)
        .reduce((sum, ut) => sum + ut.hours_per_day, 0);

      const billableHoursPerDay = tech.paid_hours_per_day - paidUnproductiveHours;
      const efficiencyPercent = tech.paid_hours_per_day > 0
        ? (billableHoursPerDay / tech.paid_hours_per_day) * 100
        : 0;
      const billableHoursPerYear = billableHoursPerDay * org.working_days_per_year;

      // True cost per billable hour
      const totalAnnualCost = annualBasePay + totalBurden;
      const trueCostPerHour = billableHoursPerYear > 0
        ? totalAnnualCost / billableHoursPerYear
        : 0;

      return {
        id: tech.id,
        name: tech.display_name,
        annualBasePay,
        totalBurden,
        burdenPercent,
        billableHoursPerDay,
        billableHoursPerYear,
        efficiencyPercent,
        trueCostPerHour,
        assignedVehicleId: tech.assigned_vehicle_id,
      };
    });

    // Workforce totals
    const totalTechnicians = techMetrics.length;
    const totalOfficeStaff = officeStaff.length;
    const avgBurdenPercent = totalTechnicians > 0
      ? techMetrics.reduce((sum, t) => sum + t.burdenPercent, 0) / totalTechnicians
      : 0;
    const avgEfficiencyPercent = totalTechnicians > 0
      ? techMetrics.reduce((sum, t) => sum + t.efficiencyPercent, 0) / totalTechnicians
      : 0;
    const avgTrueCostPerHour = totalTechnicians > 0
      ? techMetrics.reduce((sum, t) => sum + t.trueCostPerHour, 0) / totalTechnicians
      : 0;
    const totalBillableHoursPerYear = techMetrics.reduce((sum, t) => sum + t.billableHoursPerYear, 0);
    const totalLaborCostAnnual = techMetrics.reduce((sum, t) => sum + t.annualBasePay + t.totalBurden, 0);

    // Fleet calculations
    const activeVehicles = vehicles.filter(v => v.status === "active");
    const fleetCostMonthly = vehicles.reduce((sum, v) => sum + (v.calculated_total_monthly_cost || 0), 0);
    const fleetCostPerBillableHour = totalBillableHoursPerYear > 0
      ? (fleetCostMonthly * 12) / totalBillableHoursPerYear
      : 0;

    // Overhead calculations (excluding payroll and fleet which are calculated separately)
    const overheadMonthly = expenseCategories
      .filter(cat => !cat.is_payroll && !cat.is_fleet)
      .reduce((catSum, cat) => {
        const itemsTotal = (cat.items || [])
          .filter(item => item.is_active)
          .reduce((itemSum, item) => itemSum + (item.calculated_monthly_amount || 0), 0);
        return catSum + itemsTotal;
      }, 0);
    const overheadAnnual = overheadMonthly * 12;
    const overheadPerBillableHour = totalBillableHoursPerYear > 0
      ? overheadAnnual / totalBillableHoursPerYear
      : 0;

    // Office staff cost
    const officeStaffCostAnnual = officeStaff.reduce((sum, staff) => {
      if (staff.pay_type === "hourly" && staff.base_pay_rate) {
        return sum + (staff.base_pay_rate * staff.hours_per_week * 52);
      } else if (staff.annual_salary) {
        return sum + staff.annual_salary;
      }
      return sum;
    }, 0);

    // Loaded cost per hour (labor + vehicle + overhead allocation)
    const loadedCostPerHour = avgTrueCostPerHour + fleetCostPerBillableHour;

    // Job type rate calculations
    const jobTypeRates = jobTypes.map(jt => {
      const hourlyRate = loadedCostPerHour / (1 - jt.target_gross_margin / 100);
      const memberRate = hourlyRate * (1 - jt.member_discount_percent / 100);
      const minInvoice = (hourlyRate * jt.min_hours) + jt.flat_surcharge;

      return {
        jobTypeId: jt.id,
        name: jt.name,
        code: jt.code,
        hourlyRate,
        memberRate,
        minInvoice,
        targetMargin: jt.target_gross_margin,
      };
    });

    // P&L projections
    const projectedRevenue = org.target_annual_revenue;
    const materialCost = projectedRevenue * (org.material_cost_percent / 100);
    const grossProfit = projectedRevenue - materialCost - totalLaborCostAnnual;
    const grossMargin = projectedRevenue > 0 ? (grossProfit / projectedRevenue) * 100 : 0;

    const totalOverhead = overheadAnnual + officeStaffCostAnnual + (fleetCostMonthly * 12);
    const netProfit = grossProfit - totalOverhead;
    const netMargin = projectedRevenue > 0 ? (netProfit / projectedRevenue) * 100 : 0;

    // Break-even calculations
    const fixedCosts = totalOverhead + totalLaborCostAnnual;
    const contributionMarginPercent = 100 - org.material_cost_percent;
    const breakEvenAnnual = contributionMarginPercent > 0
      ? fixedCosts / (contributionMarginPercent / 100)
      : 0;
    const breakEvenMonthly = breakEvenAnnual / 12;
    const breakEvenDaily = breakEvenAnnual / org.working_days_per_year;

    // Per-tech metrics
    const revenuePerTechAnnual = totalTechnicians > 0 ? projectedRevenue / totalTechnicians : 0;
    const revenuePerTechMonthly = revenuePerTechAnnual / 12;

    const calculations = {
      // Workforce
      totalTechnicians,
      totalOfficeStaff,
      avgBurdenPercent,
      avgEfficiencyPercent,
      avgTrueCostPerHour,
      totalBillableHoursPerYear,
      totalLaborCostAnnual,

      // Fleet
      totalVehicles: vehicles.length,
      activeVehicles: activeVehicles.length,
      fleetCostMonthly,
      fleetCostPerBillableHour,

      // Overhead
      overheadMonthly,
      overheadAnnual,
      overheadPerBillableHour,
      officeStaffCostAnnual,

      // Loaded cost
      loadedCostPerHour,

      // Job type rates
      jobTypeRates,

      // P&L projections
      projectedRevenue,
      materialCost,
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,

      // Break-even
      breakEvenMonthly,
      breakEvenDaily,
      breakEvenAnnual,

      // Per-tech metrics
      revenuePerTechAnnual,
      revenuePerTechMonthly,

      // Technician details
      technicianMetrics: techMetrics,
    };

    return successResponse(calculations);
  } catch (error) {
    console.error("Calculate error:", error);
    return errorResponse("Internal server error", 500);
  }
}
