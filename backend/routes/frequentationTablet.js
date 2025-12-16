/**
 * Routes Frequentation Tablette (API externe)
 * Endpoints pour les tablettes de comptage
 * Auth: ApiKey (header X-API-Key)
 */

const express = require('express');
const router = express.Router();
const frequentationTabletController = require('../controllers/frequentationTabletController');
const { verifyApiKey } = require('../middleware/apiKeyAuth');

// Toutes les routes necessitent une ApiKey valide avec permission frequentation
const requiredPermissions = ['frequentation:read', 'frequentation:create'];

// GET /api/external/frequentation/config - Configuration tablette
router.get('/config', verifyApiKey(['frequentation:read']), frequentationTabletController.getConfig);

// POST /api/external/frequentation/enregistrements - Nouvel enregistrement
router.post('/enregistrements', verifyApiKey(['frequentation:create']), frequentationTabletController.createEnregistrement);

// POST /api/external/frequentation/sync - Synchronisation batch
router.post('/sync', verifyApiKey(['frequentation:create']), frequentationTabletController.syncRecords);

// GET /api/external/frequentation/communes/search - Recherche communes
router.get('/communes/search', verifyApiKey(['frequentation:read']), frequentationTabletController.searchCommunes);

// GET /api/external/frequentation/communes/all - Toutes les communes (cache offline)
router.get('/communes/all', verifyApiKey(['frequentation:read']), frequentationTabletController.getAllCommunes);

module.exports = router;
