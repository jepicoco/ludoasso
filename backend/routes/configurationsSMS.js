/**
 * Routes pour la gestion des configurations SMS
 */

const express = require('express');
const router = express.Router();
const configurationsSMSController = require('../controllers/configurationsSMSController');
const { verifyToken } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(verifyToken);

// Routes CRUD
router.get('/', configurationsSMSController.getAllConfigurations);
router.get('/:id', configurationsSMSController.getConfigurationById);
router.post('/', configurationsSMSController.createConfiguration);
router.put('/:id', configurationsSMSController.updateConfiguration);
router.delete('/:id', configurationsSMSController.deleteConfiguration);

// Routes spécifiques
router.put('/reorder', configurationsSMSController.reorderConfigurations);
router.patch('/:id/toggle', configurationsSMSController.toggleActif);
router.patch('/:id/set-default', configurationsSMSController.setAsDefault);
router.get('/:id/test', configurationsSMSController.testerConnexion);
router.post('/:id/send-test', configurationsSMSController.envoyerSMSTest);
router.get('/:id/credits', configurationsSMSController.getCredits);

module.exports = router;
