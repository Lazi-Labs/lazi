# Lazi CRM - Full Directory Architecture

**Last Updated**: December 28, 2024  
**Purpose**: Complete file-by-file directory structure and architecture reference

---

## Table of Contents

1. [Root Structure](#root-structure)
2. [Apps Directory](#apps-directory)
3. [Services Directory](#services-directory)
4. [Workers Directory](#workers-directory)
5. [Database Directory](#database-directory)
6. [Config Directory](#config-directory)
7. [Packages Directory](#packages-directory)
8. [Documentation Directory](#docs-directory)
9. [Infrastructure Directory](#infrastructure-directory)
10. [Key Configuration Files](#key-configuration-files)

---

## Root Structure

```
/opt/docker/apps/lazi/
├── apps/                    # Frontend applications
├── services/                # Backend services
├── workers/                 # Background job processors
├── database/                # Database schemas, migrations, scripts
├── config/                  # Service configurations
├── packages/                # Shared packages (monorepo)
├── docs/                    # Documentation
├── infrastructure/          # Docker and deployment configs
├── scripts/                 # Utility scripts
├── sql/                     # SQL utilities
├── temp/                    # Temporary files
├── node_modules/            # Root dependencies
├── package.json             # Root package configuration
├── pnpm-workspace.yaml      # PNPM workspace config
├── pnpm-lock.yaml           # PNPM lock file
├── turbo.json               # Turborepo configuration
├── .env                     # Environment variables
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
└── README.md                # Project overview
```

---

## Apps Directory

### Structure Overview

```
apps/
├── web/                     # Main Next.js frontend (Port 3000)
├── customer-portal/         # Customer-facing portal
├── mobile/                  # React Native mobile app
└── api/                     # Legacy API (deprecated)
```

### apps/web/ - Next.js Frontend

**Port**: 3000  
**Framework**: Next.js 14 (App Router)  
**Purpose**: Main CRM dashboard and interface

```
apps/web/
├── app/                     # Next.js App Router
│   ├── (auth)/             # Authentication routes
│   │   ├── login/
│   │   │   └── page.tsx    # Login page
│   │   └── layout.tsx      # Auth layout wrapper
│   │
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── dashboard/
│   │   │   └── page.tsx    # Main dashboard
│   │   ├── pricebook/
│   │   │   ├── page.tsx    # Pricebook main page
│   │   │   └── categories/
│   │   │       └── page.tsx # Categories management
│   │   ├── contacts/
│   │   │   ├── page.tsx    # Contacts list
│   │   │   └── [id]/
│   │   │       └── page.tsx # Contact detail
│   │   ├── pipeline/
│   │   │   ├── page.tsx    # Pipeline overview
│   │   │   └── [id]/
│   │   │       └── page.tsx # Pipeline stage detail
│   │   ├── workflows/
│   │   │   └── page.tsx    # Workflow management
│   │   ├── tasks/
│   │   │   └── page.tsx    # Task management
│   │   ├── inventory/
│   │   │   ├── page.tsx    # Inventory overview
│   │   │   └── warehouse/
│   │   │       └── [id]/
│   │   │           └── page.tsx # Warehouse detail
│   │   ├── purchasing/
│   │   │   └── vendors/
│   │   │       ├── page.tsx # Vendor list
│   │   │       └── vendor-detail-panel.tsx
│   │   ├── accounting/
│   │   │   └── transactions/
│   │   │       └── page.tsx # Transaction management
│   │   ├── settings/
│   │   │   ├── page.tsx    # Settings main
│   │   │   └── bank-connections/
│   │   │       └── page.tsx # Bank connection settings
│   │   ├── automations/
│   │   │   └── page.tsx    # Automation rules
│   │   ├── inbox/
│   │   │   └── page.tsx    # Inbox/messaging
│   │   ├── developer/
│   │   │   └── page.tsx    # Developer tools
│   │   ├── ui-kit/
│   │   │   └── page.tsx    # UI component showcase
│   │   └── layout.tsx      # Dashboard layout wrapper
│   │
│   ├── api/                # Next.js API routes (proxy layer)
│   │   ├── pricebook/
│   │   │   ├── categories/
│   │   │   │   ├── route.ts # List categories
│   │   │   │   ├── sync/
│   │   │   │   │   └── route.ts # Sync from ST
│   │   │   │   ├── push/
│   │   │   │   │   └── route.ts # Push to ST
│   │   │   │   ├── pending/
│   │   │   │   │   └── route.ts # Pending changes
│   │   │   │   └── [id]/
│   │   │   │       ├── override/
│   │   │   │       │   └── route.ts # Override category
│   │   │   │       ├── image/
│   │   │   │       │   └── route.ts # Upload image
│   │   │   │       ├── visibility/
│   │   │   │       │   └── route.ts # Toggle visibility
│   │   │   │       └── move/
│   │   │   │           └── route.ts # Move category
│   │   │   ├── subcategories/
│   │   │   │   └── [id]/
│   │   │   │       ├── override/
│   │   │   │       │   └── route.ts
│   │   │   │       └── image/
│   │   │   │           └── route.ts
│   │   │   ├── services/
│   │   │   │   ├── route.ts # List services
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts # Service detail
│   │   │   ├── materials/
│   │   │   │   ├── route.ts # List materials
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts # Material detail
│   │   │   ├── equipment/
│   │   │   │   └── route.ts # Equipment list
│   │   │   └── images/
│   │   │       ├── categories/
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts # Serve category image
│   │   │       └── subcategories/
│   │   │           └── [id]/
│   │   │               └── route.ts # Serve subcategory image
│   │   ├── images/
│   │   │   ├── db/
│   │   │   │   ├── categories/
│   │   │   │   │   └── [stId]/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── [stId]/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── materials/
│   │   │   │   │   └── [stId]/
│   │   │   │   │       └── route.ts
│   │   │   │   └── equipment/
│   │   │   │       └── [stId]/
│   │   │   │           └── route.ts
│   │   │   └── st/
│   │   │       └── [...path]/
│   │   │           └── route.ts # Proxy ST CDN
│   │   ├── opportunities/
│   │   │   ├── route.ts    # List opportunities
│   │   │   └── [id]/
│   │   │       └── route.ts # Opportunity detail
│   │   ├── pipelines/
│   │   │   └── route.ts    # Pipeline management
│   │   ├── pipeline-stages/
│   │   │   └── route.ts    # Stage management
│   │   ├── accounting/
│   │   │   ├── summary/
│   │   │   │   └── route.ts # Accounting summary
│   │   │   ├── accounts/
│   │   │   │   └── route.ts # Chart of accounts
│   │   │   └── transactions/
│   │   │       ├── route.ts # List transactions
│   │   │       └── [id]/
│   │   │           ├── route.ts # Transaction detail
│   │   │           ├── match/
│   │   │           │   └── route.ts # Match transaction
│   │   │           ├── unmatch/
│   │   │           │   └── route.ts # Unmatch transaction
│   │   │           ├── confirm/
│   │   │           │   └── route.ts # Confirm transaction
│   │   │           └── ignore/
│   │   │               └── route.ts # Ignore transaction
│   │   ├── plaid/
│   │   │   ├── create-link-token/
│   │   │   │   └── route.ts # Create Plaid link token
│   │   │   ├── exchange-token/
│   │   │   │   └── route.ts # Exchange public token
│   │   │   ├── oauth-redirect/
│   │   │   │   └── route.ts # OAuth redirect handler
│   │   │   ├── webhook/
│   │   │   │   └── route.ts # Plaid webhook
│   │   │   ├── items/
│   │   │   │   ├── route.ts # List Plaid items
│   │   │   │   └── [itemId]/
│   │   │   │       └── route.ts # Item detail
│   │   │   └── transactions/
│   │   │       └── sync/
│   │   │           └── route.ts # Sync transactions
│   │   ├── purchasing/
│   │   │   └── vendors/
│   │   │       ├── route.ts # List vendors
│   │   │       └── [id]/
│   │   │           └── route.ts # Vendor detail
│   │   └── test-services/
│   │       └── route.ts    # Service testing endpoint
│   │
│   ├── features/           # Feature-specific components
│   │   └── workflow-visualizer/
│   │       ├── components/
│   │       │   ├── WorkflowCanvas.tsx
│   │       │   ├── WorkflowToolbar.tsx
│   │       │   └── nodes/
│   │       ├── hooks/
│   │       │   ├── useNodeData.ts
│   │       │   └── useWorkflow.ts
│   │       ├── edges/
│   │       │   ├── index.ts
│   │       │   └── DataFlowEdge.tsx
│   │       └── README.md
│   │
│   ├── ui-kit/
│   │   └── page.tsx        # UI Kit showcase
│   ├── page.tsx            # Home page
│   ├── layout.tsx          # Root layout
│   ├── globals.css         # Global styles
│   └── favicon.ico         # Favicon
│
├── components/             # Reusable React components
│   ├── pricebook/
│   │   ├── categories-panel.tsx
│   │   ├── subcategories-panel.tsx
│   │   ├── services-panel.tsx
│   │   └── materials-panel.tsx
│   ├── contacts/
│   ├── pipeline/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/
│   └── dev-mode/
│       └── README.md
│
├── hooks/                  # Custom React hooks
│   ├── use-toast.ts
│   ├── use-socket.ts
│   └── use-auth.ts
│
├── lib/                    # Utility libraries
│   ├── utils.ts
│   ├── api-client.ts
│   └── socket.ts
│
├── providers/              # React context providers
│   ├── auth-provider.tsx
│   ├── socket-provider.tsx
│   └── theme-provider.tsx
│
├── stores/                 # State management (Zustand)
│   ├── pricebook-store.ts
│   ├── pipeline-store.ts
│   └── ui-store.ts
│
├── types/                  # TypeScript type definitions
│   ├── pricebook.ts
│   ├── pipeline.ts
│   └── api.ts
│
├── utils/                  # Utility functions
│   ├── format.ts
│   ├── validation.ts
│   └── helpers.ts
│
├── public/                 # Static assets
│   ├── images/
│   └── icons/
│
├── logs/                   # Application logs
│
├── .env                    # Environment variables
├── .env.local              # Local overrides
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies
└── README.md               # Web app documentation
```

### apps/customer-portal/

**Purpose**: Customer-facing portal for self-service

```
apps/customer-portal/
├── src/
├── public/
├── package.json
└── README.md
```

### apps/mobile/

**Purpose**: React Native mobile application

```
apps/mobile/
├── src/
├── android/
├── ios/
├── package.json
└── README.md
```

---

## Services Directory

### Structure Overview

```
services/
├── api/                    # Main Express.js API (Port 3001)
└── mcp-server/             # Model Context Protocol server
```

### services/api/ - Express.js Backend

**Port**: 3001  
**Framework**: Express.js  
**Purpose**: Main backend API, business logic, ServiceTitan integration

```
services/api/
├── src/
│   ├── routes/             # API route definitions
│   │   ├── index.js        # Route aggregation
│   │   ├── pricebook-categories.js
│   │   ├── pricebook-services.js
│   │   ├── pricebook-materials.js
│   │   ├── pricebook-equipment.js
│   │   ├── images.routes.js
│   │   ├── customers.js
│   │   ├── jobs.js
│   │   ├── scheduling.js
│   │   ├── dispatch.js
│   │   ├── technicians.js
│   │   ├── opportunities.js
│   │   ├── pipelines.js
│   │   ├── accounting.js
│   │   ├── plaid.js
│   │   ├── vendors.js
│   │   └── workflows.js
│   │
│   ├── controllers/        # Business logic controllers
│   │   ├── pricebook.controller.js
│   │   ├── customer.controller.js
│   │   ├── job.controller.js
│   │   └── workflow.controller.js
│   │
│   ├── services/           # Service layer (external APIs)
│   │   ├── servicetitan.service.js
│   │   ├── plaid.service.js
│   │   ├── email.service.js
│   │   └── sms.service.js
│   │
│   ├── workers/            # BullMQ workers
│   │   ├── pricebook-category-sync.js
│   │   ├── pricebook-service-sync.js
│   │   ├── customer-sync.js
│   │   ├── job-sync.js
│   │   └── image-download.js
│   │
│   ├── middleware/         # Express middleware
│   │   ├── auth.js
│   │   ├── cors.js
│   │   ├── error-handler.js
│   │   ├── rate-limiter.js
│   │   └── logger.js
│   │
│   ├── models/             # Data models
│   │   ├── pricebook.model.js
│   │   ├── customer.model.js
│   │   └── job.model.js
│   │
│   ├── utils/              # Utility functions
│   │   ├── db.js
│   │   ├── redis.js
│   │   ├── logger.js
│   │   └── helpers.js
│   │
│   ├── config/             # Configuration
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── servicetitan.js
│   │
│   ├── app.js              # Express app setup
│   └── server.js           # HTTP server & Socket.io
│
├── scripts/                # Utility scripts
│   ├── sync-pricebook-services-raw.js
│   ├── download-pricebook-images-to-postgres.js
│   ├── flatten-pricebook-categories.js
│   ├── flatten-subcategories.js
│   ├── populate-pricebook-db.js
│   ├── cleanup-pricebook-db.sql
│   ├── sync-customer-contacts-bulk.js
│   ├── sync-job-technicians.js
│   ├── get-recent-customers.js
│   ├── get-dispatch-board.js
│   ├── test-st-appointments.js
│   ├── test-v2-endpoints.sh
│   ├── test-production-hardening.sh
│   ├── smoke-test.js
│   ├── create-admin-user.js
│   ├── seed-admin.js
│   ├── run-migrations.sh
│   ├── run-lazi-migrations.sh
│   ├── verify-stage3.sh
│   ├── verify-restructure.sh
│   ├── setup-tooling.sh
│   ├── setup-salesforce.js
│   ├── generate-st-client.js
│   ├── parse-openapi.js
│   ├── gap-analysis.js
│   ├── backfill-missing.js
│   ├── debug-tech-sync.js
│   ├── download-images.js
│   ├── update-customer-contacts-from-locations.js
│   ├── run-initial-sync.js
│   ├── start-workflow-workers.js
│   ├── start-self-healing-agent.js
│   ├── test-workflow-trigger.js
│   └── decommission-perfect-catch-db.sh
│
├── tests/                  # Test files
│   ├── integration/
│   ├── unit/
│   └── e2e/
│
├── prisma/                 # Prisma ORM (if used)
│   └── schema.prisma
│
├── migrations/             # Database migrations
│
├── logs/                   # Application logs
│   ├── error.log
│   ├── combined.log
│   └── access.log
│
├── .env                    # Environment variables
├── .env.example            # Environment template
├── package.json            # Dependencies
├── Dockerfile              # Docker image
└── README.md               # API documentation
```

### services/mcp-server/ - MCP Server

**Purpose**: Model Context Protocol server for AI tool integration

```
services/mcp-server/
├── tools/                  # MCP tool definitions
│   ├── index.js           # Tool registry
│   ├── pricebook/
│   │   └── index.js       # Pricebook tools
│   ├── customers/
│   │   └── index.js       # Customer tools
│   ├── jobs/
│   │   └── index.js       # Job tools
│   ├── scheduling/
│   │   └── index.js       # Scheduling tools
│   ├── estimates/
│   │   ├── index.js
│   │   ├── get-estimate-details.js
│   │   ├── generate-estimate-from-description.js
│   │   ├── search-pricebook.js
│   │   └── add-items-to-estimate.js
│   ├── technicians/
│   │   └── index.js       # Technician tools
│   ├── equipment/
│   │   └── index.js       # Equipment tools
│   ├── workflows/
│   │   └── index.js       # Workflow tools
│   ├── integrations/
│   │   └── index.js       # Integration tools
│   ├── messaging/
│   │   └── index.js       # Messaging tools
│   ├── analytics/
│   │   └── index.js       # Analytics tools
│   ├── invoicing/
│   │   └── index.js       # Invoicing tools
│   ├── ai/
│   │   └── index.js       # AI-specific tools
│   ├── query-database.js
│   ├── call-st-api.js
│   ├── create-job.js
│   ├── schedule-appointment.js
│   ├── send-email.js
│   └── send-sms.js
│
├── services/               # Service implementations
│   ├── pricebook-ai.js
│   ├── analytics-engine.js
│   ├── route-optimizer.js
│   ├── ai-estimator.js
│   ├── nlp-parser.js
│   └── customer-intel.js
│
├── index.js                # Main MCP server
├── index.old.js            # Legacy version
├── pricebook_mcp.py        # Python implementation
├── start-mcp.sh            # Startup script
├── Dockerfile              # Docker image
├── package.json            # Dependencies
├── requirements.txt        # Python dependencies
├── claude_desktop_config.example.json
└── README.md               # MCP documentation
```

---

## Workers Directory

### workers/temporal/ - Temporal Workflows

**Purpose**: Durable workflow orchestration

```
workers/temporal/
├── workflows/              # Workflow definitions
│   └── index.js           # Workflow registry
│
├── activities/             # Activity implementations
│   ├── pricebook-sync.js
│   ├── customer-sync.js
│   └── job-sync.js
│
├── schedules/              # Scheduled workflows
│   ├── daily-sync.js
│   └── hourly-check.js
│
├── workers/                # Worker processes
│   ├── sync-worker.js
│   └── notification-worker.js
│
├── package.json
└── README.md
```

---

## Database Directory

### Structure

```
database/
├── scripts/                # Database setup scripts
│   ├── 01_extensions.sql  # PostgreSQL extensions
│   ├── 02_schemas.sql     # Schema creation
│   ├── 03_raw_tables.sql  # Raw data tables
│   ├── 04_master_tables.sql # Master data tables
│   ├── 05_crm_tables.sql  # CRM tables
│   ├── 06_workflow_tables.sql # Workflow tables
│   ├── 07_sync_tables.sql # Sync tracking tables
│   ├── 08_audit_tables.sql # Audit tables
│   ├── 09_indexes.sql     # Index definitions
│   ├── 10_triggers.sql    # Trigger definitions
│   ├── 11_seed_data.sql   # Seed data
│   ├── 12-master-schema.sql
│   ├── 13-master-triggers.sql
│   ├── 14-workflow-schema.sql
│   ├── create-admin.sql
│   └── create-app-user.sql
│
├── migrations/             # Database migrations
│   ├── 001_initial_schema.sql
│   ├── 002_add_pricebook_tables.sql
│   └── ...
│
├── prisma-migrations/      # Prisma migrations
│   └── 20251221_raw_tables/
│
├── seeds/                  # Seed data files
│   ├── users.sql
│   ├── roles.sql
│   └── permissions.sql
│
└── README.md               # Database documentation
```

### Database Schema Organization

**Schemas**:
- `raw.*` - Unprocessed data from ServiceTitan
- `master.*` - Normalized, processed data
- `crm.*` - CRM-specific data and overrides
- `sync.*` - Sync tracking and queue
- `workflow.*` - Workflow definitions and state
- `audit.*` - Audit logs and history

---

## Config Directory

### Structure

```
config/
├── grafana/                # Grafana monitoring
│   ├── dashboards/
│   │   ├── api-metrics.json
│   │   └── system-health.json
│   └── provisioning/
│       ├── datasources/
│       └── dashboards/
│
├── prometheus/             # Prometheus monitoring
│   ├── prometheus.yml
│   └── rules/
│       ├── alerts.yml
│       └── recording.yml
│
├── temporal/               # Temporal workflow engine
│   ├── config.yml
│   └── docker-compose.yml
│
├── hasura/                 # Hasura GraphQL engine
│   └── metadata/
│       ├── databases.yaml
│       ├── tables.yaml
│       └── actions.yaml
│
└── ecosystem.config.js     # PM2 process manager config
```

---

## Packages Directory

### Structure (Monorepo Shared Packages)

```
packages/
├── api-client/             # API client library
│   ├── src/
│   │   ├── index.ts
│   │   ├── pricebook.ts
│   │   ├── customers.ts
│   │   └── jobs.ts
│   ├── package.json
│   └── tsconfig.json
│
├── types/                  # Shared TypeScript types
│   ├── src/
│   │   ├── index.ts
│   │   ├── pricebook.ts
│   │   ├── customer.ts
│   │   └── job.ts
│   ├── package.json
│   └── tsconfig.json
│
├── ui/                     # Shared UI components
│   ├── src/
│   │   ├── index.ts
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── utils/                  # Shared utilities
│   ├── src/
│   │   ├── index.ts
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── helpers.ts
│   ├── package.json
│   └── tsconfig.json
│
└── workers/                # Shared worker utilities
    ├── src/
    │   ├── index.ts
    │   └── queue.ts
    ├── package.json
    └── tsconfig.json
```

---

## Docs Directory

### Structure

```
docs/
├── architecture/           # Architecture documentation
│   ├── SYSTEM_ARCHITECTURE.md
│   └── FULL_DIRECTORY_ARCHITECTURE.md (this file)
│
├── api/                    # API documentation
│   ├── README.md
│   ├── openapi.endpoint-registry.json
│   ├── tenant-jpm-v2.endpoint-registry.json
│   ├── tenant-dispatch-v2.endpoint-registry.json
│   ├── tenant-marketing-ads-v2.endpoint-registry.json
│   ├── tenant-reporting-v2.endpoint-registry.json
│   ├── tenant-forms-v2.endpoint-registry.json
│   ├── tenant-payroll-v2.endpoint-registry.json
│   └── tenant-timesheets-v2.endpoint-registry.json
│
├── deployment/             # Deployment guides
│   ├── README.md
│   ├── production.md
│   └── staging.md
│
├── setup/                  # Setup guides
│   ├── README.md
│   ├── local-development.md
│   └── environment-setup.md
│
├── troubleshooting/        # Troubleshooting guides
│   ├── README.md
│   ├── common-issues.md
│   └── debugging.md
│
├── infrastructure/         # Infrastructure docs
│   ├── README.md
│   ├── docker.md
│   └── monitoring.md
│
├── workflows/              # Workflow documentation
│   ├── inbound-sync.md
│   ├── outbound-sync.md
│   └── pricebook-sync.md
│
├── prompts/                # AI prompt templates
│   ├── master-tables/
│   │   └── pricebook-categories.md
│   └── workers/
│       └── category-sync-worker.md
│
├── plaid-integration/      # Plaid integration docs
│   ├── api/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── types/
│
├── lazi-dev-mode/          # Development mode docs
│   └── README.md
│
├── WINDSURF_CONFIG.md
├── CATEGORIES-IMPLEMENTATION-COMPLETE.md
├── PRICEBOOK-FEATURES-IMPLEMENTATION.md
├── CONSOLIDATED_SCHEMA.sql
├── QUICK_REFERENCE.md
├── READY_FOR_PRODUCTION.md
├── IMPLEMENTATION_SUMMARY_DEC_26_2024.md
└── README.md
```

---

## Infrastructure Directory

### Structure

```
infrastructure/
└── docker/                 # Docker configurations
    ├── docker-compose.yml  # Development compose
    ├── docker-compose.production.yml # Production compose
    ├── docker-compose.staging.yml # Staging compose
    ├── Dockerfile.api      # API Dockerfile
    ├── Dockerfile.web      # Web Dockerfile
    ├── Dockerfile.mcp      # MCP server Dockerfile
    └── .dockerignore       # Docker ignore rules
```

---

## Key Configuration Files

### Root Level Configuration

```
/opt/docker/apps/lazi/
├── package.json            # Root package.json (workspace)
│   {
│     "name": "lazi",
│     "private": true,
│     "workspaces": ["apps/*", "services/*", "packages/*"],
│     "scripts": {
│       "dev": "turbo run dev",
│       "build": "turbo run build",
│       "dev:web": "pnpm --filter web dev",
│       "dev:api": "pnpm --filter api dev"
│     }
│   }
│
├── pnpm-workspace.yaml     # PNPM workspace configuration
│   packages:
│     - 'apps/*'
│     - 'services/*'
│     - 'packages/*'
│     - 'workers/*'
│
├── turbo.json              # Turborepo configuration
│   {
│     "pipeline": {
│       "build": {
│         "dependsOn": ["^build"],
│         "outputs": [".next/**", "dist/**"]
│       },
│       "dev": {
│         "cache": false
│       }
│     }
│   }
│
├── .env                    # Environment variables
│   DATABASE_URL=postgresql://...
│   REDIS_URL=redis://localhost:6379
│   SERVICE_TITAN_CLIENT_ID=...
│   SERVICE_TITAN_CLIENT_SECRET=...
│   SERVICE_TITAN_APP_KEY=...
│   DEFAULT_TENANT_ID=3222348440
│   ST_AUTOMATION_URL=http://localhost:3001
│   NEXT_PUBLIC_API_URL=http://localhost:3001/api
│
└── .gitignore              # Git ignore rules
    node_modules/
    .env
    .env.local
    .next/
    dist/
    build/
    logs/
    *.log
```

---

## Port Allocation

| Service | Port | Purpose |
|---------|------|---------|
| Frontend (Next.js) | 3000 | Main web application |
| API (Express) | 3001 | Backend API server |
| Metabase | 3030 | Business intelligence |
| Grafana | 3031 | Monitoring dashboards |
| Temporal UI | 8088 | Workflow management UI |
| Prometheus | 9090 | Metrics collection |
| Supabase Studio | 54323 | Database management |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & queue |

---

## Technology Stack Summary

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Real-time**: Socket.io Client

### Backend
- **Framework**: Express.js
- **Language**: JavaScript (Node.js)
- **Database**: PostgreSQL (Supabase)
- **Cache/Queue**: Redis + BullMQ
- **Real-time**: Socket.io Server
- **Workflows**: Temporal

### Infrastructure
- **Monorepo**: Turborepo + PNPM
- **Containerization**: Docker + Docker Compose
- **Monitoring**: Prometheus + Grafana
- **Process Manager**: PM2

### External Integrations
- **ServiceTitan API**: Field service management
- **Plaid API**: Banking & accounting
- **Temporal**: Workflow orchestration

---

## File Naming Conventions

### Frontend (Next.js)
- **Pages**: `page.tsx` (App Router convention)
- **Layouts**: `layout.tsx`
- **API Routes**: `route.ts`
- **Components**: `kebab-case.tsx` or `PascalCase.tsx`
- **Hooks**: `use-hook-name.ts`
- **Types**: `type-name.ts`
- **Utilities**: `util-name.ts`

### Backend (Express)
- **Routes**: `resource-name.js` or `resource-name.routes.js`
- **Controllers**: `resource-name.controller.js`
- **Services**: `service-name.service.js`
- **Workers**: `worker-name.js` or `worker-name.worker.js`
- **Models**: `model-name.model.js`
- **Middleware**: `middleware-name.js`
- **Utils**: `util-name.js`

### Database
- **Scripts**: `##_description.sql` (numbered)
- **Migrations**: `###_migration_name.sql`
- **Seeds**: `resource-name.sql`

---

## Development Workflow

### Starting the Application

```bash
# Install dependencies
pnpm install

# Start Docker services (PostgreSQL, Redis, etc.)
docker-compose up -d

# Start all services in development mode
pnpm dev

# Or start individually
pnpm dev:web    # Frontend only (port 3000)
pnpm dev:api    # API only (port 3001)
```

### Building for Production

```bash
# Build all packages
pnpm build

# Start production API
cd services/api
NODE_ENV=production node src/server.js

# Build and start production web
cd apps/web
pnpm build
pnpm start
```

---

## Key Integration Points

### Frontend ↔ Backend
- **Proxy Layer**: Next.js API routes (`/app/api/*`) proxy to Express API
- **WebSocket**: Socket.io connection for real-time updates
- **Authentication**: JWT tokens passed in headers

### Backend ↔ Database
- **Connection**: PostgreSQL via `pg` library
- **Schemas**: Multi-schema architecture (raw, master, crm, sync)
- **Migrations**: SQL scripts in `database/scripts/`

### Backend ↔ ServiceTitan
- **Authentication**: OAuth 2.0 client credentials flow
- **Rate Limiting**: Implemented in middleware
- **Caching**: Redis cache for API responses
- **Sync**: BullMQ workers for background sync

### Backend ↔ Redis
- **Queue**: BullMQ for job processing
- **Cache**: Image cache, session cache
- **Pub/Sub**: Real-time event distribution

---

## Critical File Locations

### Authentication & Security
- `services/api/src/middleware/auth.js` - JWT authentication
- `services/api/src/middleware/rate-limiter.js` - Rate limiting
- `apps/web/providers/auth-provider.tsx` - Auth context

### Pricebook Management
- `apps/web/components/pricebook/categories-panel.tsx` - Category UI
- `services/api/src/routes/pricebook-categories.js` - Category API
- `services/api/src/workers/pricebook-category-sync.js` - Sync worker

### Image Handling
- `services/api/src/routes/images.routes.js` - Image serving
- `apps/web/app/api/pricebook/images/*/route.ts` - Image proxy

### Database Schema
- `database/scripts/03_raw_tables.sql` - Raw data tables
- `database/scripts/04_master_tables.sql` - Master tables
- `database/scripts/05_crm_tables.sql` - CRM tables

### Configuration
- `.env` - Environment variables
- `config/ecosystem.config.js` - PM2 configuration
- `turbo.json` - Turborepo build configuration

---

## Notes

- **Monorepo Structure**: Uses PNPM workspaces + Turborepo for efficient builds
- **API Versioning**: ServiceTitan API v2 endpoints
- **Database Migrations**: Sequential numbered SQL scripts
- **Real-time Updates**: Socket.io for live data synchronization
- **Background Jobs**: BullMQ workers for async processing
- **Image Strategy**: Three-tier caching (memory → database → ServiceTitan)
- **Error Handling**: Centralized error middleware with logging
- **Type Safety**: TypeScript in frontend, JSDoc in backend

---

**Document Version**: 1.0  
**Last Updated**: December 28, 2024  
**Maintained By**: Lazi Development Team
