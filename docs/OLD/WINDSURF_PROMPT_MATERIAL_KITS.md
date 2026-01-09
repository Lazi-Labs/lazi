# Material Kits Feature - Refined Windsurf Implementation Prompt

---

## ⛔ CRITICAL CONSTRAINTS - READ FIRST

### DO NOT MODIFY:
- **Docker containers** - Do not rename, restart, stop, or reconfigure containers
- **Docker Compose files** - Do not change service names, networks, ports, or volumes
- **Environment variables** - Do not modify .env files or container env vars
- **Infrastructure** - Do not touch Traefik, nginx, SSL, or network configurations
- **Database connections** - Do not change connection strings, pools, or credentials
- **Container names** - Specifically DO NOT rename lazi-api, lazi-web, or any container
- **Existing working code** - Do not refactor code that isn't related to the task

### DEVELOPMENT ORDER (UI FIRST):
```
1. UI Components    ← START HERE
2. React Hooks      ← Then data fetching
3. Types/Interfaces ← If needed
4. API Routes       ← LAST, only if new endpoints needed
```

### IF SOMETHING DOESN'T CONNECT:
- ❌ DO NOT change Docker/infrastructure to "fix" it
- ❌ DO NOT rename containers or services
- ❌ DO NOT modify environment variables
- ✅ DO ask the user what's wrong
- ✅ DO check if the API endpoint URL is correct
- ✅ DO verify the endpoint exists and returns data
- ✅ DO check import paths and component names

### API BASE URLs (DO NOT CHANGE):
```
Internal (server-side): http://lazi-api:3001
External (client-side): https://api.lazilabs.com
```

---

## Architecture Overview

**IMPORTANT**: Material Kits is a **LAZI-only feature** that does NOT interact with ServiceTitan API directly.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ServiceTitan API                                                        │
│       │                                                                  │
│       ▼ (existing sync)                                                  │
│  ┌─────────────┐                                                         │
│  │ raw.materials│ ──► master.materials ◄─── SOURCE FOR KITS             │
│  └─────────────┘           │                                             │
│                            │                                             │
│                            ▼                                             │
│                   ┌─────────────────┐                                    │
│                   │ MATERIAL KITS   │  ◄─── NEW LAZI-ONLY TABLES        │
│                   │ (master schema) │       No ServiceTitan sync         │
│                   └────────┬────────┘                                    │
│                            │                                             │
│                            │ "Apply Kit" action                          │
│                            ▼                                             │
│                   ┌─────────────────┐                                    │
│                   │ Service Editor  │                                    │
│                   │ Materials List  │  ◄─── Kit materials populate here  │
│                   └────────┬────────┘                                    │
│                            │                                             │
│                            │ Save Service                                │
│                            ▼                                             │
│                   ┌─────────────────┐                                    │
│                   │ master.services │                                    │
│                   │ + linked mats   │  ──► ServiceTitan API (existing)  │
│                   └─────────────────┘                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Points:
1. **Kits pull from `master.materials`** - Already synced from ServiceTitan
2. **Kits are stored in LAZI** - New tables, no ServiceTitan equivalent
3. **Apply Kit → Service Materials** - Populates the service's material list in the editor
4. **Standard save flow** - Service materials sync to ServiceTitan via existing routes

---

## What Already Exists (From Windsurf Output)

Based on the implementation log, these files were created:

### Database
- `database/migrations/023_material_kits.sql` - 4 tables created

### Backend API  
- `services/api/src/routes/pricebook-kits.js` - Full CRUD routes
- Routes registered in `services/api/src/routes/index.js`

### Next.js API Routes
- `apps/web/app/api/pricebook/kits/route.ts`
- `apps/web/app/api/pricebook/kits/[id]/route.ts`
- `apps/web/app/api/pricebook/kits/[id]/duplicate/route.ts`
- `apps/web/app/api/pricebook/kits/[id]/apply/route.ts`

### Hooks
- `apps/web/hooks/pricebook/useKits.ts`

### Components
- All kit components in `apps/web/components/pricebook/kits/`

### Navigation
- Updated `pricebook-sidebar.tsx`
- Updated `pricebook-category-sidebar.tsx`
- Updated `pricebook/page.tsx`

---

## What Needs Verification/Fixing

### 1. Material Browser Must Query `master.materials`

The MaterialBrowser component needs to fetch from the existing materials table:

```typescript
// In MaterialBrowser.tsx or a hook
// Should query existing materials API endpoint
const { data: materials } = useQuery({
  queryKey: ['materials', { search, categoryPath, isActive: true }],
  queryFn: () => fetchMaterials({ search, categoryPath, isActive: true }),
});
```

**Verify**: The material search in kit editor pulls from `master.materials`, not mock data.

### 2. Apply Kit Integration Point

When "Apply Kit" is clicked from the Services page, it should:

```typescript
// The apply action should return materials in the format 
// expected by the service editor's materials list

interface ApplyKitResult {
  materials: {
    materialId: string;        // UUID from master.materials
    stMaterialId?: number;     // ServiceTitan ID if needed
    code: string;
    name: string;
    quantity: number;
    cost: number;
    // ... other fields the service materials list expects
  }[];
}

// In the service editor, when kit is applied:
const handleApplyKit = async (kitId: string, multiplier: number) => {
  const result = await applyKit(kitId, { multiplier });
  
  // Merge with existing service materials
  const newMaterials = result.materials.map(m => ({
    ...m,
    quantity: m.quantity * multiplier,
  }));
  
  // Add to service's materials list (existing state management)
  setServiceMaterials(prev => mergeMaterials(prev, newMaterials));
};

// Helper to merge - if material exists, add quantity; else append
const mergeMaterials = (existing, incoming) => {
  const merged = [...existing];
  incoming.forEach(inc => {
    const existingIdx = merged.findIndex(m => m.materialId === inc.materialId);
    if (existingIdx >= 0) {
      merged[existingIdx].quantity += inc.quantity;
    } else {
      merged.push(inc);
    }
  });
  return merged;
};
```

### 3. Service Editor Integration

Find the existing service editor component and add:

```typescript
// In the service materials section, add a "Load Kit" button
<Button onClick={() => setShowKitModal(true)}>
  <Package className="w-4 h-4 mr-2" />
  Load Kit
</Button>

// Import and render the modal
{showKitModal && (
  <UseKitModal
    onApply={handleApplyKit}
    onClose={() => setShowKitModal(false)}
  />
)}
```

**Find the file**: Look for where service materials are edited - likely:
- `apps/web/components/pricebook/services/ServiceEditor.tsx`
- `apps/web/components/pricebook/services/ServiceMaterialsSection.tsx`
- Or similar

---

## Verification Checklist

Run these checks to ensure everything works:

### Database
```bash
# Run migration
psql -d lazi -f database/migrations/023_material_kits.sql

# Verify tables exist
psql -d lazi -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'master' AND table_name LIKE 'material_kit%';"
```

### API
```bash
# Test list kits
curl http://localhost:3001/api/pricebook/kits

# Test create kit (adjust tenant_id)
curl -X POST http://localhost:3001/api/pricebook/kits \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Kit", "materials": [{"materialId": "uuid-here", "quantity": 10}]}'
```

### UI
1. Navigate to Pricebook → Material Kits
2. Verify materials load from database (not mock data)
3. Create a kit with real materials
4. Go to a Service, find materials section
5. Click "Load Kit" and apply
6. Verify materials appear in service
7. Save service and verify it syncs to ServiceTitan

---

## Files to Check/Update

### 1. Verify Material Fetching
```typescript
// apps/web/components/pricebook/kits/MaterialBrowser.tsx
// Should use existing materials hook, not mock data

import { useMaterials } from '@/hooks/pricebook/useMaterials'; // or similar

// In component:
const { data: materials } = useMaterials({ 
  search, 
  categoryPath: materialFilterPath.join('.'),
  isActive: true 
});
```

### 2. Add UseKitModal to Service Editor
```typescript
// Find: apps/web/components/pricebook/services/[ServiceEditor or similar].tsx
// Add: Import UseKitModal, add state, add button, add modal render
```

### 3. Verify API Response Format
```typescript
// services/api/src/routes/pricebook-kits.js
// The /apply endpoint should return materials in format compatible with service editor
```

---

## Common Issues to Watch For

### 1. Material ID Mismatch
- Kit stores `material_id` (UUID from master.materials)
- Service might expect `st_material_id` (ServiceTitan ID)
- **Solution**: Include both in the apply response

### 2. Category Path Format
- Kits use LTREE format: `electrical.wiring.20amp`
- Verify this matches existing pricebook category format
- Check `master.pricebook_categories` table structure

### 3. Tenant Isolation
- All queries must filter by `tenant_id`
- Verify tenant context is passed through API calls

### 4. Material Browser Performance
- With 6400+ materials, need pagination/virtualization
- Implement search debouncing
- Consider caching frequently used materials

---

## Quick Fixes If Things Don't Work

### Materials Not Loading
```typescript
// Check the API endpoint being called
// Should be something like: /api/pricebook/materials?search=...
// Not /api/pricebook/kits/materials (kits don't have their own materials endpoint)
```

### Apply Kit Not Working
```typescript
// Verify the apply endpoint returns correct format
// Check service editor expects materials in same format
// May need to transform data between kit format and service format
```

### Categories Not Showing
```typescript
// Verify category tree is loaded from master.pricebook_categories
// Check LTREE path format matches between kits and categories
```

---

## Final Integration: Services Page "Load Kit" Button

The critical integration is adding the kit selector to the services material section:

```typescript
// Wherever service materials are edited, add:

import { UseKitModal } from '@/components/pricebook/kits';
import { useApplyKit } from '@/hooks/pricebook/useKits';

// In component:
const [showKitModal, setShowKitModal] = useState(false);
const applyKit = useApplyKit();

const handleKitApply = async (kit, multiplier) => {
  const result = await applyKit.mutateAsync({ 
    id: kit.id, 
    serviceId: currentServiceId, // if needed
    multiplier 
  });
  
  // Add returned materials to service's material list
  // This depends on how service materials state is managed
  addMaterialsToService(result.materials);
  
  setShowKitModal(false);
};

// In render, near material list:
<Button variant="outline" onClick={() => setShowKitModal(true)}>
  <Layers className="w-4 h-4 mr-2" />
  Load Material Kit
</Button>

{showKitModal && (
  <UseKitModal
    onApply={handleKitApply}
    onClose={() => setShowKitModal(false)}
  />
)}
```

This is the key UX improvement - one click to add 13 pre-configured materials to a service instead of searching and adding them one by one.