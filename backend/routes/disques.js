/**
 * Disques Routes
 * Routes for music discs/vinyl management
 */

const express = require('express');
const router = express.Router();
const disqueController = require('../controllers/disqueController');
const { verifyToken } = require('../middleware/auth');
const { isAgent, checkModuleAccess } = require('../middleware/checkRole');

// Middleware pour vérifier l'accès au module discothèque
const checkDiscoAccess = checkModuleAccess('discotheque');

// All routes require authentication
router.use(verifyToken);

// Référentiels (lecture pour tous les utilisateurs authentifiés)
router.get('/referentiels/genres', disqueController.getGenres);
router.get('/referentiels/formats', disqueController.getFormats);
router.get('/referentiels/labels', disqueController.getLabels);
router.get('/referentiels/emplacements', disqueController.getEmplacements);
router.get('/referentiels/artistes', disqueController.getArtistes);

// Create new referentiel items (agent+ avec accès discothèque)
router.post('/referentiels/artistes', isAgent(), checkDiscoAccess, disqueController.createArtiste);
router.post('/referentiels/labels', isAgent(), checkDiscoAccess, disqueController.createLabel);

// Stats
router.get('/stats', disqueController.getStats);

// CRUD Disques (lecture pour tous, modification pour agent+ avec accès discothèque)
router.get('/', disqueController.getAllDisques);
router.get('/:id', disqueController.getDisqueById);
router.post('/', isAgent(), checkDiscoAccess, disqueController.createDisque);
router.put('/:id', isAgent(), checkDiscoAccess, disqueController.updateDisque);
router.delete('/:id', isAgent(), checkDiscoAccess, disqueController.deleteDisque);

module.exports = router;
