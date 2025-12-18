const express = require('express');
const router = express.Router();
const filmController = require('../controllers/filmController');
const exemplaireController = require('../controllers/exemplaireController');
const { verifyToken } = require('../middleware/auth');
const { isAgent, checkModuleAccess } = require('../middleware/checkRole');

// Middleware pour vérifier l'accès au module filmothèque
const checkFilmoAccess = checkModuleAccess('filmotheque');

// Middleware pour injecter le module dans les params (pour les routes exemplaires)
const setModuleFilm = (req, res, next) => {
  req.params.module = 'film';
  req.params.articleId = req.params.id;
  next();
};

// Apply authentication to all routes
router.use(verifyToken);

// ============================================
// Stats (avant /:id pour éviter conflit)
// ============================================
router.get('/stats', filmController.getStats);

// ============================================
// Référentiels - Genres Films (AVANT /:id pour éviter conflit)
// ============================================
router.get('/referentiels/genres', filmController.getGenres);
router.post('/referentiels/genres', isAgent(), checkFilmoAccess, filmController.createGenre);
router.put('/referentiels/genres/:id', isAgent(), checkFilmoAccess, filmController.updateGenre);
router.delete('/referentiels/genres/:id', isAgent(), checkFilmoAccess, filmController.deleteGenre);
router.patch('/referentiels/genres/:id/toggle', isAgent(), checkFilmoAccess, filmController.toggleGenre);

// ============================================
// Référentiels - Réalisateurs
// ============================================
router.get('/referentiels/realisateurs', filmController.getRealisateurs);
router.post('/referentiels/realisateurs', isAgent(), checkFilmoAccess, filmController.createRealisateur);
router.put('/referentiels/realisateurs/:id', isAgent(), checkFilmoAccess, filmController.updateRealisateur);
router.delete('/referentiels/realisateurs/:id', isAgent(), checkFilmoAccess, filmController.deleteRealisateur);
router.patch('/referentiels/realisateurs/:id/toggle', isAgent(), checkFilmoAccess, filmController.toggleRealisateur);

// ============================================
// Référentiels - Acteurs
// ============================================
router.get('/referentiels/acteurs', filmController.getActeurs);
router.post('/referentiels/acteurs', isAgent(), checkFilmoAccess, filmController.createActeur);
router.put('/referentiels/acteurs/:id', isAgent(), checkFilmoAccess, filmController.updateActeur);
router.delete('/referentiels/acteurs/:id', isAgent(), checkFilmoAccess, filmController.deleteActeur);
router.patch('/referentiels/acteurs/:id/toggle', isAgent(), checkFilmoAccess, filmController.toggleActeur);

// ============================================
// Référentiels - Studios
// ============================================
router.get('/referentiels/studios', filmController.getStudios);
router.post('/referentiels/studios', isAgent(), checkFilmoAccess, filmController.createStudio);
router.put('/referentiels/studios/:id', isAgent(), checkFilmoAccess, filmController.updateStudio);
router.delete('/referentiels/studios/:id', isAgent(), checkFilmoAccess, filmController.deleteStudio);
router.patch('/referentiels/studios/:id/toggle', isAgent(), checkFilmoAccess, filmController.toggleStudio);

// ============================================
// Référentiels - Supports Vidéo
// ============================================
router.get('/referentiels/supports', filmController.getSupports);
router.post('/referentiels/supports', isAgent(), checkFilmoAccess, filmController.createSupport);
router.put('/referentiels/supports/:id', isAgent(), checkFilmoAccess, filmController.updateSupport);
router.delete('/referentiels/supports/:id', isAgent(), checkFilmoAccess, filmController.deleteSupport);
router.patch('/referentiels/supports/:id/toggle', isAgent(), checkFilmoAccess, filmController.toggleSupport);

// ============================================
// Référentiels - Emplacements Films
// ============================================
router.get('/referentiels/emplacements', filmController.getEmplacements);
router.post('/referentiels/emplacements', isAgent(), checkFilmoAccess, filmController.createEmplacement);
router.put('/referentiels/emplacements/:id', isAgent(), checkFilmoAccess, filmController.updateEmplacement);
router.delete('/referentiels/emplacements/:id', isAgent(), checkFilmoAccess, filmController.deleteEmplacement);
router.patch('/referentiels/emplacements/:id/toggle', isAgent(), checkFilmoAccess, filmController.toggleEmplacement);

// ============================================
// Films CRUD (/:id en DERNIER pour éviter conflit avec routes spécifiques)
// ============================================
router.get('/', filmController.getAll);
router.get('/:id', filmController.getById);
router.post('/', isAgent(), checkFilmoAccess, filmController.create);
router.put('/:id', isAgent(), checkFilmoAccess, filmController.update);
router.delete('/:id', isAgent(), checkFilmoAccess, filmController.delete);

// ============================================
// Routes Exemplaires
// ============================================

/**
 * @route   GET /api/films/:id/exemplaires
 * @desc    Liste les exemplaires d'un film
 * @access  Private (agent+ avec accès filmothèque)
 */
router.get('/:id/exemplaires', isAgent(), checkFilmoAccess, setModuleFilm, exemplaireController.getExemplaires);

/**
 * @route   POST /api/films/:id/exemplaires
 * @desc    Créer un nouvel exemplaire pour un film
 * @access  Private (agent+ avec accès filmothèque)
 */
router.post('/:id/exemplaires', isAgent(), checkFilmoAccess, setModuleFilm, exemplaireController.createExemplaire);

/**
 * @route   GET /api/films/:id/exemplaires/disponibles
 * @desc    Liste les exemplaires disponibles d'un film
 * @access  Private (agent+ avec accès filmothèque)
 */
router.get('/:id/exemplaires/disponibles', isAgent(), checkFilmoAccess, setModuleFilm, exemplaireController.getExemplairesDisponibles);

/**
 * @route   GET /api/films/:id/exemplaires/sans-code-barre
 * @desc    Liste les exemplaires sans code-barre d'un film
 * @access  Private (agent+ avec accès filmothèque)
 */
router.get('/:id/exemplaires/sans-code-barre', isAgent(), checkFilmoAccess, setModuleFilm, exemplaireController.getExemplairesSansCodeBarre);

/**
 * @route   GET /api/films/:id/exemplaires/stats
 * @desc    Statistiques des exemplaires d'un film
 * @access  Private (agent+ avec accès filmothèque)
 */
router.get('/:id/exemplaires/stats', isAgent(), checkFilmoAccess, setModuleFilm, exemplaireController.getExemplairesStats);

module.exports = router;
