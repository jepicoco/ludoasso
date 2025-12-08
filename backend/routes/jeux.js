const express = require('express');
const router = express.Router();
const jeuController = require('../controllers/jeuController');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { isAgent, checkModuleAccess } = require('../middleware/checkRole');
const { validate, schemas } = require('../middleware/validate');

// Middleware pour vérifier l'accès au module ludothèque (pour les routes protégées)
const checkLudoAccess = checkModuleAccess('ludotheque');

/**
 * @route   GET /api/jeux/categories
 * @desc    Get all available categories
 * @access  Public
 */
router.get('/categories', jeuController.getCategories);

/**
 * @route   POST /api/jeux/lookup-ean
 * @desc    Lookup game info from EAN barcode or title via UPCitemdb + BGG
 * @access  Private (agent+ avec accès ludothèque)
 * @body    { ean: "3558380077992" } or { title: "Catan" }
 */
router.post('/lookup-ean', verifyToken, isAgent(), checkLudoAccess, jeuController.lookupEAN);

/**
 * @route   GET /api/jeux
 * @desc    Get all jeux with filters
 * @access  Public (with optional auth)
 * @query   ?statut=disponible&categorie=Stratégie&search=monopoly&age_min=8&nb_joueurs=4
 */
router.get('/', optionalAuth, validate(schemas.jeu.list), jeuController.getAllJeux);

/**
 * @route   GET /api/jeux/:id
 * @desc    Get jeu by ID with emprunts history
 * @access  Public (with optional auth)
 */
router.get('/:id', optionalAuth, validate(schemas.jeu.getById), jeuController.getJeuById);

/**
 * @route   POST /api/jeux
 * @desc    Create new jeu
 * @access  Private (agent+ avec accès ludothèque)
 */
router.post('/', verifyToken, isAgent(), checkLudoAccess, validate(schemas.jeu.create), jeuController.createJeu);

/**
 * @route   PUT /api/jeux/:id
 * @desc    Update jeu
 * @access  Private (agent+ avec accès ludothèque)
 */
router.put('/:id', verifyToken, isAgent(), checkLudoAccess, validate(schemas.jeu.update), jeuController.updateJeu);

/**
 * @route   DELETE /api/jeux/:id
 * @desc    Delete jeu
 * @access  Private (gestionnaire+ avec accès ludothèque)
 */
router.delete('/:id', verifyToken, isAgent(), checkLudoAccess, validate(schemas.jeu.getById), jeuController.deleteJeu);

module.exports = router;
