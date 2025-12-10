/**
 * Routes pour la recherche EAN/ISBN
 * Fournit des endpoints generiques pour toutes les collections
 */

const express = require('express');
const router = express.Router();
const eanLookupController = require('../controllers/eanLookupController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Toutes les routes necessitent une authentification
router.use(verifyToken);

/**
 * POST /api/lookup/ean
 * Recherche par code EAN/ISBN
 * Body: { code: "3558380077992", collection: "jeu", forceRefresh: false }
 */
router.post('/ean', eanLookupController.lookupByCode);

/**
 * POST /api/lookup/title
 * Recherche par titre
 * Body: { title: "Catan", collection: "jeu" }
 */
router.post('/title', eanLookupController.lookupByTitle);

/**
 * POST /api/lookup/search
 * Recherche automatique (detecte si c'est un code ou un titre)
 * Body: { query: "3558380077992", type: "auto" | "ean" | "title", collection: "jeu" }
 */
router.post('/search', eanLookupController.search);

/**
 * GET /api/lookup/detect/:code
 * Detecte le type de code (EAN, ISBN-10, ISBN-13, UPC)
 */
router.get('/detect/:code', eanLookupController.detectCode);

/**
 * GET /api/lookup/cache/stats
 * Statistiques du cache (admin uniquement)
 */
router.get('/cache/stats', checkRole(['administrateur', 'gestionnaire']), eanLookupController.getCacheStats);

/**
 * DELETE /api/lookup/cache
 * Vide le cache (admin uniquement)
 */
router.delete('/cache', checkRole(['administrateur']), eanLookupController.clearCache);

module.exports = router;
