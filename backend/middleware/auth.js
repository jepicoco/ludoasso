const jwt = require('jsonwebtoken');
const { Utilisateur } = require('../models');

/**
 * Middleware to verify JWT token
 * Extracts token from Authorization header and verifies it
 * Adds user data to req.user
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header OR query parameter (for print pages opened in new window)
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token;

    let token = null;

    if (authHeader) {
      // Check if token format is "Bearer <token>"
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    } else if (queryToken) {
      // Token passed via query parameter (for print pages)
      token = queryToken;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await Utilisateur.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: error.message
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    }

    return res.status(500).json({
      error: 'Authentication error',
      message: error.message
    });
  }
};

/**
 * Middleware to check if user account is active
 * Must be used after verifyToken
 */
const verifyActiveStatus = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'User not authenticated'
    });
  }

  if (req.user.statut !== 'actif') {
    return res.status(403).json({
      error: 'Account inactive',
      message: `Your account is ${req.user.statut}. Please contact administration.`
    });
  }

  next();
};

/**
 * Optional authentication middleware
 * Adds user to req if token is valid, but doesn't block request if token is missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await Utilisateur.findByPk(decoded.id);

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
};

// Import role checking middleware
const { checkRole, checkMinRole, isAdmin, isGestionnaire, isBenevole } = require('./checkRole');

module.exports = {
  verifyToken,
  verifyActiveStatus,
  optionalAuth,
  checkRole,
  checkMinRole,
  isAdmin,
  isGestionnaire,
  isBenevole
};
