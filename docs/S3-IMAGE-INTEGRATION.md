# S3 Image Integration - Frontend Implementation Guide

## Overview

S3 images have been successfully integrated into all pricebook API endpoints. Images are now automatically resolved with the following priority:

1. **S3 Migrated Image** (from ServiceTitan → S3 migration)
2. **ServiceTitan Original URL** (fallback if not yet migrated)
3. **null** (no image available)

## API Endpoints Updated

All pricebook endpoints now include an `image_url` field in their responses:

### Services
- `GET /api/pricebook/services` - List with images
- `GET /api/pricebook/services/:stId` - Detail with images + linked materials/equipment images

### Materials
- `GET /api/pricebook/db/materials` - List with images

### Equipment
- Equipment endpoints available via `/api/pricebook/equipment/*`

### Categories
- `GET /api/pricebook/categories` - List with images

### Image Resolution Endpoint
- `GET /api/pricebook/images/:entityType/:stId` - Direct image URL resolution
- `POST /api/pricebook/images/:entityType/batch` - Batch image resolution

---

## API Response Examples

### Service List Response
```json
{
  "data": [
    {
      "st_id": "12698",
      "name": "BLOWER - Electrical Hook Up (PB)",
      "price": 299.99,
      "image_url": "https://lazi-pricebook-images.s3.us-east-2.amazonaws.com/3222348440/services/12698.jpg",
      "active": true
    }
  ],
  "total": 1685,
  "page": 1,
  "limit": 100
}
```

### Service Detail Response (with linked materials/equipment)
```json
{
  "st_id": "12698",
  "name": "BLOWER - Electrical Hook Up (PB)",
  "price": 299.99,
  "image_url": "https://lazi-pricebook-images.s3.us-east-2.amazonaws.com/3222348440/services/12698.jpg",
  "materials": [
    {
      "st_id": "61924502",
      "name": "PVC Conduit",
      "quantity": 2,
      "cost": 5.50,
      "image_url": "https://lazi-pricebook-images.s3.us-east-2.amazonaws.com/3222348440/materials/61924502.jpg"
    }
  ],
  "equipment": [
    {
      "st_id": "71234567",
      "name": "Blower Motor",
      "quantity": 1,
      "image_url": "https://lazi-pricebook-images.s3.us-east-2.amazonaws.com/3222348440/equipment/71234567.jpg"
    }
  ]
}
```

### Material List Response
```json
{
  "data": [
    {
      "stId": "61924502",
      "name": "PVC Conduit",
      "cost": 5.50,
      "price": 12.99,
      "image_url": "https://lazi-pricebook-images.s3.us-east-2.amazonaws.com/3222348440/materials/61924502.jpg"
    }
  ],
  "totalCount": 4769,
  "page": 1,
  "pageSize": 25
}
```

### Category List Response
```json
{
  "data": [
    {
      "st_id": "165",
      "name": "HVAC Services",
      "item_count": 45,
      "image_url": "https://lazi-pricebook-images.s3.us-east-2.amazonaws.com/3222348440/categories/165.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 89
  }
}
```

---

## Frontend Implementation

### React Component Example - Service Card

```jsx
// components/ServiceCard.jsx
export function ServiceCard({ service }) {
  return (
    <div className="service-card">
      {service.image_url ? (
        <img 
          src={service.image_url} 
          alt={service.name}
          className="service-image"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <div className="service-placeholder">
          <span>📷</span>
        </div>
      )}
      <h3>{service.name}</h3>
      <p className="price">${service.price}</p>
    </div>
  );
}
```

### React Component Example - Service Detail with Materials

```jsx
// pages/services/[id].jsx
export function ServiceDetail({ service }) {
  return (
    <div className="service-detail">
      {/* Main service image */}
      <div className="service-header">
        {service.image_url && (
          <img 
            src={service.image_url} 
            alt={service.name} 
            className="service-main-image"
            loading="eager"
          />
        )}
        <h1>{service.name}</h1>
        <p className="price">${service.price}</p>
      </div>

      {/* Linked Materials */}
      {service.materials?.length > 0 && (
        <section className="materials-section">
          <h2>Materials ({service.materials.length})</h2>
          <div className="materials-grid">
            {service.materials.map(material => (
              <div key={material.st_id} className="material-card">
                {material.image_url ? (
                  <img 
                    src={material.image_url} 
                    alt={material.name}
                    loading="lazy"
                  />
                ) : (
                  <div className="placeholder">📦</div>
                )}
                <span className="name">{material.name}</span>
                <span className="qty">Qty: {material.quantity}</span>
                <span className="cost">${material.cost}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Linked Equipment */}
      {service.equipment?.length > 0 && (
        <section className="equipment-section">
          <h2>Equipment ({service.equipment.length})</h2>
          <div className="equipment-grid">
            {service.equipment.map(item => (
              <div key={item.st_id} className="equipment-card">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} loading="lazy" />
                )}
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

### Reusable Image Component with Fallback

```jsx
// components/PricebookImage.jsx
import { useState } from 'react';

export function PricebookImage({ 
  src, 
  alt, 
  fallback = '📷', 
  className = '',
  loading = 'lazy'
}) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!src || error) {
    return (
      <div className={`image-placeholder ${className}`}>
        <span>{fallback}</span>
      </div>
    );
  }

  return (
    <div className={`image-container ${className}`}>
      {isLoading && <div className="image-skeleton" />}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
}

// Usage
<PricebookImage 
  src={service.image_url} 
  alt={service.name}
  fallback="🔧"
  className="service-thumbnail"
/>
```

---

## Next.js Specific Configuration

If using Next.js, add the S3 domain to your image configuration:

```javascript
// next.config.js
module.exports = {
  images: {
    domains: [
      'lazi-pricebook-images.s3.us-east-2.amazonaws.com',
      'go.servicetitan.com',  // Fallback for non-migrated images
    ],
    // Optional: Add image optimization
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
};
```

### Next.js Image Component

```jsx
// components/PricebookImage.jsx (Next.js version)
import Image from 'next/image';
import { useState } from 'react';

export function PricebookImage({ 
  src, 
  alt, 
  width = 200, 
  height = 200,
  className = ''
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`placeholder ${className}`} style={{ width, height }}>
        <span>📷</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized  // S3 images are already optimized
      onError={() => setError(true)}
    />
  );
}
```

---

## CSS Styling Examples

```css
/* Service Card */
.service-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.service-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.service-placeholder {
  width: 100%;
  height: 200px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
}

/* Image Loading Skeleton */
.image-skeleton {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Material Card */
.material-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.material-card img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 4px;
}

.material-card .placeholder {
  width: 64px;
  height: 64px;
  background: #f3f4f6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
```

---

## Testing Checklist

- [x] Services list includes `image_url` field
- [x] Service detail includes `image_url` field
- [x] Service detail includes materials with `image_url`
- [x] Service detail includes equipment with `image_url`
- [x] Materials list includes `image_url` field
- [x] Categories list includes `image_url` field
- [x] Image resolution endpoint works: `/api/pricebook/images/:entityType/:stId`
- [x] S3 images are valid and accessible
- [x] Fallback handling for null/missing images
- [ ] Frontend components display images correctly
- [ ] Image lazy loading implemented
- [ ] Error handling for failed image loads
- [ ] Placeholder/skeleton UI for loading states

---

## Migration Status

### Current Statistics (Tenant: 3222348440)

**Services:**
- Migrated: 8 images
- Pending: 1,677 images
- No Image: 476 items

**Materials:**
- Pending: 4,769 images
- No Image: 754 items

**Equipment:**
- Pending: 249 images
- No Image: 29 items

### Migration Endpoints

To migrate more images, use:

```bash
# Migrate services (batch of 25)
curl -X POST http://localhost:3001/api/pricebook/images/migrate/services \
  -H "x-tenant-id: 3222348440" \
  -H "Content-Type: application/json" \
  -d '{"limit": 25}'

# Migrate materials (batch of 25)
curl -X POST http://localhost:3001/api/pricebook/images/migrate/materials \
  -H "x-tenant-id: 3222348440" \
  -H "Content-Type: application/json" \
  -d '{"limit": 25}'

# Check migration status
curl -s http://localhost:3001/api/pricebook/images/migrate/status \
  -H "x-tenant-id: 3222348440"
```

---

## Troubleshooting

### Image Not Displaying

1. **Check if image_url is present in API response**
   ```bash
   curl -s "http://localhost:3001/api/pricebook/services/12698" \
     -H "x-tenant-id: 3222348440" | jq '.image_url'
   ```

2. **Verify S3 image is accessible**
   ```bash
   curl -I https://lazi-pricebook-images.s3.us-east-2.amazonaws.com/3222348440/services/12698.jpg
   ```

3. **Check browser console for CORS errors**
   - S3 bucket should have CORS configured for your domain

4. **Verify Next.js image domains configuration**
   - Ensure S3 domain is in `next.config.js`

### Image Returns 404

- Image may not be migrated yet
- Check migration status endpoint
- Run migration for that entity type

### Slow Image Loading

- Implement lazy loading: `loading="lazy"`
- Use image optimization/CDN
- Consider image thumbnails for list views
- Implement progressive image loading

---

## Future Enhancements

1. **Custom Image Upload** - Allow users to upload custom images via CRM
2. **Image Caching** - Implement CDN or CloudFront for faster delivery
3. **Image Optimization** - Resize/compress images on upload
4. **Bulk Migration** - Background job to migrate all images at once
5. **Image Variants** - Generate thumbnails, medium, and large versions
6. **Image Search** - Filter pricebook items by "has image" / "no image"

---

## Support

For issues or questions:
- Check API logs: `docker logs lazi-api --tail 100`
- Test image resolution: `GET /api/pricebook/images/:entityType/:stId`
- Verify database: Check `s3_image_url` column in master tables
