/**
 * Image Proxy Routes
 * Proxies ServiceTitan pricebook images through our server
 * This allows images to be served from perfectcatchai.com domain
 */

import { Router } from 'express';
import { getAccessToken } from '../services/tokenManager.js';
import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';
import config from '../config/index.js';

const router = Router();

// ServiceTitan tenant ID from environment
const TENANT_ID = process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
const IMAGE_STORAGE_PATH = process.env.IMAGE_STORAGE_PATH || '/app/public/images';

// Database pool for serving images
const pool = new pg.Pool({
  connectionString: config.database.url,
  max: 5,
});

// Cache for images (in production, use Redis or file system)
const imageCache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

/**
 * GET /images/st/:path(*)
 * Proxy ServiceTitan images
 * Example: /images/st/Images/Service/96653cb4-3ade-4fdb-a7a0-a6efc8a29c99.jpg
 */
router.get('/st/*', async (req, res) => {
  try {
    // Get the image path from the URL (everything after /st/)
    const imagePath = req.params[0];
    
    if (!imagePath) {
      return res.status(400).json({ error: 'Image path is required' });
    }

    // Check cache first
    const cacheKey = imagePath;
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set('Content-Type', cached.contentType);
      res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
      res.set('X-Cache', 'HIT');
      return res.send(cached.data);
    }

    // Get ServiceTitan access token
    const accessToken = await getAccessToken();
    
    // ServiceTitan image endpoint: GET /pricebook/v2/tenant/{tenant}/images?path=
    const possibleUrls = [
      `https://api.servicetitan.io/pricebook/v2/tenant/${TENANT_ID}/images?path=${encodeURIComponent(imagePath)}`,
      `https://api-integration.servicetitan.io/pricebook/v2/tenant/${TENANT_ID}/images?path=${encodeURIComponent(imagePath)}`,
    ];

    let imageBuffer = null;
    let contentType = 'image/jpeg';
    let lastError = null;

    for (const url of possibleUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'ST-App-Key': process.env.SERVICE_TITAN_APP_KEY,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          imageBuffer = Buffer.from(await response.arrayBuffer());
          contentType = response.headers.get('content-type') || 'image/jpeg';
          break;
        }
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    if (!imageBuffer) {
      console.error(`Failed to fetch image: ${imagePath}`, lastError?.message);
      return res.status(404).json({ 
        error: 'Image not found',
        path: imagePath,
      });
    }
    
    // Cache the image
    imageCache.set(cacheKey, {
      data: imageBuffer,
      contentType,
      timestamp: Date.now(),
    });

    // Limit cache size (simple LRU-like behavior)
    if (imageCache.size > 1000) {
      const firstKey = imageCache.keys().next().value;
      imageCache.delete(firstKey);
    }

    // Send the image
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
    res.set('X-Cache', 'MISS');
    res.send(imageBuffer);

  } catch (error) {
    console.error('Image proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch image',
      message: error.message,
    });
  }
});

/**
 * GET /images/local/*
 * Serve locally stored images (downloaded during sync)
 * Example: /images/local/Images/Service/96653cb4-3ade-4fdb-a7a0-a6efc8a29c99.jpg
 */
router.get('/local/*', async (req, res) => {
  try {
    const imagePath = req.params[0];
    
    if (!imagePath) {
      return res.status(400).json({ error: 'Image path is required' });
    }

    // Prevent directory traversal
    const safePath = path.normalize(imagePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(IMAGE_STORAGE_PATH, safePath);
    
    // Verify the path is within the storage directory
    if (!fullPath.startsWith(IMAGE_STORAGE_PATH)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const data = await fs.readFile(fullPath);
      
      // Determine content type from extension
      const ext = path.extname(fullPath).toLowerCase();
      const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      };
      
      res.set('Content-Type', contentTypes[ext] || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=604800'); // 7 days
      res.send(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Image not found', path: imagePath });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error serving local image:', error.message);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

/**
 * GET /images/db/:type/:id
 * Serve images stored in PostgreSQL
 * Example: /images/db/services/12345
 *          /images/db/materials/67890
 *          /images/db/equipment/11111
 *          /images/db/categories/22222
 */
router.get('/db/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;

    // Validate type
    const validTypes = ['services', 'materials', 'equipment', 'categories', 'subcategories'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Use: services, materials, equipment, categories, subcategories' });
    }

    // Check memory cache first
    const cacheKey = `db:${type}:${id}`;
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set('Content-Type', cached.contentType);
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('X-Cache', 'HIT');
      res.set('X-Source', 'database');
      return res.send(cached.data);
    }

    // First, get the image path from the source table
    let imagePath = null;
    
    if (type === 'categories') {
      const result = await pool.query(
        `SELECT image FROM raw.st_pricebook_categories WHERE st_id = $1`,
        [id]
      );
      imagePath = result.rows[0]?.image;
    } else if (type === 'subcategories') {
      const result = await pool.query(
        `SELECT image_url FROM master.pricebook_subcategories WHERE st_id = $1`,
        [id]
      );
      imagePath = result.rows[0]?.image_url;
    } else {
      // Services, materials, equipment - get S3 image URL from master tables
      const tableMap = {
        services: 'master.pricebook_services',
        materials: 'master.pricebook_materials',
        equipment: 'master.pricebook_equipment',
      };
      const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
      const result = await pool.query(
        `SELECT s3_image_url, assets FROM ${tableMap[type]} WHERE st_id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      // Prefer S3 URL, fallback to assets
      imagePath = result.rows[0]?.s3_image_url;
      if (!imagePath) {
        const assets = result.rows[0]?.assets;
        if (Array.isArray(assets)) {
          const imageAsset = assets.find(a => a.type === 'Image' && a.url);
          imagePath = imageAsset?.url;
        }
      }
    }

    if (!imagePath) {
      return res.status(404).json({ error: 'No image for this item', type, id });
    }

    // If it's an S3 URL, redirect to it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('X-Source', 's3-redirect');
      return res.redirect(302, imagePath);
    }

    // Query database for stored image data (for legacy data)
    let imageQuery;
    let tableName;

    if (type === 'categories') {
      tableName = 'raw.st_pricebook_categories';
      imageQuery = `SELECT image_data, image_content_type FROM ${tableName} WHERE st_id = $1`;
    } else if (type === 'subcategories') {
      tableName = 'master.pricebook_subcategories';
      imageQuery = `SELECT image_data, image_content_type FROM ${tableName} WHERE st_id = $1`;
    } else {
      // Use master tables with tenant ID
      const masterTableMap = {
        services: 'master.pricebook_services',
        materials: 'master.pricebook_materials',
        equipment: 'master.pricebook_equipment',
      };
      tableName = masterTableMap[type];
      const tenantId = req.headers['x-tenant-id'] || process.env.SERVICE_TITAN_TENANT_ID || '3222348440';
      imageQuery = `SELECT image_data, image_content_type FROM ${tableName} WHERE st_id = $1 AND tenant_id = $2`;
      try {
        const dbResult = await pool.query(imageQuery, [id, tenantId]);
        if (dbResult.rows.length > 0 && dbResult.rows[0].image_data) {
          const { image_data, image_content_type } = dbResult.rows[0];
          imageCache.set(cacheKey, {
            data: image_data,
            contentType: image_content_type || 'image/jpeg',
            timestamp: Date.now(),
          });
          res.set('Content-Type', image_content_type || 'image/jpeg');
          res.set('Cache-Control', 'public, max-age=86400');
          res.set('X-Cache', 'MISS');
          res.set('X-Source', 'database');
          return res.send(image_data);
        }
      } catch (dbErr) {
        console.error('Database image query error:', dbErr.message);
      }
      return res.status(404).json({ error: 'Image not found', type, id });
    }

    try {
      const dbResult = await pool.query(imageQuery, [id]);

      if (dbResult.rows.length > 0 && dbResult.rows[0].image_data) {
        const { image_data, image_content_type } = dbResult.rows[0];

        // Cache the image in memory
        imageCache.set(cacheKey, {
          data: image_data,
          contentType: image_content_type || 'image/jpeg',
          timestamp: Date.now(),
        });

        res.set('Content-Type', image_content_type || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400');
        res.set('X-Cache', 'MISS');
        res.set('X-Source', 'database');
        return res.send(image_data);
      }
    } catch (dbErr) {
      console.error('Database image query error:', dbErr.message);
    }

    // Image not in database
    return res.status(404).json({
      error: 'Image not found in database',
      type,
      id,
      path: imagePath,
      hint: 'Image may need to be synced from ServiceTitan'
    });

  } catch (error) {
    console.error('Database image error:', error.message);
    res.status(500).json({ error: 'Failed to fetch image', message: error.message });
  }
});

/**
 * HEAD /images/proxy
 * Check if an external image URL is valid (for validation)
 * Example: /images/proxy?url=https://example.com/image.jpg
 */
router.head('/proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).end();
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).end();
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).end();
    }

    // Check cache first
    const cacheKey = `proxy:${url}`;
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set('Content-Type', cached.contentType);
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('X-Cache', 'HIT');
      return res.status(200).end();
    }

    // Make a HEAD request to check if image exists
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LAZI-CRM/1.0)',
        'Accept': 'image/*,*/*',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).end();
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return res.status(400).end();
    }

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.status(200).end();

  } catch (error) {
    console.error('Image proxy HEAD error:', error.message);
    res.status(500).end();
  }
});

/**
 * GET /images/proxy
 * Proxy any external image URL to bypass CORS restrictions
 * Example: /images/proxy?url=https://example.com/image.jpg
 */
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are allowed' });
    }

    // Check cache first
    const cacheKey = `proxy:${url}`;
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set('Content-Type', cached.contentType);
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('X-Cache', 'HIT');
      res.set('Access-Control-Allow-Origin', '*');
      return res.send(cached.data);
    }

    // Fetch the image with timeout and follow redirects
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LAZI-CRM/1.0)',
        'Accept': 'image/*,*/*',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        error: response.status === 404
          ? 'Image not found at this URL'
          : 'Failed to fetch image',
        status: response.status,
        statusText: response.statusText,
        hint: response.status === 404
          ? 'The image may have been moved or deleted. Try a different URL.'
          : undefined,
      });
    }

    // Check content type - be lenient for some servers
    const contentType = response.headers.get('content-type') || '';
    const isLikelyImage = contentType.startsWith('image/') ||
                          contentType.includes('octet-stream') ||
                          url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i);

    if (!isLikelyImage) {
      return res.status(400).json({
        error: 'URL does not point to an image',
        contentType,
        hint: 'Make sure the URL ends with an image extension like .jpg, .png, etc.',
      });
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // If content type is octet-stream, try to determine from URL extension
    let finalContentType = contentType;
    if (!contentType.startsWith('image/')) {
      const extMatch = url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i);
      if (extMatch) {
        const ext = extMatch[1].toLowerCase();
        const extMap = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          webp: 'image/webp',
          svg: 'image/svg+xml',
          bmp: 'image/bmp',
          ico: 'image/x-icon',
        };
        finalContentType = extMap[ext] || 'image/jpeg';
      } else {
        finalContentType = 'image/jpeg'; // Default fallback
      }
    }

    // Cache the image
    imageCache.set(cacheKey, {
      data: imageBuffer,
      contentType: finalContentType,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (imageCache.size > 1000) {
      const firstKey = imageCache.keys().next().value;
      imageCache.delete(firstKey);
    }

    // Send the image with CORS headers
    res.set('Content-Type', finalContentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('X-Cache', 'MISS');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(imageBuffer);

  } catch (error) {
    console.error('Image proxy error:', error.message);

    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out' });
    }

    res.status(500).json({
      error: 'Failed to fetch image',
      message: error.message,
    });
  }
});

/**
 * GET /images/info
 * Get cache statistics
 */
router.get('/info', async (req, res) => {
  // Get image stats from database
  let dbStats = {};
  try {
    const statsResult = await pool.query(`
      SELECT
        'services' as type,
        COUNT(*) FILTER (WHERE assets IS NOT NULL AND jsonb_array_length(assets) > 0) as with_images,
        COUNT(*) as total
      FROM raw.st_pricebook_services
      UNION ALL
      SELECT 'materials', COUNT(*) FILTER (WHERE assets IS NOT NULL AND jsonb_array_length(assets) > 0), COUNT(*)
      FROM raw.st_pricebook_materials
      UNION ALL
      SELECT 'equipment', COUNT(*) FILTER (WHERE assets IS NOT NULL AND jsonb_array_length(assets) > 0), COUNT(*)
      FROM raw.st_pricebook_equipment
      UNION ALL
      SELECT 'categories', COUNT(*) FILTER (WHERE image IS NOT NULL AND image != ''), COUNT(*)
      FROM raw.st_pricebook_categories
    `);
    dbStats = statsResult.rows;
  } catch (err) {
    dbStats = { error: err.message };
  }

  res.json({
    cacheSize: imageCache.size,
    cacheTTL: CACHE_TTL,
    tenantId: TENANT_ID,
    storagePath: IMAGE_STORAGE_PATH,
    databaseImages: dbStats,
  });
});

/**
 * DELETE /images/cache
 * Clear the image cache
 */
router.delete('/cache', (req, res) => {
  const size = imageCache.size;
  imageCache.clear();
  res.json({ 
    message: 'Cache cleared',
    clearedItems: size,
  });
});

export default router;
