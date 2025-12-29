/**
 * Accounting Transactions Routes
 * API endpoints for bank transactions and reconciliation
 */

import { Router } from 'express';
import pg from 'pg';
import config from '../config/index.js';
import { createLogger } from '../lib/logger.js';

const router = Router();
const logger = createLogger('accounting-transactions');

// Database pool
const pool = new pg.Pool({
  connectionString: config.database.url,
  max: 5,
});

// ═══════════════════════════════════════════════════════════════
// GET /accounting/transactions
// List bank transactions with filters
// ═══════════════════════════════════════════════════════════════
router.get('/transactions', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      accountId,
      startDate,
      endDate,
      status,
      type, // 'deposits' | 'expenses' | 'all'
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let paramIndex = 1;

    let whereConditions = [];

    if (accountId) {
      whereConditions.push(`pa.account_id = $${paramIndex++}`);
      params.push(accountId);
    }

    if (startDate) {
      whereConditions.push(`bt.date >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`bt.date <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (status && status !== 'all') {
      whereConditions.push(`bt.match_status = $${paramIndex++}`);
      params.push(status);
    }

    if (type === 'deposits') {
      whereConditions.push(`bt.amount < 0`); // Plaid: negative = money in
    } else if (type === 'expenses') {
      whereConditions.push(`bt.amount > 0`); // Plaid: positive = money out
    }

    if (search) {
      whereConditions.push(`(bt.name ILIKE $${paramIndex} OR bt.merchant_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Main query
    const query = `
      SELECT
        bt.id,
        bt.plaid_transaction_id,
        bt.amount,
        bt.date,
        bt.datetime,
        bt.name,
        bt.merchant_name,
        bt.category,
        bt.pending,
        bt.payment_channel,
        bt.match_status,
        bt.matched_invoice_id,
        bt.match_confidence,
        bt.matched_at,
        bt.notes,
        bt.created_at,
        pa.account_id,
        pa.name as account_name,
        pa.mask as account_mask,
        pa.type as account_type,
        pi.institution_name
      FROM bank_transactions bt
      JOIN plaid_accounts pa ON pa.id = bt.plaid_account_id
      JOIN plaid_items pi ON pi.id = pa.plaid_item_id
      ${whereClause}
      ORDER BY bt.date DESC, bt.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const result = await client.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM bank_transactions bt
      JOIN plaid_accounts pa ON pa.id = bt.plaid_account_id
      JOIN plaid_items pi ON pi.id = pa.plaid_item_id
      ${whereClause}
    `;
    const countResult = await client.query(countQuery, params.slice(0, -2));

    res.json({
      success: true,
      transactions: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get transactions');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /accounting/transactions/:id
// Get single transaction with match suggestions
// ═══════════════════════════════════════════════════════════════
router.get('/transactions/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(`
      SELECT
        bt.*,
        pa.account_id,
        pa.name as account_name,
        pa.mask as account_mask,
        pa.type as account_type,
        pi.institution_name
      FROM bank_transactions bt
      JOIN plaid_accounts pa ON pa.id = bt.plaid_account_id
      JOIN plaid_items pi ON pi.id = pa.plaid_item_id
      WHERE bt.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const transaction = result.rows[0];

    // Get match suggestions for deposits (negative amounts = money in)
    let suggestions = [];
    if (transaction.amount < 0 && transaction.match_status === 'unmatched') {
      const depositAmount = Math.abs(transaction.amount);

      // This would query ServiceTitan invoices - placeholder for now
      // In production, query your invoices table
      suggestions = [];
    }

    res.json({
      success: true,
      transaction,
      suggestions,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get transaction');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /accounting/transactions/:id/match
// Match transaction to invoice
// ═══════════════════════════════════════════════════════════════
router.post('/transactions/:id/match', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { invoiceId, notes, confidence = 100 } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ success: false, error: 'Invoice ID required' });
    }

    const result = await client.query(`
      UPDATE bank_transactions
      SET
        matched_invoice_id = $1,
        match_status = 'manual_matched',
        match_confidence = $2,
        matched_at = NOW(),
        notes = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [invoiceId, confidence, notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    logger.info({ transactionId: id, invoiceId }, 'Transaction matched');

    res.json({ success: true, transaction: result.rows[0] });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to match transaction');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /accounting/transactions/:id/confirm
// Confirm an auto-matched transaction
// ═══════════════════════════════════════════════════════════════
router.post('/transactions/:id/confirm', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(`
      UPDATE bank_transactions
      SET
        match_status = 'confirmed',
        match_confidence = 100,
        matched_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND match_status IN ('auto_matched', 'manual_matched')
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found or not matched' });
    }

    logger.info({ transactionId: id }, 'Transaction confirmed');

    res.json({ success: true, transaction: result.rows[0] });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to confirm transaction');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /accounting/transactions/:id/ignore
// Mark transaction as ignored
// ═══════════════════════════════════════════════════════════════
router.post('/transactions/:id/ignore', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await client.query(`
      UPDATE bank_transactions
      SET
        match_status = 'ignored',
        notes = $1,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    // Fix: Use correct parameter
    const updateResult = await client.query(`
      UPDATE bank_transactions
      SET
        match_status = 'ignored',
        notes = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [reason || 'Ignored by user', id]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    logger.info({ transactionId: id }, 'Transaction ignored');

    res.json({ success: true, transaction: updateResult.rows[0] });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to ignore transaction');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /accounting/transactions/:id/unmatch
// Remove match from transaction
// ═══════════════════════════════════════════════════════════════
router.post('/transactions/:id/unmatch', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(`
      UPDATE bank_transactions
      SET
        matched_invoice_id = NULL,
        match_status = 'unmatched',
        match_confidence = NULL,
        matched_at = NULL,
        matched_by = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    logger.info({ transactionId: id }, 'Transaction unmatched');

    res.json({ success: true, transaction: result.rows[0] });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to unmatch transaction');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /accounting/summary
// Get transaction summary stats
// ═══════════════════════════════════════════════════════════════
router.get('/summary', async (req, res) => {
  const client = await pool.connect();
  try {
    const { startDate, endDate, accountId } = req.query;

    let whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      whereConditions.push(`bt.date >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`bt.date <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (accountId) {
      whereConditions.push(`pa.account_id = $${paramIndex++}`);
      params.push(accountId);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const result = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE bt.amount < 0) as deposit_count,
        COUNT(*) FILTER (WHERE bt.amount > 0) as expense_count,
        COALESCE(SUM(CASE WHEN bt.amount < 0 THEN ABS(bt.amount) ELSE 0 END), 0) as total_deposits,
        COALESCE(SUM(CASE WHEN bt.amount > 0 THEN bt.amount ELSE 0 END), 0) as total_expenses,
        COUNT(*) FILTER (WHERE bt.match_status = 'unmatched') as unmatched_count,
        COALESCE(SUM(CASE WHEN bt.match_status = 'unmatched' THEN ABS(bt.amount) ELSE 0 END), 0) as unmatched_amount,
        COUNT(*) FILTER (WHERE bt.pending = true) as pending_count
      FROM bank_transactions bt
      JOIN plaid_accounts pa ON pa.id = bt.plaid_account_id
      ${whereClause}
    `, params);

    const stats = result.rows[0];

    res.json({
      success: true,
      summary: {
        deposits: {
          count: parseInt(stats.deposit_count) || 0,
          total: parseFloat(stats.total_deposits) || 0,
        },
        expenses: {
          count: parseInt(stats.expense_count) || 0,
          total: parseFloat(stats.total_expenses) || 0,
        },
        netCashFlow: (parseFloat(stats.total_deposits) || 0) - (parseFloat(stats.total_expenses) || 0),
        unmatched: {
          count: parseInt(stats.unmatched_count) || 0,
          amount: parseFloat(stats.unmatched_amount) || 0,
        },
        pending: parseInt(stats.pending_count) || 0,
      },
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get summary');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /accounting/accounts
// Get list of connected bank accounts
// ═══════════════════════════════════════════════════════════════
router.get('/accounts', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        pa.id,
        pa.account_id,
        pa.name,
        pa.official_name,
        pa.type,
        pa.subtype,
        pa.mask,
        pa.current_balance,
        pa.available_balance,
        pi.institution_name,
        pi.status as item_status
      FROM plaid_accounts pa
      JOIN plaid_items pi ON pi.id = pa.plaid_item_id
      WHERE pi.status = 'active'
      ORDER BY pi.institution_name, pa.name
    `);

    res.json({
      success: true,
      accounts: result.rows,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get accounts');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

export default router;
