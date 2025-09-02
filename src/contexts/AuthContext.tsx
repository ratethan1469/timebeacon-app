import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { sessionManager } from '../services/sessionManager';
import { routingService } from '../services/routing';
import { AuthState, LoginRequest, User, Company } from '../types/auth';
import apiService from '../services/apiService';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkPermission: (resource: string, action: string) => boolean;
  currentRoute: { accountId?: string; visitorId?: string } | null;
  refreshSession: () => void;
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
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    company: null,
    isAuthenticated: false,
    isLoading: true,
    permissions: [],
  });
  const [currentRoute, setCurrentRoute] = useState<{ accountId?: string; visitorId?: string } | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    // Update route params when URL changes
    const params = routingService.extractRouteParams();
    setCurrentRoute(params);
  }, [window.location.pathname]);

  const initializeAuth = () => {
    try {
      // Use secure session manager
      const session = sessionManager.getSession();
      
      if (session && sessionManager.isSessionValid()) {
        const permissions = session.user.permissions || [];
        
        setAuthState({
          user: session.user,
          company: session.company,
          isAuthenticated: true,
          isLoading: false,
          permissions,
        });
      } else {
        // Clear invalid session
        sessionManager.clearSession();
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      sessionManager.clearSession();
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await apiService.login(email, password);
      
      // Store session securely
      sessionManager.setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
        company: response.company,
        expiresIn: response.expiresIn,
      });
      
      const permissions = response.user.permissions || [];
      
      const newState: AuthState = {
        user: response.user,
        company: response.company,
        isAuthenticated: true,
        isLoading: false,
        permissions,
      };
      
      setAuthState(newState);

      // Don't redirect here, let the login component handle navigation
      // routingService.redirectToUserContext(response.company, response.user);
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    sessionManager.clearSession();
    setAuthState({
      user: null,
      company: null,
      isAuthenticated: false,
      isLoading: false,
      permissions: [],
    });
    setCurrentRoute(null);
    
    // Redirect to login
    window.location.href = '/login';
  };

  const checkPermission = (resource: string, action: string): boolean => {
    if (!authState.user) return false;
    return authService.hasPermission(authState.permissions, resource, action, authState.user.id);
  };

  const refreshSession = () => {
    sessionManager.refreshActivity();
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    checkPermission,
    currentRoute,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};