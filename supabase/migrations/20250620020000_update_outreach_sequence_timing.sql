-- Update outreach sequence steps to support "days after previous step" timing
-- This migration adds a new column to track the days between steps instead of only days from start

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