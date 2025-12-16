/**
 * Routes Communes (Admin)
 * Gestion du referentiel des communes
 */

const express = require('express');
const router = express.Router();
const communeController = require('../controllers/communeController');
const { verifyToken } = require('../middleware/auth');
const { checkRole, checkMinRole } = require('../middleware/checkRole');
const multer = require('multer');

// Configuration multer pour upload CSV
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers CSV sont acceptes'), false);
    }
  }
});

// GET /api/communes - Recherche communes
router.get('/', verifyToken, communeController.search);

// GET /api/communes/stats - Statistiques du referentiel
router.get('/stats', verifyToken, checkMinRole('gestionnaire'), communeController.getStats);

// GET /api/communes/departement/:departement - Communes d'un departement
router.get('/departement/:departement', verifyToken, communeController.getByDepartement);

// GET /api/communes/:id - Detail d'une commune
router.get('/:id', verifyToken, communeController.getById);

// POST /api/communes/import/datagouv - Import data.gouv.fr
router.post('/import/datagouv', verifyToken, checkRole(['administrateur']), communeController.importFromDataGouv);

// POST /api/communes/import/csv - Import CSV
router.post('/import/csv', verifyToken, checkRole(['administrateur']), upload.single('file'), communeController.importFromCSV);

// DELETE /api/communes/all - Reset (suppression totale)
router.delete('/all', verifyToken, checkRole(['administrateur']), communeController.deleteAll);

module.exports = router;
