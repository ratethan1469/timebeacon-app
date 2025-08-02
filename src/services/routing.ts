/**
 * URL Routing Service
 * Handles multi-tenant URL structure: app.timebeacon.io/accountId/visitorId
 */

import { Company, User } from '../types/auth';

export interface RouteParams {
  accountId: string;
  visitorId: string;
}

export interface AppRoute {
  accountId: string;
  visitorId: string;
  path: string;
}

class RoutingService {
  private readonly BASE_URL = import.meta.env.VITE_APP_URL || 'https://app.timebeacon.io';

  /**
   * Extract account and visitor IDs from current URL
   */
  extractRouteParams(): RouteParams | null {
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);

    // Expected format: /accountId/visitorId/...
    if (segments.length >= 2) {
      const [accountId, visitorId] = segments;
      
      // Validate that both are numeric
      if (this.isNumericId(accountId) && this.isNumericId(visitorId)) {
        return { accountId, visitorId };
      }
    }

    return null;
  }

  /**
   * Generate URL for user access
   */
  generateUserUrl(company: Company, user: User, path: string = ''): string {
    const basePath = `/${company.accountId}/${user.visitorId}`;
    const fullPath = path ? `${basePath}/${path.replace(/^\//, '')}` : basePath;
    return `${this.BASE_URL}${fullPath}`;
  }

  /**
   * Navigate to a route within the user's context
   */
  navigateToRoute(company: Company, user: User, path: string): void {
    const url = this.generateUserUrl(company, user, path);
    window.history.pushState({}, '', url);
  }

  /**
   * Check if current URL matches user context
   */
  validateCurrentRoute(company: Company, user: User): boolean {
    const params = this.extractRouteParams();
    if (!params) return false;

    return (
      params.accountId === company.accountId &&
      params.visitorId === user.visitorId
    );
  }

  /**
   * Redirect to correct user URL if needed
   */
  redirectToUserContext(company: Company, user: User): void {
    if (!this.validateCurrentRoute(company, user)) {
      const correctUrl = this.generateUserUrl(company, user, 'dashboard');
      window.location.href = correctUrl;
    }
  }

  /**
   * Get app routes for navigation
   */
  getAppRoutes(company: Company, user: User): AppRoute[] {
    const baseRoute = { accountId: company.accountId, visitorId: user.visitorId };
    
    return [
      { ...baseRoute, path: 'dashboard' },
      { ...baseRoute, path: 'reports' },
      { ...baseRoute, path: 'ai-insights' },
      { ...baseRoute, path: 'projects' },
      { ...baseRoute, path: 'team' },
      { ...baseRoute, path: 'settings' },
      { ...baseRoute, path: 'privacy' },
    ];
  }

  /**
   * Generate account ID (5-digit numeric)
   */
  generateAccountId(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  /**
   * Generate visitor ID (5-digit numeric)
   */
  generateVisitorId(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  /**
   * Format ID with leading zeros
   */
  formatId(id: number | string, length: number = 5): string {
    return id.toString().padStart(length, '0');
  }

  /**
   * Parse numeric ID from string
   */
  parseId(id: string): number {
    return parseInt(id, 10);
  }

  /**
   * Validate that ID is numeric
   */
  private isNumericId(id: string): boolean {
    return /^\d{4,6}$/.test(id);
  }

  /**
   * Get sharing URL for specific data
   */
  generateSharingUrl(
    company: Company, 
    user: User, 
    type: 'report' | 'project' | 'timesheet',
    itemId: string,
    options?: { readonly?: boolean; expires?: Date }
  ): string {
    const baseUrl = this.generateUserUrl(company, user);
    const params = new URLSearchParams({
      type,
      id: itemId,
      ...(options?.readonly && { readonly: 'true' }),
      ...(options?.expires && { expires: options.expires.toISOString() }),
    });
    
    return `${baseUrl}/share?${params.toString()}`;
  }

  /**
   * Generate public company page URL
   */
  generateCompanyUrl(company: Company): string {
    return `${this.BASE_URL}/company/${company.slug}`;
  }

  /**
   * Generate login URL with context
   */
  generateLoginUrl(accountId?: string, visitorId?: string): string {
    const params = new URLSearchParams();
    if (accountId) params.set('account', accountId);
    if (visitorId) params.set('visitor', visitorId);
    
    const query = params.toString();
    return `${this.BASE_URL}/login${query ? `?${query}` : ''}`;
  }

  /**
   * Handle deep linking and route protection
   */
  handleDeepLink(targetPath: string, company?: Company, user?: User): string {
    if (!company || !user) {
      // User not authenticated, redirect to login with return path
      const params = new URLSearchParams({ return: targetPath });
      return `/login?${params.toString()}`;
    }

    // Ensure path includes user context
    if (!targetPath.startsWith(`/${company.accountId}/${user.visitorId}`)) {
      return this.generateUserUrl(company, user, targetPath);
    }

    return targetPath;
  }

  /**
   * URL-safe encoding for sensitive data
   */
  encodeForUrl(data: any): string {
    return btoa(JSON.stringify(data))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Decode URL-safe data
   */
  decodeFromUrl(encoded: string): any {
    try {
      const base64 = encoded
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(encoded.length + (4 - encoded.length % 4) % 4, '=');
      
      return JSON.parse(atob(base64));
    } catch (error) {
      console.error('Failed to decode URL data:', error);
      return null;
    }
  }
}

export const routingService = new RoutingService();