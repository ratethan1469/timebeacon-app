-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  customers TEXT[] DEFAULT '{}',
  projects TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('CSM', 'PS', 'Implementation', 'Admin')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'meeting', 'message')),
  source TEXT NOT NULL CHECK (source IN ('gmail', 'calendar', 'slack')),
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  content_summary TEXT,
  content_hash TEXT,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Entries table
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_name TEXT,
  category TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  summary TEXT,
  billable BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
  source_activity_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_activities_user_processed ON activities(user_id, processed);
CREATE INDEX idx_activities_company ON activities(company_id);
CREATE INDEX idx_activities_timestamp ON activities(timestamp DESC);
CREATE INDEX idx_activities_hash ON activities(content_hash) WHERE content_hash IS NOT NULL;

CREATE INDEX idx_time_entries_user_status ON time_entries(user_id, status);
CREATE INDEX idx_time_entries_company ON time_entries(company_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time DESC);

CREATE INDEX idx_users_company ON users(company_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage companies"
  ON companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view colleagues in same company"
  ON users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Activities policies
CREATE POLICY "Users can view their own activities"
  ON activities FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view company activities"
  ON activities FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own activities"
  ON activities FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own activities"
  ON activities FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Time Entries policies
CREATE POLICY "Users can view their own time entries"
  ON time_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view company time entries"
  ON time_entries FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time entries"
  ON time_entries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all time entries"
  ON time_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- Function to automatically calculate duration_minutes
CREATE OR REPLACE FUNCTION calculate_duration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_time_entry_duration
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_duration();
