# LAZI Documentation

Complete documentation for the LAZI ServiceTitan integration platform.

## Primary Reference

**[CONSOLIDATED_DOCUMENTATION.md](CONSOLIDATED_DOCUMENTATION.md)** - Master reference document containing:
- System Architecture
- Database Schema (8 schemas, 24+ tables)
- ServiceTitan Integration
- Sync Engine
- Pricebook Categories System (all 4 phases)
- Provider Architecture
- API Reference
- Real-time Updates (Socket.io)
- Deployment
- Production Hardening

## Directory Structure

### `/deployment`
Deployment guides and status documentation.
- `DEPLOYMENT_COMPLETE.md` - Latest deployment status
- `MIGRATION_COMPLETE.md` - Database migration status
- `MIGRATION_STATUS.md` - Migration tracking
- `CLOUDFLARE_TUNNEL_DEPLOYMENT.md` - Cloudflare tunnel setup
- `CLOUDFLARE_TUNNEL_CLEANUP.md` - Tunnel cleanup procedures
- `TRAEFIK_DEPLOYMENT.md` - Traefik reverse proxy deployment

### `/setup`
Setup and configuration guides.
- `SETUP_COMPLETE.md` - Initial setup completion
- `FINAL_SETUP_INSTRUCTIONS.md` - Final configuration steps
- `FINAL_ACTION_REQUIRED.md` - Required actions checklist
- `ADMIN_CREDENTIALS.md` - Admin user credentials
- `DNS_SETUP_REQUIRED.md` - DNS configuration requirements

### `/troubleshooting`
Issue resolution and troubleshooting guides.
- `LOGIN_ISSUE_FIX.md` - Common login issue fixes
- `LOGIN_TROUBLESHOOTING.md` - Comprehensive login troubleshooting

### `/infrastructure`
Infrastructure configuration and backups.
- `docker-compose.production.yml.backup.20251224` - Production config backup

### `/api`
API endpoint documentation (478 endpoints across 18 domains).
- `ENDPOINT_REGISTRY_SUMMARY.md` - Overview of all endpoints
- `*.endpoint-registry.json` - 18 domain-specific registries

### Root Files
- `DIRECTORY.md` - Complete project directory reference
- `QUICK_REFERENCE.md` - Essential commands and structure
- `SCHEMA_INVENTORY.md` - Database schema inventory
- `SERVER_DEPLOYMENT.md` - Deployment instructions
- `READY_FOR_PRODUCTION.md` - Production readiness guide
- `IMPLEMENTATION_SUMMARY_DEC_26_2024.md` - Complete implementation overview

## Quick Links

| Topic | Document |
|-------|----------|
| **Full Reference** | [CONSOLIDATED_DOCUMENTATION.md](CONSOLIDATED_DOCUMENTATION.md) |
| **Production Guide** | [READY_FOR_PRODUCTION.md](READY_FOR_PRODUCTION.md) |
| **Quick Commands** | [QUICK_REFERENCE.md](QUICK_REFERENCE.md) |
| **Deployment** | [deployment/](deployment/) |
| **Setup** | [setup/](setup/) |
| **Troubleshooting** | [troubleshooting/](troubleshooting/) |
| **API Endpoints** | [api/ENDPOINT_REGISTRY_SUMMARY.md](api/ENDPOINT_REGISTRY_SUMMARY.md) |
| **Implementation Summary** | [IMPLEMENTATION_SUMMARY_DEC_26_2024.md](IMPLEMENTATION_SUMMARY_DEC_26_2024.md) |

## Project Status

| Component | Status |
|-----------|--------|
| ServiceTitan API | 92% (22/24 endpoints) |
| Database | 24 tables across 8 schemas |
| V2 API | 35+ endpoints |
| Provider System | 6 implemented / 17 planned |
| Total Endpoints | 478 cataloged |

Last Updated: December 26, 2024
