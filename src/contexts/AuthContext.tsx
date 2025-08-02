import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { routingService } from '../services/routing';
import { AuthState, LoginRequest, User, Company } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkPermission: (resource: string, action: string) => boolean;
  currentRoute: { accountId?: string; visitorId?: string } | null;
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
      const state = authService.getAuthState();
      setAuthState(state);

      // Skip complex routing validation for now to prevent issues
      // Just set loading to false
      setAuthState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Extract route params for context
      const routeParams = routingService.extractRouteParams();
      
      const loginRequest: LoginRequest = {
        email,
        password,
        accountId: routeParams?.accountId,
        visitorId: routeParams?.visitorId,
      };

      const response = await authService.login(loginRequest);
      
      const newState: AuthState = {
        user: response.user,
        company: response.company,
        isAuthenticated: true,
        isLoading: false,
        permissions: [...(response.user.permissions || [])],
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

  const logout = () => {
    authService.logout();
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

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    checkPermission,
    currentRoute,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};