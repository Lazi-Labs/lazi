---
description: Debug performance issues in pages or endpoints
argument-hint: [area]
allowed-tools: Bash(*), Read, Write, Edit
---

# Command: /debug-performance

Debug slow pages or endpoints.

## Usage
```
/debug-performance <page-or-endpoint>
```

## Process

### 1. MEASURE
- Get baseline timing
- Identify the slow component

### 2. PROFILE

#### Backend
```bash
# Add timing to route
console.time('operation');
// ... code
console.timeEnd('operation');

# Check slow queries
EXPLAIN ANALYZE <query>;
```

#### Frontend
```javascript
// React DevTools Profiler
// Network tab timing
// Performance tab flame graph
```

### 3. IDENTIFY

Common causes:
- **N+1 queries**: Multiple DB calls in loop
- **Missing indexes**: Full table scans
- **Large payloads**: Fetching too much data
- **No pagination**: Loading all records
- **Missing cache**: Repeated expensive operations
- **Sync rendering**: Blocking main thread

### 4. FIX

#### Database
```sql
-- Add index
CREATE INDEX idx_table_column ON schema.table(column);

-- Use pagination
LIMIT 50 OFFSET 0
```

#### API
```javascript
// Add caching
const cached = await redis.get(key);
if (cached) return JSON.parse(cached);

// Use select fields
SELECT id, name FROM table  -- not SELECT *
```

#### Frontend
```javascript
// Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';

// Lazy load components
const Component = dynamic(() => import('./Heavy'));

// Memoize expensive computations
const result = useMemo(() => expensive(data), [data]);
```

### 5. VALIDATE
- Measure again
- Compare before/after
- Document improvement

## LAZI Performance Targets

| Metric | Target |
|--------|--------|
| API response | < 500ms |
| Page load | < 2s |
| DB query | < 100ms |
| Cache hit | > 80% |
