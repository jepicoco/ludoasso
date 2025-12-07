const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Format personnalisé pour les logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}] ${message}`;

    // Ajouter les métadonnées en JSON si présentes
    if (metadata && Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }

    return log;
  })
);

// Transport pour les logs généraux avec rotation quotidienne
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: customFormat,
  level: 'info'
});

// Transport pour les erreurs avec rotation quotidienne
const errorRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: customFormat,
  level: 'error'
});

// Configuration du logger
const transports = [
  fileRotateTransport,
  errorRotateTransport
];

// Ajouter la console en mode développement
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, metadata }) => {
          let log = `${timestamp} ${level} ${message}`;
          if (metadata && Object.keys(metadata).length > 0) {
            log += ` ${JSON.stringify(metadata)}`;
          }
          return log;
        })
      )
    })
  );
}

// Créer le logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
  exitOnError: false
});

module.exports = logger;
