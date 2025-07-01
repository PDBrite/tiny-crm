-- Make lead_id nullable in touchpoints table to support district contact touchpoints
-- This is required because district contact touchpoints use district_contact_id instead of lead_id

ALTER TABLE touchpoints ALTER COLUMN lead_id DROP NOT NULL;

-- Update the constraint to ensure touchpoints are linked to either leads or district_contacts, but not both
-- The constraint was already added in 20241202000004_create_district_system.sql but we need to ensure it works
-- with the nullable lead_id column

-- Verify the constraint exists and is working properly
-- The constraint should be: 
-- CHECK ((lead_id IS NOT NULL AND district_contact_id IS NULL) OR (lead_id IS NULL AND district_contact_id IS NOT NULL))

-- Add a comment for clarity
COMMENT ON COLUMN touchpoints.lead_id IS 'Links touchpoints to leads (CraftyCode). Null for district contact touchpoints (Avalern).';
COMMENT ON COLUMN touchpoints.district_contact_id IS 'Links touchpoints to district contacts (Avalern). Null for lead touchpoints (CraftyCode).'; 