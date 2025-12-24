/**
 * Structure Model
 * Entite operationnelle (Bibliotheque, Ludotheque...)
 * Niveau intermediaire entre Organisation et Sites
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Structure = sequelize.define('Structure', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Code unique ex: bibliotheque, ludotheque'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom affiche ex: Bibliotheque, Ludotheque'
    },
    type_structure: {
      type: DataTypes.ENUM(
        'bibliotheque',
        'ludotheque',
        'mediatheque',
        'relais_petite_enfance',
        'enfance',
        'jeunesse',
        'culturel_sportif',
        'autre'
      ),
      allowNull: true,
      defaultValue: 'ludotheque',
      comment: 'Type de structure'
    },
    type_structure_label: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Label personnalise si type=autre'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    organisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK vers organisations - organisation parente'
    },
    organisation_nom: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'DEPRECATED - Utiliser organisation_id. Nom de l\'organisation parente'
    },
    siret: {
      type: DataTypes.STRING(14),
      allowNull: true,
      comment: 'SIRET de la structure'
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Adresse du siege de la structure'
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmailOrEmpty(value) {
          if (value && value.length > 0) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              throw new Error('Format email invalide');
            }
          }
        }
      }
    },
    modules_actifs: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: ['jeux', 'livres', 'films', 'disques'],
      comment: 'Liste des modules actifs pour cette structure',
      // Getter pour gerer MariaDB qui retourne une string JSON au lieu d'un array
      get() {
        const raw = this.getDataValue('modules_actifs');
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return [];
          }
        }
        return [];
      }
    },
    couleur: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#007bff',
      comment: 'Couleur pour UI (hex)'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'building',
      comment: 'Nom icone Bootstrap'
    },
    code_comptable: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Code pour exports FEC'
    },
    section_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sections_analytiques',
        key: 'id'
      },
      comment: 'Section analytique par defaut'
    },
    configuration_email_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'configurations_email',
        key: 'id'
      },
      comment: 'Connecteur email par defaut pour cette structure'
    },
    configuration_sms_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'configurations_sms',
        key: 'id'
      },
      comment: 'Connecteur SMS par defaut pour cette structure'
    },
    cotisation_obligatoire: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Si TRUE, cotisation valide requise pour emprunter'
    },
    adhesion_organisation_obligatoire: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si TRUE, adhesion a l\'organisation parente requise pour emprunter'
    },
    controle_retour_obligatoire: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Si TRUE, les articles retournes passent par un etat de controle avant mise en rayon'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    tableName: 'structures',
    timestamps: false,
    hooks: {
      beforeUpdate: (structure) => {
        structure.updated_at = new Date();
      },
      beforeCreate: (structure) => {
        if (!structure.code) {
          structure.code = `STRUCT_${Date.now()}`;
        }
      }
    }
  });

  // Instance methods
  Structure.prototype.hasModule = function(moduleCode) {
    if (!this.modules_actifs) return false;
    return this.modules_actifs.includes(moduleCode);
  };

  Structure.prototype.getModulesActifs = function() {
    return this.modules_actifs || [];
  };

  return Structure;
};
