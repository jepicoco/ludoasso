/**
 * Routes d'import de livres (ISO 2709 / MARC)
 * Pour les lots BDP (Bibliotheque Departementale de Pret)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const livreImportController = require('../controllers/livreImportController');

// Configuration multer pour l'upload de fichiers ISO 2709
const uploadDir = path.join(__dirname, '../../uploads/temp');

// Creer le dossier s'il n'existe pas
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'iso-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accepter les fichiers ISO 2709 / MARC
  const allowedExts = ['.mrc', '.iso', '.marc', '.dat', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();

  // Accepter aussi par MIME type (souvent application/octet-stream pour ISO 2709)
  const allowedMimes = [
    'application/marc',
    'application/octet-stream',
    'text/plain'
  ];

  if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporte. Utilisez un fichier ISO 2709 (.mrc, .iso, .marc).'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB max (lots BDP peuvent etre volumineux)
  }
});

// Middleware de gestion d'erreur multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Le fichier ne doit pas depasser 50 MB'
      });
    }
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  } else if (err) {
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  }
  next();
};

// Middleware d'autorisation (gestionnaire ou admin)
const checkAuthorized = checkRole(['gestionnaire', 'administrateur']);

// ==================== ROUTES IMPORT ISO ====================

// POST /api/import/livres/iso - Upload et parse un fichier ISO 2709
router.post('/iso',
  verifyToken,
  checkAuthorized,
  upload.single('file'),
  handleMulterError,
  livreImportController.uploadISO
);

// GET /api/import/livres/preview/:sessionId - Apercu d'une session d'import
router.get('/preview/:sessionId',
  verifyToken,
  checkAuthorized,
  livreImportController.previewImport
);

// POST /api/import/livres/resolve/:sessionId - Resoudre les conflits
router.post('/resolve/:sessionId',
  verifyToken,
  checkAuthorized,
  livreImportController.resolveConflicts
);

// POST /api/import/livres/confirm/:sessionId - Confirmer et executer l'import (SSE)
router.post('/confirm/:sessionId',
  verifyToken,
  checkAuthorized,
  livreImportController.confirmImport
);

// GET /api/import/livres/history - Historique des imports
router.get('/history',
  verifyToken,
  checkAuthorized,
  livreImportController.getImportHistory
);

// DELETE /api/import/livres/cancel/:sessionId - Annuler une session
router.delete('/cancel/:sessionId',
  verifyToken,
  checkAuthorized,
  livreImportController.cancelImport
);

// ==================== ROUTES LOTS BDP ====================

// GET /api/import/livres/lots - Liste des lots BDP
router.get('/lots',
  verifyToken,
  checkAuthorized,
  livreImportController.getLotsBDP
);

// GET /api/import/livres/lots/stats - Statistiques des lots BDP
router.get('/lots/stats',
  verifyToken,
  checkAuthorized,
  livreImportController.getLotsBDPStats
);

// POST /api/import/livres/lots/:lotId/retour - Marquer un lot comme retourne
router.post('/lots/:lotId/retour',
  verifyToken,
  checkAuthorized,
  livreImportController.marquerLotRetourne
);

module.exports = router;
