# LAZI AI - Agentic Engineering System

> Structured context for AI coding assistants working on the LAZI CRM platform

## Quick Start for AI Agents

```bash
# Read this first for quick context
cat .agents/CONTEXT.md

# Then dive into specifics
cat .agents/reference/architecture.md
cat .agents/reference/database-schemas.md
cat .agents/reference/api-routes.md
```

## Directory Structure

```
.agents/
├── AGENTS.md                    # This file - master index
├── CONTEXT.md                   # Quick context loader
├── reference/                   # Detailed documentation
│   ├── architecture.md          # System architecture
│   ├── database-schemas.md      # Database schema reference
│   ├── api-routes.md            # API endpoint reference
│   ├── servicetitan-api.md      # ServiceTitan integration
│   ├── frontend-components.md   # React components
│   ├── docker-deployment.md     # Docker & Traefik
│   ├── pricebook-system.md      # Pricebook domain
│   ├── temporal-workflows.md    # Temporal workflows
│   ├── environment-vars.md      # Environment variables
│   └── troubleshooting.md       # Common issues
├── commands/                    # Executable command patterns
│   ├── commit.md                # /commit
│   ├── create-prd.md            # /create-prd
│   ├── end-to-end-feature.md    # /end-to-end-feature
│   ├── bug-fix.md               # /bug-fix
│   ├── debug-performance.md     # /debug-performance
│   ├── migration-create.md      # /migration-create
│   ├── sync-servicetitan.md     # /sync-servicetitan
│   ├── pre-deploy-check.md      # /pre-deploy-check
│   ├── health-check.md          # /health-check
│   ├── review-pr.md             # /review-pr
│   ├── generate-tests.md        # /generate-tests
│   ├── refactor.md              # /refactor
│   ├── fix-types.md             # /fix-types
│   ├── analyze-codebase.md      # /analyze-codebase
│   ├── document-api.md          # /document-api
│   └── add-component.md         # /add-component
├── rules/                       # Coding standards & constraints
│   ├── coding-standards.md      # Code style guide
│   ├── database-rules.md        # Database conventions
│   ├── security-rules.md        # Security requirements
│   └── known-issues.md          # Known issues & workarounds
└── plans/                       # Implementation plans
    ├── TEMPLATE.md              # Plan template
    └── completed/               # Archived completed plans
```

## Project Overview

**LAZI** is a Field Service Management CRM platform that integrates with **ServiceTitan** to manage pricebook data, scheduling, dispatch, and customer relationships for the pool service industry.

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS, shadcn/ui (new-york style) |
| **Backend** | Express.js (ES Modules), Node.js 20+ |
| **Database** | PostgreSQL 16 (Supabase), Prisma ORM + raw SQL |
| **Cache/Queue** | Redis 7, BullMQ |
| **Workflows** | Temporal.io |
| **External APIs** | ServiceTitan API v2 |
| **Monitoring** | Prometheus, Grafana, Metabase |

### Monorepo Structure

```
lazi/
├── apps/
│   ├── web/                 # Next.js 14 frontend (port 3000)
│   ├── pricing-system/      # Standalone pricing calculator app
│   ├── customer-portal/     # (planned) Customer-facing portal
│   └── mobile/              # (planned) React Native app
├── services/
│   ├── api/                 # Express.js backend (port 3001)
│   └── mcp-server/          # MCP server for AI integrations
├── packages/
│   ├── types/               # Shared TypeScript types
│   ├── ui/                  # Shared UI components
│   └── utils/               # Shared utilities
├── database/
│   ├── migrations/          # SQL migrations (001-031)
│   └── scripts/             # Schema setup scripts (01-16)
├── workers/
│   └── temporal/            # Temporal workflow workers
└── config/                  # Infrastructure configs
```

## Key Concepts

### Three-Schema Database Architecture

| Schema | Purpose | Example Tables |
|--------|---------|----------------|
| `raw` | Immutable ServiceTitan API data | `st_pricebook_materials`, `st_customers` |
| `master` | Normalized/computed data for CRM | `pricebook_materials`, `pricebook_categories` |
| `crm` | Local overrides & pending changes | `pricebook_overrides`, `pricebook_new_materials` |

### ServiceTitan Integration

- **Tenant ID**: `3222348440` (Perfect Catch)
- **API Base**: `https://api.servicetitan.io`
- **Auth**: OAuth2 with automatic token refresh
- **Rate Limiting**: Built-in retry with exponential backoff

### Data Flow

```
ServiceTitan API → raw.* tables → master.* tables → crm.* overrides
                                                  ↓
                                            Frontend UI
                                                  ↓
                                        crm.* pending changes
                                                  ↓
                                        Push to ServiceTitan
```

## Reference Files

| File | Description |
|------|-------------|
| `reference/architecture.md` | System architecture and data flow diagrams |
| `reference/database-schemas.md` | Complete database schema reference |
| `reference/api-routes.md` | All API endpoints with examples |
| `reference/servicetitan-api.md` | ServiceTitan API integration details |
| `reference/frontend-components.md` | React component reference |
| `reference/docker-deployment.md` | Docker, Traefik, deployment |
| `reference/pricebook-system.md` | Pricebook domain knowledge |
| `reference/temporal-workflows.md` | Temporal workflow patterns |
| `reference/environment-vars.md` | All environment variables |
| `reference/troubleshooting.md` | Common issues and solutions |

## Commands

| Command | Description |
|---------|-------------|
| `/commit` | Generate conventional commit |
| `/create-prd` | Create feature PRD |
| `/end-to-end-feature` | Full feature implementation |
| `/bug-fix` | Systematic bug fixing |
| `/debug-performance` | Performance debugging |
| `/migration-create` | Create database migration |
| `/sync-servicetitan` | Trigger ST sync |
| `/pre-deploy-check` | Pre-deployment checklist |
| `/health-check` | System health check |
| `/review-pr` | Review pull request |
| `/generate-tests` | Generate tests |
| `/refactor` | Code refactoring |
| `/fix-types` | Fix TypeScript errors |

## Rules

| Rule | Description |
|------|-------------|
| `rules/coding-standards.md` | Code style and conventions |
| `rules/database-rules.md` | Database patterns and constraints |
| `rules/security-rules.md` | Security requirements |
| `rules/known-issues.md` | Known issues and workarounds |

## Environment Variables

### Required

```bash
DATABASE_URL=postgresql://...              # Supabase connection
REDIS_URL=redis://localhost:6379           # Redis for BullMQ
SERVICE_TITAN_CLIENT_ID=...                # ST OAuth client
SERVICE_TITAN_CLIENT_SECRET=...            # ST OAuth secret
SERVICE_TITAN_APP_KEY=...                  # ST app key
SERVICE_TITAN_TENANT_ID=3222348440         # ST tenant
```

### Optional

```bash
PRICEBOOK_SYNC_ENABLED=true                # Enable sync workers
CACHE_ENABLED=true                         # Enable Redis caching
BULLMQ_WORKERS_ENABLED=true                # Enable job workers
JWT_SECRET=...                             # Auth JWT secret
```

## Quick Commands

```bash
# Development
pnpm dev                    # Start all services
cd services/api && npm run dev   # API only
cd apps/web && npm run dev       # Frontend only

# Database
cd services/api && npx prisma studio   # Open Prisma Studio
psql "$DATABASE_URL"                   # Connect to database

# Docker
docker-compose up -d        # Start infrastructure
docker-compose logs -f      # View logs

# Sync
npm run sync:full           # Full ServiceTitan sync
npm run sync:incremental    # Incremental sync
```

## Important Notes for AI Agents

1. **Always check existing patterns** before implementing new features
2. **Use the three-schema architecture** - never write directly to `raw.*`
3. **ServiceTitan IDs are BigInt** - use `st_id` column naming
4. **Frontend proxies to backend** - Next.js API routes forward to Express
5. **shadcn/ui components** are in `components/ui/` - use existing ones
6. **TanStack Query** for data fetching with `useQuery`/`useMutation`
7. **Socket.io** for real-time updates during sync operations

---

*Generated from actual codebase analysis - January 2025*
