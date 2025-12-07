import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useSignIn, SignInButton } from '@clerk/clerk-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn, user, isLoaded } = useUser();

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Check if user has company metadata
      const metadata = user.publicMetadata as { company_id?: string };
      const companyId = metadata?.company_id;

      if (companyId) {
        navigate(`/${companyId}/${user.id}/dashboard`, { replace: true });
      } else {
        // User needs to accept invite or create company
        navigate('/accept-invite', { replace: true });
      }
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  // Show loading state while Clerk initializes
  if (!isLoaded) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>
          Loading...
        </div>
      </div>
    );
  }

  // Don't render login form if already signed in
  if (isSignedIn) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
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
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#2d3748',
          }}>
            ⏰ TimeBeacon
          </h1>
          <p style={{
            margin: 0,
            color: '#718096',
            fontSize: '14px',
          }}>
            Professional Time Tracking
          </p>
        </div>

        {/* Sign In Section */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: '600',
            color: '#2d3748'
          }}>
            Welcome Back
          </h2>
          <p style={{
            margin: 0,
            color: '#718096',
            fontSize: '14px'
          }}>
            Sign in to your account to continue
          </p>
        </div>

        {/* Clerk Sign In Button */}
        <SignInButton mode="modal" redirectUrl="/accept-invite">
          <button style={{
            width: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '14px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '16px'
          }}>
            Sign In
          </button>
        </SignInButton>

        {/* Sign Up Link */}
        <div style={{
          fontSize: '12px',
          color: '#718096',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0',
          marginTop: '24px',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 12px 0' }}>
            Don't have an account?{' '}
            <a href="/signup" style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '500'
            }}>
              Create one
            </a>
          </p>
          <p style={{ margin: 0 }}>
            By signing in, you agree to our{' '}
            <a href="/terms" style={{ color: '#667eea', textDecoration: 'none' }}>
              Terms
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

export default Login;
