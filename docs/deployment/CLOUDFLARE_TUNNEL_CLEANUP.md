# Cloudflare Tunnel Cleanup Instructions

## Problem
Cloudflare Tunnel routes for LAZI are still active in Cloudflare's dashboard, causing Error 1033.

## Tunnel Information
- **Tunnel ID:** `90ddbbb7-41a2-4976-8d18-c05fa38ab06d`
- **Tunnel Name:** `claraverse-stack`
- **Status:** Stopped on server (but routes still active in Cloudflare)

## Routes to Delete

Delete these two public hostname routes from the tunnel configuration:

1. **Frontend Route:**
   - Hostname: `lazi.perfectcatchai.com`
   - Service: `http://localhost:3000`
   - **Action:** DELETE

2. **API Route:**
   - Hostname: `api.lazi.perfectcatchai.com`
   - Service: `http://localhost:3001`
   - **Action:** DELETE

## Step-by-Step Instructions

### Method 1: Cloudflare Dashboard (Recommended)

1. **Login to Cloudflare:**
   - Go to: https://one.dash.cloudflare.com/
   - Select your account

2. **Navigate to Tunnels:**
   - Click **Zero Trust** in left sidebar
   - Click **Networks** → **Tunnels**

3. **Find Your Tunnel:**
   - Look for tunnel named `claraverse-stack`
   - Or search by ID: `90ddbbb7-41a2-4976-8d18-c05fa38ab06d`

4. **Edit Tunnel Configuration:**
   - Click the **three dots** (⋮) next to the tunnel
   - Click **Configure**

5. **Go to Public Hostname Tab:**
   - Click the **Public Hostname** tab

6. **Delete LAZI Routes:**
   - Find `lazi.perfectcatchai.com` → Click **Delete** (trash icon)
   - Find `api.lazi.perfectcatchai.com` → Click **Delete** (trash icon)

7. **Save Changes:**
   - Click **Save** or changes auto-save

### Method 2: Keep Other Routes, Delete Tunnel Entirely (If LAZI was the only use)

If the tunnel was only used for LAZI:
1. Same navigation as above
2. Click the **three dots** (⋮) next to `claraverse-stack`
3. Click **Delete**
4. Confirm deletion

**Note:** This will also remove routes for:
- n8n.perfectcatchai.com
- servicetitan-api.perfectcatchai.com
- arcane.perfectcatchai.com
- claraverse.perfectcatchai.com
- comfyui.perfectcatchai.com
- python.perfectcatchai.com
- agent.perfectcatchai.com
- ghl.perfectcatchai.com

Only do this if these services are also migrated to Traefik or no longer needed.

## Verification After Deletion

### 1. Wait for DNS Propagation (1-2 minutes)

### 2. Test DNS Resolution
```bash
dig +short lazi.perfectcatchai.com
dig +short api.lazi.perfectcatchai.com
```
Should return: `47.206.124.132` (or Cloudflare proxy IPs)

### 3. Test HTTPS Access
```bash
curl -I https://lazi.perfectcatchai.com
curl -I https://api.lazi.perfectcatchai.com
```
Should return: `200 OK` or `301/302` redirect (not Error 1033)

### 4. Check Traefik Logs
```bash
docker logs traefik 2>&1 | grep -i lazi | tail -20
```
Should show certificate generation and routing

### 5. Test Frontend
Open in browser: https://lazi.perfectcatchai.com
Should load the LAZI login page

### 6. Test API
```bash
curl https://api.lazi.perfectcatchai.com
```
Should return JSON error (not 1033), indicating API is responding

## Why This Happens

Cloudflare Tunnel routes have **higher priority** than DNS records:
1. Wildcard DNS: `*.perfectcatchai.com → 47.206.124.132` ✅ (exists)
2. Tunnel Route: `lazi.perfectcatchai.com → tunnel` ❌ (overrides wildcard)

When you request `lazi.perfectcatchai.com`:
- Cloudflare checks for tunnel routes first
- Finds the tunnel route for LAZI
- Tries to connect to tunnel
- Tunnel is dead → Error 1033

After deleting the tunnel routes:
- Cloudflare checks for tunnel routes first
- No tunnel route found
- Falls back to DNS (wildcard)
- Resolves to `47.206.124.132`
- Traefik handles the request ✅

## Current Server Status

✅ Cloudflared service: **Stopped and disabled**
✅ Docker containers: **Running and healthy**
✅ Traefik labels: **Configured correctly**
✅ traefik-net: **Containers connected**
✅ Server IP: **47.206.124.132**

Only missing: **Delete tunnel routes in Cloudflare dashboard**

## After Cleanup

Once tunnel routes are deleted:
1. Traefik will automatically request SSL certificates
2. LAZI will be accessible at:
   - Frontend: https://lazi.perfectcatchai.com
   - API: https://api.lazi.perfectcatchai.com
3. Login with:
   - Email: `admin@lazilabs.com`
   - Password: `Admin123!`

## Optional: Remove Local Tunnel Config

After confirming everything works, you can remove the local tunnel config:

```bash
sudo rm -rf /etc/cloudflared
sudo apt remove cloudflared  # If you want to uninstall completely
```

This is optional since cloudflared is already stopped and disabled.
