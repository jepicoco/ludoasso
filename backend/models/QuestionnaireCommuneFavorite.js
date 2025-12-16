/**
 * Model QuestionnaireCommuneFavorite
 * Communes favorites pour un questionnaire avec auto-learning
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const QuestionnaireCommuneFavorite = sequelize.define('QuestionnaireCommuneFavorite', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    questionnaire_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    commune_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    epingle: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Manuellement epingle en favori'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Ordre pour les communes epinglees'
    },
    compteur_usage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre d\'utilisations'
    },
    pourcentage_usage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      comment: 'Pourcentage d\'utilisation (auto-calcule)'
    },
    dernier_usage: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date du dernier usage'
    }
  }, {
    tableName: 'questionnaire_communes_favorites',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'uq_quest_commune',
        unique: true,
        fields: ['questionnaire_id', 'commune_id']
      },
      {
        name: 'idx_quest_favorites',
        fields: ['questionnaire_id', 'epingle', 'pourcentage_usage']
      }
    ]
  });

  // Incrementer l'usage d'une commune
  QuestionnaireCommuneFavorite.incrementerUsage = async function(questionnaireId, communeId) {
    const [favorite, created] = await this.findOrCreate({
      where: { questionnaire_id: questionnaireId, commune_id: communeId },
      defaults: { compteur_usage: 1, dernier_usage: new Date() }
    });

    if (!created) {
      await favorite.increment('compteur_usage');
      await favorite.update({ dernier_usage: new Date() });
    }

    // Recalculer les pourcentages pour ce questionnaire
    await this.recalculerPourcentages(questionnaireId);

    return favorite;
  };

  // Recalculer les pourcentages d'usage pour un questionnaire
  QuestionnaireCommuneFavorite.recalculerPourcentages = async function(questionnaireId) {
    // Total des usages
    const total = await this.sum('compteur_usage', {
      where: { questionnaire_id: questionnaireId }
    }) || 0;

    if (total === 0) return;

    // Mettre a jour tous les pourcentages
    await sequelize.query(`
      UPDATE questionnaire_communes_favorites
      SET pourcentage_usage = ROUND((compteur_usage / ${total}) * 100, 2)
      WHERE questionnaire_id = ${questionnaireId}
    `);
  };

  // Obtenir les favorites (epinglees + >5% usage)
  QuestionnaireCommuneFavorite.getFavorites = async function(questionnaireId, limit = 8, models) {
    return this.findAll({
      where: {
        questionnaire_id: questionnaireId,
        [Op.or]: [
          { epingle: true },
          { pourcentage_usage: { [Op.gte]: 5.0 } }
        ]
      },
      include: [
        { model: models.Commune, as: 'commune' }
      ],
      order: [
        ['epingle', 'DESC'],
        ['ordre_affichage', 'ASC'],
        ['pourcentage_usage', 'DESC']
      ],
      limit
    });
  };

  // Epingler/desepingler une commune
  QuestionnaireCommuneFavorite.toggleEpingle = async function(questionnaireId, communeId, epingle) {
    const [favorite, created] = await this.findOrCreate({
      where: { questionnaire_id: questionnaireId, commune_id: communeId },
      defaults: { epingle }
    });

    if (!created) {
      await favorite.update({ epingle });
    }

    return favorite;
  };

  // Reordonner les communes epinglees
  QuestionnaireCommuneFavorite.reordonner = async function(questionnaireId, ordreCommunes) {
    // ordreCommunes = [{ commune_id: 1, ordre: 0 }, { commune_id: 2, ordre: 1 }, ...]
    for (const item of ordreCommunes) {
      await this.update(
        { ordre_affichage: item.ordre },
        { where: { questionnaire_id: questionnaireId, commune_id: item.commune_id } }
      );
    }
  };

  return QuestionnaireCommuneFavorite;
};
