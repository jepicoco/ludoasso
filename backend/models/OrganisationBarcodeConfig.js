/**
 * Model: OrganisationBarcodeConfig
 * Configuration du type de gestion des codes-barres par module et organisation
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrganisationBarcodeConfig = sequelize.define('OrganisationBarcodeConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organisation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organisations',
        key: 'id'
      }
    },
    module: {
      type: DataTypes.ENUM('utilisateur', 'jeu', 'livre', 'film', 'disque'),
      allowNull: false
    },
    type_gestion: {
      type: DataTypes.ENUM('organisation', 'structure', 'groupe'),
      allowNull: false,
      defaultValue: 'organisation'
    },
    groupe_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'organisation_barcode_groups',
        key: 'id'
      }
    }
  }, {
    tableName: 'organisation_barcode_config',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['organisation_id', 'module'],
        name: 'idx_org_barcode_config_unique'
      }
    ]
  });

  return OrganisationBarcodeConfig;
};
