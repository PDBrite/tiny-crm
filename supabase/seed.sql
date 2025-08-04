-- Insert sample outreach sequence for Avalern
INSERT INTO outreach_sequences (name, company, description) VALUES 
('District Engagement Sequence', 'Avalern', 'Standard outreach sequence for school districts');

-- Insert outreach steps for Avalern District Engagement Sequence
INSERT INTO outreach_steps (sequence_id, step_order, type, name, content_link, day_offset) VALUES
((SELECT id FROM outreach_sequences WHERE name = 'District Engagement Sequence' AND company = 'Avalern'), 1, 'email', 'Introduction Email', 'https://example.com/templates/intro-email', 0),
((SELECT id FROM outreach_sequences WHERE name = 'District Engagement Sequence' AND company = 'Avalern'), 2, 'email', 'Follow-up Email', 'https://example.com/templates/followup-email', 3),
((SELECT id FROM outreach_sequences WHERE name = 'District Engagement Sequence' AND company = 'Avalern'), 3, 'call', 'Initial Call', 'https://example.com/templates/call-script', 5),
((SELECT id FROM outreach_sequences WHERE name = 'District Engagement Sequence' AND company = 'Avalern'), 4, 'email', 'Case Study Email', 'https://example.com/templates/case-study', 10); 