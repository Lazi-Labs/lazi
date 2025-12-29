#!/bin/bash
# LAZI Restructure Verification Script
# Checks that all new files and directories are in place

set -e

echo "=== LAZI RESTRUCTURE VERIFICATION ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/opt/docker/apps/lazi/services/api/src"

# Track results
PASS=0
FAIL=0

check_dir() {
  if [ -d "$BASE_DIR/$1" ]; then
    echo -e "${GREEN}✓${NC} Directory: $1"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} Directory: $1"
    ((FAIL++))
  fi
}

check_file() {
  if [ -f "$BASE_DIR/$1" ]; then
    echo -e "${GREEN}✓${NC} File: $1"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} File: $1"
    ((FAIL++))
  fi
}

echo "1. Checking directory structure..."
check_dir "modules/pricebook"
check_dir "modules/customers"
check_dir "modules/jobs"
check_dir "providers/interfaces"
check_dir "providers/servicetitan"
check_dir "providers/lazi"
check_dir "providers/hybrid"
check_dir "lib"
echo ""

echo "2. Checking core infrastructure files..."
check_file "lib/feature-flags.js"
check_file "providers/factory.js"
check_file "middleware/tenantIsolation.js"
check_file "middleware/rbac.js"
echo ""

echo "3. Checking provider interfaces..."
check_file "providers/interfaces/customer.provider.interface.js"
check_file "providers/interfaces/pricebook.provider.interface.js"
echo ""

echo "4. Checking ServiceTitan providers..."
check_file "providers/servicetitan/customer.provider.js"
check_file "providers/servicetitan/pricebook.provider.js"
echo ""

echo "5. Checking pricebook module..."
check_file "modules/pricebook/pricebook.routes.js"
check_file "modules/pricebook/pricebook.controller.js"
check_file "modules/pricebook/pricebook.service.js"
echo ""

echo "6. Checking for hardcoded values..."
if grep -r "localhost:5432" "$BASE_DIR/routes/" --include="*.js" -q 2>/dev/null; then
  echo -e "${RED}✗${NC} Found hardcoded localhost:5432 in routes/"
  ((FAIL++))
else
  echo -e "${GREEN}✓${NC} No hardcoded localhost:5432 in routes/"
  ((PASS++))
fi

if grep -r "perfectcatch" "$BASE_DIR/" --include="*.js" -q 2>/dev/null; then
  echo -e "${RED}✗${NC} Found 'perfectcatch' references"
  ((FAIL++))
else
  echo -e "${GREEN}✓${NC} No 'perfectcatch' references"
  ((PASS++))
fi
echo ""

echo "=== RESULTS ==="
echo -e "Passed: ${GREEN}${PASS}${NC}"
echo -e "Failed: ${RED}${FAIL}${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some checks failed${NC}"
  exit 1
fi
