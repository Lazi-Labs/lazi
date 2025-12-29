# Pricebook API Architecture Fix - Implementation Status

## What Was Done

I've implemented the three-tier architecture fix as specified in `docs/WINDSURF_PRICEBOOK_API_ARCHITECTURE_FIX.md`. The API now queries `master.*` tables with CRM overrides instead of directly querying `raw.*` tables.

### Files Created/Modified

#### 1. **Created: `/services/api/scripts/create-master-tables.sql`**
- SQL script to create all master tables and CRM overrides table
- Tables: `master.pricebook_services`, `master.pricebook_materials`, `master.pricebook_equipment`, `crm.pricebook_overrides`
- Includes all necessary indexes for performance

#### 2. **Created: `/services/api/scripts/sync-raw-to-master.js`**
- Node.js script to populate master tables from raw tables
- Syncs services, materials, and equipment
- Handles upserts (INSERT ... ON CONFLICT DO UPDATE)

#### 3. **Modified: `/services/api/src/routes/pricebook.routes.js`**
- Updated `/db/services` endpoint to query `master.pricebook_services` with LEFT JOIN to `crm.pricebook_overrides`
- Uses `COALESCE()` to apply CRM overrides (name, price, active, etc.)
- Returns `hasPendingChanges` flag when overrides exist

#### 4. **Previously Fixed: Frontend Components**
- `/apps/web/components/pricebook/services-panel.tsx` - Uses `apiUrl()` helper
- `/apps/web/components/pricebook/services-list.tsx` - Uses `apiUrl()` helper
- `/apps/web/components/pricebook/service-detail-page.tsx` - Uses `apiUrl()` helper
- Default filter changed from `'active'` to `'all'`

## What Still Needs To Be Done

### Step 1: Create Master Tables
Run the SQL script to create the master tables:

```bash
cd /opt/docker/apps/lazi/services/api

# Option A: Using psql directly
export DATABASE_URL="postgresql://postgres.cvqduvqzkvqnjouuzldk:Catchadmin202525@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=no-verify"
psql "$DATABASE_URL" -f scripts/create-master-tables.sql

# Option B: Using Supabase SQL editor
# Copy contents of scripts/create-master-tables.sql and run in Supabase dashboard
```

### Step 2: Populate Master Tables
Run the sync script to populate master tables from raw tables:

```bash
cd /opt/docker/apps/lazi/services/api

# Make script executable
chmod +x scripts/sync-raw-to-master.js

# Run sync
node scripts/sync-raw-to-master.js
```

Expected output:
```
═══════════════════════════════════════════════════════
  Syncing Raw → Master Tables
═══════════════════════════════════════════════════════
Tenant ID: 3222348440

Syncing services...
✓ Services synced: XXX rows
Syncing materials...
✓ Materials synced: XXX rows
Syncing equipment...
✓ Equipment synced: XXX rows

═══════════════════════════════════════════════════════
  Sync Complete
═══════════════════════════════════════════════════════

Summary:
  Services:  XXX rows
  Materials: XXX rows
  Equipment: XXX rows
```

### Step 3: Verify Data
Check that master tables are populated:

```bash
psql "$DATABASE_URL" -c "
SELECT 
  'services' as table_name,
  COUNT(*) as total,
  COUNT(image_url) as with_image
FROM master.pricebook_services WHERE tenant_id = '3222348440'
UNION ALL
SELECT 'materials', COUNT(*), COUNT(image_url) 
FROM master.pricebook_materials WHERE tenant_id = '3222348440'
UNION ALL
SELECT 'equipment', COUNT(*), COUNT(image_url)
FROM master.pricebook_equipment WHERE tenant_id = '3222348440';
"
```

### Step 4: Restart API Server
The backend API changes require a server restart:

```bash
# If running in Docker
docker restart lazi-api

# If running locally
cd /opt/docker/apps/lazi/services/api
pm2 restart api
# OR
npm run dev
```

### Step 5: Test Frontend
1. Open https://lazilabs.com/dashboard/pricebook
2. Navigate to Services tab
3. Verify services load with data
4. Check that images display
5. Verify filters work (Active/Inactive/All)

## Architecture Overview

### Before (Incorrect)
```
Frontend → Next.js Proxy → Backend API → raw.st_pricebook_services
```

### After (Correct)
```
Frontend → Next.js Proxy → Backend API → master.pricebook_services 
                                          LEFT JOIN crm.pricebook_overrides
                                          (uses COALESCE for overrides)
```

## Benefits of New Architecture

1. **CRM Overrides**: Local changes can be made without affecting ServiceTitan data
2. **Pending Sync**: Track which items have pending changes to push to ST
3. **Custom Fields**: Add internal notes, tags, and custom fields
4. **Performance**: Master tables are indexed and optimized for queries
5. **Data Integrity**: Raw tables remain untouched, master tables are normalized

## API Response Format

Services now return:
```json
{
  "data": [
    {
      "id": 123,
      "stId": "456789",
      "name": "Service Name",
      "price": 99.99,
      "active": true,
      "hasPendingChanges": false,
      "internalNotes": null,
      "customTags": []
    }
  ],
  "page": 1,
  "pageSize": 25,
  "totalCount": 150,
  "hasMore": true
}
```

## Future Enhancements

The architecture document includes additional endpoints that can be implemented:

1. **POST /pricebook/services/:stId/override** - Create/update CRM overrides
2. **POST /pricebook/push** - Push pending overrides to ServiceTitan
3. **GET /pricebook/pending** - Get all pending overrides
4. **Materials and Equipment** - Apply same pattern to other entities

These can be implemented following the same pattern used for services.

## Troubleshooting

### Issue: "Table does not exist"
**Solution**: Run Step 1 to create master tables

### Issue: "No services found"
**Solution**: Run Step 2 to populate master tables from raw tables

### Issue: "Services still not loading"
**Solution**: 
1. Check API server is running: `docker ps | grep lazi-api`
2. Check API logs: `docker logs lazi-api`
3. Verify database connection in `.env` file
4. Restart API server (Step 4)

### Issue: "Images not displaying"
**Solution**: Images are served from `/images/db/services/:stId` endpoint. Verify:
1. `image_url` field is populated in master table
2. Image resolver service is working
3. S3 credentials are configured

## Next Steps

1. Run Steps 1-5 above to complete the implementation
2. Test thoroughly in development
3. Apply same pattern to materials and equipment endpoints
4. Implement override creation and push-to-ST functionality
5. Add UI for managing pending changes
