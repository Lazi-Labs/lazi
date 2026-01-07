# LAZI CRM

> **AI-Powered Field Service Management Platform with ServiceTitan Integration**

LAZI CRM is a comprehensive field service management platform that seamlessly integrates with ServiceTitan, providing intelligent automation, real-time synchronization, and advanced analytics for service businesses.

---

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone git@github.com:Lazi-Labs/lazi.git
cd lazi

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Start local services (Redis)
docker-compose -f docker-compose.local.yml up -d

# Start development servers
pnpm dev
```

**Access the application:**
- **Web App**: http://localhost:3000
- **API**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health

### Production Deployment

See **[Local Development Setup Guide](local-dev-backup/LOCAL_DEVELOPMENT_SETUP.md)** for migrating from production to local development.

---

## 📁 Project Structure

```
lazi/
├── apps/
│   └── web/                    # Next.js Frontend (React, TailwindCSS)
├── services/
│   ├── api/                    # Express.js API Server
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── controllers/    # Business logic
│   │   │   ├── services/       # ServiceTitan integration
│   │   │   ├── sync/           # Data synchronization engines
│   │   │   ├── workers/        # Background job workers
│   │   │   └── utils/          # Utilities & helpers
│   │   └── tests/              # API tests
│   └── mcp-server/             # Model Context Protocol Server (AI Tools)
├── workers/
│   └── temporal/               # Temporal Workflows (optional)
├── packages/                   # Shared packages & utilities
├── database/                   # Database management
│   ├── scripts/                # SQL utility scripts
│   └── migrations/             # Database migrations
├── config/                     # Configuration files
│   ├── grafana/                # Grafana dashboards
│   ├── prometheus/             # Prometheus monitoring
│   ├── temporal/               # Temporal config
│   └── ecosystem.config.js     # PM2 process manager
├── docs/                       # Documentation
│   ├── deployment/             # Deployment guides
│   ├── setup/                  # Setup & configuration
│   ├── troubleshooting/        # Issue resolution
│   ├── infrastructure/         # Infrastructure docs
│   └── api/                    # API documentation
├── local-dev-backup/           # Local development migration package
│   ├── LOCAL_DEVELOPMENT_SETUP.md
│   ├── QUICK_CHECKLIST.md
│   ├── docker-compose.local.yml
│   ├── preflight-check.sh
│   ├── convert-env.sh
│   └── env.local.template
└── infrastructure/
    └── docker/                 # Docker configurations
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **State Management**: React Context + Hooks
- **Real-time**: Socket.io Client

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **Cache/Queue**: Redis + BullMQ
- **Real-time**: Socket.io
- **API Integration**: ServiceTitan REST API

### Infrastructure
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Cache**: Redis 7
- **Queue**: BullMQ
- **Monitoring**: Grafana + Prometheus
- **Analytics**: Metabase
- **Workflows**: Temporal (optional)

---

## 🌐 Services & Ports

| Service | Local URL | Port | Description |
|---------|-----------|------|-------------|
| **Web App** | http://localhost:3000 | 3000 | Next.js frontend |
| **API Server** | http://localhost:3001 | 3001 | Express.js backend |
| **Redis** | localhost:6379 | 6379 | Cache & job queue |
| **Temporal UI** | http://localhost:8088 | 8088 | Workflow engine UI |
| **Grafana** | http://localhost:3031 | 3031 | Monitoring dashboards |
| **Prometheus** | http://localhost:9090 | 9090 | Metrics collection |
| **Metabase** | http://localhost:3030 | 3030 | Business analytics |

**Production URLs:**
- **Web**: https://app.lazilabs.com
- **API**: https://api.lazilabs.com

---

## 📋 Available Commands

### Development

```bash
# Start all services in development mode
pnpm dev

# Start individual services
pnpm dev:web          # Next.js frontend only
pnpm dev:api          # Express API only

# Build for production
pnpm build            # Build all apps
pnpm build:web        # Build web app only
pnpm build:api        # Build API only

# Run tests
pnpm test             # Run all tests
pnpm test:api         # API tests only
pnpm test:web         # Frontend tests only
```

### Docker Services

```bash
# Local development (Redis only)
docker-compose -f docker-compose.local.yml up -d
docker-compose -f docker-compose.local.yml down

# Full stack (all services)
docker-compose up -d
docker-compose down

# Production
docker-compose -f docker-compose.production.yml up -d
```

### Database

```bash
# Run migrations
cd services/api
pnpm prisma migrate dev

# Generate Prisma client
pnpm prisma generate

# Open Prisma Studio
pnpm prisma studio
```

### Production Deployment

```bash
# Start API in production mode
cd services/api
NODE_ENV=production node src/server.js

# Or use PM2
pm2 start ecosystem.config.js
pm2 status
pm2 logs
```

---

## 🔧 Configuration

### Environment Variables

Key environment variables for local development:

```bash
# Database (Supabase - unchanged from production)
DATABASE_URL=postgresql://postgres.[ref]:[password]@[host]:6543/postgres

# Redis (local)
REDIS_URL=redis://localhost:6379

# ServiceTitan API (unchanged from production)
SERVICE_TITAN_CLIENT_ID=your_client_id
SERVICE_TITAN_CLIENT_SECRET=your_client_secret
SERVICE_TITAN_APP_KEY=your_app_key
DEFAULT_TENANT_ID=your_tenant_id

# API URLs (local)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Node Environment
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

See **[env.local.template](local-dev-backup/env.local.template)** for complete configuration.

---

## 📚 Documentation

### Getting Started
- **[Local Development Setup](local-dev-backup/LOCAL_DEVELOPMENT_SETUP.md)** - Complete migration guide
- **[Quick Checklist](local-dev-backup/QUICK_CHECKLIST.md)** - Quick reference for daily development
- **[Quick Reference](docs/QUICK_REFERENCE.md)** - Essential commands and info

### Deployment & Operations
- **[Deployment Guides](docs/deployment/)** - Production deployment instructions
- **[Production Guide](docs/READY_FOR_PRODUCTION.md)** - Production readiness checklist
- **[Infrastructure](docs/infrastructure/)** - Infrastructure documentation

### Development
- **[Setup Guides](docs/setup/)** - Setup and configuration
- **[API Documentation](docs/api/)** - API endpoint registry
- **[Troubleshooting](docs/troubleshooting/)** - Common issues and solutions

### Project Overview
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY_DEC_26_2024.md)** - Complete project overview
- **[Category Implementation](docs/Category%20Implementation.md)** - Feature implementation details

---

## ✨ Key Features

### ServiceTitan Integration
- ✅ **Real-time Sync** - Bidirectional data synchronization
- ✅ **92% API Coverage** - 35+ validated endpoints
- ✅ **OAuth Authentication** - Secure token management
- ✅ **Webhook Support** - Real-time event processing

### Data Management
- ✅ **24 Database Tables** - Comprehensive data model
- ✅ **Automated Migrations** - Prisma ORM
- ✅ **Data Validation** - Input sanitization & validation
- ✅ **Audit Logging** - Complete change tracking

### Background Processing
- ✅ **BullMQ Queues** - Reliable job processing
- ✅ **Scheduled Sync** - Automated data updates
- ✅ **Error Handling** - Retry logic & dead letter queues
- ✅ **Job Monitoring** - Real-time queue dashboard

### Real-time Features
- ✅ **WebSocket Support** - Live updates
- ✅ **Socket.io Integration** - Bidirectional communication
- ✅ **Event Broadcasting** - Multi-client sync

### Security
- ✅ **Rate Limiting** - API protection
- ✅ **CORS Configuration** - Cross-origin security
- ✅ **Environment Isolation** - Secure credential management
- ✅ **Production Hardening** - Security best practices

### Monitoring & Analytics
- ✅ **Grafana Dashboards** - Visual monitoring
- ✅ **Prometheus Metrics** - Performance tracking
- ✅ **Metabase Analytics** - Business intelligence
- ✅ **Error Tracking** - Comprehensive logging

---

## 🚦 Current Status

**Production Ready** ✅

| Component | Status | Details |
|-----------|--------|---------|
| **API Server** | ✅ Running | Port 3001, 35+ endpoints |
| **ServiceTitan Integration** | ✅ Active | 92% API test success |
| **Database** | ✅ Stable | Supabase, 24 tables |
| **Background Jobs** | ✅ Processing | BullMQ + Redis |
| **Real-time Sync** | ✅ Active | Socket.io WebSockets |
| **Security** | ✅ Hardened | Rate limiting, CORS, validation |
| **Monitoring** | ✅ Deployed | Grafana + Prometheus |

See **[READY_FOR_PRODUCTION.md](docs/READY_FOR_PRODUCTION.md)** for complete production status.

---

## 🔄 Local Development Migration

Migrating from production to local development? We've got you covered!

The **[local-dev-backup](local-dev-backup/)** folder contains everything you need:

1. **[LOCAL_DEVELOPMENT_SETUP.md](local-dev-backup/LOCAL_DEVELOPMENT_SETUP.md)** - Comprehensive 18KB guide
2. **[QUICK_CHECKLIST.md](local-dev-backup/QUICK_CHECKLIST.md)** - One-page quick reference
3. **[docker-compose.local.yml](local-dev-backup/docker-compose.local.yml)** - Local services configuration
4. **[preflight-check.sh](local-dev-backup/preflight-check.sh)** - Pre-migration diagnostic script
5. **[convert-env.sh](local-dev-backup/convert-env.sh)** - Automated environment converter
6. **[env.local.template](local-dev-backup/env.local.template)** - Environment variable template

**Quick migration:**
```bash
cd local-dev-backup
chmod +x preflight-check.sh convert-env.sh
./preflight-check.sh
./convert-env.sh ../.env
cd ..
docker-compose -f docker-compose.local.yml up -d
pnpm dev
```

---

## 📦 Pricebook Module

The Pricebook module is a comprehensive pricing and inventory management system integrated with ServiceTitan. It provides full CRUD operations for services, materials, and categories with bidirectional sync capabilities.

### Architecture Overview

```
apps/web/
├── app/
│   ├── (dashboard)/pricebook/
│   │   ├── page.tsx                    # Main pricebook page with section routing
│   │   ├── layout.tsx                  # Pricebook layout wrapper
│   │   ├── services/[id]/page.tsx      # Service detail page route
│   │   └── materials/[id]/page.tsx     # Material detail page route
│   └── api/pricebook/
│       ├── services/route.ts           # GET/POST services
│       ├── services/[id]/route.ts      # GET/PUT/DELETE single service
│       ├── materials/route.ts          # GET/POST materials
│       ├── materials/[id]/route.ts     # GET/PUT/DELETE single material
│       ├── categories/route.ts         # GET/POST categories with tree structure
│       ├── kits/route.ts               # GET/POST material kits
│       └── kits/[id]/route.ts          # GET/PUT/DELETE single kit
└── components/pricebook/
    ├── pricebook-sidebar.tsx           # Section navigation sidebar
    ├── services-panel.tsx              # Services list with filters
    ├── materials-panel.tsx             # Materials list with filters
    ├── categories-panel.tsx            # Categories management
    ├── service-detail-page.tsx         # Full service editor (1042 lines)
    ├── material-detail-page.tsx        # Full material editor (2011 lines)
    ├── category-tree-filter.tsx        # Hierarchical category selector
    └── kits/                           # Material Kits subsystem
        ├── types.ts                    # TypeScript interfaces
        ├── KitsPage.tsx                # Kits list with grid view
        ├── KitCard.tsx                 # Kit preview card component
        ├── KitEditor.tsx               # Kit creation/editing form
        ├── KitMaterialList.tsx         # Drag-drop material list
        ├── KitSelectorModal.tsx        # Load kit into service modal
        ├── MaterialBrowser.tsx         # Two-panel material picker
        ├── WaterfallCategoryFilter.tsx # Multi-level category picker
        ├── GroupNameModal.tsx          # Material group editor
        └── KeyboardShortcutsPanel.tsx  # Shortcuts reference panel
```

### Main Components

#### Services Panel (`services-panel.tsx`)
- **Purpose**: List view of all pricebook services with filtering and search
- **Features**:
  - Search by code, name, or description
  - Category tree filter (hierarchical)
  - Price range filter
  - Duration (hours) filter
  - Active/inactive toggle
  - Has images filter
  - Image thumbnails with S3 proxy
  - Navigation to service detail page

#### Materials Panel (`materials-panel.tsx`)
- **Purpose**: List view of all pricebook materials with filtering
- **Features**:
  - Search by code, name, or description
  - Category tree filter
  - Cost/price range filters
  - Vendor filter
  - Active/inactive toggle
  - Create new material
  - Navigation to material detail page

#### Service Detail Page (`service-detail-page.tsx`)
- **Purpose**: Full CRUD editor for individual services
- **Features**:
  - Edit code, name, description, warranty
  - Pricing: price, member price, add-on price, member add-on price
  - Duration hours, taxable flag, active status
  - Category assignment
  - Upgrades and recommendations
  - **Materials tab**: Add/remove materials with quantities
  - **Equipment tab**: Add/remove equipment
  - **Load Kit**: Apply material kits with multiplier
  - Image management with S3 upload
  - **SAVE**: Save locally to CRM database
  - **PUSH**: Sync changes to ServiceTitan
  - **PULL**: Fetch latest from ServiceTitan

#### Material Detail Page (`material-detail-page.tsx`)
- **Purpose**: Full CRUD editor for individual materials
- **Features**:
  - Edit code, name, description
  - Pricing: cost, margin, sell price (calculated), member price, add-on prices
  - Multi-vendor management with preferred vendor selection
  - **Multi-image support**: Upload multiple images, carousel viewer
  - Category assignment with tree picker
  - Inventory tracking options
  - Labor & commission settings (hours, bonus, commission %)
  - Account assignment (income, asset, COGS)
  - **SAVE**: Save to local CRM with pending changes flag
  - **PUSH**: Create/update in ServiceTitan
  - **PULL**: Refresh from ServiceTitan

#### Material Kits System (`kits/`)
- **Purpose**: Reusable bundles of materials for common service tasks
- **Components**:
  - `KitsPage`: Grid view of all kits with search
  - `KitCard`: Preview card showing kit name, material count, total cost, expandable list
  - `KitEditor`: Create/edit kits with name, description, category
  - `KitMaterialList`: Drag-and-drop sortable list with groups
  - `MaterialBrowser`: Two-panel browser (categories left, materials right)
  - `KitSelectorModal`: Load kit into service with quantity multiplier
- **Features**:
  - Create material groups with custom colors
  - Drag materials between groups
  - Keyboard shortcuts (?, G, Delete, etc.)
  - Include materials from other kits
  - Duplicate kits

### API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/pricebook/services` | GET, POST | List services with filters, create new |
| `/api/pricebook/services/[id]` | GET, PUT, DELETE | Single service CRUD |
| `/api/pricebook/materials` | GET, POST | List materials with filters, create new |
| `/api/pricebook/materials/[id]` | GET, PUT, DELETE | Single material CRUD |
| `/api/pricebook/materials/[id]/pull` | POST | Pull latest from ServiceTitan |
| `/api/pricebook/materials/push` | POST | Push changes to ServiceTitan |
| `/api/pricebook/categories` | GET, POST | List categories with nested children |
| `/api/pricebook/categories/[id]` | GET | Single category with subcategories |
| `/api/pricebook/kits` | GET, POST | List/create material kits |
| `/api/pricebook/kits/[id]` | GET, PUT, DELETE | Single kit CRUD |
| `/api/pricebook/kits/[id]/duplicate` | POST | Duplicate a kit |

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Services Panel  │  Materials Panel  │  Categories  │  Kits     │
│        ↓                  ↓                 ↓             ↓      │
│  /api/pricebook/* routes (Next.js API proxy)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API (Express.js)                      │
│                    lazi-api:3001                                 │
├─────────────────────────────────────────────────────────────────┤
│  /api/pricebook/services   → services table + st_services       │
│  /api/pricebook/materials  → materials table + st_materials     │
│  /api/pricebook/categories → pb_categories + pb_subcategories   │
│  /api/pricebook/kits       → material_kits + kit_items + groups │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                         │
│                    + ServiceTitan API                            │
├─────────────────────────────────────────────────────────────────┤
│  Local CRM Tables:                                               │
│  • pb_services (local overrides)                                 │
│  • pb_materials (local overrides)                                │
│  • pb_categories, pb_subcategories                               │
│  • material_kits, kit_items, kit_groups                          │
│                                                                  │
│  ServiceTitan Sync:                                              │
│  • PUSH: Create/update items in ST via API                       │
│  • PULL: Fetch latest from ST and update local                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key TypeScript Interfaces

```typescript
// Service
interface Service {
  id: string;
  stId?: string;          // ServiceTitan ID
  code: string;
  name: string;
  description?: string;
  price: number;
  memberPrice?: number;
  addOnPrice?: number;
  durationHours?: number;
  active: boolean;
  materials?: MaterialLineItem[];
  equipment?: EquipmentLineItem[];
  categories?: CategoryTag[];
}

// Material
interface Material {
  id: string;
  stId?: string;
  code: string;
  name: string;
  cost: number;
  price: number;
  margin?: number;
  active: boolean;
  vendors?: Vendor[];
  assets?: Asset[];       // Multi-image support
  hasPendingChanges?: boolean;
  isNew?: boolean;        // Not yet in ServiceTitan
}

// Kit
interface Kit {
  id?: string;
  name: string;
  description?: string;
  categoryPath: string[];
  items?: KitMaterialItem[];
  groups?: KitGroup[];
}
```

### Image Handling

Images are stored in AWS S3 and proxied through the API:
- **S3 Bucket**: `lazi-pricebook-images`
- **Path Pattern**: `/{tenant_id}/materials/{st_id}.png`
- **Proxy Route**: `/api/images/proxy?url={encoded_url}`
- **ST Images**: `/api/images/st/{path}` (authenticated)

### Keyboard Shortcuts (Kit Editor)

| Key | Action |
|-----|--------|
| `?` | Show shortcuts panel |
| `G` | Create new group |
| `Delete` | Delete selected item |
| `↑/↓` | Navigate items |
| `Ctrl+S` | Save kit |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

Proprietary - Lazi Labs © 2024

---

## 🆘 Support

- **Documentation**: Check the [docs](docs/) folder
- **Issues**: Review [troubleshooting guide](docs/troubleshooting/)
- **Local Dev Help**: See [local-dev-backup](local-dev-backup/) folder

---

## 🎯 Roadmap

- [ ] Enhanced AI-powered estimating
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboards
- [ ] Multi-tenant support
- [ ] Expanded ServiceTitan API coverage

---

**Built with ❤️ by Lazi Labs**
