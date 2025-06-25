-- Add 'paused' to the campaign_status_type enum
ALTER TYPE campaign_status_type ADD VALUE 'paused';

-- Add unique constraint to district_name and county in district_leads
ALTER TABLE district_leads ADD CONSTRAINT district_leads_district_name_county_key UNIQUE (district_name, county);

-- Add state field to district_contacts with default value 'California'
ALTER TABLE district_contacts ADD COLUMN state VARCHAR(50) DEFAULT 'California'; 