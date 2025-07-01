-- Add touchpoint outcome enum for better tracking
CREATE TYPE touchpoint_outcome AS ENUM (
  'replied', 
  'no_answer', 
  'voicemail', 
  'opted_out', 
  'bounced', 
  'booked', 
  'ignored'
);

-- Add outcome_enum column to touchpoints table
ALTER TABLE touchpoints 
  ADD COLUMN outcome_enum touchpoint_outcome;

-- Create outreach sequences table
CREATE TABLE outreach_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company company_type NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outreach steps table
CREATE TABLE outreach_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  type touchpoint_type NOT NULL,
  name TEXT,
  content_link TEXT,
  day_offset INTEGER NOT NULL, -- in business days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sequence_id, step_order)
);

-- Add outreach sequence reference to campaigns
ALTER TABLE campaigns 
  ADD COLUMN outreach_sequence_id UUID REFERENCES outreach_sequences(id);

-- Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_outreach_steps_sequence_id ON outreach_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_outreach_steps_order ON outreach_steps(sequence_id, step_order);
CREATE INDEX IF NOT EXISTS idx_touchpoints_scheduled_at ON touchpoints(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_touchpoints_outcome_enum ON touchpoints(outcome_enum);
CREATE INDEX IF NOT EXISTS idx_campaigns_outreach_sequence ON campaigns(outreach_sequence_id);

-- Insert sample 8-touch real estate sequence
INSERT INTO outreach_sequences (name, company, description) VALUES 
('8-Touch Real Estate Sequence', 'CraftyCode', '10-business-day sequence with 8 touchpoints for real estate leads');

-- Get the sequence ID for the sample sequence
DO $$
DECLARE
    seq_id UUID;
BEGIN
    SELECT id INTO seq_id FROM outreach_sequences WHERE name = '8-Touch Real Estate Sequence';
    
    -- Insert the 8 steps
    INSERT INTO outreach_steps (sequence_id, step_order, type, name, content_link, day_offset) VALUES
    (seq_id, 1, 'email', 'Quick question about your real estate goals', 'https://example.com/real-estate-intro-email', 0),
    (seq_id, 2, 'call', 'Follow-up call', 'https://example.com/follow-up-call-script', 1),
    (seq_id, 3, 'email', 'Thought you might find this interesting', 'https://example.com/value-add-email', 3),
    (seq_id, 4, 'linkedin_message', 'LinkedIn connection', 'https://example.com/linkedin-message-template', 5),
    (seq_id, 5, 'call', 'Second follow-up call', 'https://example.com/second-call-script', 6),
    (seq_id, 6, 'email', 'Last attempt - valuable resource', 'https://example.com/final-value-email', 8),
    (seq_id, 7, 'call', 'Final call attempt', 'https://example.com/final-call-script', 9),
    (seq_id, 8, 'email', 'Final touchpoint', 'https://example.com/graceful-exit-email', 10);
END $$; 