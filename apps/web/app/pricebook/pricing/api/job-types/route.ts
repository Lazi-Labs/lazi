import { createServerClient } from "../../lib/supabase";
import { successResponse, errorResponse, getOrgId, parseBody } from "../../lib/api-helpers";

// GET /pricebook/pricing/api/job-types - List all job types
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
      .from("pricing_job_types")
      .select("*")
      .eq("organization_id", orgId)
      .order("sort_order");

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching job types:", error);
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Job types GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /pricebook/pricing/api/job-types - Create new job type
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

    if (!body.name) {
      return errorResponse("name is required", 400);
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("pricing_job_types")
      .insert({
        organization_id: orgId,
        name: body.name,
        code: body.code,
        description: body.description,
        min_hours: body.min_hours || 0,
        max_hours: body.max_hours || 4,
        typical_hours: body.typical_hours,
        target_gross_margin: body.target_gross_margin || 60,
        member_discount_percent: body.member_discount_percent || 0,
        material_gross_margin: body.material_gross_margin || 40,
        flat_surcharge: body.flat_surcharge || 0,
        servicetitan_business_unit_id: body.servicetitan_business_unit_id,
        color: body.color || "sky",
        icon: body.icon || "Wrench",
        sort_order: body.sort_order || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating job type:", error);
      return errorResponse(error.message, 500);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error("Job types POST error:", error);
    return errorResponse("Internal server error", 500);
  }
}
