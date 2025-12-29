#!/bin/bash

# =============================================================================
# Setup Tooling Stack
# =============================================================================

set -e

echo "=================================================="
echo "  Perfect Catch - Tooling Setup"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Create directories
echo -e "${YELLOW}Creating config directories...${NC}"
mkdir -p config/temporal
mkdir -p config/prometheus/rules
mkdir -p config/grafana/provisioning/datasources
mkdir -p config/grafana/dashboards
mkdir -p config/hasura/metadata
mkdir -p src/temporal/workers
mkdir -p src/temporal/workflows
mkdir -p src/temporal/activities
mkdir -p src/temporal/schedules
mkdir -p src/lib
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# 2. Install npm dependencies
echo -e "${YELLOW}Installing npm dependencies...${NC}"
npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity prom-client
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# 3. Start services
echo -e "${YELLOW}Starting tooling services...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.tooling.yml up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# 4. Wait for Temporal
echo -e "${YELLOW}Waiting for Temporal to be ready...${NC}"
sleep 30

# Check Temporal health
until docker exec temporal temporal operator cluster health 2>/dev/null; do
    echo "Waiting for Temporal..."
    sleep 5
done
echo -e "${GREEN}✓ Temporal is ready${NC}"
echo ""

# 5. Setup schedules
echo -e "${YELLOW}Setting up Temporal schedules...${NC}"
node src/temporal/schedules/setup.js
echo -e "${GREEN}✓ Schedules configured${NC}"
echo ""

# 6. Print access info
echo "=================================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=================================================="
echo ""
echo "Access URLs:"
echo "  • Temporal UI:  http://localhost:8088"
echo "  • Metabase:     http://localhost:3030"
echo "  • Grafana:      http://localhost:3031 (admin/admin)"
echo "  • Prometheus:   http://localhost:9090"
echo "  • Hasura:       http://localhost:8080"
echo ""
echo "Start workers with:"
echo "  npm run worker:temporal"
echo ""
echo "Trigger a sync:"
echo "  curl -X POST http://localhost:3001/api/temporal/workflows/full-sync"
echo ""
