import React, { useState, useEffect } from 'react';
import { googleIntegrationService, ApiTestResult } from '../services/googleIntegrationService';
import { intelligentDataImportService, ImportResult } from '../services/intelligentDataImport';
import { useTimeTracker } from '../hooks/useTimeTracker';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
  status: 'connected' | 'available' | 'coming-soon';
  category: 'google' | 'communication' | 'productivity';
}

const integrations: Integration[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Track time spent on emails',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24">
        <path fill="#EA4335" d="M24 12.073c0-1.02-.086-2.009-.25-2.957H12.228v5.597h6.657a5.696 5.696 0 0 1-2.474 3.745v3.103h4.009C22.456 19.682 24 16.138 24 12.073z"/>
        <path fill="#34A853" d="M12.228 24c3.35 0 6.16-1.11 8.21-3.014l-4.009-3.103c-1.11.744-2.533 1.183-4.201 1.183-3.23 0-5.963-2.18-6.937-5.111H1.202v3.205C3.241 21.495 7.51 24 12.228 24z"/>
        <path fill="#FBBC05" d="M5.291 16.955a7.176 7.176 0 0 1-.375-2.282c0-.794.138-1.566.375-2.282V9.186H1.202A12.017 12.017 0 0 0 0 14.673c0 1.93.46 3.756 1.202 5.487l4.089-3.205z"/>
        <path fill="#EB4335" d="M12.228 4.75c1.82 0 3.45.626 4.73 1.853l3.545-3.545C18.383 1.17 15.573 0 12.228 0 7.51 0 3.241 2.505 1.202 6.84l4.089 3.205c.974-2.931 3.707-5.11 6.937-5.11z"/>
      </svg>
    ),
    status: 'available',
    category: 'google'
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Auto-track meetings and events',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M19.5 3h-1V1.5C18.5.7 17.8 0 17 0s-1.5.7-1.5 1.5V3h-7V1.5C8.5.7 7.8 0 7 0S5.5.7 5.5 1.5V3h-1C3.1 3 2 4.1 2 5.5v13C2 19.9 3.1 21 4.5 21h15c1.4 0 2.5-1.1 2.5-2.5v-13C22 4.1 20.9 3 19.5 3zM20 18.5c0 .3-.2.5-.5.5h-15c-.3 0-.5-.2-.5-.5V8h16v10.5zM20 6H4V5.5c0-.3.2-.5.5-.5h1v1.5C5.5 7.3 6.2 8 7 8s1.5-.7 1.5-1.5V5h7v1.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5V5h1c.3 0 .5.2.5.5V6z"/>
        <circle fill="#34A853" cx="7" cy="12" r="1"/>
        <circle fill="#EA4335" cx="12" cy="12" r="1"/>
        <circle fill="#FBBC05" cx="17" cy="12" r="1"/>
        <circle fill="#34A853" cx="7" cy="16" r="1"/>
        <circle fill="#EA4335" cx="12" cy="16" r="1"/>
      </svg>
    ),
    status: 'available',
    category: 'google'
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Track document work time',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24">
        <path fill="#0F9D58" d="m10 2 8 14H2l8-14z"/>
        <path fill="#F1C232" d="M10 2 2 16h6L16 2h-6z"/>
        <path fill="#4285F4" d="M16 2v14h6L16 2z"/>
        <path fill="#0F9D58" d="M2 16h16l-3 6H5l-3-6z"/>
      </svg>
    ),
    status: 'available',
    category: 'google'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Time tracking notifications',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24">
        <path fill="#E01E5A" d="M6 14.5a2.5 2.5 0 0 1-2.5 2.5A2.5 2.5 0 0 1 1 14.5 2.5 2.5 0 0 1 3.5 12H6v2.5z"/>
        <path fill="#E01E5A" d="M6 9.5a2.5 2.5 0 0 1 5 0v5a2.5 2.5 0 0 1-5 0v-5z"/>
        <path fill="#36C5F0" d="M14.5 6a2.5 2.5 0 0 1 2.5-2.5A2.5 2.5 0 0 1 19.5 6 2.5 2.5 0 0 1 17 8.5H14.5V6z"/>
        <path fill="#36C5F0" d="M9.5 6a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
        <path fill="#2EB67D" d="M18 14.5a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 18 19.5 2.5 2.5 0 0 1 15.5 17V14.5H18z"/>
        <path fill="#2EB67D" d="M14.5 18a2.5 2.5 0 0 1-5 0v-5a2.5 2.5 0 0 1 5 0v5z"/>
        <path fill="#ECB22E" d="M9.5 18a2.5 2.5 0 0 1-2.5 2.5A2.5 2.5 0 0 1 4.5 18 2.5 2.5 0 0 1 7 15.5h2.5V18z"/>
        <path fill="#ECB22E" d="M14.5 9.5a2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 1 0-5z"/>
      </svg>
    ),
    status: 'available',
    category: 'communication'
  }
];

export const IntegrationsRevamped: React.FC = () => {
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set());
  const [isConnecting, setIsConnecting] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<{ [key: string]: ApiTestResult }>({});
  const [authStatus, setAuthStatus] = useState(googleIntegrationService.getAuthStatus());
  const [isImporting, setIsImporting] = useState(false);
  
  // Get access to the time tracker hook
  const { addTimeEntry } = useTimeTracker();

  // Check authentication status on mount
  useEffect(() => {
    const status = googleIntegrationService.getAuthStatus();
    setAuthStatus(status);
    
    // Check for stored OAuth tokens from our backend
    const storedTokens = localStorage.getItem('google_oauth_tokens');
    const userInfo = localStorage.getItem('google_user_info');
    
    if (storedTokens && userInfo || status.isAuthenticated) {
      // If we have tokens or authenticated, mark Google services as connected
      const googleServices = ['gmail', 'google-calendar', 'google-drive'];
      setConnectedIntegrations(new Set(googleServices));
      console.log('✅ Found existing authentication, marking services as connected');
    }
  }, []);

  const handleGoogleConnect = async (integrationId: string) => {
    if (connectedIntegrations.has(integrationId)) {
      // Disconnect
      handleDisconnect(integrationId);
      return;
    }

    // Connect
    setIsConnecting(prev => new Set([...prev, integrationId]));
    
    try {
      console.log(`🔐 Starting OAuth flow for ${integrationId}...`);
      
      // Generate auth URL with PKCE
      const { url, state, codeVerifier } = await googleIntegrationService.generateAuthUrl();
      
      // Store state and code verifier in sessionStorage for validation
      sessionStorage.setItem('google_oauth_state', state);
      sessionStorage.setItem('google_oauth_code_verifier', codeVerifier);
      sessionStorage.setItem('connecting_service', integrationId);
      
      // Open OAuth popup
      const popup = window.open(
        url,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for OAuth callback
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsConnecting(prev => {
            const newSet = new Set(prev);
            newSet.delete(integrationId);
            return newSet;
          });
        }
      }, 1000);

      // Listen for OAuth success message
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'OAUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup.close();
          
          console.log('🎉 OAuth Success! Received tokens and user info:', event.data);
          
          // Store the encrypted tokens and user info
          if (event.data.tokens && event.data.userInfo) {
            localStorage.setItem('google_oauth_tokens', JSON.stringify(event.data.tokens));
            localStorage.setItem('google_user_info', JSON.stringify(event.data.userInfo));
            console.log('✅ Stored encrypted tokens and user info');
          }
          
          // Mark as connected and run tests
          const googleServices = ['gmail', 'google-calendar', 'google-drive'];
          setConnectedIntegrations(new Set(googleServices));
          
          // Update auth status
          const newAuthStatus = googleIntegrationService.getAuthStatus();
          setAuthStatus(newAuthStatus);
          console.log('🔄 Updated auth status:', newAuthStatus);
          
          // Run API tests
          runApiTests();
          
          // Trigger automatic data import after connection
          triggerDataImport();
          
          window.removeEventListener('message', messageListener);
        } else if (event.data.type === 'OAUTH_ERROR') {
          clearInterval(checkClosed);
          popup.close();
          console.error('OAuth error:', event.data.error);
          alert(`Connection failed: ${event.data.error}`);
          window.removeEventListener('message', messageListener);
        }
      };

      window.addEventListener('message', messageListener);

    } catch (error) {
      console.error(`Failed to connect ${integrationId}:`, error);
      alert(`Failed to connect: ${error.message}`);
    } finally {
      setIsConnecting(prev => {
        const newSet = new Set(prev);
        newSet.delete(integrationId);
        return newSet;
      });
    }
  };

  const handleDisconnect = (integrationId: string) => {
    // Clear all stored tokens and data
    googleIntegrationService.clearTokens();
    localStorage.removeItem('google_oauth_tokens');
    localStorage.removeItem('google_user_info');
    
    // Update state
    setConnectedIntegrations(new Set());
    setAuthStatus(googleIntegrationService.getAuthStatus());
    setTestResults({});
    
    console.log(`✅ Disconnected from Google services and cleared all tokens`);
  };

  const runApiTests = async () => {
    console.log('🧪 Running API tests...');
    
    try {
      const results = await googleIntegrationService.runAllTests();
      const resultMap: { [key: string]: ApiTestResult } = {};
      
      results.forEach(result => {
        const serviceId = result.service.toLowerCase().replace(' ', '-');
        if (serviceId === 'drive') {
          resultMap['google-drive'] = result;
        } else if (serviceId === 'gmail') {
          resultMap['gmail'] = result;
        } else if (serviceId === 'calendar') {
          resultMap['google-calendar'] = result;
        }
      });
      
      setTestResults(resultMap);
      
      // Log results
      results.forEach(result => {
        if (result.status === 'success') {
          console.log(`✅ ${result.service} API: Connected successfully`);
        } else {
          console.error(`❌ ${result.service} API: ${result.details.error}`);
        }
      });
      
    } catch (error) {
      console.error('Failed to run API tests:', error);
    }
  };

  const handleConnect = (integrationId: string) => {
    const googleServices = ['gmail', 'google-calendar', 'google-drive'];
    
    if (googleServices.includes(integrationId)) {
      handleGoogleConnect(integrationId);
    } else {
      // Handle other services (Slack, etc.)
      if (connectedIntegrations.has(integrationId)) {
        const newSet = new Set(connectedIntegrations);
        newSet.delete(integrationId);
        setConnectedIntegrations(newSet);
        console.log(`Disconnected: ${integrationId}`);
      } else {
        setConnectedIntegrations(new Set([...connectedIntegrations, integrationId]));
        console.log(`Connected: ${integrationId}`);
      }
    }
  };

  const triggerDataImport = async () => {
    console.log('📊 Starting automatic data import...');
    setIsImporting(true);
    
    try {
      // Check if we have stored tokens
      const storedTokens = localStorage.getItem('google_oauth_tokens');
      const userInfo = localStorage.getItem('google_user_info');
      
      if (!storedTokens || !userInfo) {
        console.log('❌ No tokens found for data import');
        setIsImporting(false);
        return;
      }

      const tokens = JSON.parse(storedTokens);
      console.log('✅ Found stored tokens, starting data import...');
      
      let totalImported = 0;
      const errors: string[] = [];
      
      // Import this week's Gmail data
      const gmailResult = await intelligentDataImportService.importGmailData(tokens);
      if (gmailResult.success) {
        // Add each time entry to the tracker
        gmailResult.timeEntries.forEach(entry => {
          addTimeEntry(entry);
          totalImported++;
        });
        console.log(`📧 Added ${gmailResult.timeEntries.length} email time entries`);
      } else {
        errors.push(...gmailResult.errors);
      }
      
      // Import this week's Calendar data  
      const calendarResult = await intelligentDataImportService.importCalendarData(tokens);
      if (calendarResult.success) {
        // Add each time entry to the tracker
        calendarResult.timeEntries.forEach(entry => {
          addTimeEntry(entry);
          totalImported++;
        });
        console.log(`📅 Added ${calendarResult.timeEntries.length} calendar time entries`);
      } else {
        errors.push(...calendarResult.errors);
      }
      
      console.log(`🎉 Automatic data import completed! Total entries: ${totalImported}`);
      
      // Show success notification
      if (totalImported > 0) {
        alert(`🎉 Connected successfully! Imported ${totalImported} time entries from your emails and calendar events this week. Check your dashboard to see them!`);
      } else {
        alert('✅ Connected successfully! No new time entries found for this week. Try using the individual import buttons in the Gmail and Calendar components.');
      }
      
    } catch (error) {
      console.error('❌ Error during automatic data import:', error);
      alert(`❌ Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };


  const googleIntegrations = integrations.filter(i => i.category === 'google');
  const otherIntegrations = integrations.filter(i => i.category !== 'google');

  const renderIntegrationCard = (integration: Integration) => {
    const isConnected = connectedIntegrations.has(integration.id);
    const isLoading = isConnecting.has(integration.id) || isImporting;
    const testResult = testResults[integration.id];
    const hasError = testResult?.status === 'error';
    
    return (
      <div 
        key={integration.id}
        style={{
          backgroundColor: 'white',
          border: isConnected ? '2px solid #10b981' : '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          position: 'relative' as const
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {isConnected && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}>
            ✓
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <div style={{ flexShrink: 0 }}>
            {integration.icon}
          </div>
          
          <div>
            <h3 style={{ 
              margin: '0 0 4px 0', 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#111827'
            }}>
              {integration.name}
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: '#6b7280',
              lineHeight: '1.4'
            }}>
              {integration.description}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          {/* API Status Indicator */}
          {isConnected && testResult && (
            <div style={{
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: hasError ? '#fef3f2' : '#f0f9ff',
              color: hasError ? '#b91c1c' : '#0c4a6e',
              border: `1px solid ${hasError ? '#fecaca' : '#bae6fd'}`
            }}>
              {hasError ? '⚠️ API Error' : '✅ API Active'}
            </div>
          )}
          
          <button
            onClick={() => handleConnect(integration.id)}
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? '#9ca3af' : (isConnected ? '#10b981' : '#3b82f6'),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease',
              minWidth: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              opacity: isLoading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = isConnected ? '#059669' : '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = isLoading ? '#9ca3af' : (isConnected ? '#10b981' : '#3b82f6');
              }
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #ffffff40',
                  borderTop: '2px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                {isImporting ? 'Importing...' : 'Connecting...'}
              </>
            ) : isConnected ? (
              <>
                <span style={{ fontSize: '12px' }}>✓</span>
                Connected
              </>
            ) : (
              <>
                🔗 Connect
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '48px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#111827', 
          marginBottom: '12px',
          margin: 0 
        }}>
          Integrations
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280', 
          margin: 0,
          maxWidth: '500px',
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: '1.5'
        }}>
          Connect your favorite tools to automatically track time and boost productivity
        </p>
      </div>

      {/* Google Workspace Section */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          marginBottom: '24px' 
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#111827', 
            margin: 0 
          }}>
            Google Workspace
          </h2>
        </div>
        
        <div style={{ display: 'grid', gap: '12px' }}>
          {googleIntegrations.map(renderIntegrationCard)}
        </div>
      </div>

      {/* Communication & Productivity Section */}
      <div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          marginBottom: '24px' 
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>
          </svg>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#111827', 
            margin: 0 
          }}>
            Communication & Productivity
          </h2>
        </div>
        
        <div style={{ display: 'grid', gap: '12px' }}>
          {otherIntegrations.map(renderIntegrationCard)}
        </div>
      </div>

      {/* Connected Status Summary */}
      {connectedIntegrations.size > 0 && (
        <div style={{
          marginTop: '48px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <p style={{ 
            margin: 0, 
            color: '#0c4a6e', 
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ✅ {connectedIntegrations.size} integration{connectedIntegrations.size !== 1 ? 's' : ''} connected
          </p>
        </div>
      )}
    </div>
  );
};