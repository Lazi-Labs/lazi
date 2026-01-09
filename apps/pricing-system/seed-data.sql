-- ============================================================================
-- PRICING SYSTEM SEED DATA
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Organization ID (already exists)
-- e72a57c0-00d6-441e-808d-99c8d52aa79e

-- ============================================================================
-- VEHICLES (8 total)
-- ============================================================================

-- Vehicle 1 - 2024 Ford T250 KB27688 (Active)
INSERT INTO pricing.vehicles (id, organization_id, year, make, model, vin, status, loan_balance, monthly_payment, market_value, insurance_monthly, fuel_monthly, maintenance_monthly)
VALUES (
  'a1000000-0000-0000-0000-000000000001'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  2024, 'Ford', 'Transit 250', '1FTBW2CG3PK*27688', 'active',
  71048, 1527.70, 38500, 200, 550, 75
);

-- Vehicle 2 - 2024 Ford T250 KA00562 (Active)
INSERT INTO pricing.vehicles (id, organization_id, year, make, model, vin, status, loan_balance, monthly_payment, market_value, insurance_monthly, fuel_monthly, maintenance_monthly)
VALUES (
  'a1000000-0000-0000-0000-000000000002'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  2024, 'Ford', 'Transit 250', '1FTBW2CG5PK*00562', 'active',
  66699, 1549.67, 38500, 200, 550, 75
);

-- Vehicle 3 - 2024 Ford T250 KB27552 (Active)
INSERT INTO pricing.vehicles (id, organization_id, year, make, model, vin, status, loan_balance, monthly_payment, market_value, insurance_monthly, fuel_monthly, maintenance_monthly)
VALUES (
  'a1000000-0000-0000-0000-000000000003'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  2024, 'Ford', 'Transit 250', '1FTBW2CG7PK*27552', 'active',
  67533, 1508.83, 38500, 200, 550, 75
);

-- Vehicle 4 - 2023 Ford T250 KB49980 (Reserve)
INSERT INTO pricing.vehicles (id, organization_id, year, make, model, vin, status, loan_balance, monthly_payment, market_value, insurance_monthly, fuel_monthly, maintenance_monthly)
VALUES (
  'a1000000-0000-0000-0000-000000000004'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  2023, 'Ford', 'Transit 250', '1FTBW2CG8NK*49980', 'reserve',
  49715, 1338.71, 34000, 180, 0, 50
);

-- Vehicle 5 - 2024 Ford T250 KB53953 (Active - Helper)
INSERT INTO pricing.vehicles (id, organization_id, year, make, model, vin, status, loan_balance, monthly_payment, market_value, insurance_monthly, fuel_monthly, maintenance_monthly)
VALUES (
  'a1000000-0000-0000-0000-000000000005'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  2024, 'Ford', 'Transit 250', '1FTBW2CG0PK*53953', 'active',
  70655, 1580.00, 36000, 200, 500, 75
);

-- Vehicle 6 - 2023 Ford F250 EC20408 (Active)
INSERT INTO pricing.vehicles (id, organization_id, year, make, model, vin, status, loan_balance, monthly_payment, market_value, insurance_monthly, fuel_monthly, maintenance_monthly)
VALUES (
  'a1000000-0000-0000-0000-000000000006'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  2023, 'Ford', 'F-250', '1FT7W2BT6PE*20408', 'active',
  60527, 1863.45, 0, 220, 600, 100
);

-- Vehicle 7 - 2018 Ford T250 KA64488 (Maintenance)
INSERT INTO pricing.vehicles (id, organization_id, year, make, model, vin, status, loan_balance, monthly_payment, market_value, insurance_monthly, fuel_monthly, maintenance_monthly)
VALUES (
  'a1000000-0000-0000-0000-000000000007'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  2018, 'Ford', 'Transit 250', '1FTYR2CG6JK*64488', 'maintenance',
  18188, 552.70, 12850, 150, 0, 200
);

-- Vehicle 8 - 2019 Ford T250 KA32101 (Reserve - paid off)
INSERT INTO pricing.vehicles (id, organization_id, year, make, model, vin, status, loan_balance, monthly_payment, market_value, insurance_monthly, fuel_monthly, maintenance_monthly)
VALUES (
  'a1000000-0000-0000-0000-000000000008'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  2019, 'Ford', 'Transit 250', '1FTYR2CG3KK*32101', 'reserve',
  0, 0, 18500, 160, 0, 50
);

-- ============================================================================
-- TECHNICIANS (4 total)
-- ============================================================================

-- Mike Johnson - Lead Tech, $35/hr, Vehicle 1
INSERT INTO pricing.technicians (id, organization_id, first_name, last_name, role, status, pay_type, base_pay_rate, paid_hours_per_day, payroll_tax_rate, futa_rate, suta_rate, workers_comp_rate, health_insurance_monthly, retirement_401k_match_percent, assigned_vehicle_id)
VALUES (
  'b1000000-0000-0000-0000-000000000001'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'Mike', 'Johnson', 'Lead Technician', 'active', 'hourly',
  35, 8, 7.65, 0.6, 2.7, 8.5, 450, 3,
  'a1000000-0000-0000-0000-000000000001'::uuid
);

-- David Rodriguez - Lead Tech, $35/hr, Vehicle 2
INSERT INTO pricing.technicians (id, organization_id, first_name, last_name, role, status, pay_type, base_pay_rate, paid_hours_per_day, payroll_tax_rate, futa_rate, suta_rate, workers_comp_rate, health_insurance_monthly, retirement_401k_match_percent, assigned_vehicle_id)
VALUES (
  'b1000000-0000-0000-0000-000000000002'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'David', 'Rodriguez', 'Lead Technician', 'active', 'hourly',
  35, 8, 7.65, 0.6, 2.7, 8.5, 450, 3,
  'a1000000-0000-0000-0000-000000000002'::uuid
);

-- Chris Thompson - Lead Tech, $32/hr, Vehicle 3
INSERT INTO pricing.technicians (id, organization_id, first_name, last_name, role, status, pay_type, base_pay_rate, paid_hours_per_day, payroll_tax_rate, futa_rate, suta_rate, workers_comp_rate, health_insurance_monthly, retirement_401k_match_percent, assigned_vehicle_id)
VALUES (
  'b1000000-0000-0000-0000-000000000003'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'Chris', 'Thompson', 'Lead Technician', 'active', 'hourly',
  32, 8, 7.65, 0.6, 2.7, 8.5, 450, 3,
  'a1000000-0000-0000-0000-000000000003'::uuid
);

-- Alex Martinez - Helper, $22/hr, Vehicle 5
INSERT INTO pricing.technicians (id, organization_id, first_name, last_name, role, status, pay_type, base_pay_rate, paid_hours_per_day, payroll_tax_rate, futa_rate, suta_rate, workers_comp_rate, health_insurance_monthly, retirement_401k_match_percent, assigned_vehicle_id)
VALUES (
  'b1000000-0000-0000-0000-000000000004'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'Alex', 'Martinez', 'Helper', 'active', 'hourly',
  22, 8, 7.65, 0.6, 2.7, 8.5, 300, 3,
  'a1000000-0000-0000-0000-000000000005'::uuid
);

-- ============================================================================
-- TECHNICIAN UNPRODUCTIVE TIME
-- ============================================================================

-- Mike Johnson unproductive time
INSERT INTO pricing.technician_unproductive_time (technician_id, name, hours_per_day, is_paid) VALUES
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'Morning Meeting', 0.5, true),
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'Drive Time', 1.5, true),
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'Lunch Break', 0.5, false),
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'Paperwork', 0.5, true);

-- David Rodriguez unproductive time
INSERT INTO pricing.technician_unproductive_time (technician_id, name, hours_per_day, is_paid) VALUES
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'Morning Meeting', 0.5, true),
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'Drive Time', 1.5, true),
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'Lunch Break', 0.5, false),
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'Paperwork', 0.5, true);

-- Chris Thompson unproductive time
INSERT INTO pricing.technician_unproductive_time (technician_id, name, hours_per_day, is_paid) VALUES
  ('b1000000-0000-0000-0000-000000000003'::uuid, 'Morning Meeting', 0.5, true),
  ('b1000000-0000-0000-0000-000000000003'::uuid, 'Drive Time', 1.5, true),
  ('b1000000-0000-0000-0000-000000000003'::uuid, 'Lunch Break', 0.5, false),
  ('b1000000-0000-0000-0000-000000000003'::uuid, 'Paperwork', 0.5, true);

-- Alex Martinez unproductive time
INSERT INTO pricing.technician_unproductive_time (technician_id, name, hours_per_day, is_paid) VALUES
  ('b1000000-0000-0000-0000-000000000004'::uuid, 'Morning Meeting', 0.5, true),
  ('b1000000-0000-0000-0000-000000000004'::uuid, 'Drive Time', 1.5, true),
  ('b1000000-0000-0000-0000-000000000004'::uuid, 'Lunch Break', 0.5, false),
  ('b1000000-0000-0000-0000-000000000004'::uuid, 'Paperwork', 0.5, true);

-- ============================================================================
-- OFFICE STAFF (3 total)
-- ============================================================================

-- Sarah Wilson - Office Manager, $55k salary
INSERT INTO pricing.office_staff (organization_id, first_name, last_name, role, status, pay_type, annual_salary, hours_per_week, payroll_tax_rate, futa_rate, suta_rate, workers_comp_rate, health_insurance_monthly)
VALUES (
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'Sarah', 'Wilson', 'Office Manager', 'active', 'salary',
  55000, 40, 7.65, 0.6, 2.7, 0.5, 500
);

-- Jennifer Lee - Dispatcher, $20/hr
INSERT INTO pricing.office_staff (organization_id, first_name, last_name, role, status, pay_type, base_pay_rate, hours_per_week, payroll_tax_rate, futa_rate, suta_rate, workers_comp_rate, health_insurance_monthly)
VALUES (
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'Jennifer', 'Lee', 'Dispatcher', 'active', 'hourly',
  20, 40, 7.65, 0.6, 2.7, 0.5, 400
);

-- Yanni (Owner) - $96k salary, no payroll taxes
INSERT INTO pricing.office_staff (organization_id, first_name, last_name, role, status, pay_type, annual_salary, hours_per_week, payroll_tax_rate, futa_rate, suta_rate, workers_comp_rate, health_insurance_monthly)
VALUES (
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'Yanni', '(Owner)', 'Owner', 'active', 'salary',
  96000, 50, 0, 0, 0, 0, 0
);

-- ============================================================================
-- EXPENSE CATEGORIES
-- ============================================================================

-- Facility
INSERT INTO pricing.expense_categories (id, organization_id, name, description, icon, color, sort_order)
VALUES (
  'c1000000-0000-0000-0000-000000000001'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'Facility', 'Office and warehouse costs', 'Building2', 'blue', 1
);

-- Insurance
INSERT INTO pricing.expense_categories (id, organization_id, name, description, icon, color, sort_order)
VALUES (
  'c1000000-0000-0000-0000-000000000002'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'Insurance', 'Business insurance policies', 'Shield', 'green', 2
);

-- Software
INSERT INTO pricing.expense_categories (id, organization_id, name, description, icon, color, sort_order)
VALUES (
  'c1000000-0000-0000-0000-000000000003'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'Software', 'Software subscriptions and licenses', 'Laptop', 'purple', 3
);

-- Marketing
INSERT INTO pricing.expense_categories (id, organization_id, name, description, icon, color, sort_order)
VALUES (
  'c1000000-0000-0000-0000-000000000004'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'Marketing', 'Advertising and marketing costs', 'Megaphone', 'orange', 4
);

-- Financial
INSERT INTO pricing.expense_categories (id, organization_id, name, description, icon, color, sort_order)
VALUES (
  'c1000000-0000-0000-0000-000000000005'::uuid,
  'e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid,
  'Financial', 'Accounting and financial services', 'Calculator', 'slate', 5
);

-- ============================================================================
-- EXPENSE ITEMS
-- ============================================================================

-- Facility Items
INSERT INTO pricing.expense_items (organization_id, category_id, name, amount, frequency) VALUES
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 'Rent', 2500, 'monthly'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 'Utilities', 450, 'monthly'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 'Internet', 275, 'monthly'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 'Office Supplies', 150, 'monthly');

-- Insurance Items
INSERT INTO pricing.expense_items (organization_id, category_id, name, amount, frequency) VALUES
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000002'::uuid, 'General Liability', 14400, 'annual'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000002'::uuid, 'E&O Insurance', 3000, 'annual'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000002'::uuid, 'Bonding', 1800, 'annual');

-- Software Items
INSERT INTO pricing.expense_items (organization_id, category_id, name, amount, frequency) VALUES
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000003'::uuid, 'ServiceTitan', 1500, 'monthly'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000003'::uuid, 'QuickBooks', 150, 'monthly'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000003'::uuid, 'LAZI AI', 299, 'monthly'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000003'::uuid, 'Google Workspace', 120, 'monthly');

-- Marketing Items
INSERT INTO pricing.expense_items (organization_id, category_id, name, amount, frequency) VALUES
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000004'::uuid, 'Google Ads', 2000, 'monthly'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000004'::uuid, 'SEO Services', 500, 'monthly'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000004'::uuid, 'Social Media', 300, 'monthly');

-- Financial Items
INSERT INTO pricing.expense_items (organization_id, category_id, name, amount, frequency) VALUES
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000005'::uuid, 'Accounting Services', 500, 'monthly'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000005'::uuid, 'Merchant Fees', 450, 'monthly'),
  ('e72a57c0-00d6-441e-808d-99c8d52aa79e'::uuid, 'c1000000-0000-0000-0000-000000000005'::uuid, 'Business Loans', 1200, 'monthly');

-- ============================================================================
-- UPDATE VEHICLE ASSIGNMENTS
-- ============================================================================

UPDATE pricing.vehicles SET assigned_driver_id = 'b1000000-0000-0000-0000-000000000001'::uuid WHERE id = 'a1000000-0000-0000-0000-000000000001'::uuid;
UPDATE pricing.vehicles SET assigned_driver_id = 'b1000000-0000-0000-0000-000000000002'::uuid WHERE id = 'a1000000-0000-0000-0000-000000000002'::uuid;
UPDATE pricing.vehicles SET assigned_driver_id = 'b1000000-0000-0000-0000-000000000003'::uuid WHERE id = 'a1000000-0000-0000-0000-000000000003'::uuid;
UPDATE pricing.vehicles SET assigned_driver_id = 'b1000000-0000-0000-0000-000000000004'::uuid WHERE id = 'a1000000-0000-0000-0000-000000000005'::uuid;

SELECT 'Seed data completed!' as message;
