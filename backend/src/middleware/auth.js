const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Authenticate JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // Temporarily allow unauthenticated issue submissions
      if (req.method === 'POST' && req.baseUrl && req.baseUrl.includes('/api/issues')) {
        return next();
      }
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err, decoded) => {
      if (err) {
        logger.warn('Invalid token attempt:', err.message);
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Get user from database
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Authorize based on user roles
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.id} with role ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Generate JWT token
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    { expiresIn: '30d' }
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret');
  } catch (error) {
    return null;
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err, decoded) => {
        if (!err) {
          const user = await User.findById(decoded.userId).select('-password');
          if (user && user.isActive) {
            req.user = user;
          }
        }
        next();
      });
    } else {
      next();
    }
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  authorize,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  optionalAuth
};
