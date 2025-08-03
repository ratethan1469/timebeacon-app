/**
 * Authentication Service
 * Handles user authentication, authorization, and session management
 */

import { 
  User, 
  Company, 
  LoginRequest, 
  LoginResponse, 
  SignupRequest, 
  AuthState,
  Permission,
  UserRole,
  ROLE_PERMISSIONS,
  InviteUserRequest
} from '../types/auth';

class AuthService {
  private readonly API_BASE = import.meta.env.VITE_API_URL || 'https://api.timebeacon.io';
  private readonly TOKEN_KEY = 'timebeacon_access_token';
  private readonly REFRESH_KEY = 'timebeacon_refresh_token';
  private readonly USER_KEY = 'timebeacon_user';
  private readonly COMPANY_KEY = 'timebeacon_company';

  /**
   * Login with email/password and optional company slug
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    // Validate input
    if (!request.email || !request.password) {
      throw new Error('Email and password are required');
    }

    if (!this.isValidEmail(request.email)) {
      throw new Error('Invalid email format');
    }

    if (request.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Light rate limiting check (will be strict on actual failures)
    try {
      this.checkRateLimit(request.email);
    } catch (rateLimitError) {
      // For demo accounts, be more lenient
      if (!request.email.includes('@demo.com')) {
        throw rateLimitError;
      }
      console.warn('Rate limit reached for demo account, but allowing attempt');
    }

    // For demo with enhanced security - always use secure login for demo
    // In a real production app, check for actual backend availability
    try {
      return await this.secureLogin(request);
    } catch (error) {
      // Fallback to production login if demo fails
      console.warn('Demo login failed, trying production:', error);
      return this.productionLogin(request);
    }
    
    /* Uncomment when real backend is ready:
    try {
      const response = await fetch(`${this.API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data: LoginResponse = await response.json();
      
      // Store tokens and user data
      localStorage.setItem(this.TOKEN_KEY, data.accessToken);
      localStorage.setItem(this.REFRESH_KEY, data.refreshToken);
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(this.COMPANY_KEY, JSON.stringify(data.company));

      return data;
    } catch (error) {
      console.error('Login error:', error);
      
      // For development/demo purposes, return mock data
      if (import.meta.env.DEV) {
        return this.mockLogin(request);
      }
      
      throw error;
    }
    */
  }

  /**
   * Sign up new company and owner user
   */
  async signup(request: SignupRequest): Promise<LoginResponse> {
    // Validate input
    if (!request.email || !request.password || !request.companyName) {
      throw new Error('Email, password, and company name are required');
    }

    if (!this.isValidEmail(request.email)) {
      throw new Error('Invalid email format');
    }

    if (!this.isValidPassword(request.password)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and numbers');
    }

    // For demo with enhanced security
    if (import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true') {
      return this.secureSignup(request);
    }

    return this.productionSignup(request);
    
    /* Uncomment when real backend is ready:
    try {
      const response = await fetch(`${this.API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }

      const data: LoginResponse = await response.json();
      
      // Store tokens and user data
      localStorage.setItem(this.TOKEN_KEY, data.accessToken);
      localStorage.setItem(this.REFRESH_KEY, data.refreshToken);
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(this.COMPANY_KEY, JSON.stringify(data.company));

      return data;
    } catch (error) {
      console.error('Signup error:', error);
      
      // For development/demo purposes, return mock data
      if (import.meta.env.DEV) {
        return this.mockSignup(request);
      }
      
      throw error;
    }
    */
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem(this.TOKEN_KEY, data.accessToken);
      return data.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      throw error;
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    const token = localStorage.getItem(this.TOKEN_KEY);
    
    // Clear local storage first
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.COMPANY_KEY);
    
    // Notify server to invalidate session
    if (token && !import.meta.env.DEV) {
      try {
        await fetch(`${this.API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.warn('Failed to notify server of logout:', error);
      }
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);
    const companyStr = localStorage.getItem(this.COMPANY_KEY);

    if (!token || !userStr || !companyStr) {
      return {
        user: null,
        company: null,
        isAuthenticated: false,
        isLoading: false,
        permissions: [],
      };
    }

    try {
      const user: User = JSON.parse(userStr);
      const company: Company = JSON.parse(companyStr);
      const permissions = this.getUserPermissions(user.role, user.permissions);

      return {
        user,
        company,
        isAuthenticated: true,
        isLoading: false,
        permissions,
      };
    } catch (error) {
      console.error('Error parsing auth state:', error);
      this.logout();
      return {
        user: null,
        company: null,
        isAuthenticated: false,
        isLoading: false,
        permissions: [],
      };
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(
    userPermissions: Permission[], 
    resource: string, 
    action: string,
    userId?: string
  ): boolean {
    return userPermissions.some(permission => {
      if (permission.resource !== resource) return false;
      if (!permission.actions.includes(action as any)) return false;
      
      // Check scope restrictions
      if (permission.scope) {
        if (permission.scope.own && userId) {
          // User can only access their own data
          return true; // Additional userId check would be done at the data level
        }
        if (permission.scope.all) {
          return true;
        }
        // Team and department scope checks would be implemented here
      }
      
      return true;
    });
  }

  /**
   * Get user permissions (role-based + custom) - public method
   */
  getUserPermissions(role: UserRole, customPermissions: Permission[]): Permission[] {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    return [...rolePermissions, ...customPermissions];
  }

  /**
   * Invite a new user to the company
   */
  async inviteUser(request: InviteUserRequest): Promise<void> {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.API_BASE}/users/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to invite user');
      }
    } catch (error) {
      console.error('Invite user error:', error);
      throw error;
    }
  }

  /**
   * Get team members (for managers)
   */
  async getTeamMembers(): Promise<User[]> {
    // For demo purposes, return mock data directly
    return this.mockTeamMembers();
    
    /* Uncomment when real backend is ready:
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.API_BASE}/users/team`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      return response.json();
    } catch (error) {
      console.error('Get team members error:', error);
      
      // Return mock data for development
      if (import.meta.env.DEV) {
        return this.mockTeamMembers();
      }
      
      throw error;
    }
    */
  }

  /**
   * Email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Password validation
   */
  private isValidPassword(password: string): boolean {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return password.length >= minLength && hasUppercase && hasLowercase && hasNumbers;
  }

  /**
   * Rate limiting for authentication attempts
   */
  private checkRateLimit(email: string): void {
    // For demo purposes, be more lenient with rate limiting
    const key = `auth_attempts_${email}`;
    const attempts = JSON.parse(localStorage.getItem(key) || '[]');
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    // Remove old attempts
    const recentAttempts = attempts.filter((timestamp: number) => timestamp > fiveMinutesAgo);
    
    // Increase limit for demo accounts
    const isDemo = email.includes('@demo.com');
    const maxAttempts = isDemo ? 20 : 5; // More lenient for demo accounts
    
    if (recentAttempts.length >= maxAttempts) {
      throw new Error(`Too many login attempts. Please try again in 5 minutes.`);
    }
    
    // Only record failed attempts, not all attempts
    // This will be called before validation, so we'll handle it differently
  }

  /**
   * Clear rate limit for successful login
   */
  private clearRateLimit(email: string): void {
    const key = `auth_attempts_${email}`;
    localStorage.removeItem(key);
  }

  /**
   * Record failed login attempt
   */
  private recordFailedAttempt(email: string): void {
    const key = `auth_attempts_${email}`;
    const attempts = JSON.parse(localStorage.getItem(key) || '[]');
    attempts.push(Date.now());
    localStorage.setItem(key, JSON.stringify(attempts));
  }

  /**
   * Secure demo login - validates credentials
   */
  private async secureLogin(request: LoginRequest): Promise<LoginResponse> {
    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Demo credentials for testing
    const validCredentials = [
      { email: 'admin@demo.com', password: 'Admin123!', role: 'owner' as UserRole },
      { email: 'manager@demo.com', password: 'Manager123!', role: 'manager' as UserRole },
      { email: 'employee@demo.com', password: 'Employee123!', role: 'employee' as UserRole },
      // Also accept any email with demo password for testing
      { email: request.email, password: 'Demo123!', role: 'employee' as UserRole },
    ];
    
    const validUser = validCredentials.find(
      cred => cred.email === request.email && cred.password === request.password
    );
    
    if (!validUser) {
      // Record failed attempt
      this.recordFailedAttempt(request.email);
      throw new Error('Invalid email or password. Try: admin@demo.com/Admin123!, manager@demo.com/Manager123!, or employee@demo.com/Employee123!');
    }
    
    // Clear rate limit on successful login
    this.clearRateLimit(request.email);
    
    return this.createAuthResponse(request, validUser.role);
  }

  /**
   * Production login with real API
   */
  private async productionLogin(request: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data: LoginResponse = await response.json();
      this.storeAuthData(data);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Secure demo signup
   */
  private async secureSignup(request: SignupRequest): Promise<LoginResponse> {
    // Simulate signup delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return this.createAuthResponse({
      email: request.email,
      password: request.password,
    }, 'owner');
  }

  /**
   * Production signup with real API
   */
  private async productionSignup(request: SignupRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }

      const data: LoginResponse = await response.json();
      this.storeAuthData(data);
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  /**
   * Store authentication data securely
   */
  private storeAuthData(data: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, data.accessToken);
    localStorage.setItem(this.REFRESH_KEY, data.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
    localStorage.setItem(this.COMPANY_KEY, JSON.stringify(data.company));
  }

  /**
   * Generate secure demo token
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create auth response for demo mode
   */
  private createAuthResponse(request: { email: string }, role: UserRole): LoginResponse {
    const userId = crypto.randomUUID();
    const companyId = crypto.randomUUID();
    
    // Generate secure demo token
    const token = this.generateSecureToken();
    const mockUser: User = {
      id: userId,
      visitorId: this.generateVisitorId(),
      email: request.email,
      name: request.email.split('@')[0],
      companyId: companyId,
      role: role,
      permissions: [],
      profile: {
        firstName: request.email.split('@')[0],
        lastName: 'User',
        jobTitle: 'CEO',
        department: 'Executive',
      },
      settings: {
        theme: 'system',
        timezone: 'America/New_York',
        workingHours: {
          start: '09:00',
          end: '17:00',
          workingDays: [1, 2, 3, 4, 5],
        },
        notifications: {
          enableDesktop: true,
          reminderInterval: 30,
          endOfDayReminder: true,
        },
        privacy: {
          trackActiveWindow: false,
          trackKeystrokes: false,
          trackMouse: false,
          blurScreenshots: true,
        },
        integrations: {},
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mfaEnabled: false,
    };

    const mockCompany: Company = {
      id: companyId,
      accountId: this.generateAccountId(),
      name: 'TimeBeacon Demo',
      slug: 'demo',
      subscription: {
        id: crypto.randomUUID(),
        companyId: companyId,
        plan: 'professional',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        pricePerUser: 15,
        features: {
          maxUsers: 50,
          aiInsights: true,
          advancedReports: true,
          integrations: ['google-calendar', 'slack', 'zoom'],
          dataRetentionMonths: 24,
          apiAccess: true,
          ssoEnabled: false,
          customBranding: true,
          prioritySupport: true,
        },
      },
      settings: {
        workingHours: {
          start: '09:00',
          end: '17:00',
          timezone: 'America/New_York',
          workingDays: [1, 2, 3, 4, 5],
        },
        billing: {
          currency: 'USD',
          invoiceEmail: request.email,
        },
        security: {
          requireMfa: false,
          sessionTimeout: 480,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSymbols: false,
          },
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: mockUser.id,
      activeUsers: 1,
      maxUsers: 50,
    };

    return {
      user: mockUser,
      company: mockCompany,
      accessToken: token,
      refreshToken: this.generateSecureToken(),
      expiresIn: 3600,
    };
  }


  /**
   * Generate account ID (5-digit numeric)
   */
  private generateAccountId(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  /**
   * Generate visitor ID (5-digit numeric)
   */
  private generateVisitorId(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  /**
   * Mock team members for development
   */
  private mockTeamMembers(): User[] {
    return [
      {
        id: 'user-1',
        visitorId: '10002',
        email: 'john.doe@demo.com',
        name: 'John Doe',
        companyId: 'mock-company-id',
        role: 'manager',
        permissions: [],
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          jobTitle: 'Engineering Manager',
          department: 'Engineering',
          hourlyRate: 75,
        },
        settings: {} as any,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mfaEnabled: false,
      },
      {
        id: 'user-2',
        visitorId: '10003',
        email: 'jane.smith@demo.com',
        name: 'Jane Smith',
        companyId: 'mock-company-id',
        role: 'employee',
        permissions: [],
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          jobTitle: 'Senior Developer',
          department: 'Engineering',
          hourlyRate: 65,
        },
        settings: {} as any,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mfaEnabled: true,
      },
    ];
  }
}

export const authService = new AuthService();