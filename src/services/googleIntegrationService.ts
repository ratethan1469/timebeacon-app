/**
 * Google API Integration Service for TimeBeacon
 * 
 * Production-ready service that handles OAuth 2.0 authentication and API calls
 * to Google Drive, Gmail, and Calendar APIs with comprehensive error handling.
 * 
 * Features:
 * - Secure OAuth 2.0 flow implementation
 * - Environment variable validation and sanitization
 * - Comprehensive API testing with detailed error messages
 * - Type-safe interfaces and error handling
 * - Production logging and monitoring
 */

import DOMPurify from 'isomorphic-dompurify';

// ========================================
// TYPES AND INTERFACES
// ========================================

/**
 * Configuration interface for Google API credentials
 */
interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiKey?: string;
}

/**
 * OAuth 2.0 token response interface
 */
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * API test result interface
 */
interface ApiTestResult {
  status: 'success' | 'error';
  service: 'Drive' | 'Gmail' | 'Calendar';
  details: any;
  timestamp: string;
  executionTimeMs: number;
}

/**
 * Integration validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Google API service response interfaces
 */
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
}

// ========================================
// CONSTANTS AND CONFIGURATION
// ========================================

/**
 * Required OAuth 2.0 scopes for TimeBeacon integration
 */
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/gmail.readonly', 
  'https://www.googleapis.com/auth/calendar'
] as const;

/**
 * Google API base URLs
 */
const API_ENDPOINTS = {
  OAUTH: 'https://accounts.google.com/o/oauth2/v2/auth',
  TOKEN: 'https://oauth2.googleapis.com/token',
  DRIVE: 'https://www.googleapis.com/drive/v3',
  GMAIL: 'https://www.googleapis.com/gmail/v1',
  CALENDAR: 'https://www.googleapis.com/calendar/v3'
} as const;

/**
 * Timeout configurations (in milliseconds)
 */
const TIMEOUTS = {
  API_CALL: 10000,
  TOKEN_EXCHANGE: 5000
} as const;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Sanitizes and validates environment variables
 * @param value - Raw environment variable value
 * @param name - Variable name for error reporting
 * @returns Sanitized string
 */
function sanitizeEnvVar(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  
  // Remove any HTML/script tags and trim whitespace
  const sanitized = DOMPurify.sanitize(value.trim(), { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  });
  
  if (!sanitized) {
    throw new Error(`Invalid or empty environment variable: ${name}`);
  }
  
  return sanitized;
}

/**
 * Validates URL format for redirect URIs
 * @param url - URL to validate
 * @returns Boolean indicating if URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

/**
 * Creates a secure random state parameter for OAuth
 * @returns Random state string
 */
function generateSecureState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Logs API calls for monitoring and debugging
 * @param service - Service name
 * @param operation - Operation performed
 * @param success - Whether operation succeeded
 * @param details - Additional details
 */
function logApiCall(service: string, operation: string, success: boolean, details?: any): void {
  const timestamp = new Date().toISOString();
  const logLevel = success ? 'INFO' : 'ERROR';
  
  console.log(`[${timestamp}] ${logLevel}: Google ${service} API - ${operation}`, {
    success,
    details: details ? JSON.stringify(details, null, 2) : 'No additional details'
  });
}

// ========================================
// MAIN INTEGRATION CLASS
// ========================================

export class GoogleIntegrationService {
  private config: GoogleConfig;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiry?: Date;

  constructor() {
    this.config = this.loadAndValidateConfig();
  }

  // ========================================
  // CONFIGURATION AND VALIDATION
  // ========================================

  /**
   * Loads and validates Google API configuration from environment variables
   * @returns Validated Google configuration
   */
  private loadAndValidateConfig(): GoogleConfig {
    try {
      console.log('🔧 Loading Google API configuration...');
      
      // Get configuration from environment or throw error
      const config: GoogleConfig = {
        clientId: sanitizeEnvVar(import.meta.env?.VITE_GOOGLE_CLIENT_ID, 'VITE_GOOGLE_CLIENT_ID'),
        clientSecret: sanitizeEnvVar(import.meta.env?.VITE_GOOGLE_CLIENT_SECRET, 'VITE_GOOGLE_CLIENT_SECRET'),
        redirectUri: sanitizeEnvVar(import.meta.env?.VITE_GOOGLE_REDIRECT_URI, 'VITE_GOOGLE_REDIRECT_URI'),
        apiKey: import.meta.env?.VITE_GOOGLE_API_KEY as string
      };

      // Basic validation
      if (!config.clientId || !config.clientSecret || !config.redirectUri) {
        throw new Error('Invalid Google API configuration');
      }

      console.log('✅ Configuration loaded successfully');
      return config;
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * Validates the current configuration against Google Cloud Console requirements
   * @returns Validation result with errors and warnings
   */
  public async validateConfiguration(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    console.log('🔍 Validating Google API configuration...');

    try {
      // Validate Client ID format
      if (!this.config.clientId.match(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/)) {
        result.errors.push('Invalid Client ID format. Should end with .apps.googleusercontent.com');
        result.isValid = false;
      }

      // Validate Client Secret format
      if (this.config.clientSecret.length < 20) {
        result.errors.push('Client Secret appears to be invalid (too short)');
        result.isValid = false;
      }

      // Validate Redirect URI
      if (!isValidUrl(this.config.redirectUri)) {
        result.errors.push(`Invalid redirect URI: ${this.config.redirectUri}. Must be HTTPS or localhost`);
        result.isValid = false;
      }

      // Check if redirect URI matches expected patterns
      const validRedirectPatterns = [
        /^https:\/\/app\.timebeacon\.io/,
        /^http:\/\/localhost:\d+/,
        /^https:\/\/[^.]+\.vercel\.app/,
        /^https:\/\/[^.]+\.render\.com/
      ];

      const isValidRedirect = validRedirectPatterns.some(pattern => 
        pattern.test(this.config.redirectUri)
      );

      if (!isValidRedirect) {
        result.warnings.push('Redirect URI may not match Google Cloud Console configuration');
      }

      // Warn about missing API key
      if (!this.config.apiKey) {
        result.warnings.push('No API key provided. Some features may require an API key for better rate limits');
      }

      console.log(result.isValid ? '✅ Configuration validation passed' : '❌ Configuration validation failed');
      
    } catch (error) {
      result.errors.push(`Configuration validation error: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  // ========================================
  // OAUTH 2.0 AUTHENTICATION
  // ========================================

  /**
   * Generates OAuth 2.0 authorization URL
   * @returns Authorization URL and state parameter
   */
  public generateAuthUrl(): { url: string; state: string } {
    console.log('🔐 Generating OAuth authorization URL...');
    
    const state = generateSecureState();
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: REQUIRED_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state
    });

    const url = `${API_ENDPOINTS.OAUTH}?${params.toString()}`;
    
    console.log('✅ Authorization URL generated');
    console.log('🔍 DEBUG - Redirect URI being used:', this.config.redirectUri);
    console.log('🔍 DEBUG - Full OAuth URL:', url);
    logApiCall('OAuth', 'generateAuthUrl', true, { state, redirectUri: this.config.redirectUri });
    
    return { url, state };
  }

  /**
   * Exchanges authorization code for access tokens
   * @param code - Authorization code from OAuth callback
   * @param state - State parameter for CSRF protection
   * @param expectedState - Expected state value
   * @returns Token response
   */
  public async exchangeCodeForTokens(
    code: string, 
    state: string, 
    expectedState: string
  ): Promise<TokenResponse> {
    console.log('🔄 Exchanging authorization code for tokens...');
    
    // Validate state parameter to prevent CSRF attacks
    if (state !== expectedState) {
      const error = 'Invalid state parameter. Possible CSRF attack.';
      logApiCall('OAuth', 'exchangeCodeForTokens', false, { error });
      throw new Error(error);
    }

    const startTime = Date.now();

    try {
      const tokenData = {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: DOMPurify.sanitize(code),
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri
      };

      const response = await fetch(API_ENDPOINTS.TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TimeBeacon/1.0'
        },
        body: new URLSearchParams(tokenData).toString(),
        signal: AbortSignal.timeout(TIMEOUTS.TOKEN_EXCHANGE)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error_description || `HTTP ${response.status}: ${response.statusText}`;
        
        logApiCall('OAuth', 'exchangeCodeForTokens', false, { 
          status: response.status, 
          error: errorMessage 
        });
        
        throw new Error(`Token exchange failed: ${errorMessage}`);
      }

      const tokenResponse: TokenResponse = await response.json();
      
      // Store tokens securely
      this.accessToken = tokenResponse.access_token;
      this.refreshToken = tokenResponse.refresh_token;
      this.tokenExpiry = new Date(Date.now() + (tokenResponse.expires_in * 1000));

      const executionTime = Date.now() - startTime;
      
      console.log('✅ Tokens exchanged successfully');
      logApiCall('OAuth', 'exchangeCodeForTokens', true, { 
        executionTimeMs: executionTime,
        expiresIn: tokenResponse.expires_in,
        hasRefreshToken: !!tokenResponse.refresh_token
      });

      return tokenResponse;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logApiCall('OAuth', 'exchangeCodeForTokens', false, { 
        error: error.message,
        executionTimeMs: executionTime
      });
      throw error;
    }
  }

  /**
   * Refreshes access token using refresh token
   * @returns New token response
   */
  public async refreshAccessToken(): Promise<TokenResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available. Re-authentication required.');
    }

    console.log('🔄 Refreshing access token...');
    const startTime = Date.now();

    try {
      const tokenData = {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      };

      const response = await fetch(API_ENDPOINTS.TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TimeBeacon/1.0'
        },
        body: new URLSearchParams(tokenData).toString(),
        signal: AbortSignal.timeout(TIMEOUTS.TOKEN_EXCHANGE)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error_description || `HTTP ${response.status}`;
        
        logApiCall('OAuth', 'refreshAccessToken', false, { 
          status: response.status, 
          error: errorMessage 
        });
        
        throw new Error(`Token refresh failed: ${errorMessage}`);
      }

      const tokenResponse: TokenResponse = await response.json();
      
      this.accessToken = tokenResponse.access_token;
      this.tokenExpiry = new Date(Date.now() + (tokenResponse.expires_in * 1000));

      const executionTime = Date.now() - startTime;
      
      console.log('✅ Access token refreshed successfully');
      logApiCall('OAuth', 'refreshAccessToken', true, { 
        executionTimeMs: executionTime,
        expiresIn: tokenResponse.expires_in
      });

      return tokenResponse;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logApiCall('OAuth', 'refreshAccessToken', false, { 
        error: error.message,
        executionTimeMs: executionTime
      });
      throw error;
    }
  }

  // ========================================
  // API TESTING METHODS
  // ========================================

  /**
   * Tests Google Drive API connectivity
   * @returns API test result
   */
  public async testDriveApi(): Promise<ApiTestResult> {
    const startTime = Date.now();
    console.log('🔍 Testing Google Drive API...');

    try {
      await this.ensureValidToken();
      
      const response = await fetch(`${API_ENDPOINTS.DRIVE}/files?pageSize=5&fields=files(id,name,mimeType,modifiedTime)`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': 'TimeBeacon/1.0'
        },
        signal: AbortSignal.timeout(TIMEOUTS.API_CALL)
      });

      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let suggestions: string[] = [];

        // Provide specific error handling and suggestions
        switch (response.status) {
          case 403:
            if (errorData?.error?.message?.includes('Drive API')) {
              errorMessage = 'Google Drive API is not enabled';
              suggestions.push('Enable the Google Drive API in Google Cloud Console');
              suggestions.push('Visit: https://console.cloud.google.com/apis/library/drive.googleapis.com');
            } else if (errorData?.error?.message?.includes('insufficient')) {
              errorMessage = 'Insufficient permissions for Drive API';
              suggestions.push('Ensure https://www.googleapis.com/auth/drive scope is requested');
              suggestions.push('Check OAuth consent screen configuration');
            }
            break;
          case 401:
            errorMessage = 'Invalid or expired access token';
            suggestions.push('Token may have expired - try re-authenticating');
            break;
          case 429:
            errorMessage = 'Drive API rate limit exceeded';
            suggestions.push('Implement exponential backoff retry logic');
            suggestions.push('Consider adding API key for higher quotas');
            break;
        }

        const result: ApiTestResult = {
          status: 'error',
          service: 'Drive',
          details: {
            error: errorMessage,
            suggestions,
            httpStatus: response.status,
            rawError: errorData
          },
          timestamp: new Date().toISOString(),
          executionTimeMs: executionTime
        };

        logApiCall('Drive', 'testDriveApi', false, result.details);
        return result;
      }

      const data = await response.json();
      const files: DriveFile[] = data.files || [];

      const result: ApiTestResult = {
        status: 'success',
        service: 'Drive',
        details: {
          message: `Successfully connected to Google Drive API`,
          filesFound: files.length,
          sampleFiles: files.slice(0, 3).map(f => ({
            name: f.name,
            type: f.mimeType,
            modified: f.modifiedTime
          }))
        },
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      };

      console.log('✅ Google Drive API test successful');
      logApiCall('Drive', 'testDriveApi', true, result.details);
      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const result: ApiTestResult = {
        status: 'error',
        service: 'Drive',
        details: {
          error: `Drive API test failed: ${error.message}`,
          suggestions: [
            'Check internet connectivity',
            'Verify Google Cloud Console project configuration',
            'Ensure valid access token'
          ]
        },
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      };

      logApiCall('Drive', 'testDriveApi', false, result.details);
      return result;
    }
  }

  /**
   * Tests Gmail API connectivity
   * @returns API test result
   */
  public async testGmailApi(): Promise<ApiTestResult> {
    const startTime = Date.now();
    console.log('📧 Testing Gmail API...');

    try {
      await this.ensureValidToken();
      
      const response = await fetch(`${API_ENDPOINTS.GMAIL}/users/me/messages?maxResults=5&q=in:inbox`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': 'TimeBeacon/1.0'
        },
        signal: AbortSignal.timeout(TIMEOUTS.API_CALL)
      });

      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let suggestions: string[] = [];

        switch (response.status) {
          case 403:
            if (errorData?.error?.message?.includes('Gmail API')) {
              errorMessage = 'Gmail API is not enabled';
              suggestions.push('Enable the Gmail API in Google Cloud Console');
              suggestions.push('Visit: https://console.cloud.google.com/apis/library/gmail.googleapis.com');
            } else {
              errorMessage = 'Insufficient permissions for Gmail API';
              suggestions.push('Ensure https://www.googleapis.com/auth/gmail.readonly scope is requested');
              suggestions.push('Check OAuth consent screen scopes');
            }
            break;
          case 401:
            errorMessage = 'Invalid or expired access token';
            suggestions.push('Re-authenticate to get fresh tokens');
            break;
          case 400:
            if (errorData?.error?.message?.includes('invalid query')) {
              errorMessage = 'Invalid Gmail query format';
              suggestions.push('Check Gmail API query syntax');
            }
            break;
        }

        const result: ApiTestResult = {
          status: 'error',
          service: 'Gmail',
          details: {
            error: errorMessage,
            suggestions,
            httpStatus: response.status,
            rawError: errorData
          },
          timestamp: new Date().toISOString(),
          executionTimeMs: executionTime
        };

        logApiCall('Gmail', 'testGmailApi', false, result.details);
        return result;
      }

      const data = await response.json();
      const messages: GmailMessage[] = data.messages || [];

      const result: ApiTestResult = {
        status: 'success',
        service: 'Gmail',
        details: {
          message: `Successfully connected to Gmail API`,
          messagesFound: messages.length,
          resultCount: data.resultSizeEstimate || 0
        },
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      };

      console.log('✅ Gmail API test successful');
      logApiCall('Gmail', 'testGmailApi', true, result.details);
      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const result: ApiTestResult = {
        status: 'error',
        service: 'Gmail',
        details: {
          error: `Gmail API test failed: ${error.message}`,
          suggestions: [
            'Check internet connectivity',
            'Verify Gmail API is enabled in Google Cloud Console',
            'Ensure proper OAuth scopes are granted'
          ]
        },
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      };

      logApiCall('Gmail', 'testGmailApi', false, result.details);
      return result;
    }
  }

  /**
   * Tests Google Calendar API connectivity
   * @returns API test result
   */
  public async testCalendarApi(): Promise<ApiTestResult> {
    const startTime = Date.now();
    console.log('📅 Testing Google Calendar API...');

    try {
      await this.ensureValidToken();
      
      // Get events from primary calendar for the next week
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch(
        `${API_ENDPOINTS.CALENDAR}/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `timeMax=${encodeURIComponent(timeMax)}&` +
        `maxResults=5&singleEvents=true&orderBy=startTime`, 
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'User-Agent': 'TimeBeacon/1.0'
          },
          signal: AbortSignal.timeout(TIMEOUTS.API_CALL)
        }
      );

      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let suggestions: string[] = [];

        switch (response.status) {
          case 403:
            if (errorData?.error?.message?.includes('Calendar API')) {
              errorMessage = 'Google Calendar API is not enabled';
              suggestions.push('Enable the Google Calendar API in Google Cloud Console');
              suggestions.push('Visit: https://console.cloud.google.com/apis/library/calendar.googleapis.com');
            } else {
              errorMessage = 'Insufficient permissions for Calendar API';
              suggestions.push('Ensure https://www.googleapis.com/auth/calendar scope is requested');
              suggestions.push('Check OAuth consent screen configuration');
            }
            break;
          case 401:
            errorMessage = 'Invalid or expired access token';
            suggestions.push('Token expired - re-authenticate required');
            break;
          case 404:
            errorMessage = 'Primary calendar not found';
            suggestions.push('Ensure user has a primary Google Calendar');
            suggestions.push('Try accessing a specific calendar ID instead');
            break;
        }

        const result: ApiTestResult = {
          status: 'error',
          service: 'Calendar',
          details: {
            error: errorMessage,
            suggestions,
            httpStatus: response.status,
            rawError: errorData
          },
          timestamp: new Date().toISOString(),
          executionTimeMs: executionTime
        };

        logApiCall('Calendar', 'testCalendarApi', false, result.details);
        return result;
      }

      const data = await response.json();
      const events: CalendarEvent[] = data.items || [];

      const result: ApiTestResult = {
        status: 'success',
        service: 'Calendar',
        details: {
          message: `Successfully connected to Google Calendar API`,
          eventsFound: events.length,
          sampleEvents: events.slice(0, 3).map(e => ({
            summary: e.summary,
            start: e.start?.dateTime || e.start?.date,
            end: e.end?.dateTime || e.end?.date
          })),
          timeRange: {
            from: timeMin,
            to: timeMax
          }
        },
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      };

      console.log('✅ Google Calendar API test successful');
      logApiCall('Calendar', 'testCalendarApi', true, result.details);
      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const result: ApiTestResult = {
        status: 'error',
        service: 'Calendar',
        details: {
          error: `Calendar API test failed: ${error.message}`,
          suggestions: [
            'Check internet connectivity',
            'Verify Google Calendar API is enabled',
            'Ensure user has access to Google Calendar'
          ]
        },
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      };

      logApiCall('Calendar', 'testCalendarApi', false, result.details);
      return result;
    }
  }

  // ========================================
  // COMPREHENSIVE TESTING METHOD
  // ========================================

  /**
   * Runs comprehensive tests on all Google APIs
   * @returns Array of all test results
   */
  public async runAllTests(): Promise<ApiTestResult[]> {
    console.log('🚀 Starting comprehensive Google API tests...');
    
    const results: ApiTestResult[] = [];

    try {
      // Validate configuration first
      const validation = await this.validateConfiguration();
      if (!validation.isValid) {
        const configError: ApiTestResult = {
          status: 'error',
          service: 'Drive', // Use Drive as representative
          details: {
            error: 'Configuration validation failed',
            validationErrors: validation.errors,
            suggestions: [
              'Check all environment variables are set correctly',
              'Verify Google Cloud Console project configuration',
              'Ensure redirect URIs match exactly'
            ]
          },
          timestamp: new Date().toISOString(),
          executionTimeMs: 0
        };
        
        return [configError];
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ Configuration warnings:', validation.warnings);
      }

      // Run all API tests in parallel for faster execution
      const [driveResult, gmailResult, calendarResult] = await Promise.all([
        this.testDriveApi(),
        this.testGmailApi(),
        this.testCalendarApi()
      ]);

      results.push(driveResult, gmailResult, calendarResult);

      // Log summary
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      console.log(`🏁 API tests completed: ${successCount} successful, ${errorCount} failed`);

      return results;

    } catch (error) {
      console.error('❌ Failed to run API tests:', error);
      
      const generalError: ApiTestResult = {
        status: 'error',
        service: 'Drive',
        details: {
          error: `Test execution failed: ${error.message}`,
          suggestions: [
            'Check authentication status',
            'Verify internet connectivity',
            'Review Google Cloud Console configuration'
          ]
        },
        timestamp: new Date().toISOString(),
        executionTimeMs: 0
      };

      return [generalError];
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Ensures we have a valid access token, refreshing if necessary
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('No access token available. Authentication required.');
    }

    // Check if token is expired and refresh if we have a refresh token
    if (this.tokenExpiry && this.tokenExpiry <= new Date()) {
      if (this.refreshToken) {
        console.log('🔄 Access token expired, refreshing...');
        await this.refreshAccessToken();
      } else {
        throw new Error('Access token expired and no refresh token available. Re-authentication required.');
      }
    }
  }

  /**
   * Gets current authentication status
   * @returns Authentication status information
   */
  public getAuthStatus(): { 
    isAuthenticated: boolean; 
    hasRefreshToken: boolean; 
    tokenExpiry?: Date;
    config: Omit<GoogleConfig, 'clientSecret'>;
  } {
    return {
      isAuthenticated: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      tokenExpiry: this.tokenExpiry,
      config: {
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri,
        apiKey: this.config.apiKey
      }
    };
  }

  /**
   * Clears all stored tokens (for logout)
   */
  public clearTokens(): void {
    console.log('🔐 Clearing stored tokens...');
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.tokenExpiry = undefined;
    logApiCall('OAuth', 'clearTokens', true);
  }
}

// ========================================
// FACTORY AND EXPORT
// ========================================

/**
 * Factory function to create a new GoogleIntegrationService instance
 * @returns Configured Google integration service
 */
export function createGoogleIntegrationService(): GoogleIntegrationService {
  return new GoogleIntegrationService();
}

/**
 * Global instance for convenience (optional)
 */
export const googleIntegrationService = createGoogleIntegrationService();

/**
 * Export types for external use
 */
export type {
  GoogleConfig,
  TokenResponse,
  ApiTestResult,
  ValidationResult,
  DriveFile,
  CalendarEvent,
  GmailMessage
};