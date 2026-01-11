# ServiceTitan Integration Reference

## Overview

LAZI integrates with ServiceTitan's REST API v2 to sync pricebook data, customers, jobs, scheduling, and more.

## Configuration

### Environment Variables
```bash
SERVICE_TITAN_CLIENT_ID=cid.1abc2def3...      # OAuth client ID
SERVICE_TITAN_CLIENT_SECRET=cs1.abc123...     # OAuth client secret
SERVICE_TITAN_APP_KEY=ak1.xyz789...           # Application key
SERVICE_TITAN_TENANT_ID=3222348440            # Tenant ID (Perfect Catch)
```

### API Base URL
```
https://api.servicetitan.io
```

---

## Authentication

### OAuth2 Client Credentials Flow

```javascript
// services/api/src/services/tokenManager.js

// Token endpoint
POST https://auth.servicetitan.io/connect/token

// Request body (form-urlencoded)
grant_type=client_credentials
client_id=${CLIENT_ID}
client_secret=${CLIENT_SECRET}

// Response
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Token Management

- Tokens cached in memory
- Auto-refresh 5 minutes before expiry
- All requests include:
  - `Authorization: Bearer <token>`
  - `ST-App-Key: <app_key>`

---

## API Modules

### Pricebook API (`/pricebook/v2/tenant/{tenantId}`)

#### Categories
```bash
GET /categories                    # List all categories
GET /categories/{id}               # Get single category
POST /categories                   # Create category
PATCH /categories/{id}             # Update category
DELETE /categories/{id}            # Delete category
```

#### Materials
```bash
GET /materials                     # List materials
GET /materials/{id}                # Get material
POST /materials                    # Create material
PATCH /materials/{id}              # Update material
DELETE /materials/{id}             # Delete material
```

#### Services
```bash
GET /services                      # List services
GET /services/{id}                 # Get service
POST /services                     # Create service
PATCH /services/{id}               # Update service
DELETE /services/{id}              # Delete service
```

#### Equipment
```bash
GET /equipment                     # List equipment
GET /equipment/{id}                # Get equipment
POST /equipment                    # Create equipment
PATCH /equipment/{id}              # Update equipment
DELETE /equipment/{id}             # Delete equipment
```

#### Images
```bash
GET /images/{id}                   # Get image binary
POST /images                       # Upload image
DELETE /images/{id}                # Delete image
```

### CRM API (`/crm/v2/tenant/{tenantId}`)

```bash
GET /customers                     # List customers
GET /customers/{id}                # Get customer
POST /customers                    # Create customer
PATCH /customers/{id}              # Update customer

GET /locations                     # List locations
GET /locations/{id}                # Get location
POST /locations                    # Create location
PATCH /locations/{id}              # Update location

GET /contacts                      # List contacts
GET /contacts/{id}                 # Get contact
```

### Job Management API (`/jpm/v2/tenant/{tenantId}`)

```bash
GET /jobs                          # List jobs
GET /jobs/{id}                     # Get job
POST /jobs                         # Create job
PATCH /jobs/{id}                   # Update job
POST /jobs/{id}/cancel             # Cancel job

GET /appointments                  # List appointments
GET /appointments/{id}             # Get appointment
POST /appointments                 # Create appointment
PATCH /appointments/{id}           # Update appointment

GET /projects                      # List projects
GET /projects/{id}                 # Get project
```

### Dispatch API (`/dispatch/v2/tenant/{tenantId}`)

```bash
GET /technicians                   # List technicians
GET /technicians/{id}              # Get technician

GET /teams                         # List teams
GET /teams/{id}                    # Get team

GET /zones                         # List zones
GET /zones/{id}                    # Get zone
```

### Accounting API (`/accounting/v2/tenant/{tenantId}`)

```bash
GET /invoices                      # List invoices
GET /invoices/{id}                 # Get invoice

GET /payments                      # List payments
GET /payments/{id}                 # Get payment
```

### Inventory API (`/inventory/v2/tenant/{tenantId}`)

```bash
GET /adjustments                   # List adjustments
GET /purchase-orders               # List POs
GET /vendors                       # List vendors
GET /warehouses                    # List warehouses
```

---

## Pagination

All list endpoints support pagination:

```bash
GET /materials?page=1&pageSize=100

# Response
{
  "page": 1,
  "pageSize": 100,
  "totalCount": 5719,
  "hasMore": true,
  "data": [...]
}
```

### Fetching All Pages
```javascript
// services/api/src/services/stClient.js
async fetchAllPages(endpoint, options = {}) {
  const allData = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 100) {
    const response = await stRequest(endpoint, {
      ...options,
      query: { ...options.query, page, pageSize: 100 },
    });

    if (response.ok && response.data.data?.length) {
      allData.push(...response.data.data);
      hasMore = response.data.hasMore;
    } else {
      hasMore = false;
    }

    page++;
    if (hasMore) await sleep(200); // Rate limiting
  }

  return allData;
}
```

---

## Rate Limiting

### Limits
- **Per minute**: ~60 requests
- **Per hour**: ~3600 requests
- **Concurrent**: ~10 requests

### Handling
```javascript
// Built into stClient.js
if (response.status === 429) {
  const retryAfter = response.headers.get('retry-after');
  const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
  await sleep(delayMs);
  return stRequest(url, { ...options, retryCount: retryCount + 1 });
}
```

### Best Practices
- Add 200ms delay between paginated requests
- Use incremental sync when possible
- Cache responses in Redis
- Queue bulk operations via BullMQ

---

## Data Mapping

### Material Fields

| ST Field | LAZI Field | Type |
|----------|------------|------|
| `id` | `st_id` | BigInt |
| `code` | `code` | String |
| `displayName` | `name` | String |
| `description` | `description` | String |
| `cost` | `cost` | Decimal |
| `price` | `price` | Decimal |
| `memberPrice` | `member_price` | Decimal |
| `addOnPrice` | `add_on_price` | Decimal |
| `active` | `active` | Boolean |
| `hours` | `hours` | Decimal |
| `bonus` | `bonus` | Decimal |
| `commissionBonus` | `commission_bonus` | Decimal |
| `paysCommission` | `pays_commission` | Boolean |
| `deductAsJobCost` | `deduct_as_job_cost` | Boolean |
| `isInventory` | `is_inventory` | Boolean |
| `unitOfMeasure` | `unit_of_measure` | String |
| `categories` | `category_ids` | BigInt[] |
| `assets` | `images` | JSONB |

### Service Fields

| ST Field | LAZI Field | Type |
|----------|------------|------|
| `id` | `st_id` | BigInt |
| `code` | `code` | String |
| `displayName` | `name` | String |
| `description` | `description` | String |
| `price` | `price` | Decimal |
| `memberPrice` | `member_price` | Decimal |
| `durationHours` | `duration_hours` | Decimal |
| `active` | `active` | Boolean |
| `categories` | `category_ids` | BigInt[] |
| `materials` | `materials` | JSONB |
| `equipment` | `equipment` | JSONB |
| `recommendations` | `recommendations` | JSONB |
| `upgrades` | `upgrades` | JSONB |

### Category Fields

| ST Field | LAZI Field | Type |
|----------|------------|------|
| `id` | `st_id` | BigInt |
| `name` | `name` | String |
| `image` | `image_url` | String |
| `subcategories` | (expanded) | Nested |
| `categoryType` | `category_type` | 'Materials' or 'Services' |

---

## Common Operations

### Sync Categories
```javascript
// Fetch from ST
const categories = await stClient.pricebook.categories.list();

// Store in raw
for (const cat of categories) {
  await pool.query(`
    INSERT INTO raw.st_pricebook_categories (st_id, tenant_id, name, image, subcategories, raw_data)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (st_id) DO UPDATE SET
      name = EXCLUDED.name,
      image = EXCLUDED.image,
      subcategories = EXCLUDED.subcategories,
      raw_data = EXCLUDED.raw_data,
      fetched_at = NOW()
  `, [cat.id, tenantId, cat.name, cat.image, JSON.stringify(cat.subcategories), JSON.stringify(cat)]);
}

// Process to master
await pool.query(`
  INSERT INTO master.pricebook_categories (st_id, tenant_id, name, image_url, category_type)
  SELECT st_id, tenant_id, name, image, 
    CASE WHEN ... THEN 'Materials' ELSE 'Services' END
  FROM raw.st_pricebook_categories
  ON CONFLICT (st_id) DO UPDATE SET ...
`);
```

### Push Material Update
```javascript
// Get pending override
const override = await pool.query(`
  SELECT * FROM crm.pricebook_overrides
  WHERE st_pricebook_id = $1 AND item_type = 'material' AND pending_sync = true
`, [stId]);

// Build ST payload
const payload = {
  displayName: override.override_name,
  price: override.override_price,
  // ... other fields
};

// Push to ST
const response = await stRequest(
  `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/materials/${stId}`,
  { method: 'PATCH', body: payload }
);

if (response.ok) {
  // Update master and clear pending flag
  await pool.query(`
    UPDATE master.pricebook_materials SET name = $1, price = $2 WHERE st_id = $3
  `, [payload.displayName, payload.price, stId]);
  
  await pool.query(`
    UPDATE crm.pricebook_overrides SET pending_sync = false, last_synced_at = NOW()
    WHERE st_pricebook_id = $1 AND item_type = 'material'
  `, [stId]);
}
```

### Upload Image
```javascript
// Read image from override
const override = await pool.query(`
  SELECT override_image_data, override_image_mime_type
  FROM crm.pricebook_overrides
  WHERE st_pricebook_id = $1
`, [stId]);

// Upload to ST
const formData = new FormData();
formData.append('file', Buffer.from(override.override_image_data), {
  filename: `material_${stId}.jpg`,
  contentType: override.override_image_mime_type,
});

const response = await fetch(
  `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/images`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'ST-App-Key': appKey,
    },
    body: formData,
  }
);

const { id: imageId } = await response.json();

// Associate image with material
await stRequest(
  `https://api.servicetitan.io/pricebook/v2/tenant/${tenantId}/materials/${stId}`,
  {
    method: 'PATCH',
    body: { assets: [{ id: imageId, type: 'Image' }] }
  }
);
```

---

## Error Handling

### Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 401 | Unauthorized | Token expired - auto-refresh |
| 403 | Forbidden | Check app permissions |
| 404 | Not Found | Entity doesn't exist in ST |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Retry with backoff |

### Error Response Format
```json
{
  "type": "https://api.servicetitan.io/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request body is invalid",
  "errors": {
    "price": ["Price must be greater than 0"]
  }
}
```

---

## Webhooks (Future)

ServiceTitan supports webhooks for real-time updates:

```bash
# Webhook events
pricebook.material.created
pricebook.material.updated
pricebook.service.created
pricebook.service.updated
customer.created
customer.updated
job.created
job.updated
job.completed
```

---

## Testing

### Smoke Test
```bash
cd services/api
npm run smoke
```

### Manual API Test
```bash
# Get recent customers
npm run recent-customers

# Test specific endpoint
curl -H "Authorization: Bearer $TOKEN" \
     -H "ST-App-Key: $APP_KEY" \
     "https://api.servicetitan.io/pricebook/v2/tenant/3222348440/materials?pageSize=5"
```

---

## Resources

- [ServiceTitan Developer Portal](https://developer.servicetitan.io/)
- [API Documentation](https://developer.servicetitan.io/docs)
- [OpenAPI Specs](docs/api/*.json)
- [Endpoint Registry](docs/api/ENDPOINT_REGISTRY_SUMMARY.md)

---

*ServiceTitan integration documentation - January 2025*
