#!/bin/bash
set -e

echo "🚀 Setting up LAZI AI development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm required. Run: npm install -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required"; exit 1; }

# Environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start core Docker services
echo "🐳 Starting Docker services..."
docker-compose -f infrastructure/docker/docker-compose.yml up -d postgres redis

echo ""
echo "✅ Setup complete!"
echo ""
echo "Commands:"
echo "  pnpm dev          # Start all services"
echo "  pnpm dev:web      # Start web app only"
echo "  pnpm dev:api      # Start API only"
echo ""
echo "Services:"
echo "  Web:      http://localhost:3000"
echo "  API:      http://localhost:3001"
echo "  Temporal: http://localhost:8088"
echo "  Grafana:  http://localhost:3031"
