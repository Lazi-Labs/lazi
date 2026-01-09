import { createServerClient } from "@/lib/supabase";
import { successResponse, errorResponse, getOrgId, parseBody } from "@/lib/api-helpers";

// GET /api/pricing/expenses - List all expense categories with items
export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const supabase = createServerClient();

    // Fetch categories and items separately, then combine
    const [categoriesResult, itemsResult] = await Promise.all([
      supabase
        .from("pricing_expense_categories")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("pricing_expense_items")
        .select("*")
        .eq("is_active", true)
    ]);

    if (categoriesResult.error) {
      console.error("Error fetching expense categories:", categoriesResult.error);
      return errorResponse(categoriesResult.error.message, 500);
    }

    const categories = categoriesResult.data || [];
    const items = itemsResult.data || [];

    // Combine categories with their items and calculate totals
    const categoriesWithTotals = categories.map((category) => {
      const categoryItems = items.filter((item: { category_id: string }) => item.category_id === category.id);
      const monthlyTotal = categoryItems.reduce((sum: number, item: { calculated_monthly_amount: number | null }) =>
        sum + (item.calculated_monthly_amount || 0), 0);
      return { ...category, items: categoryItems, calculated_monthly_total: monthlyTotal };
    });

    return successResponse(categoriesWithTotals);
  } catch (error) {
    console.error("Expenses GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/pricing/expenses - Create expense category or item
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

    const supabase = createServerClient();

    // If category_id is provided, create an expense item
    if (body.category_id) {
      if (!body.name) {
        return errorResponse("name is required for expense item", 400);
      }

      const { data, error } = await supabase
        .from("pricing_expense_items")
        .insert({
          organization_id: orgId,
          category_id: body.category_id,
          name: body.name,
          description: body.description,
          vendor: body.vendor,
          amount: body.amount || 0,
          frequency: body.frequency || "monthly",
          account_number: body.account_number,
          is_tax_deductible: body.is_tax_deductible ?? true,
          tax_category: body.tax_category,
          sort_order: body.sort_order || 0,
          effective_date: body.effective_date,
          end_date: body.end_date,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating expense item:", error);
        return errorResponse(error.message, 500);
      }

      return successResponse(data, 201);
    }

    // Otherwise, create a category
    if (!body.name) {
      return errorResponse("name is required for expense category", 400);
    }

    const { data, error } = await supabase
      .from("pricing_expense_categories")
      .insert({
        organization_id: orgId,
        name: body.name,
        description: body.description,
        icon: body.icon || "Receipt",
        color: body.color || "slate",
        is_payroll: body.is_payroll || false,
        is_fleet: body.is_fleet || false,
        sort_order: body.sort_order || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating expense category:", error);
      return errorResponse(error.message, 500);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error("Expenses POST error:", error);
    return errorResponse("Internal server error", 500);
  }
}
