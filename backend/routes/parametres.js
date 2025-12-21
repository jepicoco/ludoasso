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
const modulesActifsController = require('../controllers/modulesActifsController');
const ipAutoriseesController = require('../controllers/ipAutoriseesController');
const outilsController = require('../controllers/outilsController');
const configurationsAPIController = require('../controllers/configurationsAPIController');
const themesSiteController = require('../controllers/themesSiteController');
const configAccesDonneesController = require('../controllers/configAccesDonneesController');
const baremesQFController = require('../controllers/baremesQFController');
const tagsUtilisateurController = require('../controllers/tagsUtilisateurController');

// ============================================
// Routes pour les themes du site public
// (Themes stockes dans le filesystem frontend/themes/)
// ============================================

// Rafraichir le cache des themes (doit etre avant :code)
router.post('/themes/refresh', verifyToken, isAdmin(), themesSiteController.refresh);

// Recuperer tous les themes
router.get('/themes', verifyToken, isGestionnaire(), themesSiteController.getAll);

// Creer un nouveau theme
router.post('/themes', verifyToken, isAdmin(), themesSiteController.create);

// Recuperer un theme par code
router.get('/themes/:code', verifyToken, isGestionnaire(), themesSiteController.getByCode);

// Generer le CSS d'un theme
router.get('/themes/:code/css', verifyToken, isGestionnaire(), themesSiteController.getCSS);

// Mettre a jour un theme (manifest)
router.put('/themes/:code', verifyToken, isAdmin(), themesSiteController.update);

// Supprimer un theme
router.delete('/themes/:code', verifyToken, isAdmin(), themesSiteController.delete);

// Dupliquer un theme
router.post('/themes/:code/duplicate', verifyToken, isAdmin(), themesSiteController.duplicate);

// Activer un theme pour le site
router.post('/themes/:code/activate', verifyToken, isAdmin(), themesSiteController.activate);

// Exporter un theme en JSON
router.get('/themes/:code/export', verifyToken, isAdmin(), themesSiteController.exportTheme);

// Gestion des fichiers de theme
router.get('/themes/:code/files', verifyToken, isAdmin(), themesSiteController.getFiles);
router.post('/themes/:code/files', verifyToken, isAdmin(), themesSiteController.saveFile);
router.get('/themes/:code/files/:type/:filename', verifyToken, isAdmin(), themesSiteController.readFile);
router.delete('/themes/:code/files/:type/:filename', verifyToken, isAdmin(), themesSiteController.deleteFile);

// ============================================
// Routes pour les modules actifs
// ============================================

// Récupérer les modules actifs (pour le frontend - benevole+)
router.get('/modules-actifs', verifyToken, modulesActifsController.getActifs);

// Récupérer tous les modules avec détails (benevole+, pour les couleurs du menu)
router.get('/modules-actifs/all', verifyToken, modulesActifsController.getAll);

// Vérifier si un module est actif
router.get('/modules-actifs/:code/check', verifyToken, isGestionnaire(), modulesActifsController.checkModule);

// Activer/désactiver un module (admin seulement)
router.patch('/modules-actifs/:code/toggle', verifyToken, isAdmin(), modulesActifsController.toggle);

// Mettre à jour plusieurs modules (admin seulement)
router.put('/modules-actifs', verifyToken, isAdmin(), modulesActifsController.updateAll);

// Mettre à jour la couleur d'un module (admin seulement)
router.patch('/modules-actifs/:code/couleur', verifyToken, isAdmin(), modulesActifsController.updateCouleur);

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

// Récupérer la liste des utilisateurs avec leurs accès structure (gestionnaire+)
router.get('/utilisateurs', verifyToken, isGestionnaire(), parametresController.getUtilisateurs);

// Changer le rôle global d'un utilisateur (admin seulement)
router.put('/utilisateurs/:id/role', verifyToken, isAdmin(), parametresController.changerRole);

// Réinitialiser le mot de passe d'un utilisateur (admin seulement)
router.post('/utilisateurs/:id/reset-password', verifyToken, isAdmin(), parametresController.resetPassword);

// Récupérer la liste des rôles disponibles
router.get('/roles', verifyToken, parametresController.getRoles);

// ============================================
// Routes pour les accès structure des utilisateurs
// ============================================

// Récupérer les structures accessibles par l'utilisateur connecté
router.get('/mes-structures', verifyToken, parametresController.getMesStructures);

// Récupérer les structures auxquelles un utilisateur a accès (gestionnaire+)
router.get('/utilisateurs/:id/structures', verifyToken, isGestionnaire(), parametresController.getUtilisateurStructures);

// Ajouter un accès structure à un utilisateur (gestionnaire+ de la structure)
router.post('/utilisateurs/:id/structures', verifyToken, isGestionnaire(), parametresController.addUtilisateurStructure);

// Modifier un accès structure d'un utilisateur (gestionnaire+ de la structure)
router.put('/utilisateurs/:id/structures/:structureId', verifyToken, isGestionnaire(), parametresController.updateUtilisateurStructure);

// Supprimer un accès structure d'un utilisateur (gestionnaire+ de la structure)
router.delete('/utilisateurs/:id/structures/:structureId', verifyToken, isGestionnaire(), parametresController.deleteUtilisateurStructure);

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

// ============================================
// Routes pour les IPs autorisées (maintenance)
// ============================================

// Récupérer toutes les IPs autorisées (admin seulement)
router.get('/ip-autorisees', verifyToken, isAdmin(), ipAutoriseesController.getAll);

// Ajouter une IP autorisée (admin seulement)
router.post('/ip-autorisees', verifyToken, isAdmin(), ipAutoriseesController.create);

// Ajouter l'IP actuelle de l'admin (admin seulement)
router.post('/ip-autorisees/current', verifyToken, isAdmin(), ipAutoriseesController.addCurrentIp);

// Mettre à jour le paramètre autoriser_ip_locales (admin seulement)
// IMPORTANT: Cette route doit être AVANT /ip-autorisees/:id sinon :id capture "locales"
router.put('/ip-autorisees/locales', verifyToken, isAdmin(), ipAutoriseesController.updateAutoriserLocales);

// Modifier une IP autorisée (admin seulement)
router.put('/ip-autorisees/:id', verifyToken, isAdmin(), ipAutoriseesController.update);

// Supprimer une IP autorisée (admin seulement)
router.delete('/ip-autorisees/:id', verifyToken, isAdmin(), ipAutoriseesController.delete);

// Activer/désactiver une IP (admin seulement)
router.patch('/ip-autorisees/:id/toggle', verifyToken, isAdmin(), ipAutoriseesController.toggle);

// ============================================
// Routes pour les outils d'administration
// ============================================

// Obtenir les statistiques avant reset (admin seulement)
router.get('/outils/reset-stats', verifyToken, isAdmin(), outilsController.getResetStats);

// Effectuer un reset de la base de données (admin seulement)
router.post('/outils/reset', verifyToken, isAdmin(), outilsController.resetDatabase);

// ============================================
// Routes pour les configurations API externes
// (EAN lookup, ISBN lookup, enrichissement)
// ============================================

// Récupérer les fournisseurs disponibles
router.get('/apis-externes/providers', verifyToken, isGestionnaire(), configurationsAPIController.getProviders);

// Récupérer toutes les configurations API
router.get('/apis-externes', verifyToken, isGestionnaire(), configurationsAPIController.getAllConfigurations);

// Récupérer une configuration API par ID
router.get('/apis-externes/:id', verifyToken, isGestionnaire(), configurationsAPIController.getConfigurationById);

// Créer une configuration API (admin seulement)
router.post('/apis-externes', verifyToken, isAdmin(), configurationsAPIController.createConfiguration);

// Mettre à jour une configuration API (admin seulement)
router.put('/apis-externes/:id', verifyToken, isAdmin(), configurationsAPIController.updateConfiguration);

// Supprimer une configuration API (admin seulement)
router.delete('/apis-externes/:id', verifyToken, isAdmin(), configurationsAPIController.deleteConfiguration);

// Réorganiser les configurations API (admin seulement)
router.put('/apis-externes-reorder', verifyToken, isAdmin(), configurationsAPIController.reorderConfigurations);

// Activer/désactiver une configuration API (admin seulement)
router.patch('/apis-externes/:id/toggle', verifyToken, isAdmin(), configurationsAPIController.toggleActif);

// Définir comme configuration par défaut (admin seulement)
router.patch('/apis-externes/:id/set-default', verifyToken, isAdmin(), configurationsAPIController.setAsDefault);

// Tester une configuration API (admin seulement)
router.post('/apis-externes/:id/test', verifyToken, isAdmin(), configurationsAPIController.testConnection);

// Obtenir les statistiques d'une configuration API (admin seulement)
router.get('/apis-externes/:id/stats', verifyToken, isAdmin(), configurationsAPIController.getStats);

// ============================================
// Routes pour la configuration d'acces aux donnees personnelles
// (Controle des champs PII visibles par role)
// ============================================

// Obtenir la configuration actuelle (admin seulement)
router.get('/acces-donnees', verifyToken, isAdmin(), configAccesDonneesController.getConfiguration);

// Mettre a jour la configuration (admin seulement)
router.put('/acces-donnees', verifyToken, isAdmin(), configAccesDonneesController.updateConfiguration);

// Obtenir les champs PII disponibles (admin seulement)
router.get('/acces-donnees/champs', verifyToken, isAdmin(), configAccesDonneesController.getChampsDisponibles);

// Obtenir la configuration effective pour un role (gestionnaire+)
router.get('/acces-donnees/role/:role', verifyToken, isGestionnaire(), configAccesDonneesController.getConfigForRole);

// Reinitialiser aux valeurs par defaut (admin seulement)
router.post('/acces-donnees/reset', verifyToken, isAdmin(), configAccesDonneesController.resetConfiguration);

// ============================================
// Routes pour les baremes de quotient familial
// ============================================

// Liste tous les baremes QF (gestionnaire+)
router.get('/baremes-qf', verifyToken, isGestionnaire(), baremesQFController.getAll);

// Liste les types de tarifs pour les valeurs QF (gestionnaire+)
router.get('/baremes-qf/types-tarifs', verifyToken, isGestionnaire(), baremesQFController.getTypesTarifs);

// Detail d'un bareme QF (gestionnaire+)
router.get('/baremes-qf/:id', verifyToken, isGestionnaire(), baremesQFController.getById);

// Creer un bareme QF (admin seulement)
router.post('/baremes-qf', verifyToken, isAdmin(), baremesQFController.create);

// Modifier un bareme QF (admin seulement)
router.put('/baremes-qf/:id', verifyToken, isAdmin(), baremesQFController.update);

// Supprimer un bareme QF (admin seulement)
router.delete('/baremes-qf/:id', verifyToken, isAdmin(), baremesQFController.delete);

// Dupliquer un bareme QF (admin seulement)
router.post('/baremes-qf/:id/dupliquer', verifyToken, isAdmin(), baremesQFController.duplicate);

// Definir un bareme comme par defaut (admin seulement)
router.put('/baremes-qf/:id/defaut', verifyToken, isAdmin(), baremesQFController.setDefault);

// ============================================
// Routes pour les tags utilisateur
// ============================================

// Liste les tags actifs uniquement (pour les selects - gestionnaire+)
router.get('/tags-utilisateur/actifs', verifyToken, isGestionnaire(), tagsUtilisateurController.getActifs);

// Liste tous les tags (gestionnaire+)
router.get('/tags-utilisateur', verifyToken, isGestionnaire(), tagsUtilisateurController.getAll);

// Detail d'un tag (gestionnaire+)
router.get('/tags-utilisateur/:id', verifyToken, isGestionnaire(), tagsUtilisateurController.getById);

// Creer un tag (admin seulement)
router.post('/tags-utilisateur', verifyToken, isAdmin(), tagsUtilisateurController.create);

// Modifier un tag (admin seulement)
router.put('/tags-utilisateur/:id', verifyToken, isAdmin(), tagsUtilisateurController.update);

// Supprimer un tag (admin seulement)
router.delete('/tags-utilisateur/:id', verifyToken, isAdmin(), tagsUtilisateurController.remove);

// Reordonner les tags (admin seulement)
router.put('/tags-utilisateur-reorder', verifyToken, isAdmin(), tagsUtilisateurController.reorder);

// ============================================
// Routes pour les operations comptables
// ============================================

// Liste toutes les operations comptables actives
router.get('/operations-comptables', verifyToken, isGestionnaire(), async (req, res) => {
  try {
    const { ParametrageComptableOperation } = require('../models');
    const operations = await ParametrageComptableOperation.findAll({
      where: { actif: true },
      order: [['ordre_affichage', 'ASC'], ['libelle', 'ASC']],
      attributes: ['id', 'type_operation', 'libelle', 'description', 'journal_code', 'compte_produit', 'compte_produit_libelle']
    });
    res.json(operations);
  } catch (error) {
    console.error('Erreur getAll operations comptables:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;
