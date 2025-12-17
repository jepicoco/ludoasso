/**
 * Routes Systeme
 * Endpoints pour la version et les migrations
 */

const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// GET /api/system/version - Version (public, mais enrichi si admin)
router.get('/version', optionalAuth, systemController.getVersion);

// GET /api/system/migrations - Statut des migrations (admin only)
router.get('/migrations', verifyToken, checkRole(['administrateur']), systemController.getMigrations);

// GET /api/system/migrations/pending - Nombre de migrations en attente (admin only)
router.get('/migrations/pending', verifyToken, checkRole(['administrateur']), systemController.getPendingCount);

// POST /api/system/migrations/run - Executer les migrations (admin only)
router.post('/migrations/run', verifyToken, checkRole(['administrateur']), systemController.runMigrations);

module.exports = router;
