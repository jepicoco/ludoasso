/**
 * Routes API Tarification Avancée
 * Gestion des types de tarifs, quotients familiaux, et règles de réduction
 */

const express = require('express');
const router = express.Router();
const tarificationController = require('../controllers/tarificationController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const { structureContext } = require('../middleware/structureContext');

// ============================================================
// SIMULATION ET CALCUL (gestionnaire+)
// ============================================================

// Simuler le calcul d'une cotisation
router.post('/simuler',
  verifyToken,
  structureContext(),
  checkRole(['gestionnaire', 'comptable', 'administrateur']),
  tarificationController.simulerCotisation
);

// Créer une cotisation avec calcul complet (arbre de décision inclus)
router.post('/creer',
  verifyToken,
  structureContext({ required: true }),
  checkRole(['gestionnaire', 'comptable', 'administrateur']),
  tarificationController.creerCotisation
);

// Tarifs disponibles pour un utilisateur
router.get('/tarifs-disponibles/:utilisateurId',
  verifyToken,
  structureContext(),
  checkRole(['gestionnaire', 'comptable', 'administrateur']),
  tarificationController.getTarifsDisponibles
);

// Récapitulatif des réductions d'une cotisation
router.get('/cotisation/:cotisationId/reductions',
  verifyToken,
  structureContext(),
  checkRole(['gestionnaire', 'comptable', 'administrateur']),
  tarificationController.getRecapitulatifReductions
);

// ============================================================
// TYPES DE TARIFS (admin)
// ============================================================

router.get('/types-tarifs',
  verifyToken,
  structureContext(),
  checkRole(['gestionnaire', 'comptable', 'administrateur']),
  tarificationController.getTypesTarifs
);

router.post('/types-tarifs',
  verifyToken,
  structureContext(),
  checkRole(['administrateur']),
  tarificationController.createTypeTarif
);

router.put('/types-tarifs/:id',
  verifyToken,
  structureContext(),
  checkRole(['administrateur']),
  tarificationController.updateTypeTarif
);

// ============================================================
// CONFIGURATIONS QUOTIENT FAMILIAL (admin)
// ============================================================

router.get('/configurations-qf',
  verifyToken,
  structureContext(),
  checkRole(['gestionnaire', 'comptable', 'administrateur']),
  tarificationController.getConfigurationsQF
);

router.post('/configurations-qf',
  verifyToken,
  structureContext(),
  checkRole(['administrateur']),
  tarificationController.createConfigurationQF
);

// ============================================================
// QUOTIENT FAMILIAL UTILISATEURS (gestionnaire+)
// ============================================================

router.get('/utilisateur/:id/qf',
  verifyToken,
  structureContext(),
  checkRole(['gestionnaire', 'comptable', 'administrateur']),
  tarificationController.getUtilisateurQF
);

router.post('/utilisateur/:id/qf',
  verifyToken,
  structureContext(),
  checkRole(['gestionnaire', 'comptable', 'administrateur']),
  tarificationController.setUtilisateurQF
);

router.put('/utilisateur/:id/qf/heritage',
  verifyToken,
  structureContext(),
  checkRole(['gestionnaire', 'comptable', 'administrateur']),
  tarificationController.setHeritageQF
);

// Import QF (admin)
router.post('/qf/import',
  verifyToken,
  structureContext(),
  checkRole(['administrateur']),
  tarificationController.importerQF
);

// ============================================================
// RÈGLES DE RÉDUCTION (admin)
// ============================================================

router.get('/regles-reduction',
  verifyToken,
  structureContext(),
  checkRole(['gestionnaire', 'comptable', 'administrateur']),
  tarificationController.getReglesReduction
);

router.post('/regles-reduction',
  verifyToken,
  structureContext(),
  checkRole(['administrateur']),
  tarificationController.createRegleReduction
);

router.put('/regles-reduction/:id',
  verifyToken,
  structureContext(),
  checkRole(['administrateur']),
  tarificationController.updateRegleReduction
);

router.delete('/regles-reduction/:id',
  verifyToken,
  structureContext(),
  checkRole(['administrateur']),
  tarificationController.deleteRegleReduction
);

module.exports = router;
