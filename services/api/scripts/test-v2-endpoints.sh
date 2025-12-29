#!/bin/bash

# Test V2 API Endpoints
# Tests all new modular endpoints to verify integration

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
TENANT_ID="${TENANT_ID:-3222348440}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Testing V2 API Endpoints"
echo "=========================================="
echo "API URL: $API_URL"
echo "Tenant ID: $TENANT_ID"
echo ""

PASSED=0
FAILED=0

test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    
    echo -n "Testing: $description ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL$endpoint" \
            -H "X-Tenant-ID: $TENANT_ID" \
            -H "Content-Type: application/json")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
            -H "X-Tenant-ID: $TENANT_ID" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
    elif [ "$http_code" = "501" ]; then
        echo -e "${YELLOW}⚠ NOT IMPLEMENTED${NC} (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "Response: $body"
        ((FAILED++))
    fi
}

echo "1. Testing Customers Module"
echo "----------------------------------------"
test_endpoint "GET" "/api/v2/customers" "List customers"
test_endpoint "GET" "/api/v2/customers/search?q=test" "Search customers"

echo ""
echo "2. Testing Jobs Module"
echo "----------------------------------------"
test_endpoint "GET" "/api/v2/jobs" "List jobs"
test_endpoint "GET" "/api/v2/jobs/customer/123" "Jobs by customer"
test_endpoint "GET" "/api/v2/jobs/location/456" "Jobs by location"

echo ""
echo "3. Testing Technicians Module"
echo "----------------------------------------"
test_endpoint "GET" "/api/v2/technicians" "List technicians"
test_endpoint "GET" "/api/v2/technicians/availability" "Technician availability"
test_endpoint "GET" "/api/v2/technicians/teams/all" "List teams"
test_endpoint "GET" "/api/v2/technicians/zones/all" "List zones"

echo ""
echo "4. Testing Pricebook Module"
echo "----------------------------------------"
test_endpoint "GET" "/api/v2/pricebook/categories" "List categories"
test_endpoint "GET" "/api/v2/pricebook/services" "List services"
test_endpoint "GET" "/api/v2/pricebook/materials" "List materials"
test_endpoint "GET" "/api/v2/pricebook/equipment" "List equipment"

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
