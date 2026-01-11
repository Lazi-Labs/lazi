# LAZI Coding Standards

## General Principles

1. **Consistency** - Follow existing patterns in the codebase
2. **Clarity** - Code should be self-documenting
3. **Simplicity** - Prefer simple solutions over clever ones
4. **Safety** - Handle errors, validate inputs, avoid side effects

---

## TypeScript/JavaScript

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName`, `isActive` |
| Functions | camelCase | `fetchMaterials()` |
| Components | PascalCase | `MaterialCard` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `MaterialProps` |
| Files (components) | PascalCase | `MaterialCard.tsx` |
| Files (utils) | kebab-case | `api-client.ts` |

### Imports

```typescript
// 1. React/Next
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { useQuery } from '@tanstack/react-query';

// 3. Internal absolute imports
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 4. Relative imports
import { MaterialCard } from './MaterialCard';
```

### Functions

```typescript
// Prefer arrow functions for components
export const MaterialCard = ({ material }: Props) => { ... };

// Use function declarations for utilities
export function calculateMargin(cost: number, price: number): number {
    return ((price - cost) / price) * 100;
}

// Always type parameters and return values
function fetchMaterial(id: number): Promise<Material> { ... }
```

### Error Handling

```typescript
// Always handle errors
try {
    const result = await riskyOperation();
    return result;
} catch (error) {
    console.error('Operation failed:', error);
    throw error; // or handle gracefully
}

// Use Result pattern for expected failures
type Result<T> = { success: true; data: T } | { success: false; error: string };
```

---

## React Patterns

### Component Structure

```tsx
'use client';

// 1. Imports
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Types
interface ComponentProps {
    id: string;
    onAction?: () => void;
}

// 3. Component
export function Component({ id, onAction }: ComponentProps) {
    // 3a. Hooks
    const [state, setState] = useState(false);
    const { data, isLoading } = useQuery({ ... });

    // 3b. Handlers
    const handleClick = () => { ... };

    // 3c. Early returns
    if (isLoading) return <Skeleton />;
    if (!data) return null;

    // 3d. Render
    return (
        <div>
            {/* content */}
        </div>
    );
}
```

### React Query

```typescript
// Query keys - consistent structure
const queryKey = ['entity', id];
const queryKey = ['entity', 'list', { filters }];

// Always handle loading/error
const { data, isLoading, error } = useQuery({
    queryKey: ['materials', id],
    queryFn: () => fetchMaterial(id),
});

// Mutations with cache invalidation
const mutation = useMutation({
    mutationFn: updateMaterial,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
});
```

### State Management

```typescript
// Local state for UI
const [isOpen, setIsOpen] = useState(false);

// React Query for server state
const { data } = useQuery({ ... });

// Zustand for global client state (sparingly)
const useStore = create((set) => ({
    selectedId: null,
    setSelectedId: (id) => set({ selectedId: id }),
}));
```

---

## Express.js Patterns

### Route Structure

```javascript
import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getTenantId } from '../utils/tenant.js';

const router = express.Router();

// GET list
router.get('/', asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { page = 1, limit = 50 } = req.query;
    
    const result = await db.query(...);
    
    res.json({ success: true, data: result.rows });
}));

// GET single
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    // ...
}));

// POST create
router.post('/', asyncHandler(async (req, res) => {
    const { name, price } = req.body;
    // validate
    // create
    res.status(201).json({ success: true, data: created });
}));

export default router;
```

### Error Handling

```javascript
// Always use asyncHandler wrapper
router.get('/', asyncHandler(async (req, res) => {
    // errors automatically caught and passed to error middleware
}));

// Throw meaningful errors
if (!item) {
    const error = new Error('Item not found');
    error.status = 404;
    throw error;
}
```

---

## SQL Patterns

### Query Style

```sql
-- Use explicit schema prefix
SELECT * FROM master.pricebook_materials WHERE st_id = $1;

-- Use parameterized queries (NEVER string interpolation)
const result = await pool.query(
    'SELECT * FROM master.pricebook_materials WHERE st_id = $1',
    [stId]
);

-- Use meaningful aliases
SELECT m.st_id, m.name, c.name as category_name
FROM master.pricebook_materials m
JOIN master.pricebook_categories c ON c.st_id = ANY(m.category_ids);
```

### Migrations

```sql
-- Always include header
-- Migration: 025_feature_name
-- Description: Add new feature tables
-- Date: 2025-01-11

BEGIN;

-- Create with all constraints
CREATE TABLE schema.table_name (
    id SERIAL PRIMARY KEY,
    st_id BIGINT UNIQUE,
    tenant_id VARCHAR(20) NOT NULL DEFAULT '3222348440',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_table_tenant ON schema.table_name(tenant_id);

COMMIT;
```

---

## File Organization

### Frontend
```
apps/web/
├── app/                    # Next.js pages
│   ├── (dashboard)/        # Dashboard routes
│   └── api/                # API routes (proxy)
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Layout components
│   └── <feature>/          # Feature components
├── hooks/                  # Custom hooks
└── lib/                    # Utilities
```

### Backend
```
services/api/
├── src/
│   ├── routes/             # Express routes
│   ├── services/           # Business logic
│   ├── middleware/         # Express middleware
│   ├── db/                 # Database connections
│   └── utils/              # Utilities
└── tests/                  # Test files
```

---

## Don'ts

- ❌ Don't use `any` type
- ❌ Don't leave `console.log` in production code
- ❌ Don't hardcode secrets or IDs
- ❌ Don't use string interpolation in SQL
- ❌ Don't ignore TypeScript errors
- ❌ Don't skip error handling
- ❌ Don't mutate props or state directly

---

*Coding standards - LAZI AI*
