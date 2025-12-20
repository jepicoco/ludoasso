const express = require('express');
const router = express.Router();
const utilisateurController = require('../controllers/utilisateurController');
const { verifyToken } = require('../middleware/auth');
const { isBenevole, isGestionnaire, isAdmin } = require('../middleware/checkRole');
const { validate, schemas } = require('../middleware/validate');
const { filterPIIResponse } = require('../middleware/filterPIIResponse');

/**
 * @route   GET /api/adherents/recherche/disponibles
 * @desc    Search users available for family linking
 * @access  Private (Gestionnaire+)
 * @query   ?q=dupont&exclude=5
 */
router.get('/recherche/disponibles', verifyToken, isGestionnaire(), filterPIIResponse(), utilisateurController.rechercherDisponibles);

/**
 * @route   GET /api/adherents
 * @desc    Get all adherents with filters
 * @access  Private (Benevole+)
 * @query   ?statut=actif&search=dupont&page=1&limit=50
 * @note    Filtrage PII selon role (voir ConfigurationAccesDonnees)
 */
router.get('/', verifyToken, isBenevole(), filterPIIResponse(), validate(schemas.utilisateur.list), utilisateurController.getAllAdherents);

/**
 * @route   GET /api/adherents/:id
 * @desc    Get adherent by ID with emprunts
 * @access  Private (Benevole+)
 * @note    Filtrage PII selon role (voir ConfigurationAccesDonnees)
 */
router.get('/:id', verifyToken, isBenevole(), filterPIIResponse(), validate(schemas.utilisateur.getById), utilisateurController.getAdherentById);

/**
 * @route   GET /api/adherents/:id/stats
 * @desc    Get adherent statistics
 * @access  Private (Benevole+)
 */
router.get('/:id/stats', verifyToken, isBenevole(), filterPIIResponse(), validate(schemas.utilisateur.getById), utilisateurController.getAdherentStats);

/**
 * @route   POST /api/adherents
 * @desc    Create new adherent
 * @access  Private (Gestionnaire+)
 */
router.post('/', verifyToken, isGestionnaire(), validate(schemas.utilisateur.create), utilisateurController.createAdherent);

/**
 * @route   PUT /api/adherents/:id
 * @desc    Update adherent
 * @access  Private (Gestionnaire+)
 */
router.put('/:id', verifyToken, isGestionnaire(), validate(schemas.utilisateur.update), utilisateurController.updateAdherent);

/**
 * @route   DELETE /api/adherents/:id
 * @desc    Delete adherent
 * @access  Private (Admin only)
 */
router.delete('/:id', verifyToken, isAdmin(), validate(schemas.utilisateur.getById), utilisateurController.deleteAdherent);

/**
 * @route   POST /api/adherents/:id/send-email
 * @desc    Send email to adherent (manual or template)
 * @access  Private (Gestionnaire+)
 */
router.post('/:id/send-email', verifyToken, isGestionnaire(), utilisateurController.sendEmail);

/**
 * @route   POST /api/adherents/:id/send-sms
 * @desc    Send SMS to adherent (manual or template)
 * @access  Private (Gestionnaire+)
 */
router.post('/:id/send-sms', verifyToken, isGestionnaire(), utilisateurController.sendSms);

// ========== Routes Famille ==========

/**
 * @route   GET /api/adherents/:id/famille
 * @desc    Get family members (parent + children)
 * @access  Private (Benevole+)
 */
router.get('/:id/famille', verifyToken, isBenevole(), utilisateurController.getFamille);

/**
 * @route   GET /api/adherents/:id/enfants
 * @desc    Get children of this user
 * @access  Private (Benevole+)
 */
router.get('/:id/enfants', verifyToken, isBenevole(), utilisateurController.getEnfants);

/**
 * @route   POST /api/adherents/:id/enfants
 * @desc    Link a child to this parent
 * @access  Private (Gestionnaire+)
 * @body    { enfantId: number, typeLien: 'parent'|'tuteur'|'autre' }
 */
router.post('/:id/enfants', verifyToken, isGestionnaire(), utilisateurController.ajouterEnfant);

/**
 * @route   DELETE /api/adherents/:id/enfants/:enfantId
 * @desc    Unlink a child from this parent
 * @access  Private (Gestionnaire+)
 */
router.delete('/:id/enfants/:enfantId', verifyToken, isGestionnaire(), utilisateurController.retirerEnfant);

/**
 * @route   GET /api/adherents/:id/famille/cout
 * @desc    Calculate family subscription cost
 * @access  Private (Benevole+)
 */
router.get('/:id/famille/cout', verifyToken, isBenevole(), utilisateurController.calculerCoutFamille);

module.exports = router;
