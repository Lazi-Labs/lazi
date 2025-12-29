#!/bin/bash
echo "🚀 Starting LAZI AI development..."
docker-compose -f infrastructure/docker/docker-compose.yml up -d
sleep 3
pnpm dev
