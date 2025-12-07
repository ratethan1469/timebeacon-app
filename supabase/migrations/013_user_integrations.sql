-- User Integrations Table
-- Stores OAuth tokens and connection status for each user's integrations

CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_id TEXT NOT NULL, -- 'google', 'slack', 'zoom', 'microsoft'

  -- OAuth tokens (encrypted at rest)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Integration metadata
  scopes TEXT[], -- Array of granted scopes
  account_email TEXT, -- Connected email/account
  account_name TEXT,

  -- Status tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Timestamps
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one connection per user per integration
  UNIQUE(user_id, integration_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX idx_user_integrations_status ON user_integrations(status);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_user_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_integrations_timestamp
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_integrations_updated_at();

-- Comments
COMMENT ON TABLE user_integrations IS 'Stores OAuth tokens and connection status for user integrations (Google, Slack, Zoom, etc.)';
COMMENT ON COLUMN user_integrations.access_token IS 'OAuth access token (should be encrypted at application level)';
COMMENT ON COLUMN user_integrations.refresh_token IS 'OAuth refresh token (should be encrypted at application level)';
