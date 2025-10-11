import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const checkAuth = () => {
    try {
      const token = localStorage.getItem('timebeacon_token');
      const userData = localStorage.getItem('timebeacon_user');

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('timebeacon_token');
      localStorage.removeItem('timebeacon_user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  // Redirect authenticated users away from login page
  useEffect(() => {
    // Don't redirect if login page shows "expired" reason (user just got logged out)
    const urlParams = new URLSearchParams(window.location.search);
    const reason = urlParams.get('reason');

    if (!isLoading && user && window.location.pathname === '/login' && reason !== 'expired') {
      // Get user data with company_id
      const userData = typeof user === 'string' ? JSON.parse(user) : user;

      if (userData.company_id && userData.id) {
        // Redirect to multi-tenant dashboard
        navigate(`/${userData.company_id}/${userData.id}/dashboard`);
      } else {
        // Fallback to simple dashboard
        navigate('/dashboard');
      }
    }
  }, [user, isLoading, navigate]);

  const logout = () => {
    localStorage.removeItem('timebeacon_token');
    localStorage.removeItem('timebeacon_user');
    localStorage.removeItem('timebeacon_remember');
    setUser(null);
    navigate('/login');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};