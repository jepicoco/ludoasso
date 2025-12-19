/**
 * Modele Organisation
 *
 * Entite racine representant une organisation (association, collectivite, entreprise).
 * Une organisation peut avoir plusieurs structures (bibliotheque, ludotheque, etc.)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Organisation = sequelize.define('Organisation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Identification
    nom: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Le nom est obligatoire' }
      }
    },
    nom_court: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    type_organisation: {
      type: DataTypes.ENUM('association', 'collectivite', 'entreprise', 'autre'),
      defaultValue: 'association'
    },

    // Identifiants legaux
    siret: {
      type: DataTypes.STRING(14),
      allowNull: true,
      validate: {
        is: {
          args: /^[0-9]{14}$/,
          msg: 'Le SIRET doit contenir 14 chiffres'
        }
      },
      set(value) {
        // Nettoyer les espaces
        this.setDataValue('siret', value ? value.replace(/\s/g, '') : null);
      }
    },
    siren: {
      type: DataTypes.STRING(9),
      allowNull: true
    },
    rna: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        is: {
          args: /^W[0-9]{9}$/,
          msg: 'Le RNA doit etre au format W + 9 chiffres'
        }
      }
    },
    code_ape: {
      type: DataTypes.STRING(6),
      allowNull: true
    },
    numero_tva: {
      type: DataTypes.STRING(20),
      allowNull: true
    },

    // Associations specifiques
    numero_agrement: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    prefecture_declaration: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    date_publication_jo: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    date_creation: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    // Collectivites
    code_insee: {
      type: DataTypes.STRING(5),
      allowNull: true
    },

    // Adresse
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    code_postal: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    pays: {
      type: DataTypes.STRING(2),
      defaultValue: 'FR'
    },

    // Contact (191 chars max pour compatibilite index MySQL utf8mb4)
    email: {
      type: DataTypes.STRING(191),
      allowNull: true,
      validate: {
        isEmail: { msg: 'Email invalide' }
      }
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    site_web: {
      type: DataTypes.STRING(191),
      allowNull: true
    },

    // Representant legal
    representant_nom: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    representant_fonction: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    representant_email: {
      type: DataTypes.STRING(191),
      allowNull: true
    },

    // Comptabilite
    regime_tva: {
      type: DataTypes.ENUM('assujetti', 'non_assujetti', 'franchise'),
      defaultValue: 'non_assujetti'
    },
    debut_exercice_jour: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 31
      }
    },
    debut_exercice_mois: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 12
      }
    },
    code_comptable: {
      type: DataTypes.STRING(20),
      allowNull: true
    },

    // Identite visuelle
    logo_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    couleur_primaire: {
      type: DataTypes.STRING(7),
      defaultValue: '#007bff'
    },

    // Connecteurs
    configuration_email_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    configuration_sms_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    // Statut
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'organisations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeValidate: (organisation) => {
        // Extraire le SIREN du SIRET
        if (organisation.siret && organisation.siret.length === 14) {
          organisation.siren = organisation.siret.substring(0, 9);
        }
      }
    }
  });

  // Methodes d'instance
  Organisation.prototype.getAdresseComplete = function () {
    const parts = [];
    if (this.adresse) parts.push(this.adresse);
    if (this.code_postal || this.ville) {
      parts.push([this.code_postal, this.ville].filter(Boolean).join(' '));
    }
    return parts.join('\n');
  };

  Organisation.prototype.getExerciceComptable = function (annee = new Date().getFullYear()) {
    const debut = new Date(annee, this.debut_exercice_mois - 1, this.debut_exercice_jour);
    const fin = new Date(annee + 1, this.debut_exercice_mois - 1, this.debut_exercice_jour - 1);
    return { debut, fin };
  };

  // Associations definies dans index.js
  Organisation.associate = (models) => {
    // Une organisation a plusieurs structures
    Organisation.hasMany(models.Structure, {
      foreignKey: 'organisation_id',
      as: 'structures'
    });

    // Connecteur email
    if (models.ConfigurationEmail) {
      Organisation.belongsTo(models.ConfigurationEmail, {
        foreignKey: 'configuration_email_id',
        as: 'configurationEmail'
      });
    }

    // Connecteur SMS
    if (models.ConfigurationSMS) {
      Organisation.belongsTo(models.ConfigurationSMS, {
        foreignKey: 'configuration_sms_id',
        as: 'configurationSms'
      });
    }
  };

  return Organisation;
};
