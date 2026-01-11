# Command: /document-api

Generate or update API documentation.

## Usage
```
/document-api <route-file>           # Document specific route
/document-api all                    # Document all routes
```

## Process

### 1. Analyze Route File
```javascript
// Extract from route file:
// - HTTP method
// - Path
// - Query parameters
// - Request body
// - Response shape
// - Auth requirements
```

### 2. Generate Documentation

```markdown
## Endpoint: GET /api/pricebook/materials

### Description
Retrieve a list of pricebook materials.

### Authentication
Required: Yes (JWT or API Key)

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| x-tenant-id | Yes | ServiceTitan tenant ID |
| Authorization | Yes | Bearer token |

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Items per page |
| categoryId | number | - | Filter by category |
| search | string | - | Search term |

### Response
```json
{
  "success": true,
  "data": [
    {
      "st_id": 12345,
      "code": "MAT-001",
      "name": "Pool Chemical",
      "price": 29.99
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100
  }
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | Missing tenant ID |
| 401 | Unauthorized |
| 500 | Server error |
```

### 3. Update Reference
Add to `.agents/reference/api-routes.md`

## Output Location
- Individual: `docs/api/<route-name>.md`
- Combined: `.agents/reference/api-routes.md`
