const { DataTypes } = require('sequelize');

/**
 * Configuration des exports comptables multi-formats
 * Definit les parametres specifiques a chaque logiciel comptable
 */
module.exports = (sequelize) => {
  const ConfigurationExportComptable = sequelize.define('ConfigurationExportComptable', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Format d'export
    format: {
      type: DataTypes.ENUM('fec', 'sage', 'ciel', 'ebp', 'quadra', 'openconcerto', 'dolibarr', 'csv', 'json'),
      allowNull: false,
      unique: true,
      comment: 'Format d\'export'
    },

    // Libelle
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom affiche du format'
    },

    // Configuration du fichier
    separateur: {
      type: DataTypes.STRING(10),
      defaultValue: ';',
      comment: 'Separateur de colonnes (;|,|TAB)'
    },
    separateur_decimal: {
      type: DataTypes.STRING(5),
      defaultValue: ',',
      comment: 'Separateur decimal (. ou ,)'
    },
    separateur_milliers: {
      type: DataTypes.STRING(5),
      defaultValue: '',
      comment: 'Separateur de milliers (espace ou rien)'
    },
    format_date: {
      type: DataTypes.STRING(20),
      defaultValue: 'DD/MM/YYYY',
      comment: 'Format de date (DD/MM/YYYY, YYYY-MM-DD, YYYYMMDD)'
    },
    encodage: {
      type: DataTypes.ENUM('UTF-8', 'ISO-8859-1', 'CP1252', 'UTF-16'),
      defaultValue: 'UTF-8',
      comment: 'Encodage du fichier'
    },
    extension: {
      type: DataTypes.STRING(10),
      defaultValue: '.txt',
      comment: 'Extension du fichier'
    },

    // Structure du fichier
    inclure_entete: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Inclure ligne d\'entete'
    },
    inclure_pied: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Inclure ligne de pied'
    },
    guillemets_texte: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Entourer texte de guillemets'
    },
    precision_decimale: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
      comment: 'Nombre de decimales (2 ou 4)'
    },

    // Mapping des colonnes (JSON)
    colonnes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Definition des colonnes dans l\'ordre [{nom, champ, largeur, format}]'
    },

    // Mapping des comptes (JSON) - transformation des codes comptables
    mapping_comptes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Mapping code_interne -> code_externe pour les comptes'
    },

    // Mapping des journaux (JSON)
    mapping_journaux: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Mapping code_interne -> code_externe pour les journaux'
    },

    // Options specifiques au format (JSON)
    options_format: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Options specifiques au format'
    },

    // Statut
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Format actif'
    },
    par_defaut: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Format par defaut'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Ordre d\'affichage'
    },

    // Documentation
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description du format'
    },
    documentation_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL documentation format'
    }
  }, {
    tableName: 'configurations_export_comptable',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['format'], unique: true },
      { fields: ['actif'] },
      { fields: ['ordre_affichage'] }
    ]
  });

  // ==================== METHODES STATIQUES ====================

  /**
   * Obtient la configuration pour un format
   */
  ConfigurationExportComptable.getByFormat = async function(format) {
    return ConfigurationExportComptable.findOne({
      where: { format, actif: true }
    });
  };

  /**
   * Obtient tous les formats actifs
   */
  ConfigurationExportComptable.getActifs = async function() {
    return ConfigurationExportComptable.findAll({
      where: { actif: true },
      order: [['ordre_affichage', 'ASC']]
    });
  };

  /**
   * Obtient le format par defaut
   */
  ConfigurationExportComptable.getDefault = async function() {
    return ConfigurationExportComptable.findOne({
      where: { par_defaut: true, actif: true }
    });
  };

  /**
   * Resout un code compte pour un format donne
   */
  ConfigurationExportComptable.prototype.resoudreCompte = function(codeInterne) {
    if (this.mapping_comptes && this.mapping_comptes[codeInterne]) {
      return this.mapping_comptes[codeInterne];
    }
    return codeInterne;
  };

  /**
   * Resout un code journal pour un format donne
   */
  ConfigurationExportComptable.prototype.resoudreJournal = function(codeInterne) {
    if (this.mapping_journaux && this.mapping_journaux[codeInterne]) {
      return this.mapping_journaux[codeInterne];
    }
    return codeInterne;
  };

  return ConfigurationExportComptable;
};
