import { createServerClient } from "../../../lib/supabase";
import { successResponse, errorResponse, getOrgId, parseBody, isValidUUID } from "../../../lib/api-helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /pricebook/pricing/api/office-staff/[id]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid staff ID", 400);
    }

    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("pricing_office_staff")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Staff member not found", 404);
      }
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Office staff GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PUT /pricebook/pricing/api/office-staff/[id]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid staff ID", 400);
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
      "first_name", "last_name", "role", "status", "email", "phone",
      "employee_number", "hire_date", "termination_date", "department",
      "pay_type", "base_pay_rate", "annual_salary", "hours_per_week",
      "payroll_tax_rate", "futa_rate", "suta_rate", "workers_comp_rate",
      "health_insurance_monthly", "dental_insurance_monthly", "vision_insurance_monthly",
      "life_insurance_monthly", "retirement_401k_match_percent", "hsa_contribution_monthly",
      "other_benefits_monthly", "notes"
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from("pricing_office_staff")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Staff member not found", 404);
      }
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Office staff PUT error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PATCH /pricebook/pricing/api/office-staff/[id] - Update staff (alias for PUT)
export async function PATCH(request: Request, { params }: RouteParams) {
  return PUT(request, { params });
}

// DELETE /pricebook/pricing/api/office-staff/[id]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid staff ID", 400);
    }

    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("pricing_office_staff")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) {
      return errorResponse(error.message, 500);
    }

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Office staff DELETE error:", error);
    return errorResponse("Internal server error", 500);
  }
}
