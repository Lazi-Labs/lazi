/**
 * CRM Service - Standalone (No External Sync)
 * 
 * This is our CRM - not a sync layer to another CRM.
 * Data flows: ServiceTitan → raw → master → crm
 */

import pg from 'pg';
import config from '../../config/index.js';
import { createModuleLogger } from '../../utils/logger.js';

const { Pool } = pg;
const logger = createModuleLogger('crm-service');

/**
 * Get database pool
 */
function getPool() {
  return new Pool({
    connectionString: config.database.url,
    max: 5,
  });
}

// ─────────────────────────────────────────────────────────
// CONTACTS
// ─────────────────────────────────────────────────────────

/**
 * Get contacts with filters
 */
export async function getContacts(filters = {}) {
  const pool = getPool();
  
  try {
    const {
      stage,
      pipeline_id,
      owner_id,
      search,
      tags,
      has_upcoming_followup,
      limit = 50,
      offset = 0
    } = filters;
    
    let query = `
      SELECT 
        c.*,
        mc.balance,
        mc.city,
        mc.state,
        mc.address_line1,
        p.name as pipeline_name,
        (
          SELECT COUNT(*) FROM crm.opportunities o 
          WHERE o.contact_id = c.id AND o.status = 'Open'
        ) as open_opportunities,
        (
          SELECT COUNT(*) FROM crm.tasks t 
          WHERE t.contact_id = c.id AND t.status = 'pending'
        ) as pending_tasks
      FROM crm.contacts c
      LEFT JOIN master.customers mc ON mc.st_id = c.st_customer_id
      LEFT JOIN crm.pipelines p ON p.id = c.pipeline_id
      WHERE c.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (stage) {
      query += ` AND c.stage = $${paramIndex++}`;
      params.push(stage);
    }
    
    if (pipeline_id) {
      query += ` AND c.pipeline_id = $${paramIndex++}`;
      params.push(pipeline_id);
    }
    
    if (owner_id) {
      query += ` AND c.owner_id = $${paramIndex++}`;
      params.push(owner_id);
    }
    
    if (search) {
      query += ` AND (
        c.name ILIKE $${paramIndex} OR 
        c.email ILIKE $${paramIndex} OR 
        c.phone ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (tags && tags.length > 0) {
      query += ` AND c.tags && $${paramIndex++}`;
      params.push(tags);
    }
    
    if (has_upcoming_followup) {
      query += ` AND c.next_followup_at IS NOT NULL AND c.next_followup_at <= NOW() + INTERVAL '7 days'`;
    }
    
    query += ` ORDER BY c.updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM crm.contacts WHERE is_active = true`
    );
    
    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
    
  } finally {
    await pool.end();
  }
}

/**
 * Get a single contact with related data
 */
export async function getContact(id) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        mc.balance,
        mc.city,
        mc.state,
        mc.address_line1,
        mc.phone_numbers,
        mc.email_addresses,
        mc.raw_data as st_raw_data,
        p.name as pipeline_name,
        (
          SELECT json_agg(o ORDER BY o.created_at DESC)
          FROM crm.opportunities o
          WHERE o.contact_id = c.id
        ) as opportunities,
        (
          SELECT json_agg(a ORDER BY a.created_at DESC)
          FROM crm.activities a
          WHERE a.contact_id = c.id
        ) as activities,
        (
          SELECT json_agg(t ORDER BY t.due_date ASC)
          FROM crm.tasks t
          WHERE t.contact_id = c.id AND t.status = 'pending'
        ) as pending_tasks
      FROM crm.contacts c
      LEFT JOIN master.customers mc ON mc.st_id = c.st_customer_id
      LEFT JOIN crm.pipelines p ON p.id = c.pipeline_id
      WHERE c.id = $1
    `, [id]);
    
    return result.rows[0] || null;
    
  } finally {
    await pool.end();
  }
}

/**
 * Update a contact
 */
export async function updateContact(id, data) {
  const pool = getPool();
  
  try {
    const {
      stage,
      pipeline_id,
      owner_id,
      notes,
      tags,
      custom_fields,
      lead_source,
      lead_score,
      next_followup_at,
      do_not_contact
    } = data;
    
    const result = await pool.query(`
      UPDATE crm.contacts SET
        stage = COALESCE($2, stage),
        pipeline_id = COALESCE($3, pipeline_id),
        owner_id = COALESCE($4, owner_id),
        notes = COALESCE($5, notes),
        tags = COALESCE($6, tags),
        custom_fields = COALESCE($7, custom_fields),
        lead_source = COALESCE($8, lead_source),
        lead_score = COALESCE($9, lead_score),
        next_followup_at = COALESCE($10, next_followup_at),
        do_not_contact = COALESCE($11, do_not_contact),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, stage, pipeline_id, owner_id, notes, tags, 
        custom_fields ? JSON.stringify(custom_fields) : null, 
        lead_source, lead_score, next_followup_at, do_not_contact]);
    
    logger.info('Contact updated', { contactId: id });
    
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

/**
 * Move contact to a different stage
 */
export async function moveContactToStage(id, stage) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      UPDATE crm.contacts SET
        stage = $2,
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, stage]);
    
    logger.info('Contact moved to stage', { contactId: id, stage });
    
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────
// OPPORTUNITIES
// ─────────────────────────────────────────────────────────

/**
 * Get opportunities with filters
 */
export async function getOpportunities(filters = {}) {
  const pool = getPool();
  
  try {
    const { pipeline_id, stage_id, status, owner_id, limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT 
        o.*,
        c.name as contact_name,
        c.email as contact_email,
        c.phone as contact_phone,
        p.name as pipeline_name,
        ps.name as stage_name,
        ps.color as stage_color,
        me.job_number as estimate_job_number,
        me.subtotal as estimate_subtotal
      FROM crm.opportunities o
      LEFT JOIN crm.contacts c ON c.id = o.contact_id
      LEFT JOIN crm.pipelines p ON p.id = o.pipeline_id
      LEFT JOIN crm.pipeline_stages ps ON ps.id = o.stage_id
      LEFT JOIN master.estimates me ON me.st_id = o.st_estimate_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (pipeline_id) {
      query += ` AND o.pipeline_id = $${paramIndex++}`;
      params.push(pipeline_id);
    }
    
    if (stage_id) {
      query += ` AND o.stage_id = $${paramIndex++}`;
      params.push(stage_id);
    }
    
    if (status) {
      query += ` AND o.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (owner_id) {
      query += ` AND o.owner_id = $${paramIndex++}`;
      params.push(owner_id);
    }
    
    query += ` ORDER BY o.updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

/**
 * Create an opportunity
 */
export async function createOpportunity(data) {
  const pool = getPool();
  
  try {
    const {
      contact_id,
      st_estimate_id,
      pipeline_id,
      stage_id,
      name,
      description,
      value,
      expected_close_date,
      owner_id
    } = data;
    
    // Get default pipeline/stage if not provided
    let finalPipelineId = pipeline_id;
    let finalStageId = stage_id;
    
    if (!finalPipelineId) {
      const defaultPipeline = await pool.query(
        `SELECT id FROM crm.pipelines WHERE is_default = true LIMIT 1`
      );
      finalPipelineId = defaultPipeline.rows[0]?.id;
    }
    
    if (!finalStageId && finalPipelineId) {
      const firstStage = await pool.query(
        `SELECT id FROM crm.pipeline_stages WHERE pipeline_id = $1 ORDER BY display_order ASC LIMIT 1`,
        [finalPipelineId]
      );
      finalStageId = firstStage.rows[0]?.id;
    }
    
    const result = await pool.query(`
      INSERT INTO crm.opportunities (
        contact_id, st_estimate_id, pipeline_id, stage_id,
        name, description, value, expected_close_date, owner_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [contact_id, st_estimate_id, finalPipelineId, finalStageId,
        name, description, value, expected_close_date, owner_id]);
    
    logger.info('Opportunity created', { opportunityId: result.rows[0].id });
    
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

/**
 * Update an opportunity
 */
export async function updateOpportunity(id, data) {
  const pool = getPool();
  
  try {
    const {
      stage_id,
      name,
      description,
      value,
      probability,
      expected_close_date,
      status,
      lost_reason,
      owner_id
    } = data;
    
    // Handle won/lost status
    let wonAt = null;
    let lostAt = null;
    
    if (status === 'Won') {
      wonAt = new Date();
    } else if (status === 'Lost') {
      lostAt = new Date();
    }
    
    const result = await pool.query(`
      UPDATE crm.opportunities SET
        stage_id = COALESCE($2, stage_id),
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        value = COALESCE($5, value),
        probability = COALESCE($6, probability),
        expected_close_date = COALESCE($7, expected_close_date),
        status = COALESCE($8, status),
        won_at = COALESCE($9, won_at),
        lost_at = COALESCE($10, lost_at),
        lost_reason = COALESCE($11, lost_reason),
        owner_id = COALESCE($12, owner_id),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, stage_id, name, description, value, probability,
        expected_close_date, status, wonAt, lostAt, lost_reason, owner_id]);
    
    logger.info('Opportunity updated', { opportunityId: id });
    
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

/**
 * Move opportunity to a different stage
 */
export async function moveOpportunityToStage(id, stageId) {
  const pool = getPool();
  
  try {
    // Check if this is a won/lost stage
    const stageResult = await pool.query(
      `SELECT is_won, is_lost FROM crm.pipeline_stages WHERE id = $1`,
      [stageId]
    );
    
    const stage = stageResult.rows[0];
    let status = 'Open';
    let wonAt = null;
    let lostAt = null;
    
    if (stage?.is_won) {
      status = 'Won';
      wonAt = new Date();
    } else if (stage?.is_lost) {
      status = 'Lost';
      lostAt = new Date();
    }
    
    const result = await pool.query(`
      UPDATE crm.opportunities SET
        stage_id = $2,
        status = $3,
        won_at = $4,
        lost_at = $5,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, stageId, status, wonAt, lostAt]);
    
    logger.info('Opportunity moved to stage', { opportunityId: id, stageId, status });
    
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────
// PIPELINES
// ─────────────────────────────────────────────────────────

/**
 * Get all pipelines with stages
 */
export async function getPipelines() {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        (
          SELECT json_agg(ps ORDER BY ps.display_order)
          FROM crm.pipeline_stages ps
          WHERE ps.pipeline_id = p.id
        ) as stages,
        (
          SELECT COUNT(*) FROM crm.opportunities o
          WHERE o.pipeline_id = p.id AND o.status = 'Open'
        ) as open_opportunities,
        (
          SELECT COALESCE(SUM(o.value), 0) FROM crm.opportunities o
          WHERE o.pipeline_id = p.id AND o.status = 'Open'
        ) as pipeline_value
      FROM crm.pipelines p
      WHERE p.is_active = true OR p.active = true
      ORDER BY p.sort_order, p.display_order
    `);
    
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

/**
 * Get pipeline statistics by stage
 */
export async function getPipelineStats(pipelineId) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT 
        ps.id,
        ps.name,
        ps.color,
        ps.display_order,
        ps.probability_percent as probability,
        COUNT(o.id) as count,
        COALESCE(SUM(o.value), 0) as total_value,
        COALESCE(SUM(o.value * COALESCE(ps.probability_percent, 0) / 100), 0) as weighted_value
      FROM crm.pipeline_stages ps
      LEFT JOIN crm.opportunities o ON o.stage_id = ps.id AND o.status = 'Open'
      WHERE ps.pipeline_id = $1
      GROUP BY ps.id
      ORDER BY ps.display_order
    `, [pipelineId]);
    
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────────────────────

/**
 * Log an activity
 */
export async function logActivity(data) {
  const pool = getPool();
  
  try {
    const {
      contact_id,
      opportunity_id,
      type,
      subject,
      body,
      call_duration,
      call_outcome,
      created_by
    } = data;
    
    // Determine entity_type and entity_id
    const entity_type = contact_id ? 'contact' : 'opportunity';
    const entity_id = contact_id || opportunity_id;
    
    const result = await pool.query(`
      INSERT INTO crm.activities (
        entity_type, entity_id, activity_type, contact_id, opportunity_id, 
        type, subject, body, call_duration, call_outcome, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [entity_type, entity_id, type, contact_id, opportunity_id, 
        type, subject, body, call_duration, call_outcome, created_by]);
    
    // Update last_activity_at on contact
    if (contact_id) {
      await pool.query(
        `UPDATE crm.contacts SET last_activity_at = NOW() WHERE id = $1`,
        [contact_id]
      );
    }
    
    logger.info('Activity logged', { activityId: result.rows[0].id, type });
    
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

/**
 * Get activities for a contact
 */
export async function getActivities(contactId, limit = 50) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT * FROM crm.activities
      WHERE contact_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [contactId, limit]);
    
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────

/**
 * Create a task
 */
export async function createTask(data) {
  const pool = getPool();
  
  try {
    const {
      contact_id,
      opportunity_id,
      title,
      description,
      due_date,
      priority,
      assigned_to,
      created_by
    } = data;
    
    const result = await pool.query(`
      INSERT INTO crm.tasks (
        contact_id, opportunity_id, title, description,
        due_date, priority, assigned_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [contact_id, opportunity_id, title, description,
        due_date, priority, assigned_to, created_by]);
    
    logger.info('Task created', { taskId: result.rows[0].id });
    
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

/**
 * Complete a task
 */
export async function completeTask(id) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      UPDATE crm.tasks SET
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    logger.info('Task completed', { taskId: id });
    
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

/**
 * Get upcoming tasks for a user
 */
export async function getUpcomingTasks(userId, days = 7) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        c.name as contact_name,
        o.name as opportunity_name
      FROM crm.tasks t
      LEFT JOIN crm.contacts c ON c.id = t.contact_id
      LEFT JOIN crm.opportunities o ON o.id = t.opportunity_id
      WHERE t.assigned_to = $1
        AND t.status = 'pending'
        AND t.due_date <= NOW() + INTERVAL '1 day' * $2
      ORDER BY t.due_date ASC
    `, [userId, days]);
    
    return result.rows;
    
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM crm.contacts WHERE is_active = true) as total_contacts,
        (SELECT COUNT(*) FROM crm.contacts WHERE created_at >= NOW() - INTERVAL '30 days') as new_contacts_30d,
        (SELECT COUNT(*) FROM crm.opportunities WHERE status = 'Open') as open_opportunities,
        (SELECT COALESCE(SUM(value), 0) FROM crm.opportunities WHERE status = 'Open') as pipeline_value,
        (SELECT COUNT(*) FROM crm.opportunities WHERE status = 'Won' AND won_at >= NOW() - INTERVAL '30 days') as won_30d,
        (SELECT COALESCE(SUM(value), 0) FROM crm.opportunities WHERE status = 'Won' AND won_at >= NOW() - INTERVAL '30 days') as won_value_30d,
        (SELECT COUNT(*) FROM crm.tasks WHERE status = 'pending' AND due_date <= NOW()) as overdue_tasks,
        (SELECT COUNT(*) FROM crm.contacts WHERE next_followup_at <= NOW()) as due_followups
    `);
    
    return result.rows[0];
    
  } finally {
    await pool.end();
  }
}

export default {
  // Contacts
  getContacts,
  getContact,
  updateContact,
  moveContactToStage,
  
  // Opportunities
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  moveOpportunityToStage,
  
  // Pipelines
  getPipelines,
  getPipelineStats,
  
  // Activities
  logActivity,
  getActivities,
  
  // Tasks
  createTask,
  completeTask,
  getUpcomingTasks,
  
  // Dashboard
  getDashboardStats,
};
