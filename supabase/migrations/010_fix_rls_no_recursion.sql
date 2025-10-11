-- Complete fix for RLS infinite recursion
-- The key: NEVER query the same table within its own RLS policy

-- Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'companies')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON companies';
    END LOOP;
END $$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users';
    END LOOP;
END $$;

-- ====================
-- USERS TABLE POLICIES
-- ====================
-- These MUST NOT reference the users table to avoid recursion

-- Allow authenticated users to read their own profile using auth.uid() ONLY
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow authenticated users to insert their own profile using auth.uid() ONLY
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow authenticated users to update their own profile using auth.uid() ONLY
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ====================
-- COMPANIES TABLE POLICIES
-- ====================
-- These CAN reference users table (companies don't self-reference)

-- Allow authenticated users to view companies (we'll check in app which company they belong to)
-- This is safe because we're not creating recursion
CREATE POLICY "Users can view companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Allow ANY authenticated user to create companies (for new signups)
CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only company admins can update their company
CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Only company admins can delete their company
CREATE POLICY "Admins can delete companies"
  ON companies FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );
