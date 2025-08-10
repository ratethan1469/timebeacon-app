/**
 * Google OAuth Callback Handler
 * 
 * Handles the OAuth 2.0 callback from Google and exchanges the authorization code
 * for access tokens. This component is displayed in a popup window during the
 * OAuth flow.
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { googleIntegrationService } from '../services/googleIntegrationService';

interface CallbackState {
  status: 'loading' | 'success' | 'error';
  message: string;
  details?: any;
}

export const GoogleOAuthCallback: React.FC = () => {
  const location = useLocation();
  const [callbackState, setCallbackState] = useState<CallbackState>({
    status: 'loading',
    message: 'Processing authorization...'
  });

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        
        // Parse URL parameters
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        // Check for OAuth errors
        if (error) {
          const errorDescription = urlParams.get('error_description') || 'Unknown OAuth error';
          throw new Error(`OAuth Error: ${error} - ${errorDescription}`);
        }
        
        // Validate required parameters
        if (!code || !state) {
          throw new Error('Missing required OAuth parameters (code or state)');
        }
        
        // Get expected state from sessionStorage
        const expectedState = sessionStorage.getItem('google_oauth_state');
        if (!expectedState) {
          throw new Error('Missing OAuth state in session. Please try again.');
        }
        
        setCallbackState({
          status: 'loading',
          message: 'Exchanging authorization code for access tokens...'
        });
        
        // Exchange code for tokens
        const tokenResponse = await googleIntegrationService.exchangeCodeForTokens(
          code,
          state,
          expectedState
        );
        
        console.log('✅ OAuth tokens received successfully');
        
        setCallbackState({
          status: 'loading',
          message: 'Testing API connections...'
        });
        
        // Test API connections
        const testResults = await googleIntegrationService.runAllTests();
        const successCount = testResults.filter(r => r.status === 'success').length;
        const totalTests = testResults.length;
        
        setCallbackState({
          status: 'success',
          message: `Successfully connected! ${successCount}/${totalTests} APIs working properly.`,
          details: {
            tokenResponse: {
              hasAccessToken: !!tokenResponse.access_token,
              hasRefreshToken: !!tokenResponse.refresh_token,
              expiresIn: tokenResponse.expires_in,
              scope: tokenResponse.scope
            },
            apiTests: testResults.map(result => ({
              service: result.service,
              status: result.status,
              executionTime: result.executionTimeMs
            }))
          }
        });
        
        // Clean up session storage
        sessionStorage.removeItem('google_oauth_state');
        sessionStorage.removeItem('connecting_service');
        
        // Notify parent window of success
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_SUCCESS',
            data: {
              tokenResponse,
              testResults
            }
          }, window.location.origin);
        }
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          window.close();
        }, 2000);
        
      } catch (error) {
        console.error('❌ OAuth callback error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        setCallbackState({
          status: 'error',
          message: errorMessage,
          details: {
            error: errorMessage,
            timestamp: new Date().toISOString(),
            url: location.search
          }
        });
        
        // Notify parent window of error
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: errorMessage
          }, window.location.origin);
        }
        
        // Auto-close after 5 seconds on error
        setTimeout(() => {
          window.close();
        }, 5000);
      }
    };

    handleCallback();
  }, [location.search]);

  const getStatusIcon = () => {
    switch (callbackState.status) {
      case 'loading':
        return (
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
        );
      case 'success':
        return (
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'white',
            fontSize: '24px'
          }}>
            ✓
          </div>
        );
      case 'error':
        return (
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#ef4444',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'white',
            fontSize: '24px'
          }}>
            ✕
          </div>
        );
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        textAlign: 'center'
      }}>
        {getStatusIcon()}
        
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '8px',
          margin: '0 0 8px 0'
        }}>
          {callbackState.status === 'loading' && 'Connecting to Google...'}
          {callbackState.status === 'success' && 'Connection Successful!'}
          {callbackState.status === 'error' && 'Connection Failed'}
        </h2>
        
        <p style={{
          color: '#6b7280',
          fontSize: '14px',
          lineHeight: '1.5',
          marginBottom: '24px',
          margin: '0 0 24px 0'
        }}>
          {callbackState.message}
        </p>
        
        {/* Success Details */}
        {callbackState.status === 'success' && callbackState.details && (
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#0c4a6e',
              marginBottom: '12px',
              margin: '0 0 12px 0'
            }}>
              Connection Details:
            </h4>
            
            <div style={{ fontSize: '13px', color: '#0c4a6e' }}>
              {callbackState.details.apiTests.map((test: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}>
                  <span>{test.service} API</span>
                  <span style={{
                    color: test.status === 'success' ? '#059669' : '#dc2626',
                    fontWeight: '500'
                  }}>
                    {test.status === 'success' ? '✅ Connected' : '❌ Failed'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Error Details */}
        {callbackState.status === 'error' && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#b91c1c',
              marginBottom: '8px',
              margin: '0 0 8px 0'
            }}>
              What went wrong:
            </h4>
            <p style={{
              fontSize: '13px',
              color: '#b91c1c',
              margin: '0 0 12px 0',
              fontFamily: 'monospace',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              padding: '8px',
              borderRadius: '4px'
            }}>
              {callbackState.details?.error}
            </p>
            
            <h5 style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#b91c1c',
              marginBottom: '6px',
              margin: '0 0 6px 0'
            }}>
              Troubleshooting:
            </h5>
            <ul style={{
              fontSize: '12px',
              color: '#b91c1c',
              paddingLeft: '16px',
              margin: 0
            }}>
              <li>Check if popups are blocked</li>
              <li>Verify Google Cloud Console setup</li>
              <li>Ensure APIs are enabled</li>
              <li>Check redirect URI configuration</li>
            </ul>
          </div>
        )}
        
        <div style={{
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          {callbackState.status === 'success' && 'This window will close automatically...'}
          {callbackState.status === 'error' && 'You can close this window and try again.'}
          {callbackState.status === 'loading' && 'Please wait while we connect...'}
        </div>
      </div>
    </div>
  );
};

export default GoogleOAuthCallback;