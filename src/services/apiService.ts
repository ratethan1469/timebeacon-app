// API Service for connecting to MongoDB backend
const API_BASE_URL = 'http://localhost:3003/api';

// Store auth token
let authToken: string | null = localStorage.getItem('auth_token');

// API client with auth headers
const api = {
  // Company signup endpoint
  async signup(companyData: {
    companyName: string;
    companySlug: string;
    companyEmail: string;
    companyDomain?: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerFirstName: string;
    ownerLastName: string;
    plan?: string;
    billingInterval?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(companyData),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      authToken = data.token;
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      localStorage.setItem('company_data', JSON.stringify(data.company));
      localStorage.setItem('subscription_data', JSON.stringify(data.subscription));
    }
    
    return data;
  },

  // Auth endpoints
  async login(email: string, password: string, companySlug?: string) {
    console.log('Attempting login to:', `${API_BASE_URL}/auth/login`);
    console.log('With credentials:', { email, password: '***' });
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, companySlug }),
    });
    
    console.log('Login response status:', response.status);
    
    const data = await response.json();
    
    if (response.ok) {
      authToken = data.token;
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      // Transform response to match frontend expectations
      return {
        accessToken: data.token,
        refreshToken: data.token, // Using same token for now
        user: data.user,
        company: {
          id: data.user.companyId,
          name: data.user.companyName,
          slug: data.user.companySlug,
        },
        expiresIn: '7d'
      };
    }
    
    if (response.status === 401) {
      throw new Error('Invalid email or password');
    }
    
    throw new Error(data.error || data.message || 'Login failed');
  },

  async logout() {
    if (authToken) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
    }
    
    authToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  },

  async getCurrentUser() {
    if (!authToken) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    return await response.json();
  },

  // Get available subscription plans
  async getPlans() {
    const response = await fetch(`${API_BASE_URL}/auth/plans`);
    return await response.json();
  },

  // AI Control Center endpoints
  async getAIControlSettings() {
    if (!authToken) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/ai-control/settings`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    return await response.json();
  },

  async updateAIControlSettings(settings: any) {
    if (!authToken) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/ai-control/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    return await response.json();
  },

  async getAIStatus() {
    if (!authToken) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/ai-control/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    return await response.json();
  },

  async testAI() {
    if (!authToken) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/ai-control/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    return await response.json();
  },
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!authToken && !!localStorage.getItem('user_data');
};

// Get current user from localStorage
export const getCurrentUserFromStorage = () => {
  const userData = localStorage.getItem('user_data');
  return userData ? JSON.parse(userData) : null;
};

export default api;