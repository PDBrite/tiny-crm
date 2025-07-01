-- Full schema migration without any seed data
-- This migration combines all schema changes from previous migrations

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create company_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_type') THEN
    CREATE TYPE company_type AS ENUM ('CraftyCode', 'Avalern');
  END IF;
END$$;

-- Create touchpoint_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'touchpoint_type') THEN
    CREATE TYPE touchpoint_type AS ENUM ('email', 'call', 'linkedin_message');
  END IF;
END$$;

-- Create touchpoint_outcome enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'touchpoint_outcome') THEN
    CREATE TYPE touchpoint_outcome AS ENUM (
      'replied', 
      'no_answer', 
      'voicemail', 
      'opted_out', 
      'bounced', 
      'booked', 
      'ignored'
    );
  END IF;
END$$;

-- Create lead_status_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status_type') THEN
    CREATE TYPE lead_status_type AS ENUM (
      'not_contacted',
      'actively_contacting',
      'engaged',
      'won',
      'not_interested'
    );
  END IF;
END$$;

-- Create campaign_status_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status_type') THEN
    CREATE TYPE campaign_status_type AS ENUM ('active', 'completed', 'draft', 'paused');
  END IF;
END$$;

-- Create app_users table
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_company_access table
CREATE TABLE IF NOT EXISTS user_company_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  company company_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company)
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company company_type NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  outreach_sequence_id UUID,
  instantly_campaign_id VARCHAR(255),
  status campaign_status_type DEFAULT 'draft'
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  city VARCHAR(100),
  state VARCHAR(50),
  company VARCHAR(255),
  linkedin_url VARCHAR(255),
  website_url VARCHAR(255),
  online_profile TEXT,
  source VARCHAR(100),
  status lead_status_type DEFAULT 'not_contacted',
  notes TEXT,
  campaign_id UUID REFERENCES campaigns(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted_at TIMESTAMP WITH TIME ZONE
);

-- Create district_leads table
CREATE TABLE IF NOT EXISTS district_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_name VARCHAR(255) NOT NULL,
  county VARCHAR(100) NOT NULL,
  company company_type NOT NULL,
  status lead_status_type DEFAULT 'not_contacted',
  notes TEXT,
  campaign_id UUID REFERENCES campaigns(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(district_name, county)
);

-- Create district_contacts table
CREATE TABLE IF NOT EXISTS district_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_lead_id UUID REFERENCES district_leads(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  linkedin_url VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Valid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  state VARCHAR(50) DEFAULT 'California'
);

-- Create outreach_sequences table
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company company_type NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outreach_steps table
CREATE TABLE IF NOT EXISTS outreach_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  type touchpoint_type NOT NULL,
  name TEXT,
  content_link TEXT,
  day_offset INTEGER NOT NULL, -- in business days
  days_after_previous INTEGER, -- in business days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sequence_id, step_order)
);

-- Create touchpoints table
CREATE TABLE IF NOT EXISTS touchpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  district_contact_id UUID REFERENCES district_contacts(id) ON DELETE SET NULL,
  type touchpoint_type NOT NULL,
  subject TEXT,
  content TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  outcome TEXT,
  outcome_enum touchpoint_outcome,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for outreach_sequence_id in campaigns
ALTER TABLE campaigns 
  ADD CONSTRAINT fk_campaigns_outreach_sequence 
  FOREIGN KEY (outreach_sequence_id) 
  REFERENCES outreach_sequences(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_district_leads_campaign_id ON district_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_district_leads_status ON district_leads(status);
CREATE INDEX IF NOT EXISTS idx_district_contacts_district_lead_id ON district_contacts(district_lead_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_lead_id ON touchpoints(lead_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_district_contact_id ON touchpoints(district_contact_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_scheduled_at ON touchpoints(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_touchpoints_outcome_enum ON touchpoints(outcome_enum);
CREATE INDEX IF NOT EXISTS idx_campaigns_outreach_sequence ON campaigns(outreach_sequence_id);
CREATE INDEX IF NOT EXISTS idx_outreach_steps_sequence_id ON outreach_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_outreach_steps_order ON outreach_steps(sequence_id, step_order);

-- Create RLS policies for secure member access
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_steps ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (can see all companies)
CREATE POLICY admin_campaigns_policy ON campaigns 
  FOR ALL TO authenticated 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

CREATE POLICY admin_leads_policy ON leads 
  FOR ALL TO authenticated 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

CREATE POLICY admin_touchpoints_policy ON touchpoints 
  FOR ALL TO authenticated 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

CREATE POLICY admin_district_leads_policy ON district_leads 
  FOR ALL TO authenticated 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

CREATE POLICY admin_district_contacts_policy ON district_contacts 
  FOR ALL TO authenticated 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

CREATE POLICY admin_outreach_sequences_policy ON outreach_sequences 
  FOR ALL TO authenticated 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

CREATE POLICY admin_outreach_steps_policy ON outreach_steps 
  FOR ALL TO authenticated 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- Create policies for member access (can only see specific company data)
CREATE POLICY member_campaigns_policy ON campaigns 
  FOR ALL TO authenticated 
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'member' AND 
      (raw_user_meta_data->>'allowedCompanies')::jsonb ? lower(company::text)
    )
  );

CREATE POLICY member_leads_policy ON leads 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c 
      WHERE c.id = leads.campaign_id AND
      auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'member' AND 
        (raw_user_meta_data->>'allowedCompanies')::jsonb ? lower(c.company::text)
      )
    )
  );

CREATE POLICY member_touchpoints_policy ON touchpoints 
  FOR ALL TO authenticated 
  USING (
    (lead_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM leads l JOIN campaigns c ON l.campaign_id = c.id
      WHERE l.id = touchpoints.lead_id AND
      auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'member' AND 
        (raw_user_meta_data->>'allowedCompanies')::jsonb ? lower(c.company::text)
      )
    )) OR
    (district_contact_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM district_contacts dc JOIN district_leads dl ON dc.district_lead_id = dl.id
      WHERE dc.id = touchpoints.district_contact_id AND
      auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'member' AND 
        (raw_user_meta_data->>'allowedCompanies')::jsonb ? lower(dl.company::text)
      )
    ))
  );

CREATE POLICY member_district_leads_policy ON district_leads 
  FOR ALL TO authenticated 
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'member' AND 
      (raw_user_meta_data->>'allowedCompanies')::jsonb ? lower(company::text)
    )
  );

CREATE POLICY member_district_contacts_policy ON district_contacts 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM district_leads dl
      WHERE dl.id = district_contacts.district_lead_id AND
      auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'member' AND 
        (raw_user_meta_data->>'allowedCompanies')::jsonb ? lower(dl.company::text)
      )
    )
  );

CREATE POLICY member_outreach_sequences_policy ON outreach_sequences 
  FOR ALL TO authenticated 
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'member' AND 
      (raw_user_meta_data->>'allowedCompanies')::jsonb ? lower(company::text)
    )
  );

CREATE POLICY member_outreach_steps_policy ON outreach_steps 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM outreach_sequences os
      WHERE os.id = outreach_steps.sequence_id AND
      auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'member' AND 
        (raw_user_meta_data->>'allowedCompanies')::jsonb ? lower(os.company::text)
      )
    )
  ); 