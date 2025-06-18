-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE company_type AS ENUM ('CraftyCode', 'Avalern');
CREATE TYPE lead_status_type AS ENUM (
  'not_contacted',
  'emailed', 
  'warm',
  'called',
  'booked',
  'won',
  'lost'
);
CREATE TYPE touchpoint_type AS ENUM (
  'email',
  'call',
  'meeting', 
  'linkedin_message',
  'note'
);
CREATE TYPE real_estate_source AS ENUM (
  'Zillow',
  'LinkedIn',
  'Realtor.com',
  'Redfin',
  'Trulia',
  'Other'
);

-- California cities enum for real estate prospects
CREATE TYPE california_city AS ENUM (
  'Burbank',
  'Glendale', 
  'Los Angeles',
  'Pasadena',
  'North Hollywood',
  'Van Nuys',
  'Sherman Oaks',
  'Studio City',
  'Hollywood',
  'West Hollywood',
  'Beverly Hills',
  'Santa Monica',
  'Culver City',
  'Westwood',
  'Brentwood',
  'Venice',
  'Manhattan Beach',
  'Redondo Beach',
  'Torrance',
  'El Segundo',
  'Inglewood',
  'Hawthorne',
  'Other'
);

-- Create campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company company_type NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  target_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  city california_city,
  state VARCHAR(10) DEFAULT 'CA',
  company VARCHAR(255),
  linkedin_url TEXT,
  website_url TEXT,
  online_profile TEXT,
  source real_estate_source DEFAULT 'Other',
  status lead_status_type DEFAULT 'not_contacted',
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create touchpoints table for tracking interactions
CREATE TABLE touchpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type touchpoint_type NOT NULL,
  subject VARCHAR(500),
  content TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  outcome VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) -- For multi-user scenarios
);

-- Create indexes for better performance
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_city ON leads(city);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_touchpoints_lead_id ON touchpoints(lead_id);
CREATE INDEX idx_touchpoints_type ON touchpoints(type);
CREATE INDEX idx_touchpoints_scheduled_at ON touchpoints(scheduled_at);
CREATE INDEX idx_campaigns_company ON campaigns(company);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at columns
CREATE TRIGGER update_leads_updated_at 
  BEFORE UPDATE ON leads 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at 
  BEFORE UPDATE ON campaigns 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample campaigns
INSERT INTO campaigns (name, company, description, start_date) VALUES
  ('San Fernando Valley Real Estate Q4 2024', 'CraftyCode', 'Outreach to real estate professionals in the San Fernando Valley', '2024-01-01'),
  ('LA County Property Managers', 'Avalern', 'Targeting property managers in LA County', '2024-01-01');

-- Create RLS policies (Row Level Security)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoints ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you can restrict this later with proper auth)
CREATE POLICY "Allow all operations on campaigns" ON campaigns FOR ALL USING (true);
CREATE POLICY "Allow all operations on leads" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all operations on touchpoints" ON touchpoints FOR ALL USING (true); 