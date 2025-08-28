-- TimeBeacon Intelligent Time Tracking Database Schema
-- Postgres DDL for production-ready time tracking with LLM integration

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OAuth tokens (encrypted)
CREATE TABLE oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'zoom', etc.
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- Projects and clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255), -- for email domain matching
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    keywords TEXT[], -- for LLM matching
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Time entries (the core tracking data)
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    
    -- Time data
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER, -- calculated or estimated
    
    -- Content
    title VARCHAR(500),
    description TEXT,
    activity_type VARCHAR(50), -- 'email', 'meeting', 'document', 'call', 'manual'
    
    -- AI/LLM derived data
    confidence_score DECIMAL(3,2), -- 0.00-1.00 for LLM confidence
    ai_summary TEXT,
    ai_estimated_duration INTEGER, -- LLM estimated minutes
    
    -- Source tracking
    source_type VARCHAR(50), -- 'gmail', 'calendar', 'drive', 'zoom', 'manual'
    source_id VARCHAR(255), -- external ID (email message ID, calendar event ID, etc.)
    source_metadata JSONB, -- flexible source-specific data
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'billed', 'archived'
    is_billable BOOLEAN DEFAULT TRUE,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    needs_review BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email tracking (Gmail integration)
CREATE TABLE email_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Gmail specific data
    gmail_message_id VARCHAR(255) UNIQUE,
    gmail_thread_id VARCHAR(255),
    
    -- Email metadata
    subject VARCHAR(500),
    sender_email VARCHAR(255),
    recipient_emails TEXT[],
    email_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Processing data
    word_count INTEGER,
    estimated_read_time_minutes INTEGER,
    estimated_compose_time_minutes INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calendar/meeting tracking
CREATE TABLE calendar_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Calendar specific data
    calendar_event_id VARCHAR(255),
    calendar_provider VARCHAR(50), -- 'google', 'outlook', 'zoom'
    
    -- Meeting metadata
    meeting_title VARCHAR(500),
    attendee_count INTEGER,
    attendee_emails TEXT[],
    meeting_url VARCHAR(500),
    location VARCHAR(255),
    
    -- Time data
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    actual_duration_minutes INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document work tracking (Google Drive, etc.)
CREATE TABLE document_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Document metadata
    document_id VARCHAR(255),
    document_provider VARCHAR(50), -- 'google_docs', 'google_sheets', 'google_slides'
    document_title VARCHAR(500),
    document_url VARCHAR(500),
    document_type VARCHAR(50), -- 'document', 'spreadsheet', 'presentation'
    
    -- Activity tracking
    edit_sessions JSONB, -- array of {start, end, changes_made}
    total_edits INTEGER DEFAULT 0,
    estimated_work_time_minutes INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LLM processing results and prompts
CREATE TABLE ai_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
    
    -- Processing metadata
    model_name VARCHAR(100),
    prompt_template VARCHAR(100),
    processing_type VARCHAR(50), -- 'duration_estimation', 'project_matching', 'summarization'
    
    -- Input/Output
    input_data JSONB,
    output_data JSONB,
    confidence_score DECIMAL(3,2),
    processing_time_ms INTEGER,
    
    -- Cost tracking
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost_usd DECIMAL(8,6),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project matching rules (for LLM fallback)
CREATE TABLE project_matching_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Matching criteria
    rule_type VARCHAR(50), -- 'email_domain', 'keyword', 'sender_email', 'calendar_attendee'
    pattern VARCHAR(255),
    priority INTEGER DEFAULT 1, -- higher number = higher priority
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Productivity insights and analytics
CREATE TABLE productivity_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Time period
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    
    -- Metrics
    total_tracked_hours DECIMAL(5,2),
    billable_hours DECIMAL(5,2),
    email_time_hours DECIMAL(5,2),
    meeting_time_hours DECIMAL(5,2),
    document_time_hours DECIMAL(5,2),
    
    -- AI insights
    productivity_score DECIMAL(3,2), -- 0.00-1.00
    top_time_drains JSONB,
    efficiency_recommendations JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date_from, date_to)
);

-- Indexes for performance
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, start_time);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_source ON time_entries(source_type, source_id);
CREATE INDEX idx_time_entries_status ON time_entries(user_id, status);

CREATE INDEX idx_email_entries_gmail_id ON email_entries(gmail_message_id);
CREATE INDEX idx_calendar_entries_event_id ON calendar_entries(calendar_event_id);
CREATE INDEX idx_document_entries_doc_id ON document_entries(document_id);

CREATE INDEX idx_oauth_tokens_user_provider ON oauth_tokens(user_id, provider);
CREATE INDEX idx_clients_domain ON clients(domain) WHERE domain IS NOT NULL;

-- Full-text search indexes
CREATE INDEX idx_time_entries_text_search ON time_entries USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX idx_projects_keywords ON projects USING GIN(keywords);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON oauth_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for development
INSERT INTO users (id, email, name, timezone) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'demo@timebeacon.io', 'Demo User', 'America/New_York');

INSERT INTO clients (id, user_id, name, domain, color) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Acme Corp', 'acme.com', '#EF4444'),
    ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'TechStart Inc', 'techstart.io', '#10B981');

INSERT INTO projects (id, user_id, client_id, name, keywords, hourly_rate) VALUES 
    ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'CRM Integration', ARRAY['salesforce', 'integration', 'api'], 150.00),
    ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'Mobile App Development', ARRAY['react native', 'mobile', 'app'], 125.00);