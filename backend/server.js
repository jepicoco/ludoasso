require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de sécurité
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.APP_URL
    : '*',
  credentials: true
}));

// Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middlewares de logging personnalisés
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes de base
app.get('/', (req, res) => {
  res.json({
    message: 'Ludothèque API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      api: '/api'
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Ludothèque API',
    version: '1.0.0',
    availableRoutes: [
      'GET /api/health - Health check',
      'POST /api/auth/login - Login',
      'POST /api/auth/register - Register',
      'GET /api/adherents - List members',
      'GET /api/jeux - List games',
      'GET /api/emprunts - List loans',
      'GET /api/stats - Statistics'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/adherents', require('./routes/adherents'));
app.use('/api/jeux', require('./routes/jeux'));
app.use('/api/emprunts', require('./routes/emprunts'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/barcodes', require('./routes/barcodes'));
app.use('/api/tarifs-cotisation', require('./routes/tarifsCotisation'));
app.use('/api/cotisations', require('./routes/cotisations'));
app.use('/api/parametres', require('./routes/parametres'));
app.use('/api/email-logs', require('./routes/emailLogs'));
app.use('/api/event-triggers', require('./routes/eventTriggers'));

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
  console.error('Error:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

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
    console.log('Starting Ludothèque server...');
    console.log('Connecting to database:', process.env.DB_HOST);

    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connected successfully');

    console.log('Synchronizing database models...');
    // Sync models with database (create tables if they don't exist)
    await sequelize.sync({ alter: false });
    console.log('✓ Database models synchronized');

    // Initialize email service
    console.log('Initializing email service...');
    const emailService = require('./services/emailService');
    const emailInitialized = await emailService.initialize();
    if (emailInitialized) {
      console.log('✓ Email service initialized successfully');
    } else {
      console.warn('⚠ Email service not initialized (no active configuration)');
    }

    console.log('Starting HTTP server on port', PORT);
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║  Ludothèque Server Started             ║
║  Environment: ${process.env.NODE_ENV || 'development'}
║  Port: ${PORT}
║  URL: ${process.env.APP_URL || `http://localhost:${PORT}`}
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('✗ Failed to start server');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.original) {
      console.error('Original error:', error.original.message);
      console.error('Error code:', error.original.code);
    }
    process.exit(1);
  }
};

startServer();

module.exports = app;
