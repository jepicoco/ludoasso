/**
 * Service Frequentation
 * Gestion des questionnaires et statistiques de frequentation
 */

const {
  QuestionnaireFrequentation,
  EnregistrementFrequentation,
  QuestionnaireCommuneFavorite,
  ApiKeyQuestionnaire,
  Commune,
  Site,
  Utilisateur,
  ApiKey,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class FrequentationService {
  // =====================================
  // QUESTIONNAIRES
  // =====================================

  /**
   * Obtenir tous les questionnaires
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getQuestionnaires(filters = {}) {
    const where = {};

    if (filters.actif !== undefined) {
      where.actif = filters.actif;
    }
    if (filters.site_id) {
      where[Op.or] = [
        { site_id: filters.site_id },
        { multi_site: true }
      ];
    }

    return QuestionnaireFrequentation.findAll({
      where,
      include: [
        { model: Site, as: 'site', attributes: ['id', 'nom', 'code'] },
        { model: Utilisateur, as: 'createur', attributes: ['id', 'prenom', 'nom'] }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Obtenir un questionnaire par ID
   * @param {number} id
   * @returns {Promise<QuestionnaireFrequentation>}
   */
  async getQuestionnaire(id) {
    return QuestionnaireFrequentation.findByPk(id, {
      include: [
        { model: Site, as: 'site' },
        { model: Utilisateur, as: 'createur', attributes: ['id', 'prenom', 'nom'] },
        {
          model: QuestionnaireCommuneFavorite,
          as: 'communesFavorites',
          include: [{ model: Commune, as: 'commune' }],
          order: [['epingle', 'DESC'], ['ordre_affichage', 'ASC'], ['pourcentage_usage', 'DESC']]
        },
        {
          model: ApiKeyQuestionnaire,
          as: 'tablettesLiees',
          include: [
            { model: ApiKey, as: 'apiKey', attributes: ['id', 'nom', 'actif', 'derniere_utilisation'] },
            { model: Site, as: 'site', attributes: ['id', 'nom', 'code'] }
          ]
        }
      ]
    });
  }

  /**
   * Creer un questionnaire
   * @param {Object} data
   * @param {number} userId - ID de l'utilisateur createur
   * @returns {Promise<QuestionnaireFrequentation>}
   */
  async createQuestionnaire(data, userId) {
    const questionnaire = await QuestionnaireFrequentation.create({
      nom: data.nom,
      description: data.description,
      actif: data.actif !== false,
      date_debut: data.date_debut || null,
      date_fin: data.date_fin || null,
      multi_site: data.multi_site || false,
      site_id: data.multi_site ? null : data.site_id,
      cree_par: userId
    });

    // Ajouter les communes favorites initiales
    if (data.communes_favorites && data.communes_favorites.length > 0) {
      for (let i = 0; i < data.communes_favorites.length; i++) {
        await QuestionnaireCommuneFavorite.create({
          questionnaire_id: questionnaire.id,
          commune_id: data.communes_favorites[i],
          epingle: true,
          ordre_affichage: i
        });
      }
    }

    logger.info(`Questionnaire frequentation cree: ${questionnaire.nom} (id: ${questionnaire.id})`);
    return this.getQuestionnaire(questionnaire.id);
  }

  /**
   * Mettre a jour un questionnaire
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<QuestionnaireFrequentation>}
   */
  async updateQuestionnaire(id, data) {
    const questionnaire = await QuestionnaireFrequentation.findByPk(id);
    if (!questionnaire) {
      throw new Error('Questionnaire non trouve');
    }

    await questionnaire.update({
      nom: data.nom !== undefined ? data.nom : questionnaire.nom,
      description: data.description !== undefined ? data.description : questionnaire.description,
      actif: data.actif !== undefined ? data.actif : questionnaire.actif,
      date_debut: data.date_debut !== undefined ? data.date_debut : questionnaire.date_debut,
      date_fin: data.date_fin !== undefined ? data.date_fin : questionnaire.date_fin,
      multi_site: data.multi_site !== undefined ? data.multi_site : questionnaire.multi_site,
      site_id: data.multi_site ? null : (data.site_id !== undefined ? data.site_id : questionnaire.site_id)
    });

    logger.info(`Questionnaire frequentation mis a jour: ${questionnaire.nom} (id: ${id})`);
    return this.getQuestionnaire(id);
  }

  /**
   * Supprimer un questionnaire
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async deleteQuestionnaire(id) {
    const questionnaire = await QuestionnaireFrequentation.findByPk(id);
    if (!questionnaire) {
      throw new Error('Questionnaire non trouve');
    }

    await questionnaire.destroy();
    logger.info(`Questionnaire frequentation supprime: ${questionnaire.nom} (id: ${id})`);
    return true;
  }

  // =====================================
  // COMMUNES FAVORITES
  // =====================================

  /**
   * Obtenir les communes favorites d'un questionnaire
   * @param {number} questionnaireId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getCommunesFavorites(questionnaireId, limit = 8) {
    return QuestionnaireCommuneFavorite.findAll({
      where: {
        questionnaire_id: questionnaireId,
        [Op.or]: [
          { epingle: true },
          { pourcentage_usage: { [Op.gte]: 5.0 } }
        ]
      },
      include: [{ model: Commune, as: 'commune' }],
      order: [
        ['epingle', 'DESC'],
        ['ordre_affichage', 'ASC'],
        ['pourcentage_usage', 'DESC']
      ],
      limit
    });
  }

  /**
   * Ajouter/modifier une commune favorite
   * @param {number} questionnaireId
   * @param {number} communeId
   * @param {boolean} epingle
   * @param {number} ordre
   * @returns {Promise<QuestionnaireCommuneFavorite>}
   */
  async toggleCommuneFavorite(questionnaireId, communeId, epingle, ordre = 0) {
    const [favorite, created] = await QuestionnaireCommuneFavorite.findOrCreate({
      where: { questionnaire_id: questionnaireId, commune_id: communeId },
      defaults: { epingle, ordre_affichage: ordre }
    });

    if (!created) {
      await favorite.update({ epingle, ordre_affichage: ordre });
    }

    return favorite;
  }

  /**
   * Reordonner les communes favorites
   * @param {number} questionnaireId
   * @param {Array} ordres - [{commune_id: 1, ordre: 0}, ...]
   */
  async reordonnerCommunesFavorites(questionnaireId, ordres) {
    for (const item of ordres) {
      await QuestionnaireCommuneFavorite.update(
        { ordre_affichage: item.ordre },
        { where: { questionnaire_id: questionnaireId, commune_id: item.commune_id } }
      );
    }
  }

  // =====================================
  // ENREGISTREMENTS
  // =====================================

  /**
   * Creer un enregistrement de frequentation
   * @param {Object} data
   * @param {number} apiKeyId
   * @returns {Promise<Object>}
   */
  async creerEnregistrement(data, apiKeyId) {
    // Deduplication par local_id
    if (data.local_id) {
      const existing = await EnregistrementFrequentation.findOne({
        where: { local_id: data.local_id }
      });
      if (existing) {
        return { enregistrement: existing, created: false };
      }
    }

    const enregistrement = await EnregistrementFrequentation.create({
      questionnaire_id: data.questionnaire_id,
      site_id: data.site_id,
      api_key_id: apiKeyId,
      commune_id: data.commune_id || null,
      nb_adultes: data.nb_adultes || 0,
      nb_enfants: data.nb_enfants || 0,
      horodatage: data.horodatage || new Date(),
      sync_status: 'synced',
      local_id: data.local_id || null
    });

    // Mettre a jour les stats de la commune
    if (data.commune_id) {
      await QuestionnaireCommuneFavorite.incrementerUsage(
        data.questionnaire_id,
        data.commune_id
      );
    }

    return { enregistrement, created: true };
  }

  /**
   * Synchroniser un lot d'enregistrements offline
   * @param {Array} records
   * @param {number} apiKeyId
   * @returns {Promise<Array>}
   */
  async syncBatch(records, apiKeyId) {
    const results = [];

    for (const record of records) {
      try {
        const { enregistrement, created } = await this.creerEnregistrement(record, apiKeyId);
        results.push({
          local_id: record.local_id,
          success: true,
          created,
          id: enregistrement.id
        });
      } catch (error) {
        results.push({
          local_id: record.local_id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // =====================================
  // STATISTIQUES
  // =====================================

  /**
   * Obtenir les statistiques globales
   * @param {Object} filters
   * @returns {Promise<Object>}
   */
  async getStatistiques(filters = {}) {
    const where = this._buildWhereClause(filters);

    const stats = await EnregistrementFrequentation.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'nb_enregistrements'],
        [sequelize.fn('SUM', sequelize.col('nb_adultes')), 'total_adultes'],
        [sequelize.fn('SUM', sequelize.col('nb_enfants')), 'total_enfants'],
        [sequelize.fn('SUM', sequelize.literal('nb_adultes + nb_enfants')), 'total_visiteurs']
      ],
      raw: true
    });

    return stats[0] || {
      nb_enregistrements: 0,
      total_adultes: 0,
      total_enfants: 0,
      total_visiteurs: 0
    };
  }

  /**
   * Statistiques par jour
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getStatistiquesParJour(filters = {}) {
    const where = this._buildWhereClause(filters);

    return EnregistrementFrequentation.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('horodatage')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'nb_enregistrements'],
        [sequelize.fn('SUM', sequelize.col('nb_adultes')), 'total_adultes'],
        [sequelize.fn('SUM', sequelize.col('nb_enfants')), 'total_enfants'],
        [sequelize.fn('SUM', sequelize.literal('nb_adultes + nb_enfants')), 'total_visiteurs']
      ],
      group: [sequelize.fn('DATE', sequelize.col('horodatage'))],
      order: [[sequelize.fn('DATE', sequelize.col('horodatage')), 'ASC']],
      raw: true
    });
  }

  /**
   * Statistiques par semaine
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getStatistiquesParSemaine(filters = {}) {
    const where = this._buildWhereClause(filters);

    return EnregistrementFrequentation.findAll({
      where,
      attributes: [
        [sequelize.fn('YEAR', sequelize.col('horodatage')), 'annee'],
        [sequelize.fn('WEEK', sequelize.col('horodatage')), 'semaine'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'nb_enregistrements'],
        [sequelize.fn('SUM', sequelize.col('nb_adultes')), 'total_adultes'],
        [sequelize.fn('SUM', sequelize.col('nb_enfants')), 'total_enfants'],
        [sequelize.fn('SUM', sequelize.literal('nb_adultes + nb_enfants')), 'total_visiteurs']
      ],
      group: [
        sequelize.fn('YEAR', sequelize.col('horodatage')),
        sequelize.fn('WEEK', sequelize.col('horodatage'))
      ],
      order: [
        [sequelize.fn('YEAR', sequelize.col('horodatage')), 'ASC'],
        [sequelize.fn('WEEK', sequelize.col('horodatage')), 'ASC']
      ],
      raw: true
    });
  }

  /**
   * Statistiques par mois
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getStatistiquesParMois(filters = {}) {
    const where = this._buildWhereClause(filters);

    return EnregistrementFrequentation.findAll({
      where,
      attributes: [
        [sequelize.fn('YEAR', sequelize.col('horodatage')), 'annee'],
        [sequelize.fn('MONTH', sequelize.col('horodatage')), 'mois'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'nb_enregistrements'],
        [sequelize.fn('SUM', sequelize.col('nb_adultes')), 'total_adultes'],
        [sequelize.fn('SUM', sequelize.col('nb_enfants')), 'total_enfants'],
        [sequelize.fn('SUM', sequelize.literal('nb_adultes + nb_enfants')), 'total_visiteurs']
      ],
      group: [
        sequelize.fn('YEAR', sequelize.col('horodatage')),
        sequelize.fn('MONTH', sequelize.col('horodatage'))
      ],
      order: [
        [sequelize.fn('YEAR', sequelize.col('horodatage')), 'ASC'],
        [sequelize.fn('MONTH', sequelize.col('horodatage')), 'ASC']
      ],
      raw: true
    });
  }

  /**
   * Statistiques par commune
   * @param {Object} filters
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getStatistiquesParCommune(filters = {}, limit = 20) {
    const where = this._buildWhereClause(filters);
    where.commune_id = { [Op.not]: null };

    return EnregistrementFrequentation.findAll({
      where,
      attributes: [
        'commune_id',
        [sequelize.fn('COUNT', sequelize.col('EnregistrementFrequentation.id')), 'nb_enregistrements'],
        [sequelize.fn('SUM', sequelize.col('nb_adultes')), 'total_adultes'],
        [sequelize.fn('SUM', sequelize.col('nb_enfants')), 'total_enfants'],
        [sequelize.fn('SUM', sequelize.literal('nb_adultes + nb_enfants')), 'total_visiteurs']
      ],
      include: [
        { model: Commune, as: 'commune', attributes: ['id', 'nom', 'code_postal'] }
      ],
      group: ['commune_id', 'commune.id', 'commune.nom', 'commune.code_postal'],
      order: [[sequelize.literal('total_visiteurs'), 'DESC']],
      limit
    });
  }

  /**
   * Construire la clause WHERE pour les filtres
   * @private
   */
  _buildWhereClause(filters) {
    const where = {};

    if (filters.questionnaire_id) {
      where.questionnaire_id = filters.questionnaire_id;
    }
    if (filters.site_id) {
      where.site_id = filters.site_id;
    }
    if (filters.date_debut) {
      where.horodatage = where.horodatage || {};
      where.horodatage[Op.gte] = new Date(filters.date_debut);
    }
    if (filters.date_fin) {
      where.horodatage = where.horodatage || {};
      where.horodatage[Op.lte] = new Date(filters.date_fin + ' 23:59:59');
    }

    return where;
  }

  // =====================================
  // EXPORTS
  // =====================================

  /**
   * Export CSV des statistiques
   * @param {Object} filters
   * @returns {Promise<string>}
   */
  async exportCSV(filters = {}) {
    const stats = await this.getStatistiquesParJour(filters);
    const statsCommune = await this.getStatistiquesParCommune(filters);

    let csv = 'STATISTIQUES PAR JOUR\n';
    csv += 'Date;Enregistrements;Adultes;Enfants;Total\n';
    for (const s of stats) {
      csv += `${s.date};${s.nb_enregistrements};${s.total_adultes};${s.total_enfants};${s.total_visiteurs}\n`;
    }

    csv += '\nSTATISTIQUES PAR COMMUNE\n';
    csv += 'Commune;Code Postal;Enregistrements;Adultes;Enfants;Total\n';
    for (const s of statsCommune) {
      csv += `${s.commune?.nom || 'Inconnue'};${s.commune?.code_postal || ''};${s.nb_enregistrements};${s.total_adultes};${s.total_enfants};${s.total_visiteurs}\n`;
    }

    return csv;
  }

  /**
   * Export Excel des statistiques
   * @param {Object} filters
   * @returns {Promise<Buffer>}
   */
  async exportExcel(filters = {}) {
    const stats = await this.getStatistiquesParJour(filters);
    const statsCommune = await this.getStatistiquesParCommune(filters);
    const global = await this.getStatistiques(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Liberteko';
    workbook.created = new Date();

    // Feuille Resume
    const resumeSheet = workbook.addWorksheet('Resume');
    resumeSheet.columns = [
      { header: 'Indicateur', key: 'indicateur', width: 25 },
      { header: 'Valeur', key: 'valeur', width: 15 }
    ];
    resumeSheet.addRows([
      { indicateur: 'Nombre d\'enregistrements', valeur: global.nb_enregistrements },
      { indicateur: 'Total adultes', valeur: global.total_adultes },
      { indicateur: 'Total enfants', valeur: global.total_enfants },
      { indicateur: 'Total visiteurs', valeur: global.total_visiteurs }
    ]);

    // Feuille Par jour
    const jourSheet = workbook.addWorksheet('Par jour');
    jourSheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Enregistrements', key: 'nb_enregistrements', width: 15 },
      { header: 'Adultes', key: 'total_adultes', width: 10 },
      { header: 'Enfants', key: 'total_enfants', width: 10 },
      { header: 'Total', key: 'total_visiteurs', width: 10 }
    ];
    jourSheet.addRows(stats);

    // Feuille Par commune
    const communeSheet = workbook.addWorksheet('Par commune');
    communeSheet.columns = [
      { header: 'Commune', key: 'commune', width: 25 },
      { header: 'Code Postal', key: 'code_postal', width: 12 },
      { header: 'Enregistrements', key: 'nb_enregistrements', width: 15 },
      { header: 'Adultes', key: 'total_adultes', width: 10 },
      { header: 'Enfants', key: 'total_enfants', width: 10 },
      { header: 'Total', key: 'total_visiteurs', width: 10 }
    ];
    communeSheet.addRows(statsCommune.map(s => ({
      commune: s.commune?.nom || 'Inconnue',
      code_postal: s.commune?.code_postal || '',
      nb_enregistrements: s.nb_enregistrements,
      total_adultes: s.total_adultes,
      total_enfants: s.total_enfants,
      total_visiteurs: s.total_visiteurs
    })));

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Export PDF des statistiques
   * @param {Object} filters
   * @returns {Promise<Buffer>}
   */
  async exportPDF(filters = {}) {
    const stats = await this.getStatistiques(filters);
    const statsCommune = await this.getStatistiquesParCommune(filters, 10);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Titre
      doc.fontSize(20).text('Rapport de Frequentation', { align: 'center' });
      doc.moveDown();

      // Periode
      let periode = 'Toutes les donnees';
      if (filters.date_debut || filters.date_fin) {
        periode = `Du ${filters.date_debut || '...'} au ${filters.date_fin || '...'}`;
      }
      doc.fontSize(12).text(periode, { align: 'center' });
      doc.moveDown(2);

      // Resume
      doc.fontSize(16).text('Resume');
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Nombre d'enregistrements: ${stats.nb_enregistrements}`);
      doc.text(`Total adultes: ${stats.total_adultes || 0}`);
      doc.text(`Total enfants: ${stats.total_enfants || 0}`);
      doc.text(`Total visiteurs: ${stats.total_visiteurs || 0}`);
      doc.moveDown(2);

      // Top 10 communes
      doc.fontSize(16).text('Top 10 des communes');
      doc.moveDown();
      doc.fontSize(10);

      for (let i = 0; i < statsCommune.length; i++) {
        const s = statsCommune[i];
        const commune = s.commune?.nom || 'Inconnue';
        doc.text(`${i + 1}. ${commune} - ${s.total_visiteurs} visiteurs`);
      }

      doc.end();
    });
  }

  // =====================================
  // TABLETTES
  // =====================================

  /**
   * Lier une tablette a un questionnaire
   * @param {number} apiKeyId
   * @param {number} questionnaireId
   * @param {number} siteId
   * @returns {Promise<ApiKeyQuestionnaire>}
   */
  async lierTablette(apiKeyId, questionnaireId, siteId) {
    return ApiKeyQuestionnaire.lierTablette(apiKeyId, questionnaireId, siteId);
  }

  /**
   * Delayer une tablette
   * @param {number} apiKeyId
   * @param {number} questionnaireId
   */
  async delierTablette(apiKeyId, questionnaireId) {
    await ApiKeyQuestionnaire.update(
      { actif: false },
      { where: { api_key_id: apiKeyId, questionnaire_id: questionnaireId } }
    );
  }

  /**
   * Obtenir la configuration pour une tablette
   * @param {number} apiKeyId
   * @returns {Promise<Object>}
   */
  async getConfigTablette(apiKeyId) {
    return ApiKeyQuestionnaire.getConfigForApiKey(apiKeyId, {
      QuestionnaireFrequentation,
      Site,
      QuestionnaireCommuneFavorite,
      Commune
    });
  }
}

module.exports = new FrequentationService();
