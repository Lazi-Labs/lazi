import { createServerClient } from "../../lib/supabase";
import { successResponse, errorResponse, getOrgId, parseBody } from "../../lib/api-helpers";

// GET /pricebook/pricing/api/vehicles - List all vehicles
export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) {
      return errorResponse("Organization not found", 404);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const supabase = createServerClient();
    let query = supabase
      .from("pricing_vehicles")
      .select("*")
      .eq("organization_id", orgId)
      .order("year", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    } else if (!includeInactive) {
      query = query.in("status", ["active", "reserve", "maintenance"]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching vehicles:", error);
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Vehicles GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /pricebook/pricing/api/vehicles - Create new vehicle
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

    const { data, error } = await supabase
      .from("pricing_vehicles")
      .insert({
        organization_id: orgId,
        year: body.year,
        make: body.make,
        model: body.model,
        trim: body.trim,
        color: body.color,
        vin: body.vin,
        license_plate: body.license_plate,
        status: body.status || "reserve",
        assigned_driver_id: body.assigned_driver_id,
        purchase_date: body.purchase_date,
        purchase_price: body.purchase_price,
        loan_balance: body.loan_balance || 0,
        monthly_payment: body.monthly_payment || 0,
        loan_interest_rate: body.loan_interest_rate,
        loan_term_months: body.loan_term_months,
        market_value: body.market_value || 0,
        insurance_monthly: body.insurance_monthly || 0,
        fuel_monthly: body.fuel_monthly || 0,
        maintenance_monthly: body.maintenance_monthly || 0,
        registration_annual: body.registration_annual || 0,
        odometer_current: body.odometer_current,
        odometer_at_purchase: body.odometer_at_purchase,
        fuel_type: body.fuel_type || "gasoline",
        mpg_average: body.mpg_average,
        servicetitan_equipment_id: body.servicetitan_equipment_id,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating vehicle:", error);
      return errorResponse(error.message, 500);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error("Vehicles POST error:", error);
    return errorResponse("Internal server error", 500);
  }
}
