# LAZI AI Development Instructions

## Project Overview

LAZI AI is a ServiceTitan enhancement platform and middleware system for outdoor living contractors (pool service, landscaping, irrigation, pest control, lawn care). Built with Next.js 14 + TypeScript, PostgreSQL (Supabase) with three-schema architecture, Docker/Traefik deployment.

## Core Principles

1. **TYPE SAFETY IS NON-NEGOTIABLE**
   - All functions, methods, and variables MUST have type annotations
   - Strict TypeScript configuration enforced
   - No `any` types without explicit justification

2. **KISS** (Keep It Simple, Stupid)
   - Prefer simple, readable solutions over clever abstractions

3. **YAGNI** (You Aren't Gonna Need It)
   - Don't build features until they're actually needed

4. **THREE-SCHEMA PATTERN**
   - `raw`: Direct ServiceTitan sync data (never modify)
   - `master`: Cleaned, normalized data (LAZI managed)
   - `crm`: User customizations and extensions

## Architecture

```
apps/
├── web/                    # Next.js 14 application
│   ├── app/               # App router pages
│   │   ├── (dashboard)/   # Dashboard routes
│   │   └── api/           # API routes
│   ├── components/        # React components
│   ├── lib/               # Utilities and helpers
│   └── types/             # TypeScript types
packages/
├── ui/                    # Shared UI components
├── database/              # Database utilities
└── config/                # Shared configuration
services/
├── api/                   # Express API service
└── sync/                  # ServiceTitan sync workers
```

## Documentation Style

Use JSDoc for all functions and components:

```typescript
/**
 * Process a pricebook category update.
 * 
 * @param categoryId - The category's unique identifier
 * @param updates - Partial category data to apply
 * @returns Updated category with computed fields
 * @throws {ValidationError} If updates fail validation
 */
```

## Logging Rules

**Use structured logging with context:**

```typescript
// ✅ Good: Structured with context
logger.info('category_updated', { categoryId, changes: Object.keys(updates) });

// ❌ Bad: String interpolation
logger.info(`Updated category ${categoryId}`);
```

**Include debugging context:** IDs, input values, expected vs actual, performance metrics.

## Development Workflow

**Type checking:** `pnpm typecheck`
**Linting:** `pnpm lint`
**Tests:** `pnpm test`
**Build:** `pnpm build`
**Dev server:** `pnpm dev`

## Testing Requirements

- Unit tests for business logic
- Integration tests for API routes
- Component tests for UI
- Tests mirror source structure: `src/lib/calc.ts` → `__tests__/lib/calc.test.ts`

## Common File Locations

| Need                | Location                              |
|---------------------|---------------------------------------|
| Add API route       | apps/web/app/api/                     |
| Add frontend page   | apps/web/app/(dashboard)/             |
| Add component       | apps/web/components/                  |
| Add database type   | packages/database/                    |
| ServiceTitan sync   | services/sync/                        |

## Key Patterns

**API Route Pattern:**
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    const result = await service.create(validated);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}
```

**Component Pattern:**
```typescript
interface Props {
  data: DataType;
  onUpdate: (id: string, data: Partial<DataType>) => Promise<void>;
}

export function Component({ data, onUpdate }: Props) {
  // Implementation
}
```

---

## MANDATORY VERIFICATION PROTOCOL

Every implementation MUST include proof. "I implemented it" is NOT acceptable.

### After /execute, run /verify:
```
/prime → /planning → /execute → /verify → /commit
```

### Required Evidence:

1. **Test Data**: Create 3+ realistic records via API (not "test1", "test2")
2. **Database Proof**: Show actual JSON/query output 
3. **CRUD Cycle**: CREATE → READ → UPDATE → DELETE with responses
4. **UI Binding**: Prove no hardcoded values (grep commands)
5. **Edit Modal**: Confirm it populates existing data

### Verification Checklist (include in /execute completion):

```markdown
## Verification
- [ ] Test data created (3+ records)
- [ ] Database state shown (JSON output)
- [ ] CRUD cycle proven (all 4 operations)
- [ ] No hardcoded UI values
- [ ] Edit modal populates correctly
```

### Definition of Done:

❌ NOT: "I implemented the technicians API"
✅ YES: "Here's curl output creating 3 technicians, database showing them stored, CRUD cycle proof"

