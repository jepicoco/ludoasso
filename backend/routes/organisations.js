/**
 * Routes API pour les Organisations
 *
 * CRUD pour la gestion des organisations (entite racine)
 */

const express = require('express');
const router = express.Router();
const organisationController = require('../controllers/organisationController');
const { verifyToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/checkRole');

// Toutes les routes necessitent authentification admin
router.use(verifyToken);
router.use(isAdmin());

/**
 * @route   GET /api/organisations
 * @desc    Liste toutes les organisations
 * @access  Admin
 * @query   actif - Filtrer par statut actif (true/false)
 */
router.get('/', organisationController.getAll);

/**
 * @route   GET /api/organisations/connecteurs
 * @desc    Liste les connecteurs email/SMS disponibles
 * @access  Admin
 */
router.get('/connecteurs', organisationController.getConnecteurs);

// ========================================
// Routes Barcode Groups (globales - avant :id)
// ========================================

/**
 * @route   GET /api/organisations/barcode-groups
 * @desc    Liste tous les groupes de codes-barres (globaux)
 * @access  Admin
 */
router.get('/barcode-groups', organisationController.getBarcodeGroups);

/**
 * @route   POST /api/organisations/barcode-groups
 * @desc    Cree un nouveau groupe de codes-barres (global)
 * @access  Admin
 */
router.post('/barcode-groups', organisationController.createBarcodeGroup);

/**
 * @route   DELETE /api/organisations/barcode-groups/:groupId
 * @desc    Supprime un groupe de codes-barres
 * @access  Admin
 */
router.delete('/barcode-groups/:groupId', organisationController.deleteBarcodeGroup);

/**
 * @route   GET /api/organisations/:id
 * @desc    Recupere une organisation par son ID
 * @access  Admin
 */
router.get('/:id', organisationController.getById);

/**
 * @route   POST /api/organisations
 * @desc    Cree une nouvelle organisation
 * @access  Admin
 */
router.post('/', organisationController.create);

/**
 * @route   PUT /api/organisations/:id
 * @desc    Met a jour une organisation
 * @access  Admin
 */
router.put('/:id', organisationController.update);

/**
 * @route   DELETE /api/organisations/:id
 * @desc    Desactive une organisation
 * @access  Admin
 */
router.delete('/:id', organisationController.delete);

// ========================================
// Routes Barcode Groups
// ========================================

/**
 * @route   GET /api/organisations/:id/barcode-groups
 * @desc    Liste les groupes de codes-barres d'une organisation
 * @access  Admin
 */
router.get('/:id/barcode-groups', organisationController.getBarcodeGroups);

/**
 * @route   POST /api/organisations/:id/barcode-groups
 * @desc    Cree un nouveau groupe de codes-barres
 * @access  Admin
 */
router.post('/:id/barcode-groups', organisationController.createBarcodeGroup);

/**
 * @route   DELETE /api/organisations/:orgId/barcode-groups/:groupId
 * @desc    Supprime un groupe de codes-barres
 * @access  Admin
 */
router.delete('/:orgId/barcode-groups/:groupId', organisationController.deleteBarcodeGroup);

// ========================================
// Routes Barcode Config
// ========================================

/**
 * @route   GET /api/organisations/:id/barcode-config
 * @desc    Recupere la configuration des codes-barres par module
 * @access  Admin
 */
router.get('/:id/barcode-config', organisationController.getBarcodeConfig);

/**
 * @route   PUT /api/organisations/:id/barcode-config
 * @desc    Met a jour la configuration des codes-barres
 * @access  Admin
 */
router.put('/:id/barcode-config', organisationController.updateBarcodeConfig);

module.exports = router;
