# LAZI AI

Field Service Management Platform with ServiceTitan Integration

## Quick Start

```bash
# Setup
cp .env.example .env
pnpm install
docker-compose up -d
pnpm dev
```

## Project Structure

```
lazi/
├── apps/
│   └── web/                # Next.js Frontend (port 3000)
├── services/
│   ├── api/                # Express API (port 3001)
│   └── mcp-server/         # MCP Server (AI Tools)
├── workers/
│   └── temporal/           # Temporal Workflows
├── packages/               # Shared packages
├── database/               # Database scripts & migrations
│   ├── scripts/            # SQL utility scripts
│   └── migrations/         # Database migrations
├── config/                 # LAZI AI
│   ├── grafana/
│   ├── prometheus/
│   ├── temporal/
│   └── ecosystem.config.js # PM2 configuration
├── docs/                   # Documentation
│   ├── deployment/         # Deployment guides
│   ├── setup/              # Setup & configuration
│   ├── troubleshooting/    # Issue resolution
│   ├── infrastructure/     # Infrastructure docs
│   └── api/                # API documentation
└── infrastructure/
    └── docker/             # Docker compose files
```

## Services

| Service | URL | Port |
|---------|-----|------|
| Frontend | https://lazilabs.com | 3000 |
| API | http://localhost:3001 | 3001 |
| Temporal UI | http://localhost:8088 | 8088 |
| Grafana | http://localhost:3031 | 3031 |
| Prometheus | http://localhost:9090 | 9090 |
| Metabase | http://localhost:3030 | 3030 |
| Supabase Studio | http://localhost:54323 | 54323 |

## Commands

```bash
# Development
pnpm dev          # Start all services
pnpm dev:web      # Web only
pnpm dev:api      # API only
pnpm build        # Build all

# Docker
docker-compose up -d              # Start Docker services
docker-compose -f docker-compose.production.yml up -d  # Production

# Production API
cd services/api
NODE_ENV=production node src/server.js
```

## Documentation

- **[Quick Reference](docs/QUICK_REFERENCE.md)** - Essential commands and info
- **[Deployment](docs/deployment/)** - Deployment guides and status
- **[Setup](docs/setup/)** - Setup and configuration guides
- **[Troubleshooting](docs/troubleshooting/)** - Issue resolution
- **[Production Guide](docs/READY_FOR_PRODUCTION.md)** - Production deployment
- **[API Documentation](docs/api/)** - API endpoint registry
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY_DEC_26_2024.md)** - Complete project overview

## Current Status

✅ **Production Ready** - Server running on port 3001  
✅ **V2 API** - 35+ validated endpoints with rate limiting  
✅ **ServiceTitan Integration** - 92% API test success  
✅ **Database** - Supabase with 24 tables  
✅ **Security** - Production hardening complete

See [READY_FOR_PRODUCTION.md](docs/READY_FOR_PRODUCTION.md) for details.
