/**
 * Model QuestionnaireFrequentation
 * Questionnaires de comptage des visiteurs
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const QuestionnaireFrequentation = sequelize.define('QuestionnaireFrequentation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom du questionnaire'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description du questionnaire'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Questionnaire actif ou non'
    },
    date_debut: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de debut (null = pas de limite)'
    },
    date_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de fin (null = pas de limite)'
    },
    multi_site: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si true, le questionnaire est disponible sur plusieurs sites'
    },
    site_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Site unique si multi_site = false'
    },
    cree_par: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID utilisateur createur'
    }
  }, {
    tableName: 'questionnaires_frequentation',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_qf_actif_dates', fields: ['actif', 'date_debut', 'date_fin'] },
      { name: 'idx_qf_site', fields: ['site_id'] }
    ]
  });

  // Verifier si le questionnaire est actuellement actif
  QuestionnaireFrequentation.prototype.isCurrentlyActive = function() {
    if (!this.actif) return false;

    const today = new Date().toISOString().split('T')[0];

    if (this.date_debut && this.date_debut > today) return false;
    if (this.date_fin && this.date_fin < today) return false;

    return true;
  };

  // Obtenir le statut du questionnaire
  QuestionnaireFrequentation.prototype.getStatut = function() {
    if (!this.actif) return 'inactif';

    const today = new Date().toISOString().split('T')[0];

    if (this.date_debut && this.date_debut > today) return 'planifie';
    if (this.date_fin && this.date_fin < today) return 'termine';

    return 'actif';
  };

  // Obtenir les questionnaires actifs pour un site
  QuestionnaireFrequentation.getActifsPourSite = async function(siteId, models) {
    const today = new Date().toISOString().split('T')[0];

    return this.findAll({
      where: {
        actif: true,
        [Op.or]: [
          { date_debut: null },
          { date_debut: { [Op.lte]: today } }
        ],
        [Op.or]: [
          { date_fin: null },
          { date_fin: { [Op.gte]: today } }
        ],
        [Op.or]: [
          // Site unique
          { multi_site: false, site_id: siteId },
          // Multi-site avec ce site dans la liste
          {
            multi_site: true,
            id: {
              [Op.in]: sequelize.literal(`(
                SELECT questionnaire_id FROM questionnaire_sites WHERE site_id = ${siteId}
              )`)
            }
          }
        ]
      },
      include: [
        { model: models.Site, as: 'site' }
      ]
    });
  };

  return QuestionnaireFrequentation;
};
