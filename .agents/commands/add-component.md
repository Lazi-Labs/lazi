---
description: Create a new React component following LAZI patterns
argument-hint: [component-name]
allowed-tools: Bash(*), Read, Write, Edit
---

# Command: /add-component

Create a new React component following LAZI patterns.

## Usage
```
/add-component <name>                # Create component
/add-component <name> --page         # Create page component
```

## Process

### 1. Determine Location
- UI components: `apps/web/components/ui/`
- Feature components: `apps/web/components/<feature>/`
- Pages: `apps/web/app/(dashboard)/<route>/`

### 2. Create Component

#### Basic Component
```tsx
'use client';

import { cn } from '@/lib/utils';

interface ComponentNameProps {
  className?: string;
}

export function ComponentName({ className }: ComponentNameProps) {
  return (
    <div className={cn('', className)}>
      {/* Component content */}
    </div>
  );
}
```

#### Data-Fetching Component
```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ComponentNameProps {
  id: string;
  className?: string;
}

export function ComponentName({ id, className }: ComponentNameProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => fetch(`/api/entity/${id}`).then(r => r.json()),
  });

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (error) {
    return <div className="text-red-500">Error loading data</div>;
  }

  return (
    <div className={cn('', className)}>
      {/* Component content */}
    </div>
  );
}
```

#### Page Component
```tsx
// app/(dashboard)/feature/page.tsx
import { Metadata } from 'next';
import { FeaturePanel } from '@/components/feature/feature-panel';

export const metadata: Metadata = {
  title: 'Feature | LAZI',
};

export default function FeaturePage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Feature</h1>
      <FeaturePanel />
    </div>
  );
}
```

### 3. LAZI Patterns
- Use `'use client'` for interactive components
- Use shadcn/ui components
- Use `cn()` for class merging
- Use React Query for data fetching
- Handle loading/error states

### 4. Add to Navigation (if page)
Update `components/layout/app-sidebar.tsx`
