# LAZI AI - Final Setup Instructions

## ✅ Migration Status: 95% Complete

All infrastructure is working:
- ✅ Docker containers running
- ✅ Redis connected
- ✅ Traefik routing with SSL
- ✅ DNS configured
- ✅ API responding

## ❌ Remaining Issue: Database Connection

The API cannot connect to Supabase due to connection pooler restrictions. The error "Tenant or user not found" indicates the pooler is rejecting connections.

## 🔧 Solution: Create User in Supabase

### Step 1: Verify/Create app_users Table

Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
-- Check if table exists
SELECT * FROM public.app_users LIMIT 1;
```

If the table doesn't exist or query fails, run:

```sql
CREATE TABLE public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user',
    avatar_url TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 2: Insert Admin User

```sql
INSERT INTO public.app_users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role,
    permissions
)
VALUES (
    'yanni@lazilabs.com',
    '$2b$10$XPvNZC01UOxOpb7qxVoCn.Gdi3qJfmLinLsjkqaQCxcBpWjxO0xoa',
    'Yanni',
    'Admin',
    'admin',
    '["admin", "user"]'::jsonb
)
ON CONFLICT (email) 
DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    updated_at = NOW();
```

### Step 3: Verify User Created

```sql
SELECT id, email, first_name, last_name, role, created_at 
FROM public.app_users 
WHERE email = 'yanni@lazilabs.com';
```

You should see the user record returned.

### Step 4: Test Login

Go to **https://lazi.perfectcatchai.com** and login with:
- **Email:** `yanni@lazilabs.com`
- **Password:** `Admin123!`

## 🔍 If Login Still Fails

The Supabase connection pooler may need additional configuration. Check:

1. **Supabase Project Settings** → **Database** → **Connection Pooling**
2. Ensure **Transaction Mode** is enabled
3. Check if there are any IP restrictions

## 📊 Alternative: Use Supabase Direct Connection

If pooler continues to fail, you can use Supabase's direct connection (not pooled):

1. Go to **Supabase Dashboard** → **Project Settings** → **Database**
2. Copy the **Direct Connection** string (not pooler)
3. Update `.env.production`:
   ```
   DATABASE_URL=<direct_connection_string>
   ```
4. Restart API:
   ```bash
   cd /opt/docker/apps/lazi
   docker compose -f docker-compose.production.yml restart lazi-api
   ```

## 📝 Summary

**What's Working:**
- All Docker infrastructure
- Redis cache and job queues
- SSL certificates
- Traefik routing
- Frontend accessible

**What Needs Fixing:**
- Database connection from API to Supabase
- User authentication (depends on database connection)

**Root Cause:**
Supabase's connection pooler has restrictions that prevent the API's auth service from connecting properly. This is a known limitation when using session-mode queries with transaction-mode poolers.

---

**Next Steps:**
1. Create user in Supabase via SQL Editor (steps above)
2. Test login
3. If still fails, switch to direct connection (not pooled)
