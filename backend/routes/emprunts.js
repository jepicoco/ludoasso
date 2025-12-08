const express = require('express');
const router = express.Router();
const empruntController = require('../controllers/empruntController');
const { verifyToken } = require('../middleware/auth');
const { isAgent, checkAnyModuleAccess, MODULES } = require('../middleware/checkRole');
const { validate, schemas } = require('../middleware/validate');

// Pour les emprunts, on vérifie qu'il a accès à au moins un module
// Le filtrage précis par module se fait dans le contrôleur
const checkAnyModule = checkAnyModuleAccess(MODULES);

/**
 * @route   GET /api/emprunts/overdue
 * @desc    Get all overdue emprunts
 * @access  Private (agent+)
 */
router.get('/overdue', verifyToken, isAgent(), checkAnyModule, empruntController.getOverdueEmprunts);

/**
 * @route   GET /api/emprunts
 * @desc    Get all emprunts with filters
 * @access  Private (agent+)
 * @query   ?statut=en_cours&adherent_id=1&jeu_id=2
 */
router.get('/', verifyToken, isAgent(), checkAnyModule, validate(schemas.emprunt.list), empruntController.getAllEmprunts);

/**
 * @route   GET /api/emprunts/:id
 * @desc    Get emprunt by ID
 * @access  Private (agent+)
 */
router.get('/:id', verifyToken, isAgent(), checkAnyModule, validate(schemas.emprunt.getById), empruntController.getEmpruntById);

/**
 * @route   POST /api/emprunts
 * @desc    Create new emprunt (loan a game)
 * @access  Private (agent+ - module vérifié dans le contrôleur selon l'item)
 */
router.post('/', verifyToken, isAgent(), validate(schemas.emprunt.create), empruntController.createEmprunt);

/**
 * @route   POST /api/emprunts/:id/retour
 * @desc    Return a game
 * @access  Private (agent+ - module vérifié dans le contrôleur selon l'item)
 */
router.post('/:id/retour', verifyToken, isAgent(), validate(schemas.emprunt.getById), empruntController.retourEmprunt);

/**
 * @route   PUT /api/emprunts/:id
 * @desc    Update emprunt
 * @access  Private (agent+ - module vérifié dans le contrôleur selon l'item)
 */
router.put('/:id', verifyToken, isAgent(), validate(schemas.emprunt.update), empruntController.updateEmprunt);

/**
 * @route   DELETE /api/emprunts/:id
 * @desc    Delete emprunt
 * @access  Private (gestionnaire+)
 */
router.delete('/:id', verifyToken, isAgent(), validate(schemas.emprunt.getById), empruntController.deleteEmprunt);

module.exports = router;
