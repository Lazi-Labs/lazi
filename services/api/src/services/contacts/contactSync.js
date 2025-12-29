/**
 * Contact Sync Service
 * Syncs contacts from ServiceTitan to PostgreSQL
 */

import pg from 'pg';
import { fetchAllContacts, fetchContactsByCustomer } from './contactFetcher.js';
import { createLogger } from '../../lib/logger.js';

const { Pool } = pg;
const logger = createLogger('contact-sync');

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.SERVICETITAN_DATABASE_URL;
    if (!connectionString) {
      throw new Error('Database connection string not configured');
    }
    pool = new Pool({ connectionString, max: 5 });
  }
  return pool;
}

/**
 * Upsert contact to raw schema
 */
async function upsertToRaw(contact) {
  const client = getPool();
  await client.query(`
    INSERT INTO raw.st_contacts (st_id, customer_id, full_data, fetched_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (st_id) DO UPDATE SET
      customer_id = EXCLUDED.customer_id,
      full_data = EXCLUDED.full_data,
      fetched_at = NOW()
  `, [contact.id, contact.customerId, JSON.stringify(contact)]);
}

/**
 * Get last sync timestamp from database
 */
async function getLastSyncTimestamp() {
  const client = getPool();
  try {
    const result = await client.query(`
      SELECT MAX(fetched_at) as last_sync FROM raw.st_contacts
    `);
    return result.rows[0]?.last_sync || null;
  } catch (error) {
    logger.warn({ error: error.message }, 'Could not get last sync timestamp');
    return null;
  }
}

/**
 * Sync contacts modified since last sync
 */
export async function incrementalSync() {
  let synced = 0;
  let errors = 0;
  const startTime = Date.now();

  try {
    // Get last sync timestamp
    const lastSync = await getLastSyncTimestamp();
    const modifiedOnOrAfter = lastSync ? new Date(lastSync) : undefined;
    
    logger.info({
      modifiedOnOrAfter: modifiedOnOrAfter?.toISOString() || 'full sync'
    }, 'Starting incremental contact sync');

    // Fetch modified contacts
    const contacts = await fetchAllContacts({ modifiedOnOrAfter });
    logger.info({ count: contacts.length }, 'Fetched contacts to sync');

    // Upsert each contact
    for (const contact of contacts) {
      try {
        await upsertToRaw(contact);
        synced++;
      } catch (error) {
        logger.error({ error: error.message, contactId: contact.id }, 'Error syncing contact');
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    logger.info({ synced, errors, duration: `${duration}ms` }, 'Contact sync complete');
    
    return { synced, errors, duration };

  } catch (error) {
    logger.error({ error: error.message }, 'Contact sync failed');
    throw error;
  }
}

/**
 * Full sync - fetch all contacts
 */
export async function fullSync() {
  logger.info('Starting full contact sync');
  
  // Clear last sync to force full fetch
  const client = getPool();
  try {
    await client.query(`DELETE FROM raw.st_contacts`);
  } catch (error) {
    // Table might not exist yet
    logger.warn({ error: error.message }, 'Could not clear raw contacts table');
  }
  
  return incrementalSync();
}

/**
 * Sync a specific customer's contacts
 */
export async function syncCustomerContacts(customerId) {
  let synced = 0;
  let errors = 0;

  try {
    logger.info({ customerId }, 'Syncing contacts for customer');
    const contacts = await fetchContactsByCustomer(customerId);
    
    for (const contact of contacts) {
      try {
        await upsertToRaw(contact);
        synced++;
      } catch (error) {
        logger.error({ error: error.message, contactId: contact.id }, 'Error syncing contact');
        errors++;
      }
    }

    logger.info({ customerId, synced, errors }, 'Customer contacts sync complete');
    return { synced, errors };
  } catch (error) {
    logger.error({ error: error.message, customerId }, 'Failed to sync customer contacts');
    throw error;
  }
}

/**
 * Get sync status
 */
export async function getSyncStatus() {
  const client = getPool();
  
  try {
    const [lastSyncResult, countResult] = await Promise.all([
      client.query('SELECT MAX(fetched_at) as last_sync FROM raw.st_contacts'),
      client.query('SELECT COUNT(*) FROM master.contacts'),
    ]);

    return {
      lastSync: lastSyncResult.rows[0]?.last_sync || null,
      isRunning: false,
      totalContacts: parseInt(countResult.rows[0]?.count || 0, 10),
    };
  } catch (error) {
    logger.warn({ error: error.message }, 'Could not get sync status');
    return {
      lastSync: null,
      isRunning: false,
      totalContacts: 0,
    };
  }
}

export default {
  incrementalSync,
  fullSync,
  syncCustomerContacts,
  getSyncStatus,
};
