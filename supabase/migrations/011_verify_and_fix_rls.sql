-- Verify and fix RLS policies
-- First, let's see what policies currently exist

-- Show all current policies on companies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'companies';

-- Show all current policies on users
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';

-- Now let's ensure RLS is enabled
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop ALL policies and recreate from scratch
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'companies')
    LOOP
        EXECUTE 'DROP POLICY "' || r.policyname || '" ON companies';
    END LOOP;

    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users')
    LOOP
        EXECUTE 'DROP POLICY "' || r.policyname || '" ON users';
    END LOOP;
END $$;

-- ====================
-- USERS TABLE POLICIES
-- ====================
-- CRITICAL: Never query users table within users table policies (causes recursion)

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ====================
-- COMPANIES TABLE POLICIES
-- ====================

-- Allow viewing companies where user is a member
CREATE POLICY "companies_select_member"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- CRITICAL: Allow ANY authenticated user to create companies (for new signups)
CREATE POLICY "companies_insert_authenticated"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can update
CREATE POLICY "companies_update_admin"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Only admins can delete
CREATE POLICY "companies_delete_admin"
  ON companies FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );
