-- Fix infinite recursion in RLS policies
-- Problem: Policy checks users table, which triggers RLS check, which checks users table again = infinite loop

-- Solution: Use a simpler approach - allow any authenticated user to create companies
-- Then restrict to admins ONLY for UPDATE/DELETE

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins and new users can manage companies" ON companies;
DROP POLICY IF EXISTS "Users can manage their own profile" ON users;

-- Companies: Allow INSERT for any authenticated user, but only admins can UPDATE/DELETE
CREATE POLICY "Any authenticated user can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update/delete companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can delete companies"
  ON companies FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- Users: Allow users to INSERT and UPDATE their own profile
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Note: Keep the existing SELECT policies
-- "Users can view their own profile" - already exists
-- "Users can view colleagues in same company" - already exists
