-- Add image columns to existing CRM edit tables

ALTER TABLE crm.pricebook_service_edits 
ADD COLUMN IF NOT EXISTS custom_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE crm.pricebook_material_edits 
ADD COLUMN IF NOT EXISTS custom_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE crm.pricebook_equipment_edits 
ADD COLUMN IF NOT EXISTS custom_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE crm.pricebook_category_edits 
ADD COLUMN IF NOT EXISTS custom_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_deleted BOOLEAN DEFAULT FALSE;
