#!/usr/bin/env node
/**
 * Create Admin User Script
 * Creates an admin user in the database
 */

import authService from '../src/services/auth.service.js';
import { logger } from '../src/lib/logger.js';

async function createAdminUser() {
  const email = 'yanni@lazilabs.com';
  const password = 'Admin123!';
  const firstName = 'Yanni';
  const lastName = 'Admin';
  const role = 'admin';

  try {
    logger.info('Creating admin user...');
    
    // Check if user already exists
    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      logger.info(`User ${email} already exists`);
      logger.info('User details:', {
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
        firstName: existingUser.first_name,
        lastName: existingUser.last_name
      });
      return;
    }

    // Create new admin user
    const user = await authService.createUser({
      email,
      password,
      firstName,
      lastName,
      role,
      phone: null
    });

    logger.info('✅ Admin user created successfully!');
    logger.info('User details:', {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    });
    logger.info('\nLogin credentials:');
    logger.info(`  Email: ${email}`);
    logger.info(`  Password: ${password}`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Failed to create admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
