const express = require('express');
const router = express.Router();
const adherentController = require('../controllers/adherentController');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   GET /api/adherents
 * @desc    Get all adherents with filters
 * @access  Private
 * @query   ?statut=actif&search=dupont&page=1&limit=50
 */
router.get('/', verifyToken, adherentController.getAllAdherents);

/**
 * @route   GET /api/adherents/:id
 * @desc    Get adherent by ID with emprunts
 * @access  Private
 */
router.get('/:id', verifyToken, adherentController.getAdherentById);

/**
 * @route   GET /api/adherents/:id/stats
 * @desc    Get adherent statistics
 * @access  Private
 */
router.get('/:id/stats', verifyToken, adherentController.getAdherentStats);

/**
 * @route   POST /api/adherents
 * @desc    Create new adherent
 * @access  Private
 */
router.post('/', verifyToken, adherentController.createAdherent);

/**
 * @route   PUT /api/adherents/:id
 * @desc    Update adherent
 * @access  Private
 */
router.put('/:id', verifyToken, adherentController.updateAdherent);

/**
 * @route   DELETE /api/adherents/:id
 * @desc    Delete adherent
 * @access  Private
 */
router.delete('/:id', verifyToken, adherentController.deleteAdherent);

/**
 * @route   POST /api/adherents/:id/send-email
 * @desc    Send email to adherent (manual or template)
 * @access  Private
 */
router.post('/:id/send-email', verifyToken, adherentController.sendEmail);

/**
 * @route   POST /api/adherents/:id/send-sms
 * @desc    Send SMS to adherent (manual or template)
 * @access  Private
 */
router.post('/:id/send-sms', verifyToken, adherentController.sendSms);

module.exports = router;
