# LAZI Project Directory Reference

> Complete file and folder reference for the LAZI ServiceTitan integration platform
> Last Updated: December 26, 2024

---

## Documentation Files (`/docs`)

### Core Documentation

| File | Purpose |
|------|---------|
| `CONSOLIDATED_DOCUMENTATION.md` | **Master reference document** - Complete platform documentation including architecture, database schema, ServiceTitan integration, sync engine, pricebook categories (all 4 phases), provider architecture, API reference, real-time updates, deployment, and production hardening |
| `DIRECTORY.md` | This file - Complete project directory reference |
| `README.md` | Documentation index and quick links |
| `QUICK_REFERENCE.md` | Essential commands, project structure, and common operations |

### Deployment & Status

| File | Purpose |
|------|---------|
| `DEPLOYMENT_COMPLETE.md` | Deployment summary with health check status and what's running |
| `READY_FOR_PRODUCTION.md` | Production readiness checklist and hardening status |
| `SERVER_DEPLOYMENT.md` | Server deployment instructions and configuration |
| `IMPLEMENTATION_SUMMARY_DEC_26_2024.md` | Latest implementation summary as of December 26, 2024 |

### Database & Schema

| File | Purpose |
|------|---------|
| `SCHEMA_INVENTORY.md` | Complete database schema inventory across all schemas |
| `MIGRATION_PLAN.md` | Database migration plan and procedures |

### AI Prompts

| File | Purpose |
|------|---------|
| `Windsurf prompt phase2 st testing.md` | Prompt for Phase 2 ServiceTitan API testing |

### Architecture Subdirectory (`/docs/architecture`)

| File | Purpose |
|------|---------|
| `SYSTEM_ARCHITECTURE.md` | High-level system architecture overview |
| `data-flow.md` | Data flow documentation between components |
| `schema-design.md` | Database schema design decisions and patterns |

### API Documentation (`/docs/api`)

| File | Purpose |
|------|---------|
| `README.md` | API documentation index |
| `ENDPOINT_REGISTRY_SUMMARY.md` | Summary of all 478 endpoints across 18 API domains |
| `*.endpoint-registry.json` | 18 endpoint registry files for each ServiceTitan API domain |

### Prompts (`/docs/prompts`)

| File | Purpose |
|------|---------|
| `master-tables/pricebook-categories.md` | AI prompt for conversational pricebook sync engine |
| `workers/category-sync-worker.md` | Development reference for sync workers (fetchers/mergers pattern) |

### Workflows (`/docs/workflows`)

| File | Purpose |
|------|---------|
| `inbound-sync.md` | Inbound sync workflow (ServiceTitan → LAZI) |
| `outbound-sync.md` | Outbound sync workflow (LAZI → ServiceTitan) |
| `pricebook-sync.md` | Pricebook-specific sync workflow |

---

## Repository Structure

```
/opt/docker/apps/lazi/
├── apps/                          # Frontend applications
│   ├── web/                       # Next.js 15 + React 19 frontend (port 3000)
│   │   ├── app/                   # Next.js App Router pages
│   │   ├── components/            # React UI components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # Shared libraries
│   │   ├── providers/             # React context providers
│   │   ├── stores/                # Zustand state stores
│   │   ├── types/                 # TypeScript type definitions
│   │   └── utils/                 # Utility functions
│   ├── api/                       # Legacy API app (deprecated)
│   ├── customer-portal/           # Customer-facing portal (planned)
│   └── mobile/                    # Mobile app (planned)
│
├── services/                      # Backend services
│   ├── api/                       # Express.js 4.21 API service (port 3001)
│   │   ├── src/
│   │   │   ├── routes/            # API route handlers
│   │   │   │   ├── v2/            # V2 API endpoints
│   │   │   │   └── sync/          # Sync-related endpoints
│   │   │   ├── workers/           # Background job workers
│   │   │   ├── sync/              # Sync engine logic
│   │   │   │   ├── fetchers/      # Data fetchers
│   │   │   │   ├── mergers/       # Data mergers
│   │   │   │   └── appliers/      # Change appliers
│   │   │   ├── db/                # Database connections
│   │   │   ├── middleware/        # Express middleware
│   │   │   ├── lib/               # Shared libraries
│   │   │   └── providers/         # ServiceTitan providers
│   │   ├── prisma/                # Prisma ORM schema
│   │   ├── scripts/               # Utility scripts
│   │   ├── tests/                 # Test suites
│   │   │   └── st-endpoints/      # ServiceTitan endpoint tests
│   │   └── migrations/            # SQL migrations
│   │
│   └── mcp-server/                # MCP (Model Context Protocol) server
│       ├── services/              # MCP services
│       └── tools/                 # MCP tools
│
├── packages/                      # Shared packages (monorepo)
│   ├── api-client/                # Shared API client library
│   ├── types/                     # Shared TypeScript types
│   ├── ui/                        # Shared UI components
│   ├── utils/                     # Shared utilities
│   └── workers/                   # Worker utilities
│       └── src/                   # Worker source code
│
├── database/                      # Database management
│   ├── migrations/                # SQL migrations (001-014)
│   ├── prisma-migrations/         # Prisma migration history
│   ├── scripts/                   # Database utility scripts
│   └── seeds/                     # Seed data files
│
├── workers/                       # Background workers
│   └── temporal/                  # Temporal.io workflows (planned)
│       ├── activities/            # Temporal activities
│       ├── schedules/             # Scheduled workflows
│       ├── workers/               # Worker processes
│       └── workflows/             # Workflow definitions
│
├── config/                        # Infrastructure configuration
│   ├── grafana/                   # Grafana dashboards & provisioning
│   │   ├── dashboards/            # JSON dashboard definitions
│   │   └── provisioning/          # Grafana provisioning config
│   ├── prometheus/                # Prometheus monitoring
│   │   └── rules/                 # Alerting rules
│   ├── hasura/                    # Hasura GraphQL engine
│   │   └── metadata/              # Hasura metadata
│   └── temporal/                  # Temporal.io configuration
│
├── infrastructure/                # Infrastructure as code
│   └── docker/                    # Docker configurations
│
├── scripts/                       # Project-level scripts
│
├── docs/                          # Documentation (this folder)
├── docs-backup/                   # Archived documentation
│
└── Root Files
    ├── docker-compose.yml         # Development Docker setup
    ├── docker-compose.production.yml  # Production Docker setup
    ├── docker-compose.traefik.yml # Traefik reverse proxy setup
    ├── package.json               # Root package.json
    ├── pnpm-workspace.yaml        # PNPM monorepo config
    ├── pnpm-lock.yaml             # PNPM lock file
    ├── turbo.json                 # Turborepo configuration
    ├── ecosystem.config.js        # PM2 process manager config
    ├── .env.example               # Environment variable template
    ├── .env.production            # Production environment
    └── README.md                  # Project README
```

---

## Database Schemas

| Schema | Purpose |
|--------|---------|
| `public` | Core application tables (tenants, users, sessions) |
| `raw` | Raw ServiceTitan API responses (unprocessed) |
| `master` | Master data tables (unified view after sync) |
| `crm` | CRM-specific tables (customers, leads, locations) |
| `sync` | Sync engine tables (jobs, logs, queue) |
| `pricebook` | Pricebook data (categories, subcategories, services, materials, equipment) |
| `servicetitan` | ServiceTitan-specific staging tables |
| `integrations` | Third-party integration tables |

---

## Key Technologies

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 15, React 19, TanStack Query, Zustand, @dnd-kit, Socket.io-client |
| **Backend** | Express.js 4.21 (ESM), Node.js 20+, Socket.io |
| **Database** | PostgreSQL (Supabase), Prisma ORM, ltree extension, pgvector |
| **Job Queue** | BullMQ, Redis |
| **Caching** | Redis, node-cache |
| **Auth** | OAuth 2.0 (ServiceTitan), JWT |
| **Monitoring** | Prometheus, Grafana |
| **Deployment** | Docker, PM2, Traefik |

---

## API Domains (ServiceTitan)

| Domain | Endpoints | Description |
|--------|-----------|-------------|
| CRM | 86 | Customers, leads, locations, bookings |
| JPM (Jobs) | 69 | Jobs, projects, appointments |
| Accounting | 54 | Invoices, payments, estimates |
| Pricebook | 44 | Categories, services, materials, equipment |
| Dispatch | 38 | Technicians, teams, zones, capacity |
| Memberships | 32 | Membership types, recurring services |
| Marketing | 28 | Campaigns, costs, attribution |
| Settings | 24 | Business units, employees, tags |
| Inventory | 23 | Stock, purchase orders, vendors |
| Payroll | 22 | Timesheets, payroll adjustments |
| Telecom | 18 | Calls, recordings |
| Forms | 15 | Custom forms, submissions |
| TaskManagement | 12 | Tasks, task data |
| EquipmentSystems | 8 | Installed equipment |
| ServiceAgreements | 5 | Service agreements |
| **Total** | **478** | Across 18 domains |

---

## Quick Commands

```bash
# Start development
cd /opt/docker/apps/lazi/services/api && npm run dev

# Start production
pm2 start ecosystem.config.js

# Run tests
cd /opt/docker/apps/lazi/services/api && ./scripts/test-st-endpoints-new.sh all

# Database migrations
cd /opt/docker/apps/lazi/services/api && npx prisma migrate deploy

# Check health
curl http://localhost:3001/health

# View logs
pm2 logs lazi-api
```

---

## Environment Variables

Key environment variables required:

```bash
# ServiceTitan
SERVICE_TITAN_CLIENT_ID=
SERVICE_TITAN_CLIENT_SECRET=
SERVICE_TITAN_APP_KEY=
SERVICE_TITAN_TENANT_ID=

# Database
DATABASE_URL=
DIRECT_URL=

# Redis
REDIS_URL=

# Server
PORT=3001
NODE_ENV=production
```

---

## File Counts

| Location | Files | Description |
|----------|-------|-------------|
| `/docs` | 20 | Documentation files |
| `/docs/api` | 19 | API registries + README |
| `/services/api/src` | ~80 | API source files |
| `/apps/web/app` | ~40 | Frontend pages |
| `/database/migrations` | 14 | SQL migrations |

---

*Generated: December 26, 2024*
