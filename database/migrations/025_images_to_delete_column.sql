-- Add images_to_delete column for tracking ST images to remove on push
-- Stores JSON array of ST image URLs/paths to exclude when pushing

-- Add to pricebook_overrides table
ALTER TABLE crm.pricebook_overrides
ADD COLUMN IF NOT EXISTS images_to_delete JSONB;

-- Add comment
COMMENT ON COLUMN crm.pricebook_overrides.images_to_delete IS 'JSON array of ST image URLs/paths to remove on next push';
