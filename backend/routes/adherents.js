const express = require('express');
const router = express.Router();
const utilisateurController = require('../controllers/utilisateurController');
const { verifyToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

/**
 * @route   GET /api/adherents
 * @desc    Get all adherents with filters
 * @access  Private
 * @query   ?statut=actif&search=dupont&page=1&limit=50
 */
router.get('/', verifyToken, validate(schemas.utilisateur.list), utilisateurController.getAllAdherents);

/**
 * @route   GET /api/adherents/:id
 * @desc    Get adherent by ID with emprunts
 * @access  Private
 */
router.get('/:id', verifyToken, validate(schemas.utilisateur.getById), utilisateurController.getAdherentById);

/**
 * @route   GET /api/adherents/:id/stats
 * @desc    Get adherent statistics
 * @access  Private
 */
router.get('/:id/stats', verifyToken, validate(schemas.utilisateur.getById), utilisateurController.getAdherentStats);

/**
 * @route   POST /api/adherents
 * @desc    Create new adherent
 * @access  Private
 */
router.post('/', verifyToken, validate(schemas.utilisateur.create), utilisateurController.createAdherent);

/**
 * @route   PUT /api/adherents/:id
 * @desc    Update adherent
 * @access  Private
 */
router.put('/:id', verifyToken, validate(schemas.utilisateur.update), utilisateurController.updateAdherent);

/**
 * @route   DELETE /api/adherents/:id
 * @desc    Delete adherent
 * @access  Private
 */
router.delete('/:id', verifyToken, validate(schemas.utilisateur.getById), utilisateurController.deleteAdherent);

/**
 * @route   POST /api/adherents/:id/send-email
 * @desc    Send email to adherent (manual or template)
 * @access  Private
 */
router.post('/:id/send-email', verifyToken, utilisateurController.sendEmail);

/**
 * @route   POST /api/adherents/:id/send-sms
 * @desc    Send SMS to adherent (manual or template)
 * @access  Private
 */
router.post('/:id/send-sms', verifyToken, utilisateurController.sendSms);

module.exports = router;
