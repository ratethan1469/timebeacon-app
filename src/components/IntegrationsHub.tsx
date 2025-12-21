import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  scopes: string[];
  status: 'connected' | 'disconnected';
  connectedAt?: string;
}

export const IntegrationsHub: React.FC = () => {
  const { user } = useUser();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google',
      name: 'Google Workspace',
      description: 'Connect Gmail, Calendar, and Drive to automatically track your work time',
      icon: '🔵',
      color: '#4285F4',
      scopes: [
        'Gmail - Read emails and track communication time',
        'Calendar - Auto-track meetings and events',
        'Drive - Monitor document editing time'
      ],
      status: 'disconnected'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Track time spent in conversations and get smart time logging suggestions',
      icon: '💬',
      color: '#4A154B',
      scopes: [
        'Messages - Analyze conversation context',
        'Channels - Track project-specific discussions',
        'Status - Auto-pause tracking when away'
      ],
      status: 'disconnected'
    },
    {
      id: 'zoom',
      name: 'Zoom',
      description: 'Automatically log meeting time and get AI-generated meeting summaries',
      icon: '📹',
      color: '#2D8CFF',
      scopes: [
        'Meetings - Auto-track video call duration',
        'Recordings - Access meeting recordings for context',
        'Participants - Identify meeting attendees'
      ],
      status: 'disconnected'
    },
    {
      id: 'microsoft',
      name: 'Microsoft 365',
      description: 'Connect Outlook, Teams, and OneDrive for comprehensive time tracking',
      icon: '🔷',
      color: '#0078D4',
      scopes: [
        'Outlook - Track email time',
        'Teams - Monitor chat and calls',
        'OneDrive - Track document work'
      ],
      status: 'disconnected'
    }
  ]);

  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);

  // Load integration statuses from database
  useEffect(() => {
    loadIntegrationStatuses();
  }, [user]);

  const loadIntegrationStatuses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        setIntegrations(prev => prev.map(integration => {
          const connected = data.find(d => d.integration_id === integration.id);
          return {
            ...integration,
            status: connected ? 'connected' : 'disconnected',
            connectedAt: connected?.connected_at
          };
        }));
      }
    } catch (error) {
      console.error('Error loading integration statuses:', error);
    }
  };

  const handleConnect = async (integrationId: string) => {
    // Build OAuth URL based on integration
    let authUrl = '';

    switch (integrationId) {
      case 'google':
        authUrl = buildGoogleOAuthUrl();
        break;
      case 'slack':
        authUrl = buildSlackOAuthUrl();
        break;
      case 'zoom':
        authUrl = buildZoomOAuthUrl();
        break;
      case 'microsoft':
        authUrl = buildMicrosoftOAuthUrl();
        break;
    }

    if (authUrl) {
      // Store state for security
      const state = generateSecureState(integrationId);
      localStorage.setItem('oauth_state', state);
      window.location.href = authUrl;
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration? Your historical data will be preserved.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', user?.id)
        .eq('integration_id', integrationId);

      if (error) throw error;

      // Update local state
      setIntegrations(prev => prev.map(integration =>
        integration.id === integrationId
          ? { ...integration, status: 'disconnected', connectedAt: undefined }
          : integration
      ));
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      alert('Failed to disconnect integration');
    }
  };

  const buildGoogleOAuthUrl = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/oauth/google/callback`;
    const scope = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/drive.readonly'
    ].join(' ');

    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;
  };

  const buildSlackOAuthUrl = () => {
    // TODO: Add Slack OAuth credentials
    const clientId = import.meta.env.VITE_SLACK_CLIENT_ID || '';
    const redirectUri = `${window.location.origin}/oauth/slack/callback`;
    const scope = 'channels:read,chat:write,users:read,im:read';

    return `https://slack.com/oauth/v2/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scope}`;
  };

  const buildZoomOAuthUrl = () => {
    // TODO: Add Zoom OAuth credentials
    const clientId = import.meta.env.VITE_ZOOM_CLIENT_ID || '';
    const redirectUri = `${window.location.origin}/oauth/zoom/callback`;

    return `https://zoom.us/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  const buildMicrosoftOAuthUrl = () => {
    // TODO: Add Microsoft OAuth credentials
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '';
    const redirectUri = `${window.location.origin}/oauth/microsoft/callback`;
    const scope = 'User.Read Mail.Read Calendars.Read Files.Read';

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}`;
  };

  const generateSecureState = (integrationId: string) => {
    return btoa(JSON.stringify({
      integration: integrationId,
      timestamp: Date.now(),
      random: Math.random().toString(36)
    }));
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
          Integrations
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Connect your tools to automatically track time and get AI-powered insights
        </p>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {integrations.map(integration => (
          <div
            key={integration.id}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              backgroundColor: 'white',
              transition: 'box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                <div style={{ fontSize: '48px', lineHeight: '1' }}>
                  {integration.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                      {integration.name}
                    </h3>
                    {integration.status === 'connected' && (
                      <span style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        Connected
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                    {integration.description}
                  </p>

                  {expandedIntegration === integration.id && (
                    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                        This integration will access:
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {integration.scopes.map((scope, idx) => (
                          <li key={idx} style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                            {scope}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {integration.connectedAt && (
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                      Connected on {new Date(integration.connectedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                {integration.status === 'connected' ? (
                  <button
                    onClick={() => handleDisconnect(integration.id)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleConnect(integration.id)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: integration.color,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Connect
                    </button>
                    <button
                      onClick={() => setExpandedIntegration(
                        expandedIntegration === integration.id ? null : integration.id
                      )}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: 'white',
                        color: '#666',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {expandedIntegration === integration.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '48px',
        padding: '24px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
          🤖 AI-Powered Time Tracking
        </h3>
        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
          Once connected, TimeBeacon's AI will analyze your activity across all integrated tools to:
        </p>
        <ul style={{ marginTop: '12px', color: '#666', fontSize: '14px', lineHeight: '1.8' }}>
          <li>Automatically suggest time entries based on your work patterns</li>
          <li>Categorize activities by project and task</li>
          <li>Generate intelligent summaries of your daily work</li>
          <li>Identify time-saving opportunities and productivity insights</li>
        </ul>
      </div>
    </div>
  );
};

export default IntegrationsHub;
