const express = require('express');
const router = express.Router();
const ExportComptableController = require('../controllers/exportComptableController');
const { verifyToken, checkRole } = require('../middleware/auth');

/**
 * Routes pour les exports comptables
 * Toutes les routes nécessitent une authentification et le rôle admin ou comptable
 */

// ============================================
// NOUVELLES ROUTES MULTI-FORMATS
// ============================================

/**
 * @route   GET /api/export-comptable/formats
 * @desc    Liste tous les formats d'export disponibles
 * @access  Admin, Comptable
 */
router.get(
  '/formats',
  verifyToken,
  checkRole(['admin', 'comptable']),
  ExportComptableController.getFormats
);

/**
 * @route   GET /api/export-comptable/formats/:format
 * @desc    Recupere la configuration d'un format d'export
 * @param   format - Code du format (fec, sage, ciel, ebp, quadra, openconcerto, dolibarr, csv, json)
 * @access  Admin, Comptable
 */
router.get(
  '/formats/:format',
  verifyToken,
  checkRole(['admin', 'comptable']),
  ExportComptableController.getFormatConfig
);

/**
 * @route   PUT /api/export-comptable/formats/:format
 * @desc    Met a jour la configuration d'un format (mapping comptes/journaux)
 * @param   format - Code du format
 * @body    mapping_comptes, mapping_journaux, options diverses
 * @access  Admin
 */
router.put(
  '/formats/:format',
  verifyToken,
  checkRole(['admin']),
  ExportComptableController.updateFormatConfig
);

/**
 * @route   GET /api/export-comptable/export/:format
 * @desc    Exporte les ecritures dans le format specifie
 * @param   format - Code du format (fec, sage, ciel, ebp, quadra, openconcerto, dolibarr, csv, json)
 * @query   exercice - Annee de l'exercice comptable
 * @query   dateDebut - Date de debut (optionnel)
 * @query   dateFin - Date de fin (optionnel)
 * @query   journal - Code journal (optionnel)
 * @access  Admin, Comptable
 */
router.get(
  '/export/:format',
  verifyToken,
  checkRole(['admin', 'comptable']),
  ExportComptableController.exportFormat
);

/**
 * @route   GET /api/export-comptable/statistiques-complet/:exercice
 * @desc    Statistiques d'un exercice avec formats disponibles
 * @param   exercice - Annee de l'exercice
 * @access  Admin, Comptable
 */
router.get(
  '/statistiques-complet/:exercice',
  verifyToken,
  checkRole(['admin', 'comptable']),
  ExportComptableController.getStatistiquesComplet
);

// ============================================
// ROUTES EXISTANTES (COMPATIBILITE)
// ============================================

/**
 * @route   GET /api/export-comptable/fec
 * @desc    Exporte les écritures comptables au format FEC (route legacy)
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
