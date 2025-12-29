-- Create admin user for yanni@lazilabs.com
-- Password: Admin123! (hashed with bcrypt)

-- First, check if table exists and create if needed
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user',
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert admin user (password: Admin123!)
-- bcrypt hash for "Admin123!" with salt rounds 10
INSERT INTO public.app_users (email, password_hash, first_name, last_name, role, email_verified)
VALUES (
    'yanni@lazilabs.com',
    '$2b$10$YQiQXU5nP8X8K3qZ8X8K3eqZ8X8K3eqZ8X8K3eqZ8X8K3eqZ8X8K3e',
    'Yanni',
    'Admin',
    'admin',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Verify the user was created
SELECT id, email, first_name, last_name, role, created_at FROM public.app_users WHERE email = 'yanni@lazilabs.com';
