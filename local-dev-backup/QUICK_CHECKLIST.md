# LAZI CRM - Local Development Quick Checklist

## 🚀 Quick Start (5 Minutes)

### 1. Change GitHub Remote
```bash
# Option A: New repo
git remote set-url origin https://github.com/your-username/lazi-crm-local.git
git push -u origin main

# Option B: New branch (recommended for testing)
git checkout -b local-development
git push -u origin local-development
```

### 2. Convert Environment Variables
```bash
cd local-dev-backup
chmod +x convert-env.sh
./convert-env.sh ../.env
# Creates .env.local in project root
```

### 3. Start Local Services
```bash
# Start Redis
docker-compose -f docker-compose.local.yml up -d redis

# Verify
redis-cli ping  # Should return: PONG
```

### 4. Install & Start
```bash
# Install dependencies
pnpm install

# Start dev servers
pnpm dev
```

---

## 📋 Environment Variable Changes

| Variable | From (Production) | To (Local) |
|----------|------------------|------------|
| `REDIS_URL` | `redis://prod-redis:6379` | `redis://localhost:6379` |
| `ST_AUTOMATION_URL` | `https://api.lazilabs.com` | `http://localhost:3001` |
| `NEXT_PUBLIC_API_URL` | `https://api.lazilabs.com/api` | `http://localhost:3001/api` |
| `NEXT_PUBLIC_APP_URL` | `https://app.lazilabs.com` | `http://localhost:3000` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://api.lazilabs.com` | `http://localhost:3001` |
| `NODE_ENV` | `production` | `development` |
| `CORS_ORIGINS` | `https://app.lazilabs.com` | `http://localhost:3000,http://127.0.0.1:3000` |
| `PLAID_REDIRECT_URI` | `https://app.lazilabs.com/api/plaid/oauth-redirect` | `http://localhost:3000/api/plaid/oauth-redirect` |

### ✅ Keep Unchanged
- `DATABASE_URL` (Supabase)
- `SERVICE_TITAN_*` (all ServiceTitan vars)
- `AWS_*` (S3 credentials)
- `TWILIO_*` (Twilio credentials)
- `RESEND_API_KEY`
- `PLAID_CLIENT_ID` and `PLAID_SECRET`

### ❌ Remove/Skip
- `TRAEFIK_*` (all Traefik vars)
- `ACME_*` (Let's Encrypt)
- `LETSENCRYPT_*`

---

## 🔧 Local Setup Commands

```bash
# 1. Backup current setup
mkdir -p ~/lazi-crm-backup
cp .env ~/lazi-crm-backup/.env.production
git branch backup-$(date +%Y%m%d)

# 2. Run preflight check
cd local-dev-backup
chmod +x preflight-check.sh
./preflight-check.sh

# 3. Convert environment
chmod +x convert-env.sh
./convert-env.sh ../.env

# 4. Start Redis
cd ..
docker-compose -f docker-compose.local.yml up -d redis

# 5. Install dependencies
pnpm install

# 6. Run migrations (if needed)
cd apps/api
pnpm prisma migrate dev

# 7. Start development
cd ../..
pnpm dev
```

---

## ✅ Verification Commands

### Check Services
```bash
# Web app
curl http://localhost:3000
# Expected: HTML response or redirect

# API health
curl http://localhost:3001/api/health
# Expected: {"status":"ok"} or similar

# Redis
redis-cli ping
# Expected: PONG

# Database
psql $DATABASE_URL -c "SELECT 1;"
# Expected: 1 row returned
```

### Check Processes
```bash
# See what's running on ports
lsof -i :3000  # Next.js web
lsof -i :3001  # API server
lsof -i :6379  # Redis

# Check Docker containers
docker ps | grep redis
```

### Check Environment
```bash
# Verify .env.local exists
ls -la .env.local

# Check specific variables
grep "NEXT_PUBLIC_API_URL" .env.local
grep "REDIS_URL" .env.local
```

---

## 🐛 Common Issues Quick Fixes

### CORS Errors
```bash
# Check CORS_ORIGINS in .env.local
echo "CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000" >> .env.local

# Restart API server
pkill -f "node.*api"
cd apps/api && pnpm dev
```

### WebSocket Won't Connect
```bash
# Verify socket URL
grep "NEXT_PUBLIC_SOCKET_URL" .env.local
# Should be: http://localhost:3001

# Check browser console for errors
# Open DevTools → Console → look for socket errors
```

### Redis Connection Failed
```bash
# Start Redis
docker-compose -f docker-compose.local.yml up -d redis

# Check if running
docker ps | grep redis

# Test connection
redis-cli ping

# Check logs
docker logs lazi-redis-local
```

### Port Already in Use
```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3002 pnpm dev
```

### Environment Variables Not Loading
```bash
# Stop all services
pkill -f "next dev"
pkill -f node

# Verify file location
ls -la .env.local
ls -la apps/web/.env.local
ls -la apps/api/.env.local

# Restart
pnpm dev
```

### Images Not Loading
```bash
# Check Next.js config
cat apps/web/next.config.js | grep -A 5 "images"

# Should include localhost in domains
# If not, add:
# images: {
#   domains: ['localhost', ...],
# }
```

### ServiceTitan OAuth Fails
```
1. Go to ServiceTitan Developer Portal
2. Add redirect URI: http://localhost:3000/api/servicetitan/oauth-callback
3. Keep production URL as well
4. Save changes
5. Test OAuth flow again
```

### Database Migration Errors
```bash
cd apps/api

# Reset database (⚠️ CAUTION: deletes data)
pnpm prisma migrate reset

# Or just run pending migrations
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate
```

---

## 🎯 Testing Checklist

### Basic Functionality
- [ ] Web app loads at http://localhost:3000
- [ ] API responds at http://localhost:3001
- [ ] No errors in browser console
- [ ] No errors in terminal logs

### Authentication
- [ ] Can access login page
- [ ] Can log in successfully
- [ ] Session persists on refresh
- [ ] Can log out

### API Communication
- [ ] API calls go to localhost:3001
- [ ] No CORS errors
- [ ] Responses return correctly
- [ ] Error handling works

### Real-time Features
- [ ] WebSocket connects (check Network tab)
- [ ] Real-time updates work
- [ ] No socket disconnections

### ServiceTitan Integration
- [ ] API calls to ServiceTitan work
- [ ] OAuth flow works (if applicable)
- [ ] Data syncs correctly

### Background Jobs
- [ ] Jobs are queued in Redis
- [ ] Jobs process successfully
- [ ] Can view queue status

### File Uploads
- [ ] Can upload files
- [ ] Files save correctly
- [ ] Can retrieve uploaded files

---

## 📊 Service Status Dashboard

```bash
# Quick status check script
echo "=== LAZI CRM Local Dev Status ==="
echo ""
echo "Web App (3000):"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
echo ""
echo "API (3001):"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health
echo ""
echo "Redis:"
redis-cli ping 2>/dev/null || echo "Not running"
echo ""
echo "Database:"
psql $DATABASE_URL -c "SELECT 1;" > /dev/null 2>&1 && echo "Connected" || echo "Failed"
echo ""
```

---

## 🔄 Daily Workflow

### Starting Work
```bash
# 1. Start Redis (if not running)
docker-compose -f docker-compose.local.yml up -d redis

# 2. Pull latest changes
git pull origin local-development

# 3. Install any new dependencies
pnpm install

# 4. Start dev servers
pnpm dev
```

### During Development
```bash
# View logs
# Terminal 1: Web app
cd apps/web && pnpm dev

# Terminal 2: API
cd apps/api && pnpm dev

# Terminal 3: Redis logs
docker logs -f lazi-redis-local
```

### Ending Work
```bash
# Stop dev servers (Ctrl+C in terminals)

# Optional: Stop Redis
docker-compose -f docker-compose.local.yml down

# Commit changes
git add .
git commit -m "Your changes"
git push
```

---

## 🆘 Emergency Reset

If everything is broken:

```bash
# 1. Stop all services
pkill -f "next dev"
pkill -f node
docker-compose -f docker-compose.local.yml down

# 2. Clean install
rm -rf node_modules
rm -rf apps/*/node_modules
pnpm install

# 3. Reset environment
cp local-dev-backup/.env.local.template .env.local
# Edit .env.local with your values

# 4. Restart Redis
docker-compose -f docker-compose.local.yml up -d redis

# 5. Start fresh
pnpm dev
```

---

## 📞 Need Help?

1. **Check preflight report**: `cat local-dev-backup/preflight-report.txt`
2. **Review full guide**: `local-dev-backup/LOCAL_DEVELOPMENT_SETUP.md`
3. **Check logs**: Look for errors in terminal output
4. **Verify environment**: Ensure all variables are set correctly
5. **Test services individually**: Isolate the problem

---

## 🎉 Success Indicators

You're ready to develop when:

- ✅ No red errors in terminal
- ✅ Web app loads without console errors
- ✅ API responds to requests
- ✅ WebSocket shows "connected" in DevTools
- ✅ Can log in and use the app
- ✅ Background jobs process
- ✅ All tests pass

---

**Quick Reference Card - Keep This Handy!**

| Service | URL | Check Command |
|---------|-----|---------------|
| Web App | http://localhost:3000 | `curl http://localhost:3000` |
| API | http://localhost:3001 | `curl http://localhost:3001/api/health` |
| Redis | localhost:6379 | `redis-cli ping` |
| Database | (Supabase) | `psql $DATABASE_URL -c "SELECT 1;"` |

**Last Updated:** December 2024
