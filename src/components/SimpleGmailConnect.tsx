/**
 * Simple Gmail Connection Component
 * Uses the Google Integration Service for secure OAuth
 */

import React, { useState, useEffect } from 'react';
import { googleIntegrationService } from '../services/googleIntegrationService';

export const SimpleGmailConnect: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're returning from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const authInProgress = localStorage.getItem('gmail_auth_in_progress');

    if (code && state && authInProgress) {
      console.log('🔄 Handling OAuth callback...');
      handleAuthCode(code, state);
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check existing connection status
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = () => {
    const authStatus = googleIntegrationService.getAuthStatus();
    setIsConnected(authStatus.isAuthenticated);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log('🔐 Starting Gmail connection...');
      
      // Generate OAuth URL
      const { url, state, codeVerifier } = await googleIntegrationService.generateAuthUrl();
      
      // Store state and verifier in localStorage (more reliable than sessionStorage)
      localStorage.setItem('gmail_oauth_state', state);
      localStorage.setItem('gmail_code_verifier', codeVerifier);
      localStorage.setItem('gmail_auth_in_progress', 'true');
      
      console.log('🌐 Redirecting to Google OAuth...');
      
      // Redirect to OAuth URL (same window, more reliable than popup)
      window.location.href = url;

    } catch (error) {
      console.error('❌ Gmail connection failed:', error);
      setError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnecting(false);
    }
  };

  const handleAuthCode = async (code: string, state: string) => {
    setIsConnecting(true);
    
    try {
      const expectedState = localStorage.getItem('gmail_oauth_state');
      const codeVerifier = localStorage.getItem('gmail_code_verifier');
      
      if (!expectedState || !codeVerifier) {
        throw new Error('Missing OAuth session data. Please try connecting again.');
      }

      console.log('🔄 Exchanging code for tokens...');
      
      await googleIntegrationService.exchangeCodeForTokens(
        code, 
        state, 
        expectedState, 
        codeVerifier
      );

      console.log('✅ Gmail connected successfully!');
      setIsConnected(true);
      setError(null);
      
      // Clean up localStorage
      localStorage.removeItem('gmail_oauth_state');
      localStorage.removeItem('gmail_code_verifier');
      localStorage.removeItem('gmail_auth_in_progress');

    } catch (error) {
      console.error('❌ Token exchange failed:', error);
      setError(error instanceof Error ? error.message : 'Token exchange failed');
      
      // Clean up localStorage on error too
      localStorage.removeItem('gmail_oauth_state');
      localStorage.removeItem('gmail_code_verifier');
      localStorage.removeItem('gmail_auth_in_progress');
    }
    
    setIsConnecting(false);
  };

  const testConnection = async () => {
    try {
      console.log('🧪 Testing Gmail API...');
      const result = await googleIntegrationService.testGmailApi();
      
      if (result.status === 'success') {
        alert(`✅ Gmail test successful!\n\nFound ${result.details.messagesFound} messages`);
      } else {
        alert(`❌ Gmail test failed:\n\n${result.details.error}`);
      }
    } catch (error) {
      alert(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #e0e0e0', 
      borderRadius: '8px', 
      margin: '20px 0',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>📧 Gmail Connection</h3>
      
      {!isConnected ? (
        <div>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Connect your Gmail to automatically track email time
          </p>
          
          {error && (
            <div style={{ 
              color: 'red', 
              backgroundColor: '#ffe6e6', 
              padding: '10px', 
              borderRadius: '4px',
              marginBottom: '15px'
            }}>
              ❌ {error}
            </div>
          )}
          
          <button 
            onClick={handleConnect}
            disabled={isConnecting}
            style={{
              padding: '12px 24px',
              backgroundColor: isConnecting ? '#ccc' : '#4285F4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {isConnecting ? '🔄 Connecting...' : '🔗 Connect Gmail'}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ 
            color: 'green', 
            backgroundColor: '#e6ffe6', 
            padding: '10px', 
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            ✅ Gmail connected successfully!
          </div>
          
          <button 
            onClick={testConnection}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            🧪 Test Gmail Connection
          </button>
        </div>
      )}
    </div>
  );
};