# Database Documentation

This directory contains database scripts, migrations, and schema documentation.

## Directory Structure

```
database/
├── scripts/          # Database utility scripts
│   ├── create-admin.sql
│   └── create-app-user.sql
└── migrations/       # Database migrations (future)
```

## Scripts

### User Management
- **scripts/create-admin.sql** - Creates admin user with full permissions
- **scripts/create-app-user.sql** - Creates application user with limited permissions

## Schema Documentation

Main schema documentation is located in:
- `/docs/CONSOLIDATED_SCHEMA.sql` - Complete database schema
- `/docs/SCHEMA_INVENTORY.md` - Schema inventory and documentation

## Running Scripts

```bash
# Create admin user
psql "$DATABASE_URL" -f database/scripts/create-admin.sql

# Create app user
psql "$DATABASE_URL" -f database/scripts/create-app-user.sql
```

## Migrations

Database migrations are managed through:
- `/services/api/scripts/run-lazi-migrations.sh` - Migration runner script
- Migration files will be stored in `migrations/` directory

## Related Documentation

- [Schema Inventory](../docs/SCHEMA_INVENTORY.md)
- [Consolidated Schema](../docs/CONSOLIDATED_SCHEMA.sql)
- [Implementation Summary](../docs/IMPLEMENTATION_SUMMARY_DEC_26_2024.md)
