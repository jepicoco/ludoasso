const express = require('express');
const router = express.Router();
const archivesController = require('../controllers/archivesController');
const { verifyToken } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification et les droits admin/comptable
router.use(verifyToken);
router.use(archivesController.checkArchiveAccess);

// Statistiques
router.get('/stats', archivesController.getArchivesStats);

// Liste et détail des archives
router.get('/', archivesController.getArchives);
router.get('/access-logs', archivesController.getAccessLogs);
router.get('/:id', archivesController.getArchiveById);

// Archivage
router.post('/archiver/:id', archivesController.archiverAdherent);
router.get('/preview/inactifs', archivesController.previewInactifs);
router.post('/archiver-inactifs', archivesController.archiverInactifs);

// Anonymisation
router.post('/anonymiser/:id', archivesController.anonymiserArchive);
router.get('/preview/anonymisation', archivesController.previewAnonymisation);
router.post('/anonymiser-inactifs', archivesController.anonymiserArchivesInactives);

module.exports = router;
