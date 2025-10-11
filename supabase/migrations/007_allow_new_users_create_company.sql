-- Allow new users to create companies
-- This policy lets authenticated users who don't have a profile yet to create a company

-- Drop the restrictive admin-only policy
DROP POLICY IF EXISTS "Admins can manage companies" ON companies;

-- Recreate with two conditions:
-- 1. Existing admins can manage companies
-- 2. New users (not in users table) can INSERT companies
CREATE POLICY "Admins and new users can manage companies"
  ON companies FOR ALL
  USING (
    -- Allow if user is an admin
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
    OR
    -- Allow if user is authenticated but NOT in users table (new user)
    (
      auth.uid() IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Same conditions for INSERT/UPDATE
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
    OR
    (
      auth.uid() IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid()
      )
    )
  );

-- Also need to allow new users to INSERT into users table
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

CREATE POLICY "Users can manage their own profile"
  ON users FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
