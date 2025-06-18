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

-- Insert sample outreach sequences
INSERT INTO outreach_sequences (name, company, description) VALUES 
('CraftyCode Real Estate Sequence', 'CraftyCode', '8-touch sequence with 8 touchpoints for real estate leads'),
('Avalern School District Sequence', 'Avalern', '8-touch sequence for school district contacts focused on educational technology');

-- Insert outreach steps for CraftyCode Real Estate Sequence
INSERT INTO outreach_steps (sequence_id, step_order, type, name, content_link, day_offset) VALUES
((SELECT id FROM outreach_sequences WHERE name = 'CraftyCode Real Estate Sequence' AND company = 'CraftyCode'), 1, 'email', 'Initial Introduction Email', 'Hi {{first_name}}, I noticed your real estate business in {{city}} and wanted to reach out about our web development services...', 0),
((SELECT id FROM outreach_sequences WHERE name = 'CraftyCode Real Estate Sequence' AND company = 'CraftyCode'), 2, 'linkedin_message', 'LinkedIn Connection Request', 'Hi {{first_name}}, I came across {{company}} and was impressed by your market presence. Would love to connect!', 2),
((SELECT id FROM outreach_sequences WHERE name = 'CraftyCode Real Estate Sequence' AND company = 'CraftyCode'), 3, 'email', 'Follow-up Email with Portfolio', 'Hi {{first_name}}, Following up on my previous email about web development for {{company}}. Here are some examples...', 4),
((SELECT id FROM outreach_sequences WHERE name = 'CraftyCode Real Estate Sequence' AND company = 'CraftyCode'), 4, 'call', 'Discovery Call', 'Calling to discuss {{company}} website needs and current challenges', 6),
((SELECT id FROM outreach_sequences WHERE name = 'CraftyCode Real Estate Sequence' AND company = 'CraftyCode'), 5, 'email', 'Case Study Email', 'Hi {{first_name}}, Thought you might find this case study relevant for {{company}}...', 8),
((SELECT id FROM outreach_sequences WHERE name = 'CraftyCode Real Estate Sequence' AND company = 'CraftyCode'), 6, 'linkedin_message', 'LinkedIn Follow-up', 'Hi {{first_name}}, Hope you had a chance to review our portfolio. Any questions about how we can help {{company}}?', 10),
((SELECT id FROM outreach_sequences WHERE name = 'CraftyCode Real Estate Sequence' AND company = 'CraftyCode'), 7, 'call', 'Follow-up Call', 'Following up on previous communications with {{company}}', 12),
((SELECT id FROM outreach_sequences WHERE name = 'CraftyCode Real Estate Sequence' AND company = 'CraftyCode'), 8, 'email', 'Final Follow-up', 'Hi {{first_name}}, This is my final follow-up regarding web development services for {{company}}...', 14);

-- Insert outreach steps for Avalern School District Sequence  
INSERT INTO outreach_steps (sequence_id, step_order, type, name, content_link, day_offset) VALUES
((SELECT id FROM outreach_sequences WHERE name = 'Avalern School District Sequence' AND company = 'Avalern'), 1, 'email', 'Introduction to Educational Technology', 'Hi {{first_name}}, I hope this email finds you well. I wanted to reach out regarding innovative educational technology solutions...', 0),
((SELECT id FROM outreach_sequences WHERE name = 'Avalern School District Sequence' AND company = 'Avalern'), 2, 'call', 'Discovery Call', 'Calling to discuss current educational technology needs and challenges', 3),
((SELECT id FROM outreach_sequences WHERE name = 'Avalern School District Sequence' AND company = 'Avalern'), 3, 'email', 'Educational Impact Case Study', 'Hi {{first_name}}, Following up on our conversation. Here is a case study showing 25% improvement in student engagement...', 5),
((SELECT id FROM outreach_sequences WHERE name = 'Avalern School District Sequence' AND company = 'Avalern'), 4, 'email', 'Product Demo Invitation', 'Hi {{first_name}}, Would you be interested in a 30-minute demo of our educational platform?', 8),
((SELECT id FROM outreach_sequences WHERE name = 'Avalern School District Sequence' AND company = 'Avalern'), 5, 'call', 'Demo Follow-up Call', 'Following up on demo invitation and answering any questions', 10),
((SELECT id FROM outreach_sequences WHERE name = 'Avalern School District Sequence' AND company = 'Avalern'), 6, 'email', 'Implementation Timeline', 'Hi {{first_name}}, Based on our discussions, here is a proposed implementation timeline...', 12),
((SELECT id FROM outreach_sequences WHERE name = 'Avalern School District Sequence' AND company = 'Avalern'), 7, 'call', 'Decision Call', 'Calling to discuss next steps and address any final concerns', 15),
((SELECT id FROM outreach_sequences WHERE name = 'Avalern School District Sequence' AND company = 'Avalern'), 8, 'email', 'Final Proposal', 'Hi {{first_name}}, Thank you for your time. Please find our final proposal attached...', 17);

-- Insert sample district leads for Avalern
INSERT INTO district_leads (district_name, county, company, status, notes) VALUES
('Los Angeles Unified School District', 'Los Angeles', 'Avalern', 'not_contacted', 'Largest school district in California - high priority target'),
('San Diego Unified School District', 'San Diego', 'Avalern', 'not_contacted', 'Second largest district - strong technology budget'),
('Long Beach Unified School District', 'Los Angeles', 'Avalern', 'actively_contacting', 'Currently in initial outreach phase'),
('Fresno Unified School District', 'Fresno', 'Avalern', 'not_contacted', 'Central Valley district with growing enrollment'),
('Santa Ana Unified School District', 'Orange', 'Avalern', 'engaged', 'Showed strong interest in our platform'),
('San Francisco Unified School District', 'San Francisco', 'Avalern', 'not_contacted', 'High-tech focused district'),
('Oakland Unified School District', 'Alameda', 'Avalern', 'not_contacted', 'Urban district with diverse student population'),
('Sacramento City Unified School District', 'Sacramento', 'Avalern', 'not_contacted', 'State capital district'),
('Elk Grove Unified School District', 'Sacramento', 'Avalern', 'not_contacted', 'Fast-growing suburban district'),
('San Juan Unified School District', 'Sacramento', 'Avalern', 'not_contacted', 'Well-funded suburban district');

-- Insert sample district contacts
INSERT INTO district_contacts (district_lead_id, first_name, last_name, title, email, phone, status) VALUES
-- LAUSD contacts
((SELECT id FROM district_leads WHERE district_name = 'Los Angeles Unified School District'), 'Maria', 'Rodriguez', 'Chief Technology Officer', 'maria.rodriguez@lausd.net', '(213) 555-1001', 'Valid'),
((SELECT id FROM district_leads WHERE district_name = 'Los Angeles Unified School District'), 'James', 'Chen', 'Director of Digital Learning', 'james.chen@lausd.net', '(213) 555-1002', 'Valid'),
((SELECT id FROM district_leads WHERE district_name = 'Los Angeles Unified School District'), 'Sarah', 'Williams', 'Assistant Superintendent', 'sarah.williams@lausd.net', '(213) 555-1003', 'Valid'),

-- San Diego USD contacts  
((SELECT id FROM district_leads WHERE district_name = 'San Diego Unified School District'), 'Michael', 'Thompson', 'Technology Director', 'michael.thompson@sdusd.net', '(619) 555-2001', 'Valid'),
((SELECT id FROM district_leads WHERE district_name = 'San Diego Unified School District'), 'Lisa', 'Garcia', 'Curriculum Technology Specialist', 'lisa.garcia@sdusd.net', '(619) 555-2002', 'Valid'),

-- Long Beach USD contacts
((SELECT id FROM district_leads WHERE district_name = 'Long Beach Unified School District'), 'David', 'Johnson', 'Chief Information Officer', 'david.johnson@lbschools.net', '(562) 555-3001', 'Valid'),
((SELECT id FROM district_leads WHERE district_name = 'Long Beach Unified School District'), 'Jennifer', 'Martinez', 'Educational Technology Coordinator', 'jennifer.martinez@lbschools.net', '(562) 555-3002', 'Valid'),

-- Fresno USD contacts
((SELECT id FROM district_leads WHERE district_name = 'Fresno Unified School District'), 'Robert', 'Davis', 'Technology Services Director', 'robert.davis@fresnounified.org', '(559) 555-4001', 'Valid'),
((SELECT id FROM district_leads WHERE district_name = 'Fresno Unified School District'), 'Amanda', 'Wilson', 'Digital Learning Manager', 'amanda.wilson@fresnounified.org', '(559) 555-4002', 'Valid'),

-- Santa Ana USD contacts
((SELECT id FROM district_leads WHERE district_name = 'Santa Ana Unified School District'), 'Carlos', 'Lopez', 'Director of Technology', 'carlos.lopez@sausd.us', '(714) 555-5001', 'Valid'),
((SELECT id FROM district_leads WHERE district_name = 'Santa Ana Unified School District'), 'Michelle', 'Brown', 'Instructional Technology Specialist', 'michelle.brown@sausd.us', '(714) 555-5002', 'Valid'),

-- SFUSD contacts
((SELECT id FROM district_leads WHERE district_name = 'San Francisco Unified School District'), 'Kevin', 'Lee', 'Chief Technology Officer', 'kevin.lee@sfusd.edu', '(415) 555-6001', 'Valid'),
((SELECT id FROM district_leads WHERE district_name = 'San Francisco Unified School District'), 'Rachel', 'Taylor', 'Digital Equity Manager', 'rachel.taylor@sfusd.edu', '(415) 555-6002', 'Valid'),

-- Oakland USD contacts
((SELECT id FROM district_leads WHERE district_name = 'Oakland Unified School District'), 'Anthony', 'Jackson', 'Technology Director', 'anthony.jackson@ousd.org', '(510) 555-7001', 'Valid'),
((SELECT id FROM district_leads WHERE district_name = 'Oakland Unified School District'), 'Nicole', 'Anderson', 'Educational Technology Coach', 'nicole.anderson@ousd.org', '(510) 555-7002', 'Valid'),

-- Sacramento City USD contacts
((SELECT id FROM district_leads WHERE district_name = 'Sacramento City Unified School District'), 'Brian', 'White', 'Information Technology Director', 'brian.white@scusd.edu', '(916) 555-8001', 'Valid'),
((SELECT id FROM district_leads WHERE district_name = 'Sacramento City Unified School District'), 'Stephanie', 'Miller', 'Digital Learning Coordinator', 'stephanie.miller@scusd.edu', '(916) 555-8002', 'Valid'),

-- Elk Grove USD contacts
((SELECT id FROM district_leads WHERE district_name = 'Elk Grove Unified School District'), 'Christopher', 'Moore', 'Chief Technology Officer', 'christopher.moore@egusd.net', '(916) 555-9001', 'Valid'),
((SELECT id FROM district_leads WHERE district_name = 'Elk Grove Unified School District'), 'Jessica', 'Thomas', 'Technology Integration Specialist', 'jessica.thomas@egusd.net', '(916) 555-9002', 'Valid'),

-- San Juan USD contacts
((SELECT id FROM district_leads WHERE district_name = 'San Juan Unified School District'), 'Matthew', 'Clark', 'Director of Technology Services', 'matthew.clark@sanjuan.edu', '(916) 555-1101', 'Valid'),
((SELECT id FROM district_leads WHERE district_name = 'San Juan Unified School District'), 'Lauren', 'Lewis', 'Instructional Technology Director', 'lauren.lewis@sanjuan.edu', '(916) 555-1102', 'Valid');

-- Insert Avalern campaign
INSERT INTO campaigns (name, company, description, start_date, end_date, outreach_sequence_id, status) VALUES
('California School Districts Q1 2025', 'Avalern', 'Educational technology outreach to major California school districts', '2024-12-01', '2025-03-31', (SELECT id FROM outreach_sequences WHERE name = 'Avalern School District Sequence' AND company = 'Avalern'), 'active');

-- Update district leads to link them to the Avalern campaign
UPDATE district_leads 
SET campaign_id = (SELECT id FROM campaigns WHERE name = 'California School Districts Q1 2025' AND company = 'Avalern')
WHERE company = 'Avalern';

-- Insert sample touchpoints for district contacts
INSERT INTO touchpoints (
  district_contact_id,
  type,
  subject,
  content,
  completed_at,
  outcome
) VALUES
-- Touchpoints for Maria Rodriguez (LAUSD CTO)
(
  (SELECT id FROM district_contacts WHERE email = 'maria.rodriguez@lausd.net'),
  'email',
  'Educational Technology Solutions for LAUSD',
  'Hi Maria, I hope this email finds you well. I wanted to reach out regarding innovative educational technology solutions that could benefit LAUSD students...',
  NOW() - INTERVAL '3 days',
  'Email delivered, tracking engagement'
),
-- Touchpoints for David Johnson (Long Beach CIO)
(
  (SELECT id FROM district_contacts WHERE email = 'david.johnson@lbschools.net'),
  'email',
  'Digital Learning Platform Demo Invitation',
  'Hi David, I noticed Long Beach USD focus on technology integration. Would you be interested in a 30-minute demo of our educational platform?',
  NOW() - INTERVAL '5 days',
  'Email opened, awaiting response'
),
(
  (SELECT id FROM district_contacts WHERE email = 'david.johnson@lbschools.net'),
  'call',
  'Follow-up call regarding demo',
  'Called to follow up on demo invitation and discuss current technology initiatives',
  NOW() - INTERVAL '1 day',
  'Left voicemail with callback request'
),
-- Touchpoints for Carlos Lopez (Santa Ana USD)
(
  (SELECT id FROM district_contacts WHERE email = 'carlos.lopez@sausd.us'),
  'email',
  'Educational Technology Case Study',
  'Hi Carlos, Following up on our conversation. Here is a case study showing 25% improvement in student engagement...',
  NOW() - INTERVAL '7 days',
  'Email opened and replied positively'
),
(
  (SELECT id FROM district_contacts WHERE email = 'carlos.lopez@sausd.us'),
  'call',
  'Discovery call about district needs',
  'Had a productive discussion about Santa Ana USD technology goals and budget planning',
  NOW() - INTERVAL '2 days',
  'Interested in proposal, scheduling follow-up'
); 