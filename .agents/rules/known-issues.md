# LAZI Known Issues & Workarounds

## Active Issues

### 1. Subcategory Images Return Null from ST API

**Symptom**: Subcategory `defaultImageUrl` is always null in bulk API responses.

**Cause**: ServiceTitan bulk category API doesn't return images for subcategories.

**Workaround**: Fetch individual category to get image:
```javascript
// Bulk returns null for subcategory images
const categories = await stClient.pricebook.getCategories();

// Individual fetch returns image
const category = await stClient.pricebook.getCategory(categoryId);
```

**Status**: Won't fix (ST API limitation)

---

### 2. BigInt Serialization in JSON

**Symptom**: `TypeError: Do not know how to serialize a BigInt`

**Cause**: JavaScript's `JSON.stringify` doesn't handle BigInt.

**Workaround**: Patch applied in `app.js`:
```javascript
BigInt.prototype.toJSON = function() {
    return this.toString();
};
```

**Status**: Fixed globally

---

### 3. React Query Cache Stale After Push

**Symptom**: UI doesn't update after pushing changes to ServiceTitan.

**Cause**: Cache not invalidated after mutation.

**Fix**: Always invalidate after mutations:
```javascript
const mutation = useMutation({
    mutationFn: pushToST,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['materials'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
});
```

**Status**: Pattern documented, apply case-by-case

---

### 4. Socket.io Reconnection on Page Navigation

**Symptom**: Socket disconnects when navigating between pages.

**Cause**: Next.js client-side navigation unmounts socket provider.

**Workaround**: Socket provider at root level, reconnection logic:
```javascript
socket.on('disconnect', () => {
    setTimeout(() => socket.connect(), 1000);
});
```

**Status**: Mitigated

---

### 5. ServiceTitan Rate Limiting (429)

**Symptom**: API calls fail with 429 Too Many Requests.

**Cause**: ST API limit is 60 requests/minute.

**Workaround**: 
- Add delays in loops: `await sleep(100)`
- Use batch endpoints where available
- Implement exponential backoff

**Status**: Handled in stClient.js

---

### 6. Prisma Client Not Generated in Docker

**Symptom**: `Error: @prisma/client did not initialize yet`

**Cause**: Prisma client needs to be generated for the target platform.

**Fix**: Add to Dockerfile:
```dockerfile
RUN npx prisma generate
```

**Status**: Fixed in Dockerfile

---

### 7. Material Kit Circular Dependencies

**Symptom**: Kit contains material that references the kit.

**Cause**: No validation for circular references.

**Workaround**: Manual validation before save:
```javascript
function hasCircularDependency(kitId, materialIds) {
    // Check if any material's kits include this kit
}
```

**Status**: TODO - Add validation

---

### 8. Large Pricebook Slow Load

**Symptom**: Pricebook page takes >5s to load with 6000+ materials.

**Cause**: Loading all materials at once.

**Workaround**:
- Use pagination (limit=50)
- Implement virtualization for lists
- Add category filter to reduce dataset

**Status**: Partially addressed

---

## Resolved Issues

### ~~Image Proxy CORS Errors~~
**Resolved**: Added Next.js API route to proxy images from backend.

### ~~Tenant ID Missing in Requests~~
**Resolved**: Added default tenant ID fallback in `getTenantId()`.

### ~~Sync State Not Updating~~
**Resolved**: Fixed upsert query in sync worker.

---

## Reporting New Issues

When documenting a new issue:

```markdown
### X. Issue Title

**Symptom**: What the user sees

**Cause**: Why it happens

**Workaround**: How to fix/avoid

**Status**: Active | Mitigated | TODO | Won't Fix
```

---

*Known issues - Last updated January 2025*
