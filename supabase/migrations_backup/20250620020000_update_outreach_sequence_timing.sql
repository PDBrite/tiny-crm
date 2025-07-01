-- Update outreach sequence steps to support "days after previous step" timing
-- This migration adds a new column to track the days between steps instead of only days from start

-- First ensure the outreach_steps table exists
DO $$
BEGIN
  -- Check if outreach_steps table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'outreach_steps'
  ) THEN
    -- Create outreach_sequences table if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'outreach_sequences'
    ) THEN
      CREATE TABLE outreach_sequences (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL, -- Using VARCHAR instead of company_type enum in case it doesn't exist
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    END IF;
    
    -- Create outreach_steps table
    CREATE TABLE outreach_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL, -- Using VARCHAR instead of touchpoint_type enum in case it doesn't exist
      name TEXT,
      content_link TEXT,
      day_offset INTEGER NOT NULL, -- in business days
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(sequence_id, step_order)
    );
    
    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_outreach_steps_sequence_id ON outreach_steps(sequence_id);
    CREATE INDEX IF NOT EXISTS idx_outreach_steps_order ON outreach_steps(sequence_id, step_order);
  END IF;
END $$;

-- Add days_after_previous column to outreach_steps
DO $$
BEGIN
  -- Check if column already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'outreach_steps' AND column_name = 'days_after_previous'
  ) THEN
    ALTER TABLE outreach_steps ADD COLUMN days_after_previous INTEGER;
    
    -- Populate days_after_previous based on existing day_offset values
    -- Use a transaction to ensure data consistency
    BEGIN
      UPDATE outreach_steps os1
      SET days_after_previous = 
        CASE 
          WHEN os1.step_order = 1 THEN os1.day_offset -- First step uses day_offset as-is
          ELSE os1.day_offset - (
            SELECT os2.day_offset 
            FROM outreach_steps os2 
            WHERE os2.sequence_id = os1.sequence_id 
            AND os2.step_order = os1.step_order - 1
          )
        END;
      
      -- Handle any potential errors during the update
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating days_after_previous values: %', SQLERRM;
        -- Continue with migration even if data population fails
    END;
    
    -- Add comment for documentation
    COMMENT ON COLUMN outreach_steps.days_after_previous IS 'Number of business days after the previous step';
  END IF;
END $$; 