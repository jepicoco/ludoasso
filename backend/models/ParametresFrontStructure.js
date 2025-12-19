/**
 * ParametresFrontStructure Model
 * Configuration frontend specifique par structure
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ParametresFrontStructure = sequelize.define('ParametresFrontStructure', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'structures',
        key: 'id'
      }
    },
    theme_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'default',
      comment: 'Theme a utiliser pour cette structure'
    },
    couleur_primaire: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: 'Couleur primaire hex ex: #007bff'
    },
    couleur_secondaire: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: 'Couleur secondaire hex'
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL du logo de la structure'
    },
    modules_visibles: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: ['catalogue', 'reservations', 'emprunts', 'prolongations'],
      comment: 'Modules visibles sur le frontend usager'
    },
    permettre_reservations: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Autoriser les reservations en ligne'
    },
    permettre_prolongations: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Autoriser les demandes de prolongation'
    },
    max_prolongations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Nombre max de prolongations par emprunt'
    },
    delai_prolongation_jours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 14,
      comment: 'Duree de prolongation en jours'
    },
    limite_emprunts_defaut: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Limite d\'emprunts simultanees par defaut'
    },
    limite_emprunts_par_collection: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Limites par collection ex: {"jeux":3,"livres":5}'
    },
    message_accueil: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Message d\'accueil sur le frontend'
    },
    conditions_utilisation: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Conditions d\'utilisation / reglement'
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
    tableName: 'parametres_front_structure',
    timestamps: false,
    hooks: {
      beforeUpdate: (params) => {
        params.updated_at = new Date();
      }
    }
  });

  // Instance methods
  ParametresFrontStructure.prototype.hasModule = function(moduleCode) {
    if (!this.modules_visibles) return false;
    return this.modules_visibles.includes(moduleCode);
  };

  ParametresFrontStructure.prototype.getLimiteEmprunts = function(collection) {
    if (this.limite_emprunts_par_collection && this.limite_emprunts_par_collection[collection]) {
      return this.limite_emprunts_par_collection[collection];
    }
    return this.limite_emprunts_defaut;
  };

  return ParametresFrontStructure;
};
