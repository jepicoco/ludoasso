/**
 * Model ApiKeyQuestionnaire
 * Liaison entre tablettes (ApiKey) et questionnaires de frequentation
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ApiKeyQuestionnaire = sequelize.define('ApiKeyQuestionnaire', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    api_key_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    questionnaire_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    site_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Site ou la tablette est deployee'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Liaison active ou non'
    }
  }, {
    tableName: 'api_key_questionnaires',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'uq_apikey_quest',
        unique: true,
        fields: ['api_key_id', 'questionnaire_id']
      },
      { name: 'idx_akq_quest', fields: ['questionnaire_id'] },
      { name: 'idx_akq_site', fields: ['site_id'] }
    ]
  });

  // Obtenir la configuration pour une tablette
  ApiKeyQuestionnaire.getConfigForApiKey = async function(apiKeyId, models) {
    const liaison = await this.findOne({
      where: { api_key_id: apiKeyId, actif: true },
      include: [
        {
          model: models.QuestionnaireFrequentation,
          as: 'questionnaire',
          where: { actif: true }
        },
        {
          model: models.Site,
          as: 'site'
        }
      ]
    });

    if (!liaison) {
      return null;
    }

    // Verifier que le questionnaire est actuellement actif
    if (!liaison.questionnaire.isCurrentlyActive()) {
      return null;
    }

    // Charger les communes favorites
    const favorites = await models.QuestionnaireCommuneFavorite.getFavorites(
      liaison.questionnaire_id,
      8,
      models
    );

    return {
      questionnaire: {
        id: liaison.questionnaire.id,
        nom: liaison.questionnaire.nom,
        description: liaison.questionnaire.description
      },
      site: {
        id: liaison.site.id,
        nom: liaison.site.nom,
        code: liaison.site.code
      },
      communes_favorites: favorites.map(f => ({
        id: f.commune.id,
        nom: f.commune.nom,
        code_postal: f.commune.code_postal,
        epingle: f.epingle,
        pourcentage_usage: parseFloat(f.pourcentage_usage)
      }))
    };
  };

  // Lier une tablette a un questionnaire
  ApiKeyQuestionnaire.lierTablette = async function(apiKeyId, questionnaireId, siteId) {
    // Desactiver les liaisons existantes pour cette tablette
    await this.update(
      { actif: false },
      { where: { api_key_id: apiKeyId } }
    );

    // Creer ou reactiver la liaison
    const [liaison, created] = await this.findOrCreate({
      where: { api_key_id: apiKeyId, questionnaire_id: questionnaireId },
      defaults: { site_id: siteId, actif: true }
    });

    if (!created) {
      await liaison.update({ site_id: siteId, actif: true });
    }

    return liaison;
  };

  // Obtenir les tablettes liees a un questionnaire
  ApiKeyQuestionnaire.getTablettesPourQuestionnaire = async function(questionnaireId, models) {
    return this.findAll({
      where: { questionnaire_id: questionnaireId },
      include: [
        {
          model: models.ApiKey,
          as: 'apiKey',
          attributes: ['id', 'nom', 'actif', 'derniere_utilisation', 'derniere_ip']
        },
        {
          model: models.Site,
          as: 'site',
          attributes: ['id', 'nom', 'code']
        }
      ]
    });
  };

  return ApiKeyQuestionnaire;
};
