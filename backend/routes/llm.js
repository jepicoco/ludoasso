/**
 * Routes pour la gestion des configurations LLM
 * /api/parametres/llm
 */

const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llmController');
const { verifyToken, checkRole } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification admin
const adminOnly = [verifyToken, checkRole(['administrateur'])];

// GET /api/parametres/llm/providers - Liste des providers et modèles disponibles
router.get('/providers', adminOnly, llmController.getProviders);

// GET /api/parametres/llm/stats - Statistiques d'utilisation
router.get('/stats', adminOnly, llmController.getStats);

// GET /api/parametres/llm - Liste toutes les configurations
router.get('/', adminOnly, llmController.getAll);

// GET /api/parametres/llm/:id - Récupère une configuration
router.get('/:id', adminOnly, llmController.getById);

// POST /api/parametres/llm - Crée une nouvelle configuration
router.post('/', adminOnly, llmController.create);

// PUT /api/parametres/llm/:id - Met à jour une configuration
router.put('/:id', adminOnly, llmController.update);

// DELETE /api/parametres/llm/:id - Supprime une configuration
router.delete('/:id', adminOnly, llmController.delete);

// POST /api/parametres/llm/:id/test - Teste la connexion
router.post('/:id/test', adminOnly, llmController.testConnection);

// PATCH /api/parametres/llm/:id/toggle - Active/désactive
router.patch('/:id/toggle', adminOnly, llmController.toggle);

// PATCH /api/parametres/llm/:id/set-default - Définit par défaut
router.patch('/:id/set-default', adminOnly, llmController.setDefault);

module.exports = router;
