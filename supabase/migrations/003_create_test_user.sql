-- Migration: Create Test User for Development
-- Description: Sets up a test user with company for local development and testing

-- First, create a test company
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

-- Note: You need to create the test user in Supabase Auth Dashboard first:
-- Email: test@timebeacon.io
-- Password: Test123!
-- This will generate a UUID for the user

-- After creating the user in Supabase Auth, run this to add user profile:
-- Replace 'USER_UUID_FROM_AUTH' with the actual UUID from auth.users table

-- Example (uncomment and replace with actual UUID):
/*
INSERT INTO users (id, email, full_name, role, company_id, created_at, updated_at)
VALUES (
  'USER_UUID_FROM_AUTH',  -- Replace with actual UUID from Supabase Auth
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
*/

-- To get the user UUID after creating in Auth:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Copy the UUID of test@timebeacon.io
-- 3. Run the INSERT statement above with that UUID

-- Alternative: Use Supabase CLI to create user:
-- supabase auth users create test@timebeacon.io --password Test123!
