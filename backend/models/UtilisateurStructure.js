/**
 * UtilisateurStructure Model
 * Table de liaison pour les acces utilisateur par structure
 * Permet de definir un role specifique par structure
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UtilisateurStructure = sequelize.define('UtilisateurStructure', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'utilisateurs',
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
    role_structure: {
      type: DataTypes.ENUM('usager', 'benevole', 'gestionnaire', 'comptable', 'administrateur'),
      allowNull: true,
      comment: 'Role specifique pour cette structure (null = utilise role global)'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    date_debut: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de debut d\'acces a cette structure'
    },
    date_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de fin d\'acces (null = indefini)'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'utilisateur_structures',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['utilisateur_id', 'structure_id'],
        name: 'unique_utilisateur_structure'
      },
      {
        fields: ['structure_id'],
        name: 'idx_structure'
      },
      {
        fields: ['utilisateur_id'],
        name: 'idx_utilisateur'
      }
    ],
    hooks: {
      beforeUpdate: (record) => {
        record.updated_at = new Date();
      }
    }
  });

  // Instance methods
  UtilisateurStructure.prototype.isActif = function() {
    if (!this.actif) return false;
    const now = new Date();
    if (this.date_debut && new Date(this.date_debut) > now) return false;
    if (this.date_fin && new Date(this.date_fin) < now) return false;
    return true;
  };

  return UtilisateurStructure;
};
