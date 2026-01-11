# DNS Setup Required for LAZI

## ⚠️ Issue Identified

The `cloudflared tunnel route dns` command created DNS records in the **wrong zone** (`perfectcatchai.com` instead of `perfectcatch.ai`).

## ✅ Solution: Manual DNS Configuration

You need to add DNS records manually in the Cloudflare dashboard.

---

## 📋 Step-by-Step Instructions

### 1. Go to Cloudflare Dashboard
- Visit: https://dash.cloudflare.com
- Select the **perfectcatch.ai** domain (NOT perfectcatchai.com)

### 2. Navigate to DNS Settings
- Click on **DNS** in the left sidebar
- Click **Records** tab

### 3. Add CNAME Records for LAZI

Add these two CNAME records:

#### Record 1: Frontend
- **Type**: CNAME
- **Name**: `lazi`
- **Target**: `90ddbbb7-41a2-4976-8d18-c05fa38ab06d.cfargotunnel.com`
- **Proxy status**: ✅ Proxied (orange cloud)
- **TTL**: Auto

#### Record 2: API
- **Type**: CNAME
- **Name**: `api.lazi`
- **Target**: `90ddbbb7-41a2-4976-8d18-c05fa38ab06d.cfargotunnel.com`
- **Proxy status**: ✅ Proxied (orange cloud)
- **TTL**: Auto

### 4. Save Records
Click **Save** for each record.

---

## 🔍 Verification

After adding the DNS records (wait 1-2 minutes for propagation):

```bash
# Test DNS resolution
dig lazi.perfectcatch.ai +short
dig api.lazi.perfectcatch.ai +short

# Test public access
curl -I https://lazi.perfectcatch.ai
curl https://api.lazi.perfectcatch.ai/health
```

---

## 📊 Current Status

### ✅ Working
- PM2 services running (lazi-api, lazi-web)
- Cloudflare Tunnel active with 4 connections
- Tunnel configuration correct in `/etc/cloudflared/config.yml`
- Local services responding on ports 3000 and 3001

### ⚠️ Needs Action
- DNS CNAME records for `lazi.perfectcatch.ai`
- DNS CNAME records for `api.lazi.perfectcatch.ai`

---

## 🎯 Your Tunnel Information

**Tunnel ID**: `90ddbbb7-41a2-4976-8d18-c05fa38ab06d`  
**Tunnel Name**: `claraverse-stack`  
**Target Domain**: `perfectcatch.ai` (NOT perfectcatchai.com)

**CNAME Target**: `90ddbbb7-41a2-4976-8d18-c05fa38ab06d.cfargotunnel.com`

---

## 🔧 Alternative: Delete Wrong DNS Records

The cloudflared CLI created records in the wrong zone. You may want to delete these:

1. Go to **perfectcatchai.com** DNS settings
2. Look for and delete:
   - `lazi.perfectcatch.ai.perfectcatchai.com`
   - `api.lazi.perfectcatch.ai.perfectcatchai.com`

These records won't work because they're in the wrong zone.

---

## 📞 Quick Reference

**Cloudflare Tunnel Config**: `/etc/cloudflared/config.yml`
```yaml
ingress:
  - hostname: lazi.perfectcatch.ai
    service: http://localhost:3000
  - hostname: api.lazi.perfectcatch.ai
    service: http://localhost:3001
```

**Services Status**:
```bash
pm2 status
sudo systemctl status cloudflared
```

**Once DNS is configured, your URLs will be**:
- Frontend: https://lazi.perfectcatch.ai
- API: https://api.lazi.perfectcatch.ai
