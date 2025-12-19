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

module.exports = router;
