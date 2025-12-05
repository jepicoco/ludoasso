const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { isAdmin, isGestionnaire } = require('../middleware/checkRole');
const parametresController = require('../controllers/parametresController');
const parametresFrontController = require('../controllers/parametresFrontController');
const modesPaiementController = require('../controllers/modesPaiementController');
const codesReductionController = require('../controllers/codesReductionController');
const tarifsController = require('../controllers/tarifsController');
const configurationsEmailController = require('../controllers/configurationsEmailController');
const configurationsSMSController = require('../controllers/configurationsSMSController');
const templatesMessagesController = require('../controllers/templatesMessagesController');

// ============================================
// Routes pour les paramètres de la structure
// ============================================

// Récupérer les paramètres (admin seulement)
router.get('/structure', verifyToken, isAdmin(), parametresController.getParametres);

// Récupérer les paramètres publics (accessible à tous)
router.get('/structure/public', parametresController.getParametresPublics);

// Mettre à jour les paramètres (admin seulement)
router.put('/structure', verifyToken, isAdmin(), parametresController.updateParametres);

// Upload du logo (admin seulement)
router.post('/structure/logo', verifyToken, isAdmin(), parametresController.uploadLogo);

// ============================================
// Routes pour les parametres du site public (front)
// ============================================

// Recuperer les parametres front (admin seulement)
router.get('/front', verifyToken, isAdmin(), parametresFrontController.getParametres);

// Recuperer les parametres front publics (accessible a tous)
router.get('/front/public', parametresFrontController.getParametresPublics);

// Mettre a jour les parametres front (admin seulement)
router.put('/front', verifyToken, isAdmin(), parametresFrontController.updateParametres);

// Mettre a jour une section specifique (admin seulement)
router.put('/front/section/:section', verifyToken, isAdmin(), parametresFrontController.updateSection);

// Upload du logo front (admin seulement)
router.post('/front/logo', verifyToken, isAdmin(), parametresFrontController.uploadLogo);

// ============================================
// Routes pour les modes de paiement
// ============================================

// Récupérer tous les modes de paiement
router.get('/modes-paiement', verifyToken, modesPaiementController.getAllModes);

// Récupérer un mode de paiement par ID
router.get('/modes-paiement/:id', verifyToken, modesPaiementController.getModeById);

// Créer un mode de paiement (admin seulement)
router.post('/modes-paiement', verifyToken, isAdmin(), modesPaiementController.createMode);

// Mettre à jour un mode de paiement (admin seulement)
router.put('/modes-paiement/:id', verifyToken, isAdmin(), modesPaiementController.updateMode);

// Supprimer un mode de paiement (admin seulement)
router.delete('/modes-paiement/:id', verifyToken, isAdmin(), modesPaiementController.deleteMode);

// Réorganiser les modes de paiement (admin seulement)
router.put('/modes-paiement-reorder', verifyToken, isAdmin(), modesPaiementController.reorderModes);

// Activer/désactiver un mode de paiement (admin seulement)
router.patch('/modes-paiement/:id/toggle', verifyToken, isAdmin(), modesPaiementController.toggleActif);

// ============================================
// Routes pour la gestion des utilisateurs
// ============================================

// Récupérer la liste des utilisateurs (admin et gestionnaire)
router.get('/utilisateurs', verifyToken, isGestionnaire(), parametresController.getUtilisateurs);

// Changer le rôle d'un utilisateur (admin seulement)
router.put('/utilisateurs/:id/role', verifyToken, isAdmin(), parametresController.changerRole);

// Réinitialiser le mot de passe d'un utilisateur (admin seulement)
router.post('/utilisateurs/:id/reset-password', verifyToken, isAdmin(), parametresController.resetPassword);

// Récupérer la liste des rôles disponibles
router.get('/roles', verifyToken, parametresController.getRoles);

// ============================================
// Routes pour les codes de réduction
// ============================================

// Récupérer tous les codes de réduction
router.get('/codes-reduction', verifyToken, codesReductionController.getAllCodes);

// Récupérer un code de réduction par ID
router.get('/codes-reduction/:id', verifyToken, codesReductionController.getCodeById);

// Vérifier un code de réduction par son code
router.get('/codes-reduction/verifier/:code', verifyToken, codesReductionController.verifierCode);

// Calculer la réduction pour un montant
router.post('/codes-reduction/:id/calculer', verifyToken, codesReductionController.calculerReduction);

// Créer un code de réduction (admin seulement)
router.post('/codes-reduction', verifyToken, isAdmin(), codesReductionController.createCode);

// Mettre à jour un code de réduction (admin seulement)
router.put('/codes-reduction/:id', verifyToken, isAdmin(), codesReductionController.updateCode);

// Supprimer un code de réduction (admin seulement)
router.delete('/codes-reduction/:id', verifyToken, isAdmin(), codesReductionController.deleteCode);

// Réorganiser les codes de réduction (admin seulement)
router.put('/codes-reduction-reorder', verifyToken, isAdmin(), codesReductionController.reorderCodes);

// Activer/désactiver un code de réduction (admin seulement)
router.patch('/codes-reduction/:id/toggle', verifyToken, isAdmin(), codesReductionController.toggleActif);

// ============================================
// Routes pour les tarifs de cotisation
// ============================================

// Récupérer tous les tarifs
router.get('/tarifs', verifyToken, tarifsController.getAllTarifs);

// Récupérer un tarif par ID
router.get('/tarifs/:id', verifyToken, tarifsController.getTarifById);

// Créer un tarif (admin seulement)
router.post('/tarifs', verifyToken, isAdmin(), tarifsController.createTarif);

// Mettre à jour un tarif (admin seulement)
router.put('/tarifs/:id', verifyToken, isAdmin(), tarifsController.updateTarif);

// Supprimer un tarif (admin seulement)
router.delete('/tarifs/:id', verifyToken, isAdmin(), tarifsController.deleteTarif);

// Réorganiser les tarifs (admin seulement)
router.put('/tarifs/ordre', verifyToken, isAdmin(), tarifsController.reorderTarifs);

// Dupliquer un tarif (admin seulement)
router.post('/tarifs/:id/duplicate', verifyToken, isAdmin(), tarifsController.duplicateTarif);

// Définir comme tarif par défaut (admin seulement)
router.patch('/tarifs/:id/set-default', verifyToken, isAdmin(), tarifsController.setAsDefault);

// Activer/désactiver un tarif (admin seulement)
router.patch('/tarifs/:id/toggle', verifyToken, isAdmin(), tarifsController.toggleActif);

// ============================================
// Routes pour les configurations email
// ============================================

// Tester une connexion SMTP sans sauvegarder (admin seulement) - DOIT être avant les routes avec :id
router.post('/configurations-email/test-connection', verifyToken, isAdmin(), configurationsEmailController.testerConnexionSansSauvegarder);

// Récupérer toutes les configurations email
router.get('/configurations-email', verifyToken, isGestionnaire(), configurationsEmailController.getAllConfigurations);

// Récupérer une configuration email par ID
router.get('/configurations-email/:id', verifyToken, isGestionnaire(), configurationsEmailController.getConfigurationById);

// Créer une configuration email (admin seulement)
router.post('/configurations-email', verifyToken, isAdmin(), configurationsEmailController.createConfiguration);

// Mettre à jour une configuration email (admin seulement)
router.put('/configurations-email/:id', verifyToken, isAdmin(), configurationsEmailController.updateConfiguration);

// Supprimer une configuration email (admin seulement)
router.delete('/configurations-email/:id', verifyToken, isAdmin(), configurationsEmailController.deleteConfiguration);

// Réorganiser les configurations email (admin seulement)
router.put('/configurations-email-reorder', verifyToken, isAdmin(), configurationsEmailController.reorderConfigurations);

// Activer/désactiver une configuration email (admin seulement)
router.patch('/configurations-email/:id/toggle', verifyToken, isAdmin(), configurationsEmailController.toggleActif);

// Définir comme configuration par défaut (admin seulement)
router.patch('/configurations-email/:id/set-default', verifyToken, isAdmin(), configurationsEmailController.setAsDefault);

// Tester une configuration email (admin seulement)
router.post('/configurations-email/:id/test', verifyToken, isAdmin(), configurationsEmailController.testerConnexion);

// Envoyer un email de test (admin seulement)
router.post('/configurations-email/:id/send-test', verifyToken, isAdmin(), configurationsEmailController.envoyerEmailTest);

// ============================================
// Routes pour les configurations SMS
// ============================================

// Récupérer toutes les configurations SMS
router.get('/configurations-sms', verifyToken, isGestionnaire(), configurationsSMSController.getAllConfigurations);

// Récupérer une configuration SMS par ID
router.get('/configurations-sms/:id', verifyToken, isGestionnaire(), configurationsSMSController.getConfigurationById);

// Créer une configuration SMS (admin seulement)
router.post('/configurations-sms', verifyToken, isAdmin(), configurationsSMSController.createConfiguration);

// Mettre à jour une configuration SMS (admin seulement)
router.put('/configurations-sms/:id', verifyToken, isAdmin(), configurationsSMSController.updateConfiguration);

// Supprimer une configuration SMS (admin seulement)
router.delete('/configurations-sms/:id', verifyToken, isAdmin(), configurationsSMSController.deleteConfiguration);

// Réorganiser les configurations SMS (admin seulement)
router.put('/configurations-sms-reorder', verifyToken, isAdmin(), configurationsSMSController.reorderConfigurations);

// Activer/désactiver une configuration SMS (admin seulement)
router.patch('/configurations-sms/:id/toggle', verifyToken, isAdmin(), configurationsSMSController.toggleActif);

// Définir comme configuration par défaut (admin seulement)
router.patch('/configurations-sms/:id/set-default', verifyToken, isAdmin(), configurationsSMSController.setAsDefault);

// Tester une configuration SMS (admin seulement)
router.post('/configurations-sms/:id/test', verifyToken, isAdmin(), configurationsSMSController.testerConnexion);

// Envoyer un SMS de test (admin seulement)
router.post('/configurations-sms/:id/send-test', verifyToken, isAdmin(), configurationsSMSController.envoyerSMSTest);

// Obtenir les crédits restants (admin seulement)
router.get('/configurations-sms/:id/credits', verifyToken, isAdmin(), configurationsSMSController.getCredits);

// ============================================
// Routes pour les templates de messages
// ============================================

// Récupérer tous les templates
router.get('/templates-messages', verifyToken, isGestionnaire(), templatesMessagesController.getAllTemplates);

// Récupérer un template par ID
router.get('/templates-messages/:id', verifyToken, isGestionnaire(), templatesMessagesController.getTemplateById);

// Récupérer un template par code
router.get('/templates-messages/code/:code', verifyToken, isGestionnaire(), templatesMessagesController.getTemplateByCode);

// Créer un template (admin seulement)
router.post('/templates-messages', verifyToken, isAdmin(), templatesMessagesController.createTemplate);

// Mettre à jour un template (admin seulement)
router.put('/templates-messages/:id', verifyToken, isAdmin(), templatesMessagesController.updateTemplate);

// Supprimer un template (admin seulement)
router.delete('/templates-messages/:id', verifyToken, isAdmin(), templatesMessagesController.deleteTemplate);

// Réorganiser les templates (admin seulement)
router.put('/templates-messages-reorder', verifyToken, isAdmin(), templatesMessagesController.reorderTemplates);

// Activer/désactiver un template (admin seulement)
router.patch('/templates-messages/:id/toggle', verifyToken, isAdmin(), templatesMessagesController.toggleActif);

// Prévisualiser un template (gestionnaire+)
router.post('/templates-messages/:id/preview', verifyToken, isGestionnaire(), templatesMessagesController.previewTemplate);

// Dupliquer un template (admin seulement)
router.post('/templates-messages/:id/duplicate', verifyToken, isAdmin(), templatesMessagesController.duplicateTemplate);

module.exports = router;
