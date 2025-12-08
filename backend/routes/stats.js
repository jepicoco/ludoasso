/**
 * Routes pour les statistiques multi-modules avec gestion des droits
 *
 * Controle d'acces:
 * - benevole+ : acces aux stats des modules autorises
 * - comptable+ : acces aux stats financieres
 */

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { verifyToken } = require('../middleware/auth');
const { isBenevole, isComptable } = require('../middleware/checkRole');

/**
 * @route   GET /api/stats/dashboard
 * @desc    Get dashboard statistics (multi-modules, filtre par droits)
 * @access  Private (benevole+)
 * @query   ?modules=ludotheque,bibliotheque (optionnel, filtre par modules autorises)
 */
router.get('/dashboard', verifyToken, isBenevole(), statsController.getDashboardStats);

/**
 * @route   GET /api/stats/popular-items
 * @desc    Get most borrowed items (multi-modules)
 * @access  Private (benevole+)
 * @query   ?module=ludotheque&limit=10
 */
router.get('/popular-items', verifyToken, isBenevole(), statsController.getPopularItems);

/**
 * @route   GET /api/stats/popular-games
 * @desc    Get most borrowed games (retrocompatibilite ludotheque)
 * @access  Private (benevole+)
 * @query   ?limit=10
 */
router.get('/popular-games', verifyToken, isBenevole(), statsController.getPopularGames);

/**
 * @route   GET /api/stats/active-members
 * @desc    Get most active members
 * @access  Private (benevole+)
 * @query   ?limit=10&module=ludotheque
 */
router.get('/active-members', verifyToken, isBenevole(), statsController.getActiveMembers);

/**
 * @route   GET /api/stats/loan-duration
 * @desc    Get average loan duration statistics
 * @access  Private (benevole+)
 * @query   ?module=ludotheque
 */
router.get('/loan-duration', verifyToken, isBenevole(), statsController.getLoanDurationStats);

/**
 * @route   GET /api/stats/monthly
 * @desc    Get monthly loan statistics
 * @access  Private (benevole+)
 * @query   ?months=12&module=ludotheque
 */
router.get('/monthly', verifyToken, isBenevole(), statsController.getMonthlyStats);

/**
 * @route   GET /api/stats/categories
 * @desc    Get category/genre statistics
 * @access  Private (benevole+)
 * @query   ?module=ludotheque (default)
 */
router.get('/categories', verifyToken, isBenevole(), statsController.getCategoryStats);

/**
 * @route   GET /api/stats/cotisations
 * @desc    Get financial statistics (cotisations, CA)
 * @access  Private (comptable+ only)
 * @query   ?year=2025
 */
router.get('/cotisations', verifyToken, isComptable(), statsController.getCotisationsStats);

module.exports = router;
