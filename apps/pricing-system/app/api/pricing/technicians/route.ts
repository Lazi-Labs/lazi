import { createServerClient } from "@/lib/supabase";
import { successResponse, errorResponse, getOrgId, parseBody } from "@/lib/api-helpers";

// GET /api/pricing/technicians - List all technicians
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
      .from("pricing_technicians")
      .select("*")
      .eq("organization_id", orgId)
      .order("display_name");

    if (status) {
      query = query.eq("status", status);
    } else if (!includeInactive) {
      query = query.eq("status", "active");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching technicians:", error);
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Technicians GET error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/pricing/technicians - Create a new technician
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

    // Validate required fields
    if (!body.first_name || !body.last_name) {
      return errorResponse("first_name and last_name are required", 400);
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("pricing_technicians")
      .insert({
        organization_id: orgId,
        first_name: body.first_name,
        last_name: body.last_name,
        role: body.role || "Technician",
        status: body.status || "active",
        email: body.email,
        phone: body.phone,
        employee_number: body.employee_number,
        hire_date: body.hire_date,
        department: body.department,
        pay_type: body.pay_type || "hourly",
        base_pay_rate: body.base_pay_rate,
        annual_salary: body.annual_salary,
        paid_hours_per_day: body.paid_hours_per_day || 8,
        payroll_tax_rate: body.payroll_tax_rate,
        futa_rate: body.futa_rate,
        suta_rate: body.suta_rate,
        workers_comp_rate: body.workers_comp_rate,
        health_insurance_monthly: body.health_insurance_monthly || 0,
        dental_insurance_monthly: body.dental_insurance_monthly || 0,
        vision_insurance_monthly: body.vision_insurance_monthly || 0,
        life_insurance_monthly: body.life_insurance_monthly || 0,
        retirement_401k_match_percent: body.retirement_401k_match_percent || 0,
        hsa_contribution_monthly: body.hsa_contribution_monthly || 0,
        other_benefits_monthly: body.other_benefits_monthly || 0,
        assigned_vehicle_id: body.assigned_vehicle_id,
        servicetitan_employee_id: body.servicetitan_employee_id,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating technician:", error);
      return errorResponse(error.message, 500);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error("Technicians POST error:", error);
    return errorResponse("Internal server error", 500);
  }
}
