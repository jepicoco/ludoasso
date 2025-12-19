/**
 * Routes Structure Connecteurs
 * Gestion des connecteurs email/SMS par structure
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // Pour acceder a :structureId du parent
const structureConnecteursController = require('../controllers/structureConnecteursController');
const { verifyToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/checkRole');

// Toutes les routes necessitent authentification admin
router.use(verifyToken);
router.use(isAdmin());

/**
 * @route   GET /api/structures/:structureId/connecteurs
 * @desc    Recupere la configuration complete des connecteurs
 * @access  Private (admin uniquement)
 */
router.get('/', structureConnecteursController.getConfig);

/**
 * @route   PUT /api/structures/:structureId/connecteurs/defaults
 * @desc    Met a jour les connecteurs par defaut de la structure
 * @access  Private (admin uniquement)
 */
router.put('/defaults', structureConnecteursController.updateDefaults);

/**
 * @route   PUT /api/structures/:structureId/connecteurs/categories/:categorie
 * @desc    Met a jour l'override pour une categorie
 * @access  Private (admin uniquement)
 */
router.put('/categories/:categorie', structureConnecteursController.upsertCategoryOverride);

/**
 * @route   DELETE /api/structures/:structureId/connecteurs/categories/:categorie
 * @desc    Supprime l'override pour une categorie
 * @access  Private (admin uniquement)
 */
router.delete('/categories/:categorie', structureConnecteursController.deleteCategoryOverride);

/**
 * @route   PUT /api/structures/:structureId/connecteurs/events/:eventCode
 * @desc    Met a jour l'override pour un evenement
 * @access  Private (admin uniquement)
 */
router.put('/events/:eventCode', structureConnecteursController.upsertEventOverride);

/**
 * @route   DELETE /api/structures/:structureId/connecteurs/events/:eventCode
 * @desc    Supprime l'override pour un evenement
 * @access  Private (admin uniquement)
 */
router.delete('/events/:eventCode', structureConnecteursController.deleteEventOverride);

/**
 * @route   POST /api/structures/:structureId/connecteurs/batch
 * @desc    Met a jour plusieurs overrides en une fois
 * @access  Private (admin uniquement)
 */
router.post('/batch', structureConnecteursController.batchUpdate);

/**
 * @route   GET /api/structures/:structureId/connecteurs/test/:eventCode
 * @desc    Teste la resolution d'un connecteur pour un evenement
 * @access  Private (admin uniquement)
 */
router.get('/test/:eventCode', structureConnecteursController.testResolve);

module.exports = router;
