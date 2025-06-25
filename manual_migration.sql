-- Add unique constraint on district_name + county + company combination
ALTER TABLE district_leads
ADD CONSTRAINT district_leads_name_county_company_unique 
UNIQUE (district_name, county, company);

-- Add state field to district_contacts
ALTER TABLE district_contacts
ADD COLUMN state TEXT;

-- Add comment for documentation
COMMENT ON COLUMN district_contacts.state IS 'State/province of the contact'; 