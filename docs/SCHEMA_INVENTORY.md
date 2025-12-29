# LAZI Database Schema Inventory

> Complete analysis of all database schemas, tables, and migrations
> Generated: December 2024

---

## Executive Summary

The LAZI (Perfect Catch CRM) project uses a **multi-schema PostgreSQL architecture** with two parallel table structures:

1. **SQL Scripts Schema** (`database/scripts/`) - Canonical schema definitions with 6 schemas
2. **Prisma Schema** (`services/api/prisma/schema.prisma`) - ORM-managed tables in public schema

The project is configured to use **Supabase** as the production database (already configured in `services/api/.env`).

---

## Schema Architecture

### Database Schemas (from `database/scripts/02_schemas.sql`)

| Schema | Purpose | Table Count |
|--------|---------|-------------|
| `raw` | Immutable ServiceTitan API data (exact JSON copies) | 24 tables |
| `master` | Merged/computed entities (denormalized for speed) | 12 tables |
| `crm` | Custom CRM tables (contacts, pipelines, opportunities) | 6 tables |
| `workflow` | Automation configurations and execution | 7 tables |
| `sync` | Queue state and sync tracking | 5 tables |
| `audit` | Change history and logging | 3 tables + partitions |

---

## RAW Schema Tables (24 tables)

Source: `database/scripts/03_raw_tables.sql`

These tables store exact copies of ServiceTitan API responses.

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `raw.st_customers` | Customer records | st_id, tenant_id, name, type, active, balance, address, custom_fields, full_data |
| `raw.st_customer_contacts` | Customer contact info | st_id, customer_id, type, value, phone_settings |
| `raw.st_locations` | Service locations | st_id, customer_id, name, address, zone_id, tax_zone_id |
| `raw.st_location_contacts` | Location contact info | st_id, location_id, type, value |
| `raw.st_jobs` | Job records | st_id, job_number, customer_id, location_id, job_status, total |
| `raw.st_appointments` | Appointment scheduling | st_id, job_id, start_time, end_time, status |
| `raw.st_appointment_assignments` | Technician assignments | appointment_id, technician_id, assigned_on |
| `raw.st_estimates` | Estimate records | st_id, job_id, customer_id, status, subtotal, tax, items |
| `raw.st_invoices` | Invoice records | st_id, job_id, customer_id, total, balance, items |
| `raw.st_payments` | Payment records | st_id, customer_id, invoice_id, payment_type, total |
| `raw.st_technicians` | Technician records | st_id, name, email, phone, business_unit_id, zone_ids |
| `raw.st_employees` | Employee records | st_id, name, email, role, business_unit_id |
| `raw.st_business_units` | Business units | st_id, name, official_name, email, phone, address |
| `raw.st_campaigns` | Marketing campaigns | st_id, name, code, category_id |
| `raw.st_job_types` | Job type definitions | st_id, name, duration, priority, business_unit_ids |
| `raw.st_tag_types` | Tag definitions | st_id, name, code, color, entity_type |
| `raw.st_zones` | Service zones | st_id, name, active |
| `raw.st_teams` | Technician teams | st_id, name, active |
| `raw.st_pricebook_categories` | Pricebook categories | st_id, name, parent_id, category_type, subcategories |
| `raw.st_pricebook_materials` | Pricebook materials | st_id, code, display_name, cost, price, categories |
| `raw.st_pricebook_services` | Pricebook services | st_id, code, display_name, price, hours, service_materials |
| `raw.st_pricebook_equipment` | Pricebook equipment | st_id, code, display_name, manufacturer, model, price |
| `raw.st_installed_equipment` | Installed equipment | st_id, location_id, customer_id, serial_number |
| `raw.sync_state` | Sync tracking | table_name, endpoint, last_full_sync, sync_status |

---

## MASTER Schema Tables (12 tables)

Source: `database/scripts/04_master_tables.sql`

Denormalized views optimized for fast queries.

| Table | Purpose | Key Computed Fields |
|-------|---------|---------------------|
| `master.customers` | Unified customer view | primary_email, primary_phone, total_jobs, lifetime_value |
| `master.jobs` | Unified job view | customer_name, job_type_name, technician_names |
| `master.estimates` | Unified estimate view | customer_name, sold_by_name, item_count |
| `master.invoices` | Unified invoice view | customer_name, paid_amount, payment_count |
| `master.technicians` | Unified technician view | business_unit_name, total_jobs, total_revenue |
| `master.pricebook_items` | Combined pricebook | item_type, margin_percent (computed) |
| `master.business_units` | Reference data | name, official_name, email, phone |
| `master.job_types` | Reference data | name, duration, priority |
| `master.campaigns` | Reference data | name, code, category_id |
| `master.tag_types` | Reference data | name, code, color, entity_type |
| `master.zones` | Reference data | name, active |
| `master.locations` | Location data | customer_id, address, zone_id |

---

## CRM Schema Tables (6 tables)

Source: `database/scripts/05_crm_tables.sql`

Custom CRM functionality not in ServiceTitan.

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `crm.contacts` | CRM contacts linked to ST customers | st_customer_id, lead_source, tags, owner_id |
| `crm.pipelines` | User-defined pipelines | name, entity_type, display_order |
| `crm.pipeline_stages` | Pipeline stages | pipeline_id, name, color, is_won, is_lost, probability_percent |
| `crm.opportunities` | Sales opportunities | contact_id, pipeline_id, stage_id, value, status |
| `crm.activities` | Activities (calls, emails, notes) | entity_type, entity_id, activity_type, scheduled_at |
| `crm.pricebook_overrides` | CRM pricebook modifications | st_pricebook_id, override_price, pending_sync |

---

## WORKFLOW Schema Tables (7 tables)

Source: `database/scripts/06_workflow_tables.sql`

Automation and workflow engine.

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `workflow.stage_actions` | Actions on pipeline transitions | stage_id, trigger_type, action_type, action_config |
| `workflow.field_mappings` | CRM ↔ ST field mappings | source_entity, source_field, dest_entity, dest_field |
| `workflow.definitions` | Reusable workflow definitions | name, trigger_type, steps, on_error |
| `workflow.executions` | Workflow run history | workflow_id, status, current_step, step_results |
| `workflow.transformations` | Data transformation rules | source_type, rules, dest_type |
| `workflow.merge_rules` | Data merge strategies | target_entity, sources, field_strategies |
| `workflow.messaging_templates` | SMS/Email templates | name, channel, body_template, required_variables |

---

## SYNC Schema Tables (5 tables)

Source: `database/scripts/07_sync_tables.sql`

Bidirectional sync tracking.

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `sync.outbound_queue` | CRM → ServiceTitan queue | entity_type, entity_id, operation, payload, status |
| `sync.inbound_log` | ServiceTitan → CRM log | sync_type, records_fetched, records_created, status |
| `sync.entity_hashes` | Change detection | entity_type, entity_id, raw_hash, master_hash, needs_push |
| `sync.locks` | Distributed locks | lock_key, locked_by, expires_at |
| `sync.conflicts` | Sync conflicts | entity_type, entity_id, conflict_type, st_data, crm_data |

---

## AUDIT Schema Tables (3 tables + partitions)

Source: `database/scripts/08_audit_tables.sql`

Change history and logging.

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `audit.change_log` | All data changes (partitioned) | schema_name, table_name, operation, old_data, new_data |
| `audit.api_log` | API request/response log (partitioned) | method, path, status_code, response_time_ms |
| `audit.error_log` | Error tracking | error_type, error_message, source, context |

**Partitions:** 2024, 2025, 2026 for both change_log and api_log

---

## Prisma Schema Tables (Public Schema)

Source: `services/api/prisma/schema.prisma`

The Prisma ORM manages tables in the **public schema**. These are the actively used tables.

### Core ServiceTitan Tables (Prisma-managed)

| Model | Table Name | Purpose |
|-------|------------|---------|
| `st_customers` | st_customers | Customer records |
| `st_locations` | st_locations | Service locations |
| `st_jobs` | st_jobs | Job records |
| `st_appointments` | st_appointments | Appointments |
| `st_estimates` | st_estimates | Estimates |
| `st_invoices` | st_invoices | Invoices |
| `st_payments` | st_payments | Payments |
| `st_technicians` | st_technicians | Technicians |
| `st_employees` | st_employees | Employees |
| `st_business_units` | st_business_units | Business units |
| `st_campaigns` | st_campaigns | Campaigns |
| `st_job_types` | st_job_types | Job types |
| `st_tag_types` | st_tag_types | Tag types |
| `st_custom_fields` | st_custom_fields | Custom field definitions |
| `st_call_reasons` | st_call_reasons | Call reasons |
| `st_installed_equipment` | st_installed_equipment | Installed equipment |

### Raw Tables (Prisma-managed, prefixed with `raw_st_`)

| Model | Purpose |
|-------|---------|
| `raw_st_customers` | Raw customer data |
| `raw_st_locations` | Raw location data |
| `raw_st_jobs` | Raw job data |
| `raw_st_appointments` | Raw appointment data |
| `raw_st_estimates` | Raw estimate data |
| `raw_st_invoices` | Raw invoice data |
| `raw_st_payments` | Raw payment data |
| `raw_st_technicians` | Raw technician data |
| `raw_st_employees` | Raw employee data |
| `raw_st_business_units` | Raw business unit data |
| `raw_st_campaigns` | Raw campaign data |
| `raw_st_job_types` | Raw job type data |
| `raw_st_customer_contacts` | Raw customer contacts |
| `raw_st_location_contacts` | Raw location contacts |
| `raw_st_pricebook_categories` | Raw pricebook categories |
| `raw_st_pricebook_materials` | Raw pricebook materials |
| `raw_st_pricebook_services` | Raw pricebook services |
| `raw_st_pricebook_equipment` | Raw pricebook equipment |
| `raw_st_installed_equipment` | Raw installed equipment |
| `raw_st_tag_types` | Raw tag types |
| `raw_st_teams` | Raw teams |
| `raw_st_zones` | Raw zones |
| `raw_sync_state` | Sync state tracking |

### GHL (GoHighLevel) Integration Tables

| Model | Purpose |
|-------|---------|
| `GhlContact` | GHL contacts synced to ST |
| `GhlOpportunity` | GHL opportunities |
| `GhlPipelineMapping` | Pipeline mappings |
| `GhlSyncLog` | GHL sync logs |
| `GhlWebhookEvent` | GHL webhook events |

### CallRail Integration Tables

| Model | Purpose |
|-------|---------|
| `callrail_calls` | Call tracking data |
| `callrail_conversion_log` | Google Ads conversion tracking |

### Workflow Tables

| Model | Purpose |
|-------|---------|
| `workflow_definitions` | Workflow definitions |
| `workflow_instances` | Running workflow instances |
| `workflow_step_executions` | Step execution history |

### Messaging Tables

| Model | Purpose |
|-------|---------|
| `messaging_log` | SMS/Email send log |
| `messaging_templates` | Message templates |
| `customer_communication_preferences` | Opt-out preferences |

### Scheduling Tables

| Model | Purpose |
|-------|---------|
| `scheduling_job_types` | Job type scheduling config |
| `scheduling_job_profiles` | Job duration/skill profiles |
| `scheduling_technician_skills` | Technician skill matrix |
| `scheduling_business_hours` | Business hours |
| `scheduling_arrival_windows` | Arrival windows |
| `scheduling_rules` | Scheduling rules |
| `scheduling_zone_travel_times` | Zone-to-zone travel times |
| `scheduling_availability_cache` | Technician availability cache |
| `scheduling_capacity_cache` | Capacity cache |
| `scheduling_audit_log` | Scheduling audit log |
| `scheduling_sync_log` | Scheduling sync log |

### Chat Tables

| Model | Purpose |
|-------|---------|
| `ChatSession` | AI chat sessions |

### Sync Tables

| Model | Purpose |
|-------|---------|
| `st_sync_log` | ServiceTitan sync log |

---

## Database Extensions Required

Source: `database/scripts/01_extensions.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Trigram text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- GIN index support
CREATE EXTENSION IF NOT EXISTS "vector";     -- Vector embeddings (may not be available in Supabase)
```

**Supabase Compatibility:**
- ✅ `uuid-ossp` - Available
- ✅ `pg_trgm` - Available
- ✅ `btree_gin` - Available
- ⚠️ `vector` - Available via pgvector extension (needs to be enabled)

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ServiceTitan API                              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SYNC WORKERS (Inbound)                            │
│  - pricebook-category-sync.js                                        │
│  - servicetitan-sync/ (customers, jobs, invoices, etc.)             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RAW TABLES (Prisma)                             │
│  raw_st_customers, raw_st_jobs, raw_st_pricebook_*, etc.            │
│  Immutable copies of ST API responses                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (Triggers / Workers)
┌─────────────────────────────────────────────────────────────────────┐
│                      MASTER TABLES                                   │
│  Denormalized, query-optimized views                                 │
│  (Currently using Prisma st_* tables with computed fields)          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API ROUTES                                    │
│  Express.js routes serving data to frontend                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CRM / WORKFLOW TABLES                             │
│  User modifications, pipelines, opportunities                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (Outbound Sync)
┌─────────────────────────────────────────────────────────────────────┐
│                    SYNC OUTBOUND QUEUE                               │
│  Push CRM changes back to ServiceTitan                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Locations Summary

| Component | Path |
|-----------|------|
| SQL Schema Scripts | `database/scripts/01-11_*.sql` |
| SQL Migrations | `database/migrations/*.sql` |
| Prisma Schema | `services/api/prisma/schema.prisma` |
| DB Connection (Prisma) | `services/api/src/db/prisma.js` |
| DB Connection (pg Pool) | `services/api/src/db/schema-connection.js` |
| Sync Workers | `services/api/src/workers/` |
| API Routes | `services/api/src/routes/` |
| Environment Config | `services/api/.env` |

---

## Current Database Configuration

**Production (Supabase):**
```
DATABASE_URL=postgresql://postgres.cvqduvqzkvqnjouuzldk:Catchadmin202525@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require
```

**Local Development:**
```
DATABASE_URL=postgresql://postgres:perfectcatch2025@localhost:5432/perfectcatch
```

---

## Known Issues & Recommendations

### 1. Dual Schema System
The project has both SQL scripts (`database/scripts/`) and Prisma schema. The Prisma schema is the actively used one, while SQL scripts define the ideal architecture.

**Recommendation:** Consolidate to use Prisma as the source of truth, or migrate SQL scripts to Prisma migrations.

### 2. Schema Naming Inconsistency
- SQL scripts use schemas: `raw`, `master`, `crm`, `workflow`, `sync`, `audit`
- Prisma uses `public` schema with `raw_st_*` prefix for raw tables

**Recommendation:** Either use Prisma's `@@schema()` directive or keep all tables in public schema with clear naming conventions.

### 3. Vector Extension
The `vector` extension is used but may require explicit enabling in Supabase.

**Recommendation:** Enable pgvector in Supabase dashboard before migration.

---

## Next Steps

1. Run Prisma migrations against Supabase
2. Verify all tables exist
3. Sync data from ServiceTitan
4. Test API endpoints
