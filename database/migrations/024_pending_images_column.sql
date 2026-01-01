-- Add pending_images column for multi-image support
-- Stores JSON array of image URLs to be uploaded on push

-- Add to new materials table
ALTER TABLE crm.pricebook_new_materials
ADD COLUMN IF NOT EXISTS pending_images JSONB;

-- Add comment
COMMENT ON COLUMN crm.pricebook_new_materials.pending_images IS 'JSON array of image URLs pending upload to ServiceTitan';
