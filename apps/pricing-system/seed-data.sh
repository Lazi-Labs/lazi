#!/bin/bash

# Pricing System Seed Data Script
# This script populates the pricing system with sample data

SUPABASE_URL="https://cvqduvqzkvqnjouuzldk.supabase.co"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWR1dnF6a3ZxbmpvdXV6bGRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjUyMjE5NywiZXhwIjoyMDgyMDk4MTk3fQ.-haPq7H3oYGBYYvwPFn3cGCI1mwoddgJGCSfC5TcR_c"
ORG_ID="e72a57c0-00d6-441e-808d-99c8d52aa79e"

# Helper function for POST requests
post_data() {
  local table=$1
  local data=$2
  curl -s -X POST "$SUPABASE_URL/rest/v1/$table" \
    -H "apikey: $API_KEY" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data"
}

echo "=== Seeding Pricing System Data ==="

# ============================================================================
# VEHICLES (8 total)
# ============================================================================
echo ""
echo "Creating vehicles..."

# Vehicle 1 - 2024 Ford T250 KB27688 (Active)
V1=$(post_data "pricing_vehicles" '{
  "organization_id": "'$ORG_ID'",
  "year": 2024,
  "make": "Ford",
  "model": "Transit 250",
  "vin": "1FTBW2CG3PK*27688",
  "status": "active",
  "loan_balance": 71048,
  "monthly_payment": 1527.70,
  "market_value": 38500,
  "insurance_monthly": 200,
  "fuel_monthly": 550,
  "maintenance_monthly": 75
}')
VEHICLE_1_ID=$(echo $V1 | jq -r '.id')
echo "Vehicle 1 created: $VEHICLE_1_ID"

# Vehicle 2 - 2024 Ford T250 KA00562 (Active)
V2=$(post_data "pricing_vehicles" '{
  "organization_id": "'$ORG_ID'",
  "year": 2024,
  "make": "Ford",
  "model": "Transit 250",
  "vin": "1FTBW2CG5PK*00562",
  "status": "active",
  "loan_balance": 66699,
  "monthly_payment": 1549.67,
  "market_value": 38500,
  "insurance_monthly": 200,
  "fuel_monthly": 550,
  "maintenance_monthly": 75
}')
VEHICLE_2_ID=$(echo $V2 | jq -r '.id')
echo "Vehicle 2 created: $VEHICLE_2_ID"

# Vehicle 3 - 2024 Ford T250 KB27552 (Active)
V3=$(post_data "pricing_vehicles" '{
  "organization_id": "'$ORG_ID'",
  "year": 2024,
  "make": "Ford",
  "model": "Transit 250",
  "vin": "1FTBW2CG7PK*27552",
  "status": "active",
  "loan_balance": 67533,
  "monthly_payment": 1508.83,
  "market_value": 38500,
  "insurance_monthly": 200,
  "fuel_monthly": 550,
  "maintenance_monthly": 75
}')
VEHICLE_3_ID=$(echo $V3 | jq -r '.id')
echo "Vehicle 3 created: $VEHICLE_3_ID"

# Vehicle 4 - 2023 Ford T250 KB49980 (Reserve)
V4=$(post_data "pricing_vehicles" '{
  "organization_id": "'$ORG_ID'",
  "year": 2023,
  "make": "Ford",
  "model": "Transit 250",
  "vin": "1FTBW2CG8NK*49980",
  "status": "reserve",
  "loan_balance": 49715,
  "monthly_payment": 1338.71,
  "market_value": 34000,
  "insurance_monthly": 180,
  "fuel_monthly": 0,
  "maintenance_monthly": 50
}')
VEHICLE_4_ID=$(echo $V4 | jq -r '.id')
echo "Vehicle 4 created: $VEHICLE_4_ID"

# Vehicle 5 - 2024 Ford T250 KB53953 (Active - assigned to Helper)
V5=$(post_data "pricing_vehicles" '{
  "organization_id": "'$ORG_ID'",
  "year": 2024,
  "make": "Ford",
  "model": "Transit 250",
  "vin": "1FTBW2CG0PK*53953",
  "status": "active",
  "loan_balance": 70655,
  "monthly_payment": 1580.00,
  "market_value": 36000,
  "insurance_monthly": 200,
  "fuel_monthly": 500,
  "maintenance_monthly": 75
}')
VEHICLE_5_ID=$(echo $V5 | jq -r '.id')
echo "Vehicle 5 created: $VEHICLE_5_ID"

# Vehicle 6 - 2023 Ford F250 EC20408 (Active)
V6=$(post_data "pricing_vehicles" '{
  "organization_id": "'$ORG_ID'",
  "year": 2023,
  "make": "Ford",
  "model": "F-250",
  "vin": "1FT7W2BT6PE*20408",
  "status": "active",
  "loan_balance": 60527,
  "monthly_payment": 1863.45,
  "market_value": 0,
  "insurance_monthly": 220,
  "fuel_monthly": 600,
  "maintenance_monthly": 100
}')
VEHICLE_6_ID=$(echo $V6 | jq -r '.id')
echo "Vehicle 6 created: $VEHICLE_6_ID"

# Vehicle 7 - 2018 Ford T250 KA64488 (Maintenance)
V7=$(post_data "pricing_vehicles" '{
  "organization_id": "'$ORG_ID'",
  "year": 2018,
  "make": "Ford",
  "model": "Transit 250",
  "vin": "1FTYR2CG6JK*64488",
  "status": "maintenance",
  "loan_balance": 18188,
  "monthly_payment": 552.70,
  "market_value": 12850,
  "insurance_monthly": 150,
  "fuel_monthly": 0,
  "maintenance_monthly": 200
}')
VEHICLE_7_ID=$(echo $V7 | jq -r '.id')
echo "Vehicle 7 created: $VEHICLE_7_ID"

# Vehicle 8 - 2019 Ford T250 KA32101 (Reserve - paid off)
V8=$(post_data "pricing_vehicles" '{
  "organization_id": "'$ORG_ID'",
  "year": 2019,
  "make": "Ford",
  "model": "Transit 250",
  "vin": "1FTYR2CG3KK*32101",
  "status": "reserve",
  "loan_balance": 0,
  "monthly_payment": 0,
  "market_value": 18500,
  "insurance_monthly": 160,
  "fuel_monthly": 0,
  "maintenance_monthly": 50
}')
VEHICLE_8_ID=$(echo $V8 | jq -r '.id')
echo "Vehicle 8 created: $VEHICLE_8_ID"

# ============================================================================
# TECHNICIANS (4 total)
# ============================================================================
echo ""
echo "Creating technicians..."

# Mike Johnson - Lead Tech, $35/hr, Vehicle 1
T1=$(post_data "pricing_technicians" '{
  "organization_id": "'$ORG_ID'",
  "first_name": "Mike",
  "last_name": "Johnson",
  "role": "Lead Technician",
  "status": "active",
  "pay_type": "hourly",
  "base_pay_rate": 35,
  "paid_hours_per_day": 8,
  "payroll_tax_rate": 7.65,
  "futa_rate": 0.6,
  "suta_rate": 2.7,
  "workers_comp_rate": 8.5,
  "health_insurance_monthly": 450,
  "retirement_401k_match_percent": 3,
  "assigned_vehicle_id": "'$VEHICLE_1_ID'"
}')
TECH_1_ID=$(echo $T1 | jq -r '.id')
echo "Technician Mike Johnson created: $TECH_1_ID"

# David Rodriguez - Lead Tech, $35/hr, Vehicle 2
T2=$(post_data "pricing_technicians" '{
  "organization_id": "'$ORG_ID'",
  "first_name": "David",
  "last_name": "Rodriguez",
  "role": "Lead Technician",
  "status": "active",
  "pay_type": "hourly",
  "base_pay_rate": 35,
  "paid_hours_per_day": 8,
  "payroll_tax_rate": 7.65,
  "futa_rate": 0.6,
  "suta_rate": 2.7,
  "workers_comp_rate": 8.5,
  "health_insurance_monthly": 450,
  "retirement_401k_match_percent": 3,
  "assigned_vehicle_id": "'$VEHICLE_2_ID'"
}')
TECH_2_ID=$(echo $T2 | jq -r '.id')
echo "Technician David Rodriguez created: $TECH_2_ID"

# Chris Thompson - Lead Tech, $32/hr, Vehicle 3
T3=$(post_data "pricing_technicians" '{
  "organization_id": "'$ORG_ID'",
  "first_name": "Chris",
  "last_name": "Thompson",
  "role": "Lead Technician",
  "status": "active",
  "pay_type": "hourly",
  "base_pay_rate": 32,
  "paid_hours_per_day": 8,
  "payroll_tax_rate": 7.65,
  "futa_rate": 0.6,
  "suta_rate": 2.7,
  "workers_comp_rate": 8.5,
  "health_insurance_monthly": 450,
  "retirement_401k_match_percent": 3,
  "assigned_vehicle_id": "'$VEHICLE_3_ID'"
}')
TECH_3_ID=$(echo $T3 | jq -r '.id')
echo "Technician Chris Thompson created: $TECH_3_ID"

# Alex Martinez - Helper, $22/hr, Vehicle 5
T4=$(post_data "pricing_technicians" '{
  "organization_id": "'$ORG_ID'",
  "first_name": "Alex",
  "last_name": "Martinez",
  "role": "Helper",
  "status": "active",
  "pay_type": "hourly",
  "base_pay_rate": 22,
  "paid_hours_per_day": 8,
  "payroll_tax_rate": 7.65,
  "futa_rate": 0.6,
  "suta_rate": 2.7,
  "workers_comp_rate": 8.5,
  "health_insurance_monthly": 300,
  "retirement_401k_match_percent": 3,
  "assigned_vehicle_id": "'$VEHICLE_5_ID'"
}')
TECH_4_ID=$(echo $T4 | jq -r '.id')
echo "Technician Alex Martinez created: $TECH_4_ID"

# ============================================================================
# TECHNICIAN UNPRODUCTIVE TIME
# ============================================================================
echo ""
echo "Creating unproductive time entries..."

# For each lead tech: Morning Meeting 0.5hr (paid), Drive Time 1.5hr (paid), Lunch 0.5hr (unpaid), Paperwork 0.5hr (paid)
for TECH_ID in "$TECH_1_ID" "$TECH_2_ID" "$TECH_3_ID"; do
  # Morning Meeting - paid
  post_data "pricing_technician_unproductive_time" '{
    "technician_id": "'$TECH_ID'",
    "activity_name": "Morning Meeting",
    "hours_per_day": 0.5,
    "is_paid": true,
    "description": "Daily team meeting and job assignments"
  }' > /dev/null

  # Drive Time - paid
  post_data "pricing_technician_unproductive_time" '{
    "technician_id": "'$TECH_ID'",
    "activity_name": "Drive Time",
    "hours_per_day": 1.5,
    "is_paid": true,
    "description": "Travel between jobs"
  }' > /dev/null

  # Lunch - unpaid
  post_data "pricing_technician_unproductive_time" '{
    "technician_id": "'$TECH_ID'",
    "activity_name": "Lunch Break",
    "hours_per_day": 0.5,
    "is_paid": false,
    "description": "Unpaid lunch break"
  }' > /dev/null

  # Paperwork - paid
  post_data "pricing_technician_unproductive_time" '{
    "technician_id": "'$TECH_ID'",
    "activity_name": "Paperwork",
    "hours_per_day": 0.5,
    "is_paid": true,
    "description": "End of day paperwork and inventory"
  }' > /dev/null
done

# Helper (Alex) - same schedule
# Morning Meeting - paid
post_data "pricing_technician_unproductive_time" '{
  "technician_id": "'$TECH_4_ID'",
  "activity_name": "Morning Meeting",
  "hours_per_day": 0.5,
  "is_paid": true,
  "description": "Daily team meeting and job assignments"
}' > /dev/null

# Drive Time - paid
post_data "pricing_technician_unproductive_time" '{
  "technician_id": "'$TECH_4_ID'",
  "activity_name": "Drive Time",
  "hours_per_day": 1.5,
  "is_paid": true,
  "description": "Travel between jobs"
}' > /dev/null

# Lunch - unpaid
post_data "pricing_technician_unproductive_time" '{
  "technician_id": "'$TECH_4_ID'",
  "activity_name": "Lunch Break",
  "hours_per_day": 0.5,
  "is_paid": false,
  "description": "Unpaid lunch break"
}' > /dev/null

# Paperwork - paid
post_data "pricing_technician_unproductive_time" '{
  "technician_id": "'$TECH_4_ID'",
  "activity_name": "Paperwork",
  "hours_per_day": 0.5,
  "is_paid": true,
  "description": "End of day paperwork and inventory"
}' > /dev/null

echo "Unproductive time entries created for all technicians"

# ============================================================================
# OFFICE STAFF (3 total)
# ============================================================================
echo ""
echo "Creating office staff..."

# Sarah Wilson - Office Manager, $55k salary
post_data "pricing_office_staff" '{
  "organization_id": "'$ORG_ID'",
  "first_name": "Sarah",
  "last_name": "Wilson",
  "role": "Office Manager",
  "status": "active",
  "pay_type": "salary",
  "annual_salary": 55000,
  "hours_per_week": 40,
  "payroll_tax_rate": 7.65,
  "futa_rate": 0.6,
  "suta_rate": 2.7,
  "workers_comp_rate": 0.5,
  "health_insurance_monthly": 500
}' > /dev/null
echo "Office Staff Sarah Wilson created"

# Jennifer Lee - Dispatcher, $20/hr
post_data "pricing_office_staff" '{
  "organization_id": "'$ORG_ID'",
  "first_name": "Jennifer",
  "last_name": "Lee",
  "role": "Dispatcher",
  "status": "active",
  "pay_type": "hourly",
  "base_pay_rate": 20,
  "hours_per_week": 40,
  "payroll_tax_rate": 7.65,
  "futa_rate": 0.6,
  "suta_rate": 2.7,
  "workers_comp_rate": 0.5,
  "health_insurance_monthly": 400
}' > /dev/null
echo "Office Staff Jennifer Lee created"

# Yanni - Owner, $96k salary, no payroll taxes
post_data "pricing_office_staff" '{
  "organization_id": "'$ORG_ID'",
  "first_name": "Yanni",
  "last_name": "(Owner)",
  "role": "Owner",
  "status": "active",
  "pay_type": "salary",
  "annual_salary": 96000,
  "hours_per_week": 50,
  "payroll_tax_rate": 0,
  "futa_rate": 0,
  "suta_rate": 0,
  "workers_comp_rate": 0,
  "health_insurance_monthly": 0
}' > /dev/null
echo "Office Staff Yanni (Owner) created"

# ============================================================================
# EXPENSE CATEGORIES AND ITEMS
# ============================================================================
echo ""
echo "Creating expense categories and items..."

# Facility Category
FAC=$(post_data "pricing_expense_categories" '{
  "organization_id": "'$ORG_ID'",
  "name": "Facility",
  "description": "Office and warehouse costs",
  "icon": "Building2",
  "color": "blue",
  "sort_order": 1
}')
FAC_ID=$(echo $FAC | jq -r '.id')
echo "Category Facility created: $FAC_ID"

# Facility Items
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$FAC_ID'", "name": "Rent", "amount": 2500, "frequency": "monthly"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$FAC_ID'", "name": "Utilities", "amount": 450, "frequency": "monthly"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$FAC_ID'", "name": "Internet", "amount": 275, "frequency": "monthly"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$FAC_ID'", "name": "Office Supplies", "amount": 150, "frequency": "monthly"}' > /dev/null
echo "  - Facility items created"

# Insurance Category
INS=$(post_data "pricing_expense_categories" '{
  "organization_id": "'$ORG_ID'",
  "name": "Insurance",
  "description": "Business insurance policies",
  "icon": "Shield",
  "color": "green",
  "sort_order": 2
}')
INS_ID=$(echo $INS | jq -r '.id')
echo "Category Insurance created: $INS_ID"

# Insurance Items
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$INS_ID'", "name": "General Liability", "amount": 14400, "frequency": "annual"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$INS_ID'", "name": "E&O Insurance", "amount": 3000, "frequency": "annual"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$INS_ID'", "name": "Bonding", "amount": 1800, "frequency": "annual"}' > /dev/null
echo "  - Insurance items created"

# Software Category
SOFT=$(post_data "pricing_expense_categories" '{
  "organization_id": "'$ORG_ID'",
  "name": "Software",
  "description": "Software subscriptions and licenses",
  "icon": "Laptop",
  "color": "purple",
  "sort_order": 3
}')
SOFT_ID=$(echo $SOFT | jq -r '.id')
echo "Category Software created: $SOFT_ID"

# Software Items
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$SOFT_ID'", "name": "ServiceTitan", "amount": 1500, "frequency": "monthly"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$SOFT_ID'", "name": "QuickBooks", "amount": 150, "frequency": "monthly"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$SOFT_ID'", "name": "LAZI AI", "amount": 299, "frequency": "monthly"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$SOFT_ID'", "name": "Google Workspace", "amount": 120, "frequency": "monthly"}' > /dev/null
echo "  - Software items created"

# Marketing Category
MKT=$(post_data "pricing_expense_categories" '{
  "organization_id": "'$ORG_ID'",
  "name": "Marketing",
  "description": "Advertising and marketing costs",
  "icon": "Megaphone",
  "color": "orange",
  "sort_order": 4
}')
MKT_ID=$(echo $MKT | jq -r '.id')
echo "Category Marketing created: $MKT_ID"

# Marketing Items
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$MKT_ID'", "name": "Google Ads", "amount": 2000, "frequency": "monthly"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$MKT_ID'", "name": "SEO Services", "amount": 500, "frequency": "monthly"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$MKT_ID'", "name": "Social Media", "amount": 300, "frequency": "monthly"}' > /dev/null
echo "  - Marketing items created"

# Financial Category
FIN=$(post_data "pricing_expense_categories" '{
  "organization_id": "'$ORG_ID'",
  "name": "Financial",
  "description": "Accounting and financial services",
  "icon": "Calculator",
  "color": "slate",
  "sort_order": 5
}')
FIN_ID=$(echo $FIN | jq -r '.id')
echo "Category Financial created: $FIN_ID"

# Financial Items
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$FIN_ID'", "name": "Accounting Services", "amount": 500, "frequency": "monthly"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$FIN_ID'", "name": "Merchant Fees", "amount": 450, "frequency": "monthly"}' > /dev/null
post_data "pricing_expense_items" '{"organization_id": "'$ORG_ID'", "category_id": "'$FIN_ID'", "name": "Business Loans", "amount": 1200, "frequency": "monthly"}' > /dev/null
echo "  - Financial items created"

echo ""
echo "=== Seed Data Complete ==="
echo ""
echo "Summary:"
echo "- 8 vehicles created"
echo "- 4 technicians with unproductive time"
echo "- 3 office staff members"
echo "- 5 expense categories with items"
