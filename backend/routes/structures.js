/**
 * Routes Structures
 * Gestion des structures (Bibliotheque, Ludotheque, etc.)
 */

const express = require('express');
const router = express.Router();
const structureController = require('../controllers/structureController');
const { verifyToken } = require('../middleware/auth');
const { isAdmin, isGestionnaire } = require('../middleware/checkRole');
const { structureContext } = require('../middleware/structureContext');

// Sous-routes connecteurs
const structureConnecteursRouter = require('./structureConnecteurs');

// Toutes les routes necessitent authentification
router.use(verifyToken);

// Monter les routes connecteurs sous /:id/connecteurs
router.use('/:structureId/connecteurs', structureConnecteursRouter);

// ============================================
// CRUD Structures
// ============================================

/**
 * @route   GET /api/structures
 * @desc    Liste toutes les structures accessibles
 * @access  Private (tous les roles authentifies)
 */
router.get('/', structureController.getAll);

/**
 * @route   GET /api/structures/:id
 * @desc    Detail d'une structure
 * @access  Private (acces a la structure requis)
 */
router.get('/:id', structureController.getById);

/**
 * @route   POST /api/structures
 * @desc    Cree une nouvelle structure
 * @access  Private (admin uniquement)
 */
router.post('/', isAdmin(), structureController.create);

/**
 * @route   PUT /api/structures/:id
 * @desc    Met a jour une structure
 * @access  Private (admin uniquement)
 */
router.put('/:id', isAdmin(), structureController.update);

/**
 * @route   DELETE /api/structures/:id
 * @desc    Supprime une structure
 * @access  Private (admin uniquement)
 */
router.delete('/:id', isAdmin(), structureController.delete);

/**
 * @route   PATCH /api/structures/:id/toggle
 * @desc    Active/Desactive une structure
 * @access  Private (admin uniquement)
 */
router.patch('/:id/toggle', isAdmin(), structureController.toggle);

// ============================================
// Parametres Frontend
// ============================================

/**
 * @route   GET /api/structures/:id/parametres-front
 * @desc    Recupere les parametres frontend d'une structure
 * @access  Private (gestionnaire+)
 */
router.get('/:id/parametres-front', isGestionnaire(), structureController.getParametresFront);

/**
 * @route   PUT /api/structures/:id/parametres-front
 * @desc    Met a jour les parametres frontend d'une structure
 * @access  Private (admin uniquement)
 */
router.put('/:id/parametres-front', isAdmin(), structureController.updateParametresFront);

// ============================================
// Gestion des acces utilisateurs
// ============================================

/**
 * @route   GET /api/structures/:id/utilisateurs
 * @desc    Liste les utilisateurs ayant acces a une structure
 * @access  Private (gestionnaire+)
 */
router.get('/:id/utilisateurs', isGestionnaire(), structureController.getUtilisateurs);

/**
 * @route   POST /api/structures/:id/utilisateurs
 * @desc    Ajoute un utilisateur a une structure
 * @access  Private (admin uniquement)
 */
router.post('/:id/utilisateurs', isAdmin(), structureController.addUtilisateur);

/**
 * @route   PUT /api/structures/:id/utilisateurs/:userId
 * @desc    Met a jour l'acces d'un utilisateur a une structure
 * @access  Private (admin uniquement)
 */
router.put('/:id/utilisateurs/:userId', isAdmin(), structureController.updateUtilisateurAcces);

/**
 * @route   DELETE /api/structures/:id/utilisateurs/:userId
 * @desc    Retire un utilisateur d'une structure
 * @access  Private (admin uniquement)
 */
router.delete('/:id/utilisateurs/:userId', isAdmin(), structureController.removeUtilisateur);

module.exports = router;
