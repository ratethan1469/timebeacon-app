import React, { useState } from 'react';
import { Integration } from '../types';

interface IntegrationsProps {
  integrations: Integration[];
  onToggleIntegration: (integrationId: string) => void;
}

interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  status: 'available' | 'connected' | 'error' | 'coming-soon';
  features: string[];
  setupSteps?: string[];
}

const availableIntegrations: IntegrationConfig[] = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Automatically create time entries from calendar meetings and events',
    icon: '📅',
    color: '#4285F4',
    category: 'Calendar & Scheduling',
    status: 'available',
    features: [
      'Auto-import meetings as time entries',
      'Detect meeting participants and duration', 
      'Categorize by meeting type',
      'Sync calendar blocks as work time'
    ],
    setupSteps: [
      'Click "Connect Google Calendar" below',
      'Sign in to your Google account',
      'Grant calendar read permissions',
      'Configure automatic import settings'
    ]
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Track time spent in client channels, DMs, and meetings',
    icon: '💬',
    color: '#4A154B',
    category: 'Communication',
    status: 'coming-soon',
    features: [
      'Track time in client channels',
      'Detect client vs internal conversations',
      'Log meeting time from Slack calls',
      'Auto-categorize by workspace'
    ]
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Auto-track meeting duration, participants, and context',
    icon: '🎥',
    color: '#2D8CFF',
    category: 'Video Conferencing',
    status: 'coming-soon',
    features: [
      'Automatic meeting time tracking',
      'Participant detection',
      'Meeting recording integration',
      'Client vs internal meeting classification'
    ]
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Track meetings, calls, and collaboration time in Teams',
    icon: '🟦',
    color: '#6264A7',
    category: 'Video Conferencing',
    status: 'coming-soon',
    features: [
      'Meeting and call tracking',
      'Channel activity monitoring',
      'Integration with Office 365',
      'Team collaboration time logging'
    ]
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Track development time based on commits, PRs, and issues',
    icon: '⚫',
    color: '#24292e',
    category: 'Development',
    status: 'coming-soon',
    features: [
      'Commit-based time tracking',
      'Pull request review time',
      'Issue resolution tracking',
      'Repository activity monitoring'
    ]
  },
  {
    id: 'jira',
    name: 'Jira',  
    description: 'Sync project tasks and track time against tickets',
    icon: '🔷',
    color: '#0052CC',
    category: 'Project Management',
    status: 'coming-soon',
    features: [
      'Ticket-based time tracking',
      'Project synchronization',
      'Sprint time analysis',
      'Automatic time logging from activity'
    ]
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Connect tasks and projects for seamless time tracking',
    icon: '🔶',
    color: '#F06A6A',
    category: 'Project Management', 
    status: 'coming-soon',
    features: [
      'Task-based time entries',
      'Project milestone tracking',
      'Team collaboration insights',
      'Automatic time allocation'
    ]
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Track time spent on documents, projects, and databases',
    icon: '📝',
    color: '#000000',
    category: 'Productivity',
    status: 'coming-soon',
    features: [
      'Document editing time tracking',
      'Database activity monitoring',
      'Project page time logging',
      'Collaboration time insights'
    ]
  }
];

export const Integrations: React.FC<IntegrationsProps> = ({ integrations, onToggleIntegration }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSetupModal, setShowSetupModal] = useState<string | null>(null);

  const categories = ['all', ...Array.from(new Set(availableIntegrations.map(i => i.category)))];

  const filteredIntegrations = selectedCategory === 'all' 
    ? availableIntegrations 
    : availableIntegrations.filter(i => i.category === selectedCategory);

  const getStatusBadge = (status: IntegrationConfig['status']) => {
    switch (status) {
      case 'connected':
        return <span className="status-badge connected">✅ Connected</span>;
      case 'error':
        return <span className="status-badge error">❌ Error</span>;
      case 'available':
        return <span className="status-badge available">🔗 Available</span>;
      case 'coming-soon':
        return <span className="status-badge coming-soon">🚧 Coming Soon</span>;
      default:
        return null;
    }
  };

  const handleConnect = (integrationId: string) => {
    if (integrationId === 'google-calendar') {
      // For demo purposes, we'll show a setup modal instead of trying OAuth
      setShowSetupModal(integrationId);
    } else {
      // For other integrations, show coming soon
      alert('This integration is coming soon! We\'ll notify you when it\'s available.');
    }
  };

  const handleGoogleCalendarSetup = () => {
    // In a real implementation, this would handle the OAuth flow
    alert('Google Calendar integration would be set up here. For demo purposes, this feature is not fully implemented.');
    setShowSetupModal(null);
  };

  return (
    <div className="integrations-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Integrations</h1>
          <p className="dashboard-subtitle">
            Connect your favorite tools to automatically track time and enhance productivity
          </p>
        </div>
        <div className="integration-stats">
          <div className="stat-item">
            <span className="stat-value">{availableIntegrations.filter(i => i.status === 'connected').length}</span>
            <span className="stat-label">Connected</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{availableIntegrations.filter(i => i.status === 'available').length}</span>
            <span className="stat-label">Available</span>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        {categories.map(category => (
          <button
            key={category}
            className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category === 'all' ? '🌟 All' : category}
          </button>
        ))}
      </div>

      {/* Featured Integration */}
      {selectedCategory === 'all' && (
        <div className="featured-integration">
          <div className="featured-content">
            <div className="featured-text">
              <h2>🎯 Most Popular: Google Calendar</h2>
              <p>
                Automatically convert your calendar meetings into time entries. 
                Perfect for consultants and service providers who spend time in client meetings.
              </p>
              <div className="featured-benefits">
                <div className="benefit-item">
                  <div className="benefit-icon">⚡</div>
                  <div>Save 15+ minutes daily on manual time entry</div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">🎯</div>
                  <div>Never miss billable meeting time again</div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">📊</div>
                  <div>Better utilization tracking and reporting</div>
                </div>
              </div>
              <button 
                className="btn btn-primary btn-large"
                onClick={() => handleConnect('google-calendar')}
              >
                📅 Connect Google Calendar
              </button>
            </div>
            <div className="featured-visual">
              <div className="integration-preview">
                <div className="preview-item">
                  <div className="preview-icon">📅</div>
                  <div className="preview-text">
                    <div className="preview-title">Client Strategy Meeting</div>
                    <div className="preview-time">2:00 PM - 3:30 PM</div>
                  </div>
                  <div className="preview-arrow">→</div>
                  <div className="preview-entry">
                    <div className="entry-badge">⏱️ 1.5h</div>
                    <div className="entry-label">Auto-tracked</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integrations Grid */}
      <div className="integrations-grid">
        {filteredIntegrations.map(integration => (
          <div key={integration.id} className="integration-card">
            <div className="integration-header">
              <div className="integration-icon" style={{ backgroundColor: integration.color + '20' }}>
                {integration.icon}
              </div>
              <div className="integration-info">
                <h3 className="integration-name">{integration.name}</h3>
                <p className="integration-category">{integration.category}</p>
              </div>
              {getStatusBadge(integration.status)}
            </div>
            
            <p className="integration-description">{integration.description}</p>
            
            <div className="integration-features">
              <h4>Features:</h4>
              <ul>
                {integration.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
            
            <div className="integration-actions">
              {integration.status === 'available' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => handleConnect(integration.id)}
                >
                  Connect {integration.name}
                </button>
              )}
              {integration.status === 'connected' && (
                <div className="connected-actions">
                  <button className="btn btn-secondary">Configure</button>
                  <button className="btn btn-outline">Disconnect</button>
                </div>
              )}
              {integration.status === 'coming-soon' && (
                <button className="btn btn-secondary" disabled>
                  Coming Soon
                </button>
              )}
              {integration.status === 'error' && (
                <button className="btn btn-warning">
                  Reconnect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="modal-overlay" onClick={() => setShowSetupModal(null)}>
          <div className="modal-content setup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔗 Connect Google Calendar</h3>
              <button 
                className="modal-close"
                onClick={() => setShowSetupModal(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="setup-steps">
                <h4>Setup Steps:</h4>
                <ol>
                  <li>Click "Authorize Access" below to open Google's authentication</li>
                  <li>Sign in to your Google account</li>
                  <li>Grant TimeBeacon permission to read your calendar</li>
                  <li>Configure which calendars to sync</li>
                  <li>Set automatic import preferences</li>
                </ol>
              </div>
              
              <div className="setup-security">
                <h4>🔒 Privacy & Security:</h4>
                <ul>
                  <li>✅ We only read calendar event titles, times, and attendees</li>
                  <li>✅ We never access email or other Google services</li>
                  <li>✅ You can disconnect at any time</li>
                  <li>✅ All data stays within your TimeBeacon account</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowSetupModal(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleGoogleCalendarSetup}
              >
                🔐 Authorize Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="help-section">
        <div className="help-card">
          <h3>💡 Need Help?</h3>
          <p>Setting up integrations is easy, but if you need assistance:</p>
          <div className="help-actions">
            <button className="btn btn-outline">📖 View Setup Guides</button>
            <button className="btn btn-outline">💬 Contact Support</button>
            <button className="btn btn-outline">🎥 Watch Tutorials</button>
          </div>
        </div>
        
        <div className="help-card">
          <h3>🚀 Coming Soon</h3>
          <p>We're working on more integrations based on user feedback:</p>
          <div className="roadmap-items">
            <div className="roadmap-item">
              <span className="roadmap-icon">🔜</span>
              <span>Slack & Microsoft Teams</span>
            </div>
            <div className="roadmap-item">
              <span className="roadmap-icon">🔜</span>
              <span>GitHub & GitLab</span>
            </div>
            <div className="roadmap-item">
              <span className="roadmap-icon">🔜</span>
              <span>Jira & Linear</span>
            </div>
          </div>
          <button className="btn btn-outline">📝 Request Integration</button>
        </div>
      </div>
    </div>
  );
};