/**
 * S3 Image Storage Service
 * Handles image upload, download, and migration to AWS S3
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'lazi-pricebook-images';

export function generateImageKey(tenantId, entityType, originalFilename) {
  const uuid = crypto.randomUUID();
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  return `${tenantId}/${entityType}/${uuid}.${ext}`;
}

export async function uploadImage(key, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000',
  });
  
  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function deleteImage(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  await s3Client.send(command);
  return true;
}

export default {
  generateImageKey,
  uploadImage,
  deleteImage,
};
