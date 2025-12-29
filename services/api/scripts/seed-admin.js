#!/usr/bin/env node
/**
 * Seed Admin User
 * Creates admin user directly in database with proper connection handling
 */

import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

async function seedAdmin() {
  // Use connection string with proper SSL settings for Supabase
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    // Use session mode for DDL operations
    connectionTimeoutMillis: 10000,
  });

  let client;
  try {
    client = await pool.connect();
    console.log('✓ Connected to database');

    // Create table if not exists
    console.log('Creating app_users table if needed...');
    await client.query(`
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
      )
    `);
    console.log('✓ Table ready');

    // Hash password
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    console.log('✓ Password hashed');

    // Insert admin user
    console.log('Creating admin user...');
    const result = await client.query(`
      INSERT INTO public.app_users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        role, 
        email_verified,
        permissions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) 
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        updated_at = NOW()
      RETURNING id, email, first_name, last_name, role, created_at
    `, [
      'yanni@lazilabs.com',
      passwordHash,
      'Yanni',
      'Admin',
      'admin',
      true,
      JSON.stringify(['admin', 'user'])
    ]);

    console.log('\n✅ Admin user created successfully!\n');
    console.log('Login Credentials:');
    console.log('  📧 Email: yanni@lazilabs.com');
    console.log('  🔑 Password: Admin123!\n');
    console.log('User Details:');
    console.log(JSON.stringify(result.rows[0], null, 2));

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin user:');
    console.error('Message:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.detail) console.error('Detail:', error.detail);
    
    if (client) client.release();
    await pool.end();
    process.exit(1);
  }
}

seedAdmin();
