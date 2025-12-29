#!/bin/bash
# ============================================================
# LAZI - Supabase Migration Script
# ============================================================
# This script migrates the LAZI database to Supabase
# 
# Usage: ./scripts/migrate-to-supabase.sh
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  LAZI - Supabase Migration Script${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    # Try to load from .env file
    if [ -f "services/api/.env" ]; then
        export $(grep -v '^#' services/api/.env | grep DATABASE_URL | xargs)
    fi
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL is not set${NC}"
    echo "Please set DATABASE_URL environment variable or ensure it's in services/api/.env"
    exit 1
fi

# Verify it's a Supabase URL
if [[ "$DATABASE_URL" != *"supabase"* ]]; then
    echo -e "${YELLOW}WARNING: DATABASE_URL does not appear to be a Supabase URL${NC}"
    echo "Current URL: ${DATABASE_URL:0:50}..."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓ Database URL configured${NC}"
echo ""

# Step 1: Test connection
echo -e "${BLUE}Step 1: Testing database connection...${NC}"
if psql "$DATABASE_URL" -c "SELECT NOW();" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connection successful${NC}"
else
    echo -e "${RED}✗ Connection failed${NC}"
    echo "Please check your DATABASE_URL and network connectivity"
    exit 1
fi
echo ""

# Step 2: Enable extensions
echo -e "${BLUE}Step 2: Enabling required extensions...${NC}"
psql "$DATABASE_URL" << 'EOF'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm');
EOF
echo -e "${GREEN}✓ Extensions enabled${NC}"
echo ""

# Step 3: Run Prisma migrations
echo -e "${BLUE}Step 3: Running Prisma schema push...${NC}"
cd services/api

# Generate Prisma client
echo "  Generating Prisma client..."
npx prisma generate

# Push schema to database
echo "  Pushing schema to Supabase..."
npx prisma db push --accept-data-loss

echo -e "${GREEN}✓ Prisma schema pushed${NC}"
echo ""

# Step 4: Initialize sync state
echo -e "${BLUE}Step 4: Initializing sync state...${NC}"
psql "$DATABASE_URL" << 'EOF'
INSERT INTO raw_sync_state (table_name, endpoint, sync_status) VALUES 
    ('raw_st_customers', '/crm/v2/customers', 'pending'),
    ('raw_st_locations', '/crm/v2/locations', 'pending'),
    ('raw_st_jobs', '/jpm/v2/jobs', 'pending'),
    ('raw_st_appointments', '/jpm/v2/appointments', 'pending'),
    ('raw_st_estimates', '/sales/v2/estimates', 'pending'),
    ('raw_st_invoices', '/accounting/v2/invoices', 'pending'),
    ('raw_st_payments', '/accounting/v2/payments', 'pending'),
    ('raw_st_technicians', '/settings/v2/technicians', 'pending'),
    ('raw_st_employees', '/settings/v2/employees', 'pending'),
    ('raw_st_business_units', '/settings/v2/business-units', 'pending'),
    ('raw_st_campaigns', '/settings/v2/campaigns', 'pending'),
    ('raw_st_job_types', '/jpm/v2/job-types', 'pending'),
    ('raw_st_tag_types', '/settings/v2/tag-types', 'pending'),
    ('raw_st_pricebook_categories', '/pricebook/v2/categories', 'pending'),
    ('raw_st_pricebook_materials', '/pricebook/v2/materials', 'pending'),
    ('raw_st_pricebook_services', '/pricebook/v2/services', 'pending'),
    ('raw_st_pricebook_equipment', '/pricebook/v2/equipment', 'pending')
ON CONFLICT (table_name) DO NOTHING;
EOF
echo -e "${GREEN}✓ Sync state initialized${NC}"
echo ""

# Step 5: Verify tables
echo -e "${BLUE}Step 5: Verifying tables created...${NC}"
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo "  Tables in public schema: $TABLE_COUNT"

# List key tables
echo ""
echo "  Key tables:"
psql "$DATABASE_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'st_%' ORDER BY table_name LIMIT 10;"

echo -e "${GREEN}✓ Tables verified${NC}"
echo ""

# Step 6: Summary
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}  Migration Complete!${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the API server: cd services/api && npm run dev"
echo "  2. Trigger initial sync: curl -X POST http://localhost:3001/api/sync/full"
echo "  3. Monitor sync progress in the logs"
echo ""
echo "Useful commands:"
echo "  - Check table counts: psql \"\$DATABASE_URL\" -c \"SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;\""
echo "  - Check sync state: psql \"\$DATABASE_URL\" -c \"SELECT table_name, sync_status, records_count FROM raw_sync_state;\""
echo ""
