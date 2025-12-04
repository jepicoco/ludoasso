/**
 * Routes d'import de donnees
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth');
const importController = require('../controllers/importController');

// Configuration multer pour l'upload de fichiers
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
    cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accepter CSV et Excel
  const allowedMimes = [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  const allowedExts = ['.csv', '.txt', '.xls', '.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporte. Utilisez CSV ou Excel.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB max
  }
});

// Middleware de gestion d'erreur multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Le fichier ne doit pas depasser 10 MB'
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

// Routes
// GET /api/import/jeux/fields - Liste des champs disponibles
router.get('/jeux/fields', verifyToken, importController.getAvailableFields);

// POST /api/import/jeux/preview - Preview d'un import
router.post('/jeux/preview',
  verifyToken,
  upload.single('file'),
  handleMulterError,
  importController.previewImport
);

// POST /api/import/jeux - Import effectif
router.post('/jeux',
  verifyToken,
  upload.single('file'),
  handleMulterError,
  importController.importJeux
);

module.exports = router;
