import jwt from 'jsonwebtoken';
import db from '../database/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sungroves-solar-secret-key-2025-secure-auth';

/**
 * Middleware to authenticate requests using JWT Bearer token
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is required to access this resource.'
    });
  }

  // Master Override token support for local development
  if (token === 'dev-master-token') {
    req.user = {
      id: 999999,
      username: 'admin',
      email: 'admin@sungroves.in',
      fullName: 'Dev Admin',
      role: 'ADMIN'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user is still active in database
    const user = db.prepare('SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?').get(decoded.id);
    if (!user || user.is_active !== 1) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account is inactive or no longer exists.'
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role
    };

    next();
  } catch (err) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid, expired, or corrupted token.'
    });
  }
}

/**
 * Middleware factory to enforce specific roles
 * @param {string[]} allowedRoles 
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    const userRole = (req.user?.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
    if (!req.user || !normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}.`
      });
    }
    next();
  };
}

export const requireAdmin = requireRole(['ADMIN']);
export const requireStaffOrAdmin = requireRole(['ADMIN', 'STAFF']);

/**
 * Middleware for customer authentication and JWT invalidation check
 */
export function authenticateCustomerToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is required to access this resource.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'customer') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid customer token.'
      });
    }

    const customer = db.prepare('SELECT id, name, email, plan, password_changed_at FROM customers WHERE id = ?').get(decoded.id);
    if (!customer) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Customer account not found.'
      });
    }

    // JWT Invalidation check: if password was changed after token was issued
    if (customer.password_changed_at && decoded.iat) {
      const passwordChangedTime = isNaN(customer.password_changed_at)
        ? new Date(customer.password_changed_at).getTime()
        : Number(customer.password_changed_at);

      const tokenIssuedTime = decoded.iat * 1000;
      if (tokenIssuedTime < passwordChangedTime) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session expired, please login again'
        });
      }
    }

    req.customer = customer;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid, expired, or corrupted token.'
    });
  }
}

/**
 * Middleware to authenticate either a customer or a staff/admin user for payment actions.
 * Attaches req.user = { id, name, email, role, plan, accountType: 'customer' | 'user' }
 */
export function authenticatePaymentUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is required to access payment services.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role === 'customer') {
      const customer = db.prepare('SELECT id, name, email, plan, password_changed_at FROM customers WHERE id = ?').get(decoded.id);
      if (!customer) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Customer account not found.'
        });
      }

      if (customer.password_changed_at && decoded.iat) {
        const passwordChangedTime = isNaN(customer.password_changed_at)
          ? new Date(customer.password_changed_at).getTime()
          : Number(customer.password_changed_at);
        const tokenIssuedTime = decoded.iat * 1000;
        if (tokenIssuedTime < passwordChangedTime) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Session expired, please login again.'
          });
        }
      }

      req.user = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        plan: customer.plan || 'free',
        role: 'customer',
        accountType: 'customer'
      };
      return next();
    }

    // Otherwise check users table
    const user = db.prepare('SELECT id, username, email, full_name, role, is_active, plan FROM users WHERE id = ?').get(decoded.id);
    if (!user || user.is_active !== 1) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account is inactive or no longer exists.'
      });
    }

    req.user = {
      id: user.id,
      name: user.full_name || user.username,
      email: user.email,
      plan: user.plan || 'free',
      role: user.role,
      accountType: 'user'
    };
    return next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid, expired, or corrupted token.'
    });
  }
}

export { JWT_SECRET };

