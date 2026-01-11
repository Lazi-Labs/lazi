# LAZI Troubleshooting Guide

## Quick Diagnostics

```bash
# Check all services
curl http://localhost:3001/health
curl http://localhost:3001/ready
curl http://localhost:3000/api/health

# Check database
psql "$DATABASE_URL" -c "SELECT 1;"

# Check Redis
redis-cli ping

# Check Docker containers
docker-compose ps
```

---

## Common Issues

### API Won't Start

#### Symptoms
- `Error: Cannot find module`
- `ECONNREFUSED` errors
- Server crashes on startup

#### Solutions

1. **Missing dependencies**
```bash
cd services/api
rm -rf node_modules
npm install
```

2. **Missing Prisma client**
```bash
cd services/api
npx prisma generate
```

3. **Invalid DATABASE_URL**
```bash
# Check connection string format
# Supabase requires: ?sslmode=require
postgresql://user:pass@host:5432/db?sslmode=require
```

4. **Port already in use**
```bash
# Find process using port 3001
lsof -i :3001
kill -9 <PID>
```

5. **Missing environment variables**
```bash
# Check required vars are set
cat services/api/.env | grep -E "^(DATABASE_URL|REDIS_URL|SERVICE_TITAN)"
```

---

### Database Connection Failed

#### Symptoms
- `ECONNREFUSED 127.0.0.1:5432`
- `connection refused`
- `SSL required`

#### Solutions

1. **Local PostgreSQL not running**
```bash
docker-compose up -d postgres
# or
brew services start postgresql
```

2. **Supabase SSL requirement**
```bash
# Add ?sslmode=require to connection string
DATABASE_URL=postgresql://...?sslmode=require
```

3. **Wrong credentials**
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"
```

4. **Supabase project paused**
- Check Supabase dashboard
- Resume project if paused

---

### Redis Connection Failed

#### Symptoms
- `ECONNREFUSED 127.0.0.1:6379`
- BullMQ errors
- Cache not working

#### Solutions

1. **Start Redis**
```bash
docker-compose up -d redis
# or
brew services start redis
```

2. **Check Redis URL**
```bash
# Default local
REDIS_URL=redis://localhost:6379

# Test connection
redis-cli ping
```

3. **Redis memory full**
```bash
redis-cli INFO memory
redis-cli FLUSHALL  # Clear all (dev only!)
```

---

### ServiceTitan Sync Not Working

#### Symptoms
- `401 Unauthorized`
- `429 Too Many Requests`
- Empty sync results
- Sync stuck/hanging

#### Solutions

1. **Invalid credentials**
```bash
# Verify all ST env vars are set
echo $SERVICE_TITAN_CLIENT_ID
echo $SERVICE_TITAN_CLIENT_SECRET
echo $SERVICE_TITAN_APP_KEY
echo $SERVICE_TITAN_TENANT_ID
```

2. **Token expired**
```bash
# Force token refresh by restarting API
pm2 restart lazi-api
```

3. **Rate limited**
```bash
# Wait 60 seconds, then retry
# Check logs for rate limit messages
pm2 logs lazi-api | grep -i "rate"
```

4. **Wrong tenant ID**
```bash
# Perfect Catch tenant ID
SERVICE_TITAN_TENANT_ID=3222348440
```

5. **Sync scheduler disabled**
```bash
# Enable in .env
PRICEBOOK_SYNC_ENABLED=true
SYNC_SCHEDULER_ENABLED=true
```

---

### Frontend Not Loading

#### Symptoms
- Blank page
- 500 errors
- API calls failing

#### Solutions

1. **Backend not running**
```bash
# Check API is running
curl http://localhost:3001/health

# Start if needed
cd services/api && npm run dev
```

2. **Wrong API URL**
```bash
# Check apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
ST_AUTOMATION_URL=http://localhost:3001
```

3. **Build errors**
```bash
cd apps/web
rm -rf .next
npm run build
npm run dev
```

4. **Missing environment variables**
```bash
# Check required frontend vars
cat apps/web/.env.local
```

---

### Images Not Loading

#### Symptoms
- Broken image icons
- 404 on image requests
- Images show as null

#### Solutions

1. **Image not in database**
```bash
# Check if image exists
psql "$DATABASE_URL" -c "
SELECT st_id, default_image_url 
FROM master.pricebook_materials 
WHERE st_id = 12345;
"
```

2. **Image proxy not working**
```bash
# Test direct backend route
curl http://localhost:3001/images/db/materials/12345

# Check Next.js proxy
curl http://localhost:3000/api/pricebook/images/materials/12345
```

3. **ServiceTitan image fetch failed**
```bash
# Images are fetched on-demand from ST
# Check ST credentials and rate limits
```

4. **Subcategory images null**
- Known ST API limitation
- Subcategory images require individual API calls
- Run full category sync to fetch

---

### Pricebook Data Missing

#### Symptoms
- Empty category list
- No materials/services
- Counts show 0

#### Solutions

1. **Initial sync not run**
```bash
# Run full sync
cd services/api
npm run sync:full

# Or via API
curl -X POST http://localhost:3001/api/pricebook/categories/sync
```

2. **Wrong tenant filter**
```bash
# Check tenant ID in requests
curl -H "x-tenant-id: 3222348440" \
  http://localhost:3001/api/pricebook/materials
```

3. **Data in wrong schema**
```bash
# Check raw vs master tables
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM raw.st_pricebook_materials;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM master.pricebook_materials;"
```

4. **Sync failed silently**
```bash
# Check sync state
psql "$DATABASE_URL" -c "SELECT * FROM raw.sync_state;"

# Check for errors
psql "$DATABASE_URL" -c "
SELECT * FROM raw.sync_state WHERE sync_status = 'failed';
"
```

---

### Push to ServiceTitan Failed

#### Symptoms
- "Push failed" error
- Changes not appearing in ST
- Pending changes stuck

#### Solutions

1. **Check pending overrides**
```bash
psql "$DATABASE_URL" -c "
SELECT * FROM crm.pricebook_overrides 
WHERE pending_sync = true;
"
```

2. **Check sync errors**
```bash
psql "$DATABASE_URL" -c "
SELECT st_pricebook_id, item_type, sync_error 
FROM crm.pricebook_overrides 
WHERE sync_error IS NOT NULL;
"
```

3. **Validation errors**
- ST has strict validation
- Check required fields (code, name, price)
- Ensure price > 0

4. **Rate limited**
- Wait and retry
- Push in smaller batches

---

### BullMQ Jobs Stuck

#### Symptoms
- Jobs in "waiting" forever
- Jobs failing repeatedly
- Queue backed up

#### Solutions

1. **Workers not running**
```bash
# Start workers
cd services/api
npm run worker:bullmq
```

2. **Redis connection lost**
```bash
# Check Redis
redis-cli ping

# Restart Redis
docker-compose restart redis
```

3. **Clear stuck jobs**
```bash
# Via Bull Board UI
http://localhost:3001/admin/queues

# Or via Redis CLI
redis-cli DEL "bull:inbound-sync:*"
```

4. **Check job errors**
```bash
# View failed jobs in Bull Board
# Or check logs
pm2 logs lazi-api | grep -i "job failed"
```

---

### Memory Issues

#### Symptoms
- `JavaScript heap out of memory`
- Server crashes under load
- Slow responses

#### Solutions

1. **Increase Node memory**
```bash
# In ecosystem.config.js
max_memory_restart: '1G'

# Or run directly
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

2. **Check for memory leaks**
```bash
# Monitor memory
curl http://localhost:3001/metrics | jq '.memory'
```

3. **Clear caches**
```bash
curl -X DELETE http://localhost:3001/api/cache/clear
```

---

### Socket.io Not Working

#### Symptoms
- Real-time updates not appearing
- "Socket disconnected" errors
- Sync progress not showing

#### Solutions

1. **Check Socket.io connection**
```javascript
// In browser console
const socket = io('http://localhost:3001');
socket.on('connect', () => console.log('Connected'));
socket.on('error', (err) => console.error(err));
```

2. **CORS issues**
```bash
# Check CORS headers in API response
curl -I http://localhost:3001/socket.io/
```

3. **Wrong Socket URL**
```bash
# Check frontend config
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## Logs

### View Logs

```bash
# PM2 logs
pm2 logs
pm2 logs lazi-api
pm2 logs lazi-web

# Docker logs
docker-compose logs -f
docker-compose logs -f lazi-api

# Direct file logs
tail -f services/api/logs/api-out.log
tail -f services/api/logs/api-error.log
```

### Log Levels

```bash
# Set log level in .env
LOG_LEVEL=debug  # debug, info, warn, error
```

---

## Reset Everything

### Full Reset (Development)

```bash
# Stop all services
pm2 stop all
docker-compose down

# Clear data
docker-compose down -v  # Removes volumes
redis-cli FLUSHALL

# Reinstall dependencies
rm -rf node_modules
rm -rf apps/web/node_modules
rm -rf services/api/node_modules
pnpm install

# Regenerate Prisma
cd services/api && npx prisma generate

# Start fresh
docker-compose up -d
pnpm dev
```

---

## Getting Help

1. **Check existing docs**: `docs/` directory
2. **Search codebase**: `grep -r "error message" .`
3. **Check logs**: `pm2 logs` or `docker-compose logs`
4. **Database state**: `psql "$DATABASE_URL"`

---

*Troubleshooting guide - January 2025*
