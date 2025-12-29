# LAZI Server Setup - Completion Guide

## ✅ Completed Setup Steps

### Phase 1-2: ServiceTitan Integration
- ✅ ST Automation analyzed (already integrated in LAZI)
- ✅ LAZI has complete ST client infrastructure
- ✅ Token manager and API client ready

### Phase 3: Supabase Database
- ✅ Database connection verified
- ✅ Extensions enabled (uuid-ossp, pg_trgm)
- ✅ All schemas present: raw, master, crm, sync, workflow, audit
- ✅ Total tables: 132 across all schemas

### Phase 4: Image Storage
- ✅ Supabase Storage service created at `services/api/src/services/storage.js`
- ✅ Ready for pricebook image uploads

### Phase 5: Environment Configuration
- ✅ Backend `.env` configured with production settings
- ✅ Frontend `.env.local` created
- ⚠️ **ACTION REQUIRED**: Add Supabase API keys to `.env`

### Phase 6: Dependencies
- ✅ Backend dependencies installed
- ✅ Frontend dependencies installed (Builder.io removed due to compatibility)
- ✅ Redis running in Docker

### Phase 7: PM2 Configuration
- ✅ `ecosystem.config.js` created
- ✅ Log directories created

---

## 🔧 Required Manual Steps

### 1. Add Supabase API Keys

Get your keys from: https://supabase.com/dashboard/project/cvqduvqzkvqnjouuzldk/settings/api

Edit `/home/serveradmin/projects/lazi/services/api/.env`:
```bash
SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_KEY=your-actual-service-key-here
```

### 2. Create Supabase Storage Bucket

Go to: https://supabase.com/dashboard/project/cvqduvqzkvqnjouuzldk/storage/buckets

Create bucket:
- Name: `pricebook-images`
- Public: Yes
- File size limit: 50MB
- Allowed MIME types: image/*

### 3. Install PM2 (if not already installed)

```bash
npm install -g pm2
```

### 4. Build Frontend for Production

```bash
cd ~/projects/lazi/apps/web
npm run build
```

### 5. Start Services with PM2

```bash
cd ~/projects/lazi
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions to enable on boot
```

### 6. Monitor Services

```bash
pm2 status
pm2 logs lazi-api
pm2 logs lazi-web
```

---

## 🚀 Quick Start Commands

### Start Everything
```bash
cd ~/projects/lazi
pm2 start ecosystem.config.js
```

### Check Status
```bash
pm2 status
pm2 logs --lines 50
```

### Restart Services
```bash
pm2 restart all
# or individually
pm2 restart lazi-api
pm2 restart lazi-web
```

### Stop Services
```bash
pm2 stop all
pm2 delete all  # To remove from PM2
```

---

## 🔄 Initial Data Sync

Once services are running, trigger the initial sync:

```bash
# Test ServiceTitan connection
curl http://localhost:3001/health

# Trigger full pricebook sync
curl -X POST "http://localhost:3001/api/pricebook/categories/sync" \
  -H "x-tenant-id: 3222348440" \
  -H "Content-Type: application/json" \
  -d '{"mode": "full"}'

# Verify data synced
export SUPABASE_URL="postgresql://postgres.cvqduvqzkvqnjouuzldk:Catchadmin202525@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
psql "$SUPABASE_URL" -c "SELECT COUNT(*) FROM master.pricebook_categories WHERE tenant_id = '3222348440';"
```

---

## 🌐 Domain Setup (Optional - For Production)

### Nginx Configuration

Create `/etc/nginx/sites-available/lazi`:

```nginx
# Frontend
server {
    listen 80;
    server_name lazi.perfectcatch.ai;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.lazi.perfectcatch.ai;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/lazi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Certbot
```bash
sudo certbot --nginx -d lazi.perfectcatch.ai -d api.lazi.perfectcatch.ai
```

### Update Frontend .env for Production Domain
```bash
# Edit apps/web/.env.local
NEXT_PUBLIC_API_URL=https://api.lazi.perfectcatch.ai
API_URL=http://localhost:3001
NEXT_PUBLIC_TENANT_ID=3222348440
```

Then rebuild and restart:
```bash
cd ~/projects/lazi/apps/web
npm run build
pm2 restart lazi-web
```

---

## 📊 Monitoring & Logs

### View Logs
```bash
# All logs
pm2 logs

# Specific service
pm2 logs lazi-api
pm2 logs lazi-web

# Last 100 lines
pm2 logs --lines 100

# Follow logs in real-time
pm2 logs --lines 0
```

### Check Health
```bash
# API health
curl http://localhost:3001/health

# Detailed health
curl http://localhost:3001/health/detailed

# Frontend
curl -I http://localhost:3000
```

### Database Queries
```bash
export SUPABASE_URL="postgresql://postgres.cvqduvqzkvqnjouuzldk:Catchadmin202525@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# Check categories
psql "$SUPABASE_URL" -c "SELECT COUNT(*) FROM master.pricebook_categories;"

# Check sync status
psql "$SUPABASE_URL" -c "SELECT * FROM sync.sync_status ORDER BY last_sync_at DESC LIMIT 5;"
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process on port 3001
sudo lsof -ti:3001
# or
sudo netstat -tlnp | grep 3001

# Kill process
sudo kill -9 <PID>
```

### Redis Not Running
```bash
# Check Redis
docker ps | grep redis

# Start Redis if needed
docker start redis
# or
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Database Connection Issues
```bash
# Test connection
psql "postgresql://postgres.cvqduvqzkvqnjouuzldk:Catchadmin202525@aws-1-us-east-2.pooler.supabase.com:5432/postgres" -c "SELECT NOW();"
```

### PM2 Issues
```bash
# Reset PM2
pm2 kill
pm2 start ecosystem.config.js

# Update PM2
npm install -g pm2@latest
pm2 update
```

---

## 📁 Project Structure

```
/home/serveradmin/projects/lazi/
├── services/
│   └── api/
│       ├── src/
│       │   ├── services/
│       │   │   ├── stClient.js          # ServiceTitan API client
│       │   │   ├── tokenManager.js      # OAuth token management
│       │   │   └── storage.js           # Supabase storage (NEW)
│       │   └── server.js
│       ├── .env                         # Backend config (UPDATED)
│       └── logs/                        # PM2 logs
├── apps/
│   └── web/
│       ├── .env.local                   # Frontend config (NEW)
│       └── logs/                        # PM2 logs
├── database/
│   └── scripts/                         # SQL migrations (already run)
├── ecosystem.config.js                  # PM2 config (NEW)
└── SETUP_COMPLETE.md                    # This file
```

---

## ✅ Final Checklist

- [ ] Supabase API keys added to `.env`
- [ ] Supabase storage bucket created
- [ ] PM2 installed globally
- [ ] Frontend built for production
- [ ] Services started with PM2
- [ ] PM2 startup enabled
- [ ] Initial data sync completed
- [ ] Health checks passing
- [ ] (Optional) Nginx configured
- [ ] (Optional) SSL certificates installed

---

## 🎯 Next Steps

1. **Add Supabase keys** to `.env`
2. **Create storage bucket** in Supabase dashboard
3. **Build frontend**: `cd apps/web && npm run build`
4. **Start services**: `pm2 start ecosystem.config.js`
5. **Trigger sync**: Run the curl command above
6. **Verify**: Check logs and health endpoints

---

## 📞 Support

- Supabase Dashboard: https://supabase.com/dashboard/project/cvqduvqzkvqnjouuzldk
- ServiceTitan Tenant ID: 3222348440
- Project Path: `/home/serveradmin/projects/lazi`
