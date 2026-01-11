# Feature: Consolidate Pricing-System Microservice into Main Web App

## Feature Description

Consolidate the separate `apps/pricing-system/` microservice into the main `apps/web/` application. The pricing-system was incorrectly created as a separate Next.js app running at `pricing.lazilabs.com`, when it should be part of the main LAZI app at `app.lazilabs.com/pricebook/pricing`.

## Current State (Problem)

```
apps/pricing-system/           # SEPARATE Docker container (lazi-pricing)
├── app/api/pricing/           # Real Supabase API routes (108 LOC each)
│   ├── technicians/           # GET/POST/PUT/DELETE
│   ├── vehicles/
│   ├── expenses/
│   ├── job-types/
│   ├── office-staff/
│   ├── scenarios/
│   └── calculate/
├── lib/
│   ├── supabase.ts           # Direct Supabase client
│   └── api-helpers.ts        # Response helpers, getOrgId
└── components/               # UNUSED placeholder UI (77 LOC each)

apps/web/                      # MAIN Docker container (lazi-web)
├── app/pricebook/pricing/
│   ├── api/                  # PROXY routes → pricing.lazilabs.com (48 LOC)
│   └── components/           # FULL UI (550+ LOC with CRUD)
└── app/api/pricebook/pricing/ # DUPLICATE proxy routes
```

**Problems:**
1. Extra Docker container (`lazi-pricing`) for simple internal CRM tool
2. Network hops: Main App → pricing.lazilabs.com → Supabase
3. Duplicate proxy routes in main app
4. Unused placeholder UI in pricing-system

## Target State (Solution)

```
apps/web/                      # SINGLE container
├── app/pricebook/pricing/
│   ├── api/                  # DIRECT Supabase routes (moved from pricing-system)
│   │   ├── technicians/route.ts
│   │   ├── technicians/[id]/route.ts
│   │   ├── vehicles/route.ts
│   │   ├── vehicles/[id]/route.ts
│   │   ├── expenses/route.ts
│   │   ├── expenses/[id]/route.ts
│   │   ├── job-types/route.ts
│   │   ├── job-types/[id]/route.ts
│   │   ├── office-staff/route.ts
│   │   ├── office-staff/[id]/route.ts
│   │   ├── scenarios/route.ts
│   │   ├── scenarios/[id]/route.ts
│   │   ├── calculate/route.ts
│   │   └── route.ts           # Aggregate endpoint
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client (from pricing-system)
│   │   └── api-helpers.ts    # Response helpers (from pricing-system)
│   └── components/           # EXISTING full UI (no changes needed)
└── NO app/api/pricebook/pricing/ (deleted)

NO apps/pricing-system/        # DELETED
NO lazi-pricing container      # REMOVED
```

## User Story

As a LAZI developer
I want the pricing system to be part of the main web app
So that we have simpler deployment, fewer containers, and direct database access

## Feature Metadata

**Feature Type**: Refactor/Consolidation
**Estimated Complexity**: Medium
**Primary Systems Affected**: apps/web, apps/pricing-system, Docker
**Dependencies**: Supabase (same database)

---

## CONTEXT REFERENCES

### Source Files to Copy (READ THESE!)

From `apps/pricing-system/`:

| Source | Lines | Purpose |
|--------|-------|---------|
| `lib/supabase.ts` | 29 | Supabase client creation |
| `lib/api-helpers.ts` | 46 | successResponse, errorResponse, getOrgId, parseBody, isValidUUID |
| `app/api/pricing/technicians/route.ts` | 108 | Technicians GET/POST |
| `app/api/pricing/technicians/[id]/route.ts` | ~140 | Technicians GET/PUT/PATCH/DELETE by ID |
| `app/api/pricing/vehicles/route.ts` | 102 | Vehicles GET/POST |
| `app/api/pricing/vehicles/[id]/route.ts` | 141 | Vehicles GET/PUT/PATCH/DELETE by ID |
| `app/api/pricing/expenses/route.ts` | 130 | Expenses categories + items GET/POST |
| `app/api/pricing/expenses/[id]/route.ts` | 215 | Expenses GET/PUT/PATCH/DELETE by ID |
| `app/api/pricing/job-types/route.ts` | 91 | Job types GET/POST |
| `app/api/pricing/job-types/[id]/route.ts` | ~100 | Job types GET/PUT/PATCH/DELETE by ID |
| `app/api/pricing/office-staff/route.ts` | 106 | Office staff GET/POST |
| `app/api/pricing/office-staff/[id]/route.ts` | ~140 | Office staff GET/PUT/PATCH/DELETE by ID |
| `app/api/pricing/scenarios/route.ts` | 94 | Scenarios GET/POST |
| `app/api/pricing/scenarios/[id]/route.ts` | ~120 | Scenarios GET/PUT/PATCH/DELETE by ID |
| `app/api/pricing/calculate/route.ts` | 329 | Full pricing calculations |

### Files to Delete

| Path | Reason |
|------|--------|
| `apps/web/app/pricebook/pricing/api/*` | Current proxy routes, replacing with direct |
| `apps/web/app/api/pricebook/pricing/*` | Duplicate proxy routes |
| `apps/pricing-system/*` | Entire separate app (backup first) |

### Environment Variables Required

Add to `apps/web/.env.local`:
```bash
# Supabase Configuration (from pricing-system)
NEXT_PUBLIC_SUPABASE_URL=https://cvqduvqzkvqnjouuzldk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_ORG_SLUG=perfect-catch
```

---

## STEP-BY-STEP TASKS

### Phase 1: Add Supabase Client and Helpers to Main App

#### Task 1.1: CREATE `apps/web/app/pricebook/pricing/lib/supabase.ts`

Copy from `apps/pricing-system/lib/supabase.ts` with no changes:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function createServerClient() {
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getOrgIdFromSlug(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from("pricing_organizations")
    .select("id")
    .eq("slug", slug)
    .single();
  return (data as { id: string } | null)?.id || null;
}
```

**VALIDATE**: `pnpm typecheck`

#### Task 1.2: CREATE `apps/web/app/pricebook/pricing/lib/api-helpers.ts`

Copy from `apps/pricing-system/lib/api-helpers.ts` with updated imports:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "./supabase";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ data: null, error: message }, { status });
}

export async function getOrgId(slug?: string): Promise<string | null> {
  const orgSlug = slug || process.env.NEXT_PUBLIC_ORG_SLUG || "perfect-catch";
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("pricing_organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (error || !data) {
    console.error("Failed to get org ID:", error);
    return null;
  }

  return (data as { id: string }).id;
}

export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
```

**VALIDATE**: `pnpm typecheck`

---

### Phase 2: Copy API Routes (Replace Proxies with Direct)

#### Task 2.1: REPLACE `apps/web/app/pricebook/pricing/api/technicians/route.ts`

Delete existing proxy route, copy from `apps/pricing-system/app/api/pricing/technicians/route.ts`.

**Update imports:**
```typescript
// OLD: import { createServerClient } from "@/lib/supabase";
// NEW:
import { createServerClient } from "../../lib/supabase";
import { successResponse, errorResponse, getOrgId, parseBody } from "../../lib/api-helpers";
```

**VALIDATE**: `curl -s http://localhost:3000/dashboard/pricebook/pricing/api/technicians | jq .`

#### Task 2.2: REPLACE `apps/web/app/pricebook/pricing/api/technicians/[id]/route.ts`

Copy from `apps/pricing-system/app/api/pricing/technicians/[id]/route.ts`.

**Update imports:**
```typescript
import { createServerClient } from "../../../lib/supabase";
import { successResponse, errorResponse, getOrgId, parseBody, isValidUUID } from "../../../lib/api-helpers";
```

#### Task 2.3: REPLACE `apps/web/app/pricebook/pricing/api/vehicles/route.ts`

Copy from `apps/pricing-system/app/api/pricing/vehicles/route.ts`.

**Update imports to relative paths.**

#### Task 2.4: REPLACE `apps/web/app/pricebook/pricing/api/vehicles/[id]/route.ts`

Copy from `apps/pricing-system/app/api/pricing/vehicles/[id]/route.ts`.

#### Task 2.5: REPLACE `apps/web/app/pricebook/pricing/api/expenses/route.ts`

Copy from `apps/pricing-system/app/api/pricing/expenses/route.ts`.

#### Task 2.6: REPLACE `apps/web/app/pricebook/pricing/api/expenses/[id]/route.ts`

Copy from `apps/pricing-system/app/api/pricing/expenses/[id]/route.ts`.

#### Task 2.7: REPLACE `apps/web/app/pricebook/pricing/api/job-types/route.ts`

Copy from `apps/pricing-system/app/api/pricing/job-types/route.ts`.

#### Task 2.8: REPLACE `apps/web/app/pricebook/pricing/api/job-types/[id]/route.ts`

Copy from `apps/pricing-system/app/api/pricing/job-types/[id]/route.ts`.

#### Task 2.9: REPLACE `apps/web/app/pricebook/pricing/api/office-staff/route.ts`

Copy from `apps/pricing-system/app/api/pricing/office-staff/route.ts`.

#### Task 2.10: REPLACE `apps/web/app/pricebook/pricing/api/office-staff/[id]/route.ts`

Copy from `apps/pricing-system/app/api/pricing/office-staff/[id]/route.ts`.

#### Task 2.11: CREATE `apps/web/app/pricebook/pricing/api/scenarios/route.ts`

Copy from `apps/pricing-system/app/api/pricing/scenarios/route.ts` (NEW - didn't exist).

#### Task 2.12: CREATE `apps/web/app/pricebook/pricing/api/scenarios/[id]/route.ts`

Copy from `apps/pricing-system/app/api/pricing/scenarios/[id]/route.ts` (NEW).

#### Task 2.13: CREATE `apps/web/app/pricebook/pricing/api/calculate/route.ts`

Copy from `apps/pricing-system/app/api/pricing/calculate/route.ts` (NEW).

**VALIDATE**: `pnpm typecheck`

---

### Phase 3: Update Environment Variables

#### Task 3.1: UPDATE `apps/web/.env.local`

Add Supabase credentials (copy from `apps/pricing-system/.env.local`):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://cvqduvqzkvqnjouuzldk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWR1dnF6a3ZxbmpvdXV6bGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MjIxOTcsImV4cCI6MjA4MjA5ODE5N30.QLyLedy22cOU3vxXk6-U_W17Zv8qoevafNtzyUNUfpo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWR1dnF6a3ZxbmpvdXV6bGRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjUyMjE5NywiZXhwIjoyMDgyMDk4MTk3fQ.-haPq7H3oYGBYYvwPFn3cGCI5mwoddgJGCSfC5TcR_c
NEXT_PUBLIC_ORG_SLUG=perfect-catch
```

---

### Phase 4: Delete Duplicate Proxy Routes

#### Task 4.1: DELETE `apps/web/app/api/pricebook/pricing/` directory

```bash
rm -rf apps/web/app/api/pricebook/pricing/
```

This removes the duplicate proxy routes at `/api/pricebook/pricing/*`.

---

### Phase 5: Install Supabase Dependency

#### Task 5.1: Add @supabase/supabase-js to main app

```bash
cd apps/web && pnpm add @supabase/supabase-js
```

**VALIDATE**: `pnpm typecheck`

---

### Phase 6: Test and Verify

#### Task 6.1: Restart main app and test

```bash
cd /opt/docker/apps/lazi
docker compose -f apps/web/docker-compose.yml restart
```

#### Task 6.2: Test API endpoints

```bash
# Technicians
curl -s https://app.lazilabs.com/dashboard/pricebook/pricing/api/technicians | jq '.data | length'

# Vehicles
curl -s https://app.lazilabs.com/dashboard/pricebook/pricing/api/vehicles | jq '.data | length'

# Expenses
curl -s https://app.lazilabs.com/dashboard/pricebook/pricing/api/expenses | jq '.data | length'

# Calculate
curl -s https://app.lazilabs.com/dashboard/pricebook/pricing/api/calculate | jq '.data.totalTechnicians'
```

#### Task 6.3: Test UI

Visit: https://app.lazilabs.com/dashboard/pricebook?section=pricing-builder

- [ ] Workforce tab loads technicians
- [ ] Fleet tab loads vehicles
- [ ] Expenses tab loads expense categories
- [ ] Rates tab loads job types
- [ ] CRUD operations work (create, edit, delete)

---

### Phase 7: Stop and Remove pricing-system Container

#### Task 7.1: Stop the container

```bash
cd /opt/docker/apps/lazi/apps/pricing-system
docker compose down
```

#### Task 7.2: Backup and remove

```bash
cd /opt/docker/apps/lazi
mv apps/pricing-system apps/pricing-system-BACKUP-$(date +%Y%m%d)

# After verification (wait 1 week):
# rm -rf apps/pricing-system-BACKUP-*
```

---

### Phase 8: Remove Traefik Routing (Optional)

#### Task 8.1: Check if pricing subdomain needs removal

The `pricing.lazilabs.com` routing is in the pricing-system's docker-compose.yml.
Once the container is stopped, Traefik will automatically stop routing to it.

No manual Traefik config changes needed.

---

## TESTING STRATEGY

### API Endpoint Tests

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/pricebook/pricing/api/technicians` | GET | Array of technicians |
| `/pricebook/pricing/api/technicians` | POST | Create technician |
| `/pricebook/pricing/api/technicians/:id` | PUT | Update technician |
| `/pricebook/pricing/api/technicians/:id` | DELETE | Delete technician |
| `/pricebook/pricing/api/vehicles` | GET | Array of vehicles |
| `/pricebook/pricing/api/expenses` | GET | Array of expense categories with items |
| `/pricebook/pricing/api/job-types` | GET | Array of job types |
| `/pricebook/pricing/api/calculate` | GET | Full pricing calculations |

### CRUD Cycle Test

```bash
# CREATE
curl -X POST https://app.lazilabs.com/dashboard/pricebook/pricing/api/technicians \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"Tech","base_pay_rate":25}'

# READ (verify created)
curl -s https://app.lazilabs.com/dashboard/pricebook/pricing/api/technicians | jq '.data[-1]'

# UPDATE
curl -X PUT https://app.lazilabs.com/dashboard/pricebook/pricing/api/technicians/{ID} \
  -H "Content-Type: application/json" \
  -d '{"base_pay_rate":30}'

# DELETE
curl -X DELETE https://app.lazilabs.com/dashboard/pricebook/pricing/api/technicians/{ID}
```

---

## VALIDATION COMMANDS

Execute ALL in order:

```bash
# Level 1: Type checking
cd /opt/docker/apps/lazi && pnpm typecheck

# Level 2: Linting
pnpm lint

# Level 3: Build
cd apps/web && pnpm build

# Level 4: API Tests
curl -s https://app.lazilabs.com/dashboard/pricebook/pricing/api/technicians | jq '.data | length'
curl -s https://app.lazilabs.com/dashboard/pricebook/pricing/api/calculate | jq '.data.totalTechnicians'

# Level 5: Verify pricing-system is no longer needed
curl -s https://pricing.lazilabs.com/api/health # Should eventually fail after container stops
```

---

## ACCEPTANCE CRITERIA

- [ ] All API routes return data (not proxy errors)
- [ ] No PRICING_API_URL references in new code
- [ ] All CRUD operations work from UI
- [ ] Calculate endpoint returns full calculations
- [ ] No duplicate proxy routes remain
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds
- [ ] pricing-system container stopped

---

## COMPLETION CHECKLIST

### Files Created
- [ ] `apps/web/app/pricebook/pricing/lib/supabase.ts`
- [ ] `apps/web/app/pricebook/pricing/lib/api-helpers.ts`
- [ ] `apps/web/app/pricebook/pricing/api/scenarios/route.ts` (NEW)
- [ ] `apps/web/app/pricebook/pricing/api/scenarios/[id]/route.ts` (NEW)
- [ ] `apps/web/app/pricebook/pricing/api/calculate/route.ts` (NEW)

### Files Replaced (proxy → direct)
- [ ] `apps/web/app/pricebook/pricing/api/technicians/route.ts`
- [ ] `apps/web/app/pricebook/pricing/api/technicians/[id]/route.ts`
- [ ] `apps/web/app/pricebook/pricing/api/vehicles/route.ts`
- [ ] `apps/web/app/pricebook/pricing/api/vehicles/[id]/route.ts`
- [ ] `apps/web/app/pricebook/pricing/api/expenses/route.ts`
- [ ] `apps/web/app/pricebook/pricing/api/expenses/[id]/route.ts`
- [ ] `apps/web/app/pricebook/pricing/api/job-types/route.ts`
- [ ] `apps/web/app/pricebook/pricing/api/job-types/[id]/route.ts`
- [ ] `apps/web/app/pricebook/pricing/api/office-staff/route.ts`
- [ ] `apps/web/app/pricebook/pricing/api/office-staff/[id]/route.ts`

### Files Deleted
- [ ] `apps/web/app/api/pricebook/pricing/*` (duplicate proxies)
- [ ] `apps/pricing-system/*` (backup first!)

### Infrastructure
- [ ] Supabase env vars added to `apps/web/.env.local`
- [ ] `@supabase/supabase-js` dependency added
- [ ] `lazi-pricing` Docker container stopped
- [ ] Main app rebuilt and restarted

---

## ROLLBACK PLAN

If issues occur:

1. **Restore backup**: `mv apps/pricing-system-BACKUP-* apps/pricing-system`
2. **Restart pricing-system**: `cd apps/pricing-system && docker compose up -d`
3. **Revert API routes**: `git checkout apps/web/app/pricebook/pricing/api/`
4. **Remove new files**: `rm -rf apps/web/app/pricebook/pricing/lib/`

---

## POST-CONSOLIDATION CLEANUP (1 week later)

After confirming everything works:

```bash
# Remove backup
rm -rf apps/pricing-system-BACKUP-*

# Remove any PRICING_API_URL references
grep -r "PRICING_API_URL\|pricing.lazilabs.com" apps/web/ --include="*.ts" --include="*.tsx"
```

---

**Next step**: `/execute plans/consolidate-pricing-system.md`
