import { createServerClient } from "@/lib/supabase";
import { successResponse, errorResponse, getOrgId, parseBody, isValidUUID } from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/pricing/vehicles/[id]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid vehicle ID", 400);
    }

    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("pricing_vehicles")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Vehicle not found", 404);
      }
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Vehicle GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PUT /api/pricing/vehicles/[id]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid vehicle ID", 400);
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
      "year", "make", "model", "trim", "color", "vin", "license_plate",
      "status", "assigned_driver_id", "purchase_date", "purchase_price",
      "loan_balance", "monthly_payment", "loan_interest_rate", "loan_term_months",
      "market_value", "insurance_monthly", "fuel_monthly", "maintenance_monthly",
      "registration_annual", "odometer_current", "odometer_at_purchase",
      "fuel_type", "mpg_average", "servicetitan_equipment_id", "notes"
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from("pricing_vehicles")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Vehicle not found", 404);
      }
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Vehicle PUT error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PATCH /api/pricing/vehicles/[id] - Update vehicle (alias for PUT)
export async function PATCH(request: Request, { params }: RouteParams) {
  return PUT(request, { params });
}

// DELETE /api/pricing/vehicles/[id]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid vehicle ID", 400);
    }

    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("pricing_vehicles")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) {
      return errorResponse(error.message, 500);
    }

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Vehicle DELETE error:", error);
    return errorResponse("Internal server error", 500);
  }
}
