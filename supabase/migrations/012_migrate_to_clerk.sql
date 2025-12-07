-- Migration to support Clerk authentication
-- This changes user IDs from UUID to TEXT to support Clerk's string-based IDs

-- Step 1: Drop foreign key constraint to auth.users (no longer using Supabase Auth)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 2: Backup existing UUID IDs
ALTER TABLE users ADD COLUMN IF NOT EXISTS legacy_auth_id UUID;
UPDATE users SET legacy_auth_id = id::uuid WHERE legacy_auth_id IS NULL AND id IS NOT NULL;

-- Step 3: Change users.id from UUID to TEXT
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Step 4: Change foreign key references in other tables
ALTER TABLE activities ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE time_entries ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 5: Disable Row Level Security (auth now handled by backend middleware with Clerk)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Step 6: Drop all RLS policies (no longer needed)
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own activities" ON activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON activities;
DROP POLICY IF EXISTS "Users can update own activities" ON activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON activities;
DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can insert own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can delete own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can view own company" ON companies;
DROP POLICY IF EXISTS "Admins can update company" ON companies;

-- Step 7: Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
