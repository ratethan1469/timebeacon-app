import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Simple OAuth callback for MVP Google Integration
 * Exchanges code for token without backend
 */
export const GoogleMVPCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');

      if (!code) {
        console.error('No authorization code');
        navigate('/integrations');
        return;
      }

      try {
        console.log('🔄 Processing OAuth callback...');

        // Get code verifier from localStorage (persists across redirects)
        // Try both keys for compatibility
        const codeVerifier = localStorage.getItem('google_oauth_code_verifier') || localStorage.getItem('pkce_code_verifier');
        console.log('🔑 Code verifier found:', !!codeVerifier);

        if (!codeVerifier) {
          throw new Error('Code verifier not found in localStorage');
        }

        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

        console.log('📤 Exchanging code for token...', {
          redirectUri,
          clientId: clientId?.substring(0, 20) + '...',
          hasClientSecret: !!clientSecret
        });

        // Exchange code for token with client secret
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier
          }).toString()
        });

        const tokens = await tokenResponse.json();
        console.log('📥 Token response:', { hasAccessToken: !!tokens.access_token, error: tokens.error });

        if (tokens.error) {
          throw new Error(tokens.error_description || tokens.error);
        }

        if (!tokens.access_token) {
          throw new Error('No access token received from Google');
        }

        // Store tokens
        localStorage.setItem('google_oauth_tokens', JSON.stringify({
          ...tokens,
          expires_at: Date.now() + (tokens.expires_in * 1000)
        }));

        // Also store in the old format for compatibility
        localStorage.setItem('google_mvp_tokens', JSON.stringify({
          ...tokens,
          expires_at: Date.now() + (tokens.expires_in * 1000)
        }));

        // Clean up OAuth state
        localStorage.removeItem('pkce_code_verifier');
        localStorage.removeItem('google_oauth_code_verifier');
        localStorage.removeItem('google_oauth_state');
        localStorage.removeItem('oauth_state');

        console.log('✅ Google OAuth successful! Redirecting to integrations...');

        // Notify parent window if opened in popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_SUCCESS',
            data: { tokenResponse: tokens }
          }, window.location.origin);
          window.close();
        } else {
          // Redirect to integrations
          navigate('/integrations', { replace: true });
        }
      } catch (error) {
        console.error('❌ OAuth error:', error);
        alert(`OAuth failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        navigate('/integrations', { replace: true });
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          margin: '0 auto 20px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Connecting...</h2>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
