const express = require('express');
const router = express.Router();
const jeuController = require('../controllers/jeuController');
const { verifyToken, optionalAuth } = require('../middleware/auth');

/**
 * @route   GET /api/jeux/categories
 * @desc    Get all available categories
 * @access  Public
 */
router.get('/categories', jeuController.getCategories);

/**
 * @route   POST /api/jeux/lookup-ean
 * @desc    Lookup game info from EAN barcode or title via UPCitemdb + BGG
 * @access  Private
 * @body    { ean: "3558380077992" } or { title: "Catan" }
 */
router.post('/lookup-ean', verifyToken, jeuController.lookupEAN);

/**
 * @route   GET /api/jeux
 * @desc    Get all jeux with filters
 * @access  Public (with optional auth)
 * @query   ?statut=disponible&categorie=Stratégie&search=monopoly&age_min=8&nb_joueurs=4
 */
router.get('/', optionalAuth, jeuController.getAllJeux);

/**
 * @route   GET /api/jeux/:id
 * @desc    Get jeu by ID with emprunts history
 * @access  Public (with optional auth)
 */
router.get('/:id', optionalAuth, jeuController.getJeuById);

/**
 * @route   POST /api/jeux
 * @desc    Create new jeu
 * @access  Private
 */
router.post('/', verifyToken, jeuController.createJeu);

/**
 * @route   PUT /api/jeux/:id
 * @desc    Update jeu
 * @access  Private
 */
router.put('/:id', verifyToken, jeuController.updateJeu);

/**
 * @route   DELETE /api/jeux/:id
 * @desc    Delete jeu
 * @access  Private
 */
router.delete('/:id', verifyToken, jeuController.deleteJeu);

module.exports = router;
