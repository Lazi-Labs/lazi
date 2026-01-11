-- Fix views to exclude generated columns
-- Run this in Supabase SQL Editor

-- Drop existing views and triggers
DROP VIEW IF EXISTS public.pricing_vehicles CASCADE;
DROP VIEW IF EXISTS public.pricing_technicians CASCADE;
DROP VIEW IF EXISTS public.pricing_office_staff CASCADE;
DROP VIEW IF EXISTS public.pricing_expense_categories CASCADE;
DROP VIEW IF EXISTS public.pricing_expense_items CASCADE;
DROP VIEW IF EXISTS public.pricing_organizations CASCADE;
DROP VIEW IF EXISTS public.pricing_job_types CASCADE;
DROP VIEW IF EXISTS public.pricing_markup_tiers CASCADE;
DROP VIEW IF EXISTS public.pricing_scenarios CASCADE;
DROP VIEW IF EXISTS public.pricing_technician_unproductive_time CASCADE;
DROP VIEW IF EXISTS public.pricing_unproductive_time_categories CASCADE;
DROP VIEW IF EXISTS public.pricing_users CASCADE;

-- Recreate views WITHOUT generated columns

-- ORGANIZATIONS (no generated columns)
CREATE OR REPLACE VIEW public.pricing_organizations AS
SELECT * FROM pricing.organizations;

-- TECHNICIANS (exclude is_active)
CREATE OR REPLACE VIEW public.pricing_technicians AS
SELECT
    id, organization_id, employee_number, first_name, last_name, display_name, role, status,
    email, phone, emergency_contact_name, emergency_contact_phone,
    hire_date, termination_date, department,
    pay_type, base_pay_rate, annual_salary, overtime_multiplier, paid_hours_per_day,
    payroll_tax_rate, futa_rate, suta_rate, workers_comp_rate,
    health_insurance_monthly, dental_insurance_monthly, vision_insurance_monthly, life_insurance_monthly,
    retirement_401k_match_percent, hsa_contribution_monthly, other_benefits_monthly,
    assigned_vehicle_id, servicetitan_employee_id,
    calculated_annual_base_pay, calculated_total_burden_annual, calculated_burden_percent,
    calculated_billable_hours_per_year, calculated_true_cost_per_hour, calculated_efficiency_percent,
    notes, created_at, updated_at, created_by, updated_by
FROM pricing.technicians;

-- VEHICLES (exclude is_active)
CREATE OR REPLACE VIEW public.pricing_vehicles AS
SELECT
    id, organization_id, year, make, model, trim, color, vin, license_plate,
    status, assigned_driver_id,
    purchase_date, purchase_price, loan_balance, monthly_payment, loan_interest_rate, loan_term_months, market_value,
    insurance_monthly, fuel_monthly, maintenance_monthly, registration_annual,
    odometer_current, odometer_at_purchase, fuel_type, mpg_average,
    servicetitan_equipment_id,
    calculated_equity, calculated_total_monthly_cost,
    notes, created_at, updated_at, created_by, updated_by
FROM pricing.vehicles;

-- OFFICE_STAFF (exclude is_active)
CREATE OR REPLACE VIEW public.pricing_office_staff AS
SELECT
    id, organization_id, employee_number, first_name, last_name, display_name, role, status,
    email, phone, hire_date, termination_date, department,
    pay_type, base_pay_rate, annual_salary, hours_per_week,
    payroll_tax_rate, futa_rate, suta_rate, workers_comp_rate,
    health_insurance_monthly, dental_insurance_monthly, vision_insurance_monthly, life_insurance_monthly,
    retirement_401k_match_percent, hsa_contribution_monthly, other_benefits_monthly,
    calculated_annual_base_pay, calculated_total_burden_annual, calculated_burden_percent, calculated_monthly_cost,
    notes, created_at, updated_at, created_by, updated_by
FROM pricing.office_staff;

-- EXPENSE_CATEGORIES (no generated columns)
CREATE OR REPLACE VIEW public.pricing_expense_categories AS
SELECT * FROM pricing.expense_categories;

-- EXPENSE_ITEMS (no generated columns)
CREATE OR REPLACE VIEW public.pricing_expense_items AS
SELECT * FROM pricing.expense_items;

-- JOB_TYPES (no generated columns)
CREATE OR REPLACE VIEW public.pricing_job_types AS
SELECT * FROM pricing.job_types;

-- MARKUP_TIERS (no generated columns)
CREATE OR REPLACE VIEW public.pricing_markup_tiers AS
SELECT * FROM pricing.markup_tiers;

-- SCENARIOS (no generated columns)
CREATE OR REPLACE VIEW public.pricing_scenarios AS
SELECT * FROM pricing.scenarios;

-- UNPRODUCTIVE_TIME_CATEGORIES (no generated columns)
CREATE OR REPLACE VIEW public.pricing_unproductive_time_categories AS
SELECT * FROM pricing.unproductive_time_categories;

-- TECHNICIAN_UNPRODUCTIVE_TIME (add activity_name alias for name if needed)
CREATE OR REPLACE VIEW public.pricing_technician_unproductive_time AS
SELECT
    id, technician_id, category_id,
    name as activity_name,
    hours_per_day, is_paid, notes, sort_order,
    created_at, updated_at,
    -- Include name as well for compatibility
    name as description
FROM pricing.technician_unproductive_time;

-- USERS (no generated columns)
CREATE OR REPLACE VIEW public.pricing_users AS
SELECT * FROM pricing.users;

-- ============================================================================
-- INSTEAD OF triggers for INSERT/UPDATE/DELETE
-- ============================================================================

-- TECHNICIANS
CREATE OR REPLACE FUNCTION public.pricing_technicians_insert() RETURNS TRIGGER AS $$
DECLARE
    new_id uuid;
BEGIN
    INSERT INTO pricing.technicians (
        organization_id, employee_number, first_name, last_name, role, status,
        email, phone, emergency_contact_name, emergency_contact_phone,
        hire_date, termination_date, department,
        pay_type, base_pay_rate, annual_salary, overtime_multiplier, paid_hours_per_day,
        payroll_tax_rate, futa_rate, suta_rate, workers_comp_rate,
        health_insurance_monthly, dental_insurance_monthly, vision_insurance_monthly, life_insurance_monthly,
        retirement_401k_match_percent, hsa_contribution_monthly, other_benefits_monthly,
        assigned_vehicle_id, servicetitan_employee_id, notes, created_by, updated_by
    ) VALUES (
        NEW.organization_id, NEW.employee_number, NEW.first_name, NEW.last_name, NEW.role, COALESCE(NEW.status, 'active'),
        NEW.email, NEW.phone, NEW.emergency_contact_name, NEW.emergency_contact_phone,
        NEW.hire_date, NEW.termination_date, NEW.department,
        COALESCE(NEW.pay_type, 'hourly'), NEW.base_pay_rate, NEW.annual_salary, COALESCE(NEW.overtime_multiplier, 1.5), COALESCE(NEW.paid_hours_per_day, 8),
        NEW.payroll_tax_rate, NEW.futa_rate, NEW.suta_rate, NEW.workers_comp_rate,
        COALESCE(NEW.health_insurance_monthly, 0), COALESCE(NEW.dental_insurance_monthly, 0), COALESCE(NEW.vision_insurance_monthly, 0), COALESCE(NEW.life_insurance_monthly, 0),
        COALESCE(NEW.retirement_401k_match_percent, 0), COALESCE(NEW.hsa_contribution_monthly, 0), COALESCE(NEW.other_benefits_monthly, 0),
        NEW.assigned_vehicle_id, NEW.servicetitan_employee_id, NEW.notes, NEW.created_by, NEW.updated_by
    ) RETURNING id INTO new_id;

    -- Select back from view to get proper structure with computed columns
    SELECT * INTO NEW FROM public.pricing_technicians WHERE id = new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_technicians_insert_trigger ON public.pricing_technicians;
CREATE TRIGGER pricing_technicians_insert_trigger
    INSTEAD OF INSERT ON public.pricing_technicians
    FOR EACH ROW EXECUTE FUNCTION public.pricing_technicians_insert();

CREATE OR REPLACE FUNCTION public.pricing_technicians_update() RETURNS TRIGGER AS $$
BEGIN
    UPDATE pricing.technicians SET
        employee_number = NEW.employee_number,
        first_name = NEW.first_name,
        last_name = NEW.last_name,
        role = NEW.role,
        status = NEW.status,
        email = NEW.email,
        phone = NEW.phone,
        hire_date = NEW.hire_date,
        termination_date = NEW.termination_date,
        department = NEW.department,
        pay_type = NEW.pay_type,
        base_pay_rate = NEW.base_pay_rate,
        annual_salary = NEW.annual_salary,
        paid_hours_per_day = NEW.paid_hours_per_day,
        payroll_tax_rate = NEW.payroll_tax_rate,
        futa_rate = NEW.futa_rate,
        suta_rate = NEW.suta_rate,
        workers_comp_rate = NEW.workers_comp_rate,
        health_insurance_monthly = NEW.health_insurance_monthly,
        dental_insurance_monthly = NEW.dental_insurance_monthly,
        vision_insurance_monthly = NEW.vision_insurance_monthly,
        life_insurance_monthly = NEW.life_insurance_monthly,
        retirement_401k_match_percent = NEW.retirement_401k_match_percent,
        hsa_contribution_monthly = NEW.hsa_contribution_monthly,
        other_benefits_monthly = NEW.other_benefits_monthly,
        assigned_vehicle_id = NEW.assigned_vehicle_id,
        notes = NEW.notes,
        updated_by = NEW.updated_by
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_technicians_update_trigger ON public.pricing_technicians;
CREATE TRIGGER pricing_technicians_update_trigger
    INSTEAD OF UPDATE ON public.pricing_technicians
    FOR EACH ROW EXECUTE FUNCTION public.pricing_technicians_update();

CREATE OR REPLACE FUNCTION public.pricing_technicians_delete() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM pricing.technicians WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_technicians_delete_trigger ON public.pricing_technicians;
CREATE TRIGGER pricing_technicians_delete_trigger
    INSTEAD OF DELETE ON public.pricing_technicians
    FOR EACH ROW EXECUTE FUNCTION public.pricing_technicians_delete();

-- VEHICLES
CREATE OR REPLACE FUNCTION public.pricing_vehicles_insert() RETURNS TRIGGER AS $$
DECLARE
    new_id uuid;
BEGIN
    INSERT INTO pricing.vehicles (
        organization_id, year, make, model, trim, color, vin, license_plate,
        status, assigned_driver_id,
        purchase_date, purchase_price, loan_balance, monthly_payment, loan_interest_rate, loan_term_months, market_value,
        insurance_monthly, fuel_monthly, maintenance_monthly, registration_annual,
        odometer_current, odometer_at_purchase, fuel_type, mpg_average,
        servicetitan_equipment_id, notes, created_by, updated_by
    ) VALUES (
        NEW.organization_id, NEW.year, NEW.make, NEW.model, NEW.trim, NEW.color, NEW.vin, NEW.license_plate,
        COALESCE(NEW.status, 'reserve'), NEW.assigned_driver_id,
        NEW.purchase_date, NEW.purchase_price, COALESCE(NEW.loan_balance, 0), COALESCE(NEW.monthly_payment, 0), NEW.loan_interest_rate, NEW.loan_term_months, COALESCE(NEW.market_value, 0),
        COALESCE(NEW.insurance_monthly, 0), COALESCE(NEW.fuel_monthly, 0), COALESCE(NEW.maintenance_monthly, 0), COALESCE(NEW.registration_annual, 0),
        NEW.odometer_current, NEW.odometer_at_purchase, COALESCE(NEW.fuel_type, 'gasoline'), NEW.mpg_average,
        NEW.servicetitan_equipment_id, NEW.notes, NEW.created_by, NEW.updated_by
    ) RETURNING id INTO new_id;

    SELECT * INTO NEW FROM public.pricing_vehicles WHERE id = new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_vehicles_insert_trigger ON public.pricing_vehicles;
CREATE TRIGGER pricing_vehicles_insert_trigger
    INSTEAD OF INSERT ON public.pricing_vehicles
    FOR EACH ROW EXECUTE FUNCTION public.pricing_vehicles_insert();

CREATE OR REPLACE FUNCTION public.pricing_vehicles_update() RETURNS TRIGGER AS $$
BEGIN
    UPDATE pricing.vehicles SET
        year = NEW.year,
        make = NEW.make,
        model = NEW.model,
        trim = NEW.trim,
        color = NEW.color,
        vin = NEW.vin,
        license_plate = NEW.license_plate,
        status = NEW.status,
        assigned_driver_id = NEW.assigned_driver_id,
        purchase_date = NEW.purchase_date,
        purchase_price = NEW.purchase_price,
        loan_balance = NEW.loan_balance,
        monthly_payment = NEW.monthly_payment,
        loan_interest_rate = NEW.loan_interest_rate,
        loan_term_months = NEW.loan_term_months,
        market_value = NEW.market_value,
        insurance_monthly = NEW.insurance_monthly,
        fuel_monthly = NEW.fuel_monthly,
        maintenance_monthly = NEW.maintenance_monthly,
        registration_annual = NEW.registration_annual,
        odometer_current = NEW.odometer_current,
        odometer_at_purchase = NEW.odometer_at_purchase,
        fuel_type = NEW.fuel_type,
        mpg_average = NEW.mpg_average,
        notes = NEW.notes,
        updated_by = NEW.updated_by
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_vehicles_update_trigger ON public.pricing_vehicles;
CREATE TRIGGER pricing_vehicles_update_trigger
    INSTEAD OF UPDATE ON public.pricing_vehicles
    FOR EACH ROW EXECUTE FUNCTION public.pricing_vehicles_update();

CREATE OR REPLACE FUNCTION public.pricing_vehicles_delete() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM pricing.vehicles WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_vehicles_delete_trigger ON public.pricing_vehicles;
CREATE TRIGGER pricing_vehicles_delete_trigger
    INSTEAD OF DELETE ON public.pricing_vehicles
    FOR EACH ROW EXECUTE FUNCTION public.pricing_vehicles_delete();

-- OFFICE_STAFF
CREATE OR REPLACE FUNCTION public.pricing_office_staff_insert() RETURNS TRIGGER AS $$
DECLARE
    new_id uuid;
BEGIN
    INSERT INTO pricing.office_staff (
        organization_id, employee_number, first_name, last_name, role, status,
        email, phone, hire_date, termination_date, department,
        pay_type, base_pay_rate, annual_salary, hours_per_week,
        payroll_tax_rate, futa_rate, suta_rate, workers_comp_rate,
        health_insurance_monthly, dental_insurance_monthly, vision_insurance_monthly, life_insurance_monthly,
        retirement_401k_match_percent, hsa_contribution_monthly, other_benefits_monthly,
        notes, created_by, updated_by
    ) VALUES (
        NEW.organization_id, NEW.employee_number, NEW.first_name, NEW.last_name, NEW.role, COALESCE(NEW.status, 'active'),
        NEW.email, NEW.phone, NEW.hire_date, NEW.termination_date, NEW.department,
        COALESCE(NEW.pay_type, 'hourly'), NEW.base_pay_rate, NEW.annual_salary, COALESCE(NEW.hours_per_week, 40),
        NEW.payroll_tax_rate, NEW.futa_rate, NEW.suta_rate, NEW.workers_comp_rate,
        COALESCE(NEW.health_insurance_monthly, 0), COALESCE(NEW.dental_insurance_monthly, 0), COALESCE(NEW.vision_insurance_monthly, 0), COALESCE(NEW.life_insurance_monthly, 0),
        COALESCE(NEW.retirement_401k_match_percent, 0), COALESCE(NEW.hsa_contribution_monthly, 0), COALESCE(NEW.other_benefits_monthly, 0),
        NEW.notes, NEW.created_by, NEW.updated_by
    ) RETURNING id INTO new_id;

    SELECT * INTO NEW FROM public.pricing_office_staff WHERE id = new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_office_staff_insert_trigger ON public.pricing_office_staff;
CREATE TRIGGER pricing_office_staff_insert_trigger
    INSTEAD OF INSERT ON public.pricing_office_staff
    FOR EACH ROW EXECUTE FUNCTION public.pricing_office_staff_insert();

CREATE OR REPLACE FUNCTION public.pricing_office_staff_update() RETURNS TRIGGER AS $$
BEGIN
    UPDATE pricing.office_staff SET
        employee_number = NEW.employee_number,
        first_name = NEW.first_name,
        last_name = NEW.last_name,
        role = NEW.role,
        status = NEW.status,
        email = NEW.email,
        phone = NEW.phone,
        hire_date = NEW.hire_date,
        termination_date = NEW.termination_date,
        department = NEW.department,
        pay_type = NEW.pay_type,
        base_pay_rate = NEW.base_pay_rate,
        annual_salary = NEW.annual_salary,
        hours_per_week = NEW.hours_per_week,
        payroll_tax_rate = NEW.payroll_tax_rate,
        futa_rate = NEW.futa_rate,
        suta_rate = NEW.suta_rate,
        workers_comp_rate = NEW.workers_comp_rate,
        health_insurance_monthly = NEW.health_insurance_monthly,
        dental_insurance_monthly = NEW.dental_insurance_monthly,
        vision_insurance_monthly = NEW.vision_insurance_monthly,
        life_insurance_monthly = NEW.life_insurance_monthly,
        retirement_401k_match_percent = NEW.retirement_401k_match_percent,
        hsa_contribution_monthly = NEW.hsa_contribution_monthly,
        other_benefits_monthly = NEW.other_benefits_monthly,
        notes = NEW.notes,
        updated_by = NEW.updated_by
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_office_staff_update_trigger ON public.pricing_office_staff;
CREATE TRIGGER pricing_office_staff_update_trigger
    INSTEAD OF UPDATE ON public.pricing_office_staff
    FOR EACH ROW EXECUTE FUNCTION public.pricing_office_staff_update();

CREATE OR REPLACE FUNCTION public.pricing_office_staff_delete() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM pricing.office_staff WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_office_staff_delete_trigger ON public.pricing_office_staff;
CREATE TRIGGER pricing_office_staff_delete_trigger
    INSTEAD OF DELETE ON public.pricing_office_staff
    FOR EACH ROW EXECUTE FUNCTION public.pricing_office_staff_delete();

-- EXPENSE_CATEGORIES
CREATE OR REPLACE FUNCTION public.pricing_expense_categories_insert() RETURNS TRIGGER AS $$
DECLARE
    new_id uuid;
BEGIN
    INSERT INTO pricing.expense_categories (
        organization_id, name, description, icon, color, is_payroll, is_fleet, is_system, sort_order, is_collapsed, is_active
    ) VALUES (
        NEW.organization_id, NEW.name, NEW.description, COALESCE(NEW.icon, 'Receipt'), COALESCE(NEW.color, 'slate'),
        COALESCE(NEW.is_payroll, false), COALESCE(NEW.is_fleet, false), COALESCE(NEW.is_system, false),
        COALESCE(NEW.sort_order, 0), COALESCE(NEW.is_collapsed, true), COALESCE(NEW.is_active, true)
    ) RETURNING id INTO new_id;

    SELECT * INTO NEW FROM public.pricing_expense_categories WHERE id = new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_expense_categories_insert_trigger ON public.pricing_expense_categories;
CREATE TRIGGER pricing_expense_categories_insert_trigger
    INSTEAD OF INSERT ON public.pricing_expense_categories
    FOR EACH ROW EXECUTE FUNCTION public.pricing_expense_categories_insert();

CREATE OR REPLACE FUNCTION public.pricing_expense_categories_update() RETURNS TRIGGER AS $$
BEGIN
    UPDATE pricing.expense_categories SET
        name = NEW.name,
        description = NEW.description,
        icon = NEW.icon,
        color = NEW.color,
        is_payroll = NEW.is_payroll,
        is_fleet = NEW.is_fleet,
        sort_order = NEW.sort_order,
        is_collapsed = NEW.is_collapsed,
        is_active = NEW.is_active
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_expense_categories_update_trigger ON public.pricing_expense_categories;
CREATE TRIGGER pricing_expense_categories_update_trigger
    INSTEAD OF UPDATE ON public.pricing_expense_categories
    FOR EACH ROW EXECUTE FUNCTION public.pricing_expense_categories_update();

CREATE OR REPLACE FUNCTION public.pricing_expense_categories_delete() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM pricing.expense_categories WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_expense_categories_delete_trigger ON public.pricing_expense_categories;
CREATE TRIGGER pricing_expense_categories_delete_trigger
    INSTEAD OF DELETE ON public.pricing_expense_categories
    FOR EACH ROW EXECUTE FUNCTION public.pricing_expense_categories_delete();

-- EXPENSE_ITEMS
CREATE OR REPLACE FUNCTION public.pricing_expense_items_insert() RETURNS TRIGGER AS $$
DECLARE
    new_id uuid;
BEGIN
    INSERT INTO pricing.expense_items (
        organization_id, category_id, name, description, vendor, amount, frequency,
        account_number, is_tax_deductible, tax_category, sort_order, is_active, effective_date, end_date, created_by
    ) VALUES (
        NEW.organization_id, NEW.category_id, NEW.name, NEW.description, NEW.vendor,
        COALESCE(NEW.amount, 0), COALESCE(NEW.frequency, 'monthly'),
        NEW.account_number, COALESCE(NEW.is_tax_deductible, true), NEW.tax_category,
        COALESCE(NEW.sort_order, 0), COALESCE(NEW.is_active, true), NEW.effective_date, NEW.end_date, NEW.created_by
    ) RETURNING id INTO new_id;

    SELECT * INTO NEW FROM public.pricing_expense_items WHERE id = new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_expense_items_insert_trigger ON public.pricing_expense_items;
CREATE TRIGGER pricing_expense_items_insert_trigger
    INSTEAD OF INSERT ON public.pricing_expense_items
    FOR EACH ROW EXECUTE FUNCTION public.pricing_expense_items_insert();

CREATE OR REPLACE FUNCTION public.pricing_expense_items_update() RETURNS TRIGGER AS $$
BEGIN
    UPDATE pricing.expense_items SET
        category_id = NEW.category_id,
        name = NEW.name,
        description = NEW.description,
        vendor = NEW.vendor,
        amount = NEW.amount,
        frequency = NEW.frequency,
        account_number = NEW.account_number,
        is_tax_deductible = NEW.is_tax_deductible,
        tax_category = NEW.tax_category,
        sort_order = NEW.sort_order,
        is_active = NEW.is_active,
        effective_date = NEW.effective_date,
        end_date = NEW.end_date
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_expense_items_update_trigger ON public.pricing_expense_items;
CREATE TRIGGER pricing_expense_items_update_trigger
    INSTEAD OF UPDATE ON public.pricing_expense_items
    FOR EACH ROW EXECUTE FUNCTION public.pricing_expense_items_update();

CREATE OR REPLACE FUNCTION public.pricing_expense_items_delete() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM pricing.expense_items WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_expense_items_delete_trigger ON public.pricing_expense_items;
CREATE TRIGGER pricing_expense_items_delete_trigger
    INSTEAD OF DELETE ON public.pricing_expense_items
    FOR EACH ROW EXECUTE FUNCTION public.pricing_expense_items_delete();

-- TECHNICIAN_UNPRODUCTIVE_TIME
CREATE OR REPLACE FUNCTION public.pricing_technician_unproductive_time_insert() RETURNS TRIGGER AS $$
DECLARE
    new_id uuid;
BEGIN
    INSERT INTO pricing.technician_unproductive_time (
        technician_id, category_id, name, hours_per_day, is_paid, notes, sort_order
    ) VALUES (
        NEW.technician_id, NEW.category_id, COALESCE(NEW.activity_name, NEW.description),
        COALESCE(NEW.hours_per_day, 0), COALESCE(NEW.is_paid, true), NEW.notes, COALESCE(NEW.sort_order, 0)
    ) RETURNING id INTO new_id;

    SELECT * INTO NEW FROM public.pricing_technician_unproductive_time WHERE id = new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_technician_unproductive_time_insert_trigger ON public.pricing_technician_unproductive_time;
CREATE TRIGGER pricing_technician_unproductive_time_insert_trigger
    INSTEAD OF INSERT ON public.pricing_technician_unproductive_time
    FOR EACH ROW EXECUTE FUNCTION public.pricing_technician_unproductive_time_insert();

CREATE OR REPLACE FUNCTION public.pricing_technician_unproductive_time_update() RETURNS TRIGGER AS $$
BEGIN
    UPDATE pricing.technician_unproductive_time SET
        category_id = NEW.category_id,
        name = COALESCE(NEW.activity_name, NEW.description),
        hours_per_day = NEW.hours_per_day,
        is_paid = NEW.is_paid,
        notes = NEW.notes,
        sort_order = NEW.sort_order
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_technician_unproductive_time_update_trigger ON public.pricing_technician_unproductive_time;
CREATE TRIGGER pricing_technician_unproductive_time_update_trigger
    INSTEAD OF UPDATE ON public.pricing_technician_unproductive_time
    FOR EACH ROW EXECUTE FUNCTION public.pricing_technician_unproductive_time_update();

CREATE OR REPLACE FUNCTION public.pricing_technician_unproductive_time_delete() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM pricing.technician_unproductive_time WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_technician_unproductive_time_delete_trigger ON public.pricing_technician_unproductive_time;
CREATE TRIGGER pricing_technician_unproductive_time_delete_trigger
    INSTEAD OF DELETE ON public.pricing_technician_unproductive_time
    FOR EACH ROW EXECUTE FUNCTION public.pricing_technician_unproductive_time_delete();

-- Grant permissions on views
GRANT ALL ON public.pricing_organizations TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_technicians TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_vehicles TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_office_staff TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_expense_categories TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_expense_items TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_job_types TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_markup_tiers TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_scenarios TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_unproductive_time_categories TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_technician_unproductive_time TO anon, authenticated, service_role;
GRANT ALL ON public.pricing_users TO anon, authenticated, service_role;
