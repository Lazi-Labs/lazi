import { createServerClient } from "@/lib/supabase";
import { successResponse, errorResponse, getOrgId, parseBody, isValidUUID } from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/pricing/expenses/[id] - Get category or item
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid expense ID", 400);
    }

    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "category";

    const supabase = createServerClient();

    if (type === "item") {
      const { data, error } = await supabase
        .from("pricing_expense_items")
        .select("*")
        .eq("id", id)
        .eq("organization_id", orgId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return errorResponse("Expense item not found", 404);
        }
        return errorResponse(error.message, 500);
      }

      return successResponse(data);
    }

    // Default: get category with items
    const { data, error } = await supabase
      .from("pricing_expense_categories")
      .select(`
        *,
        items:expense_items(*)
      `)
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Expense category not found", 404);
      }
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Expense GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PUT /api/pricing/expenses/[id] - Update category or item
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid expense ID", 400);
    }

    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const body = await parseBody<Record<string, unknown>>(request);
    if (!body) {
      return errorResponse("Invalid request body", 400);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "category";

    const supabase = createServerClient();

    if (type === "item") {
      const updateData: Record<string, unknown> = {};
      const allowedFields = [
        "name", "description", "vendor", "amount", "frequency",
        "account_number", "is_tax_deductible", "tax_category",
        "sort_order", "is_active", "effective_date", "end_date"
      ];

      for (const field of allowedFields) {
        if (field in body) {
          updateData[field] = body[field];
        }
      }

      const { data, error } = await supabase
        .from("pricing_expense_items")
        .update(updateData)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return errorResponse("Expense item not found", 404);
        }
        return errorResponse(error.message, 500);
      }

      return successResponse(data);
    }

    // Update category
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name", "description", "icon", "color", "sort_order", "is_collapsed", "is_active"
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from("pricing_expense_categories")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Expense category not found", 404);
      }
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Expense PUT error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/pricing/expenses/[id] - Delete category or item
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid expense ID", 400);
    }

    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "category";

    const supabase = createServerClient();

    if (type === "item") {
      const { error } = await supabase
        .from("pricing_expense_items")
        .delete()
        .eq("id", id)
        .eq("organization_id", orgId);

      if (error) {
        return errorResponse(error.message, 500);
      }

      return successResponse({ deleted: true });
    }

    // Delete category (will cascade delete items)
    const { error } = await supabase
      .from("pricing_expense_categories")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) {
      return errorResponse(error.message, 500);
    }

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Expense DELETE error:", error);
    return errorResponse("Internal server error", 500);
  }
}
