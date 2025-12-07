/**
 * Routes pour l'enrichissement IA des articles
 * /api/enrichissement
 */

const express = require('express');
const router = express.Router();
const enrichissementController = require('../controllers/enrichissementController');
const { verifyToken, checkRole } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(verifyToken);

// Acces gestionnaire ou admin pour l'enrichissement
const manageAccess = checkRole(['gestionnaire', 'administrateur']);
const adminOnly = checkRole(['administrateur']);

// ==========================================
// ROUTES BATCH
// ==========================================

// POST /api/enrichissement/batch - Lance un batch
router.post('/batch', adminOnly, enrichissementController.lancerBatch);

// POST /api/enrichissement/dry-run - Estimation sans traitement
router.post('/dry-run', adminOnly, enrichissementController.dryRun);

// GET /api/enrichissement/batch/:batchId/stream - Streaming SSE du traitement
router.get('/batch/:batchId/stream', adminOnly, enrichissementController.streamBatch);

// GET /api/enrichissement/batch/:batchId - Stats d'un batch
router.get('/batch/:batchId', manageAccess, enrichissementController.getStatsBatch);

// POST /api/enrichissement/batch/:batchId/valider - Valide tout un batch
router.post('/batch/:batchId/valider', adminOnly, enrichissementController.validerBatch);

// POST /api/enrichissement/batch/:batchId/annuler - Annule un batch en cours
router.post('/batch/:batchId/annuler', adminOnly, enrichissementController.annulerBatch);

// GET /api/enrichissement/batches - Liste des batches recents
router.get('/batches', manageAccess, enrichissementController.getBatchsRecents);

// GET /api/enrichissement/active - Batches actifs en cours
router.get('/active', manageAccess, enrichissementController.getActiveBatches);

// ==========================================
// ROUTES VALIDATION
// ==========================================

// GET /api/enrichissement/validation - Items en attente
router.get('/validation', manageAccess, enrichissementController.getEnAttenteValidation);

// GET /api/enrichissement/:id - Detail d'un item
router.get('/:id', manageAccess, enrichissementController.getItemValidation);

// POST /api/enrichissement/:id/valider - Valide un item
router.post('/:id/valider', manageAccess, enrichissementController.validerItem);

// POST /api/enrichissement/:id/rejeter - Rejette un item
router.post('/:id/rejeter', manageAccess, enrichissementController.rejeterItem);

// PUT /api/enrichissement/:id/thematiques - Modifie les thematiques proposees
router.put('/:id/thematiques', manageAccess, enrichissementController.modifierProposition);

// ==========================================
// ROUTES ARTICLES
// ==========================================

// GET /api/enrichissement/articles - Liste articles a enrichir
router.get('/articles', manageAccess, enrichissementController.getArticlesAEnrichir);

// POST /api/enrichissement/article - Enrichit un seul article (test)
router.post('/article', adminOnly, enrichissementController.enrichirArticle);

module.exports = router;
