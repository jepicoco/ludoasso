const express = require('express');
const router = express.Router();
const livreController = require('../controllers/livreController');
const { verifyToken } = require('../middleware/auth');
const { isAgent, checkModuleAccess } = require('../middleware/checkRole');

// Middleware pour vérifier l'accès au module bibliothèque
const checkBiblioAccess = checkModuleAccess('bibliotheque');

// Routes publiques (référentiels)
router.get('/genres', livreController.getGenres);
router.get('/formats', livreController.getFormats);
router.get('/collections', livreController.getCollections);
router.get('/emplacements', livreController.getEmplacements);
router.get('/stats', livreController.getStats);

// Routes CRUD pour les livres (lecture publique)
router.get('/', livreController.getAllLivres);
router.get('/:id', livreController.getLivreById);

// Routes protégées (agent+ avec accès bibliothèque)
router.post('/', verifyToken, isAgent(), checkBiblioAccess, livreController.createLivre);
router.put('/:id', verifyToken, isAgent(), checkBiblioAccess, livreController.updateLivre);
router.delete('/:id', verifyToken, isAgent(), checkBiblioAccess, livreController.deleteLivre);

module.exports = router;
