const express = require('express');
const router = express.Router();
const empruntController = require('../controllers/empruntController');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   GET /api/emprunts/overdue
 * @desc    Get all overdue emprunts
 * @access  Private
 */
router.get('/overdue', verifyToken, empruntController.getOverdueEmprunts);

/**
 * @route   GET /api/emprunts
 * @desc    Get all emprunts with filters
 * @access  Private
 * @query   ?statut=en_cours&adherent_id=1&jeu_id=2
 */
router.get('/', verifyToken, empruntController.getAllEmprunts);

/**
 * @route   GET /api/emprunts/:id
 * @desc    Get emprunt by ID
 * @access  Private
 */
router.get('/:id', verifyToken, empruntController.getEmpruntById);

/**
 * @route   POST /api/emprunts
 * @desc    Create new emprunt (loan a game)
 * @access  Private
 */
router.post('/', verifyToken, empruntController.createEmprunt);

/**
 * @route   POST /api/emprunts/:id/retour
 * @desc    Return a game
 * @access  Private
 */
router.post('/:id/retour', verifyToken, empruntController.retourEmprunt);

/**
 * @route   PUT /api/emprunts/:id
 * @desc    Update emprunt
 * @access  Private
 */
router.put('/:id', verifyToken, empruntController.updateEmprunt);

/**
 * @route   DELETE /api/emprunts/:id
 * @desc    Delete emprunt
 * @access  Private
 */
router.delete('/:id', verifyToken, empruntController.deleteEmprunt);

module.exports = router;
