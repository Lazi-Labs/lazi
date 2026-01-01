# Material Kits - Service Integration (Next Steps)

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
1. UI Components    ← START HERE (find service editor, add button)
2. React Hooks      ← Use existing useKits hooks
3. API Routes       ← Already exist, DO NOT recreate
```

### IF SOMETHING DOESN'T CONNECT:
- ❌ DO NOT change Docker/infrastructure to "fix" it
- ❌ DO NOT rename containers or services
- ✅ ASK the user what's wrong
- ✅ CHECK the endpoint URL is correct
- ✅ VERIFY imports and component paths

---

## Current State
The Material Kits feature has been built with:
- Database tables ✓
- API endpoints ✓
- UI components ✓
- Navigation ✓

## What's Missing
**The "Load Kit" button on the Service Editor materials section**

This is the key integration that makes kits useful - without it, kits exist but can't be applied.

---

## Task: Add Kit Integration to Service Materials Editor

### Step 1: Find the Service Materials Component

Look for where materials are added to services. Likely locations:
```
apps/web/components/pricebook/services/
├── ServiceEditor.tsx
├── ServiceForm.tsx
├── ServiceMaterials.tsx
├── ServiceMaterialsList.tsx
└── [similar names]
```

Or check the service detail/edit page:
```
apps/web/app/(dashboard)/pricebook/services/[id]/
├── page.tsx
└── edit/page.tsx
```

### Step 2: Understand Current Material Adding Flow

Find how materials are currently added to a service:
```typescript
// Look for patterns like:
const [materials, setMaterials] = useState([]);
const addMaterial = (material) => { ... };

// Or with form state:
const form = useForm({ defaultValues: { materials: [] } });
```

### Step 3: Add the Load Kit Button

```tsx
// Import the modal
import { UseKitModal } from '@/components/pricebook/kits';

// Add state
const [showKitModal, setShowKitModal] = useState(false);

// Add handler that matches your material state management
const handleApplyKit = (kit: MaterialKit, multiplier: number) => {
  // Transform kit materials to match your service material format
  const newMaterials = kit.materials.map(item => ({
    // Map fields based on your existing material structure
    materialId: item.materialId,
    material: item.material, // The joined material data
    quantity: item.quantity * multiplier,
    // Add any other required fields for service materials
  }));
  
  // Merge with existing materials
  // Option A: If using useState
  setMaterials(prev => mergeServiceMaterials(prev, newMaterials));
  
  // Option B: If using react-hook-form
  const currentMats = form.getValues('materials') || [];
  form.setValue('materials', mergeServiceMaterials(currentMats, newMaterials));
  
  setShowKitModal(false);
};

// Helper function
const mergeServiceMaterials = (existing, incoming) => {
  const merged = [...existing];
  incoming.forEach(inc => {
    const idx = merged.findIndex(m => m.materialId === inc.materialId);
    if (idx >= 0) {
      // Material exists - add quantities
      merged[idx] = {
        ...merged[idx],
        quantity: (merged[idx].quantity || 0) + inc.quantity
      };
    } else {
      // New material - append
      merged.push(inc);
    }
  });
  return merged;
};

// Add button near material list header
<div className="flex items-center justify-between mb-4">
  <h3>Materials</h3>
  <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={() => setShowKitModal(true)}>
      <Package className="w-4 h-4 mr-2" />
      Load Kit
    </Button>
    <Button size="sm" onClick={handleAddMaterial}>
      <Plus className="w-4 h-4 mr-2" />
      Add Material
    </Button>
  </div>
</div>

// Add modal at end of component
{showKitModal && (
  <UseKitModal
    onApply={handleApplyKit}
    onClose={() => setShowKitModal(false)}
  />
)}
```

### Step 4: Verify Data Flow

When kit is applied:
1. Kit materials (from `master.material_kit_items`) load with joined `master.materials` data
2. Materials are transformed to match service material format
3. Service editor state is updated
4. On service save, materials go through existing save flow → ServiceTitan sync

---

## Data Format Mapping

### Kit Material Item (from database)
```typescript
{
  id: "uuid",
  kit_id: "uuid",
  material_id: "uuid",
  group_id: "uuid" | null,
  quantity: 10,
  sort_order: 0,
  // Joined from master.materials:
  material: {
    id: "uuid",
    st_material_id: 123456,  // ServiceTitan ID
    code: "12-THHN-BLK",
    name: "Thhn 12 Str Cu Black",
    cost: 0.14,
    unit: "ft",
    // ... other fields
  }
}
```

### Service Material (what service editor expects)
```typescript
// Check your existing service material structure
// Likely something like:
{
  materialId: "uuid",        // or st_material_id depending on your setup
  code: "12-THHN-BLK",
  name: "Thhn 12 Str Cu Black", 
  quantity: 10,
  cost: 0.14,
  // ... other required fields
}
```

### Transformation
```typescript
const transformKitToServiceMaterial = (kitItem) => ({
  materialId: kitItem.material_id,
  stMaterialId: kitItem.material?.st_material_id,
  code: kitItem.material?.code,
  name: kitItem.material?.name,
  quantity: kitItem.quantity,
  cost: kitItem.material?.cost,
  unit: kitItem.material?.unit,
  // Map any other required fields
});
```

---

## Testing the Integration

1. **Create a test kit** with 3-5 materials
2. **Go to service editor** (create new or edit existing)
3. **Click "Load Kit"** button
4. **Select kit** and set multiplier (try 1x and 2x)
5. **Verify materials appear** in service list with correct quantities
6. **Save service** and verify it persists
7. **Check ServiceTitan** to confirm sync worked

---

## Potential Issues

### Issue: Material ID mismatch
- Kit uses `master.materials.id` (UUID)
- Service might use `st_material_id` (ServiceTitan integer ID)
- **Fix**: Include both IDs in the transformation, use whichever the service expects

### Issue: Missing material data
- Kit item only stores `material_id` and `quantity`
- Service editor needs full material details (name, code, cost)
- **Fix**: Ensure kit API joins material data, or fetch materials separately

### Issue: Duplicate material handling
- What if service already has a material from the kit?
- **Decision**: Add quantities (implemented in merge function above)
- **Alternative**: Replace quantity, or prompt user

### Issue: State management conflict
- Your service editor might use Zustand, Redux, or other state
- **Fix**: Adapt the handler to your state management pattern

---

## Quick Reference: Files to Touch

```
1. Find service material editor:
   apps/web/components/pricebook/services/[MaterialEditor].tsx
   
2. Import and add UseKitModal

3. Add "Load Kit" button to UI

4. Add handler to merge kit materials with service materials

5. Test the full flow
```

Once this integration is done, the Material Kits feature is complete and usable!
