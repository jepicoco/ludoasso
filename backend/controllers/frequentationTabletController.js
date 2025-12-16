/**
 * Controller Frequentation Tablette (API externe)
 * Endpoints pour les tablettes de comptage (auth par ApiKey)
 */

const frequentationService = require('../services/frequentationService');
const communeService = require('../services/communeService');
const logger = require('../utils/logger');

/**
 * GET /api/external/frequentation/config
 * Obtenir la configuration pour la tablette
 * Auth: ApiKey (header X-API-Key)
 */
exports.getConfig = async (req, res) => {
  try {
    const config = await frequentationService.getConfigTablette(req.apiKey.id);

    if (!config) {
      return res.status(404).json({
        message: 'Aucun questionnaire actif configure pour cette tablette'
      });
    }

    res.json(config);
  } catch (error) {
    logger.error('Erreur getConfig tablette:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * POST /api/external/frequentation/enregistrements
 * Enregistrer un passage visiteur
 * Auth: ApiKey (header X-API-Key)
 */
exports.createEnregistrement = async (req, res) => {
  try {
    const { questionnaire_id, site_id, commune_id, nb_adultes, nb_enfants, horodatage, local_id } = req.body;

    // Validation
    if (!questionnaire_id || !site_id) {
      return res.status(400).json({
        message: 'questionnaire_id et site_id sont requis'
      });
    }

    if ((nb_adultes || 0) + (nb_enfants || 0) === 0) {
      return res.status(400).json({
        message: 'Au moins un visiteur (adulte ou enfant) est requis'
      });
    }

    const { enregistrement, created } = await frequentationService.creerEnregistrement({
      questionnaire_id,
      site_id,
      commune_id,
      nb_adultes: nb_adultes || 0,
      nb_enfants: nb_enfants || 0,
      horodatage: horodatage || new Date(),
      local_id
    }, req.apiKey.id);

    res.status(created ? 201 : 200).json({
      success: true,
      created,
      enregistrement: {
        id: enregistrement.id,
        local_id: enregistrement.local_id,
        horodatage: enregistrement.horodatage,
        nb_adultes: enregistrement.nb_adultes,
        nb_enfants: enregistrement.nb_enfants,
        total: enregistrement.nb_adultes + enregistrement.nb_enfants
      }
    });
  } catch (error) {
    logger.error('Erreur createEnregistrement tablette:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * POST /api/external/frequentation/sync
 * Synchroniser un lot d'enregistrements offline
 * Auth: ApiKey (header X-API-Key)
 */
exports.syncRecords = async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({
        message: 'records doit etre un tableau d\'enregistrements'
      });
    }

    if (records.length === 0) {
      return res.json({ results: [], synced: 0, errors: 0 });
    }

    if (records.length > 1000) {
      return res.status(400).json({
        message: 'Maximum 1000 enregistrements par synchronisation'
      });
    }

    const results = await frequentationService.syncBatch(records, req.apiKey.id);

    const synced = results.filter(r => r.success).length;
    const errors = results.filter(r => !r.success).length;

    logger.info(`Sync frequentation: ${synced} OK, ${errors} erreurs (tablette: ${req.apiKey.nom})`);

    res.json({
      results,
      synced,
      errors
    });
  } catch (error) {
    logger.error('Erreur syncRecords:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/external/frequentation/communes/search
 * Rechercher des communes
 * Auth: ApiKey (header X-API-Key)
 */
exports.searchCommunes = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const communes = await communeService.search(q, parseInt(limit, 10));

    res.json(communes.map(c => ({
      id: c.id,
      nom: c.nom,
      code_postal: c.code_postal,
      departement: c.departement
    })));
  } catch (error) {
    logger.error('Erreur searchCommunes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/external/frequentation/communes/all
 * Obtenir toutes les communes (pour cache offline)
 * Auth: ApiKey (header X-API-Key)
 * Note: limite a 10000 communes pour performance
 */
exports.getAllCommunes = async (req, res) => {
  try {
    const { Commune } = require('../models');
    const { departement } = req.query;

    const where = {};
    if (departement) {
      where.departement = departement;
    }

    const communes = await Commune.findAll({
      where,
      attributes: ['id', 'nom', 'code_postal', 'departement'],
      order: [['population', 'DESC'], ['nom', 'ASC']],
      limit: 10000
    });

    res.json(communes);
  } catch (error) {
    logger.error('Erreur getAllCommunes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
