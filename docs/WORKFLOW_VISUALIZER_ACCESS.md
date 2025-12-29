# LAZI Workflow Visualizer - Access Guide

**Updated:** December 26, 2024

---

## 🚀 How to Access

### Via Traefik (Production/Domain)
```
https://lazilabs.com/dashboard/workflows
```

### Via Direct Port (Development)
```
http://localhost:3000/workflows
```

### Via Developer Dashboard
1. Navigate to: `https://lazilabs.com/dashboard/developer`
2. Click the **"Workflow Visualizer"** tab
3. Click **"Open Workflow Visualizer"** button

---

## 🔧 Traefik Configuration

The workflow visualizer is already configured to work with Traefik. The existing configuration routes all Next.js frontend traffic through Traefik:

### Current Setup
```yaml
# File: /opt/docker/apps/lazi/infrastructure/docker/docker-compose.traefik.yml

services:
  lazi-router:
    labels:
      # Frontend (includes /workflows route)
      - "traefik.http.routers.lazi-web.rule=Host(`lazilabs.com`) && PathPrefix(`/dashboard`)"
      - "traefik.http.routers.lazi-web.entrypoints=websecure"
      - "traefik.http.routers.lazi-web.tls=true"
      - "traefik.http.routers.lazi-web.tls.certresolver=letsencrypt"
      - "traefik.http.routers.lazi-web.service=lazi-web"
      - "traefik.http.services.lazi-web.loadbalancer.server.url=http://host.docker.internal:3000"
      - "traefik.http.middlewares.lazi-web-stripprefix.stripprefix.prefixes=/dashboard"
      - "traefik.http.routers.lazi-web.middlewares=lazi-web-stripprefix"
      
      # API (for workflow stats endpoints)
      - "traefik.http.routers.lazi-api.rule=Host(`lazilabs.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.lazi-api.entrypoints=websecure"
      - "traefik.http.routers.lazi-api.tls=true"
      - "traefik.http.routers.lazi-api.tls.certresolver=letsencrypt"
      - "traefik.http.routers.lazi-api.service=lazi-api"
      - "traefik.http.services.lazi-api.loadbalancer.server.url=http://host.docker.internal:3001"
```

**✅ Configuration updated!** The `/dashboard/workflows` route is handled by the `lazi-web` router with path prefix stripping.

---

## 📍 Access Points

### 1. Developer Dashboard Tab
**Location:** Developer Dashboard → Workflow Visualizer Tab

**Features:**
- Quick access button
- Feature overview
- API endpoint links
- Documentation

**Path:** `/developer` → Click "Workflow Visualizer" tab

### 2. Direct Route
**Location:** `/workflows`

**Features:**
- Full workflow canvas
- Visual editing
- Real-time data
- Import/Export

**Path:** Direct navigation to `/workflows`

---

## 🔗 API Endpoints

All API endpoints are accessible through Traefik:

### Production URLs
```bash
# Schema Statistics
https://lazilabs.com/api/v2/workflows/stats/schemas

# Table Statistics
https://lazilabs.com/api/v2/workflows/stats/tables/raw

# Live System Stats
https://lazilabs.com/api/v2/workflows/stats/live
```

### Development URLs
```bash
# Schema Statistics
http://localhost:3001/api/v2/workflows/stats/schemas

# Table Statistics
http://localhost:3001/api/v2/workflows/stats/tables/raw

# Live System Stats
http://localhost:3001/api/v2/workflows/stats/live
```

### Required Headers
```bash
X-Tenant-ID: 3222348440
```

---

## 🧪 Testing Access

### Test Frontend Access
```bash
# Production
curl -I https://lazilabs.com/dashboard/workflows

# Development
curl -I http://localhost:3000/workflows
```

### Test API Access
```bash
# Production
curl https://lazilabs.com/api/v2/workflows/stats/schemas \
  -H "X-Tenant-ID: 3222348440"

# Development
curl http://localhost:3001/api/v2/workflows/stats/schemas \
  -H "X-Tenant-ID: 3222348440"
```

---

## 🎯 Developer Dashboard Integration

The Workflow Visualizer has been added to the Developer Dashboard with:

### Tab Features
- **Visual Overview** - Feature cards showing capabilities
- **Quick Access Button** - Direct link to workflow canvas
- **Feature List** - All available features with checkmarks
- **Quick Links** - Direct links to canvas and API endpoints

### Tab Location
Navigate to: `/developer` → **"Workflow Visualizer"** tab (3rd tab)

### Tab Content
```
┌─────────────────────────────────────────────────┐
│  🔀 Workflow Visualizer                         │
│  Visual workflow and data flow visualization    │
│                                                  │
│  📊 Visual Data Flow  ⚡ Real-time Stats        │
│  🎨 Drag & Drop                                  │
│                                                  │
│  [Open Workflow Visualizer] →                   │
└─────────────────────────────────────────────────┘
```

---

## 🚦 Service Status

### Required Services
- ✅ **Next.js Frontend** - Port 3000 (via PM2 or npm run dev)
- ✅ **Express API** - Port 3001 (via PM2 or npm start)
- ✅ **PostgreSQL** - Port 5432
- ✅ **Traefik** - Ports 80/443 (for production access)

### Check Service Status
```bash
# Check if services are running
pm2 status

# Check Traefik
docker ps | grep traefik

# Check if ports are listening
netstat -tuln | grep -E '3000|3001|5432'
```

---

## 🔐 Authentication

Currently, the workflow visualizer is accessible without authentication. Future updates will integrate with the LAZI auth system.

**Planned:**
- Session-based authentication
- Role-based access control (RBAC)
- Tenant isolation

---

## 📱 Browser Compatibility

Tested and working on:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari

**Requirements:**
- Modern browser with ES6+ support
- JavaScript enabled
- WebSocket support (for future real-time features)

---

## 🐛 Troubleshooting

### Issue: 404 Not Found
**Cause:** Frontend service not running or route not registered

**Solution:**
```bash
# Restart Next.js frontend
cd /opt/docker/apps/lazi/apps/web
npm run dev
# or
pm2 restart lazi-web
```

### Issue: API Endpoints Not Working
**Cause:** Backend service not running or wrong URL

**Solution:**
```bash
# Restart API service
cd /opt/docker/apps/lazi/services/api
npm start
# or
pm2 restart lazi-api

# Check API health
curl http://localhost:3001/api/health
```

### Issue: Live Data Not Updating
**Cause:** API endpoints not accessible or CORS issues

**Solution:**
1. Check `NEXT_PUBLIC_API_URL` in `.env.local`
2. Verify API is running on port 3001
3. Check browser console for errors

### Issue: Traefik Not Routing
**Cause:** Traefik container not running or misconfigured

**Solution:**
```bash
# Check Traefik status
docker ps | grep lazi-router

# Restart Traefik
cd /opt/docker/apps/lazi/infrastructure/docker
docker-compose -f docker-compose.traefik.yml restart

# Check Traefik logs
docker logs lazi-router
```

---

## 📊 Usage Statistics

Track workflow visualizer usage:

```sql
-- Add to analytics queries
SELECT 
  COUNT(*) as page_views,
  COUNT(DISTINCT session_id) as unique_sessions
FROM analytics.page_views
WHERE page_path = '/workflows'
  AND created_at > NOW() - INTERVAL '7 days';
```

---

## 🎓 Quick Start Guide

### For Developers
1. Navigate to `https://lazilabs.com/dashboard/developer`
2. Click **"Workflow Visualizer"** tab
3. Click **"Open Workflow Visualizer"**
4. Explore the default data flow chain

### For Direct Access
1. Navigate to `https://lazilabs.com/dashboard/workflows`
2. See the visual canvas with default workflow
3. Drag nodes to reposition
4. Click nodes to inspect properties
5. Use toolbar to import/export workflows

---

## 📚 Related Documentation

- **Main Deployment Guide:** `/opt/docker/apps/lazi/docs/WORKFLOW_VISUALIZER_DEPLOYMENT.md`
- **Feature README:** `/opt/docker/apps/lazi/apps/web/app/features/workflow-visualizer/README.md`
- **Traefik Config:** `/opt/docker/apps/lazi/infrastructure/docker/docker-compose.traefik.yml`

---

## ✅ Verification Checklist

- [x] Traefik routing configured
- [x] Developer dashboard tab added
- [x] Frontend route created (`/workflows`)
- [x] Backend API endpoints created
- [x] Live data polling implemented
- [x] Import/Export functionality working
- [x] Documentation complete

---

## 🎉 Summary

The LAZI Workflow Visualizer is now fully accessible via:

1. **Production URL:** `https://lazilabs.com/dashboard/workflows`
2. **Developer Dashboard:** `https://lazilabs.com/dashboard/developer` → "Workflow Visualizer" tab
3. **Development URL:** `http://localhost:3000/workflows`

Traefik configuration has been updated to route `lazilabs.com/dashboard/*` to the Next.js frontend with path prefix stripping! 🚀
