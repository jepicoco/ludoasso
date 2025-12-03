/**
 * Routes pour la gestion des templates de messages
 */

const express = require('express');
const router = express.Router();
const templatesMessagesController = require('../controllers/templatesMessagesController');
const { verifyToken } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(verifyToken);

// Routes CRUD
router.get('/', templatesMessagesController.getAllTemplates);
router.get('/code/:code', templatesMessagesController.getTemplateByCode);
router.get('/:id', templatesMessagesController.getTemplateById);
router.post('/', templatesMessagesController.createTemplate);
router.put('/:id', templatesMessagesController.updateTemplate);
router.delete('/:id', templatesMessagesController.deleteTemplate);

// Routes spécifiques
router.put('/reorder', templatesMessagesController.reorderTemplates);
router.patch('/:id/toggle', templatesMessagesController.toggleActif);
router.post('/:id/preview', templatesMessagesController.previewTemplate);
router.post('/:id/duplicate', templatesMessagesController.duplicateTemplate);

module.exports = router;
