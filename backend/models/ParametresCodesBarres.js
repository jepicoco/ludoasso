const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ParametresCodesBarres = sequelize.define('ParametresCodesBarres', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    module: {
      type: DataTypes.ENUM('utilisateur', 'jeu', 'livre', 'film', 'disque'),
      allowNull: false
      // unique: false - la combinaison (module, organisation_id, structure_id, groupe_id) est unique
    },
    organisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'organisations', key: 'id' }
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'structures', key: 'id' }
    },
    groupe_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'organisation_barcode_groups', key: 'id' }
    },
    format_pattern: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '{PREFIX}{NUMERO_SEQUENCE_8}',
      comment: 'Pattern avec tokens: {PREFIX}, {ANNEE_LONGUE}, {ANNEE_COURTE}, {MOIS_LONG}, {MOIS_COURT}, {JOUR_LONG}, {JOUR_COURT}, {NUMERO_SEQUENCE_4}, {NUMERO_SEQUENCE_6}, {NUMERO_SEQUENCE_8}, {NUMERO_SEQUENCE_10}'
    },
    prefix: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'USA',
      comment: 'Prefixe du code-barre'
    },
    sequence_reset: {
      type: DataTypes.ENUM('never', 'yearly', 'monthly', 'daily'),
      allowNull: false,
      defaultValue: 'never',
      comment: 'Periode de remise a zero de la sequence'
    },
    current_sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Numero de sequence courant'
    },
    current_period: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Periode courante: 2025, 202512, 20251209'
    },
    griller_annules: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si true, les codes annules sont grilles definitivement'
    },
    format_locked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si true, le format ne peut plus etre modifie'
    }
  }, {
    tableName: 'parametres_codes_barres',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Tokens disponibles pour la generation de codes-barres
  ParametresCodesBarres.TOKENS = {
    PREFIX: '{PREFIX}',
    ANNEE_LONGUE: '{ANNEE_LONGUE}',        // 2025
    ANNEE_COURTE: '{ANNEE_COURTE}',        // 25
    MOIS_LONG: '{MOIS_LONG}',              // 01
    MOIS_COURT: '{MOIS_COURT}',            // 1
    JOUR_LONG: '{JOUR_LONG}',              // 09
    JOUR_COURT: '{JOUR_COURT}',            // 9
    NUMERO_SEQUENCE_4: '{NUMERO_SEQUENCE_4}',    // 0001
    NUMERO_SEQUENCE_6: '{NUMERO_SEQUENCE_6}',    // 000001
    NUMERO_SEQUENCE_8: '{NUMERO_SEQUENCE_8}',    // 00000001
    NUMERO_SEQUENCE_10: '{NUMERO_SEQUENCE_10}'   // 0000000001
  };

  // Prefixes par defaut par module
  ParametresCodesBarres.DEFAULT_PREFIXES = {
    utilisateur: 'USA',
    jeu: 'JEU',
    livre: 'LIV',
    film: 'FLM',
    disque: 'DSQ'
  };

  /**
   * Obtenir ou creer les parametres d'un module selon le contexte
   * @param {string} module - Le module (utilisateur, jeu, livre, film, disque)
   * @param {Object} context - Le contexte { organisation_id, structure_id, groupe_id }
   */
  ParametresCodesBarres.getOrCreateForModule = async function(module, context = {}) {
    const { organisation_id = null, structure_id = null, groupe_id = null } = context;

    // Construire la clause where selon le contexte
    const where = { module };
    if (organisation_id) {
      where.organisation_id = organisation_id;
      where.structure_id = null;
      where.groupe_id = null;
    } else if (structure_id) {
      where.organisation_id = null;
      where.structure_id = structure_id;
      where.groupe_id = null;
    } else if (groupe_id) {
      where.organisation_id = null;
      where.structure_id = null;
      where.groupe_id = groupe_id;
    } else {
      // Fallback: parametres globaux (ancien comportement)
      where.organisation_id = null;
      where.structure_id = null;
      where.groupe_id = null;
    }

    let params = await this.findOne({ where });
    if (!params) {
      params = await this.create({
        module,
        organisation_id: organisation_id || null,
        structure_id: structure_id || null,
        groupe_id: groupe_id || null,
        prefix: this.DEFAULT_PREFIXES[module] || module.toUpperCase().substring(0, 3),
        format_pattern: '{PREFIX}{NUMERO_SEQUENCE_8}'
      });
    }
    return params;
  };

  /**
   * Obtenir tous les parametres pour un contexte donne
   * @param {Object} context - Le contexte { organisation_id, structure_id, groupe_id }
   */
  ParametresCodesBarres.getAllForContext = async function(context = {}) {
    const { organisation_id = null, structure_id = null, groupe_id = null } = context;

    const where = {};
    if (organisation_id) {
      where.organisation_id = organisation_id;
      where.structure_id = null;
      where.groupe_id = null;
    } else if (structure_id) {
      where.organisation_id = null;
      where.structure_id = structure_id;
      where.groupe_id = null;
    } else if (groupe_id) {
      where.organisation_id = null;
      where.structure_id = null;
      where.groupe_id = groupe_id;
    } else {
      where.organisation_id = null;
      where.structure_id = null;
      where.groupe_id = null;
    }

    return this.findAll({ where });
  };

  // Methode pour obtenir la periode courante selon le type de reset
  ParametresCodesBarres.prototype.getCurrentPeriod = function() {
    const now = new Date();
    switch (this.sequence_reset) {
      case 'yearly':
        return now.getFullYear().toString();
      case 'monthly':
        return now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0');
      case 'daily':
        return now.getFullYear().toString() +
               String(now.getMonth() + 1).padStart(2, '0') +
               String(now.getDate()).padStart(2, '0');
      default:
        return null;
    }
  };

  // Methode pour verifier si la sequence doit etre reinitialiser
  ParametresCodesBarres.prototype.shouldResetSequence = function() {
    if (this.sequence_reset === 'never') return false;
    const currentPeriod = this.getCurrentPeriod();
    return this.current_period !== currentPeriod;
  };

  // Methode pour interpreter le format et generer un code-barre
  ParametresCodesBarres.prototype.generateCode = function(sequence, date = new Date()) {
    let code = this.format_pattern;

    // Remplacer le prefix
    code = code.replace('{PREFIX}', this.prefix);

    // Remplacer les tokens de date
    code = code.replace('{ANNEE_LONGUE}', date.getFullYear().toString());
    code = code.replace('{ANNEE_COURTE}', date.getFullYear().toString().slice(-2));
    code = code.replace('{MOIS_LONG}', String(date.getMonth() + 1).padStart(2, '0'));
    code = code.replace('{MOIS_COURT}', String(date.getMonth() + 1));
    code = code.replace('{JOUR_LONG}', String(date.getDate()).padStart(2, '0'));
    code = code.replace('{JOUR_COURT}', String(date.getDate()));

    // Remplacer les tokens de sequence
    code = code.replace('{NUMERO_SEQUENCE_4}', String(sequence).padStart(4, '0'));
    code = code.replace('{NUMERO_SEQUENCE_6}', String(sequence).padStart(6, '0'));
    code = code.replace('{NUMERO_SEQUENCE_8}', String(sequence).padStart(8, '0'));
    code = code.replace('{NUMERO_SEQUENCE_10}', String(sequence).padStart(10, '0'));

    return code;
  };

  // Methode pour extraire les infos d'apercu du format
  ParametresCodesBarres.prototype.getPreview = function() {
    const exampleDate = new Date();
    const exampleSequence = 42;
    return {
      pattern: this.format_pattern,
      prefix: this.prefix,
      example: this.generateCode(exampleSequence, exampleDate),
      sequence_reset: this.sequence_reset,
      format_locked: this.format_locked
    };
  };

  return ParametresCodesBarres;
};
