const express = require('express');
const router = express.Router();
const tarifCotisationController = require('../controllers/tarifCotisationController');
const { verifyToken } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Routes pour les tarifs de cotisation
router.get('/', tarifCotisationController.getAllTarifs);
router.get('/:id', tarifCotisationController.getTarifById);
router.post('/', tarifCotisationController.createTarif);
router.put('/:id', tarifCotisationController.updateTarif);
router.delete('/:id', tarifCotisationController.deleteTarif);

// Routes spéciales
router.post('/:id/calculer', tarifCotisationController.calculerMontant);
router.patch('/:id/toggle-actif', tarifCotisationController.toggleActif);

module.exports = router;
