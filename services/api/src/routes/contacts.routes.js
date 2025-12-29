/**
 * Contacts Routes
 * API endpoints for contact management
 */

import { Router } from 'express';
import pg from 'pg';
import { incrementalSync, fullSync, syncCustomerContacts, getSyncStatus } from '../services/contacts/contactSync.js';
import { createLogger } from '../lib/logger.js';

const { Pool } = pg;
const router = Router();
const logger = createLogger('contacts-routes');

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
 * GET /api/contacts
 * List contacts with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 50,
      customerId,
      search,
      leadStatus,
      assignedTo,
      sortBy = 'full_name',
      sortOrder = 'asc',
    } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);
    const params = [];
    let paramIndex = 1;
    
    let whereClause = 'WHERE 1=1';
    
    if (customerId) {
      whereClause += ` AND customer_id = $${paramIndex++}`;
      params.push(customerId);
    }
    
    if (search) {
      whereClause += ` AND (
        full_name ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR 
        phone ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (leadStatus) {
      whereClause += ` AND lead_status = $${paramIndex++}`;
      params.push(leadStatus);
    }
    
    if (assignedTo) {
      whereClause += ` AND assigned_to = $${paramIndex++}`;
      params.push(assignedTo);
    }

    // Validate sort column
    const allowedSortColumns = ['full_name', 'email', 'updated_at', 'created_at', 'lead_status'];
    const sortColumn = allowedSortColumns.includes(String(sortBy)) ? sortBy : 'full_name';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const query = `
      SELECT * FROM crm.contacts_unified
      ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    params.push(Number(pageSize), offset);

    const countQuery = `SELECT COUNT(*) FROM crm.contacts_unified ${whereClause}`;
    
    const client = getPool();
    const [dataResult, countResult] = await Promise.all([
      client.query(query, params),
      client.query(countQuery, params.slice(0, -2)),
    ]);

    res.json({
      data: dataResult.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: parseInt(countResult.rows[0].count, 10),
        totalPages: Math.ceil(countResult.rows[0].count / Number(pageSize)),
      },
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Error fetching contacts');
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/contacts/sync/status
 * Get sync status
 */
router.get('/sync/status', async (req, res) => {
  try {
    const status = await getSyncStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/contacts/:id
 * Get single contact
 */
router.get('/:id', async (req, res) => {
  try {
    const client = getPool();
    const result = await client.query(
      'SELECT * FROM crm.contacts_unified WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ error: error.message }, 'Error fetching contact');
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/contacts/:id
 * Update contact (creates/updates CRM override)
 */
router.patch('/:id', async (req, res) => {
  try {
    const contactId = req.params.id;
    const {
      first_name,
      last_name,
      email,
      phone,
      mobile_phone,
      lead_source,
      lead_status,
      assigned_to,
      tags,
      notes,
      custom_fields,
    } = req.body;

    const client = getPool();
    
    await client.query(`
      INSERT INTO crm.contact_overrides (
        contact_id, first_name, last_name, email, phone, mobile_phone,
        lead_source, lead_status, assigned_to, tags, notes, custom_fields,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (contact_id) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, crm.contact_overrides.first_name),
        last_name = COALESCE(EXCLUDED.last_name, crm.contact_overrides.last_name),
        email = COALESCE(EXCLUDED.email, crm.contact_overrides.email),
        phone = COALESCE(EXCLUDED.phone, crm.contact_overrides.phone),
        mobile_phone = COALESCE(EXCLUDED.mobile_phone, crm.contact_overrides.mobile_phone),
        lead_source = COALESCE(EXCLUDED.lead_source, crm.contact_overrides.lead_source),
        lead_status = COALESCE(EXCLUDED.lead_status, crm.contact_overrides.lead_status),
        assigned_to = COALESCE(EXCLUDED.assigned_to, crm.contact_overrides.assigned_to),
        tags = COALESCE(EXCLUDED.tags, crm.contact_overrides.tags),
        notes = COALESCE(EXCLUDED.notes, crm.contact_overrides.notes),
        custom_fields = crm.contact_overrides.custom_fields || COALESCE(EXCLUDED.custom_fields, '{}'),
        updated_at = NOW()
      RETURNING *
    `, [
      contactId, first_name, last_name, email, phone, mobile_phone,
      lead_source, lead_status, assigned_to, tags, notes, 
      custom_fields ? JSON.stringify(custom_fields) : null,
    ]);

    // Fetch updated unified view
    const updated = await client.query(
      'SELECT * FROM crm.contacts_unified WHERE id = $1',
      [contactId]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    logger.error({ error: error.message }, 'Error updating contact');
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contacts/sync
 * Trigger contact sync
 */
router.post('/sync', async (req, res) => {
  try {
    const { full = false, customerId } = req.body;
    
    let result;
    if (customerId) {
      result = await syncCustomerContacts(customerId);
    } else if (full) {
      result = await fullSync();
    } else {
      result = await incrementalSync();
    }
    
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error({ error: error.message }, 'Sync error');
    res.status(500).json({ error: error.message });
  }
});

export default router;
