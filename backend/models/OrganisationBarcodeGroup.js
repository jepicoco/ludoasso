/**
 * Model: OrganisationBarcodeGroup
 * Groupes de codes-barres globaux (partages entre toutes les organisations)
 * Ex: ZIK1, FILF, JEUX_AGGLO, SISAM
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrganisationBarcodeGroup = sequelize.define('OrganisationBarcodeGroup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Nullable car les groupes sont maintenant globaux
      references: {
        model: 'organisations',
        key: 'id'
      }
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true, // Code unique globalement
      validate: {
        notEmpty: true,
        len: [1, 50]
      }
    }
  }, {
    tableName: 'organisation_barcode_groups',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return OrganisationBarcodeGroup;
};
