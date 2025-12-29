/**
 * Plaid Integration Routes
 * API endpoints for storing and retrieving Plaid bank connection data
 */

import { Router } from 'express';
import pg from 'pg';
import config from '../config/index.js';
import { createLogger } from '../lib/logger.js';

const router = Router();
const logger = createLogger('plaid-routes');

// Database pool
const pool = new pg.Pool({
  connectionString: config.database.url,
  max: 5,
});

// ═══════════════════════════════════════════════════════════════
// PLAID ITEMS (Bank Connections)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /plaid/items
 * Create a new Plaid item (bank connection)
 */
router.post('/items', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      userId,
      tenantId,
      accessToken,
      itemId,
      institutionId,
      institutionName,
      accounts
    } = req.body;

    if (!userId || !tenantId || !accessToken || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, tenantId, accessToken, itemId'
      });
    }

    await client.query('BEGIN');

    // Insert the Plaid item
    const itemResult = await client.query(`
      INSERT INTO plaid_items (
        user_id, tenant_id, access_token, item_id,
        institution_id, institution_name, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      ON CONFLICT (item_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        institution_id = EXCLUDED.institution_id,
        institution_name = EXCLUDED.institution_name,
        status = 'active',
        updated_at = NOW()
      RETURNING *
    `, [userId, tenantId, accessToken, itemId, institutionId, institutionName]);

    const plaidItem = itemResult.rows[0];

    // Insert accounts if provided
    const insertedAccounts = [];
    if (accounts && accounts.length > 0) {
      for (const account of accounts) {
        const accountResult = await client.query(`
          INSERT INTO plaid_accounts (
            plaid_item_id, account_id, name, official_name,
            type, subtype, mask, current_balance, available_balance
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (account_id) DO UPDATE SET
            name = EXCLUDED.name,
            official_name = EXCLUDED.official_name,
            type = EXCLUDED.type,
            subtype = EXCLUDED.subtype,
            mask = EXCLUDED.mask,
            current_balance = EXCLUDED.current_balance,
            available_balance = EXCLUDED.available_balance,
            updated_at = NOW()
          RETURNING *
        `, [
          plaidItem.id,
          account.account_id,
          account.name,
          account.official_name,
          account.type,
          account.subtype,
          account.mask,
          account.current_balance,
          account.available_balance
        ]);
        insertedAccounts.push(accountResult.rows[0]);
      }
    }

    await client.query('COMMIT');

    logger.info({ itemId, accountCount: insertedAccounts.length }, 'Plaid item created');

    res.json({
      success: true,
      item: plaidItem,
      accounts: insertedAccounts
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error: error.message }, 'Failed to create Plaid item');
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /plaid/items
 * Get all Plaid items for a user/tenant
 */
router.get('/items', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId, tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query param: tenantId'
      });
    }

    let query = `
      SELECT
        pi.*,
        json_agg(
          json_build_object(
            'id', pa.id,
            'accountId', pa.account_id,
            'name', pa.name,
            'officialName', pa.official_name,
            'type', pa.type,
            'subtype', pa.subtype,
            'mask', pa.mask,
            'currentBalance', pa.current_balance,
            'availableBalance', pa.available_balance,
            'isActive', pa.is_active
          )
        ) FILTER (WHERE pa.id IS NOT NULL) as accounts
      FROM plaid_items pi
      LEFT JOIN plaid_accounts pa ON pa.plaid_item_id = pi.id
      WHERE pi.tenant_id = $1
    `;
    const params = [tenantId];

    if (userId) {
      query += ' AND pi.user_id = $2';
      params.push(userId);
    }

    query += ' GROUP BY pi.id ORDER BY pi.created_at DESC';

    const result = await client.query(query, params);

    res.json({
      success: true,
      items: result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        itemId: row.item_id,
        institutionId: row.institution_id,
        institutionName: row.institution_name,
        status: row.status,
        errorCode: row.error_code,
        errorMessage: row.error_message,
        consentExpiresAt: row.consent_expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        accounts: row.accounts || []
      }))
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get Plaid items');
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /plaid/items/:itemId
 * Get a specific Plaid item by itemId
 */
router.get('/items/:itemId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { itemId } = req.params;

    const result = await client.query(`
      SELECT
        pi.*,
        json_agg(
          json_build_object(
            'id', pa.id,
            'accountId', pa.account_id,
            'name', pa.name,
            'officialName', pa.official_name,
            'type', pa.type,
            'subtype', pa.subtype,
            'mask', pa.mask,
            'currentBalance', pa.current_balance,
            'availableBalance', pa.available_balance
          )
        ) FILTER (WHERE pa.id IS NOT NULL) as accounts
      FROM plaid_items pi
      LEFT JOIN plaid_accounts pa ON pa.plaid_item_id = pi.id
      WHERE pi.item_id = $1
      GROUP BY pi.id
    `, [itemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plaid item not found'
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      item: {
        id: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        accessToken: row.access_token, // Only return in internal calls
        itemId: row.item_id,
        institutionId: row.institution_id,
        institutionName: row.institution_name,
        cursor: row.cursor,
        status: row.status,
        errorCode: row.error_code,
        errorMessage: row.error_message,
        consentExpiresAt: row.consent_expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        accounts: row.accounts || []
      }
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get Plaid item');
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * PATCH /plaid/items/:itemId
 * Update a Plaid item (status, cursor, error info)
 */
router.patch('/items/:itemId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { itemId } = req.params;
    const { status, cursor, errorCode, errorMessage, consentExpiresAt } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (cursor !== undefined) {
      updates.push(`cursor = $${paramIndex++}`);
      values.push(cursor);
    }
    if (errorCode !== undefined) {
      updates.push(`error_code = $${paramIndex++}`);
      values.push(errorCode);
    }
    if (errorMessage !== undefined) {
      updates.push(`error_message = $${paramIndex++}`);
      values.push(errorMessage);
    }
    if (consentExpiresAt !== undefined) {
      updates.push(`consent_expires_at = $${paramIndex++}`);
      values.push(consentExpiresAt);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(itemId);

    const result = await client.query(`
      UPDATE plaid_items
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE item_id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plaid item not found'
      });
    }

    logger.info({ itemId, updates: req.body }, 'Plaid item updated');

    res.json({
      success: true,
      item: result.rows[0]
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to update Plaid item');
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /plaid/items/:itemId
 * Delete a Plaid item and all associated data
 */
router.delete('/items/:itemId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { itemId } = req.params;

    // Cascade delete will handle accounts and transactions
    const result = await client.query(`
      DELETE FROM plaid_items WHERE item_id = $1 RETURNING *
    `, [itemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plaid item not found'
      });
    }

    logger.info({ itemId }, 'Plaid item deleted');

    res.json({
      success: true,
      message: 'Plaid item deleted successfully'
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to delete Plaid item');
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /plaid/transactions/sync
 * Store synced transactions from Plaid
 */
router.post('/transactions/sync', async (req, res) => {
  const client = await pool.connect();
  try {
    const { itemId, added, modified, removed, cursor } = req.body;

    await client.query('BEGIN');

    let addedCount = 0;
    let modifiedCount = 0;
    let removedCount = 0;

    // Get account mapping (account_id -> database id)
    const accountsResult = await client.query(`
      SELECT pa.id, pa.account_id
      FROM plaid_accounts pa
      JOIN plaid_items pi ON pi.id = pa.plaid_item_id
      WHERE pi.item_id = $1
    `, [itemId]);

    const accountMap = new Map(
      accountsResult.rows.map(row => [row.account_id, row.id])
    );

    // Process added transactions
    if (added && added.length > 0) {
      for (const txn of added) {
        const plaidAccountId = accountMap.get(txn.account_id);
        if (!plaidAccountId) continue;

        await client.query(`
          INSERT INTO bank_transactions (
            plaid_account_id, plaid_transaction_id, amount, date, datetime,
            name, merchant_name, category, category_id, payment_channel,
            pending, pending_transaction_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (plaid_transaction_id) DO NOTHING
        `, [
          plaidAccountId,
          txn.transaction_id,
          txn.amount,
          txn.date,
          txn.datetime,
          txn.name,
          txn.merchant_name,
          JSON.stringify(txn.category),
          txn.category_id,
          txn.payment_channel,
          txn.pending,
          txn.pending_transaction_id
        ]);
        addedCount++;
      }
    }

    // Process modified transactions
    if (modified && modified.length > 0) {
      for (const txn of modified) {
        await client.query(`
          UPDATE bank_transactions SET
            amount = $1,
            date = $2,
            datetime = $3,
            name = $4,
            merchant_name = $5,
            category = $6,
            payment_channel = $7,
            pending = $8,
            updated_at = NOW()
          WHERE plaid_transaction_id = $9
        `, [
          txn.amount,
          txn.date,
          txn.datetime,
          txn.name,
          txn.merchant_name,
          JSON.stringify(txn.category),
          txn.payment_channel,
          txn.pending,
          txn.transaction_id
        ]);
        modifiedCount++;
      }
    }

    // Process removed transactions
    if (removed && removed.length > 0) {
      for (const txnId of removed) {
        await client.query(`
          DELETE FROM bank_transactions WHERE plaid_transaction_id = $1
        `, [txnId]);
        removedCount++;
      }
    }

    // Update cursor
    if (cursor) {
      await client.query(`
        UPDATE plaid_items SET cursor = $1, updated_at = NOW()
        WHERE item_id = $2
      `, [cursor, itemId]);
    }

    await client.query('COMMIT');

    logger.info({
      itemId,
      added: addedCount,
      modified: modifiedCount,
      removed: removedCount
    }, 'Transactions synced');

    res.json({
      success: true,
      stats: {
        added: addedCount,
        modified: modifiedCount,
        removed: removedCount
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error: error.message }, 'Failed to sync transactions');
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /plaid/transactions
 * Get bank transactions with optional filters
 */
router.get('/transactions', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      tenantId,
      accountId,
      startDate,
      endDate,
      matchStatus,
      pending,
      limit = 100,
      offset = 0
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query param: tenantId'
      });
    }

    let query = `
      SELECT
        bt.*,
        pa.name as account_name,
        pa.mask as account_mask,
        pi.institution_name
      FROM bank_transactions bt
      JOIN plaid_accounts pa ON pa.id = bt.plaid_account_id
      JOIN plaid_items pi ON pi.id = pa.plaid_item_id
      WHERE pi.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (accountId) {
      query += ` AND pa.account_id = $${paramIndex++}`;
      params.push(accountId);
    }
    if (startDate) {
      query += ` AND bt.date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND bt.date <= $${paramIndex++}`;
      params.push(endDate);
    }
    if (matchStatus) {
      query += ` AND bt.match_status = $${paramIndex++}`;
      params.push(matchStatus);
    }
    if (pending !== undefined) {
      query += ` AND bt.pending = $${paramIndex++}`;
      params.push(pending === 'true');
    }

    query += ` ORDER BY bt.date DESC, bt.created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await client.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM bank_transactions bt
      JOIN plaid_accounts pa ON pa.id = bt.plaid_account_id
      JOIN plaid_items pi ON pi.id = pa.plaid_item_id
      WHERE pi.tenant_id = $1
    `;
    const countResult = await client.query(countQuery, [tenantId]);

    res.json({
      success: true,
      transactions: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get transactions');
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

export default router;
