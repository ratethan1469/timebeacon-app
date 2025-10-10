-- AI Preferences Table
CREATE TABLE ai_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Confidence threshold (0-100)
  confidence_threshold INTEGER DEFAULT 80 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 100),
  auto_approve_enabled BOOLEAN DEFAULT false,

  -- Description length
  description_length TEXT DEFAULT 'standard' CHECK (description_length IN ('brief', 'standard', 'detailed')),

  -- Email filtering
  only_opened_emails BOOLEAN DEFAULT true,
  skip_promotional BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- RLS policies
ALTER TABLE ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON ai_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON ai_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON ai_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER update_ai_preferences_updated_at
  BEFORE UPDATE ON ai_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create default preferences for existing users
INSERT INTO ai_preferences (user_id, company_id)
SELECT id, company_id FROM users
WHERE company_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
