/**
 * Security Middleware
 * Provides authentication, authorization, rate limiting, and input validation
 */

import { inputValidator } from '../services/inputValidator';
import { sessionManager } from '../services/sessionManager';
import { authService } from '../services/auth';

// Types for middleware
export interface SecurityRequest {
  headers: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
  user?: any;
  company?: any;
}

export interface SecurityResponse {
  status: number;
  data?: any;
  headers?: Record<string, string>;
}

export interface MiddlewareContext {
  request: SecurityRequest;
  response: SecurityResponse;
  next: () => void;
}

/**
 * Authentication middleware
 */
export function authenticationMiddleware(
  requiredAuth: boolean = true
) {
  return (ctx: MiddlewareContext) => {
    if (!requiredAuth) {
      return ctx.next();
    }

    const authHeader = ctx.request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.response.status = 401;
      ctx.response.data = { error: 'Missing or invalid authorization header' };
      return;
    }

    const token = authHeader.substring(7);
    
    // In a real implementation, verify the JWT token
    // For now, check if session exists
    const session = sessionManager.getSession();
    if (!session || session.token !== token) {
      ctx.response.status = 401;
      ctx.response.data = { error: 'Invalid or expired token' };
      return;
    }

    // Add user context to request
    ctx.request.user = session.user;
    ctx.request.company = session.company;

    ctx.next();
  };
}

/**
 * Authorization middleware
 */
export function authorizationMiddleware(
  resource: string,
  action: string
) {
  return (ctx: MiddlewareContext) => {
    if (!ctx.request.user) {
      ctx.response.status = 401;
      ctx.response.data = { error: 'Authentication required' };
      return;
    }

    const permissions = authService.getUserPermissions?.(
      ctx.request.user.role,
      ctx.request.user.permissions || []
    ) || [];

    const hasPermission = authService.hasPermission(
      permissions,
      resource,
      action,
      ctx.request.user.id
    );

    if (!hasPermission) {
      ctx.response.status = 403;
      ctx.response.data = { error: 'Insufficient permissions' };
      return;
    }

    ctx.next();
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  return (ctx: MiddlewareContext) => {
    const clientId = ctx.request.headers['x-forwarded-for'] || 
                    ctx.request.headers['x-real-ip'] || 
                    'unknown';

    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < windowStart) {
        rateLimitStore.delete(key);
      }
    }

    // Check current client
    const clientData = rateLimitStore.get(clientId);
    
    if (!clientData) {
      rateLimitStore.set(clientId, { count: 1, resetTime: now });
    } else if (clientData.resetTime < windowStart) {
      rateLimitStore.set(clientId, { count: 1, resetTime: now });
    } else if (clientData.count >= maxRequests) {
      ctx.response.status = 429;
      ctx.response.data = { error: 'Rate limit exceeded' };
      ctx.response.headers = {
        'Retry-After': Math.ceil(windowMs / 1000).toString(),
      };
      return;
    } else {
      clientData.count++;
    }

    ctx.next();
  };
}

/**
 * Input validation middleware
 */
export function validationMiddleware(
  validationRules: Record<string, any>
) {
  return (ctx: MiddlewareContext) => {
    if (!ctx.request.body) {
      ctx.next();
      return;
    }

    const result = inputValidator.validateForm(ctx.request.body, validationRules);
    
    if (!result.isValid) {
      ctx.response.status = 400;
      ctx.response.data = { 
        error: 'Validation failed',
        details: result.errors 
      };
      return;
    }

    // Replace request body with sanitized data
    ctx.request.body = result.sanitizedData;
    ctx.next();
  };
}

/**
 * CSRF protection middleware
 */
export function csrfMiddleware() {
  return (ctx: MiddlewareContext) => {
    const method = ctx.request.headers['method'] || 'GET';
    
    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
      ctx.next();
      return;
    }

    const csrfToken = ctx.request.headers['x-csrf-token'];
    const storedToken = localStorage.getItem('csrf_token');

    if (!csrfToken || !storedToken || csrfToken !== storedToken) {
      ctx.response.status = 403;
      ctx.response.data = { error: 'CSRF token validation failed' };
      return;
    }

    ctx.next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware() {
  return (ctx: MiddlewareContext) => {
    ctx.response.headers = {
      ...ctx.response.headers,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://www.google-analytics.com https://oauth2.googleapis.com https://www.googleapis.com https://accounts.google.com",
    };

    ctx.next();
  };
}

/**
 * Audit logging middleware
 */
export function auditLogMiddleware() {
  return (ctx: MiddlewareContext) => {
    const startTime = Date.now();
    
    // Log request
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: ctx.request.user?.id,
      companyId: ctx.request.company?.id,
      method: ctx.request.headers['method'] || 'GET',
      endpoint: ctx.request.headers['url'] || 'unknown',
      userAgent: ctx.request.headers['user-agent'],
      ip: ctx.request.headers['x-forwarded-for'] || ctx.request.headers['x-real-ip'],
    };

    // Continue with request
    ctx.next();

    // Log response
    const duration = Date.now() - startTime;
    const auditLog = {
      ...logEntry,
      status: ctx.response.status,
      duration,
      success: ctx.response.status < 400,
    };

    // Store audit log (in production, send to logging service)
    console.log('Audit Log:', auditLog);
    
    // Store in localStorage for demo (use proper logging in production)
    const auditLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
    auditLogs.push(auditLog);
    
    // Keep only last 1000 entries
    if (auditLogs.length > 1000) {
      auditLogs.splice(0, auditLogs.length - 1000);
    }
    
    localStorage.setItem('audit_logs', JSON.stringify(auditLogs));
  };
}

/**
 * Error handling middleware
 */
export function errorHandlingMiddleware() {
  return (ctx: MiddlewareContext) => {
    try {
      ctx.next();
    } catch (error) {
      console.error('API Error:', error);
      
      // Don't expose internal errors in production
      const isDevelopment = import.meta.env.DEV;
      
      ctx.response.status = 500;
      ctx.response.data = {
        error: 'Internal server error',
        ...(isDevelopment && { details: error.message, stack: error.stack }),
      };
    }
  };
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(...middlewares: Array<(ctx: MiddlewareContext) => void>) {
  return (ctx: MiddlewareContext) => {
    let index = 0;

    function next() {
      if (index < middlewares.length) {
        const middleware = middlewares[index++];
        middleware(ctx);
      }
    }

    ctx.next = next;
    next();
  };
}

/**
 * Common middleware stacks
 */
export const publicEndpointMiddleware = composeMiddleware(
  errorHandlingMiddleware(),
  securityHeadersMiddleware(),
  rateLimitMiddleware(200, 15 * 60 * 1000), // Higher rate limit for public endpoints
  auditLogMiddleware()
);

export const authenticatedEndpointMiddleware = composeMiddleware(
  errorHandlingMiddleware(),
  securityHeadersMiddleware(),
  rateLimitMiddleware(100, 15 * 60 * 1000),
  authenticationMiddleware(true),
  csrfMiddleware(),
  auditLogMiddleware()
);

export const adminEndpointMiddleware = composeMiddleware(
  errorHandlingMiddleware(),
  securityHeadersMiddleware(),
  rateLimitMiddleware(50, 15 * 60 * 1000), // Lower rate limit for admin endpoints
  authenticationMiddleware(true),
  authorizationMiddleware('company', 'admin'),
  csrfMiddleware(),
  auditLogMiddleware()
);