require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const { checkMaintenance } = require('./middleware/maintenance');
const requestLogger = require('./middleware/requestLogger');
const logger = require('./utils/logger');
const { apiLimiter, loginLimiter, resetPasswordLimiter, registerLimiter } = require('./middleware/rateLimiter');
const { createThemeResolverMiddleware, createThemeStaticMiddleware } = require('./middleware/themeResolver');

// ============================================
// VALIDATION DES SECRETS AU DEMARRAGE
// ============================================
const validateSecrets = () => {
  const secrets = {
    JWT_SECRET: process.env.JWT_SECRET,
    EMAIL_ENCRYPTION_KEY: process.env.EMAIL_ENCRYPTION_KEY
  };

  const weakSecrets = [
    'changeme',
    'secret',
    'password',
    'default',
    'test',
    '123456',
    'admin',
    'root',
    'assotheque'
  ];

  for (const [name, value] of Object.entries(secrets)) {
    // Vérifier l'existence
    if (!value) {
      console.error(`\n❌ ERREUR SECURITE: ${name} n'est pas défini dans les variables d'environnement`);
      console.error(`   Veuillez définir ${name} dans votre fichier .env\n`);
      process.exit(1);
    }

    // Vérifier la longueur minimale
    if (value.length < 32) {
      console.error(`\n❌ ERREUR SECURITE: ${name} doit contenir au moins 32 caractères`);
      console.error(`   Longueur actuelle: ${value.length} caractères`);
      console.error(`   Générez un secret fort avec: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\n`);
      process.exit(1);
    }

    // Vérifier les valeurs faibles
    const lowerValue = value.toLowerCase();
    for (const weak of weakSecrets) {
      if (lowerValue.includes(weak)) {
        console.error(`\n❌ ERREUR SECURITE: ${name} contient une valeur faible ("${weak}")`);
        console.error(`   Utilisez un secret cryptographiquement sécurisé`);
        console.error(`   Générez-en un avec: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\n`);
        process.exit(1);
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    console.log('✓ Validation des secrets: OK');
  }
};

// Valider les secrets avant de démarrer le serveur
validateSecrets();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de sécurité
if (process.env.NODE_ENV === 'production') {
  // Configuration helmet stricte en production avec CSP activé
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.jsdelivr.net"],
        fontSrc: ["'self'", "fonts.gstatic.com", "cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
} else {
  // Configuration helmet souple en développement
  app.use(helmet({
    contentSecurityPolicy: false
  }));
}
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.APP_URL
    : '*',
  credentials: true
}));

// Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging HTTP
app.use(requestLogger);

// Rate limiting global pour toutes les routes API
app.use('/api/', apiLimiter);

// Redirection des anciennes URLs vers les nouvelles
app.get('/connexion.html', (req, res) => {
  res.redirect(301, '/usager/login.html');
});

// Theme resolver middleware - gère le fallback des fichiers de thème
const frontendPath = path.join(__dirname, '../frontend');

// Route pour les ressources statiques du thème actif (/theme/css/*, /theme/js/*, etc.)
app.use('/theme', createThemeStaticMiddleware(frontendPath));

// Pages publiques avec résolution de thème - ROUTES EXPLICITES
// Ces routes DOIVENT être avant express.static pour avoir priorité
const themeResolverMiddleware = createThemeResolverMiddleware(frontendPath);

app.get('/', checkMaintenance, themeResolverMiddleware);
app.get('/index.html', checkMaintenance, themeResolverMiddleware);
app.get('/catalogue.html', checkMaintenance, themeResolverMiddleware);
app.get('/fiche.html', checkMaintenance, themeResolverMiddleware);
app.get('/infos.html', checkMaintenance, themeResolverMiddleware);
app.get('/mentions-legales.html', checkMaintenance, themeResolverMiddleware);
app.get('/cgu.html', checkMaintenance, themeResolverMiddleware);
app.get('/cgv.html', checkMaintenance, themeResolverMiddleware);
app.get('/contact.html', checkMaintenance, themeResolverMiddleware);

// Serve static files from frontend (pour les autres fichiers: JS, CSS, images, etc.)
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api', (req, res) => {
  res.json({
    message: 'Assotheque API',
    version: '1.0.0',
    availableRoutes: [
      'GET /api/health - Health check',
      'POST /api/auth/login - Login',
      'POST /api/auth/register - Register',
      'GET /api/utilisateurs - List users (or /api/adherents for compatibility)',
      'GET /api/jeux - List games',
      'GET /api/emprunts - List loans',
      'GET /api/stats - Statistics'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes avec rate limiting spécifique
app.use('/api/auth', require('./routes/auth'));
// Routes utilisateurs (nouvelle nomenclature) + alias adherents pour retrocompatibilité
app.use('/api/utilisateurs', require('./routes/adherents'));
app.use('/api/adherents', require('./routes/adherents')); // Alias pour retrocompatibilite
app.use('/api/jeux', require('./routes/jeux'));
app.use('/api/emprunts', require('./routes/emprunts'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/barcodes', require('./routes/barcodes'));
app.use('/api/tarifs-cotisation', require('./routes/tarifsCotisation'));
app.use('/api/cotisations', require('./routes/cotisations'));
app.use('/api/parametres', require('./routes/parametres'));
app.use('/api/email-logs', require('./routes/emailLogs'));
app.use('/api/sms-logs', require('./routes/smsLogs'));
app.use('/api/event-triggers', require('./routes/eventTriggers'));
app.use('/api/configurations-sms', require('./routes/configurationsSMS'));
app.use('/api/archives', require('./routes/archives'));
app.use('/api/import', require('./routes/import'));
app.use('/api/sites', require('./routes/sites'));
app.use('/api/comptes-bancaires', require('./routes/comptesBancaires'));
app.use('/api/calendrier', require('./routes/calendrier'));
app.use('/api/referentiels', require('./routes/referentiels'));
app.use('/api/livres', require('./routes/livres'));
app.use('/api/films', require('./routes/films'));
app.use('/api/disques', require('./routes/disques'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/public', require('./routes/public'));
app.use('/api/prolongations', require('./routes/prolongations'));
app.use('/api/export-comptable', require('./routes/exportComptable'));
app.use('/api/parametres/llm', require('./routes/llm'));
app.use('/api/thematiques', require('./routes/thematiques'));
app.use('/api/enrichissement', require('./routes/enrichissement'));
app.use('/api/codes-barres-reserves', require('./routes/codesBarresReserves'));
app.use('/api/lookup', require('./routes/eanLookup'));

// Routes espace usager (adherents)
app.use('/api/usager/auth', require('./routes/usagerAuth'));
app.use('/api/usager/emprunts', require('./routes/usagerEmprunts'));

// Middleware de gestion d'erreurs 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Logger l'erreur
  logger.error('Application error', {
    error: message,
    status,
    path: req.path,
    method: req.method,
    stack: err.stack,
    userId: req.user ? req.user.id : null
  });

  res.status(status).json({
    error: {
      status,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Démarrage du serveur
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync models with database (create tables if they don't exist)
    await sequelize.sync({ alter: false });
    logger.info('Database models synchronized');

    // Initialize default modules (first install)
    try {
      const initModulesActifs = require('../database/migrations/addModulesActifs');
      await initModulesActifs();
      logger.info('Modules actifs initialized');
    } catch (err) {
      logger.warn('Modules actifs initialization skipped or failed:', err.message);
    }

    // Initialize default front parameters (first install)
    try {
      const { ParametresFront } = require('./models');
      await ParametresFront.getParametres();
      logger.info('Parametres front initialized');
    } catch (err) {
      logger.warn('Parametres front initialization skipped or failed:', err.message);
    }

    // Initialize default message templates (first install)
    try {
      const seedTemplates = require('../database/seeds/seedTemplatesMessages');
      await seedTemplates();
      logger.info('Templates messages initialized');
    } catch (err) {
      logger.warn('Templates messages initialization skipped or failed:', err.message);
    }

    // Initialize default event triggers (first install)
    try {
      const seedTriggers = require('../database/seeds/seedEventTriggers');
      await seedTriggers();
      logger.info('Event triggers initialized');
    } catch (err) {
      logger.warn('Event triggers initialization skipped or failed:', err.message);
    }

    // Initialize default themes (first install)
    try {
      const seedThemes = require('../database/seeds/seedThemes');
      await seedThemes();
      logger.info('Themes initialized');
    } catch (err) {
      logger.warn('Themes initialization skipped or failed:', err.message);
    }

    // Initialize email service
    const emailService = require('./services/emailService');
    await emailService.initialize();
    logger.info('Email service initialized');

    app.listen(PORT, () => {
      const startupMessage = `
╔════════════════════════════════════════╗
║  Ludothèque Server Started             ║
║  Environment: ${process.env.NODE_ENV || 'development'}
║  Port: ${PORT}
║  URL: ${process.env.APP_URL || `http://localhost:${PORT}`}
╚════════════════════════════════════════╝
      `;
      console.log(startupMessage);
      logger.info('Server started successfully', {
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        url: process.env.APP_URL || `http://localhost:${PORT}`
      });
    });
  } catch (error) {
    const errorMessage = '✗ Failed to start server';
    console.error(errorMessage);
    console.error('Error:', error.message);

    logger.error('Server startup failed', {
      error: error.message,
      stack: error.stack,
      databaseError: error.original ? error.original.message : null
    });

    if (error.original) {
      console.error('Database error:', error.original.message);
    }
    process.exit(1);
  }
};

startServer();

module.exports = app;
