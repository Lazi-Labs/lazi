/**
 * Pricebook Kits Routes
 * Material Kits CRUD API - LAZI-only feature (no ServiceTitan sync)
 */

import { Router } from 'express';
import { getPool } from '../db/schema-connection.js';

const router = Router();

// Get shared pool from schema-connection module
const pool = getPool();

/**
 * GET /api/pricebook/kits
 * List all kits for tenant with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing x-tenant-id header' });
    }

    const { search, categoryPath } = req.query;

    let query = `
      SELECT 
        k.id,
        k.tenant_id,
        k.name,
        k.description,
        k.category_path,
        k.created_at,
        k.updated_at,
        (SELECT COUNT(*) FROM master.material_kit_items WHERE kit_id = k.id) as item_count,
        (SELECT COUNT(*) FROM master.material_kit_groups WHERE kit_id = k.id) as group_count
      FROM master.material_kits k
      WHERE k.tenant_id = $1::bigint AND k.is_active = true
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (search) {
      query += ` AND k.name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (categoryPath) {
      const pathArray = categoryPath.split('.');
      query += ` AND k.category_path @> $${paramIndex}`;
      params.push(pathArray);
      paramIndex++;
    }

    query += ' ORDER BY k.name ASC';

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total: result.rowCount });
  } catch (error) {
    console.error('Error fetching kits:', error);
    res.status(500).json({ error: 'Failed to fetch kits', details: error.message });
  }
});

/**
 * GET /api/pricebook/kits/:id
 * Get single kit with all details (groups, items, materials)
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing x-tenant-id header' });
    }

    const { id } = req.params;

    // Get kit
    const kitResult = await pool.query(
      `SELECT * FROM master.material_kits WHERE id = $1 AND tenant_id = $2::bigint AND is_active = true`,
      [id, tenantId]
    );

    if (kitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    const kit = kitResult.rows[0];

    // Get groups
    const groupsResult = await pool.query(
      `SELECT id, kit_id, name, color, is_collapsed as collapsed, sort_order, created_at
       FROM master.material_kit_groups WHERE kit_id = $1 ORDER BY sort_order, name`,
      [id]
    );

    // Get items with material details
    const itemsResult = await pool.query(
      `SELECT 
        i.id,
        i.kit_id,
        i.group_id,
        i.material_id,
        i.quantity,
        i.sort_order,
        m.st_id as material_st_id,
        m.code as material_code,
        m.name as material_name,
        m.description as material_description,
        m.cost as material_cost,
        m.price as material_price,
        m.unit_of_measure as material_unit
      FROM master.material_kit_items i
      LEFT JOIN master.pricebook_materials m ON i.material_id = m.id
      WHERE i.kit_id = $1
      ORDER BY i.sort_order, i.created_at`,
      [id]
    );

    // Get included kits
    const includesResult = await pool.query(
      `SELECT
        inc.child_kit_id as included_kit_id,
        k.name as kit_name
      FROM master.material_kit_includes inc
      JOIN master.material_kits k ON inc.child_kit_id = k.id
      WHERE inc.parent_kit_id = $1`,
      [id]
    );

    res.json({
      ...kit,
      groups: groupsResult.rows,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        kitId: item.kit_id,
        groupId: item.group_id,
        materialId: item.material_id,
        quantity: parseFloat(item.quantity),
        sortOrder: item.sort_order,
        material: {
          id: item.material_id,
          stId: item.material_st_id,
          code: item.material_code,
          name: item.material_name,
          description: item.material_description,
          cost: parseFloat(item.material_cost || 0),
          price: parseFloat(item.material_price || 0),
          unit: item.material_unit,
        },
      })),
      includedKitIds: includesResult.rows.map(r => r.included_kit_id),
    });
  } catch (error) {
    console.error('Error fetching kit:', error);
    res.status(500).json({ error: 'Failed to fetch kit', details: error.message });
  }
});

/**
 * POST /api/pricebook/kits
 * Create a new kit
 */
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing x-tenant-id header' });
    }

    const { name, description, categoryPath, materials, groups, includedKitIds } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Kit name is required' });
    }

    await client.query('BEGIN');

    // Convert categoryPath array to ltree format (dot-separated string)
    let categoryPathLtree = null;
    if (categoryPath) {
      if (Array.isArray(categoryPath)) {
        categoryPathLtree = categoryPath.length > 0 ? categoryPath.join('.') : null;
      } else if (typeof categoryPath === 'string') {
        categoryPathLtree = categoryPath || null;
      }
    }

    // Create kit
    const kitResult = await client.query(
      `INSERT INTO master.material_kits (tenant_id, name, description, category_path)
       VALUES ($1::bigint, $2, $3, $4)
       RETURNING *`,
      [tenantId, name, description || null, categoryPathLtree]
    );
    const kit = kitResult.rows[0];

    // Create groups
    const groupIdMap = {};
    if (groups && groups.length > 0) {
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const groupResult = await client.query(
          `INSERT INTO master.material_kit_groups (kit_id, name, color, is_collapsed, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [kit.id, group.name, group.color || '#3B82F6', group.collapsed || false, i]
        );
        groupIdMap[group.id] = groupResult.rows[0].id;
      }
    }

    // Create items
    if (materials && materials.length > 0) {
      for (let i = 0; i < materials.length; i++) {
        const item = materials[i];
        const groupId = item.groupId ? groupIdMap[item.groupId] : null;
        await client.query(
          `INSERT INTO master.material_kit_items (kit_id, group_id, material_id, quantity, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [kit.id, groupId, item.materialId, item.quantity || 1, i]
        );
      }
    }

    // Create kit includes
    if (includedKitIds && includedKitIds.length > 0) {
      for (const includedKitId of includedKitIds) {
        await client.query(
          `INSERT INTO master.material_kit_includes (parent_kit_id, child_kit_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [kit.id, includedKitId]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ id: kit.id, message: 'Kit created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating kit:', error);
    res.status(500).json({ error: 'Failed to create kit', details: error.message });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/pricebook/kits/:id
 * Update an existing kit
 */
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing x-tenant-id header' });
    }

    const { id } = req.params;
    const { name, description, categoryPath, materials, groups, includedKitIds } = req.body;

    // Verify kit exists and belongs to tenant
    const existingKit = await client.query(
      `SELECT id FROM master.material_kits WHERE id = $1 AND tenant_id = $2::bigint AND is_active = true`,
      [id, tenantId]
    );

    if (existingKit.rows.length === 0) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    await client.query('BEGIN');

    // Convert categoryPath array to ltree format (dot-separated string)
    let categoryPathLtree = null;
    if (categoryPath) {
      if (Array.isArray(categoryPath)) {
        categoryPathLtree = categoryPath.length > 0 ? categoryPath.join('.') : null;
      } else if (typeof categoryPath === 'string') {
        categoryPathLtree = categoryPath || null;
      }
    }

    // Update kit
    await client.query(
      `UPDATE master.material_kits
       SET name = $1, description = $2, category_path = $3, updated_at = NOW()
       WHERE id = $4`,
      [name, description || null, categoryPathLtree, id]
    );

    // Delete existing groups and items (cascade will handle items in deleted groups)
    await client.query(`DELETE FROM master.material_kit_groups WHERE kit_id = $1`, [id]);
    await client.query(`DELETE FROM master.material_kit_items WHERE kit_id = $1`, [id]);
    await client.query(`DELETE FROM master.material_kit_includes WHERE parent_kit_id = $1`, [id]);

    // Recreate groups
    const groupIdMap = {};
    if (groups && groups.length > 0) {
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const groupResult = await client.query(
          `INSERT INTO master.material_kit_groups (kit_id, name, color, is_collapsed, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [id, group.name, group.color || '#3B82F6', group.collapsed || false, i]
        );
        groupIdMap[group.id] = groupResult.rows[0].id;
      }
    }

    // Recreate items
    if (materials && materials.length > 0) {
      for (let i = 0; i < materials.length; i++) {
        const item = materials[i];
        const groupId = item.groupId ? groupIdMap[item.groupId] : null;
        await client.query(
          `INSERT INTO master.material_kit_items (kit_id, group_id, material_id, quantity, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, groupId, item.materialId, item.quantity || 1, i]
        );
      }
    }

    // Recreate kit includes
    if (includedKitIds && includedKitIds.length > 0) {
      for (const includedKitId of includedKitIds) {
        await client.query(
          `INSERT INTO master.material_kit_includes (parent_kit_id, child_kit_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [id, includedKitId]
        );
      }
    }

    await client.query('COMMIT');

    res.json({ id, message: 'Kit updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating kit:', error);
    res.status(500).json({ error: 'Failed to update kit', details: error.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/pricebook/kits/:id
 * Soft delete a kit
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing x-tenant-id header' });
    }

    const { id } = req.params;

    const result = await pool.query(
      `UPDATE master.material_kits 
       SET is_active = false, updated_at = NOW() 
       WHERE id = $1 AND tenant_id = $2::bigint AND is_active = true
       RETURNING id`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    res.json({ message: 'Kit deleted successfully' });
  } catch (error) {
    console.error('Error deleting kit:', error);
    res.status(500).json({ error: 'Failed to delete kit', details: error.message });
  }
});

/**
 * POST /api/pricebook/kits/:id/duplicate
 * Duplicate a kit
 */
router.post('/:id/duplicate', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing x-tenant-id header' });
    }

    const { id } = req.params;

    // Get original kit
    const kitResult = await client.query(
      `SELECT * FROM master.material_kits WHERE id = $1 AND tenant_id = $2::bigint AND is_active = true`,
      [id, tenantId]
    );

    if (kitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    const originalKit = kitResult.rows[0];

    await client.query('BEGIN');

    // Create new kit with "(Copy)" suffix
    const newKitResult = await client.query(
      `INSERT INTO master.material_kits (tenant_id, name, description, category_path)
       VALUES ($1::bigint, $2, $3, $4)
       RETURNING *`,
      [tenantId, `${originalKit.name} (Copy)`, originalKit.description, originalKit.category_path]
    );
    const newKit = newKitResult.rows[0];

    // Copy groups
    const groupsResult = await client.query(
      `SELECT * FROM master.material_kit_groups WHERE kit_id = $1 ORDER BY sort_order`,
      [id]
    );

    const groupIdMap = {};
    for (const group of groupsResult.rows) {
      const newGroupResult = await client.query(
        `INSERT INTO master.material_kit_groups (kit_id, name, color, is_collapsed, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [newKit.id, group.name, group.color, group.collapsed, group.sort_order]
      );
      groupIdMap[group.id] = newGroupResult.rows[0].id;
    }

    // Copy items
    const itemsResult = await client.query(
      `SELECT * FROM master.material_kit_items WHERE kit_id = $1 ORDER BY sort_order`,
      [id]
    );

    for (const item of itemsResult.rows) {
      const newGroupId = item.group_id ? groupIdMap[item.group_id] : null;
      await client.query(
        `INSERT INTO master.material_kit_items (kit_id, group_id, material_id, quantity, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [newKit.id, newGroupId, item.material_id, item.quantity, item.sort_order]
      );
    }

    // Copy includes
    const includesResult = await client.query(
      `SELECT * FROM master.material_kit_includes WHERE parent_kit_id = $1`,
      [id]
    );

    for (const inc of includesResult.rows) {
      await client.query(
        `INSERT INTO master.material_kit_includes (parent_kit_id, child_kit_id)
         VALUES ($1, $2)`,
        [newKit.id, inc.child_kit_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ id: newKit.id, message: 'Kit duplicated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error duplicating kit:', error);
    res.status(500).json({ error: 'Failed to duplicate kit', details: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/pricebook/kits/:id/apply
 * Apply a kit - returns materials formatted for service editor
 */
router.post('/:id/apply', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing x-tenant-id header' });
    }

    const { id } = req.params;
    const { multiplier = 1 } = req.body;

    // Get kit items with material details
    const itemsResult = await pool.query(
      `SELECT 
        i.material_id,
        i.quantity,
        m.st_id,
        m.code,
        m.name,
        m.description,
        m.cost,
        m.price,
        m.unit_of_measure
      FROM master.material_kit_items i
      JOIN master.pricebook_materials m ON i.material_id = m.id
      JOIN master.material_kits k ON i.kit_id = k.id
      WHERE i.kit_id = $1 AND k.tenant_id = $2::bigint AND k.is_active = true
      ORDER BY i.sort_order`,
      [id, tenantId]
    );

    if (itemsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kit not found or has no materials' });
    }

    // Format materials for service editor
    const materials = itemsResult.rows.map(item => ({
      materialId: item.material_id,
      stMaterialId: item.st_id,
      code: item.code,
      name: item.name,
      description: item.description,
      quantity: parseFloat(item.quantity) * multiplier,
      cost: parseFloat(item.cost || 0),
      price: parseFloat(item.price || 0),
      unit: item.unit_of_measure,
    }));

    res.json({ materials });
  } catch (error) {
    console.error('Error applying kit:', error);
    res.status(500).json({ error: 'Failed to apply kit', details: error.message });
  }
});

export default router;
