const express = require('express');
const router = express.Router();
const ExportComptableController = require('../controllers/exportComptableController');
const { verifyToken, checkRole } = require('../middleware/auth');

/**
 * Routes pour les exports comptables
 * Toutes les routes nécessitent une authentification et le rôle admin ou comptable
 */

/**
 * @route   GET /api/export-comptable/fec
 * @desc    Exporte les écritures comptables au format FEC
 * @query   exercice - Année de l'exercice comptable à exporter
 * @access  Admin, Comptable
 */
router.get(
  '/fec',
  verifyToken,
  checkRole(['admin', 'comptable']),
  ExportComptableController.exportFEC
);

/**
 * @route   GET /api/export-comptable/exercices
 * @desc    Liste tous les exercices comptables disponibles
 * @access  Admin, Comptable
 */
router.get(
  '/exercices',
  verifyToken,
  checkRole(['admin', 'comptable']),
  ExportComptableController.listeExercices
);

/**
 * @route   GET /api/export-comptable/statistiques/:exercice
 * @desc    Obtient les statistiques d'un exercice comptable
 * @param   exercice - Année de l'exercice
 * @access  Admin, Comptable
 */
router.get(
  '/statistiques/:exercice',
  verifyToken,
  checkRole(['admin', 'comptable']),
  ExportComptableController.getStatistiquesExercice
);

module.exports = router;
