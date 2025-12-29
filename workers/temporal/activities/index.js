/**
 * Temporal Activities - The actual work units
 */

import pg from 'pg';
import config from '../../config/index.js';
import { recordSync, recordError } from '../../lib/metrics.js';

const { Pool } = pg;

function getPool() {
  return new Pool({ connectionString: config.database.url, max: 5 });
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICETITAN FETCH ACTIVITIES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCustomers(modifiedSince, pageToken) {
    const start = Date.now();
    const pool = getPool();
    
    try {
        // Import stClient dynamically to avoid circular deps
        const { default: stClient } = await import('../../services/stClient.js');
        
        const params = { pageSize: 100 };
        if (modifiedSince) params.modifiedOnOrAfter = modifiedSince;
        if (pageToken) params.page = pageToken;
        
        const response = await stClient.get('/crm/v2/tenant/{tenant}/customers', { params });
        const customers = response.data.data || [];
        
        for (const customer of customers) {
            await pool.query(`
                INSERT INTO raw.st_customers (st_id, name, type, active, balance, full_data, fetched_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (st_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    type = EXCLUDED.type,
                    active = EXCLUDED.active,
                    balance = EXCLUDED.balance,
                    full_data = EXCLUDED.full_data,
                    fetched_at = NOW()
            `, [customer.id, customer.name, customer.type, customer.active, customer.balance, JSON.stringify(customer)]);
        }
        
        const duration = (Date.now() - start) / 1000;
        recordSync('customers', 'fetch', 'success', duration);
        
        return {
            entity: 'customers',
            recordsFetched: customers.length,
            hasMore: !!response.data.hasMore,
            continuationToken: response.data.continueFrom
        };
    } catch (error) {
        recordError('fetch', 'customers', error.code);
        throw error;
    } finally {
        await pool.end();
    }
}

export async function fetchJobs(modifiedSince, pageToken) {
    const start = Date.now();
    const pool = getPool();
    
    try {
        const { default: stClient } = await import('../../services/stClient.js');
        
        const params = { pageSize: 100 };
        if (modifiedSince) params.modifiedOnOrAfter = modifiedSince;
        if (pageToken) params.page = pageToken;
        
        const response = await stClient.get('/jpm/v2/tenant/{tenant}/jobs', { params });
        const jobs = response.data.data || [];
        
        for (const job of jobs) {
            await pool.query(`
                INSERT INTO raw.st_jobs (
                    st_id, job_number, customer_id, location_id, business_unit_id,
                    job_type_id, job_status, summary, total, full_data, fetched_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                ON CONFLICT (st_id) DO UPDATE SET
                    job_number = EXCLUDED.job_number,
                    customer_id = EXCLUDED.customer_id,
                    location_id = EXCLUDED.location_id,
                    business_unit_id = EXCLUDED.business_unit_id,
                    job_type_id = EXCLUDED.job_type_id,
                    job_status = EXCLUDED.job_status,
                    summary = EXCLUDED.summary,
                    total = EXCLUDED.total,
                    full_data = EXCLUDED.full_data,
                    fetched_at = NOW()
            `, [
                job.id, job.number, job.customerId, job.locationId, job.businessUnitId,
                job.jobTypeId, job.status, job.summary, job.total, JSON.stringify(job)
            ]);
        }
        
        const duration = (Date.now() - start) / 1000;
        recordSync('jobs', 'fetch', 'success', duration);
        
        return {
            entity: 'jobs',
            recordsFetched: jobs.length,
            hasMore: !!response.data.hasMore,
            continuationToken: response.data.continueFrom
        };
    } catch (error) {
        recordError('fetch', 'jobs', error.code);
        throw error;
    } finally {
        await pool.end();
    }
}

export async function fetchInvoices(modifiedSince, pageToken) {
    const start = Date.now();
    const pool = getPool();
    
    try {
        const { default: stClient } = await import('../../services/stClient.js');
        
        const params = { pageSize: 100 };
        if (modifiedSince) params.modifiedOnOrAfter = modifiedSince;
        if (pageToken) params.page = pageToken;
        
        const response = await stClient.get('/accounting/v2/tenant/{tenant}/invoices', { params });
        const invoices = response.data.data || [];
        
        for (const invoice of invoices) {
            await pool.query(`
                INSERT INTO raw.st_invoices (
                    st_id, reference_number, invoice_date, total, balance,
                    customer, job, full_data, fetched_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (st_id) DO UPDATE SET
                    reference_number = EXCLUDED.reference_number,
                    invoice_date = EXCLUDED.invoice_date,
                    total = EXCLUDED.total,
                    balance = EXCLUDED.balance,
                    customer = EXCLUDED.customer,
                    job = EXCLUDED.job,
                    full_data = EXCLUDED.full_data,
                    fetched_at = NOW()
            `, [
                invoice.id, invoice.number, invoice.invoiceDate, invoice.total,
                invoice.balance, JSON.stringify(invoice.customer), JSON.stringify(invoice.job),
                JSON.stringify(invoice)
            ]);
        }
        
        const duration = (Date.now() - start) / 1000;
        recordSync('invoices', 'fetch', 'success', duration);
        
        return {
            entity: 'invoices',
            recordsFetched: invoices.length,
            hasMore: !!response.data.hasMore,
            continuationToken: response.data.continueFrom
        };
    } catch (error) {
        recordError('fetch', 'invoices', error.code);
        throw error;
    } finally {
        await pool.end();
    }
}

export async function fetchEstimates(modifiedSince, pageToken) {
    const start = Date.now();
    const pool = getPool();
    
    try {
        const { default: stClient } = await import('../../services/stClient.js');
        
        const params = { pageSize: 100 };
        if (modifiedSince) params.modifiedOnOrAfter = modifiedSince;
        if (pageToken) params.page = pageToken;
        
        const response = await stClient.get('/sales/v2/tenant/{tenant}/estimates', { params });
        const estimates = response.data.data || [];
        
        for (const estimate of estimates) {
            await pool.query(`
                INSERT INTO raw.st_estimates (
                    st_id, name, job_number, status, subtotal, tax,
                    customer_id, full_data, fetched_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (st_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    job_number = EXCLUDED.job_number,
                    status = EXCLUDED.status,
                    subtotal = EXCLUDED.subtotal,
                    tax = EXCLUDED.tax,
                    customer_id = EXCLUDED.customer_id,
                    full_data = EXCLUDED.full_data,
                    fetched_at = NOW()
            `, [
                estimate.id, estimate.name, estimate.jobNumber,
                estimate.status?.name || estimate.status,
                estimate.subTotal, estimate.tax, estimate.customerId,
                JSON.stringify(estimate)
            ]);
        }
        
        const duration = (Date.now() - start) / 1000;
        recordSync('estimates', 'fetch', 'success', duration);
        
        return {
            entity: 'estimates',
            recordsFetched: estimates.length,
            hasMore: !!response.data.hasMore,
            continuationToken: response.data.continueFrom
        };
    } catch (error) {
        recordError('fetch', 'estimates', error.code);
        throw error;
    } finally {
        await pool.end();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC STATE ACTIVITIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getSyncState(entity) {
    const pool = getPool();
    
    try {
        const result = await pool.query(`
            SELECT last_full_sync, last_incremental_sync, records_count
            FROM raw.sync_state
            WHERE table_name = $1
        `, [`raw.st_${entity}`]);
        
        if (result.rows.length === 0) {
            return { lastFullSync: null, lastIncrementalSync: null, recordCount: 0 };
        }
        
        const row = result.rows[0];
        return {
            lastFullSync: row.last_full_sync?.toISOString() || null,
            lastIncrementalSync: row.last_incremental_sync?.toISOString() || null,
            recordCount: parseInt(row.records_count) || 0
        };
    } finally {
        await pool.end();
    }
}

export async function updateSyncState(entity, syncType, recordCount) {
    const pool = getPool();
    const column = syncType === 'full' ? 'last_full_sync' : 'last_incremental_sync';
    
    try {
        await pool.query(`
            INSERT INTO raw.sync_state (table_name, ${column}, records_count, sync_status)
            VALUES ($1, NOW(), $2, 'completed')
            ON CONFLICT (table_name) DO UPDATE SET
                ${column} = NOW(),
                records_count = $2,
                sync_status = 'completed'
        `, [`raw.st_${entity}`, recordCount]);
    } finally {
        await pool.end();
    }
}

export async function getRecordCount(entity) {
    const pool = getPool();
    
    try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM raw.st_${entity}`);
        return parseInt(result.rows[0].count);
    } finally {
        await pool.end();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ACTIVITIES
// ─────────────────────────────────────────────────────────────────────────────

export async function sendSlackNotification(channel, message) {
    if (!process.env.SLACK_WEBHOOK_URL) {
        console.log(`[Slack] Would send to ${channel}: ${message}`);
        return true;
    }
    
    try {
        const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel, text: message })
        });
        return response.ok;
    } catch (error) {
        console.error('Slack notification failed:', error);
        return false;
    }
}

export default {
    fetchCustomers,
    fetchJobs,
    fetchInvoices,
    fetchEstimates,
    getSyncState,
    updateSyncState,
    getRecordCount,
    sendSlackNotification,
};
