const express = require('express');
const router = express.Router();
const eventTriggersController = require('../controllers/eventTriggersController');
const { verifyToken } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Routes CRUD
router.get('/', eventTriggersController.getAll);
router.get('/stats', eventTriggersController.getStats);
router.get('/templates', eventTriggersController.getAvailableTemplates);
router.get('/code/:code', eventTriggersController.getByCode);
router.get('/:id', eventTriggersController.getById);
router.post('/', eventTriggersController.create);
router.put('/:id', eventTriggersController.update);
router.delete('/:id', eventTriggersController.delete);

// Routes d'action
router.post('/:id/toggle-email', eventTriggersController.toggleEmail);
router.post('/:id/toggle-sms', eventTriggersController.toggleSMS);

module.exports = router;
