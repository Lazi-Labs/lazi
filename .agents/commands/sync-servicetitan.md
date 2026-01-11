---
description: Trigger or debug ServiceTitan sync operations
argument-hint: [entity]?
allowed-tools: Bash(*), Read, Write, Edit
---

# Command: /sync-servicetitan

Trigger or debug ServiceTitan sync operations.

## Usage
```
/sync-servicetitan <entity>           # Sync specific entity
/sync-servicetitan full               # Full sync all entities
/sync-servicetitan status             # Check sync status
```

## Entities
- `categories` - Pricebook categories
- `materials` - Pricebook materials
- `services` - Pricebook services
- `equipment` - Pricebook equipment
- `customers` - Customer records
- `jobs` - Job records

## API Endpoints

### Pull from ServiceTitan
```bash
# Categories
curl -X POST http://localhost:3001/api/pricebook/categories/sync

# Materials
curl -X POST http://localhost:3001/api/pricebook/materials/sync

# Full sync
curl -X POST http://localhost:3001/api/pricebook/sync/full
```

### Push to ServiceTitan
```bash
# Push pending category changes
curl -X POST http://localhost:3001/api/pricebook/categories/push

# Push pending material changes
curl -X POST http://localhost:3001/api/pricebook/materials/push
```

### Check Status
```bash
curl http://localhost:3001/api/pricebook/sync/status
```

## Debug Sync Issues

### Check Sync State
```sql
SELECT table_name, sync_status, last_full_sync, records_count
FROM raw.sync_state
ORDER BY last_full_sync DESC;
```

### Check Pending Changes
```sql
SELECT st_pricebook_id, item_type, pending_sync, sync_error
FROM crm.pricebook_overrides
WHERE pending_sync = true;
```

### Check Rate Limits
- ST API: 60 requests/minute
- Add delays in loops: `await sleep(100)`

## Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check ST credentials in .env |
| 429 Rate Limited | Wait 60s, reduce batch size |
| Empty results | Check tenant ID |
| Sync stuck | Check BullMQ queue status |
