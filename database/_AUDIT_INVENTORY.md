# Supabase Database Audit Inventory

**Generated:** January 11, 2025  
**Total Tables:** 169  
**Total Schemas:** 8 (audit, crm, master, pricing, public, raw, sync, workflow)

---

## Summary by Schema

| Schema | Tables | With Data | Empty |
|--------|--------|-----------|-------|
| audit | 9 | 0 | 9 |
| crm | 16 | 7 | 9 |
| master | 17 | 9 | 8 |
| pricing | 14 | 10 | 4 |
| public | 54 | 5 | 49 |
| raw | 25 | 8 | 17 |
| sync | 5 | 0 | 5 |
| workflow | 8 | 2 | 6 |

---

## Tables with Data (Active)

### crm schema (7 tables with data)
| Table | Rows | Code References | Status |
|-------|------|-----------------|--------|
| pricebook_overrides | 11 | Yes (14 refs) | **ACTIVE** |
| pricebook_new_materials | 7 | Yes (9 refs) | **ACTIVE** |
| pipeline_stages | 7 | Yes (4 refs) | **ACTIVE** |
| pricebook_service_edits | 4 | Yes (8 refs) | **ACTIVE** |
| pricebook_new_services | 3 | Yes (3 refs) | **ACTIVE** |
| pipelines | 1 | Yes (3 refs) | **ACTIVE** |

### master schema (9 tables with data)
| Table | Rows | Code References | Status |
|-------|------|-----------------|--------|
| pricebook_materials | 6011 | Yes (26 refs) | **ACTIVE** |
| pricebook_services | 2164 | Yes (28 refs) | **ACTIVE** |
| pricebook_subcategories | 1439 | Yes (21 refs) | **ACTIVE** |
| pricebook_equipment | 278 | Yes (15 refs) | **ACTIVE** |
| pricebook_categories | 104 | Yes (47 refs) | **ACTIVE** |
| material_kit_items | 14 | Yes (5 refs) | **ACTIVE** |
| material_kits | 10 | Yes (4 refs) | **ACTIVE** |
| material_kit_groups | 6 | Yes (4 refs) | **ACTIVE** |

### pricing schema (10 tables with data)
| Table | Rows | Code References | Status |
|-------|------|-----------------|--------|
| expense_items | 17 | Yes (8 refs) | **ACTIVE** |
| technician_unproductive_time | 16 | Yes (7 refs) | **ACTIVE** |
| expense_categories | 14 | Yes (8 refs) | **ACTIVE** |
| vehicles | 8 | Yes (15 refs) | **ACTIVE** |
| unproductive_time_categories | 7 | Yes | **ACTIVE** |
| markup_tiers | 4 | Yes | **ACTIVE** |
| technicians | 4 | Yes (7 refs) | **ACTIVE** |
| job_types | 3 | Yes | **ACTIVE** |
| office_staff | 3 | Yes (6 refs) | **ACTIVE** |
| organizations | 1 | Yes | **ACTIVE** |

### public schema (5 tables with data)
| Table | Rows | Code References | Status |
|-------|------|-----------------|--------|
| bank_transactions | 695 | Yes (8 refs) | **ACTIVE** |
| app_sessions | 6 | Yes (6 refs) | **ACTIVE** |
| plaid_accounts | 4 | Yes (2 refs) | **ACTIVE** |
| app_users | 2 | Yes (7 refs) | **ACTIVE** |
| plaid_items | 1 | Yes (4 refs) | **ACTIVE** |

### raw schema (8 tables with data)
| Table | Rows | Code References | Status |
|-------|------|-----------------|--------|
| st_appointment_assignments | 6311 | Yes (6 refs) | **ACTIVE** |
| st_pricebook_materials | 5719 | Yes (15 refs) | **ACTIVE** |
| st_pricebook_services | 2161 | Yes (16 refs) | **ACTIVE** |
| st_pricebook_equipment | 292 | Yes (12 refs) | **ACTIVE** |
| st_pricebook_categories | 104 | Yes (21 refs) | **ACTIVE** |
| sync_state | 22 | Yes (6 refs) | **ACTIVE** |
| st_zones | 12 | Yes (3 refs) | **ACTIVE** |
| st_teams | 6 | Yes (3 refs) | **ACTIVE** |

### workflow schema (2 tables with data)
| Table | Rows | Code References | Status |
|-------|------|-----------------|--------|
| messaging_templates | 5 | Yes (12 refs) | **ACTIVE** |
| templates | 4 | Yes | **ACTIVE** |

---

## Empty Tables Analysis

### audit schema (9 empty tables)
| Table | Rows | Code References | Status |
|-------|------|-----------------|--------|
| api_log | 0 | Yes (implicit) | **KEEP** - Logging infrastructure |
| api_log_2024 | 0 | Partition | **KEEP** - Partition table |
| api_log_2025 | 0 | Partition | **KEEP** - Partition table |
| api_log_2026 | 0 | Partition | **KEEP** - Partition table |
| change_log | 0 | Yes (9 refs) | **KEEP** - Audit infrastructure |
| change_log_2024 | 0 | Partition | **KEEP** - Partition table |
| change_log_2025 | 0 | Partition | **KEEP** - Partition table |
| change_log_2026 | 0 | Partition | **KEEP** - Partition table |
| error_log | 0 | Yes (implicit) | **KEEP** - Error logging |

### crm schema (9 empty tables)
| Table | Rows | Code References | Status |
|-------|------|-----------------|--------|
| activities | 0 | Yes | **KEEP** - CRM feature |
| contacts | 0 | Yes (9 refs) | **KEEP** - CRM feature |
| opportunities | 0 | Yes (12 refs) | **KEEP** - CRM feature |
| pricebook_achievements | 0 | Yes | **KEEP** - Gamification feature |
| pricebook_audit_log | 0 | Yes | **KEEP** - Pricebook audit |
| pricebook_category_suggestions | 0 | Yes | **KEEP** - AI suggestions |
| pricebook_duplicate_groups | 0 | Yes | **KEEP** - Dedup feature |
| pricebook_new_equipment | 0 | Yes (7 refs) | **KEEP** - New equipment staging |
| pricebook_progress | 0 | Yes | **KEEP** - Progress tracking |
| pricebook_saved_views | 0 | Yes | **KEEP** - User saved views |

### master schema (8 empty tables)
| Table | Rows | Code References | Status |
|-------|------|-----------------|--------|
| business_units | 0 | Yes (4 refs) | **KEEP** - ST sync target |
| campaigns | 0 | Yes | **KEEP** - ST sync target |
| customers | 0 | Yes (7 refs) | **KEEP** - ST sync target |
| estimates | 0 | Yes (3 refs) | **KEEP** - ST sync target |
| invoices | 0 | Yes (4 refs) | **KEEP** - ST sync target |
| job_types | 0 | Yes | **KEEP** - ST sync target |
| jobs | 0 | Yes (5 refs) | **KEEP** - ST sync target |
| locations | 0 | Yes | **KEEP** - ST sync target |
| material_kit_includes | 0 | Yes (3 refs) | **KEEP** - Kit feature |
| pricebook_items | 0 | Unclear | **INVESTIGATE** - May be legacy |
| tag_types | 0 | Yes | **KEEP** - ST sync target |
| technicians | 0 | Yes | **KEEP** - ST sync target |
| zones | 0 | Yes | **KEEP** - ST sync target |

### pricing schema (4 empty tables)
| Table | Rows | Code References | Status |
|-------|------|-----------------|--------|
| audit_log | 0 | Yes | **KEEP** - Pricing audit |
| scenarios | 0 | Yes | **KEEP** - Pricing scenarios |
| settings | 0 | Yes | **KEEP** - Pricing settings |
| users | 0 | Yes | **KEEP** - Pricing app users |

### public schema (49 empty tables) - MAIN CLEANUP CANDIDATES

#### ServiceTitan Raw Tables (Duplicates of raw.* schema)
| Table | Rows | Status | Recommendation |
|-------|------|--------|----------------|
| raw_st_appointment_assignments | 0 | **DUPLICATE** | DELETE - Use raw.st_appointment_assignments |
| raw_st_appointments | 0 | **DUPLICATE** | DELETE - Use raw.st_appointments |
| raw_st_business_units | 0 | **DUPLICATE** | DELETE - Use raw.st_business_units |
| raw_st_campaigns | 0 | **DUPLICATE** | DELETE - Use raw.st_campaigns |
| raw_st_customer_contacts | 0 | **DUPLICATE** | DELETE - Use raw.st_customer_contacts |
| raw_st_customers | 0 | **DUPLICATE** | DELETE - Use raw.st_customers |
| raw_st_employees | 0 | **DUPLICATE** | DELETE - Use raw.st_employees |
| raw_st_estimates | 0 | **DUPLICATE** | DELETE - Use raw.st_estimates |
| raw_st_installed_equipment | 0 | **DUPLICATE** | DELETE - Use raw.st_installed_equipment |
| raw_st_invoices | 0 | **DUPLICATE** | DELETE - Use raw.st_invoices |
| raw_st_job_types | 0 | **DUPLICATE** | DELETE - Use raw.st_job_types |
| raw_st_jobs | 0 | **DUPLICATE** | DELETE - Use raw.st_jobs |
| raw_st_location_contacts | 0 | **DUPLICATE** | DELETE - Use raw.st_location_contacts |
| raw_st_locations | 0 | **DUPLICATE** | DELETE - Use raw.st_locations |
| raw_st_payments | 0 | **DUPLICATE** | DELETE - Use raw.st_payments |
| raw_st_pricebook_categories | 0 | **DUPLICATE** | DELETE - Use raw.st_pricebook_categories |
| raw_st_pricebook_equipment | 0 | **DUPLICATE** | DELETE - Use raw.st_pricebook_equipment |
| raw_st_pricebook_materials | 0 | **DUPLICATE** | DELETE - Use raw.st_pricebook_materials |
| raw_st_pricebook_services | 0 | **DUPLICATE** | DELETE - Use raw.st_pricebook_services |
| raw_st_tag_types | 0 | **DUPLICATE** | DELETE - Use raw.st_tag_types |
| raw_st_teams | 0 | **DUPLICATE** | DELETE - Use raw.st_teams |
| raw_st_technicians | 0 | **DUPLICATE** | DELETE - Use raw.st_technicians |
| raw_st_zones | 0 | **DUPLICATE** | DELETE - Use raw.st_zones |
| raw_sync_state | 0 | **DUPLICATE** | DELETE - Use raw.sync_state |

#### ServiceTitan st_* Tables (Duplicates of raw.* schema)
| Table | Rows | Status | Recommendation |
|-------|------|--------|----------------|
| st_appointments | 0 | **DUPLICATE** | DELETE - Use raw.st_appointments |
| st_business_units | 0 | **DUPLICATE** | DELETE - Use raw.st_business_units |
| st_call_reasons | 0 | Unclear | **INVESTIGATE** |
| st_campaigns | 0 | **DUPLICATE** | DELETE - Use raw.st_campaigns |
| st_custom_fields | 0 | Unclear | **INVESTIGATE** |
| st_customers | 0 | **DUPLICATE** | DELETE - Use raw.st_customers |
| st_employees | 0 | **DUPLICATE** | DELETE - Use raw.st_employees |
| st_estimates | 0 | **DUPLICATE** | DELETE - Use raw.st_estimates |
| st_installed_equipment | 0 | **DUPLICATE** | DELETE - Use raw.st_installed_equipment |
| st_invoices | 0 | **DUPLICATE** | DELETE - Use raw.st_invoices |
| st_job_types | 0 | **DUPLICATE** | DELETE - Use raw.st_job_types |
| st_jobs | 0 | **DUPLICATE** | DELETE - Use raw.st_jobs |
| st_locations | 0 | **DUPLICATE** | DELETE - Use raw.st_locations |
| st_payments | 0 | **DUPLICATE** | DELETE - Use raw.st_payments |
| st_sync_log | 0 | Yes (8 refs) | **KEEP** - Sync logging |
| st_tag_types | 0 | **DUPLICATE** | DELETE - Use raw.st_tag_types |
| st_technicians | 0 | **DUPLICATE** | DELETE - Use raw.st_technicians |

#### GHL Integration Tables
| Table | Rows | Code References | Recommendation |
|-------|------|-----------------|----------------|
| ghl_contacts | 0 | Yes | **KEEP** - GHL integration |
| ghl_opportunities | 0 | Yes | **KEEP** - GHL integration |
| ghl_pipeline_mapping | 0 | Yes | **KEEP** - GHL integration |
| ghl_sync_log | 0 | Yes | **KEEP** - GHL integration |
| ghl_webhook_events | 0 | Yes | **KEEP** - GHL integration |

#### Scheduling Tables
| Table | Rows | Code References | Recommendation |
|-------|------|-----------------|----------------|
| scheduling_arrival_windows | 0 | Yes | **KEEP** - Scheduling feature |
| scheduling_audit_log | 0 | Yes | **KEEP** - Scheduling feature |
| scheduling_availability_cache | 0 | Yes | **KEEP** - Scheduling feature |
| scheduling_business_hours | 0 | Yes | **KEEP** - Scheduling feature |
| scheduling_capacity_cache | 0 | Yes | **KEEP** - Scheduling feature |
| scheduling_job_profiles | 0 | Yes | **KEEP** - Scheduling feature |
| scheduling_job_types | 0 | Yes | **KEEP** - Scheduling feature |
| scheduling_rules | 0 | Yes | **KEEP** - Scheduling feature |
| scheduling_sync_log | 0 | Yes | **KEEP** - Scheduling feature |
| scheduling_technician_skills | 0 | Yes | **KEEP** - Scheduling feature |
| scheduling_zone_travel_times | 0 | Yes | **KEEP** - Scheduling feature |

#### Other Public Tables
| Table | Rows | Code References | Recommendation |
|-------|------|-----------------|----------------|
| app_password_reset_tokens | 0 | Yes | **KEEP** - Auth feature |
| callrail_calls | 0 | Yes (11 refs) | **KEEP** - CallRail integration |
| callrail_conversion_log | 0 | Yes | **KEEP** - CallRail integration |
| chat_sessions | 0 | Yes | **KEEP** - Chat feature |
| customer_communication_preferences | 0 | Yes (6 refs) | **KEEP** - Customer prefs |
| messaging_log | 0 | Yes (9 refs) | **KEEP** - Messaging feature |
| messaging_templates | 0 | Yes (12 refs) | **KEEP** - Messaging feature |
| workflow_definitions | 0 | Yes (9 refs) | **KEEP** - Workflow feature |
| workflow_instances | 0 | Yes (14 refs) | **KEEP** - Workflow feature |
| workflow_step_executions | 0 | Yes | **KEEP** - Workflow feature |

### raw schema (17 empty tables)
| Table | Rows | Status | Recommendation |
|-------|------|--------|----------------|
| st_appointments | 0 | Yes (8 refs) | **KEEP** - ST sync target |
| st_business_units | 0 | Yes (4 refs) | **KEEP** - ST sync target |
| st_campaigns | 0 | Yes | **KEEP** - ST sync target |
| st_customer_contacts | 0 | Yes (4 refs) | **KEEP** - ST sync target |
| st_customers | 0 | Yes (5 refs) | **KEEP** - ST sync target |
| st_employees | 0 | Yes | **KEEP** - ST sync target |
| st_estimates | 0 | Yes | **KEEP** - ST sync target |
| st_installed_equipment | 0 | Yes | **KEEP** - ST sync target |
| st_invoices | 0 | Yes | **KEEP** - ST sync target |
| st_job_types | 0 | Yes | **KEEP** - ST sync target |
| st_jobs | 0 | Yes (4 refs) | **KEEP** - ST sync target |
| st_location_contacts | 0 | Yes | **KEEP** - ST sync target |
| st_locations | 0 | Yes (4 refs) | **KEEP** - ST sync target |
| st_payments | 0 | Yes | **KEEP** - ST sync target |
| st_tag_types | 0 | Yes | **KEEP** - ST sync target |
| st_technicians | 0 | Yes (6 refs) | **KEEP** - ST sync target |

### sync schema (5 empty tables)
| Table | Rows | Code References | Recommendation |
|-------|------|-----------------|----------------|
| conflicts | 0 | Yes | **KEEP** - Sync infrastructure |
| entity_hashes | 0 | Yes | **KEEP** - Sync infrastructure |
| inbound_log | 0 | Yes | **KEEP** - Sync infrastructure |
| locks | 0 | Yes | **KEEP** - Sync infrastructure |
| outbound_queue | 0 | Yes | **KEEP** - Sync infrastructure |

### workflow schema (6 empty tables)
| Table | Rows | Code References | Recommendation |
|-------|------|-----------------|----------------|
| definitions | 0 | Yes (9 refs) | **KEEP** - Workflow feature |
| executions | 0 | Yes | **KEEP** - Workflow feature |
| field_mappings | 0 | Yes | **KEEP** - Workflow feature |
| merge_rules | 0 | Yes | **KEEP** - Workflow feature |
| stage_actions | 0 | Yes | **KEEP** - Workflow feature |
| transformations | 0 | Yes | **KEEP** - Workflow feature |

---

## Cleanup Recommendations

### SAFE TO DELETE (41 tables)

These are **duplicate tables in public schema** that mirror the `raw.*` schema. They have 0 rows and the `raw.*` versions are the authoritative source.

```sql
-- public.raw_st_* tables (24 tables) - duplicates of raw.st_*
DROP TABLE IF EXISTS public.raw_st_appointment_assignments;
DROP TABLE IF EXISTS public.raw_st_appointments;
DROP TABLE IF EXISTS public.raw_st_business_units;
DROP TABLE IF EXISTS public.raw_st_campaigns;
DROP TABLE IF EXISTS public.raw_st_customer_contacts;
DROP TABLE IF EXISTS public.raw_st_customers;
DROP TABLE IF EXISTS public.raw_st_employees;
DROP TABLE IF EXISTS public.raw_st_estimates;
DROP TABLE IF EXISTS public.raw_st_installed_equipment;
DROP TABLE IF EXISTS public.raw_st_invoices;
DROP TABLE IF EXISTS public.raw_st_job_types;
DROP TABLE IF EXISTS public.raw_st_jobs;
DROP TABLE IF EXISTS public.raw_st_location_contacts;
DROP TABLE IF EXISTS public.raw_st_locations;
DROP TABLE IF EXISTS public.raw_st_payments;
DROP TABLE IF EXISTS public.raw_st_pricebook_categories;
DROP TABLE IF EXISTS public.raw_st_pricebook_equipment;
DROP TABLE IF EXISTS public.raw_st_pricebook_materials;
DROP TABLE IF EXISTS public.raw_st_pricebook_services;
DROP TABLE IF EXISTS public.raw_st_tag_types;
DROP TABLE IF EXISTS public.raw_st_teams;
DROP TABLE IF EXISTS public.raw_st_technicians;
DROP TABLE IF EXISTS public.raw_st_zones;
DROP TABLE IF EXISTS public.raw_sync_state;

-- public.st_* tables (15 tables) - duplicates of raw.st_*
DROP TABLE IF EXISTS public.st_appointments;
DROP TABLE IF EXISTS public.st_business_units;
DROP TABLE IF EXISTS public.st_campaigns;
DROP TABLE IF EXISTS public.st_customers;
DROP TABLE IF EXISTS public.st_employees;
DROP TABLE IF EXISTS public.st_estimates;
DROP TABLE IF EXISTS public.st_installed_equipment;
DROP TABLE IF EXISTS public.st_invoices;
DROP TABLE IF EXISTS public.st_job_types;
DROP TABLE IF EXISTS public.st_jobs;
DROP TABLE IF EXISTS public.st_locations;
DROP TABLE IF EXISTS public.st_payments;
DROP TABLE IF EXISTS public.st_tag_types;
DROP TABLE IF EXISTS public.st_technicians;
```

### NEED INVESTIGATION (3 tables)

| Table | Question |
|-------|----------|
| public.st_call_reasons | Is this used? Not in raw schema |
| public.st_custom_fields | Is this used? Not in raw schema |
| master.pricebook_items | Legacy table? Superseded by pricebook_materials/services/equipment? |

### KEEP (125 tables)

All other tables are either:
- Actively used with data
- Part of core infrastructure (audit, sync, workflow)
- Integration tables (GHL, CallRail, Plaid, Scheduling)
- ST sync targets in raw.* schema

---

## Summary

```
📊 SUPABASE AUDIT COMPLETE

Total Tables: 169
├── Active (with data): 44
├── Infrastructure (keep empty): 84
├── Safe to delete (duplicates): 39
├── Need investigation: 3
└── Keep (st_sync_log): 2

🗑️ SAFE TO DELETE (39 empty duplicate tables):
- 24 public.raw_st_* tables (duplicates of raw.st_*)
- 15 public.st_* tables (duplicates of raw.st_*)

❓ NEED YOUR INPUT:
1. public.st_call_reasons (0 rows) - Keep or delete?
2. public.st_custom_fields (0 rows) - Keep or delete?
3. master.pricebook_items (0 rows) - Legacy table?

Awaiting your approval before any deletions.
```
