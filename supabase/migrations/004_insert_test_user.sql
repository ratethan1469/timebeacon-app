-- Insert test user profile
-- User already created in Supabase Auth with UUID: 1c3f32b0-c2de-43fb-a07b-063d8e0c5f64

-- First ensure the test company exists
INSERT INTO companies (id, name, customers, projects, created_at, updated_at)
VALUES (
  'test-company-123',
  'Test Company LLC',
  ARRAY['Acme Corp', 'TechStart Inc', 'Global Systems'],
  ARRAY['Implementation', 'Support', 'Training', 'Consulting'],
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  customers = EXCLUDED.customers,
  projects = EXCLUDED.projects,
  updated_at = NOW();

-- Insert user profile with company_id
INSERT INTO users (id, email, full_name, role, company_id, created_at, updated_at)
VALUES (
  '1c3f32b0-c2de-43fb-a07b-063d8e0c5f64',
  'test@timebeacon.io',
  'Test User',
  'CSM',
  'test-company-123',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  updated_at = NOW();

-- Verify the user was created
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.company_id,
  c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = '1c3f32b0-c2de-43fb-a07b-063d8e0c5f64';
