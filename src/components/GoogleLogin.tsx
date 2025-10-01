import React, { useEffect } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

export const GoogleLogin: React.FC = () => {
  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: '696202687856-c82e7prqdt00og14k6lp47hiutn7p9an.apps.googleusercontent.com',
          callback: handleCredentialResponse,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            width: 350,
            text: 'signin_with'
          }
        );
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = (response: any) => {
    // Decode the JWT token to get user info
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    
    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };

    // Store user data
    localStorage.setItem('timebeacon_token', response.credential);
    localStorage.setItem('timebeacon_user', JSON.stringify(user));

    // Trigger auth update
    window.dispatchEvent(new CustomEvent('auth-change'));
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '28px', 
            fontWeight: '700',
            color: '#2d3748' 
          }}>
            ⏰ TimeBeacon
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#718096', 
            fontSize: '14px' 
          }}>
            Professional Time Tracking
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '24px', 
            fontWeight: '600',
            color: '#2d3748' 
          }}>
            Welcome
          </h2>
          <p style={{ 
            margin: 0, 
            color: '#718096', 
            fontSize: '14px' 
          }}>
            Sign in with your Google account to continue
          </p>
        </div>

        <div id="google-signin-button" style={{ 
          display: 'flex', 
          justifyContent: 'center',
          marginBottom: '24px'
        }}></div>

        <div style={{
          fontSize: '12px',
          color: '#718096',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <p style={{ margin: 0 }}>
            By signing in, you agree to our{' '}
            <a href="/terms" style={{ color: '#667eea', textDecoration: 'none' }}>
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" style={{ color: '#667eea', textDecoration: 'none' }}>
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};