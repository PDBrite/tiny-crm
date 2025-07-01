-- First check if campaign_status_type enum exists and create it if needed
DO $$
BEGIN
  -- Check if enum type exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_type 
    WHERE typname = 'campaign_status_type'
  ) THEN
    -- Create the enum type
    CREATE TYPE campaign_status_type AS ENUM ('active', 'completed', 'draft');
  END IF;
  
  -- Check if 'paused' value already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'campaign_status_type' AND e.enumlabel = 'paused'
  ) THEN
    -- Add 'paused' to the enum
    ALTER TYPE campaign_status_type ADD VALUE 'paused';
  END IF;
END $$;

-- Check if district_leads table exists and add constraint if needed
DO $$
BEGIN
  -- Check if district_leads table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'district_leads'
  ) THEN
    -- Check if constraint already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'district_leads_district_name_county_key'
      AND table_name = 'district_leads'
    ) THEN
      -- Add unique constraint
      ALTER TABLE district_leads ADD CONSTRAINT district_leads_district_name_county_key UNIQUE (district_name, county);
    END IF;
  END IF;
END $$;

-- Check if district_contacts table exists and add state column if needed
DO $$
BEGIN
  -- Check if district_contacts table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'district_contacts'
  ) THEN
    -- Check if state column already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'district_contacts' AND column_name = 'state'
    ) THEN
      -- Add state column
      ALTER TABLE district_contacts ADD COLUMN state VARCHAR(50) DEFAULT 'California';
    END IF;
  END IF;
END $$; 