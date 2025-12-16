/**
 * Routes Frequentation (Admin)
 * Gestion des questionnaires et statistiques de frequentation
 */

const express = require('express');
const router = express.Router();
const frequentationController = require('../controllers/frequentationController');
const { verifyToken } = require('../middleware/auth');
const { checkRole, checkMinRole } = require('../middleware/checkRole');
const { checkModuleActif } = require('../middleware/checkModuleActif');

// Toutes les routes necessitent le module frequentation actif
router.use(checkModuleActif('frequentation'));

// =====================================
// QUESTIONNAIRES
// =====================================

// GET /api/frequentation/questionnaires - Liste des questionnaires
router.get('/questionnaires', verifyToken, checkMinRole('gestionnaire'), frequentationController.getQuestionnaires);

// GET /api/frequentation/questionnaires/:id - Detail d'un questionnaire
router.get('/questionnaires/:id', verifyToken, checkMinRole('gestionnaire'), frequentationController.getQuestionnaire);

// POST /api/frequentation/questionnaires - Creer un questionnaire
router.post('/questionnaires', verifyToken, checkRole(['administrateur']), frequentationController.createQuestionnaire);

// PUT /api/frequentation/questionnaires/:id - Modifier un questionnaire
router.put('/questionnaires/:id', verifyToken, checkRole(['administrateur']), frequentationController.updateQuestionnaire);

// DELETE /api/frequentation/questionnaires/:id - Supprimer un questionnaire
router.delete('/questionnaires/:id', verifyToken, checkRole(['administrateur']), frequentationController.deleteQuestionnaire);

// =====================================
// COMMUNES FAVORITES
// =====================================

// GET /api/frequentation/questionnaires/:id/communes - Communes favorites
router.get('/questionnaires/:id/communes', verifyToken, checkMinRole('gestionnaire'), frequentationController.getCommunesFavorites);

// PUT /api/frequentation/questionnaires/:id/communes - Maj communes favorites
router.put('/questionnaires/:id/communes', verifyToken, checkRole(['administrateur']), frequentationController.updateCommunesFavorites);

// POST /api/frequentation/questionnaires/:id/communes/pin - Epingler/desepingler
router.post('/questionnaires/:id/communes/pin', verifyToken, checkRole(['administrateur']), frequentationController.toggleCommunePin);

// PUT /api/frequentation/questionnaires/:id/communes/reorder - Reordonner
router.put('/questionnaires/:id/communes/reorder', verifyToken, checkRole(['administrateur']), frequentationController.reorderCommunes);

// =====================================
// TABLETTES
// =====================================

// GET /api/frequentation/questionnaires/:id/tablets - Tablettes liees
router.get('/questionnaires/:id/tablets', verifyToken, checkMinRole('gestionnaire'), frequentationController.getTablettes);

// POST /api/frequentation/questionnaires/:id/tablets - Lier tablette
router.post('/questionnaires/:id/tablets', verifyToken, checkRole(['administrateur']), frequentationController.linkTablet);

// DELETE /api/frequentation/questionnaires/:id/tablets/:apiKeyId - Delier tablette
router.delete('/questionnaires/:id/tablets/:apiKeyId', verifyToken, checkRole(['administrateur']), frequentationController.unlinkTablet);

// GET /api/frequentation/questionnaires/:id/qrcode - QR code de configuration
router.get('/questionnaires/:id/qrcode', verifyToken, checkRole(['administrateur']), frequentationController.generateQRCode);

// =====================================
// STATISTIQUES
// =====================================

// GET /api/frequentation/statistiques - Statistiques
router.get('/statistiques', verifyToken, checkMinRole('gestionnaire'), frequentationController.getStatistiques);

// GET /api/frequentation/statistiques/export/:format - Export (csv, excel, pdf)
router.get('/statistiques/export/:format', verifyToken, checkMinRole('gestionnaire'), frequentationController.exportStatistiques);

// =====================================
// ENREGISTREMENTS
// =====================================

// GET /api/frequentation/enregistrements - Liste des enregistrements
router.get('/enregistrements', verifyToken, checkMinRole('gestionnaire'), frequentationController.getEnregistrements);

// DELETE /api/frequentation/enregistrements/:id - Supprimer un enregistrement
router.delete('/enregistrements/:id', verifyToken, checkRole(['administrateur']), frequentationController.deleteEnregistrement);

module.exports = router;
