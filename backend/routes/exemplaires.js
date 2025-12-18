/**
 * Routes pour la gestion des exemplaires multiples
 */

const express = require('express');
const router = express.Router();
const exemplaireController = require('../controllers/exemplaireController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Toutes les routes necessitent authentification
router.use(verifyToken);

// ============================================================
// Routes generiques par module
// ============================================================

/**
 * Obtenir un exemplaire par ID
 * GET /api/exemplaires/:module/:exemplaireId
 */
router.get('/:module/:exemplaireId',
  checkRole(['agent', 'gestionnaire', 'administrateur']),
  exemplaireController.getExemplaireById
);

/**
 * Modifier un exemplaire
 * PUT /api/exemplaires/:module/:exemplaireId
 */
router.put('/:module/:exemplaireId',
  checkRole(['gestionnaire', 'administrateur']),
  exemplaireController.updateExemplaire
);

/**
 * Supprimer un exemplaire
 * DELETE /api/exemplaires/:module/:exemplaireId
 */
router.delete('/:module/:exemplaireId',
  checkRole(['gestionnaire', 'administrateur']),
  exemplaireController.deleteExemplaire
);

// ============================================================
// Routes speciales
// ============================================================

/**
 * Trouver un exemplaire par code-barre (recherche globale)
 * GET /api/exemplaires/by-barcode/:codeBarre
 */
router.get('/by-barcode/:codeBarre',
  checkRole(['agent', 'gestionnaire', 'administrateur']),
  exemplaireController.getExemplaireByBarcode
);

/**
 * Assigner un code-barre a un exemplaire
 * POST /api/exemplaires/assign-barcode
 * Body: { module, exemplaireId, codeBarre }
 */
router.post('/assign-barcode',
  checkRole(['gestionnaire', 'administrateur']),
  exemplaireController.assignBarcode
);

/**
 * Rechercher un article par EAN et retourner ses exemplaires sans code-barre
 * GET /api/exemplaires/search-by-ean/:ean
 */
router.get('/search-by-ean/:ean',
  checkRole(['agent', 'gestionnaire', 'administrateur']),
  exemplaireController.searchByEAN
);

module.exports = router;
