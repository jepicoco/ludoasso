const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { verifyToken } = require('../middleware/auth');
const { isAgent, checkAnyModuleAccess, MODULES } = require('../middleware/checkRole');

// Pour les reservations, on verifie qu'il a acces a au moins un module
const checkAnyModule = checkAnyModuleAccess(MODULES);

/**
 * @route   GET /api/reservations/limites/:utilisateurId/:module
 * @desc    Get reservation limits summary for a user on a specific module
 * @access  Private (agent+)
 */
router.get('/limites/:utilisateurId/:module', verifyToken, isAgent(), checkAnyModule, reservationController.getLimitesSummary);

/**
 * @route   POST /api/reservations/valider-limites
 * @desc    Pre-validate reservation limits without creating the reservation
 * @access  Private (agent+)
 */
router.post('/valider-limites', verifyToken, isAgent(), reservationController.validerLimites);

/**
 * @route   GET /api/reservations/article/:type/:itemId
 * @desc    Get reservations for a specific article
 * @access  Private (agent+)
 */
router.get('/article/:type/:itemId', verifyToken, isAgent(), checkAnyModule, reservationController.getReservationsForArticle);

/**
 * @route   GET /api/reservations/utilisateur/:utilisateurId
 * @desc    Get all reservations for a user
 * @access  Private (agent+)
 */
router.get('/utilisateur/:utilisateurId', verifyToken, isAgent(), checkAnyModule, reservationController.getReservationsByUtilisateur);

/**
 * @route   GET /api/reservations
 * @desc    Get all reservations with filters
 * @access  Private (agent+)
 * @query   ?statut=en_attente&utilisateur_id=1&module=ludotheque
 */
router.get('/', verifyToken, isAgent(), checkAnyModule, reservationController.getAllReservations);

/**
 * @route   GET /api/reservations/:id
 * @desc    Get reservation by ID
 * @access  Private (agent+)
 */
router.get('/:id', verifyToken, isAgent(), checkAnyModule, reservationController.getReservationById);

/**
 * @route   POST /api/reservations
 * @desc    Create new reservation
 * @access  Private (agent+ - module verifie dans le controleur selon l'item)
 * @body    { utilisateur_id, jeu_id | livre_id | film_id | disque_id, commentaire? }
 */
router.post('/', verifyToken, isAgent(), reservationController.createReservation);

/**
 * @route   POST /api/reservations/:id/convertir
 * @desc    Convert a ready reservation to a loan
 * @access  Private (agent+)
 */
router.post('/:id/convertir', verifyToken, isAgent(), reservationController.convertToEmprunt);

/**
 * @route   POST /api/reservations/:id/prolonger
 * @desc    Extend the expiration date of a reservation
 * @access  Private (agent+)
 * @body    { jours?: number }
 */
router.post('/:id/prolonger', verifyToken, isAgent(), reservationController.prolongerReservation);

/**
 * @route   POST /api/reservations/:id/marquer-prete
 * @desc    Mark a reservation as ready for pickup
 * @access  Private (agent+)
 */
router.post('/:id/marquer-prete', verifyToken, isAgent(), reservationController.marquerPrete);

/**
 * @route   POST /api/reservations/:id/notifier
 * @desc    Send a reminder notification to the user
 * @access  Private (agent+)
 */
router.post('/:id/notifier', verifyToken, isAgent(), reservationController.notifierUsager);

/**
 * @route   POST /api/reservations/:id/deplacer
 * @desc    Move reservation up or down in queue
 * @access  Private (agent+)
 * @body    { direction: 'up' | 'down' }
 */
router.post('/:id/deplacer', verifyToken, isAgent(), reservationController.deplacerDansFile);

/**
 * @route   DELETE /api/reservations/:id
 * @desc    Cancel a reservation
 * @access  Private (agent+)
 */
router.delete('/:id', verifyToken, isAgent(), reservationController.cancelReservation);

module.exports = router;
