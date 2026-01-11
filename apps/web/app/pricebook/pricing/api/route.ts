import { createServerClient } from "../lib/supabase";
import { successResponse, errorResponse, getOrgId } from "../lib/api-helpers";

interface UnproductiveTimeEntry {
  technician_id: string;
  name: string;
  hours_per_day: number;
  is_paid: boolean;
}

// GET /pricebook/pricing/api - Get all pricing data (aggregated)
export async function GET() {
  try {
    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const supabase = createServerClient();

    // Fetch all data in parallel
    const [
      orgResult,
      techResult,
      unproductiveTimeResult,
      staffResult,
      vehicleResult,
      expenseCatResult,
      expenseItemResult,
      jobTypeResult,
      markupTierResult,
    ] = await Promise.all([
      supabase.from("pricing_organizations").select("*").eq("id", orgId).single(),
      supabase.from("pricing_technicians").select("*").eq("organization_id", orgId),
      supabase.from("pricing_technician_unproductive_time").select("*"),
      supabase.from("pricing_office_staff").select("*").eq("organization_id", orgId),
      supabase.from("pricing_vehicles").select("*").eq("organization_id", orgId),
      supabase.from("pricing_expense_categories").select("*").eq("organization_id", orgId).eq("is_active", true).order("sort_order"),
      supabase.from("pricing_expense_items").select("*").eq("is_active", true),
      supabase.from("pricing_job_types").select("*").eq("organization_id", orgId).eq("is_active", true).order("sort_order"),
      supabase.from("pricing_markup_tiers").select("*").eq("organization_id", orgId).eq("is_active", true).order("min_cost"),
    ]);

    if (orgResult.error) {
      console.error("Failed to fetch organization:", orgResult.error);
      return errorResponse("Organization not found", 404);
    }

    const settings = orgResult.data;
    const technicians = techResult.data || [];
    const unproductiveTimeData = unproductiveTimeResult.data || [];
    const officeStaff = staffResult.data || [];
    const vehicles = vehicleResult.data || [];
    const expenseCategories = expenseCatResult.data || [];
    const expenseItems = expenseItemResult.data || [];
    const jobTypes = jobTypeResult.data || [];
    const markupTiers = markupTierResult.data || [];

    // Build unproductive time map (technician_id -> entries[])
    const unproductiveTimeMap: Record<string, UnproductiveTimeEntry[]> = {};
    for (const entry of unproductiveTimeData) {
      const techId = entry.technician_id;
      if (!unproductiveTimeMap[techId]) {
        unproductiveTimeMap[techId] = [];
      }
      unproductiveTimeMap[techId].push({
        technician_id: entry.technician_id,
        name: entry.name || "Unproductive",
        hours_per_day: entry.hours_per_day || 0,
        is_paid: entry.is_paid ?? true,
      });
    }

    // Combine expense categories with their items
    const expenseCategoriesWithItems = expenseCategories.map((cat: { id: string }) => ({
      ...cat,
      items: expenseItems.filter((item: { category_id: string }) => item.category_id === cat.id),
    }));

    const response = {
      settings,
      technicians,
      unproductiveTimeMap,
      officeStaff,
      vehicles,
      expenseCategories: expenseCategoriesWithItems,
      jobTypes,
      markupTiers,
    };

    return successResponse(response);
  } catch (error) {
    console.error("Pricing data aggregation error:", error);
    return errorResponse("Internal server error", 500);
  }
}
