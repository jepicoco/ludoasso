/**
 * Controller Frequentation (Admin)
 * Gestion des questionnaires et statistiques
 */

const frequentationService = require('../services/frequentationService');
const { ApiKey, Site, TabletPairingToken } = require('../models');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

// =====================================
// QUESTIONNAIRES
// =====================================

/**
 * GET /api/frequentation/questionnaires
 * Liste tous les questionnaires
 */
exports.getQuestionnaires = async (req, res) => {
  try {
    const { actif, site_id } = req.query;
    const filters = {};

    if (actif !== undefined) {
      filters.actif = actif === 'true';
    }
    if (site_id) {
      filters.site_id = parseInt(site_id, 10);
    }

    const questionnaires = await frequentationService.getQuestionnaires(filters);
    res.json(questionnaires);
  } catch (error) {
    logger.error('Erreur getQuestionnaires:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/frequentation/questionnaires/:id
 * Obtenir un questionnaire
 */
exports.getQuestionnaire = async (req, res) => {
  try {
    const questionnaire = await frequentationService.getQuestionnaire(req.params.id);
    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionnaire non trouve' });
    }
    res.json(questionnaire);
  } catch (error) {
    logger.error('Erreur getQuestionnaire:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * POST /api/frequentation/questionnaires
 * Creer un questionnaire
 */
exports.createQuestionnaire = async (req, res) => {
  try {
    const questionnaire = await frequentationService.createQuestionnaire(req.body, req.user.id);
    res.status(201).json(questionnaire);
  } catch (error) {
    logger.error('Erreur createQuestionnaire:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * PUT /api/frequentation/questionnaires/:id
 * Modifier un questionnaire
 */
exports.updateQuestionnaire = async (req, res) => {
  try {
    const questionnaire = await frequentationService.updateQuestionnaire(req.params.id, req.body);
    res.json(questionnaire);
  } catch (error) {
    logger.error('Erreur updateQuestionnaire:', error);
    if (error.message === 'Questionnaire non trouve') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * DELETE /api/frequentation/questionnaires/:id
 * Supprimer un questionnaire
 */
exports.deleteQuestionnaire = async (req, res) => {
  try {
    await frequentationService.deleteQuestionnaire(req.params.id);
    res.json({ message: 'Questionnaire supprime' });
  } catch (error) {
    logger.error('Erreur deleteQuestionnaire:', error);
    if (error.message === 'Questionnaire non trouve') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// =====================================
// COMMUNES FAVORITES
// =====================================

/**
 * GET /api/frequentation/questionnaires/:id/communes
 * Obtenir les communes favorites d'un questionnaire
 */
exports.getCommunesFavorites = async (req, res) => {
  try {
    const favorites = await frequentationService.getCommunesFavorites(req.params.id);
    res.json(favorites);
  } catch (error) {
    logger.error('Erreur getCommunesFavorites:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * PUT /api/frequentation/questionnaires/:id/communes
 * Mettre a jour les communes favorites
 */
exports.updateCommunesFavorites = async (req, res) => {
  try {
    const { communes } = req.body; // [{commune_id: 1, epingle: true, ordre: 0}, ...]

    for (const c of communes) {
      await frequentationService.toggleCommuneFavorite(
        req.params.id,
        c.commune_id,
        c.epingle,
        c.ordre || 0
      );
    }

    const favorites = await frequentationService.getCommunesFavorites(req.params.id);
    res.json(favorites);
  } catch (error) {
    logger.error('Erreur updateCommunesFavorites:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * POST /api/frequentation/questionnaires/:id/communes/pin
 * Epingler/desepingler une commune
 */
exports.toggleCommunePin = async (req, res) => {
  try {
    const { commune_id, epingle } = req.body;
    const favorite = await frequentationService.toggleCommuneFavorite(
      req.params.id,
      commune_id,
      epingle
    );
    res.json(favorite);
  } catch (error) {
    logger.error('Erreur toggleCommunePin:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * PUT /api/frequentation/questionnaires/:id/communes/reorder
 * Reordonner les communes favorites
 */
exports.reorderCommunes = async (req, res) => {
  try {
    const { ordres } = req.body; // [{commune_id: 1, ordre: 0}, ...]
    await frequentationService.reordonnerCommunesFavorites(req.params.id, ordres);
    res.json({ message: 'Ordre mis a jour' });
  } catch (error) {
    logger.error('Erreur reorderCommunes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// =====================================
// TABLETTES
// =====================================

/**
 * GET /api/frequentation/questionnaires/:id/tablets
 * Obtenir les tablettes liees a un questionnaire
 */
exports.getTablettes = async (req, res) => {
  try {
    const questionnaire = await frequentationService.getQuestionnaire(req.params.id);
    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionnaire non trouve' });
    }
    res.json(questionnaire.tablettesLiees || []);
  } catch (error) {
    logger.error('Erreur getTablettes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * POST /api/frequentation/questionnaires/:id/tablets
 * Lier une tablette a un questionnaire
 */
exports.linkTablet = async (req, res) => {
  try {
    const { api_key_id, site_id } = req.body;

    // Verifier que l'ApiKey existe
    const apiKey = await ApiKey.findByPk(api_key_id);
    if (!apiKey) {
      return res.status(404).json({ message: 'Cle API non trouvee' });
    }

    // Verifier que le site existe
    const site = await Site.findByPk(site_id);
    if (!site) {
      return res.status(404).json({ message: 'Site non trouve' });
    }

    const liaison = await frequentationService.lierTablette(api_key_id, req.params.id, site_id);
    res.status(201).json(liaison);
  } catch (error) {
    logger.error('Erreur linkTablet:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * DELETE /api/frequentation/questionnaires/:id/tablets/:apiKeyId
 * Delier une tablette
 */
exports.unlinkTablet = async (req, res) => {
  try {
    await frequentationService.delierTablette(req.params.apiKeyId, req.params.id);
    res.json({ message: 'Tablette deliee' });
  } catch (error) {
    logger.error('Erreur unlinkTablet:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/frequentation/questionnaires/:id/qrcode
 * Generer un QR code pour configurer une tablette
 * Cree automatiquement une cle API et un token d'appairage temporaire
 */
exports.generateQRCode = async (req, res) => {
  try {
    const { site_id } = req.query;
    const questionnaireId = parseInt(req.params.id, 10);

    const questionnaire = await frequentationService.getQuestionnaire(questionnaireId);
    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionnaire non trouve' });
    }

    // Creer une nouvelle cle API dediee a cette tablette
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const apiKeyResult = await ApiKey.creerCle({
      nom: `Tablette - ${questionnaire.nom} - ${dateStr} ${timeStr}`,
      description: `Cle API auto-generee pour tablette frequentation`,
      permissions: ['frequentation:read', 'frequentation:create'],
      collections_autorisees: [],
      limite_requetes: null, // Pas de limite
      periode_limite: 'jour'
    }, req.user?.id);

    // Creer le token d'appairage (valide 15 minutes)
    const pairingToken = await TabletPairingToken.createToken(
      apiKeyResult.cleEnClair,
      apiKeyResult.apiKey.id,
      questionnaireId,
      site_id ? parseInt(site_id, 10) : (questionnaire.site_id || null),
      15 // 15 minutes
    );

    // Construire les donnees du QR code (minimaliste)
    const apiUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const qrData = {
      pairingCode: pairingToken.pairing_code,
      apiUrl
    };

    // Generer le QR code
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    logger.info('QR code appairage genere:', {
      questionnaireId,
      apiKeyId: apiKeyResult.apiKey.id,
      pairingCode: pairingToken.pairing_code,
      expiresAt: pairingToken.expires_at
    });

    res.json({
      qrCode: qrCodeDataUrl,
      pairingCode: pairingToken.pairing_code,
      expiresAt: pairingToken.expires_at,
      expiresInSeconds: pairingToken.getRemainingSeconds(),
      questionnaire: {
        id: questionnaire.id,
        nom: questionnaire.nom
      },
      instructions: 'Scannez ce QR code avec la tablette. Code valide 15 minutes.'
    });
  } catch (error) {
    logger.error('Erreur generateQRCode:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// =====================================
// STATISTIQUES
// =====================================

/**
 * GET /api/frequentation/statistiques
 * Obtenir les statistiques
 */
exports.getStatistiques = async (req, res) => {
  try {
    // Accepter groupement (frontend) ou group_by (legacy)
    const { questionnaire_id, site_id, date_debut, date_fin, groupement, group_by } = req.query;
    const filters = {};

    if (questionnaire_id) filters.questionnaire_id = parseInt(questionnaire_id, 10);
    if (site_id) filters.site_id = parseInt(site_id, 10);
    if (date_debut) filters.date_debut = date_debut;
    if (date_fin) filters.date_fin = date_fin;

    // Statistiques globales
    const global = await frequentationService.getStatistiques(filters);

    // Statistiques par periode (selon groupement)
    const periodGrouping = groupement || group_by || 'jour';
    let rawPeriode;
    switch (periodGrouping) {
      case 'semaine':
        rawPeriode = await frequentationService.getStatistiquesParSemaine(filters);
        break;
      case 'mois':
        rawPeriode = await frequentationService.getStatistiquesParMois(filters);
        break;
      case 'jour':
      default:
        rawPeriode = await frequentationService.getStatistiquesParJour(filters);
        break;
    }

    // Mapper pour le format attendu par le frontend
    const parPeriode = rawPeriode.map(s => {
      let periode;
      if (s.date) {
        periode = s.date;
      } else if (s.semaine !== undefined) {
        periode = `${s.annee}-S${String(s.semaine).padStart(2, '0')}`;
      } else if (s.mois !== undefined) {
        periode = `${s.annee}-${String(s.mois).padStart(2, '0')}`;
      }
      return {
        periode,
        adultes: parseInt(s.total_adultes) || 0,
        enfants: parseInt(s.total_enfants) || 0,
        total: parseInt(s.total_visiteurs) || 0,
        nb_enregistrements: parseInt(s.nb_enregistrements) || 0
      };
    });

    // Statistiques par commune (toujours incluses pour le top 10)
    const communeStats = await frequentationService.getStatistiquesParCommune(filters);

    // Mapper pour le format attendu par le frontend
    const parCommune = communeStats.map(s => ({
      commune_id: s.commune_id,
      commune_nom: s.commune?.nom || 'Non renseigné',
      code_postal: s.commune?.code_postal || '',
      total: parseInt(s.total_visiteurs) || 0,
      adultes: parseInt(s.total_adultes) || 0,
      enfants: parseInt(s.total_enfants) || 0,
      nb_enregistrements: parseInt(s.nb_enregistrements) || 0
    }));

    res.json({
      global,
      parPeriode,
      parCommune,
      filters
    });
  } catch (error) {
    logger.error('Erreur getStatistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/frequentation/statistiques/export/:format
 * Exporter les statistiques
 */
exports.exportStatistiques = async (req, res) => {
  try {
    const { format } = req.params;
    const { questionnaire_id, site_id, date_debut, date_fin } = req.query;
    const filters = {};

    if (questionnaire_id) filters.questionnaire_id = parseInt(questionnaire_id, 10);
    if (site_id) filters.site_id = parseInt(site_id, 10);
    if (date_debut) filters.date_debut = date_debut;
    if (date_fin) filters.date_fin = date_fin;

    const dateStr = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'csv':
        const csv = await frequentationService.exportCSV(filters);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=frequentation_${dateStr}.csv`);
        res.send(csv);
        break;

      case 'excel':
        const excel = await frequentationService.exportExcel(filters);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=frequentation_${dateStr}.xlsx`);
        res.send(excel);
        break;

      case 'pdf':
        const pdf = await frequentationService.exportPDF(filters);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=frequentation_${dateStr}.pdf`);
        res.send(pdf);
        break;

      default:
        res.status(400).json({ message: 'Format non supporte. Utilisez csv, excel ou pdf.' });
    }
  } catch (error) {
    logger.error('Erreur exportStatistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// =====================================
// ENREGISTREMENTS (consultation admin)
// =====================================

/**
 * GET /api/frequentation/enregistrements
 * Liste des enregistrements (pagines)
 */
exports.getEnregistrements = async (req, res) => {
  try {
    const { EnregistrementFrequentation, Commune, Site, QuestionnaireFrequentation } = require('../models');
    const { page = 1, limit = 50, questionnaire_id, site_id, date_debut, date_fin } = req.query;
    const { Op } = require('sequelize');

    const where = {};
    if (questionnaire_id) where.questionnaire_id = questionnaire_id;
    if (site_id) where.site_id = site_id;
    if (date_debut) {
      where.horodatage = where.horodatage || {};
      where.horodatage[Op.gte] = new Date(date_debut);
    }
    if (date_fin) {
      where.horodatage = where.horodatage || {};
      where.horodatage[Op.lte] = new Date(date_fin + ' 23:59:59');
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await EnregistrementFrequentation.findAndCountAll({
      where,
      include: [
        { model: Commune, as: 'commune', attributes: ['id', 'nom', 'code_postal'] },
        { model: Site, as: 'site', attributes: ['id', 'nom', 'code'] },
        { model: QuestionnaireFrequentation, as: 'questionnaire', attributes: ['id', 'nom'] }
      ],
      order: [['horodatage', 'DESC']],
      limit: parseInt(limit, 10),
      offset
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(count / parseInt(limit, 10))
      }
    });
  } catch (error) {
    logger.error('Erreur getEnregistrements:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * DELETE /api/frequentation/enregistrements/:id
 * Supprimer un enregistrement
 */
exports.deleteEnregistrement = async (req, res) => {
  try {
    const { EnregistrementFrequentation } = require('../models');
    const enregistrement = await EnregistrementFrequentation.findByPk(req.params.id);

    if (!enregistrement) {
      return res.status(404).json({ message: 'Enregistrement non trouve' });
    }

    await enregistrement.destroy();
    res.json({ message: 'Enregistrement supprime' });
  } catch (error) {
    logger.error('Erreur deleteEnregistrement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
