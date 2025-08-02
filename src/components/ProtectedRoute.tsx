import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

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

  // For demo purposes, create a temporary user if none exists
  if (!user) {
    // Check if we have a stored user
    const storedUser = localStorage.getItem('timebeacon_user');
    if (!storedUser) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;