import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    company_id: string;
    role: string;
  };
}

/**
 * JWT Authentication Middleware
 * Verifies the JWT token from Authorization header and attaches user info to request
 */
export async function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch user details from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      res.status(401).json({ error: 'User not found in database' });
      return;
    }

    // Attach user info to request
    req.user = {
      id: userData.id,
      email: userData.email,
      company_id: userData.company_id,
      role: userData.role,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to verify user has access to their company's data
 */
export function verifyCompanyAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.company_id) {
    res.status(403).json({ error: 'No company access' });
    return;
  }
  next();
}

/**
 * Middleware to verify user has admin role
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
