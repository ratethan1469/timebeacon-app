import React from 'react';
import { Integration } from '../types';
import GoogleIntegrations from './GoogleIntegrations';

interface IntegrationsProps {
  integrations: Integration[];
  onToggleIntegration: (integrationId: string) => void;
}

const integrationDetails = {
  'google-calendar': {
    name: 'Google Calendar',
    description: 'Automatically create time entries from calendar meetings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: '#4285F4',
    category: 'Calendar & Scheduling'
  },
  'slack': {
    name: 'Slack',
    description: 'Track time spent in client channels and DMs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    color: '#4A154B',
    category: 'Communication'
  },
  'zoom': {
    name: 'Zoom',
    description: 'Auto-track meeting duration and participants',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    color: '#2D8CFF',
    category: 'Video Conferencing'
  },
  'teams': {
    name: 'Microsoft Teams',
    description: 'Track meetings and collaboration time',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: '#6264A7',
    category: 'Video Conferencing'
  },
  'gmail': {
    name: 'Gmail',
    description: 'Track time spent on client email threads',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: '#EA4335',
    category: 'Communication'
  },
  'jira': {
    name: 'Jira',
    description: 'Auto-create entries from ticket work',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: '#0052CC',
    category: 'Project Management'
  },
  'salesforce': {
    name: 'Salesforce',
    description: 'Track customer interactions and opportunities',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
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
                        <div 
                          className="integration-icon"
                          style={{ color: details.color }}
                        >
                          {details.icon}
                        </div>
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
              <div className="info-icon">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3>Automatic Detection</h3>
                <p>TimeBeacon monitors your connected tools and automatically detects billable activities.</p>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3>Review & Edit</h3>
                <p>All automatically created entries can be reviewed, edited, or deleted before submission.</p>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
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