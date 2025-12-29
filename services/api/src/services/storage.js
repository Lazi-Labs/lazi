/**
 * Supabase Storage Service for LAZI
 * Handles image uploads, deletions, and URL generation
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('storage');

let supabase = null;
const BUCKET = 'pricebook-images';

/**
 * Initialize Supabase client
 */
function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase credentials not configured - storage features disabled');
      return null;
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('Supabase storage client initialized');
  }
  return supabase;
}

/**
 * Upload an image to Supabase Storage
 * @param {Buffer|Blob} file - File buffer or blob
 * @param {string} path - Storage path (e.g., 'categories/123.jpg')
 * @returns {Promise<string>} Public URL of uploaded image
 */
export async function uploadImage(file, path) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase storage not configured');
  }

  try {
    const { data, error } = await client.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });

    if (error) {
      logger.error({ error: error.message, path }, 'Failed to upload image');
      throw error;
    }

    const publicUrl = getImageUrl(path);
    logger.info({ path, publicUrl }, 'Image uploaded successfully');
    return publicUrl;
  } catch (error) {
    logger.error({ error: error.message, path }, 'Upload error');
    throw error;
  }
}

/**
 * Delete an image from Supabase Storage
 * @param {string} path - Storage path
 * @returns {Promise<void>}
 */
export async function deleteImage(path) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase storage not configured');
  }

  try {
    const { error } = await client.storage
      .from(BUCKET)
      .remove([path]);

    if (error) {
      logger.error({ error: error.message, path }, 'Failed to delete image');
      throw error;
    }

    logger.info({ path }, 'Image deleted successfully');
  } catch (error) {
    logger.error({ error: error.message, path }, 'Delete error');
    throw error;
  }
}

/**
 * Get public URL for an image
 * @param {string} path - Storage path
 * @returns {string} Public URL
 */
export function getImageUrl(path) {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data } = client.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Check if storage bucket exists and is accessible
 * @returns {Promise<boolean>}
 */
export async function checkStorageHealth() {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  try {
    const { data, error } = await client.storage.listBuckets();
    if (error) return false;
    
    const bucketExists = data.some(b => b.name === BUCKET);
    return bucketExists;
  } catch (error) {
    logger.error({ error: error.message }, 'Storage health check failed');
    return false;
  }
}

export default {
  uploadImage,
  deleteImage,
  getImageUrl,
  checkStorageHealth,
};
