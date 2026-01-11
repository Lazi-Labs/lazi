# Command: /fix-types

Fix TypeScript type errors.

## Usage
```
/fix-types                           # Fix all type errors
/fix-types <file-path>               # Fix specific file
```

## Process

### 1. Identify Errors
```bash
cd apps/web && npx tsc --noEmit
```

### 2. Common Fixes

#### Missing Type
```typescript
// Error: Parameter 'x' implicitly has an 'any' type
// Fix: Add type annotation
function process(x: string) { ... }
```

#### Nullable Value
```typescript
// Error: Object is possibly 'undefined'
// Fix: Optional chaining or null check
const name = user?.name ?? 'Unknown';
```

#### Type Mismatch
```typescript
// Error: Type 'string' is not assignable to type 'number'
// Fix: Convert or fix the type
const id = parseInt(stringId, 10);
```

#### Missing Property
```typescript
// Error: Property 'x' does not exist on type 'Y'
// Fix: Extend interface or use correct type
interface Y {
    x: string;
    // add missing property
}
```

### 3. LAZI-Specific Types

#### API Response Types
```typescript
// apps/web/lib/api.ts
interface Material {
    st_id: number;
    code: string;
    name: string;
    price: number;
    // ...
}
```

#### Component Props
```typescript
interface MaterialCardProps {
    material: Material;
    onEdit?: (id: number) => void;
    className?: string;
}
```

#### React Query
```typescript
const { data } = useQuery<Material[]>({
    queryKey: ['materials'],
    queryFn: fetchMaterials,
});
```

### 4. Type Utilities

```typescript
// Partial - all optional
type PartialMaterial = Partial<Material>;

// Pick - select fields
type MaterialSummary = Pick<Material, 'st_id' | 'name'>;

// Omit - exclude fields
type NewMaterial = Omit<Material, 'st_id' | 'created_at'>;
```

## Don't Do
- Avoid `any` unless absolutely necessary
- Don't use `@ts-ignore` without comment
- Don't disable strict mode

## Verify Fix
```bash
npx tsc --noEmit  # Should exit 0
```
