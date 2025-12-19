const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EcritureComptable = sequelize.define('EcritureComptable', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // Informations journal (FEC: colonnes 1-2)
    journal_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Code du journal comptable (VT=Ventes, BQ=Banque, etc.)'
    },
    journal_libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libellé du journal comptable'
    },
    // Informations exercice et numéro (FEC: colonnes 3-4)
    exercice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2000,
        max: 2100
      },
      comment: 'Année de l\'exercice comptable'
    },
    numero_ecriture: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Numéro de l\'écriture comptable (unique par exercice)'
    },
    // Date de l'écriture (FEC: colonne 5)
    date_ecriture: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date de l\'opération comptable'
    },
    // Compte (FEC: colonnes 6-8)
    compte_numero: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Numéro du compte général du plan comptable'
    },
    compte_libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libellé du compte comptable'
    },
    compte_auxiliaire: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Numéro du compte auxiliaire (tiers)'
    },
    // Pièce justificative (FEC: colonnes 9-10)
    piece_reference: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Référence de la pièce justificative'
    },
    piece_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date de la pièce justificative'
    },
    // Libellé de l'écriture (FEC: colonne 11)
    libelle: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Libellé de l\'écriture comptable'
    },
    // Montants (FEC: colonnes 12-13)
    debit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Montant au débit'
    },
    credit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Montant au crédit'
    },
    // Date de validation (FEC: colonne 14)
    date_validation: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de validation de l\'écriture'
    },
    // Référence à la cotisation (pour traçabilité)
    cotisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cotisations',
        key: 'id'
      },
      comment: 'ID de la cotisation associée à cette écriture'
    },
    // Lettrage (pour rapprochements bancaires - Phase 2)
    lettrage: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Code de lettrage pour rapprochement'
    },
    // Section analytique (pour comptabilité analytique - Phase 2)
    section_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de la section analytique'
    },
    // Structure (pour multi-structures)
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'structures',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID de la structure associee a cette ecriture'
    }
  }, {
    tableName: 'ecritures_comptables',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['exercice', 'numero_ecriture']
      },
      {
        fields: ['date_ecriture']
      },
      {
        fields: ['compte_numero']
      },
      {
        fields: ['cotisation_id']
      },
      {
        fields: ['journal_code']
      },
      {
        fields: ['piece_reference']
      }
    ]
  });

  /**
   * Valide une écriture comptable
   * @returns {Promise<void>}
   */
  EcritureComptable.prototype.valider = async function() {
    if (!this.date_validation) {
      this.date_validation = new Date();
      await this.save();
    }
  };

  /**
   * Vérifie si une écriture est équilibrée (débit = crédit)
   * Note: Cette méthode vérifie une seule ligne. Pour vérifier l'équilibre global,
   * il faut regrouper toutes les écritures d'une même pièce.
   * @returns {boolean}
   */
  EcritureComptable.prototype.estEquilibree = function() {
    return parseFloat(this.debit) === parseFloat(this.credit);
  };

  /**
   * Génère les écritures pour une pièce donnée et vérifie l'équilibre
   * @param {string} pieceReference - Référence de la pièce
   * @param {number} exercice - Exercice comptable
   * @returns {Promise<{ecritures: Array, equilibre: boolean, solde: number}>}
   */
  EcritureComptable.verifierEquilibrePiece = async function(pieceReference, exercice) {
    const ecritures = await this.findAll({
      where: {
        piece_reference: pieceReference,
        exercice: exercice
      }
    });

    const totalDebit = ecritures.reduce((sum, e) => sum + parseFloat(e.debit), 0);
    const totalCredit = ecritures.reduce((sum, e) => sum + parseFloat(e.credit), 0);
    const solde = totalDebit - totalCredit;

    return {
      ecritures,
      equilibre: Math.abs(solde) < 0.01, // Tolérance pour erreurs d'arrondi
      solde: Math.round(solde * 100) / 100
    };
  };

  /**
   * Récupère toutes les écritures d'un exercice pour export FEC
   * @param {number} exercice - Année de l'exercice
   * @param {number|null} structureId - ID de la structure (null = toutes)
   * @returns {Promise<Array>}
   */
  EcritureComptable.getEcrituresPourFEC = async function(exercice, structureId = null) {
    const where = { exercice: exercice };

    if (structureId) {
      where.structure_id = structureId;
    }

    return await this.findAll({
      where,
      order: [
        ['journal_code', 'ASC'],
        ['date_ecriture', 'ASC'],
        ['numero_ecriture', 'ASC']
      ]
    });
  };

  return EcritureComptable;
};
