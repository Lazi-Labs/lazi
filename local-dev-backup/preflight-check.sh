#!/bin/bash

# LAZI CRM - Pre-Flight Check Script
# Checks for potential issues before migrating to local development

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

# Project root (one level up from this script)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         LAZI CRM - Local Development Pre-Flight Check      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Project Root: ${PROJECT_ROOT}"
echo ""

# Function to print status
print_pass() {
    echo -e "${GREEN}✓ PASS${NC} - $1"
    ((PASS_COUNT++))
}

print_warn() {
    echo -e "${YELLOW}⚠ WARN${NC} - $1"
    ((WARN_COUNT++))
}

print_fail() {
    echo -e "${RED}✗ FAIL${NC} - $1"
    ((FAIL_COUNT++))
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================
# 1. Check for hardcoded production URLs
# ============================================
print_section "1. Checking for Hardcoded Production URLs"

# Check for lazilabs.com
LAZILABS_COUNT=$(grep -r "lazilabs\.com" "$PROJECT_ROOT/apps" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -v "dist" | wc -l)
if [ "$LAZILABS_COUNT" -gt 0 ]; then
    print_warn "Found $LAZILABS_COUNT references to 'lazilabs.com' in code"
    echo "  Run: grep -r 'lazilabs.com' apps/ --exclude-dir=node_modules --exclude-dir=.next"
else
    print_pass "No hardcoded 'lazilabs.com' URLs found"
fi

# Check for perfectcatchai.com
PERFECTCATCH_COUNT=$(grep -r "perfectcatchai\.com" "$PROJECT_ROOT/apps" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -v "dist" | wc -l)
if [ "$PERFECTCATCH_COUNT" -gt 0 ]; then
    print_warn "Found $PERFECTCATCH_COUNT references to 'perfectcatchai.com' in code"
    echo "  Run: grep -r 'perfectcatchai.com' apps/ --exclude-dir=node_modules --exclude-dir=.next"
else
    print_pass "No hardcoded 'perfectcatchai.com' URLs found"
fi

# Check for https://app. patterns
HTTPS_APP_COUNT=$(grep -r "https://app\." "$PROJECT_ROOT/apps" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -v "dist" | wc -l)
if [ "$HTTPS_APP_COUNT" -gt 0 ]; then
    print_warn "Found $HTTPS_APP_COUNT hardcoded 'https://app.' URLs"
    echo "  Run: grep -r 'https://app.' apps/ --exclude-dir=node_modules --exclude-dir=.next"
else
    print_pass "No hardcoded 'https://app.' URLs found"
fi

# Check for https://api. patterns
HTTPS_API_COUNT=$(grep -r "https://api\." "$PROJECT_ROOT/apps" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -v "dist" | wc -l)
if [ "$HTTPS_API_COUNT" -gt 0 ]; then
    print_warn "Found $HTTPS_API_COUNT hardcoded 'https://api.' URLs"
    echo "  Run: grep -r 'https://api.' apps/ --exclude-dir=node_modules --exclude-dir=.next"
else
    print_pass "No hardcoded 'https://api.' URLs found"
fi

# ============================================
# 2. Check Environment Variable Usage
# ============================================
print_section "2. Checking Environment Variable Usage"

# Check for NEXT_PUBLIC_API_URL usage
if grep -r "NEXT_PUBLIC_API_URL" "$PROJECT_ROOT/apps" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist > /dev/null 2>&1; then
    print_pass "NEXT_PUBLIC_API_URL is used in code"
else
    print_warn "NEXT_PUBLIC_API_URL not found - API URL might be hardcoded"
fi

# Check for ST_AUTOMATION_URL usage
if grep -r "ST_AUTOMATION_URL" "$PROJECT_ROOT/apps" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist > /dev/null 2>&1; then
    print_pass "ST_AUTOMATION_URL is used in code"
else
    print_warn "ST_AUTOMATION_URL not found - might not be needed or hardcoded"
fi

# Check for NEXT_PUBLIC_SOCKET_URL usage
if grep -r "NEXT_PUBLIC_SOCKET_URL\|SOCKET_URL" "$PROJECT_ROOT/apps" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist > /dev/null 2>&1; then
    print_pass "Socket URL environment variable is used"
else
    print_warn "Socket URL env var not found - WebSocket URL might be hardcoded"
fi

# ============================================
# 3. Check Traefik Configuration
# ============================================
print_section "3. Checking Traefik Configuration"

# Check for docker-compose files with Traefik
if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    if grep -q "traefik" "$PROJECT_ROOT/docker-compose.yml"; then
        print_warn "Traefik configuration found in docker-compose.yml"
        echo "  You'll need to remove Traefik labels and expose ports directly"
    else
        print_pass "No Traefik configuration in docker-compose.yml"
    fi
else
    print_pass "No docker-compose.yml found (not using Docker)"
fi

# Check for Traefik labels
TRAEFIK_LABELS=$(grep -r "traefik\." "$PROJECT_ROOT" --include="docker-compose*.yml" 2>/dev/null | wc -l)
if [ "$TRAEFIK_LABELS" -gt 0 ]; then
    print_warn "Found $TRAEFIK_LABELS Traefik labels in docker-compose files"
    echo "  These should be removed for local development"
else
    print_pass "No Traefik labels found"
fi

# ============================================
# 4. Check CORS Configuration
# ============================================
print_section "4. Checking CORS Configuration"

# Check for CORS configuration in API
CORS_FILES=$(find "$PROJECT_ROOT/apps" -name "*.js" -o -name "*.ts" | xargs grep -l "cors" 2>/dev/null | grep -v node_modules | grep -v .next | grep -v dist)
if [ -n "$CORS_FILES" ]; then
    print_pass "CORS configuration found in code"
    echo "  Files: $(echo "$CORS_FILES" | tr '\n' ' ')"
    echo "  Verify it allows localhost origins"
else
    print_warn "No CORS configuration found - might cause issues"
fi

# Check for CORS_ORIGINS env var usage
if grep -r "CORS_ORIGINS" "$PROJECT_ROOT/apps" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist > /dev/null 2>&1; then
    print_pass "CORS_ORIGINS environment variable is used"
else
    print_warn "CORS_ORIGINS env var not found - CORS might be hardcoded"
fi

# ============================================
# 5. Check Socket.io Configuration
# ============================================
print_section "5. Checking Socket.io Configuration"

# Check for Socket.io usage
if grep -r "socket\.io\|socketio" "$PROJECT_ROOT/apps" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist > /dev/null 2>&1; then
    print_pass "Socket.io is used in the project"
    
    # Check for CORS in socket.io
    if grep -r "io.*cors\|new Server.*cors" "$PROJECT_ROOT/apps" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist > /dev/null 2>&1; then
        print_pass "Socket.io CORS configuration found"
    else
        print_warn "Socket.io CORS configuration not found - might cause connection issues"
    fi
else
    print_pass "Socket.io not used (skipping)"
fi

# ============================================
# 6. Check Existing Environment Files
# ============================================
print_section "6. Checking Environment Files"

# Check for .env
if [ -f "$PROJECT_ROOT/.env" ]; then
    print_pass ".env file exists"
    
    # Check for critical variables
    if grep -q "DATABASE_URL" "$PROJECT_ROOT/.env"; then
        print_pass "DATABASE_URL found in .env"
    else
        print_fail "DATABASE_URL not found in .env"
    fi
    
    if grep -q "SERVICE_TITAN" "$PROJECT_ROOT/.env"; then
        print_pass "ServiceTitan credentials found in .env"
    else
        print_warn "ServiceTitan credentials not found in .env"
    fi
    
    if grep -q "REDIS_URL" "$PROJECT_ROOT/.env"; then
        print_pass "REDIS_URL found in .env"
    else
        print_warn "REDIS_URL not found in .env"
    fi
else
    print_fail ".env file not found - you'll need to create one"
fi

# Check for .env.local
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    print_warn ".env.local already exists - will be overwritten by convert-env.sh"
else
    print_pass ".env.local doesn't exist (will be created)"
fi

# Check for .env.example
if [ -f "$PROJECT_ROOT/.env.example" ]; then
    print_pass ".env.example exists (good for reference)"
else
    print_warn ".env.example not found (not critical)"
fi

# ============================================
# 7. Check Git Configuration
# ============================================
print_section "7. Checking Git Configuration"

cd "$PROJECT_ROOT" || exit

# Check if it's a git repo
if [ -d ".git" ]; then
    print_pass "Git repository detected"
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_warn "Uncommitted changes detected"
        echo "  Commit or stash changes before migration"
    else
        print_pass "No uncommitted changes"
    fi
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    print_pass "Current branch: $CURRENT_BRANCH"
    
    # Check remote
    REMOTE_URL=$(git remote get-url origin 2>/dev/null)
    if [ -n "$REMOTE_URL" ]; then
        print_pass "Git remote configured: $REMOTE_URL"
    else
        print_warn "No git remote configured"
    fi
else
    print_fail "Not a git repository"
fi

# ============================================
# 8. Check ServiceTitan API Patterns
# ============================================
print_section "8. Checking ServiceTitan API Call Patterns"

# Check for ServiceTitan API calls
ST_API_CALLS=$(grep -r "servicetitan\|ServiceTitan" "$PROJECT_ROOT/apps" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist 2>/dev/null | wc -l)
if [ "$ST_API_CALLS" -gt 0 ]; then
    print_pass "ServiceTitan API integration found ($ST_API_CALLS references)"
    
    # Check if calls are server-side
    ST_API_FILES=$(find "$PROJECT_ROOT/apps/api" -name "*.js" -o -name "*.ts" 2>/dev/null | xargs grep -l "servicetitan\|ServiceTitan" 2>/dev/null | grep -v node_modules)
    if [ -n "$ST_API_FILES" ]; then
        print_pass "ServiceTitan calls found in API (server-side) ✓"
    else
        print_warn "ServiceTitan calls might be client-side - verify OAuth callbacks"
    fi
else
    print_pass "No ServiceTitan integration found (skipping)"
fi

# ============================================
# 9. Check Dependencies
# ============================================
print_section "9. Checking Dependencies"

# Check for package.json
if [ -f "$PROJECT_ROOT/package.json" ]; then
    print_pass "package.json found"
    
    # Check for pnpm
    if command -v pnpm &> /dev/null; then
        print_pass "pnpm is installed"
    else
        print_warn "pnpm not found - install with: npm install -g pnpm"
    fi
    
    # Check for node_modules
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        print_pass "node_modules exists"
    else
        print_warn "node_modules not found - run: pnpm install"
    fi
else
    print_fail "package.json not found"
fi

# Check for Docker
if command -v docker &> /dev/null; then
    print_pass "Docker is installed"
    
    # Check if Docker is running
    if docker ps &> /dev/null; then
        print_pass "Docker daemon is running"
    else
        print_warn "Docker daemon is not running - start Docker Desktop"
    fi
else
    print_warn "Docker not found - needed for Redis (or install Redis locally)"
fi

# Check for Redis CLI
if command -v redis-cli &> /dev/null; then
    print_pass "redis-cli is installed"
else
    print_warn "redis-cli not found - install for testing Redis connection"
fi

# ============================================
# 10. Check Port Availability
# ============================================
print_section "10. Checking Port Availability"

# Check if ports are in use
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warn "Port $port ($service) is already in use"
        echo "  Process: $(lsof -Pi :$port -sTCP:LISTEN | tail -n 1)"
    else
        print_pass "Port $port ($service) is available"
    fi
}

check_port 3000 "Next.js Web"
check_port 3001 "API Server"
check_port 6379 "Redis"

# ============================================
# Summary
# ============================================
print_section "Summary"

echo ""
echo -e "${GREEN}Passed:${NC}  $PASS_COUNT"
echo -e "${YELLOW}Warnings:${NC} $WARN_COUNT"
echo -e "${RED}Failed:${NC}   $FAIL_COUNT"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "${RED}⚠ CRITICAL ISSUES FOUND${NC}"
    echo "Please address the failed checks before proceeding with migration."
    exit 1
elif [ "$WARN_COUNT" -gt 5 ]; then
    echo -e "${YELLOW}⚠ MULTIPLE WARNINGS${NC}"
    echo "Review warnings carefully before proceeding with migration."
    exit 0
else
    echo -e "${GREEN}✓ READY FOR MIGRATION${NC}"
    echo "You can proceed with the local development setup."
    exit 0
fi
