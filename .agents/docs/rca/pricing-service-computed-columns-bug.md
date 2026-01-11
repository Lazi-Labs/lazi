# RCA: Pricing Service Cannot Create New Records

## Summary
- **Description**: External pricing service at `pricing.lazilabs.com` cannot create any new records
- **Severity**: CRITICAL - All create operations blocked
- **Status**: RESOLVED - Fixed via database INSTEAD OF triggers
- **Affected Service**: `pricing.lazilabs.com`
- **Resolution Date**: 2026-01-11

## Problem

### Expected Behavior
POST requests to create technicians, office staff, vehicles, and expenses should succeed.

### Actual Behavior
ALL POST requests fail with computed column errors:
```json
{"data":null,"error":"cannot insert a non-DEFAULT value into column \"display_name\""}
```
or
```json
{"data":null,"error":"cannot insert a non-DEFAULT value into column \"is_active\""}
```

### Reproduction
```bash
# Technician - fails
curl -X POST https://pricing.lazilabs.com/api/pricing/technicians \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"Tech","role":"Technician","base_pay_rate":28}'

# Vehicle - fails
curl -X POST https://pricing.lazilabs.com/api/pricing/vehicles \
  -H "Content-Type: application/json" \
  -d '{"year":2024,"make":"Ford","model":"Transit","vin":"TEST123"}'
```

## Root Cause

### Database Schema Issue
The PostgreSQL tables have **generated columns** defined with `GENERATED ALWAYS AS`:
- `display_name` (technicians, office_staff) - computed from first_name + last_name
- `is_active` (vehicles, possibly others) - computed from status
- `calculated_*` fields - computed from other columns

### Backend Bug
The pricing service backend is including ALL fields in INSERT statements, including generated columns. PostgreSQL prohibits explicit values for `GENERATED ALWAYS` columns.

**Error source**: Supabase/Prisma ORM passing full object to insert() without filtering out generated columns.

## Proposed Fix

### Option 1: Exclude Generated Columns in Backend
```typescript
// Before (broken)
await supabase.from('technicians').insert(technicianData);

// After (fixed)
const { display_name, is_active, calculated_annual_base_pay, ...insertData } = technicianData;
await supabase.from('technicians').insert(insertData);
```

### Option 2: Alter Table to Use STORED Columns
```sql
-- Change from GENERATED ALWAYS to DEFAULT with trigger
ALTER TABLE technicians
  ALTER COLUMN display_name DROP EXPRESSION,
  ALTER COLUMN display_name SET DEFAULT '';

-- Add trigger to compute on insert/update
CREATE OR REPLACE FUNCTION compute_display_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.display_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Option 3: Use INSERT with OVERRIDING SYSTEM VALUE (not recommended)
```sql
INSERT INTO technicians (...) OVERRIDING SYSTEM VALUE VALUES (...);
```

## Impact

| Feature | Status |
|---------|--------|
| Create technician | ❌ Blocked |
| Create office staff | ❌ Blocked |
| Create vehicle | ❌ Blocked |
| Create expense | ❌ Blocked |
| Edit existing records | ✅ Works (PATCH doesn't insert) |
| Delete records | ✅ Works |
| Read records | ✅ Works |

## Frontend Status

The frontend data binding fixes implemented in `pricing-builder-panel.tsx` are correct and ready:
- ✅ Form dialogs sync state with props (useEffect)
- ✅ Toast notifications on mutations
- ✅ Hardcoded values removed from Rates tab

However, these cannot be tested until the backend is fixed.

## Resolution

### Fix Applied: Database INSTEAD OF Triggers

The issue was resolved by applying `fix-views.sql` to the Supabase database. This SQL:

1. **Recreates views** excluding generated columns from direct INSERT
2. **Creates INSTEAD OF INSERT triggers** on all views that:
   - Insert into the underlying `pricing.*` tables (not the views)
   - Return the ID, then SELECT back from the view to get the complete row with computed columns
3. **Grants permissions** on both views and underlying tables

### SQL Applied
```bash
PGPASSWORD='***' psql "postgresql://postgres@db.cvqduvqzkvqnjouuzldk.supabase.co:6543/postgres" \
  -f /opt/docker/apps/lazi/apps/pricing-system/fix-views.sql

# Additional permissions grant:
GRANT USAGE ON SCHEMA pricing TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA pricing TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pricing TO anon, authenticated, service_role;
```

### Verification
All POST endpoints now work:
- ✅ `POST /api/pricing/technicians` - Creates technician with computed `display_name`
- ✅ `POST /api/pricing/vehicles` - Creates vehicle with computed `is_active`, `calculated_*` fields
- ✅ `POST /api/pricing/office-staff` - Creates staff with computed `display_name`
- ✅ `POST /api/pricing/expenses` - Creates expense categories

## Files Modified

| File | Changes |
|------|---------|
| `apps/pricing-system/fix-views.sql` | Updated INSERT triggers to use `RETURNING id INTO new_id` + `SELECT * FROM view` pattern |

## Original Analysis (Historical)

**The original root cause analysis below is preserved for reference.**

---

## Action Required (COMPLETED)

~~**The pricing service at `pricing.lazilabs.com` needs to be updated**~~ Fixed via database triggers.

## Files Affected (External)

~~The fix needs to be applied to the pricing service repository~~ - No code changes needed. Database triggers handle the conversion.
