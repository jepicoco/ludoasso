const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompteurPiece = sequelize.define('CompteurPiece', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type_piece: {
      type: DataTypes.ENUM('COT', 'FAC', 'AVO', 'REC'),
      allowNull: false,
      comment: 'Type de pièce comptable: COT=Cotisation, FAC=Facture, AVO=Avoir, REC=Reçu'
    },
    exercice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2000,
        max: 2100
      },
      comment: 'Année de l\'exercice comptable'
    },
    dernier_numero: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Dernier numéro généré pour ce type et cet exercice'
    }
  }, {
    tableName: 'compteurs_pieces',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['type_piece', 'exercice'],
        name: 'unique_type_exercice'
      }
    ]
  });

  /**
   * Génère le prochain numéro de pièce comptable
   * @param {string} typePiece - Type de pièce (COT, FAC, AVO, REC)
   * @param {number} exercice - Année de l'exercice comptable
   * @param {Object} transaction - Transaction Sequelize pour garantir l'atomicité
   * @returns {Promise<string>} Numéro de pièce au format TYPE2025-00001
   */
  CompteurPiece.genererNumero = async function(typePiece, exercice, transaction = null) {
    // Validation des paramètres
    if (!['COT', 'FAC', 'AVO', 'REC'].includes(typePiece)) {
      throw new Error(`Type de pièce invalide: ${typePiece}. Valeurs autorisées: COT, FAC, AVO, REC`);
    }

    if (!Number.isInteger(exercice) || exercice < 2000 || exercice > 2100) {
      throw new Error(`Exercice invalide: ${exercice}. Doit être un entier entre 2000 et 2100`);
    }

    const options = transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {};

    // Rechercher ou créer le compteur pour ce type et cet exercice
    let compteur = await this.findOne({
      where: {
        type_piece: typePiece,
        exercice: exercice
      },
      ...options
    });

    if (!compteur) {
      // Créer un nouveau compteur si aucun n'existe
      compteur = await this.create({
        type_piece: typePiece,
        exercice: exercice,
        dernier_numero: 0
      }, options);
    }

    // Incrémenter le numéro
    compteur.dernier_numero += 1;
    await compteur.save(options);

    // Formater le numéro: COT2025-00001
    const numeroFormate = `${typePiece}${exercice}-${String(compteur.dernier_numero).padStart(5, '0')}`;

    return numeroFormate;
  };

  /**
   * Réinitialise un compteur (utile pour les tests ou changement d'exercice)
   * @param {string} typePiece - Type de pièce
   * @param {number} exercice - Année de l'exercice
   * @param {Object} transaction - Transaction Sequelize
   * @returns {Promise<void>}
   */
  CompteurPiece.reinitialiser = async function(typePiece, exercice, transaction = null) {
    const options = transaction ? { transaction } : {};

    const compteur = await this.findOne({
      where: {
        type_piece: typePiece,
        exercice: exercice
      },
      ...options
    });

    if (compteur) {
      compteur.dernier_numero = 0;
      await compteur.save(options);
    }
  };

  /**
   * Obtient le dernier numéro généré pour un type et un exercice
   * @param {string} typePiece - Type de pièce
   * @param {number} exercice - Année de l'exercice
   * @returns {Promise<number>} Dernier numéro ou 0 si aucun compteur n'existe
   */
  CompteurPiece.obtenirDernierNumero = async function(typePiece, exercice) {
    const compteur = await this.findOne({
      where: {
        type_piece: typePiece,
        exercice: exercice
      }
    });

    return compteur ? compteur.dernier_numero : 0;
  };

  return CompteurPiece;
};
