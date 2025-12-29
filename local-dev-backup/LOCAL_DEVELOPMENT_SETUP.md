# LAZI CRM - Local Development Setup Guide

## Table of Contents
1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [GitHub Repository Change](#github-repository-change)
3. [Supabase Connection](#supabase-connection)
4. [Remove Traefik / Configure Local Ports](#remove-traefik--configure-local-ports)
5. [Environment Variables for Local Development](#environment-variables-for-local-development)
6. [ServiceTitan API Considerations](#servicetitan-api-considerations)
7. [Potential Issues & Solutions](#potential-issues--solutions)
8. [Step-by-Step Migration Commands](#step-by-step-migration-commands)

---

## Pre-Migration Checklist

### Files to Backup
Before making any changes, backup these critical files:

- [ ] `.env` (production environment variables)
- [ ] `.env.local` (if exists)
- [ ] `docker-compose.yml`
- [ ] `docker-compose.override.yml` (if exists)
- [ ] `apps/web/next.config.js`
- [ ] `apps/api/src/config/*`
- [ ] Any custom Traefik configuration files

### Critical Environment Variables to Document
Make sure you have these values saved somewhere secure:

- `DATABASE_URL` - Your Supabase connection string
- `SERVICE_TITAN_CLIENT_ID`
- `SERVICE_TITAN_CLIENT_SECRET`
- `SERVICE_TITAN_APP_KEY`
- `DEFAULT_TENANT_ID`
- `REDIS_URL` (production)
- `AWS_*` credentials (if using S3)
- `TWILIO_*` credentials
- `RESEND_API_KEY`
- `PLAID_CLIENT_ID` and `PLAID_SECRET`

### Pre-Flight Check
Run the included `preflight-check.sh` script to identify potential issues:

```bash
cd local-dev-backup
chmod +x preflight-check.sh
./preflight-check.sh
```

---

## GitHub Repository Change

You have **3 options** for changing your GitHub repository:

### Option 1: Create a New Repository (Recommended for Clean Start)

```bash
# 1. Create a new repo on GitHub (e.g., username/lazi-crm-local)

# 2. Change the remote URL
git remote set-url origin https://github.com/username/lazi-crm-local.git

# 3. Push to the new repository
git push -u origin main
```

### Option 2: Create a New Branch (Recommended for Testing)

```bash
# 1. Create and checkout a new branch
git checkout -b local-development

# 2. Make your changes and commit
git add .
git commit -m "Configure for local development"

# 3. Push the new branch
git push -u origin local-development
```

### Option 3: Fork the Repository

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/your-username/lazi-crm.git
cd lazi-crm

# 3. Add upstream remote (to pull updates from original)
git remote add upstream https://github.com/original-owner/lazi-crm.git
```

**Recommendation:** Use Option 2 (branch) for testing, then Option 1 (new repo) once stable.

---

## Supabase Connection

### Good News: No Changes Needed! ✅

Your Supabase database connection **remains exactly the same** for local development:

- The `DATABASE_URL` stays unchanged
- Supabase is already cloud-hosted and accessible from anywhere
- No need to run a local PostgreSQL instance
- All your data, tables, and RLS policies work as-is

### Why This Works

```
┌─────────────────┐
│ Local Machine   │
│                 │
│  ┌───────────┐  │         ┌──────────────────┐
│  │  Next.js  │──┼────────▶│  Supabase Cloud  │
│  │  (3000)   │  │         │                  │
│  └───────────┘  │         │  - PostgreSQL    │
│                 │         │  - Auth          │
│  ┌───────────┐  │         │  - Storage       │
│  │  API      │──┼────────▶│  - Realtime      │
│  │  (3001)   │  │         └──────────────────┘
│  └───────────┘  │
└─────────────────┘
```

### Verify Connection

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"
```

---

## Remove Traefik / Configure Local Ports

### Architecture Change

**BEFORE (Production with Traefik):**
```
Internet → Traefik (443) → Routes to:
  ├─ app.lazilabs.com → Next.js (internal)
  └─ api.lazilabs.com → API (internal)
```

**AFTER (Local Development):**
```
Localhost → Direct Access:
  ├─ http://localhost:3000 → Next.js
  └─ http://localhost:3001 → API
```

### Changes Required

1. **Remove Traefik labels from docker-compose.yml** (if using Docker)
2. **Expose ports directly** instead of through Traefik
3. **Update CORS settings** to allow localhost origins
4. **Remove SSL/TLS configuration** (use HTTP locally)

### Docker Compose Changes

**Before:**
```yaml
services:
  web:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`app.lazilabs.com`)"
      - "traefik.http.routers.web.entrypoints=websecure"
```

**After:**
```yaml
services:
  web:
    ports:
      - "3000:3000"
```

---

## Environment Variables for Local Development

### Key Changes Summary

| Variable | Production | Local Development | Changed? |
|----------|-----------|-------------------|----------|
| `DATABASE_URL` | Supabase URL | **Same Supabase URL** | ❌ No |
| `SERVICE_TITAN_*` | Production keys | **Same keys** | ❌ No |
| `REDIS_URL` | Production Redis | `redis://localhost:6379` | ✅ Yes |
| `ST_AUTOMATION_URL` | `https://api.lazilabs.com` | `http://localhost:3001` | ✅ Yes |
| `NEXT_PUBLIC_API_URL` | `https://api.lazilabs.com/api` | `http://localhost:3001/api` | ✅ Yes |
| `NEXT_PUBLIC_APP_URL` | `https://app.lazilabs.com` | `http://localhost:3000` | ✅ Yes |
| `NEXT_PUBLIC_SOCKET_URL` | `https://api.lazilabs.com` | `http://localhost:3001` | ✅ Yes |
| `NODE_ENV` | `production` | `development` | ✅ Yes |
| `CORS_ORIGINS` | Production domains | `http://localhost:3000` | ✅ Yes |
| `PLAID_REDIRECT_URI` | Production callback | `http://localhost:3000/api/plaid/oauth-redirect` | ✅ Yes |

### Full .env.local Template

```bash
# ===========================================
# LAZI CRM - Local Development Environment
# ===========================================

# ===== DATABASE (UNCHANGED) =====
# Keep your production Supabase connection
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# ===== REDIS (LOCAL) =====
# Point to local Redis instance
REDIS_URL=redis://localhost:6379

# ===== SERVICETITAN API (UNCHANGED) =====
# Use the same production API credentials
SERVICE_TITAN_CLIENT_ID=your_client_id
SERVICE_TITAN_CLIENT_SECRET=your_client_secret
SERVICE_TITAN_APP_KEY=your_app_key
DEFAULT_TENANT_ID=3222348440

# ===== API URLS (LOCAL) =====
# Point to local services
ST_AUTOMATION_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# ===== NODE ENVIRONMENT =====
NODE_ENV=development

# ===== CORS =====
# Allow localhost origins
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# ===== PLAID (if used) =====
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
PLAID_REDIRECT_URI=http://localhost:3000/api/plaid/oauth-redirect

# ===== AWS (UNCHANGED - if using S3) =====
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# ===== TWILIO (UNCHANGED) =====
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# ===== RESEND (UNCHANGED) =====
RESEND_API_KEY=your_resend_key

# ===== JWT & SESSION =====
JWT_SECRET=your_jwt_secret_min_32_chars
SESSION_SECRET=your_session_secret_min_32_chars

# ===== OPTIONAL: BullMQ Dashboard =====
BULLMQ_DASHBOARD_USER=admin
BULLMQ_DASHBOARD_PASSWORD=admin123
```

### Using the convert-env.sh Script

The included script automatically converts your production `.env` to `.env.local`:

```bash
cd local-dev-backup
chmod +x convert-env.sh
./convert-env.sh ../path/to/production/.env
```

This will create `.env.local` with all the correct local development values.

---

## ServiceTitan API Considerations

### Good News: Server-Side Calls Still Work! ✅

ServiceTitan API calls made from your **backend/API server** will continue to work without changes because:

1. **Server-to-Server Communication**: Your API server makes requests directly to ServiceTitan's API
2. **Same Credentials**: You're using the same `SERVICE_TITAN_CLIENT_ID`, `CLIENT_SECRET`, and `APP_KEY`
3. **No CORS Issues**: Server-side requests don't have CORS restrictions

### OAuth Callback URLs - ACTION REQUIRED ⚠️

If you use ServiceTitan OAuth, you **must** update the redirect URI in your ServiceTitan app settings:

**Production Callback:**
```
https://app.lazilabs.com/api/servicetitan/oauth-callback
```

**Local Development Callback:**
```
http://localhost:3000/api/servicetitan/oauth-callback
```

### Options for OAuth During Development

**Option 1: Add localhost to allowed callbacks** (Recommended)
- Go to ServiceTitan Developer Portal
- Add `http://localhost:3000/api/servicetitan/oauth-callback` to allowed redirect URIs
- Keep production URL as well

**Option 2: Use a separate ServiceTitan app for development**
- Create a new ServiceTitan app for local dev
- Use different credentials in `.env.local`

**Option 3: Use ngrok for testing OAuth**
```bash
ngrok http 3000
# Use the ngrok URL as your callback
```

### Testing ServiceTitan Integration

```bash
# Test API connection
curl http://localhost:3001/api/servicetitan/test-connection

# Check OAuth flow
# Visit: http://localhost:3000/settings/integrations/servicetitan
```

---

## Potential Issues & Solutions

### 1. CORS Issues

**Symptom:** Browser console shows CORS errors when frontend calls API

**Solution:**
```javascript
// apps/api/src/config/cors.js or similar
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
};
```

**Environment Variable:**
```bash
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 2. WebSocket Connection Issues

**Symptom:** Socket.io fails to connect, shows connection errors

**Solution:**
```javascript
// apps/web/src/lib/socket.js or similar
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
  transports: ['websocket', 'polling'],
  withCredentials: true,
});
```

**Server-side CORS for Socket.io:**
```javascript
// apps/api/src/server.js
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});
```

### 3. Image/Asset Loading Issues

**Symptom:** Images or assets fail to load, 404 errors

**Possible Causes:**
- Hardcoded production URLs in code
- Next.js image optimization pointing to wrong domain
- S3 bucket CORS not allowing localhost

**Solutions:**

**Check for hardcoded URLs:**
```bash
# Run preflight-check.sh to find hardcoded URLs
./preflight-check.sh
```

**Next.js Image Configuration:**
```javascript
// apps/web/next.config.js
module.exports = {
  images: {
    domains: [
      'localhost',
      process.env.AWS_S3_BUCKET ? `${process.env.AWS_S3_BUCKET}.s3.amazonaws.com` : '',
    ].filter(Boolean),
  },
};
```

**S3 CORS Configuration:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://app.lazilabs.com"
    ],
    "ExposeHeaders": []
  }
]
```

### 4. BullMQ/Redis Queue Issues

**Symptom:** Background jobs not processing, queue errors

**Solution:**

**Ensure Redis is running:**
```bash
docker-compose -f docker-compose.local.yml up -d redis
```

**Check Redis connection:**
```bash
redis-cli ping
# Should return: PONG
```

**Update BullMQ connection:**
```javascript
// apps/api/src/queues/connection.js or similar
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};
```

### 5. Hardcoded Production URLs

**Symptom:** App tries to connect to production URLs instead of localhost

**Solution:**

**Find hardcoded URLs:**
```bash
# Search for production domains
grep -r "lazilabs.com" apps/
grep -r "perfectcatchai.com" apps/
grep -r "https://app." apps/
```

**Replace with environment variables:**
```javascript
// ❌ Bad
const apiUrl = 'https://api.lazilabs.com';

// ✅ Good
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
```

### 6. Database Migration Issues

**Symptom:** Database schema out of sync

**Solution:**
```bash
# Run migrations
cd apps/api
pnpm prisma migrate dev

# Or if using a different ORM
pnpm run migrate
```

### 7. Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3002 pnpm dev
```

### 8. Environment Variables Not Loading

**Symptom:** App can't find environment variables

**Solution:**

**Check file location:**
```bash
# .env.local should be in the app root
ls -la apps/web/.env.local
ls -la apps/api/.env.local
```

**Restart the dev server:**
```bash
# Stop all services
pkill -f "next dev"
pkill -f "node"

# Restart
pnpm dev
```

---

## Step-by-Step Migration Commands

### Step 1: Backup Current Setup

```bash
# Create backup directory
mkdir -p ~/lazi-crm-backup

# Backup environment files
cp .env ~/lazi-crm-backup/.env.production
cp .env.local ~/lazi-crm-backup/.env.local.backup 2>/dev/null || true

# Backup docker-compose
cp docker-compose.yml ~/lazi-crm-backup/docker-compose.yml.backup 2>/dev/null || true

# Create git backup
git branch backup-$(date +%Y%m%d)
```

### Step 2: Run Pre-Flight Check

```bash
cd local-dev-backup
chmod +x preflight-check.sh
./preflight-check.sh > preflight-report.txt

# Review the report
cat preflight-report.txt
```

### Step 3: Convert Environment Variables

```bash
# Convert production .env to local .env.local
chmod +x convert-env.sh
./convert-env.sh ../.env

# This creates .env.local in the project root
# Review and edit as needed
nano ../.env.local
```

### Step 4: Set Up Local Services

```bash
# Copy docker-compose for local services
cp docker-compose.local.yml ../docker-compose.local.yml

# Start Redis
cd ..
docker-compose -f docker-compose.local.yml up -d redis

# Verify Redis is running
docker ps | grep redis
redis-cli ping
```

### Step 5: Install Dependencies

```bash
# Install or update dependencies
pnpm install

# If you have workspaces
pnpm install -r
```

### Step 6: Run Database Migrations (if needed)

```bash
# If using Prisma
cd apps/api
pnpm prisma generate
pnpm prisma migrate deploy

# Or for development with migration creation
pnpm prisma migrate dev
```

### Step 7: Update Git Remote (Choose One Option)

**Option A: New Repository**
```bash
# Create new repo on GitHub first, then:
git remote set-url origin https://github.com/your-username/lazi-crm-local.git
git push -u origin main
```

**Option B: New Branch**
```bash
git checkout -b local-development
git add .
git commit -m "Configure for local development"
git push -u origin local-development
```

### Step 8: Start Development Servers

```bash
# Start all services (if using turborepo)
pnpm dev

# Or start individually
cd apps/web && pnpm dev &
cd apps/api && pnpm dev &
```

### Step 9: Verify Everything Works

```bash
# Check web app
curl http://localhost:3000

# Check API
curl http://localhost:3001/api/health

# Check Redis
redis-cli ping

# Check database connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Step 10: Test Critical Features

1. **Login/Authentication**
   - Visit http://localhost:3000
   - Try logging in

2. **API Calls**
   - Open browser console
   - Check for CORS errors
   - Verify API requests go to localhost:3001

3. **WebSocket/Real-time**
   - Test any real-time features
   - Check socket connection in Network tab

4. **ServiceTitan Integration**
   - Test ServiceTitan API calls
   - If using OAuth, test the flow

5. **Background Jobs**
   - Trigger a background job
   - Check Redis queue processing

### Step 11: Monitor Logs

```bash
# Web app logs
cd apps/web && pnpm dev

# API logs
cd apps/api && pnpm dev

# Redis logs
docker logs -f lazi-redis-local

# All logs in separate terminals
tmux new-session \; \
  split-window -h \; \
  split-window -v \; \
  select-pane -t 0 \; \
  send-keys 'cd apps/web && pnpm dev' C-m \; \
  select-pane -t 1 \; \
  send-keys 'cd apps/api && pnpm dev' C-m \; \
  select-pane -t 2 \; \
  send-keys 'docker logs -f lazi-redis-local' C-m
```

---

## Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| CORS errors | Check `CORS_ORIGINS` in `.env.local` |
| Socket won't connect | Verify `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001` |
| Redis connection failed | Run `docker-compose -f docker-compose.local.yml up -d redis` |
| Port in use | `lsof -i :3000` then `kill -9 <PID>` |
| Env vars not loading | Restart dev server, check file location |
| Images not loading | Check Next.js image domains config |
| ServiceTitan OAuth fails | Update redirect URI in ST portal |
| Database errors | Run `pnpm prisma migrate dev` |

---

## Success Checklist

- [ ] All services start without errors
- [ ] Web app loads at http://localhost:3000
- [ ] API responds at http://localhost:3001
- [ ] No CORS errors in browser console
- [ ] WebSocket connects successfully
- [ ] Can log in and authenticate
- [ ] ServiceTitan API calls work
- [ ] Background jobs process
- [ ] Images and assets load
- [ ] Database queries execute
- [ ] Redis connection stable

---

## Next Steps

1. **Test thoroughly** - Use the app as you would in production
2. **Document issues** - Keep track of any problems you encounter
3. **Update this guide** - Add solutions to new issues you find
4. **Create a local branch** - Keep local config separate from production
5. **Set up CI/CD** - Configure GitHub Actions for local testing

---

## Support

If you encounter issues not covered in this guide:

1. Check the `preflight-report.txt` for warnings
2. Review application logs for errors
3. Search for hardcoded production URLs
4. Verify all environment variables are set correctly
5. Test each service independently

---

**Last Updated:** December 2024
**Version:** 1.0.0
