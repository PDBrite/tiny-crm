-- Create district_leads table
CREATE TABLE district_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_name TEXT NOT NULL,
  county TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT 'Avalern',
  status TEXT NOT NULL DEFAULT 'not_contacted' CHECK (status IN ('not_contacted', 'contacted', 'engaged', 'won', 'lost')),
  campaign_id UUID REFERENCES campaigns(id),
  staff_directory_link TEXT,
  notes TEXT,
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted_at TIMESTAMP WITH TIME ZONE
);

-- Create district_contacts table
CREATE TABLE district_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_lead_id UUID NOT NULL REFERENCES district_leads(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Valid' CHECK (status IN ('Valid', 'Not Found', 'Null')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add district_contact_id to touchpoints table for district contact touchpoints
ALTER TABLE touchpoints ADD COLUMN district_contact_id UUID REFERENCES district_contacts(id);

-- Add indexes for better performance
CREATE INDEX idx_district_leads_company ON district_leads(company);
CREATE INDEX idx_district_leads_status ON district_leads(status);
CREATE INDEX idx_district_leads_campaign_id ON district_leads(campaign_id);
CREATE INDEX idx_district_contacts_district_lead_id ON district_contacts(district_lead_id);
CREATE INDEX idx_district_contacts_email ON district_contacts(email);
CREATE INDEX idx_touchpoints_district_contact_id ON touchpoints(district_contact_id);

-- Add company filter to existing leads table (if not already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'company') THEN
        ALTER TABLE leads ADD COLUMN company TEXT DEFAULT 'CraftyCode';
        CREATE INDEX idx_leads_company ON leads(company);
    END IF;
END $$;

-- Add company filter to campaigns table (if not already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'company') THEN
        ALTER TABLE campaigns ADD COLUMN company TEXT DEFAULT 'CraftyCode';
        CREATE INDEX idx_campaigns_company ON campaigns(company);
    END IF;
END $$;

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_district_leads_updated_at BEFORE UPDATE ON district_leads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_district_contacts_updated_at BEFORE UPDATE ON district_contacts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE district_leads IS 'School district leads for Avalern company';
COMMENT ON TABLE district_contacts IS 'Individual contacts within each school district';
COMMENT ON COLUMN touchpoints.district_contact_id IS 'Links touchpoints to district contacts for Avalern';
COMMENT ON COLUMN district_leads.status IS 'Overall engagement status for the entire district';
COMMENT ON COLUMN district_contacts.status IS 'Data validity status from CSV import (Valid, Not Found, Null)';

-- Add constraint to ensure touchpoints are linked to either leads or district_contacts, but not both
ALTER TABLE touchpoints ADD CONSTRAINT touchpoints_link_check 
CHECK (
  (lead_id IS NOT NULL AND district_contact_id IS NULL) OR 
  (lead_id IS NULL AND district_contact_id IS NOT NULL)
); 