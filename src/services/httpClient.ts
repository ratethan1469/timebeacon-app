/**
 * Secure HTTP Client
 * Handles API requests with authentication, CSRF protection, and security headers
 */

import { sessionManager } from './sessionManager';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  requireAuth?: boolean;
  timeout?: number;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

class HttpClient {
  private readonly baseURL: string;
  private readonly defaultTimeout = 30000; // 30 seconds
  private csrfToken: string | null = null;

  constructor() {
    // Use relative URLs for Vercel serverless functions
    this.baseURL = import.meta.env.VITE_API_URL || '';
    this.initializeCsrfToken();
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body: data });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body: data });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body: data });
  }

  /**
   * Generic request method
   */
  private async request<T = any>(endpoint: string, config: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const {
      method = 'GET',
      headers = {},
      body,
      requireAuth = true,
      timeout = this.defaultTimeout,
    } = config;

    // Build headers
    const requestHeaders = new Headers({
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...headers,
    });

    // Add authentication header
    if (requireAuth) {
      const session = sessionManager.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      requestHeaders.set('Authorization', `Bearer ${session.token}`);
    }

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && this.csrfToken) {
      requestHeaders.set('X-CSRF-Token', this.csrfToken);
    }

    // Prepare request body
    let requestBody: string | undefined;
    if (body && method !== 'GET') {
      if (typeof body === 'object') {
        requestBody = JSON.stringify(body);
      } else {
        requestBody = body;
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
        credentials: 'same-origin', // Include cookies for CSRF protection
      });

      clearTimeout(timeoutId);

      // Update CSRF token if provided
      const newCsrfToken = response.headers.get('X-CSRF-Token');
      if (newCsrfToken) {
        this.csrfToken = newCsrfToken;
        localStorage.setItem('csrf_token', newCsrfToken);
      }

      // Handle authentication errors
      if (response.status === 401) {
        sessionManager.clearSession();
        window.location.href = '/login?reason=expired';
        throw new Error('Authentication expired');
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await this.parseError(response);
        throw new ApiError(errorData.message || 'Request failed', response.status, errorData);
      }

      // Parse response
      const data = await this.parseResponse<T>(response);

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Parse response data
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    if (contentType && contentType.includes('text/')) {
      return response.text() as any;
    }
    
    return response.blob() as any;
  }

  /**
   * Parse error response
   */
  private async parseError(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch {
      return { message: response.statusText };
    }
  }

  /**
   * Initialize CSRF token
   */
  private async initializeCsrfToken(): Promise<void> {
    try {
      // Try to get token from localStorage first
      const storedToken = localStorage.getItem('csrf_token');
      if (storedToken) {
        this.csrfToken = storedToken;
        return;
      }

      // Get CSRF token from server
      const response = await fetch(`${this.baseURL}/csrf-token`, {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (response.ok) {
        const data = await response.json();
        this.csrfToken = data.token;
        localStorage.setItem('csrf_token', this.csrfToken || '');
      }
    } catch (error) {
      console.warn('Failed to initialize CSRF token:', error);
    }
  }

  /**
   * Refresh CSRF token
   */
  async refreshCsrfToken(): Promise<void> {
    localStorage.removeItem('csrf_token');
    this.csrfToken = null;
    await this.initializeCsrfToken();
  }

  /**
   * Upload files with progress tracking
   */
  async uploadFile(
    endpoint: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse> {
    const url = `${this.baseURL}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);

    // Get auth headers
    const session = sessionManager.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      // Success handler
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              data,
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers(),
            });
          } catch {
            resolve({
              data: xhr.responseText,
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers(),
            });
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      // Error handler
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      // Set headers
      xhr.setRequestHeader('Authorization', `Bearer ${session.token}`);
      if (this.csrfToken) {
        xhr.setRequestHeader('X-CSRF-Token', this.csrfToken);
      }

      // Send request
      xhr.open('POST', url);
      xhr.send(formData);
    });
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Create interceptor for automatic token refresh
 */
export function setupInterceptors(client: HttpClient): void {
  // This would be implemented in a real application
  // to automatically refresh tokens when they expire
}

export const httpClient = new HttpClient();