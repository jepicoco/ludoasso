/**
 * Routes Groupes Frontend
 * Gestion des groupes de structures pour le site public
 */

const express = require('express');
const router = express.Router();
const groupeFrontendController = require('../controllers/groupeFrontendController');
const { verifyToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/checkRole');

// ============================================
// Routes publiques (sans auth)
// ============================================

/**
 * @route   GET /api/groupes-frontend/public/slug/:slug
 * @desc    Recupere un groupe par son slug (routing public)
 * @access  Public
 */
router.get('/public/slug/:slug', groupeFrontendController.getBySlug);

/**
 * @route   GET /api/groupes-frontend/public/domain/:domain
 * @desc    Recupere un groupe par son domaine personnalise
 * @access  Public
 */
router.get('/public/domain/:domain', groupeFrontendController.getByDomain);

// ============================================
// Routes authentifiees
// ============================================

// Toutes les routes suivantes necessitent authentification
router.use(verifyToken);

/**
 * @route   GET /api/groupes-frontend
 * @desc    Liste tous les groupes frontend
 * @access  Private (admin uniquement)
 */
router.get('/', isAdmin(), groupeFrontendController.getAll);

/**
 * @route   GET /api/groupes-frontend/configurable-params
 * @desc    Liste des parametres configurables par portail
 * @access  Private (admin uniquement)
 */
router.get('/configurable-params', isAdmin(), groupeFrontendController.getConfigurableParams);

/**
 * @route   GET /api/groupes-frontend/:id
 * @desc    Detail d'un groupe
 * @access  Private (admin uniquement)
 */
router.get('/:id', isAdmin(), groupeFrontendController.getById);

/**
 * @route   POST /api/groupes-frontend
 * @desc    Cree un nouveau groupe
 * @access  Private (admin uniquement)
 */
router.post('/', isAdmin(), groupeFrontendController.create);

/**
 * @route   PUT /api/groupes-frontend/:id
 * @desc    Met a jour un groupe
 * @access  Private (admin uniquement)
 */
router.put('/:id', isAdmin(), groupeFrontendController.update);

/**
 * @route   DELETE /api/groupes-frontend/:id
 * @desc    Supprime un groupe
 * @access  Private (admin uniquement)
 */
router.delete('/:id', isAdmin(), groupeFrontendController.delete);

/**
 * @route   PATCH /api/groupes-frontend/:id/toggle
 * @desc    Active/Desactive un groupe
 * @access  Private (admin uniquement)
 */
router.patch('/:id/toggle', isAdmin(), groupeFrontendController.toggle);

/**
 * @route   PUT /api/groupes-frontend/:id/structures-order
 * @desc    Met a jour l'ordre des structures dans un groupe
 * @access  Private (admin uniquement)
 */
router.put('/:id/structures-order', isAdmin(), groupeFrontendController.updateStructuresOrder);

// ============================================
// Routes parametres portail
// ============================================

/**
 * @route   GET /api/groupes-frontend/:id/params
 * @desc    Recupere les parametres resolus d'un portail (avec fallback global)
 * @access  Private (admin uniquement)
 */
router.get('/:id/params', isAdmin(), groupeFrontendController.getResolvedParams);

/**
 * @route   PUT /api/groupes-frontend/:id/params
 * @desc    Met a jour les parametres specifiques d'un portail
 * @access  Private (admin uniquement)
 */
router.put('/:id/params', isAdmin(), groupeFrontendController.updateParametres);

/**
 * @route   DELETE /api/groupes-frontend/:id/params
 * @desc    Supprime des parametres specifiques (reset vers global)
 * @access  Private (admin uniquement)
 */
router.delete('/:id/params', isAdmin(), groupeFrontendController.deleteParametres);

module.exports = router;
