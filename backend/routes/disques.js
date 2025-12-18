/**
 * Disques Routes
 * Routes for music discs/vinyl management
 */

const express = require('express');
const router = express.Router();
const disqueController = require('../controllers/disqueController');
const exemplaireController = require('../controllers/exemplaireController');
const { verifyToken } = require('../middleware/auth');
const { isAgent, checkModuleAccess } = require('../middleware/checkRole');

// Middleware pour vérifier l'accès au module discothèque
const checkDiscoAccess = checkModuleAccess('discotheque');

// Middleware pour injecter le module dans les params (pour les routes exemplaires)
const setModuleDisque = (req, res, next) => {
  req.params.module = 'disque';
  req.params.articleId = req.params.id;
  next();
};

// All routes require authentication
router.use(verifyToken);

// Stats
router.get('/stats', disqueController.getStats);

// ============================================
// Référentiels - Genres Musicaux
// ============================================
router.get('/referentiels/genres', disqueController.getGenres);
router.post('/referentiels/genres', isAgent(), checkDiscoAccess, disqueController.createGenre);
router.put('/referentiels/genres/:id', isAgent(), checkDiscoAccess, disqueController.updateGenre);
router.delete('/referentiels/genres/:id', isAgent(), checkDiscoAccess, disqueController.deleteGenre);
router.patch('/referentiels/genres/:id/toggle', isAgent(), checkDiscoAccess, disqueController.toggleGenre);

// ============================================
// Référentiels - Formats Disques
// ============================================
router.get('/referentiels/formats', disqueController.getFormats);
router.post('/referentiels/formats', isAgent(), checkDiscoAccess, disqueController.createFormat);
router.put('/referentiels/formats/:id', isAgent(), checkDiscoAccess, disqueController.updateFormat);
router.delete('/referentiels/formats/:id', isAgent(), checkDiscoAccess, disqueController.deleteFormat);
router.patch('/referentiels/formats/:id/toggle', isAgent(), checkDiscoAccess, disqueController.toggleFormat);

// ============================================
// Référentiels - Emplacements Disques
// ============================================
router.get('/referentiels/emplacements', disqueController.getEmplacements);
router.post('/referentiels/emplacements', isAgent(), checkDiscoAccess, disqueController.createEmplacement);
router.put('/referentiels/emplacements/:id', isAgent(), checkDiscoAccess, disqueController.updateEmplacement);
router.delete('/referentiels/emplacements/:id', isAgent(), checkDiscoAccess, disqueController.deleteEmplacement);
router.patch('/referentiels/emplacements/:id/toggle', isAgent(), checkDiscoAccess, disqueController.toggleEmplacement);

// ============================================
// Référentiels - Artistes
// ============================================
router.get('/referentiels/artistes', disqueController.getArtistes);
router.post('/referentiels/artistes', isAgent(), checkDiscoAccess, disqueController.createArtiste);
router.put('/referentiels/artistes/:id', isAgent(), checkDiscoAccess, disqueController.updateArtiste);
router.delete('/referentiels/artistes/:id', isAgent(), checkDiscoAccess, disqueController.deleteArtiste);
router.patch('/referentiels/artistes/:id/toggle', isAgent(), checkDiscoAccess, disqueController.toggleArtiste);

// ============================================
// Référentiels - Labels
// ============================================
router.get('/referentiels/labels', disqueController.getLabels);
router.post('/referentiels/labels', isAgent(), checkDiscoAccess, disqueController.createLabel);
router.put('/referentiels/labels/:id', isAgent(), checkDiscoAccess, disqueController.updateLabel);
router.delete('/referentiels/labels/:id', isAgent(), checkDiscoAccess, disqueController.deleteLabel);
router.patch('/referentiels/labels/:id/toggle', isAgent(), checkDiscoAccess, disqueController.toggleLabel);

// ============================================
// CRUD Disques
// ============================================
router.get('/', disqueController.getAllDisques);
router.get('/:id', disqueController.getDisqueById);
router.post('/', isAgent(), checkDiscoAccess, disqueController.createDisque);
router.put('/:id', isAgent(), checkDiscoAccess, disqueController.updateDisque);
router.delete('/:id', isAgent(), checkDiscoAccess, disqueController.deleteDisque);

// ============================================
// Routes Exemplaires
// ============================================

/**
 * @route   GET /api/disques/:id/exemplaires
 * @desc    Liste les exemplaires d'un disque
 * @access  Private (agent+ avec accès discothèque)
 */
router.get('/:id/exemplaires', isAgent(), checkDiscoAccess, setModuleDisque, exemplaireController.getExemplaires);

/**
 * @route   POST /api/disques/:id/exemplaires
 * @desc    Créer un nouvel exemplaire pour un disque
 * @access  Private (agent+ avec accès discothèque)
 */
router.post('/:id/exemplaires', isAgent(), checkDiscoAccess, setModuleDisque, exemplaireController.createExemplaire);

/**
 * @route   GET /api/disques/:id/exemplaires/disponibles
 * @desc    Liste les exemplaires disponibles d'un disque
 * @access  Private (agent+ avec accès discothèque)
 */
router.get('/:id/exemplaires/disponibles', isAgent(), checkDiscoAccess, setModuleDisque, exemplaireController.getExemplairesDisponibles);

/**
 * @route   GET /api/disques/:id/exemplaires/sans-code-barre
 * @desc    Liste les exemplaires sans code-barre d'un disque
 * @access  Private (agent+ avec accès discothèque)
 */
router.get('/:id/exemplaires/sans-code-barre', isAgent(), checkDiscoAccess, setModuleDisque, exemplaireController.getExemplairesSansCodeBarre);

/**
 * @route   GET /api/disques/:id/exemplaires/stats
 * @desc    Statistiques des exemplaires d'un disque
 * @access  Private (agent+ avec accès discothèque)
 */
router.get('/:id/exemplaires/stats', isAgent(), checkDiscoAccess, setModuleDisque, exemplaireController.getExemplairesStats);

module.exports = router;
