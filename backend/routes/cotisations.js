const express = require('express');
const router = express.Router();
const cotisationController = require('../controllers/cotisationController');
const { verifyToken } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Routes pour les cotisations
router.get('/', cotisationController.getAllCotisations);
router.get('/statistiques', cotisationController.getStatistiques);
router.get('/:id', cotisationController.getCotisationById);
router.post('/', cotisationController.createCotisation);
router.put('/:id', cotisationController.updateCotisation);
router.delete('/:id', cotisationController.deleteCotisation);

// Routes spéciales
router.post('/:id/annuler', cotisationController.annulerCotisation);
router.get('/adherent/:adherent_id/active', cotisationController.verifierCotisationActive);
router.post('/update-statuts-expires', cotisationController.mettreAJourStatutsExpires);
router.get('/:id/recu', cotisationController.genererRecuPDF);

module.exports = router;
