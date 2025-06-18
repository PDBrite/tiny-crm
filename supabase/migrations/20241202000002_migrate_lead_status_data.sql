-- Update existing lead data to use new status values
-- This runs after the enum values have been added in the previous migration

UPDATE leads SET status = 'actively_contacting' WHERE status IN ('emailed', 'called');
UPDATE leads SET status = 'engaged' WHERE status IN ('warm', 'booked');
UPDATE leads SET status = 'not_interested' WHERE status = 'lost';

-- Note: 'won' and 'not_contacted' already exist and don't need updating

-- The application will now use the new 5-status system:
-- - not_contacted (default for new leads)
-- - actively_contacting (when assigned to campaigns with touchpoints)
-- - engaged (responded/showed interest)
-- - won (became customer/agreed to pilot)
-- - not_interested (said no/ghosted/not fit) 