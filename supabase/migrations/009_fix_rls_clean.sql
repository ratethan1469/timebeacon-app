-- Clean fix for RLS policies without recursion

-- First, list and drop ALL policies on companies table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'companies')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON companies';
    END LOOP;
END $$;

-- First, list and drop ALL policies on users table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users';
    END LOOP;
END $$;

-- Companies policies (simple, no recursion)
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Any authenticated user can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update companies"
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

-- Users policies (simple, no recursion)
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can view colleagues in same company"
  ON users FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
