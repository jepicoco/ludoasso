const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   GET /api/stats/dashboard
 * @desc    Get dashboard statistics (adherents, jeux, emprunts counts)
 * @access  Private
 */
router.get('/dashboard', verifyToken, statsController.getDashboardStats);

/**
 * @route   GET /api/stats/popular-games
 * @desc    Get most borrowed games
 * @access  Private
 * @query   ?limit=10
 */
router.get('/popular-games', verifyToken, statsController.getPopularGames);

/**
 * @route   GET /api/stats/active-members
 * @desc    Get most active members
 * @access  Private
 * @query   ?limit=10
 */
router.get('/active-members', verifyToken, statsController.getActiveMembers);

/**
 * @route   GET /api/stats/loan-duration
 * @desc    Get average loan duration statistics
 * @access  Private
 */
router.get('/loan-duration', verifyToken, statsController.getLoanDurationStats);

/**
 * @route   GET /api/stats/monthly
 * @desc    Get monthly loan statistics
 * @access  Private
 * @query   ?months=12
 */
router.get('/monthly', verifyToken, statsController.getMonthlyStats);

/**
 * @route   GET /api/stats/categories
 * @desc    Get game category statistics
 * @access  Private
 */
router.get('/categories', verifyToken, statsController.getCategoryStats);

module.exports = router;
