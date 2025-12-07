/**
 * Rate Limiting Middleware
 * Protection contre les attaques par force brute et les abus d'API
 */

const rateLimit = require('express-rate-limit');

// Désactiver le rate limiting en développement par défaut
const isRateLimitDisabled = process.env.NODE_ENV !== 'production' || process.env.DISABLE_RATE_LIMIT === 'true';

/**
 * Limiter global pour toutes les routes API
 * 100 requêtes par 15 minutes par IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max
  message: {
    error: 'Trop de requêtes',
    message: 'Vous avez dépassé le nombre maximum de requêtes. Veuillez réessayer dans 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isRateLimitDisabled
});

/**
 * Limiter strict pour les tentatives de login
 * 5 tentatives par 15 minutes par IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: {
    error: 'Trop de tentatives de connexion',
    message: 'Trop de tentatives de connexion depuis cette adresse IP. Veuillez réessayer dans 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => isRateLimitDisabled
});

/**
 * Limiter pour la réinitialisation de mot de passe
 * 3 tentatives par heure par IP
 */
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 tentatives max
  message: {
    error: 'Trop de demandes de réinitialisation',
    message: 'Trop de demandes de réinitialisation de mot de passe. Veuillez réessayer dans 1 heure.',
    retryAfter: '1 heure'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isRateLimitDisabled
});

/**
 * Limiter pour la création de comptes
 * 3 comptes par heure par IP
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 créations max
  message: {
    error: 'Trop de créations de compte',
    message: 'Trop de créations de compte depuis cette adresse IP. Veuillez réessayer dans 1 heure.',
    retryAfter: '1 heure'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isRateLimitDisabled
});

module.exports = {
  apiLimiter,
  loginLimiter,
  resetPasswordLimiter,
  registerLimiter
};
