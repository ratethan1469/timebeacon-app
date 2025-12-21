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
        // Get code verifier from session
        const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
        if (!codeVerifier) {
          throw new Error('Code verifier not found');
        }

        // Exchange code for token (without client secret, PKCE only)
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            redirect_uri: `${window.location.origin}/auth/google/callback`,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier
          }).toString()
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
          throw new Error(tokens.error_description || tokens.error);
        }

        // Store tokens
        localStorage.setItem('google_mvp_tokens', JSON.stringify({
          ...tokens,
          expires_at: Date.now() + (tokens.expires_in * 1000)
        }));

        // Clean up
        sessionStorage.removeItem('pkce_code_verifier');
        sessionStorage.removeItem('oauth_state');

        console.log('✅ Google OAuth successful!');

        // Redirect to integrations
        navigate('/integrations', { replace: true });
      } catch (error) {
        console.error('OAuth error:', error);
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
