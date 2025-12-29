-- Add S3 image columns to MASTER tables

-- Services
ALTER TABLE master.pricebook_services 
ADD COLUMN IF NOT EXISTS s3_image_url TEXT,
ADD COLUMN IF NOT EXISTS s3_image_key TEXT,
ADD COLUMN IF NOT EXISTS image_migrated_at TIMESTAMPTZ;

-- Materials
ALTER TABLE master.pricebook_materials 
ADD COLUMN IF NOT EXISTS s3_image_url TEXT,
ADD COLUMN IF NOT EXISTS s3_image_key TEXT,
ADD COLUMN IF NOT EXISTS image_migrated_at TIMESTAMPTZ;

-- Equipment
ALTER TABLE master.pricebook_equipment 
ADD COLUMN IF NOT EXISTS s3_image_url TEXT,
ADD COLUMN IF NOT EXISTS s3_image_key TEXT,
ADD COLUMN IF NOT EXISTS image_migrated_at TIMESTAMPTZ;

-- Categories
ALTER TABLE master.pricebook_categories 
ADD COLUMN IF NOT EXISTS s3_image_url TEXT,
ADD COLUMN IF NOT EXISTS s3_image_key TEXT,
ADD COLUMN IF NOT EXISTS image_migrated_at TIMESTAMPTZ;

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_services_s3_image ON master.pricebook_services(tenant_id) WHERE s3_image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_s3_image ON master.pricebook_materials(tenant_id) WHERE s3_image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_s3_image ON master.pricebook_equipment(tenant_id) WHERE s3_image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_s3_image ON master.pricebook_categories(tenant_id) WHERE s3_image_url IS NOT NULL;
