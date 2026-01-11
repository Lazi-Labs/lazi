# LAZI AI Agent Context

> Quick context file for AI coding assistants to understand the project state

## Project Identity

- **Name**: LAZI AI (formerly Perfect Catch CRM)
- **Domain**: Field Service Management for Pool Service Industry
- **Primary Integration**: ServiceTitan
- **Tenant ID**: 3222348440

## Current State (January 2025)

### Active Features
- ✅ Pricebook Management (Categories, Materials, Services, Equipment)
- ✅ Material Kits (LAZI-only feature)
- ✅ Bidirectional ServiceTitan Sync
- ✅ Image Management with S3 migration
- ✅ CRM Pipelines & Opportunities
- ✅ Plaid Banking Integration
- ✅ Real-time updates via Socket.io

### In Development
- 🔄 Customer Portal (`apps/customer-portal/`)
- 🔄 Mobile App (`apps/mobile/`)
- 🔄 Advanced Scheduling

### Database Stats
- **Materials**: ~6,000 items
- **Services**: ~2,100 items
- **Equipment**: ~280 items
- **Categories**: ~100 top-level + ~1,400 subcategories

## Key Decisions

### Architecture
1. **Three-schema database**: raw → master → crm
2. **Frontend proxies to backend**: Next.js API routes forward to Express
3. **ServiceTitan is source of truth**: Local changes stored as overrides until pushed

### Technology Choices
1. **shadcn/ui**: new-york style, Lucide icons
2. **TanStack Query**: For all data fetching
3. **BullMQ**: For background jobs (not Temporal for most tasks)
4. **Prisma + raw SQL**: Prisma for simple queries, SQL for complex

### Naming Conventions
1. **st_id**: ServiceTitan entity ID (BigInt)
2. **tenant_id**: ServiceTitan tenant (string "3222348440")
3. **_at suffix**: Timestamps (created_at, updated_at)
4. **is_ prefix**: Boolean flags (is_active, is_reviewed)

## Common Tasks

### Add New Pricebook Field
1. Add column to `master.pricebook_*` table
2. Add override column to `crm.pricebook_overrides`
3. Update sync worker to map ST field
4. Update API route to include field
5. Update frontend component

### Add New API Endpoint
1. Create/update route file in `services/api/src/routes/`
2. Create Next.js proxy in `apps/web/app/api/`
3. Add to route index if new file
4. Document in API_ENDPOINTS.md

### Add New Component
1. Create in `apps/web/components/`
2. Use existing shadcn/ui components
3. Follow established patterns
4. Use TanStack Query for data

## File Locations Quick Reference

| Need | Location |
|------|----------|
| Add API route | `services/api/src/routes/` |
| Add frontend page | `apps/web/app/(dashboard)/` |
| Add component | `apps/web/components/` |
| Add migration | `database/migrations/` |
| Add hook | `apps/web/hooks/` |
| ServiceTitan client | `services/api/src/services/stClient.js` |
| Database connection | `services/api/src/db/schema-connection.js` |

## Environment Quick Check

```bash
# Required for API
DATABASE_URL          # PostgreSQL connection
REDIS_URL             # Redis for queues
SERVICE_TITAN_*       # ST credentials (4 vars)

# Required for Frontend
NEXT_PUBLIC_API_URL   # API base URL
ST_AUTOMATION_URL     # Backend URL for proxy
```

## Common Gotchas

1. **BigInt serialization**: `BigInt.prototype.toJSON` is patched in app.js
2. **Image URLs**: Use `/api/pricebook/images/` proxy, not direct ST URLs
3. **Tenant ID**: Always include `x-tenant-id` header or use default
4. **Rate limits**: ST API has 60 req/min limit - use delays in loops
5. **Subcategory images**: ST bulk API returns null - need individual fetches

## Related Documentation

- `README.md` - Overview and quick start
- `ARCHITECTURE.md` - System architecture
- `DATABASE.md` - Schema reference
- `API_ENDPOINTS.md` - All endpoints
- `PATTERNS.md` - Code conventions
- `COMMANDS.md` - Dev commands
- `SERVICETITAN.md` - ST integration
- `TROUBLESHOOTING.md` - Common issues
- `COMPONENTS.md` - UI components

---

*Context file for AI agents - January 2025*
