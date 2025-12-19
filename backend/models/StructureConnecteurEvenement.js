/**
 * StructureConnecteurEvenement Model
 * Override connecteur email/SMS par evenement specifique pour une structure
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StructureConnecteurEvenement = sequelize.define('StructureConnecteurEvenement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'structures',
        key: 'id'
      },
      comment: 'Structure concernee'
    },
    event_trigger_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Code de l\'evenement (ex: EMPRUNT_RETARD, COTISATION_CREATED)'
    },
    configuration_email_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'configurations_email',
        key: 'id'
      },
      comment: 'Connecteur email pour cet evenement (null = utiliser defaut categorie/structure)'
    },
    configuration_sms_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'configurations_sms',
        key: 'id'
      },
      comment: 'Connecteur SMS pour cet evenement (null = utiliser defaut categorie/structure)'
    }
  }, {
    tableName: 'structure_connecteurs_evenements',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['structure_id', 'event_trigger_code'],
        name: 'idx_structure_event_unique'
      },
      {
        fields: ['event_trigger_code'],
        name: 'idx_event_trigger_code'
      }
    ]
  });

  return StructureConnecteurEvenement;
};
