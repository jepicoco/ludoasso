const express = require('express');
const router = express.Router();
const cotisationController = require('../controllers/cotisationController');
const { verifyToken } = require('../middleware/auth');
const { validate, schemas, param } = require('../middleware/validate');

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Validation adherent_id param
const validateAdherentId = validate([
  param('adherent_id').isInt({ min: 1 }).withMessage('adherent_id invalide')
]);

// Routes pour les cotisations
router.get('/', validate(schemas.cotisation.list), cotisationController.getAllCotisations);
router.get('/statistiques', cotisationController.getStatistiques);
router.get('/:id', validate(schemas.cotisation.getById), cotisationController.getCotisationById);
router.post('/', validate(schemas.cotisation.create), cotisationController.createCotisation);
router.put('/:id', validate(schemas.cotisation.update), cotisationController.updateCotisation);
router.delete('/:id', validate(schemas.cotisation.getById), cotisationController.deleteCotisation);

// Routes spéciales
router.post('/:id/annuler', validate(schemas.cotisation.getById), cotisationController.annulerCotisation);
router.get('/adherent/:adherent_id/active', validateAdherentId, cotisationController.verifierCotisationActive);
router.post('/update-statuts-expires', cotisationController.mettreAJourStatutsExpires);
router.get('/:id/recu', validate(schemas.cotisation.getById), cotisationController.genererRecuPDF);

module.exports = router;
