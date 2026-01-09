import { createServerClient } from "@/lib/supabase";
import { successResponse, errorResponse, getOrgId, parseBody, isValidUUID } from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/pricing/job-types/[id]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid job type ID", 400);
    }

    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("pricing_job_types")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Job type not found", 404);
      }
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Job type GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PUT /api/pricing/job-types/[id]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid job type ID", 400);
    }

    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const body = await parseBody<Record<string, unknown>>(request);
    if (!body) {
      return errorResponse("Invalid request body", 400);
    }

    const supabase = createServerClient();

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name", "code", "description", "min_hours", "max_hours", "typical_hours",
      "target_gross_margin", "member_discount_percent", "material_gross_margin",
      "flat_surcharge", "servicetitan_business_unit_id", "color", "icon",
      "sort_order", "is_active"
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from("pricing_job_types")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Job type not found", 404);
      }
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Job type PUT error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/pricing/job-types/[id]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid job type ID", 400);
    }

    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("pricing_job_types")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) {
      return errorResponse(error.message, 500);
    }

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Job type DELETE error:", error);
    return errorResponse("Internal server error", 500);
  }
}
