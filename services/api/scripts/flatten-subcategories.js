#!/usr/bin/env node
/**
 * Flatten Subcategories from JSONB to Table
 * 
 * Extracts all nested subcategories from raw.st_pricebook_categories.subcategories
 * and inserts them into master.pricebook_subcategories table.
 * 
 * Usage: node scripts/flatten-subcategories.js
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TENANT_ID = process.env.SERVICE_TITAN_TENANT_ID || '3222348440';

/**
 * Recursively extract subcategories from nested JSONB
 */
function extractSubcategories(subcategories, parentStId, rootCategoryStId, depth = 1, parentPath = '') {
  const results = [];
  
  if (!subcategories || !Array.isArray(subcategories)) {
    return results;
  }

  for (const sub of subcategories) {
    const currentPath = parentPath ? `${parentPath} > ${sub.name}` : sub.name;
    
    results.push({
      stId: sub.id,
      parentStId,
      rootCategoryStId,
      name: sub.name,
      displayName: sub.displayName || sub.name,
      description: sub.description || null,
      active: sub.active !== false,
      position: sub.position || 0,
      depth,
      path: currentPath,
      imageUrl: sub.image || null,
    });

    // Recurse into nested subcategories (up to 6 levels)
    if (sub.subcategories && Array.isArray(sub.subcategories) && depth < 6) {
      const nested = extractSubcategories(
        sub.subcategories,
        sub.id,
        rootCategoryStId,
        depth + 1,
        currentPath
      );
      results.push(...nested);
    }
  }

  return results;
}

async function main() {
  console.log('=== Flatten Subcategories from JSONB ===');
  console.log(`Tenant ID: ${TENANT_ID}`);
  
  const client = await pool.connect();
  
  try {
    // Get all categories with subcategories
    const categoriesResult = await client.query(`
      SELECT st_id, name, subcategories
      FROM raw.st_pricebook_categories
      WHERE tenant_id = $1
        AND subcategories IS NOT NULL
        AND jsonb_array_length(subcategories) > 0
    `, [TENANT_ID]);

    console.log(`Found ${categoriesResult.rows.length} categories with subcategories`);

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalWithImages = 0;

    for (const category of categoriesResult.rows) {
      console.log(`\nProcessing: ${category.name} (st_id=${category.st_id})`);
      
      // Extract all nested subcategories
      const subcategories = extractSubcategories(
        category.subcategories,
        category.st_id,      // Parent is the category itself for level 1
        category.st_id,      // Root category
        1,                   // Start at depth 1
        category.name        // Start path with category name
      );

      console.log(`  Extracted ${subcategories.length} subcategories`);

      // Upsert each subcategory
      for (const sub of subcategories) {
        try {
          const result = await client.query(`
            INSERT INTO master.pricebook_subcategories (
              st_id, tenant_id, parent_st_id, category_st_id,
              name, display_name, description, is_active, position, 
              depth, path, image_url, updated_at, last_synced_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
            ON CONFLICT (st_id, tenant_id) DO UPDATE SET
              parent_st_id = EXCLUDED.parent_st_id,
              category_st_id = EXCLUDED.category_st_id,
              name = EXCLUDED.name,
              display_name = EXCLUDED.display_name,
              description = EXCLUDED.description,
              is_active = EXCLUDED.is_active,
              position = EXCLUDED.position,
              depth = EXCLUDED.depth,
              path = EXCLUDED.path,
              image_url = COALESCE(EXCLUDED.image_url, master.pricebook_subcategories.image_url),
              updated_at = NOW(),
              last_synced_at = NOW()
            RETURNING id, (xmax = 0) as inserted
          `, [
            sub.stId,
            TENANT_ID,
            sub.parentStId,
            sub.rootCategoryStId,
            sub.name,
            sub.displayName,
            sub.description,
            sub.active,
            sub.position,
            sub.depth,
            sub.path,
            sub.imageUrl,
          ]);

          if (result.rows[0].inserted) {
            totalInserted++;
          } else {
            totalUpdated++;
          }

          if (sub.imageUrl) {
            totalWithImages++;
          }
        } catch (err) {
          console.error(`  Error upserting ${sub.stId}:`, err.message);
        }
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Inserted: ${totalInserted}`);
    console.log(`Updated: ${totalUpdated}`);
    console.log(`With Images: ${totalWithImages}`);

    // Show depth distribution
    const depthStats = await client.query(`
      SELECT depth, COUNT(*) as count, 
             COUNT(image_url) FILTER (WHERE image_url IS NOT NULL AND image_url != '') as with_image,
             COUNT(s3_image_url) FILTER (WHERE s3_image_url IS NOT NULL) as migrated
      FROM master.pricebook_subcategories
      WHERE tenant_id = $1
      GROUP BY depth
      ORDER BY depth
    `, [TENANT_ID]);

    console.log('\n=== Depth Distribution ===');
    console.table(depthStats.rows);

  } finally {
    client.release();
  }

  await pool.end();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
