# 🔧 LAZI Login Troubleshooting

**Issue**: "Failed to fetch" error when trying to log in

---

## ✅ Current Status

### Services Running
- ✅ **API**: Running on localhost:3001
- ✅ **Frontend**: Running on localhost:3000
- ✅ **Cloudflare Tunnel**: Active with 4 connections
- ✅ **Database**: Connected
- ✅ **Admin User**: Created and working

### Configuration
- ✅ **Frontend URL**: https://lazi.perfectcatchai.com
- ✅ **API URL**: https://api.lazi.perfectcatchai.com
- ✅ **Tunnel Routes**: Configured correctly
- ✅ **DNS Records**: Created via cloudflared CLI

---

## 🔍 Why "Failed to Fetch" Happens

The "Failed to fetch" error occurs when your browser cannot reach the API endpoint. This is usually due to:

1. **DNS Propagation Delay** - DNS records take 1-5 minutes to propagate globally
2. **Browser DNS Cache** - Your browser may have cached the old DNS lookup
3. **Local DNS Cache** - Your computer's DNS cache needs to be cleared

---

## 🛠️ Solutions (Try in Order)

### 1. Wait for DNS Propagation (Recommended)
**Wait 2-5 minutes** and try again. DNS records were just created and need time to propagate.

### 2. Clear Browser Cache
**Chrome/Edge**:
- Press `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (Mac)
- Select "Cached images and files"
- Click "Clear data"
- Refresh the page

**Firefox**:
- Press `Ctrl+Shift+Delete`
- Select "Cache"
- Click "Clear Now"
- Refresh the page

### 3. Flush DNS Cache on Your Computer

**Windows**:
```cmd
ipconfig /flushdns
```

**Mac**:
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Linux**:
```bash
sudo systemd-resolve --flush-caches
# or
sudo resolvectl flush-caches
```

### 4. Use Incognito/Private Mode
Open an incognito/private browsing window and try logging in there. This bypasses all browser caches.

### 5. Test API Directly
Open this URL in your browser to verify the API is accessible:
```
https://api.lazi.perfectcatchai.com/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-24T03:37:49.700Z",
  "uptime": 200,
  "version": "2.0.0",
  "components": {
    "server": "up",
    "tokenManager": "up",
    "database": "up"
  }
}
```

If you see this, the API is working!

### 6. Check DNS Resolution
Open your browser's developer console (F12) and run:
```javascript
fetch('https://api.lazi.perfectcatchai.com/health')
  .then(r => r.json())
  .then(d => console.log('API Working:', d))
  .catch(e => console.error('API Error:', e));
```

---

## 🔐 Login Credentials

Once the API is accessible:

**Email**: `admin@perfectcatch.ai`  
**Password**: `Admin123!`

**Login URL**: https://lazi.perfectcatchai.com/login

---

## 📊 Verify Everything is Working

### Check Services
```bash
# On server
pm2 status
sudo systemctl status cloudflared
```

### Test API Locally (on server)
```bash
curl http://localhost:3001/health
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@perfectcatch.ai","password":"Admin123!"}'
```

### Check DNS (from your computer)
```bash
# Windows
nslookup api.lazi.perfectcatchai.com

# Mac/Linux
dig api.lazi.perfectcatchai.com
host api.lazi.perfectcatchai.com
```

**Expected Result**: Should return Cloudflare IPs like `104.21.11.144` and `172.67.149.120`

---

## 🚨 If Still Not Working

### Option A: Use Direct IP (Temporary)
If DNS isn't resolving, you can temporarily add to your computer's hosts file:

**Windows**: `C:\Windows\System32\drivers\etc\hosts`  
**Mac/Linux**: `/etc/hosts`

Add this line:
```
104.21.11.144 api.lazi.perfectcatchai.com
```

Then try logging in again.

### Option B: Check Browser Console
1. Open the login page: https://lazi.perfectcatchai.com
2. Press F12 to open Developer Tools
3. Go to "Console" tab
4. Try to log in
5. Look for error messages

**Common Errors**:
- `ERR_NAME_NOT_RESOLVED` = DNS not propagated yet (wait 5 more minutes)
- `CORS error` = API is accessible but CORS needs configuration (let me know)
- `net::ERR_CONNECTION_REFUSED` = Tunnel not routing correctly (let me know)

### Option C: Verify Tunnel is Routing
From your computer (not the server), test:
```bash
curl -I https://api.lazi.perfectcatchai.com/health
```

If this works but the browser doesn't, it's a browser cache issue.

---

## ✅ Expected Behavior

When login works correctly:

1. You enter email and password
2. Browser sends POST request to `https://api.lazi.perfectcatchai.com/api/auth/login`
3. API responds with access token and user data
4. Browser stores token in localStorage
5. You're redirected to the dashboard

---

## 🔧 Configuration Files

**Frontend API Config**: `/home/serveradmin/projects/lazi/apps/web/.env.local`
```env
NEXT_PUBLIC_API_URL=https://api.lazi.perfectcatchai.com
API_URL=https://api.lazi.perfectcatchai.com
NEXT_PUBLIC_TENANT_ID=3222348440
```

**Tunnel Config**: `/etc/cloudflared/config.yml`
```yaml
- hostname: api.lazi.perfectcatchai.com
  service: http://localhost:3001
```

---

## 📞 Quick Diagnostics

Run this on the server to verify everything:
```bash
echo "=== Service Status ==="
pm2 status

echo -e "\n=== API Health ==="
curl -s http://localhost:3001/health | jq

echo -e "\n=== Tunnel Status ==="
sudo systemctl status cloudflared --no-pager | head -5

echo -e "\n=== DNS Resolution (Cloudflare) ==="
dig @1.1.1.1 api.lazi.perfectcatchai.com +short

echo -e "\n=== Test Login ==="
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@perfectcatch.ai","password":"Admin123!"}' | jq -r '.user.email'
```

Expected output: Should show all services running and admin email at the end.

---

## 🎯 Most Likely Solution

**Wait 2-5 minutes for DNS propagation**, then:
1. Clear your browser cache
2. Open incognito window
3. Go to https://lazi.perfectcatchai.com
4. Log in with admin@perfectcatch.ai / Admin123!

The API is working correctly on the server - it's just a matter of DNS propagating to your location.
