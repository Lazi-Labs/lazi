# Material Kits - Rebuild/Redeploy

---

## ⛔ CRITICAL CONSTRAINTS - READ FIRST

### DO NOT MODIFY:
- **Docker containers** - Do not rename, restart, stop, or reconfigure containers
- **Docker Compose files** - Do not change service names, networks, ports, or volumes
- **Environment variables** - Do not modify .env files or container env vars
- **Infrastructure** - Do not touch Traefik, nginx, SSL, or network configurations
- **Database connections** - Do not change connection strings, pools, or credentials
- **Container names** - DO NOT rename lazi-api, lazi-web, or any container
- **Existing working endpoints** - Do not modify routes that already work

### DEVELOPMENT ORDER:
```
1. Database migration  ← Run if tables don't exist
2. UI Components       ← Build/fix components
3. Hooks               ← Wire up data fetching
4. API routes          ← Only if missing
```

### IF API DOESN'T CONNECT:
- ❌ DO NOT change Docker or infrastructure
- ✅ Check endpoint URL: `/api/pricebook/kits`
- ✅ Verify tenant header: `x-tenant-id: 3222348440`
- ✅ ASK the user if unsure

---

## Task: Rebuild Material Kits Feature

Reference these files in `/opt/docker/apps/lazi/docs/`:
- `material-kits-full.jsx` - Complete UI prototype
- `WINDSURF_PROMPT_MATERIAL_KITS.md` - Full implementation spec
- `WINDSURF_NEXT_STEPS.md` - Service integration details

---

## Step 1: Verify Database Tables Exist

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'master' 
AND table_name LIKE 'material_kit%';
```

If missing, run migration `database/migrations/023_material_kits.sql`

---

## Step 2: Verify/Create API Routes

Check if these routes exist and respond:

```bash
# Test endpoint (from inside container or adjust URL)
curl -s "http://localhost:3001/api/pricebook/kits" \
  -H "x-tenant-id: 3222348440" | head -20
```

Routes needed in `services/api/src/routes/`:
- `GET /api/pricebook/kits` - List kits
- `GET /api/pricebook/kits/:id` - Get single kit
- `POST /api/pricebook/kits` - Create kit
- `PUT /api/pricebook/kits/:id` - Update kit
- `DELETE /api/pricebook/kits/:id` - Delete kit
- `POST /api/pricebook/kits/:id/duplicate` - Duplicate
- `POST /api/pricebook/kits/:id/apply` - Apply to service

See `WINDSURF_PROMPT_MATERIAL_KITS.md` for full route implementations.

---

## Step 3: Build UI Components (UI FIRST)

Create in `apps/web/components/pricebook/kits/`:

```
kits/
├── index.ts                    # Exports
├── KitsPage.tsx                # Main page
├── KitCard.tsx                 # Kit card in list
├── KitEditor.tsx               # Create/edit kit
├── KitMaterialList.tsx         # Materials with groups + keyboard nav
├── MaterialBrowser.tsx         # Search/browse materials
├── WaterfallCategoryFilter.tsx # Category cascade filter
├── GroupNameModal.tsx          # Create/rename groups
├── KeyboardShortcutsPanel.tsx  # Shortcuts help
└── UseKitModal.tsx             # For services integration
```

**Reference `material-kits-full.jsx` for complete component code.**

### Key Component: KitMaterialList

This is the most complex component with:
- Multi-select (click, Shift+click, Ctrl+click)
- Keyboard navigation (↑↓←→, Enter, Delete, +/-)
- Drag & drop reordering
- Group management (Ctrl+G to group, Ctrl+Shift+G to ungroup)
- Inline quantity editing

---

## Step 4: Create React Hooks

Create `apps/web/hooks/pricebook/useKits.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const KITS_KEY = ['pricebook', 'kits'];

export function useKits(params?: { search?: string; categoryPath?: string }) {
  return useQuery({
    queryKey: [...KITS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.categoryPath) searchParams.set('categoryPath', params.categoryPath);
      
      const res = await fetch(`/api/pricebook/kits?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch kits');
      return res.json();
    },
  });
}

export function useKit(id: string) {
  return useQuery({
    queryKey: [...KITS_KEY, id],
    queryFn: async () => {
      const res = await fetch(`/api/pricebook/kits/${id}`);
      if (!res.ok) throw new Error('Failed to fetch kit');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateKitInput) => {
      const res = await fetch('/api/pricebook/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create kit');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KITS_KEY }),
  });
}

export function useUpdateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateKitInput }) => {
      const res = await fetch(`/api/pricebook/kits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update kit');
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: KITS_KEY });
      queryClient.invalidateQueries({ queryKey: [...KITS_KEY, id] });
    },
  });
}

export function useDeleteKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pricebook/kits/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete kit');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KITS_KEY }),
  });
}

export function useDuplicateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pricebook/kits/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to duplicate kit');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KITS_KEY }),
  });
}

export function useApplyKit() {
  return useMutation({
    mutationFn: async ({ id, multiplier = 1 }: { id: string; multiplier?: number }) => {
      const res = await fetch(`/api/pricebook/kits/${id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier }),
      });
      if (!res.ok) throw new Error('Failed to apply kit');
      return res.json();
    },
  });
}
```

---

## Step 5: Add to Pricebook Navigation

### Update pricebook sidebar:
```typescript
// In pricebook-sidebar.tsx or similar
// Add "Material Kits" nav item with Package icon
{ name: 'Material Kits', href: '/pricebook?tab=kits', icon: Package }
```

### Update pricebook page:
```typescript
// In apps/web/app/(dashboard)/pricebook/page.tsx
// Add 'kits' case to render KitsPage
case 'kits':
  return <KitsPage />;
```

---

## Step 6: Test

1. Navigate to Pricebook → Material Kits
2. Create a new kit
3. Add materials via search and category browser
4. Create groups, drag materials into groups
5. Test keyboard shortcuts (press ? for help)
6. Save kit
7. Verify kit appears in list
8. Edit and delete kit

---

## Quick Checklist

- [ ] Database tables exist (material_kits, material_kit_groups, material_kit_items, material_kit_includes)
- [ ] API routes respond (GET /api/pricebook/kits returns data)
- [ ] KitsPage component renders
- [ ] MaterialBrowser fetches from master.materials (not mock data)
- [ ] Kit CRUD operations work
- [ ] Keyboard navigation works
- [ ] Groups can be created and materials dragged into them
- [ ] Kits show in navigation

---

## Files Summary

```
Database:
  database/migrations/023_material_kits.sql

Backend API:
  services/api/src/routes/pricebook-kits.js
  services/api/src/routes/index.js (add kits routes)

Next.js API:
  apps/web/app/api/pricebook/kits/route.ts
  apps/web/app/api/pricebook/kits/[id]/route.ts
  apps/web/app/api/pricebook/kits/[id]/duplicate/route.ts
  apps/web/app/api/pricebook/kits/[id]/apply/route.ts

Hooks:
  apps/web/hooks/pricebook/useKits.ts

Components:
  apps/web/components/pricebook/kits/*.tsx

Navigation:
  apps/web/components/pricebook/pricebook-sidebar.tsx
  apps/web/app/(dashboard)/pricebook/page.tsx
```
