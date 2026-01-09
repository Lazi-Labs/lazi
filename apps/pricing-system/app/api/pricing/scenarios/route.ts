import { createServerClient } from "@/lib/supabase";
import { successResponse, errorResponse, getOrgId, parseBody } from "@/lib/api-helpers";

// GET /api/pricing/scenarios - List all scenarios
export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const supabase = createServerClient();
    let query = supabase
      .from("pricing_scenarios")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching scenarios:", error);
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Scenarios GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/pricing/scenarios - Create new scenario
export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const body = await parseBody<Record<string, unknown>>(request);
    if (!body) {
      return errorResponse("Invalid request body", 400);
    }

    if (!body.name || !body.snapshot_data) {
      return errorResponse("name and snapshot_data are required", 400);
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("pricing_scenarios")
      .insert({
        organization_id: orgId,
        name: body.name,
        description: body.description,
        snapshot_data: body.snapshot_data,
        summary_tech_count: body.summary_tech_count,
        summary_staff_count: body.summary_staff_count,
        summary_vehicle_count: body.summary_vehicle_count,
        summary_avg_burden_percent: body.summary_avg_burden_percent,
        summary_avg_efficiency_percent: body.summary_avg_efficiency_percent,
        summary_avg_true_cost_per_hour: body.summary_avg_true_cost_per_hour,
        summary_fleet_cost_monthly: body.summary_fleet_cost_monthly,
        summary_overhead_monthly: body.summary_overhead_monthly,
        summary_avg_hourly_rate: body.summary_avg_hourly_rate,
        summary_projected_revenue: body.summary_projected_revenue,
        summary_projected_net_profit: body.summary_projected_net_profit,
        summary_net_profit_percent: body.summary_net_profit_percent,
        summary_break_even_monthly: body.summary_break_even_monthly,
        is_baseline: body.is_baseline || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating scenario:", error);
      return errorResponse(error.message, 500);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error("Scenarios POST error:", error);
    return errorResponse("Internal server error", 500);
  }
}
