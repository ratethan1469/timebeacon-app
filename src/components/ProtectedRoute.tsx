import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isSignedIn, isLoaded, user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to login if not authenticated (after loading completes)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Save the attempted URL to redirect back after login
      const returnUrl = location.pathname + location.search;
      navigate('/login', {
        replace: true,
        state: { returnUrl }
      });
    }
  }, [isSignedIn, isLoaded, navigate, location]);

  // Show loading state while Clerk initializes
  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: 'var(--text-secondary)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span>Verifying authentication...</span>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isSignedIn) {
    return null;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
};

export default ProtectedRoute;
