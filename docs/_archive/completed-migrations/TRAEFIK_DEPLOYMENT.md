# LAZI Traefik Deployment - Complete

## ✅ Deployment Status

**Date**: December 24, 2025  
**Status**: Services Running - DNS Configuration Required

---

## 🚀 Services Running

### PM2 Managed Services
```bash
pm2 status
```

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| lazi-api | 3001 | ✅ Online | Express API Backend |
| lazi-web | 3000 | ✅ Online | Next.js Frontend |

### Docker Services
```bash
docker ps | grep -E "lazi\|traefik"
```

| Container | Status | Description |
|-----------|--------|-------------|
| traefik | ✅ Running | Reverse Proxy with SSL |
| lazi-router | ✅ Running | Traefik routing labels |

---

## 🌐 Domain Configuration

### Configured Routes

**Frontend**: `lazi.perfectcatch.ai` → `localhost:3000`  
**API**: `api.lazi.perfectcatch.ai` → `localhost:3001`

### Traefik Configuration

- **File**: `/opt/docker/core/traefik/traefik.yml`
- **Cert Resolver**: `letsencrypt` (Cloudflare DNS-01)
- **Domains Added**: `perfectcatch.ai` and `*.perfectcatch.ai`
- **Network**: `traefik-net`

### LAZI Router Configuration

- **File**: `/home/serveradmin/projects/lazi/docker-compose.traefik.yml`
- **Container**: `lazi-router` (Alpine with Traefik labels)
- **Backend URL**: `http://host.docker.internal:3000` (frontend)
- **API URL**: `http://host.docker.internal:3001` (API)

---

## 📋 DNS CONFIGURATION REQUIRED

### Action: Add DNS Records in Cloudflare

Go to: **Cloudflare Dashboard** → **perfectcatch.ai** → **DNS** → **Records**

Add the following A records:

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | lazi | 192.168.30.10 | ✅ Proxied | Auto |
| A | api.lazi | 192.168.30.10 | ✅ Proxied | Auto |

**Note**: The IP `192.168.30.10` is your server's IP address.

### Alternative: CNAME Records (if using Cloudflare Tunnel)

If you're using Cloudflare Tunnel, use CNAME records instead:

| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| CNAME | lazi | your-tunnel-id.cfargotunnel.com | ✅ Proxied |
| CNAME | api.lazi | your-tunnel-id.cfargotunnel.com | ✅ Proxied |

---

## 🔍 Verification Steps

### 1. Check Local Services
```bash
# Test frontend
curl http://localhost:3000 -I

# Test API
curl http://localhost:3001/health
```

### 2. Check Traefik Routes
```bash
# View Traefik logs for LAZI routes
docker logs traefik 2>&1 | grep -i lazi

# Check if routes are registered
docker exec traefik traefik healthcheck
```

### 3. Test with Host Header (Before DNS)
```bash
# Test frontend routing
curl -H "Host: lazi.perfectcatch.ai" http://localhost:80 -I

# Test API routing
curl -H "Host: api.lazi.perfectcatch.ai" http://localhost:80
```

### 4. Test via Public Domain (After DNS)
```bash
# Wait for DNS propagation (1-5 minutes)
# Then test:

# Frontend
curl https://lazi.perfectcatch.ai -I

# API
curl https://api.lazi.perfectcatch.ai/health
```

---

## 🔧 Management Commands

### PM2 Commands
```bash
# View status
pm2 status

# View logs
pm2 logs
pm2 logs lazi-api
pm2 logs lazi-web

# Restart services
pm2 restart all
pm2 restart lazi-api
pm2 restart lazi-web

# Stop services
pm2 stop all

# Start services
pm2 start ecosystem.config.js
```

### Docker Commands
```bash
# View LAZI router status
docker ps | grep lazi-router

# View Traefik logs
docker logs traefik -f

# Restart LAZI router
cd /home/serveradmin/projects/lazi
docker compose -f docker-compose.traefik.yml restart

# Restart Traefik
cd /opt/docker/core/traefik
docker compose restart
```

### PM2 Startup (Auto-start on boot)
```bash
# Save current PM2 processes
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions provided by the command above
```

---

## 🔐 SSL Certificate Status

Traefik will automatically request SSL certificates from Let's Encrypt using Cloudflare DNS-01 challenge.

**Requirements**:
- ✅ Cloudflare API token configured in `/opt/docker/core/traefik/.env`
- ✅ DNS records pointing to server
- ✅ Domains added to `traefik.yml` certificate configuration

**Certificate Storage**: `/opt/docker/core/traefik/acme.json`

**Check Certificate Status**:
```bash
# View certificate logs
docker logs traefik 2>&1 | grep -i "certificate\|acme"

# Check acme.json (should contain certificates after successful generation)
sudo ls -lh /opt/docker/core/traefik/acme.json
```

---

## 🐛 Troubleshooting

### Issue: 502 Bad Gateway

**Cause**: Backend services not running or not accessible

**Solution**:
```bash
# Check PM2 services
pm2 status
pm2 logs

# Restart if needed
pm2 restart all

# Verify services respond locally
curl http://localhost:3000
curl http://localhost:3001/health
```

### Issue: 404 Not Found

**Cause**: Traefik routes not registered

**Solution**:
```bash
# Check if lazi-router container is running
docker ps | grep lazi-router

# Restart lazi-router
cd /home/serveradmin/projects/lazi
docker compose -f docker-compose.traefik.yml restart

# Check Traefik logs
docker logs traefik --tail 50 | grep lazi
```

### Issue: Certificate Error / SSL Not Working

**Cause**: DNS not propagated or Cloudflare API token issue

**Solution**:
```bash
# Verify DNS records exist
nslookup lazi.perfectcatch.ai
nslookup api.lazi.perfectcatch.ai

# Check Cloudflare API token
cat /opt/docker/core/traefik/.env | grep CF_DNS_API_TOKEN

# View certificate generation logs
docker logs traefik 2>&1 | grep -i "lazi.perfectcatch.ai"
```

### Issue: Connection Refused to host.docker.internal

**Cause**: Docker can't reach host services

**Solution**:
```bash
# Get host IP
HOST_IP=$(hostname -I | awk '{print $1}')
echo $HOST_IP

# Update docker-compose.traefik.yml to use actual IP instead of host.docker.internal
# Replace: http://host.docker.internal:3000
# With: http://192.168.30.10:3000
```

---

## 📊 Health Checks

### Quick Health Check Script
```bash
#!/bin/bash
echo "=== LAZI Health Check ==="
echo ""
echo "PM2 Services:"
pm2 status
echo ""
echo "Docker Containers:"
docker ps | grep -E "lazi|traefik"
echo ""
echo "Local Service Tests:"
curl -s http://localhost:3000 -I | head -1
curl -s http://localhost:3001/health | jq -r '.status'
echo ""
echo "Traefik Routes:"
docker logs traefik 2>&1 | grep -i "lazi" | tail -3
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `/home/serveradmin/projects/lazi/ecosystem.config.js` | PM2 configuration |
| `/home/serveradmin/projects/lazi/docker-compose.traefik.yml` | Traefik routing config |
| `/home/serveradmin/projects/lazi/services/api/.env` | Backend environment variables |
| `/home/serveradmin/projects/lazi/apps/web/.env.local` | Frontend environment variables |
| `/opt/docker/core/traefik/traefik.yml` | Traefik static configuration |
| `/opt/docker/core/traefik/compose.yaml` | Traefik Docker Compose |
| `/opt/docker/core/traefik/acme.json` | SSL certificates storage |

---

## ✅ Next Steps

1. **Add DNS Records** in Cloudflare (see DNS Configuration section above)
2. **Wait for DNS Propagation** (1-5 minutes)
3. **Test Public Access**:
   - Visit https://lazi.perfectcatch.ai
   - Visit https://api.lazi.perfectcatch.ai/health
4. **Monitor Certificate Generation** in Traefik logs
5. **Set up PM2 Startup** for auto-restart on server reboot

---

## 🎉 Deployment Complete

Once DNS records are added and propagated:
- ✅ LAZI frontend will be accessible at `https://lazi.perfectcatch.ai`
- ✅ LAZI API will be accessible at `https://api.lazi.perfectcatch.ai`
- ✅ SSL certificates will be automatically managed by Traefik
- ✅ Services will auto-restart via PM2

**Support**: For issues, check logs with `pm2 logs` and `docker logs traefik`
