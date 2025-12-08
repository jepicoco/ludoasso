const express = require('express');
const router = express.Router();
const ipAutoriseesController = require('../controllers/ipAutoriseesController');
const { verifyToken } = require('../middleware/auth');

// ============================================
// Routes publiques pour la maintenance (Triforce Easter Egg)
// ============================================

// Obtenir le timestamp pour générer le hash côté client
router.get('/timestamp', ipAutoriseesController.getTimestamp);

// Endpoint Triforce - déverrouille l'accès pour l'IP du visiteur
router.post('/unlock', ipAutoriseesController.triforceUnlock);

// ============================================
// Routes admin pour la maintenance
// ============================================

// Obtenir l'IP actuelle du client (pour l'interface admin)
router.get('/my-ip', verifyToken, ipAutoriseesController.getMyIp);

module.exports = router;
