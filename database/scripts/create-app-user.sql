-- Create admin user in app_users table for LAZI custom auth
-- This is separate from Supabase Auth users

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user',
    email_verified BOOLEAN DEFAULT false,
    avatar_url TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert admin user
-- Email: yanni@lazilabs.com
-- Password: Admin123!
-- Password hash generated with bcrypt (salt rounds: 10)
INSERT INTO public.app_users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    email_verified,
    permissions
)
VALUES (
    'yanni@lazilabs.com',
    '$2b$10$XPvNZC01UOxOpb7qxVoCn.Gdi3qJfmLinLsjkqaQCxcBpWjxO0xoa',
    'Yanni',
    'Admin',
    'admin',
    true,
    '["admin", "user"]'::jsonb
)
ON CONFLICT (email) 
DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    email_verified = EXCLUDED.email_verified,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Verify the user was created
SELECT 
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    email_verified,
    created_at 
FROM public.app_users 
WHERE email = 'yanni@lazilabs.com';
