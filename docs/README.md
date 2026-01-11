# LAZI Documentation

Complete documentation for the LAZI ServiceTitan integration platform.

**Last Updated:** January 11, 2025

---

## Quick Start

| Document | Purpose |
|----------|---------|
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Essential commands and quick start |
| [architecture/PRICEBOOK_SYSTEM_ARCHITECTURE.md](architecture/PRICEBOOK_SYSTEM_ARCHITECTURE.md) | Pricebook system architecture |

---

## Directory Structure

### Core Documentation

| Directory | Contents |
|-----------|----------|
| [architecture/](architecture/) | System architecture, data flow, schema design |
| [deployment/](deployment/) | Deployment guides and status |
| [setup/](setup/) | Initial setup and credentials |
| [troubleshooting/](troubleshooting/) | Issue resolution guides |

### Feature Documentation

| Directory | Contents |
|-----------|----------|
| [workflows/](workflows/) | Sync workflows (inbound, pricebook) |
| [Pricing_system/](Pricing_system/) | Advanced pricing system documentation |
| [dashboard-setup/](dashboard-setup/) | Pricebook organization dashboard |
| [plaid-integration/](plaid-integration/) | Bank connection integration |
| [prompts/](prompts/) | AI implementation prompts |

### Reference

| Directory | Contents |
|-----------|----------|
| [api/](api/) | ServiceTitan API endpoint registries (478 endpoints) |
| [infrastructure/](infrastructure/) | Infrastructure configuration backups |
| [reference/](reference/) | Code examples and UI prototypes |
| [_archive/](_archive/) | Historical documentation |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         LAZI PLATFORM                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Next.js    │────▶│   Express    │────▶│  PostgreSQL  │    │
│  │   Frontend   │     │   API        │     │  (Supabase)  │    │
│  │   Port 3000  │     │   Port 3001  │     │              │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   BullMQ     │     │  Socket.io   │     │ServiceTitan  │    │
│  │   + Redis    │     │  Real-time   │     │   API        │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Documents

### Architecture
- [LAZI_SYSTEM_ARCHITECTURE.md](architecture/LAZI_SYSTEM_ARCHITECTURE.md) - High-level system design
- [LAZI_FULL_DIRECTORY_ARCHITECTURE.md](architecture/LAZI_FULL_DIRECTORY_ARCHITECTURE.md) - Complete directory structure
- [data-flow.md](architecture/data-flow.md) - Data flow diagrams
- [schema-design.md](architecture/schema-design.md) - Database schema design
- [master-reference.md](architecture/master-reference.md) - Complete system reference

### Deployment & Setup
- [DEPLOYMENT_COMPLETE.md](deployment/DEPLOYMENT_COMPLETE.md) - Current deployment status
- [SETUP_COMPLETE.md](setup/SETUP_COMPLETE.md) - Setup instructions
- [ADMIN_CREDENTIALS.md](setup/ADMIN_CREDENTIALS.md) - Admin access

### API Reference
- [ENDPOINT_REGISTRY_SUMMARY.md](api/ENDPOINT_REGISTRY_SUMMARY.md) - 478 ServiceTitan endpoints

---

## Project Status

| Component | Status |
|-----------|--------|
| ServiceTitan API | 92% (22/24 endpoints) |
| Database | 24 tables across 8 schemas |
| V2 API | 35+ endpoints |
| Total ST Endpoints | 478 cataloged |

---

## Support

- **ServiceTitan Tenant ID:** 3222348440
- **Production URL:** https://lazi.perfectcatchai.com
- **API URL:** https://api.lazi.perfectcatchai.com
