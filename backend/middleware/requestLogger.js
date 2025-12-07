const logger = require('../utils/logger');

/**
 * Middleware de logging des requêtes HTTP
 * Log les informations de chaque requête après son traitement
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capturer les informations de la requête
  const requestInfo = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || 'Unknown'
  };

  // Écouter la fin de la requête pour logger les détails
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    // Préparer les métadonnées du log
    const metadata = {
      method: requestInfo.method,
      url: requestInfo.url,
      status,
      duration: `${duration}ms`,
      ip: requestInfo.ip,
      userAgent: requestInfo.userAgent
    };

    // Ajouter l'userId si l'utilisateur est authentifié
    if (req.user && req.user.id) {
      metadata.userId = req.user.id;
    }

    // Déterminer le niveau de log selon le status HTTP
    let logLevel = 'info';
    let message = `${requestInfo.method} ${requestInfo.url} ${status} ${duration}ms`;

    if (status >= 500) {
      logLevel = 'error';
    } else if (status >= 400) {
      logLevel = 'warn';
    }

    // Logger avec le niveau approprié
    logger.log(logLevel, message, metadata);
  });

  next();
};

module.exports = requestLogger;
