/**
 * Model EnregistrementFrequentation
 * Enregistrements de passages visiteurs
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const EnregistrementFrequentation = sequelize.define('EnregistrementFrequentation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    questionnaire_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    site_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    api_key_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de la tablette qui a enregistre'
    },
    commune_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Commune de provenance (peut etre null)'
    },
    nb_adultes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre d\'adultes'
    },
    nb_enfants: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre d\'enfants'
    },
    horodatage: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Date et heure de l\'enregistrement'
    },
    sync_status: {
      type: DataTypes.ENUM('local', 'synced'),
      defaultValue: 'synced',
      comment: 'Statut de synchronisation'
    },
    local_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      unique: true,
      comment: 'UUID pour deduplication des enregistrements offline'
    }
  }, {
    tableName: 'enregistrements_frequentation',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { name: 'idx_enreg_quest_date', fields: ['questionnaire_id', 'horodatage'] },
      { name: 'idx_enreg_site_date', fields: ['site_id', 'horodatage'] },
      { name: 'idx_enreg_commune', fields: ['commune_id'] },
      { name: 'idx_enreg_sync', fields: ['sync_status'] },
      { name: 'idx_enreg_local_id', unique: true, fields: ['local_id'] }
    ]
  });

  // Total de personnes
  EnregistrementFrequentation.prototype.getTotal = function() {
    return (this.nb_adultes || 0) + (this.nb_enfants || 0);
  };

  // Creer un enregistrement (avec deduplication)
  EnregistrementFrequentation.creerEnregistrement = async function(data, apiKeyId, models) {
    // Verifier si local_id existe deja (deduplication)
    if (data.local_id) {
      const existing = await this.findOne({ where: { local_id: data.local_id } });
      if (existing) {
        return { enregistrement: existing, created: false };
      }
    }

    const enregistrement = await this.create({
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

    // Mettre a jour les stats de la commune si presente
    if (data.commune_id && models.QuestionnaireCommuneFavorite) {
      await models.QuestionnaireCommuneFavorite.incrementerUsage(
        data.questionnaire_id,
        data.commune_id
      );
    }

    return { enregistrement, created: true };
  };

  // Synchroniser un lot d'enregistrements offline
  EnregistrementFrequentation.syncBatch = async function(records, apiKeyId, models) {
    const results = [];

    for (const record of records) {
      try {
        const { enregistrement, created } = await this.creerEnregistrement(record, apiKeyId, models);
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
  };

  // Statistiques par periode
  EnregistrementFrequentation.getStatistiques = async function(filters = {}) {
    const where = {};

    if (filters.questionnaire_id) {
      where.questionnaire_id = filters.questionnaire_id;
    }
    if (filters.site_id) {
      where.site_id = filters.site_id;
    }
    if (filters.date_debut) {
      where.horodatage = where.horodatage || {};
      where.horodatage[Op.gte] = filters.date_debut;
    }
    if (filters.date_fin) {
      where.horodatage = where.horodatage || {};
      where.horodatage[Op.lte] = filters.date_fin;
    }

    const stats = await this.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'nb_enregistrements'],
        [sequelize.fn('SUM', sequelize.col('nb_adultes')), 'total_adultes'],
        [sequelize.fn('SUM', sequelize.col('nb_enfants')), 'total_enfants'],
        [sequelize.fn('SUM', sequelize.literal('nb_adultes + nb_enfants')), 'total_visiteurs']
      ],
      raw: true
    });

    return stats[0] || { nb_enregistrements: 0, total_adultes: 0, total_enfants: 0, total_visiteurs: 0 };
  };

  // Statistiques par jour
  EnregistrementFrequentation.getStatistiquesParJour = async function(filters = {}) {
    const where = {};

    if (filters.questionnaire_id) {
      where.questionnaire_id = filters.questionnaire_id;
    }
    if (filters.site_id) {
      where.site_id = filters.site_id;
    }
    if (filters.date_debut) {
      where.horodatage = where.horodatage || {};
      where.horodatage[Op.gte] = filters.date_debut;
    }
    if (filters.date_fin) {
      where.horodatage = where.horodatage || {};
      where.horodatage[Op.lte] = filters.date_fin;
    }

    return this.findAll({
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
  };

  // Statistiques par commune
  EnregistrementFrequentation.getStatistiquesParCommune = async function(filters = {}, models) {
    const where = { commune_id: { [Op.not]: null } };

    if (filters.questionnaire_id) {
      where.questionnaire_id = filters.questionnaire_id;
    }
    if (filters.site_id) {
      where.site_id = filters.site_id;
    }
    if (filters.date_debut) {
      where.horodatage = where.horodatage || {};
      where.horodatage[Op.gte] = filters.date_debut;
    }
    if (filters.date_fin) {
      where.horodatage = where.horodatage || {};
      where.horodatage[Op.lte] = filters.date_fin;
    }

    return this.findAll({
      where,
      attributes: [
        'commune_id',
        [sequelize.fn('COUNT', sequelize.col('EnregistrementFrequentation.id')), 'nb_enregistrements'],
        [sequelize.fn('SUM', sequelize.col('nb_adultes')), 'total_adultes'],
        [sequelize.fn('SUM', sequelize.col('nb_enfants')), 'total_enfants'],
        [sequelize.fn('SUM', sequelize.literal('nb_adultes + nb_enfants')), 'total_visiteurs']
      ],
      include: [
        {
          model: models.Commune,
          as: 'commune',
          attributes: ['id', 'nom', 'code_postal']
        }
      ],
      group: ['commune_id', 'commune.id', 'commune.nom', 'commune.code_postal'],
      order: [[sequelize.literal('total_visiteurs'), 'DESC']],
      raw: false
    });
  };

  return EnregistrementFrequentation;
};
