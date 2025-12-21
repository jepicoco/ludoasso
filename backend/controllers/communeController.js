/**
 * Controller Communes (Admin)
 * Gestion du referentiel des communes
 */

const communeService = require('../services/communeService');
const logger = require('../utils/logger');

/**
 * GET /api/communes
 * Rechercher des communes
 */
exports.search = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const communes = await communeService.search(q, parseInt(limit, 10));
    res.json(communes);
  } catch (error) {
    logger.error('Erreur search communes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/communes/:id
 * Obtenir une commune
 */
exports.getById = async (req, res) => {
  try {
    const commune = await communeService.getById(req.params.id);
    if (!commune) {
      return res.status(404).json({ message: 'Commune non trouvee' });
    }
    res.json(commune);
  } catch (error) {
    logger.error('Erreur getById commune:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/communes/stats
 * Statistiques du referentiel
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await communeService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Erreur getStats communes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/communes/all
 * Toutes les communes (limite a 2000 pour les selects)
 */
exports.getAll = async (req, res) => {
  try {
    const { Commune } = require('../models');
    const communes = await Commune.findAll({
      attributes: ['id', 'code_insee', 'nom', 'code_postal'],
      order: [['code_postal', 'ASC'], ['nom', 'ASC']],
      limit: 2000
    });
    res.json({ communes });
  } catch (error) {
    logger.error('Erreur getAll communes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/communes/departement/:departement
 * Communes d'un departement
 */
exports.getByDepartement = async (req, res) => {
  try {
    const communes = await communeService.getByDepartement(req.params.departement);
    res.json(communes);
  } catch (error) {
    logger.error('Erreur getByDepartement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * POST /api/communes/import/datagouv
 * Importer depuis data.gouv.fr
 */
exports.importFromDataGouv = async (req, res) => {
  try {
    const { departements } = req.body;

    logger.info('Demarrage import communes data.gouv.fr', { departements });

    const results = await communeService.importFromDataGouv({ departements });

    res.json({
      message: 'Import termine',
      results
    });
  } catch (error) {
    logger.error('Erreur importFromDataGouv:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * POST /api/communes/import/csv
 * Importer depuis un fichier CSV
 */
exports.importFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Fichier CSV requis' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const separator = req.body.separator || ';';

    const results = await communeService.importFromCSV(csvContent, separator);

    res.json({
      message: 'Import termine',
      results
    });
  } catch (error) {
    logger.error('Erreur importFromCSV:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * DELETE /api/communes/all
 * Supprimer toutes les communes (reset)
 */
exports.deleteAll = async (req, res) => {
  try {
    const count = await communeService.deleteAll();
    res.json({ message: `${count} communes supprimees` });
  } catch (error) {
    logger.error('Erreur deleteAll communes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
