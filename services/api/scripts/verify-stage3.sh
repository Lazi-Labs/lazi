#!/bin/bash

# Stage 3 Verification Script
# Verifies all Stage 3 components are properly deployed

set -e

echo "=========================================="
echo "LAZI Stage 3 Deployment Verification"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 - MISSING"
        ((ERRORS++))
        return 1
    fi
}

check_export() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 exports $2"
        return 0
    else
        echo -e "${RED}✗${NC} $1 missing export: $2"
        ((ERRORS++))
        return 1
    fi
}

check_import() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 imports $2"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $1 missing import: $2"
        ((WARNINGS++))
        return 1
    fi
}

echo "1. Checking ServiceTitan Provider Files"
echo "----------------------------------------"
check_file "src/providers/servicetitan/customer.provider.js"
check_file "src/providers/servicetitan/location.provider.js"
check_file "src/providers/servicetitan/job.provider.js"
check_file "src/providers/servicetitan/appointment.provider.js"
check_file "src/providers/servicetitan/pricebook.provider.js"
check_file "src/providers/servicetitan/technician.provider.js"
echo ""

echo "2. Checking Provider Exports"
echo "----------------------------------------"
check_export "src/providers/servicetitan/customer.provider.js" "ServiceTitanCustomerProvider"
check_export "src/providers/servicetitan/location.provider.js" "ServiceTitanLocationProvider"
check_export "src/providers/servicetitan/job.provider.js" "ServiceTitanJobProvider"
check_export "src/providers/servicetitan/appointment.provider.js" "ServiceTitanAppointmentProvider"
check_export "src/providers/servicetitan/pricebook.provider.js" "ServiceTitanPricebookProvider"
check_export "src/providers/servicetitan/technician.provider.js" "ServiceTitanTechnicianProvider"
echo ""

echo "3. Checking Factory Integration"
echo "----------------------------------------"
check_file "src/providers/factory.js"
check_export "src/providers/factory.js" "getCustomerProvider"
check_export "src/providers/factory.js" "getLocationProvider"
check_export "src/providers/factory.js" "getJobProvider"
check_export "src/providers/factory.js" "getAppointmentProvider"
check_export "src/providers/factory.js" "getPricebookProvider"
check_export "src/providers/factory.js" "getTechnicianProvider"
echo ""

echo "4. Checking stClient API Coverage"
echo "----------------------------------------"
check_file "src/services/stClient.js"
check_export "src/services/stClient.js" "stClient"
check_export "src/services/stClient.js" "stRequest"

# Check for API domain objects
if grep -q "customers = {" "src/services/stClient.js"; then
    echo -e "${GREEN}✓${NC} stClient.js has customers API"
else
    echo -e "${RED}✗${NC} stClient.js missing customers API"
    ((ERRORS++))
fi

if grep -q "locations = {" "src/services/stClient.js"; then
    echo -e "${GREEN}✓${NC} stClient.js has locations API"
else
    echo -e "${RED}✗${NC} stClient.js missing locations API"
    ((ERRORS++))
fi

if grep -q "jobs = {" "src/services/stClient.js"; then
    echo -e "${GREEN}✓${NC} stClient.js has jobs API"
else
    echo -e "${RED}✗${NC} stClient.js missing jobs API"
    ((ERRORS++))
fi

if grep -q "appointments = {" "src/services/stClient.js"; then
    echo -e "${GREEN}✓${NC} stClient.js has appointments API"
else
    echo -e "${RED}✗${NC} stClient.js missing appointments API"
    ((ERRORS++))
fi

if grep -q "technicians = {" "src/services/stClient.js"; then
    echo -e "${GREEN}✓${NC} stClient.js has technicians API"
else
    echo -e "${RED}✗${NC} stClient.js missing technicians API"
    ((ERRORS++))
fi
echo ""

echo "5. Checking Provider Interfaces"
echo "----------------------------------------"
check_file "src/providers/interfaces/customer.provider.interface.js"
check_file "src/providers/interfaces/location.provider.interface.js"
check_file "src/providers/interfaces/job.provider.interface.js"
check_file "src/providers/interfaces/appointment.provider.interface.js"
check_file "src/providers/interfaces/pricebook.provider.interface.js"
check_file "src/providers/interfaces/technician.provider.interface.js"
check_file "src/providers/interfaces/index.js"
echo ""

echo "6. Checking Infrastructure Files"
echo "----------------------------------------"
check_file "src/lib/feature-flags.js"
check_file "src/middleware/tenantIsolation.js"
check_file "src/middleware/rbac.js"
check_file "src/config/index.js"
check_file "src/db/schema-connection.js"
echo ""

echo "7. Checking Provider Dependencies"
echo "----------------------------------------"
# Check that providers import stClient
check_import "src/providers/servicetitan/location.provider.js" "stClient"
check_import "src/providers/servicetitan/job.provider.js" "stClient"
check_import "src/providers/servicetitan/appointment.provider.js" "stClient"
check_import "src/providers/servicetitan/technician.provider.js" "stClient"

# Check that providers import query
check_import "src/providers/servicetitan/location.provider.js" "query"
check_import "src/providers/servicetitan/job.provider.js" "query"
check_import "src/providers/servicetitan/appointment.provider.js" "query"
check_import "src/providers/servicetitan/technician.provider.js" "query"
echo ""

echo "8. Checking Documentation"
echo "----------------------------------------"
check_file "../../docs/architecture/IMPLEMENTATION_COMPLETE_STAGE_2.md"
check_file "../../docs/architecture/STAGE_3_COMPLETE.md"
check_file "../../docs/architecture/RESTRUCTURE_IMPLEMENTATION_STATUS.md"
echo ""

echo "=========================================="
echo "Verification Summary"
echo "=========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "Stage 3 is fully deployed and ready."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warnings found${NC}"
    echo "Stage 3 is deployed but has minor issues."
    exit 0
else
    echo -e "${RED}✗ $ERRORS errors found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS warnings found${NC}"
    fi
    echo "Stage 3 deployment has issues that need to be fixed."
    exit 1
fi
