-- Remove meeting and note types from touchpoint_type enum
-- First, update any existing data that uses these types
UPDATE touchpoints SET type = 'email' WHERE type IN ('meeting', 'note');

-- Create a new enum without the unwanted types
CREATE TYPE touchpoint_type_new AS ENUM ('email', 'call', 'linkedin_message');

-- Update the touchpoints table to use the new enum
ALTER TABLE touchpoints ALTER COLUMN type TYPE touchpoint_type_new USING type::text::touchpoint_type_new;

-- Update the outreach_steps table to use the new enum
ALTER TABLE outreach_steps ALTER COLUMN type TYPE touchpoint_type_new USING type::text::touchpoint_type_new;

-- Drop the old enum and rename the new one
DROP TYPE touchpoint_type;
ALTER TYPE touchpoint_type_new RENAME TO touchpoint_type;

-- Update district status check constraint to match lead statuses
-- First, update existing district data to use new status values
UPDATE district_leads SET status = 'actively_contacting' WHERE status = 'contacted';
UPDATE district_leads SET status = 'not_interested' WHERE status = 'lost';

-- Drop the old check constraint
ALTER TABLE district_leads DROP CONSTRAINT IF EXISTS district_leads_status_check;

-- Add new check constraint with updated status values
ALTER TABLE district_leads ADD CONSTRAINT district_leads_status_check 
CHECK (status IN ('not_contacted', 'actively_contacting', 'engaged', 'won', 'not_interested'));

-- Remove the meeting_note_types table that was causing conflicts
DROP TABLE IF EXISTS meeting_note_types CASCADE;

-- Update district_contacts table to allow null values for email and phone
ALTER TABLE district_contacts 
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL; 