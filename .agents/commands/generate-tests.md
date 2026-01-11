---
description: Generate tests for a file or feature
argument-hint: [file-path]
allowed-tools: Bash(*), Read, Write, Edit
---

# Command: /generate-tests

Generate tests for a file or feature.

## Usage
```
/generate-tests <file-path>          # Tests for specific file
/generate-tests <feature-name>       # Tests for feature
```

## Test Types

### API Route Tests
```javascript
// services/api/tests/<route>.test.js
import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/pricebook/materials', () => {
    it('should return materials list', async () => {
        const res = await request(app)
            .get('/api/pricebook/materials')
            .set('x-tenant-id', '3222348440');
        
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should filter by category', async () => {
        const res = await request(app)
            .get('/api/pricebook/materials?categoryId=123')
            .set('x-tenant-id', '3222348440');
        
        expect(res.status).toBe(200);
    });

    it('should require tenant ID', async () => {
        const res = await request(app)
            .get('/api/pricebook/materials');
        
        expect(res.status).toBe(400);
    });
});
```

### Database Query Tests
```javascript
describe('Material queries', () => {
    it('should find material by st_id', async () => {
        const result = await pool.query(
            'SELECT * FROM master.pricebook_materials WHERE st_id = $1',
            [12345]
        );
        expect(result.rows.length).toBe(1);
    });
});
```

### React Component Tests
```typescript
// apps/web/components/__tests__/Component.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component } from '../Component';

const queryClient = new QueryClient();

describe('Component', () => {
    it('renders correctly', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <Component />
            </QueryClientProvider>
        );
        expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
});
```

## Test Patterns

### Mock ServiceTitan API
```javascript
jest.mock('../services/stClient', () => ({
    get: jest.fn().mockResolvedValue({
        data: { data: [{ id: 1, name: 'Test' }] }
    })
}));
```

### Mock Database
```javascript
jest.mock('../db/schema-connection', () => ({
    query: jest.fn().mockResolvedValue({ rows: [] })
}));
```

## Run Tests
```bash
# API tests
cd services/api && npm test

# Specific test file
npm test -- --grep "materials"

# With coverage
npm test -- --coverage
```
