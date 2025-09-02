const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Company = require('../../models/Company');

// Authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No authentication token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      companyId: decoded.companyId,
      role: decoded.role
    };

    // Optionally verify user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User account is inactive'
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please log in again'
      });
    }
    
    return res.status(403).json({
      error: 'Invalid token',
      message: 'Authentication failed'
    });
  }
};

// Check if user has specific role
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required role: ${allowedRoles.join(' or ')}, your role: ${req.user.role}`
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        error: 'Authorization check failed'
      });
    }
  };
};

// Check specific permission
const requirePermission = (resource, action, scope = null) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const permission = user.permissions[resource];
      if (!permission) {
        return res.status(403).json({
          error: 'Permission denied',
          message: `No permissions for ${resource}`
        });
      }

      // Check specific action permission
      if (action === 'create' || action === 'delete') {
        if (!permission[action]) {
          return res.status(403).json({
            error: 'Permission denied',
            message: `Cannot ${action} ${resource}`
          });
        }
      } else if (action === 'read' || action === 'update') {
        const permissionLevel = permission[action];
        
        if (!permissionLevel || permissionLevel === 'none') {
          return res.status(403).json({
            error: 'Permission denied',
            message: `Cannot ${action} ${resource}`
          });
        }

        // Add permission scope to request for use in route handlers
        req.permissionScope = permissionLevel;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        error: 'Permission check failed'
      });
    }
  };
};

// Ensure user belongs to company (for multi-tenant security)
const requireCompanyAccess = async (req, res, next) => {
  try {
    const { companySlug } = req.params;
    
    if (companySlug) {
      const company = await Company.findOne({ slug: companySlug });
      if (!company) {
        return res.status(404).json({
          error: 'Company not found'
        });
      }

      if (company._id.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this company'
        });
      }

      // Add company to request
      req.company = company;
    }

    next();
  } catch (error) {
    console.error('Company access check error:', error);
    res.status(500).json({
      error: 'Company access check failed'
    });
  }
};

// Rate limiting by user
const rateLimitByUser = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.userId;
    if (!userId) return next();

    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, timestamps] of requests.entries()) {
      requests.set(key, timestamps.filter(time => time > windowStart));
      if (requests.get(key).length === 0) {
        requests.delete(key);
      }
    }
    
    // Check current user's requests
    const userRequests = requests.get(userId) || [];
    
    if (userRequests.length >= max) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000 / 60)} minutes.`
      });
    }
    
    // Add current request
    userRequests.push(now);
    requests.set(userId, userRequests);
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  requireCompanyAccess,
  rateLimitByUser
};