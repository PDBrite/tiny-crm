-- Insert sample leads for testing
INSERT INTO leads (
  first_name, 
  last_name, 
  email, 
  phone, 
  city, 
  state, 
  company, 
  linkedin_url, 
  website_url, 
  source, 
  status, 
  campaign_id,
  notes
) VALUES 
-- CraftyCode campaign leads
(
  'John', 
  'Smith', 
  'john.smith@realestate.com', 
  '(818) 555-0101', 
  'Burbank', 
  'CA', 
  'Smith Real Estate Group', 
  'https://linkedin.com/in/johnsmith', 
  'https://smithrealestate.com', 
  'Zillow', 
  'emailed', 
  (SELECT id FROM campaigns WHERE name = 'San Fernando Valley Real Estate Q4 2024'),
  'Interested in web development services'
),
(
  'Sarah', 
  'Johnson', 
  'sarah.j@propertyexperts.com', 
  '(818) 555-0102', 
  'Glendale', 
  'CA', 
  'Property Experts LLC', 
  'https://linkedin.com/in/sarahjohnson', 
  'https://propertyexperts.com', 
  'LinkedIn', 
  'called', 
  (SELECT id FROM campaigns WHERE name = 'San Fernando Valley Real Estate Q4 2024'),
  'Had a great conversation, following up next week'
),
(
  'Mike', 
  'Davis', 
  'mike@valleyhomes.net', 
  '(818) 555-0103', 
  'Sherman Oaks', 
  'CA', 
  'Valley Homes Realty', 
  'https://linkedin.com/in/mikedavis', 
  'https://valleyhomes.net', 
  'Realtor.com', 
  'won', 
  (SELECT id FROM campaigns WHERE name = 'San Fernando Valley Real Estate Q4 2024'),
  'Signed contract for website redesign - $5,000 project'
),
(
  'Lisa', 
  'Wilson', 
  'lisa.wilson@dreamhomes.com', 
  '(818) 555-0104', 
  'Studio City', 
  'CA', 
  'Dream Homes Realty', 
  'https://linkedin.com/in/lisawilson', 
  'https://dreamhomes.com', 
  'Zillow', 
  'warm', 
  (SELECT id FROM campaigns WHERE name = 'San Fernando Valley Real Estate Q4 2024'),
  'Responded to email, interested in learning more'
),
(
  'Robert', 
  'Brown', 
  'rob@brownproperties.com', 
  '(818) 555-0105', 
  'North Hollywood', 
  'CA', 
  'Brown Properties', 
  'https://linkedin.com/in/robertbrown', 
  'https://brownproperties.com', 
  'LinkedIn', 
  'not_contacted', 
  (SELECT id FROM campaigns WHERE name = 'San Fernando Valley Real Estate Q4 2024'),
  'New lead from LinkedIn scraping'
),
-- Avalern campaign leads
(
  'Jennifer', 
  'Garcia', 
  'jennifer@lapropertymanagement.com', 
  '(213) 555-0201', 
  'Los Angeles', 
  'CA', 
  'LA Property Management Co', 
  'https://linkedin.com/in/jennifergarcia', 
  'https://lapropertymanagement.com', 
  'LinkedIn', 
  'emailed', 
  (SELECT id FROM campaigns WHERE name = 'LA County Property Managers'),
  'Sent initial outreach email about property management software'
),
(
  'David', 
  'Martinez', 
  'david@westcoastpm.com', 
  '(213) 555-0202', 
  'Beverly Hills', 
  'CA', 
  'West Coast Property Management', 
  'https://linkedin.com/in/davidmartinez', 
  'https://westcoastpm.com', 
  'Other', 
  'booked', 
  (SELECT id FROM campaigns WHERE name = 'LA County Property Managers'),
  'Meeting scheduled for next Tuesday at 2 PM'
),
(
  'Amanda', 
  'Taylor', 
  'amanda@luxuryproperties.com', 
  '(310) 555-0203', 
  'Santa Monica', 
  'CA', 
  'Luxury Properties Inc', 
  'https://linkedin.com/in/amandataylor', 
  'https://luxuryproperties.com', 
  'LinkedIn', 
  'called', 
  (SELECT id FROM campaigns WHERE name = 'LA County Property Managers'),
  'Left voicemail, waiting for callback'
);

-- Insert sample touchpoints
INSERT INTO touchpoints (
  lead_id,
  type,
  subject,
  content,
  completed_at,
  outcome
) VALUES
-- Touchpoints for John Smith
(
  (SELECT id FROM leads WHERE email = 'john.smith@realestate.com'),
  'email',
  'Web Development Services for Real Estate Professionals',
  'Hi John, I noticed your real estate business and wanted to reach out about our web development services...',
  NOW() - INTERVAL '2 days',
  'Email opened, no response yet'
),
-- Touchpoints for Sarah Johnson
(
  (SELECT id FROM leads WHERE email = 'sarah.j@propertyexperts.com'),
  'email',
  'Custom Website Solutions for Property Experts',
  'Hi Sarah, I came across Property Experts LLC and was impressed by your market presence...',
  NOW() - INTERVAL '5 days',
  'Email opened and replied'
),
(
  (SELECT id FROM leads WHERE email = 'sarah.j@propertyexperts.com'),
  'call',
  'Follow-up call regarding website services',
  'Called to discuss their current website challenges and our solutions',
  NOW() - INTERVAL '1 day',
  'Great conversation, interested in proposal'
),
-- Touchpoints for Mike Davis (won deal)
(
  (SELECT id FROM leads WHERE email = 'mike@valleyhomes.net'),
  'email',
  'Website Redesign Proposal for Valley Homes',
  'Hi Mike, Thank you for your interest in our services. Attached is our proposal...',
  NOW() - INTERVAL '10 days',
  'Proposal sent'
),
(
  (SELECT id FROM leads WHERE email = 'mike@valleyhomes.net'),
  'call',
  'Proposal discussion and contract signing',
  'Discussed proposal details and finalized contract terms',
  NOW() - INTERVAL '3 days',
  'Contract signed - $5,000 project'
),
-- Touchpoints for Jennifer Garcia (Avalern)
(
  (SELECT id FROM leads WHERE email = 'jennifer@lapropertymanagement.com'),
  'email',
  'Property Management Software Solutions',
  'Hi Jennifer, I wanted to introduce you to our property management software solutions...',
  NOW() - INTERVAL '1 day',
  'Email delivered, tracking opens'
),
-- Touchpoints for David Martinez (Avalern)
(
  (SELECT id FROM leads WHERE email = 'david@westcoastpm.com'),
  'email',
  'Streamline Your Property Management Operations',
  'Hi David, I noticed West Coast Property Management and wanted to share how we help...',
  NOW() - INTERVAL '7 days',
  'Email opened and replied positively'
),
(
  (SELECT id FROM leads WHERE email = 'david@westcoastpm.com'),
  'call',
  'Discovery call and demo scheduling',
  'Had a great conversation about their current challenges and scheduled a demo',
  NOW() - INTERVAL '2 days',
  'Demo meeting scheduled for next Tuesday'
); 