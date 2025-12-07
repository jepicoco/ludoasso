/**
 * Routes pour la gestion des thematiques IA
 * /api/thematiques
 */

const express = require('express');
const router = express.Router();
const thematiqueController = require('../controllers/thematiqueController');
const { verifyToken, checkRole } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(verifyToken);

// Routes publiques (lecture seule pour benevoles+)
const readAccess = checkRole(['benevole', 'gestionnaire', 'comptable', 'administrateur']);
const writeAccess = checkRole(['gestionnaire', 'administrateur']);
const adminOnly = checkRole(['administrateur']);

// ==========================================
// ROUTES DE LECTURE
// ==========================================

// GET /api/thematiques - Liste avec filtres
router.get('/', readAccess, thematiqueController.lister);

// GET /api/thematiques/stats - Statistiques globales
router.get('/stats', readAccess, thematiqueController.getStats);

// GET /api/thematiques/autocomplete - Autocompletion
router.get('/autocomplete', readAccess, thematiqueController.autocomplete);

// GET /api/thematiques/doublons - Detection doublons
router.get('/doublons', writeAccess, thematiqueController.detecterDoublons);

// GET /api/thematiques/article/:typeArticle/:articleId - Thematiques d'un article
router.get('/article/:typeArticle/:articleId', readAccess, thematiqueController.getThematiquesArticle);

// GET /api/thematiques/:id - Detail d'une thematique
router.get('/:id', readAccess, thematiqueController.getById);

// ==========================================
// ROUTES D'ECRITURE
// ==========================================

// POST /api/thematiques - Creer une thematique
router.post('/', writeAccess, thematiqueController.creer);

// PUT /api/thematiques/:id - Modifier une thematique
router.put('/:id', writeAccess, thematiqueController.modifier);

// DELETE /api/thematiques/:id - Supprimer une thematique
router.delete('/:id', adminOnly, thematiqueController.supprimer);

// POST /api/thematiques/:id/alias - Ajouter un alias
router.post('/:id/alias', writeAccess, thematiqueController.ajouterAlias);

// DELETE /api/thematiques/alias/:aliasId - Supprimer un alias
router.delete('/alias/:aliasId', writeAccess, thematiqueController.supprimerAlias);

// POST /api/thematiques/fusionner - Fusionner deux thematiques
router.post('/fusionner', adminOnly, thematiqueController.fusionner);

// ==========================================
// ROUTES LIENS ARTICLE-THEMATIQUE
// ==========================================

// POST /api/thematiques/article/:typeArticle/:articleId - Ajouter un lien
router.post('/article/:typeArticle/:articleId', writeAccess, thematiqueController.ajouterLien);

// PUT /api/thematiques/article/:typeArticle/:articleId/:thematiqueId - Modifier force
router.put('/article/:typeArticle/:articleId/:thematiqueId', writeAccess, thematiqueController.modifierForce);

// DELETE /api/thematiques/article/:typeArticle/:articleId/:thematiqueId - Supprimer lien
router.delete('/article/:typeArticle/:articleId/:thematiqueId', writeAccess, thematiqueController.supprimerLien);

module.exports = router;
