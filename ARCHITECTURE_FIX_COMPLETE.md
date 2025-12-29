# ✅ Pricebook API Architecture Fix - COMPLETE

## Summary

Successfully implemented the three-tier architecture (raw → master → crm) for the pricebook API. The system now queries `master.*` tables with CRM override support instead of directly querying `raw.*` tables.

---

## What Was Fixed

### 1. **Database Architecture** ✅
- **Master tables created**: `master.pricebook_services`, `master.pricebook_materials`, `master.pricebook_equipment`, `master.pricebook_categories`
- **CRM overrides table**: `crm.pricebook_overrides` (unified for all item types)
- **Data synced from raw to master**:
  - Services: 2,161 rows (all active)
  - Materials: 5,523 rows (2,620 active)
  - Equipment: 278 rows (205 active)
  - Categories: 104 rows

### 2. **Backend API Routes** ✅
- **Updated**: `/opt/docker/apps/lazi/services/api/src/routes/pricebook.routes.js`
- **Route**: `GET /pricebook/db/services`
- **Now queries**: `master.pricebook_services` LEFT JOIN `crm.pricebook_overrides`
- **Uses COALESCE** for applying CRM overrides (name, price, cost, active, description, image_url)
- **Returns**: `hasPendingChanges` flag when overrides exist

### 3. **Database Connection** ✅
- **Fixed DATABASE_URL** in `.env.production`
- **Correct connection**: `postgresql://postgres:Catchadmin%402025@db.cvqduvqzkvqnjouuzldk.supabase.co:6543/postgres`
- **API container** rebuilt and restarted with correct environment

### 4. **Frontend Components** ✅ (Previously fixed)
- `apps/web/components/pricebook/services-panel.tsx` - Uses `apiUrl()` helper
- `apps/web/components/pricebook/services-list.tsx` - Uses `apiUrl()` helper
- `apps/web/components/pricebook/service-detail-page.tsx` - Uses `apiUrl()` helper

---

## Architecture Flow

### Before (Incorrect) ❌
```
Frontend → Next.js Proxy → Backend API → raw.st_pricebook_services
```

### After (Correct) ✅
```
Frontend → Next.js Proxy → Backend API → master.pricebook_services
                                          LEFT JOIN crm.pricebook_overrides
                                          (COALESCE for overrides)
```

---

## Verification

### API Endpoint Test
```bash
curl -s "http://localhost:3001/pricebook/db/services?pageSize=5&active=true" \
  -H "x-tenant-id: 3222348440" | jq '{totalCount, pageSize, hasMore}'
```

**Result**:
```json
{
  "totalCount": 2161,
  "pageSize": 5,
  "hasMore": true
}
```

### Database Verification
```sql
SELECT 
  'services' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN active = true THEN 1 END) as active_count
FROM master.pricebook_services 
WHERE tenant_id = '3222348440';
```

**Result**: 2,161 services (all active)

---

## Files Created/Modified

### Created:
1. `/services/api/scripts/create-master-tables.sql` - SQL to create master tables
2. `/services/api/scripts/sync-raw-to-master.js` - Node.js sync script
3. `/services/api/scripts/sync-raw-to-master.sql` - SQL sync script (alternative)
4. `/ARCHITECTURE_FIX_IMPLEMENTATION.md` - Implementation guide
5. `/ARCHITECTURE_FIX_COMPLETE.md` - This file

### Modified:
1. `/services/api/src/routes/pricebook.routes.js` - Updated `/db/services` endpoint
2. `/services/api/.env` - Updated DATABASE_URL
3. `/.env.production` - Updated DATABASE_URL
4. `/apps/web/components/pricebook/services-panel.tsx` - Fixed hardcoded URLs
5. `/apps/web/components/pricebook/services-list.tsx` - Fixed hardcoded URLs
6. `/apps/web/components/pricebook/service-detail-page.tsx` - Fixed hardcoded URLs

---

## Next Steps

### 1. Test Frontend
Open https://lazilabs.com/dashboard/pricebook and verify:
- ✅ Services load from master tables
- ✅ Filters work (Active/Inactive/All)
- ✅ Search works
- ✅ Images display (if available)
- ✅ Pagination works

### 2. Apply Same Pattern to Materials & Equipment (Optional)
The same architecture can be applied to:
- `/pricebook/db/materials` endpoint
- `/pricebook/db/equipment` endpoint

### 3. Implement CRM Override Features (Future)
- **POST /pricebook/services/:stId/override** - Create/update overrides
- **POST /pricebook/push** - Push pending overrides to ServiceTitan
- **GET /pricebook/pending** - Get all pending overrides

---

## Key Benefits

1. **CRM Overrides**: Local changes without affecting ServiceTitan data
2. **Pending Sync**: Track which items have changes to push to ST
3. **Custom Fields**: Add internal notes, tags, custom fields
4. **Performance**: Master tables optimized with indexes
5. **Data Integrity**: Raw tables remain untouched

---

## Troubleshooting

### Issue: API returns "Failed to fetch services"
**Solution**: Check DATABASE_URL in container environment
```bash
docker exec lazi-api printenv DATABASE_URL
# Should be: postgresql://postgres:Catchadmin%402025@db.cvqduvqzkvqnjouuzldk.supabase.co:6543/postgres
```

### Issue: No services found
**Solution**: Run sync script to populate master tables
```bash
DATABASE_URL="postgresql://postgres:Catchadmin%402025@db.cvqduvqzkvqnjouuzldk.supabase.co:6543/postgres" \
  node services/api/scripts/sync-raw-to-master.js
```

### Issue: Column does not exist errors
**Solution**: Verify table schema matches the API query
```sql
\d master.pricebook_services
\d crm.pricebook_overrides
```

---

## Status: ✅ COMPLETE

The pricebook API architecture has been successfully fixed. All services are now accessible through the corrected three-tier architecture with CRM override support.

**Last Updated**: 2025-12-29 05:17 UTC
**Services Synced**: 2,161
**Materials Synced**: 5,523
**Equipment Synced**: 278
**Categories Synced**: 104
