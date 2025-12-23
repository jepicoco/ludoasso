/**
 * Routes Provenances
 *
 * Gestion des types de provenance d'articles et du mapping comptable
 */

const express = require('express');
const router = express.Router();
const provenancesController = require('../controllers/provenancesController');
const { verifyToken } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// ======================================================
// Routes CRUD Provenances
// ======================================================

// GET /api/provenances - Liste des provenances
router.get('/', provenancesController.getAll);

// GET /api/provenances/stats - Statistiques d'utilisation
router.get('/stats', provenancesController.getStats);

// GET /api/provenances/configuration/:structureId? - Configuration comptable par structure
router.get('/configuration', provenancesController.getConfiguration);
router.get('/configuration/:structureId', provenancesController.getConfiguration);

// PUT /api/provenances/ordre - Mise à jour de l'ordre (drag & drop)
router.put('/ordre', checkRole(['gestionnaire', 'administrateur']), provenancesController.updateOrdre);

// GET /api/provenances/:id - Détail d'une provenance
router.get('/:id', provenancesController.getById);

// POST /api/provenances - Créer une provenance
router.post('/', checkRole(['gestionnaire', 'administrateur']), provenancesController.create);

// PUT /api/provenances/:id - Modifier une provenance
router.put('/:id', checkRole(['gestionnaire', 'administrateur']), provenancesController.update);

// DELETE /api/provenances/:id - Supprimer une provenance
router.delete('/:id', checkRole(['administrateur']), provenancesController.delete);

// ======================================================
// Routes Configuration Comptable
// ======================================================

// GET /api/provenances/:id/configuration/:structureId? - Config comptable d'une provenance
router.get('/:id/configuration', provenancesController.getConfigurationByProvenance);
router.get('/:id/configuration/:structureId', provenancesController.getConfigurationByProvenance);

// PUT /api/provenances/:id/configuration/:structureId? - Modifier la config comptable
router.put('/:id/configuration', checkRole(['comptable', 'administrateur']), provenancesController.updateConfiguration);
router.put('/:id/configuration/:structureId', checkRole(['comptable', 'administrateur']), provenancesController.updateConfiguration);

// DELETE /api/provenances/:id/configuration/:structureId - Supprimer config spécifique structure
router.delete('/:id/configuration/:structureId', checkRole(['administrateur']), provenancesController.deleteConfiguration);

module.exports = router;
