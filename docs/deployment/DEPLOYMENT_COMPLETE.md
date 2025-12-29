# ✅ LAZI CRM Deployment Complete

**Date**: December 24, 2025  
**Status**: LIVE & OPERATIONAL

---

## 🎉 Deployment Summary

LAZI CRM is now fully deployed and accessible via Cloudflare Tunnel at:

- **Frontend**: https://lazi.perfectcatchai.com
- **API**: https://api.lazi.perfectcatchai.com

---

## ✅ What Was Configured

### 1. Application Services (PM2)
- **lazi-api** - Express backend on port 3001
- **lazi-web** - Next.js frontend on port 3000
- Both services configured for auto-restart
- PM2 configuration saved

### 2. Cloudflare Tunnel Routes
Updated `/etc/cloudflared/config.yml`:
```yaml
- hostname: lazi.perfectcatchai.com
  service: http://localhost:3000
- hostname: api.lazi.perfectcatchai.com
  service: http://localhost:3001
```

### 3. DNS Records (Auto-Created)
Via `cloudflared tunnel route dns`:
- `lazi.perfectcatchai.com` → CNAME to tunnel
- `api.lazi.perfectcatchai.com` → CNAME to tunnel

### 4. Environment Configuration
- Backend `.env` configured with Supabase keys
- Frontend `.env.local` configured with API URLs
- Database connected (132 tables across 7 schemas)
- Redis running in Docker

---

## 🌐 Live URLs

### Frontend
**URL**: https://lazi.perfectcatchai.com  
**Status**: ✅ Live (redirects to /dashboard)  
**Port**: 3000 (localhost)

### API
**URL**: https://api.lazi.perfectcatchai.com  
**Status**: ✅ Live  
**Port**: 3001 (localhost)  
**Health Check**: https://api.lazi.perfectcatchai.com/health

---

## 📊 Service Status

### PM2 Services
```bash
pm2 status
```
| Service | Port | Status | Memory |
|---------|------|--------|--------|
| lazi-api | 3001 | ✅ Online | ~108 MB |
| lazi-web | 3000 | ✅ Online | ~54 MB |

### Cloudflare Tunnel
```bash
sudo systemctl status cloudflared
```
- **Status**: ✅ Active (running)
- **Tunnel ID**: 90ddbbb7-41a2-4976-8d18-c05fa38ab06d
- **Tunnel Name**: claraverse-stack
- **Connections**: 4 active connections to Cloudflare edge

### Docker Services
- **traefik**: Running (not used for LAZI - using Cloudflare Tunnel instead)
- **lazi-router**: Running (Traefik labels container - not actively used)
- **redis**: Running (used by backend)

---

## 🔍 Verification Commands

### Test Local Services
```bash
# Frontend
curl http://localhost:3000 -I

# API
curl http://localhost:3001/health
```

### Test Public URLs
```bash
# Frontend
curl -I https://lazi.perfectcatchai.com

# API
curl https://api.lazi.perfectcatchai.com/health
```

### Check DNS Resolution
```bash
# Use Cloudflare DNS (1.1.1.1) for accurate results
host lazi.perfectcatchai.com 1.1.1.1
host api.lazi.perfectcatchai.com 1.1.1.1
```

### View Logs
```bash
# PM2 logs
pm2 logs
pm2 logs lazi-api
pm2 logs lazi-web

# Cloudflare Tunnel logs
sudo journalctl -u cloudflared -f
```

---

## 🔧 Management Commands

### PM2 Commands
```bash
# Status
pm2 status

# Restart services
pm2 restart all
pm2 restart lazi-api
pm2 restart lazi-web

# Stop services
pm2 stop all

# Start services
pm2 start ecosystem.config.js

# View logs
pm2 logs
pm2 logs lazi-api --lines 50

# Save configuration
pm2 save
```

### Cloudflare Tunnel Commands
```bash
# Status
sudo systemctl status cloudflared

# Restart
sudo systemctl restart cloudflared

# View logs
sudo journalctl -u cloudflared -n 50

# View configuration
sudo cat /etc/cloudflared/config.yml

# Tunnel info
cloudflared tunnel info claraverse-stack
```

---

## 🚀 Auto-Start Configuration

### PM2 Auto-Start (Recommended)
```bash
# Save current processes
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions provided (usually requires sudo)
```

### Cloudflare Tunnel Auto-Start
Already configured! Tunnel starts automatically on server boot:
```bash
sudo systemctl is-enabled cloudflared
# Output: enabled
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `/home/serveradmin/projects/lazi/ecosystem.config.js` | PM2 process configuration |
| `/home/serveradmin/projects/lazi/services/api/.env` | Backend environment variables |
| `/home/serveradmin/projects/lazi/apps/web/.env.local` | Frontend environment variables |
| `/home/serveradmin/projects/lazi/services/api/src/services/storage.js` | Supabase storage service |
| `/etc/cloudflared/config.yml` | Cloudflare Tunnel configuration |
| `/etc/cloudflared/config.yml.backup` | Backup of original tunnel config |

---

## 🔐 Security & SSL

- ✅ **SSL Certificates**: Automatically managed by Cloudflare
- ✅ **HTTPS**: Enforced on all routes
- ✅ **Tunnel Encryption**: All traffic encrypted through Cloudflare Tunnel
- ✅ **No Exposed Ports**: Services only accessible via tunnel (localhost)
- ✅ **Supabase Keys**: Configured in backend `.env`

---

## 🐛 Troubleshooting

### Frontend Not Loading
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs lazi-web --lines 50

# Restart frontend
pm2 restart lazi-web

# Test locally
curl http://localhost:3000 -I
```

### API Not Responding
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs lazi-api --lines 50

# Restart API
pm2 restart lazi-api

# Test locally
curl http://localhost:3001/health
```

### DNS Not Resolving
```bash
# Check with Cloudflare DNS
host lazi.perfectcatchai.com 1.1.1.1
host api.lazi.perfectcatchai.com 1.1.1.1

# Flush local DNS cache
sudo resolvectl flush-caches

# Wait 1-2 minutes for propagation
```

### Tunnel Connection Issues
```bash
# Check tunnel status
sudo systemctl status cloudflared

# View recent logs
sudo journalctl -u cloudflared -n 50

# Restart tunnel
sudo systemctl restart cloudflared

# Verify tunnel info
cloudflared tunnel info 90ddbbb7-41a2-4976-8d18-c05fa38ab06d
```

### Service Crashed
```bash
# Check PM2 logs for errors
pm2 logs lazi-api --err --lines 50
pm2 logs lazi-web --err --lines 50

# Restart crashed service
pm2 restart all

# Check system resources
free -h
df -h
```

---

## 📈 Monitoring

### Quick Health Check Script
```bash
#!/bin/bash
echo "=== LAZI Health Check ==="
echo ""
echo "PM2 Services:"
pm2 status
echo ""
echo "Cloudflare Tunnel:"
sudo systemctl status cloudflared --no-pager | head -5
echo ""
echo "Local Services:"
curl -s http://localhost:3000 -I | head -1
curl -s http://localhost:3001/health | jq -r '.status'
echo ""
echo "DNS Resolution:"
host lazi.perfectcatchai.com 1.1.1.1 | grep "has address"
host api.lazi.perfectcatchai.com 1.1.1.1 | grep "has address"
```

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# Detailed service info
pm2 show lazi-api
pm2 show lazi-web

# Process list with resources
pm2 list
```

---

## 🎯 Next Steps

### 1. Setup PM2 Auto-Start
```bash
pm2 save
pm2 startup
# Follow the instructions provided
```

### 2. Test Application Features
- Visit https://lazi.perfectcatchai.com
- Login and verify dashboard loads
- Test API endpoints
- Verify database connectivity

### 3. Initial Data Sync (Optional)
```bash
# Sync pricebook categories from ServiceTitan
curl -X POST "https://api.lazi.perfectcatchai.com/api/pricebook/categories/sync" \
  -H "x-tenant-id: 3222348440" \
  -H "Content-Type: application/json" \
  -d '{"mode": "full"}'
```

### 4. Create Supabase Storage Bucket
- Go to: https://supabase.com/dashboard/project/cvqduvqzkvqnjouuzldk/storage/buckets
- Create bucket: `pricebook-images`
- Set as **Public**

---

## 📝 Configuration Summary

### Domain Configuration
- **Domain**: perfectcatchai.com (NOT perfectcatch.ai)
- **Frontend**: lazi.perfectcatchai.com
- **API**: api.lazi.perfectcatchai.com
- **DNS**: Auto-configured via Cloudflare Tunnel
- **SSL**: Auto-managed by Cloudflare

### Service Ports
- **Frontend**: 3000 (localhost only)
- **API**: 3001 (localhost only)
- **Redis**: 6379 (Docker)

### Database
- **Type**: PostgreSQL (Supabase)
- **URL**: postgresql://postgres.cvqduvqzkvqnjouuzldk:***@aws-1-us-east-2.pooler.supabase.com:5432/postgres
- **Tables**: 132 tables across 7 schemas
- **Status**: ✅ Connected

---

## ✅ Deployment Checklist

- [x] PM2 services running (lazi-api, lazi-web)
- [x] Cloudflare Tunnel configured
- [x] DNS records created (lazi.perfectcatchai.com, api.lazi.perfectcatchai.com)
- [x] SSL certificates auto-managed
- [x] Environment files configured
- [x] Supabase database connected
- [x] Supabase API keys configured
- [x] Redis running
- [x] Storage service created
- [x] PM2 configuration saved
- [x] Cloudflared auto-start enabled
- [ ] PM2 auto-start configured (run `pm2 startup`)
- [ ] Supabase storage bucket created (manual step)
- [ ] Initial data sync performed (optional)

---

## 🎉 Success!

LAZI CRM is now fully deployed and accessible:

- ✅ **Frontend**: https://lazi.perfectcatchai.com
- ✅ **API**: https://api.lazi.perfectcatchai.com
- ✅ **SSL**: Automatic & managed by Cloudflare
- ✅ **DNS**: Auto-configured by Cloudflare Tunnel
- ✅ **Services**: Running via PM2 with auto-restart
- ✅ **Tunnel**: Active with 4 connections to Cloudflare edge

**Note**: Local DNS cache may take a few minutes to update. Use Cloudflare DNS (1.1.1.1) for immediate resolution.

---

## 📞 Support

**Documentation**:
- `DEPLOYMENT_COMPLETE.md` - This file
- `CLOUDFLARE_TUNNEL_DEPLOYMENT.md` - Detailed tunnel guide
- `SETUP_COMPLETE.md` - Complete setup documentation

**Logs**:
- PM2: `pm2 logs`
- Cloudflared: `sudo journalctl -u cloudflared -f`
- Backend: `pm2 logs lazi-api`
- Frontend: `pm2 logs lazi-web`

**Configuration**:
- Tunnel: `/etc/cloudflared/config.yml`
- PM2: `/home/serveradmin/projects/lazi/ecosystem.config.js`
- Backend: `/home/serveradmin/projects/lazi/services/api/.env`
- Frontend: `/home/serveradmin/projects/lazi/apps/web/.env.local`
