import React from 'react';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser
} from '@clerk/clerk-react';

const publishableKey = 'pk_test_Y29tcGxldGUtc2hhcmstMjEuY2xlcmsuYWNjb3VudHMuZGV2JA';

function AuthenticatedApp() {
  const { user } = useUser();
  
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Welcome to TimeBeacon, {user?.firstName}!</h1>
      <p>You're successfully logged in with {user?.primaryEmailAddress?.emailAddress}</p>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}

function AuthPage() {
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
            Get Started
          </h2>
          <p style={{ 
            margin: 0, 
            color: '#718096', 
            fontSize: '14px' 
          }}>
            Sign in or create an account to continue
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SignInButton mode="modal">
            <button style={{
              width: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Sign In
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button style={{
              width: '100%',
              background: 'transparent',
              color: '#667eea',
              border: '2px solid #667eea',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Create Account
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  );
}

export function ClerkAuth() {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <SignedOut>
        <AuthPage />
      </SignedOut>
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
    </ClerkProvider>
  );
}