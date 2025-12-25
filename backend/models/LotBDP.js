/**
 * Model LotBDP
 *
 * Représente un lot de livres prêté par la BDP (Bibliothèque Départementale de Prêt).
 * Les lots ont une date de retour prévue et doivent être inventoriés.
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const LotBDP = sequelize.define('LotBDP', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    numero_lot: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Numéro de lot fourni par la BDP'
    },
    date_reception: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de réception du lot'
    },
    date_retour_prevue: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de retour prévue à la BDP'
    },
    retourne: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Le lot a été retourné à la BDP'
    },
    date_retour_effectif: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date effective de retour'
    },
    nb_exemplaires: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre d\'exemplaires dans le lot'
    },
    nb_exemplaires_retournes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre d\'exemplaires retournés'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'structures',
        key: 'id'
      }
    },
    import_session_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Session d\'import associée'
    }
  }, {
    tableName: 'lots_bdp',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Instance methods

  /**
   * Vérifie si le lot est en retard de retour
   */
  LotBDP.prototype.isOverdue = function() {
    if (this.retourne || !this.date_retour_prevue) return false;
    return new Date() > new Date(this.date_retour_prevue);
  };

  /**
   * Retourne le nombre de jours avant/après la date de retour
   */
  LotBDP.prototype.getDaysUntilReturn = function() {
    if (!this.date_retour_prevue) return null;
    const now = new Date();
    const returnDate = new Date(this.date_retour_prevue);
    const diffTime = returnDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  /**
   * Marque le lot comme retourné
   */
  LotBDP.prototype.marquerRetourne = async function(nbExemplairesRetournes = null) {
    this.retourne = true;
    this.date_retour_effectif = new Date();
    if (nbExemplairesRetournes !== null) {
      this.nb_exemplaires_retournes = nbExemplairesRetournes;
    }
    await this.save();
    return this;
  };

  /**
   * Met à jour le compteur d'exemplaires
   */
  LotBDP.prototype.updateExemplaireCount = async function() {
    const ExemplaireLivre = sequelize.models.ExemplaireLivre;
    if (!ExemplaireLivre) return;

    const count = await ExemplaireLivre.count({
      where: { lot_bdp_id: this.id }
    });

    this.nb_exemplaires = count;
    await this.save();
    return count;
  };

  // Class methods

  /**
   * Trouve les lots en retard de retour
   */
  LotBDP.findOverdue = async function(structureId = null) {
    const where = {
      retourne: false,
      date_retour_prevue: { [Op.lt]: new Date() }
    };
    if (structureId) {
      where.structure_id = structureId;
    }

    return this.findAll({
      where,
      order: [['date_retour_prevue', 'ASC']]
    });
  };

  /**
   * Trouve les lots à retourner prochainement (dans les X jours)
   */
  LotBDP.findUpcomingReturns = async function(days = 30, structureId = null) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const where = {
      retourne: false,
      date_retour_prevue: {
        [Op.between]: [new Date(), futureDate]
      }
    };
    if (structureId) {
      where.structure_id = structureId;
    }

    return this.findAll({
      where,
      order: [['date_retour_prevue', 'ASC']]
    });
  };

  /**
   * Statistiques globales des lots BDP
   */
  LotBDP.getStats = async function(structureId = null) {
    const where = structureId ? { structure_id: structureId } : {};

    const [total, enCours, enRetard, retournes] = await Promise.all([
      this.count({ where }),
      this.count({ where: { ...where, retourne: false } }),
      this.count({
        where: {
          ...where,
          retourne: false,
          date_retour_prevue: { [Op.lt]: new Date() }
        }
      }),
      this.count({ where: { ...where, retourne: true } })
    ]);

    return { total, enCours, enRetard, retournes };
  };

  return LotBDP;
};
