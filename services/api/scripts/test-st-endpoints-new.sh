#!/bin/bash
# ServiceTitan Endpoint Test Runner

cd /opt/docker/apps/lazi/services/api

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     SERVICETITAN ENDPOINT TESTING                              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# Load environment
if [ -f ../../.env.production ]; then
  source ../../.env.production
fi

# Check credentials
if [ -z "$SERVICE_TITAN_CLIENT_ID" ] && [ -z "$SERVICETITAN_CLIENT_ID" ]; then
  echo "❌ Missing SERVICETITAN_CLIENT_ID or SERVICE_TITAN_CLIENT_ID"
  exit 1
fi

DOMAIN=${1:-"all"}
echo "Testing: $DOMAIN"
echo ""

if [ "$DOMAIN" == "all" ]; then
  node src/tests/st-endpoints/runner.js --all
else
  node src/tests/st-endpoints/runner.js $DOMAIN
fi

echo ""
echo "Reference responses: src/reference/st-responses/"
