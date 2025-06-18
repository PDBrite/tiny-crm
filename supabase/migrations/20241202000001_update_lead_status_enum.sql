-- Update lead status enum to match new 5-status system
-- Add the new status values to the enum
ALTER TYPE lead_status_type ADD VALUE IF NOT EXISTS 'actively_contacting';
ALTER TYPE lead_status_type ADD VALUE IF NOT EXISTS 'engaged';
ALTER TYPE lead_status_type ADD VALUE IF NOT EXISTS 'not_interested'; 