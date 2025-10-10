const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * JWT Authentication Middleware
 * Verifies the JWT token from Authorization header and attaches user info to request
 */
async function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch user details from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: 'User not found in database' });
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
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to verify user has access to their company's data
 */
function verifyCompanyAccess(req, res, next) {
  if (!req.user?.company_id) {
    return res.status(403).json({ error: 'No company access' });
  }
  next();
}

/**
 * Middleware to verify user has admin role
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = {
  authenticateJWT,
  verifyCompanyAccess,
  requireAdmin,
};
