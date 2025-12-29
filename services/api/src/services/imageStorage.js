/**
 * S3 Image Storage Service
 * Handles image upload, download, and migration to AWS S3
 * Uses ServiceTitan official API with direct fetch for binary data
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fetch from 'node-fetch';
import crypto from 'crypto';
import config from '../config/index.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'lazi-pricebook-images';

/**
 * Generate S3 key for an image
 * Pattern: {tenant_id}/{entity_type}/{st_id}.{ext}
 */
export function generateImageKey(tenantId, entityType, stId, ext = 'jpg') {
  return `${tenantId}/${entityType}/${stId}.${ext}`;
}

/**
 * Generate S3 key for custom uploaded image
 * Pattern: {tenant_id}/{entity_type}/custom/{uuid}.{ext}
 */
export function generateCustomImageKey(tenantId, entityType, originalFilename) {
  const uuid = crypto.randomUUID();
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  return `${tenantId}/${entityType}/custom/${uuid}.${ext}`;
}

/**
 * Upload image buffer to S3
 */
export async function uploadImage(key, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000',
  });
  
  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`;
}

/**
 * Get signed URL for private bucket access (if needed)
 */
export async function getSignedImageUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete image from S3
 */
export async function deleteImage(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  await s3Client.send(command);
  return true;
}

/**
 * Fetch image from ServiceTitan API
 * Uses official API: GET /pricebook/v2/tenant/{tenant}/images?path={imagePath}
 * 
 * NOTE: We use fetch directly instead of stRequest because stRequest calls response.text()
 * which corrupts binary image data by trying to decode it as UTF-8.
 * 
 * @param {string} tenantId - Tenant ID
 * @param {string} imagePath - Path from assets, e.g., "Images/Service/uuid.jpg"
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
export async function fetchImageFromST(tenantId, imagePath) {
  if (!imagePath || !imagePath.startsWith('Images/')) {
    throw new Error(`Invalid image path: ${imagePath}. Must start with "Images/"`);
  }

  const baseUrl = config.serviceTitan.apiBaseUrl || 'https://api-integration.servicetitan.io';
  const url = new URL(`${baseUrl}/pricebook/v2/tenant/${tenantId}/images`);
  url.searchParams.append('path', imagePath);

  // Get auth token from tokenManager
  const { getAccessToken } = await import('./tokenManager.js');
  const token = await getAccessToken();

  // Use fetch directly to get binary data without corruption
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'ST-App-Key': config.serviceTitan.appKey,
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`ServiceTitan image API error: HTTP ${response.status}`);
  }

  // Get binary data as ArrayBuffer (preserves bytes exactly)
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Detect content type from response header or magic bytes
  let contentType = response.headers.get('content-type');
  
  if (!contentType || contentType === 'application/octet-stream') {
    // Detect from magic bytes
    contentType = buffer[0] === 0xFF && buffer[1] === 0xD8 ? 'image/jpeg' :
                  buffer[0] === 0x89 && buffer[1] === 0x50 ? 'image/png' :
                  buffer[0] === 0x47 && buffer[1] === 0x49 ? 'image/gif' :
                  buffer[0] === 0x52 && buffer[1] === 0x49 ? 'image/webp' :
                  'image/jpeg';
  }

  console.log(`[IMAGE FETCH] Successfully fetched ${imagePath}: ${buffer.length} bytes, type: ${contentType}`);

  return { buffer, contentType };
}

export default {
  generateImageKey,
  generateCustomImageKey,
  uploadImage,
  getSignedImageUrl,
  deleteImage,
  fetchImageFromST,
};
