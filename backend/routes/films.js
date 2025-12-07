const express = require('express');
const router = express.Router();
const filmController = require('../controllers/filmController');
const { verifyToken } = require('../middleware/auth');
const { isAgent, checkModuleAccess } = require('../middleware/checkRole');

// Middleware pour vérifier l'accès au module filmothèque
const checkFilmoAccess = checkModuleAccess('filmotheque');

// Apply authentication to all routes
router.use(verifyToken);

// ============================================
// Films CRUD
// ============================================
router.get('/', filmController.getAll);
router.get('/stats', filmController.getStats);
router.get('/:id', filmController.getById);
router.post('/', isAgent(), checkFilmoAccess, filmController.create);
router.put('/:id', isAgent(), checkFilmoAccess, filmController.update);
router.delete('/:id', isAgent(), checkFilmoAccess, filmController.delete);

// ============================================
// Référentiels - Genres Films (agent+ avec accès filmothèque pour modification)
// ============================================
router.get('/referentiels/genres', filmController.getGenres);
router.post('/referentiels/genres', isAgent(), checkFilmoAccess, filmController.createGenre);
router.put('/referentiels/genres/:id', isAgent(), checkFilmoAccess, filmController.updateGenre);
router.delete('/referentiels/genres/:id', isAgent(), checkFilmoAccess, filmController.deleteGenre);

// ============================================
// Référentiels - Réalisateurs
// ============================================
router.get('/referentiels/realisateurs', filmController.getRealisateurs);
router.post('/referentiels/realisateurs', isAgent(), checkFilmoAccess, filmController.createRealisateur);
router.put('/referentiels/realisateurs/:id', isAgent(), checkFilmoAccess, filmController.updateRealisateur);
router.delete('/referentiels/realisateurs/:id', isAgent(), checkFilmoAccess, filmController.deleteRealisateur);

// ============================================
// Référentiels - Acteurs
// ============================================
router.get('/referentiels/acteurs', filmController.getActeurs);
router.post('/referentiels/acteurs', isAgent(), checkFilmoAccess, filmController.createActeur);
router.put('/referentiels/acteurs/:id', isAgent(), checkFilmoAccess, filmController.updateActeur);
router.delete('/referentiels/acteurs/:id', isAgent(), checkFilmoAccess, filmController.deleteActeur);

// ============================================
// Référentiels - Studios
// ============================================
router.get('/referentiels/studios', filmController.getStudios);
router.post('/referentiels/studios', isAgent(), checkFilmoAccess, filmController.createStudio);
router.put('/referentiels/studios/:id', isAgent(), checkFilmoAccess, filmController.updateStudio);
router.delete('/referentiels/studios/:id', isAgent(), checkFilmoAccess, filmController.deleteStudio);

// ============================================
// Référentiels - Supports Vidéo
// ============================================
router.get('/referentiels/supports', filmController.getSupports);
router.post('/referentiels/supports', isAgent(), checkFilmoAccess, filmController.createSupport);
router.put('/referentiels/supports/:id', isAgent(), checkFilmoAccess, filmController.updateSupport);
router.delete('/referentiels/supports/:id', isAgent(), checkFilmoAccess, filmController.deleteSupport);

// ============================================
// Référentiels - Emplacements Films
// ============================================
router.get('/referentiels/emplacements', filmController.getEmplacements);
router.post('/referentiels/emplacements', isAgent(), checkFilmoAccess, filmController.createEmplacement);
router.put('/referentiels/emplacements/:id', isAgent(), checkFilmoAccess, filmController.updateEmplacement);
router.delete('/referentiels/emplacements/:id', isAgent(), checkFilmoAccess, filmController.deleteEmplacement);

module.exports = router;
