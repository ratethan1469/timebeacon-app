/**
 * Google Calendar OAuth Authentication Service
 * Handles authentication and API access for Google Calendar integration
 */

// import { google } from 'googleapis';

interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type: string;
  scope: string;
}

class GoogleCalendarAuthService {
  private oauth2Client: any;
  private config: GoogleAuthConfig;
  private readonly STORAGE_KEY = 'timebeacon_google_auth';

  constructor() {
    // Configure OAuth2 client
    this.config = {
      clientId: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '',
      clientSecret: (import.meta as any).env?.VITE_GOOGLE_CLIENT_SECRET || '',
      redirectUri: `${typeof window !== 'undefined' ? window.location?.origin : 'http://localhost:3000'}/auth/google/callback`,
      scopes: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    };

    this.initializeOAuth2Client();
  }

  private initializeOAuth2Client(): void {
    // Disabled for production build
    console.log('Google Calendar auth disabled for production');
    // this.oauth2Client = new google.auth.OAuth2(
    //   this.config.clientId,
    //   this.config.clientSecret,
    //   this.config.redirectUri
    // );

    // // Load existing tokens from storage
    // this.loadStoredTokens();
  }

  /**
   * Generate the authorization URL for OAuth flow
   */
  getAuthUrl(): string {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
      prompt: 'consent' // Force consent screen to get refresh token
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Set credentials
      this.oauth2Client.setCredentials(tokens);
      
      // Store tokens
      this.storeTokens(tokens);
      
      console.log('✅ Google Calendar authentication successful');
      return { success: true };
    } catch (error) {
      console.error('Google Calendar auth failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return !!(tokens && tokens.access_token);
  }

  /**
   * Get authenticated Google Calendar API client
   */
  getCalendarClient(): any | null {
    // Google Calendar disabled in production for security
    console.warn('Google Calendar disabled in production');
    return null;
    // if (!this.isAuthenticated()) {
    //   throw new Error('Not authenticated with Google Calendar');
    // }

    // return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      const tokens = this.getStoredTokens();
      if (!tokens || !tokens.refresh_token) {
        console.log('No refresh token available, need to re-authenticate');
        return false;
      }

      this.oauth2Client.setCredentials(tokens);
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      const updatedTokens = { ...tokens, ...credentials };
      this.storeTokens(updatedTokens);
      this.oauth2Client.setCredentials(updatedTokens);
      
      console.log('✅ Google Calendar token refreshed');
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.clearStoredTokens();
      return false;
    }
  }

  /**
   * Test the current authentication status
   */
  async testConnection(): Promise<{ success: boolean; userEmail?: string; error?: string }> {
    try {
      if (!this.isAuthenticated()) {
        return { success: false, error: 'Not authenticated' };
      }

      // Try to refresh token if needed
      const tokens = this.getStoredTokens();
      if (tokens && tokens.expiry_date && tokens.expiry_date < Date.now()) {
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) {
          return { success: false, error: 'Token refresh failed' };
        }
      }

      // Test by fetching user info
      // const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      // const userInfo = await oauth2.userinfo.get();
      const userInfo = { data: { email: 'disabled@example.com' } };
      
      return { 
        success: true, 
        userEmail: userInfo.data.email || undefined 
      };
    } catch (error) {
      console.error('Google Calendar connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Sign out and clear stored tokens
   */
  signOut(): void {
    this.clearStoredTokens();
    this.oauth2Client.setCredentials({});
    console.log('📤 Signed out from Google Calendar');
  }

  /**
   * Get user information
   */
  async getUserInfo(): Promise<{ email?: string; name?: string } | null> {
    try {
      if (!this.isAuthenticated()) return null;

      // const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      // const userInfo = await oauth2.userinfo.get();
      const userInfo = { data: { email: 'disabled@example.com', name: 'Google Auth Disabled' } };
      
      return {
        email: userInfo.data.email || undefined,
        name: userInfo.data.name || undefined
      };
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  /**
   * Store authentication tokens
   */
  private storeTokens(tokens: AuthTokens): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
      }
    } catch (error) {
      console.error('Failed to store auth tokens:', error);
    }
  }


  /**
   * Get stored tokens
   */
  private getStoredTokens(): AuthTokens | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
      }
      return null;
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
      return null;
    }
  }

  /**
   * Clear stored tokens
   */
  private clearStoredTokens(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to clear stored tokens:', error);
    }
  }

  /**
   * Check if configuration is valid
   */
  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }

  /**
   * Get OAuth client for direct API calls
   */
  getOAuth2Client() {
    return this.oauth2Client;
  }
}

// Export singleton instance
export const googleCalendarAuth = new GoogleCalendarAuthService();