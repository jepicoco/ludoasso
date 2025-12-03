const express = require('express');
const router = express.Router();
const emailLogController = require('../controllers/emailLogController');
const { verifyToken } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

/**
 * @route   GET /api/email-logs
 * @desc    Récupérer tous les logs d'emails avec filtres et pagination
 * @query   statut, template_code, adherent_id, date_debut, date_fin, page, limit
 * @access  Private
 */
router.get('/', emailLogController.getAllEmailLogs);

/**
 * @route   GET /api/email-logs/statistics
 * @desc    Récupérer les statistiques des emails envoyés
 * @query   date_debut, date_fin
 * @access  Private
 */
router.get('/statistics', emailLogController.getEmailStatistics);

/**
 * @route   GET /api/email-logs/templates
 * @desc    Récupérer la liste des templates utilisés
 * @access  Private
 */
router.get('/templates', emailLogController.getTemplatesList);

/**
 * @route   GET /api/email-logs/:id
 * @desc    Récupérer un log d'email par ID
 * @access  Private
 */
router.get('/:id', emailLogController.getEmailLogById);

/**
 * @route   POST /api/email-logs/purge
 * @desc    Supprimer les anciens logs d'emails
 * @body    { jours: 90 }
 * @access  Private
 */
router.post('/purge', emailLogController.purgeOldLogs);

module.exports = router;
