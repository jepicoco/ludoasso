/**
 * GroupeFrontendStructure Model
 * Table de liaison entre groupes frontend et structures
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GroupeFrontendStructure = sequelize.define('GroupeFrontendStructure', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    groupe_frontend_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'groupes_frontend',
        key: 'id'
      }
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'structures',
        key: 'id'
      }
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage de la structure dans le groupe'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'groupe_frontend_structures',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['groupe_frontend_id', 'structure_id'],
        name: 'unique_groupe_structure'
      }
    ]
  });

  return GroupeFrontendStructure;
};
