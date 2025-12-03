const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ParametresStructure = sequelize.define('ParametresStructure', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom_structure: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Ludothèque',
      comment: 'Nom de la structure'
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Adresse complète'
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
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'France'
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[\d\s\-\+\(\)]+$/
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    site_web: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Chemin vers le fichier logo'
    },
    siret: {
      type: DataTypes.STRING(14),
      allowNull: true,
      comment: 'Numéro SIRET pour entreprises'
    },
    numero_rna: {
      type: DataTypes.STRING(12),
      allowNull: true,
      comment: 'Numéro RNA pour associations (format W + 9 chiffres)'
    },
    numero_tva: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Numéro de TVA intracommunautaire'
    },
    iban: {
      type: DataTypes.STRING(34),
      allowNull: true,
      comment: 'IBAN du compte bancaire'
    },
    bic: {
      type: DataTypes.STRING(11),
      allowNull: true,
      comment: 'BIC/SWIFT du compte bancaire'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description de la structure'
    },
    horaires_ouverture: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Horaires par jour: {lundi: "9h-17h", mardi: "Fermé", ...}'
    },
    mentions_legales: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mentions légales du site'
    }
  }, {
    tableName: 'parametres_structure',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Instance methods
  ParametresStructure.prototype.toPublicJSON = function() {
    // Version publique sans données sensibles
    return {
      nom_structure: this.nom_structure,
      adresse: this.adresse,
      code_postal: this.code_postal,
      ville: this.ville,
      pays: this.pays,
      telephone: this.telephone,
      email: this.email,
      site_web: this.site_web,
      logo: this.logo,
      description: this.description,
      horaires_ouverture: this.horaires_ouverture
    };
  };

  return ParametresStructure;
};
