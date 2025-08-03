import React from 'react';
import { Integration } from '../types';
import { GoogleCalendarAuth } from './GoogleCalendarAuth';
import GoogleIntegrations from './GoogleIntegrations';

interface IntegrationsProps {
  integrations: Integration[];
  onToggleIntegration: (integrationId: string) => void;
}

const integrationDetails = {
  'google-calendar': {
    name: 'Google Calendar',
    description: 'Automatically create time entries from calendar meetings',
    icon: '📅',
    color: '#4285F4',
    category: 'Calendar & Scheduling'
  },
  'slack': {
    name: 'Slack',
    description: 'Track time spent in client channels and DMs',
    icon: '💬',
    color: '#4A154B',
    category: 'Communication'
  },
  'zoom': {
    name: 'Zoom',
    description: 'Auto-track meeting duration and participants',
    icon: '📹',
    color: '#2D8CFF',
    category: 'Video Conferencing'
  },
  'teams': {
    name: 'Microsoft Teams',
    description: 'Track meetings and collaboration time',
    icon: '👥',
    color: '#6264A7',
    category: 'Video Conferencing'
  },
  'gmail': {
    name: 'Gmail',
    description: 'Track time spent on client email threads',
    icon: '📧',
    color: '#EA4335',
    category: 'Communication'
  },
  'jira': {
    name: 'Jira',
    description: 'Auto-create entries from ticket work',
    icon: '🎯',
    color: '#0052CC',
    category: 'Project Management'
  },
  'salesforce': {
    name: 'Salesforce',
    description: 'Track customer interactions and opportunities',
    icon: '☁️',
    color: '#00A1E0',
    category: 'CRM & Sales'
  }
};

export const Integrations: React.FC<IntegrationsProps> = ({ 
  integrations, 
  onToggleIntegration 
}) => {
  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Never synced';
    const date = new Date(lastSync);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Integrations</h1>
          <p className="dashboard-subtitle">
            Connect your tools to automate time tracking
          </p>
        </div>
      </div>

      {/* Google Integrations Section */}
      <GoogleIntegrations />

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Connected Integrations</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Enable or disable integrations to control automatic time tracking
          </p>
        </div>
        <div style={{ padding: '24px' }}>
          <div className="integrations-grid">
            {integrations.map((integration) => {
              const details = integrationDetails[integration.name];
              return (
                <div key={integration.id} className="integration-card">
                  <div className="integration-header">
                    <div className="integration-info">
                      <div className="integration-icon-name">
                        <span 
                          className="integration-icon"
                          style={{ color: details.color }}
                        >
                          {details.icon}
                        </span>
                        <div>
                          <h3 className="integration-name">{details.name}</h3>
                          <p className="integration-description">{details.description}</p>
                        </div>
                      </div>
                      <div className="integration-toggle">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={integration.enabled}
                            onChange={() => onToggleIntegration(integration.id)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {integration.enabled && (
                    <div className="integration-status">
                      <div className="status-item">
                        <span className="status-label">Status:</span>
                        <span className="status-value enabled">Connected</span>
                      </div>
                      <div className="status-item">
                        <span className="status-label">Last Sync:</span>
                        <span className="status-value">{formatLastSync(integration.lastSync)}</span>
                      </div>
                      {integration.connectedAt && (
                        <div className="status-item">
                          <span className="status-label">Connected:</span>
                          <span className="status-value">
                            {new Date(integration.connectedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      {Object.keys(integration.settings).length > 0 && (
                        <div className="integration-settings">
                          <h4>Settings</h4>
                          <div className="settings-list">
                            {Object.entries(integration.settings).map(([key, value]) => (
                              <div key={key} className="setting-item">
                                <span className="setting-key">
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                </span>
                                <span className="setting-value">
                                  {Array.isArray(value) ? value.join(', ') : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!integration.enabled && (
                    <div className="integration-status">
                      <div className="status-item">
                        <span className="status-label">Status:</span>
                        <span className="status-value disabled">Disabled</span>
                      </div>
                      <p style={{ 
                        fontSize: '13px', 
                        color: 'var(--text-secondary)', 
                        marginTop: '8px' 
                      }}>
                        Enable to start automatic time tracking from {details.name}
                      </p>
                    </div>
                  )}

                  {/* Google Calendar specific authentication */}
                  {integration.name === 'google-calendar' && integration.enabled && (
                    <div style={{ marginTop: '16px', padding: '16px', background: 'var(--background-secondary)', borderRadius: '8px' }}>
                      <GoogleCalendarAuth 
                        onAuthSuccess={() => {
                          console.log('Google Calendar authenticated successfully');
                        }}
                        onAuthError={(error) => {
                          console.error('Google Calendar auth error:', error);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h2 className="card-title">How It Works</h2>
        </div>
        <div style={{ padding: '24px' }}>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-icon">🤖</span>
              <div>
                <h3>Automatic Detection</h3>
                <p>TimeBeacon monitors your connected tools and automatically detects billable activities.</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">✏️</span>
              <div>
                <h3>Review & Edit</h3>
                <p>All automatically created entries can be reviewed, edited, or deleted before submission.</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">📊</span>
              <div>
                <h3>Intelligent Categorization</h3>
                <p>We automatically categorize time entries based on context and participants.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};