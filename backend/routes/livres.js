const express = require('express');
const router = express.Router();
const livreController = require('../controllers/livreController');
const livreReferentielsController = require('../controllers/livreReferentielsController');
const exemplaireController = require('../controllers/exemplaireController');
const { verifyToken } = require('../middleware/auth');
const { isAgent, checkModuleAccess } = require('../middleware/checkRole');

// Middleware pour vérifier l'accès au module bibliothèque
const checkBiblioAccess = checkModuleAccess('bibliotheque');

// Middleware pour injecter le module dans les params (pour les routes exemplaires)
const setModuleLivre = (req, res, next) => {
  req.params.module = 'livre';
  req.params.articleId = req.params.id;
  next();
};

// Routes publiques (référentiels)
router.get('/genres', livreController.getGenres);
router.get('/formats', livreController.getFormats);
router.get('/collections', livreController.getCollections);
router.get('/emplacements', livreController.getEmplacements);
router.get('/roles-contributeurs', livreController.getRolesContributeurs);
router.get('/stats', livreController.getStats);

// Routes CRUD pour les référentiels (protégées)
// Genres
router.post('/referentiels/genres', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.createGenre);
router.put('/referentiels/genres/:id', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.updateGenre);
router.delete('/referentiels/genres/:id', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.deleteGenre);
router.patch('/referentiels/genres/:id/toggle', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.toggleGenre);

// Formats
router.post('/referentiels/formats', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.createFormat);
router.put('/referentiels/formats/:id', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.updateFormat);
router.delete('/referentiels/formats/:id', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.deleteFormat);
router.patch('/referentiels/formats/:id/toggle', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.toggleFormat);

// Collections
router.post('/referentiels/collections', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.createCollection);
router.put('/referentiels/collections/:id', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.updateCollection);
router.delete('/referentiels/collections/:id', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.deleteCollection);
router.patch('/referentiels/collections/:id/toggle', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.toggleCollection);

// Emplacements
router.post('/referentiels/emplacements', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.createEmplacement);
router.put('/referentiels/emplacements/:id', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.updateEmplacement);
router.delete('/referentiels/emplacements/:id', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.deleteEmplacement);
router.patch('/referentiels/emplacements/:id/toggle', verifyToken, isAgent(), checkBiblioAccess, livreReferentielsController.toggleEmplacement);

// Routes CRUD pour les livres (lecture publique)
router.get('/', livreController.getAllLivres);
router.get('/:id', livreController.getLivreById);

// Routes protégées (agent+ avec accès bibliothèque)
router.post('/', verifyToken, isAgent(), checkBiblioAccess, livreController.createLivre);
router.put('/:id', verifyToken, isAgent(), checkBiblioAccess, livreController.updateLivre);
router.delete('/:id', verifyToken, isAgent(), checkBiblioAccess, livreController.deleteLivre);

// ============================================
// Routes Exemplaires
// ============================================

/**
 * @route   GET /api/livres/:id/exemplaires
 * @desc    Liste les exemplaires d'un livre
 * @access  Private (agent+ avec accès bibliothèque)
 */
router.get('/:id/exemplaires', verifyToken, isAgent(), checkBiblioAccess, setModuleLivre, exemplaireController.getExemplaires);

/**
 * @route   POST /api/livres/:id/exemplaires
 * @desc    Créer un nouvel exemplaire pour un livre
 * @access  Private (agent+ avec accès bibliothèque)
 */
router.post('/:id/exemplaires', verifyToken, isAgent(), checkBiblioAccess, setModuleLivre, exemplaireController.createExemplaire);

/**
 * @route   GET /api/livres/:id/exemplaires/disponibles
 * @desc    Liste les exemplaires disponibles d'un livre
 * @access  Private (agent+ avec accès bibliothèque)
 */
router.get('/:id/exemplaires/disponibles', verifyToken, isAgent(), checkBiblioAccess, setModuleLivre, exemplaireController.getExemplairesDisponibles);

/**
 * @route   GET /api/livres/:id/exemplaires/sans-code-barre
 * @desc    Liste les exemplaires sans code-barre d'un livre
 * @access  Private (agent+ avec accès bibliothèque)
 */
router.get('/:id/exemplaires/sans-code-barre', verifyToken, isAgent(), checkBiblioAccess, setModuleLivre, exemplaireController.getExemplairesSansCodeBarre);

/**
 * @route   GET /api/livres/:id/exemplaires/stats
 * @desc    Statistiques des exemplaires d'un livre
 * @access  Private (agent+ avec accès bibliothèque)
 */
router.get('/:id/exemplaires/stats', verifyToken, isAgent(), checkBiblioAccess, setModuleLivre, exemplaireController.getExemplairesStats);

module.exports = router;
