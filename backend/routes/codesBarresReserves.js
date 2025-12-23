/**
 * Routes pour la gestion des codes-barres reserves
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/codesBarresReservesController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Roles autorises pour la gestion des codes-barres (admin uniquement)
const ADMIN_ROLES = ['administrateur'];

// ============================================
// Routes publiques (pour validation depuis formulaires)
// ============================================

// Valider un code scanne (accessible aux benevoles pour l'enregistrement)
router.post('/validate',
  verifyToken,
  checkRole(['administrateur', 'gestionnaire', 'benevole']),
  controller.validateScannedCode
);

// ============================================
// Routes de configuration (admin seulement)
// ============================================

// Obtenir les tokens disponibles pour le format
router.get('/tokens',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.getTokens
);

// Obtenir les parametres de tous les modules
router.get('/parametres',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.getAllParametres
);

// Obtenir les statistiques globales
router.get('/stats',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.getStats
);

// Obtenir les parametres d'un module
router.get('/parametres/:module',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.getParametres
);

// Mettre a jour les parametres d'un module
router.put('/parametres/:module',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.updateParametres
);

// Obtenir un apercu du format
router.get('/preview/:module',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.generatePreview
);

// ============================================
// Routes de gestion des lots
// ============================================

// Obtenir le detail d'un lot (avant les routes parametrees)
router.get('/lots/detail/:lotId',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.getLotDetails
);

// Obtenir les lots d'un module
router.get('/lots/:module',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.getLots
);

// Creer un nouveau lot
router.post('/lots/:module',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.createLot
);

// Imprimer un lot (generer PDF)
router.post('/lots/:lotId/print',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.printLot
);

// Annuler un lot
router.delete('/lots/:lotId',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.cancelLot
);

// ============================================
// Routes de gestion des codes individuels
// ============================================

// Obtenir les codes disponibles d'un module
router.get('/disponibles/:module',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.getAvailableCodes
);

// Annuler un code individuel
router.delete('/codes/:module/:codeId',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.cancelCode
);

// Restaurer un code annule
router.post('/codes/:module/:codeId/restore',
  verifyToken,
  checkRole(ADMIN_ROLES),
  controller.restoreCode
);

// Assigner un code a une entite
router.post('/assign/:module',
  verifyToken,
  checkRole(['administrateur', 'gestionnaire', 'benevole']),
  controller.assignCode
);

module.exports = router;
