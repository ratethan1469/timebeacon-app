import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const { accountId, visitorId } = useParams();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    const storedUser = localStorage.getItem('timebeacon_user');
    if (!storedUser) {
      return <Navigate to="/login" replace />;
    }
  }

  // Validate route params against user data
  if (accountId && visitorId && user) {
    const userData = typeof user === 'string' ? JSON.parse(user) : user;

    // Redirect if company_id doesn't match accountId in URL
    if (userData.company_id && userData.company_id !== accountId) {
      const correctPath = window.location.pathname.replace(`/${accountId}/`, `/${userData.company_id}/`);
      return <Navigate to={correctPath} replace />;
    }

    // Redirect if user.id doesn't match visitorId in URL
    if (userData.id && userData.id !== visitorId) {
      const correctPath = window.location.pathname.replace(`/${visitorId}/`, `/${userData.id}/`);
      return <Navigate to={correctPath} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;