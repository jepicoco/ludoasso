const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RepartitionAnalytique = sequelize.define('RepartitionAnalytique', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // Type de prestation (polymorphique)
    prestation_type: {
      type: DataTypes.ENUM('tarif_cotisation', 'tarif_location', 'tarif_retard', 'tarif_animation', 'autre'),
      allowNull: false,
      comment: 'Type de prestation associee'
    },
    prestation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID de la prestation (tarif_cotisation_id, etc.)'
    },
    section_analytique_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sections_analytiques',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    pourcentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 100.00,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Pourcentage de repartition (ex: 60.00 pour 60%)'
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d affichage'
    }
  }, {
    tableName: 'repartitions_analytiques',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_repart_unique',
        unique: true,
        fields: ['prestation_type', 'prestation_id', 'section_analytique_id']
      },
      {
        name: 'idx_repart_prestation',
        fields: ['prestation_type', 'prestation_id']
      }
    ]
  });

  // Methodes statiques

  /**
   * Recupere la repartition analytique d'une prestation
   * @param {string} type - Type de prestation
   * @param {number} id - ID de la prestation
   * @returns {Promise<Array>}
   */
  RepartitionAnalytique.getRepartition = async function(type, id) {
    return await this.findAll({
      where: {
        prestation_type: type,
        prestation_id: id
      },
      include: [{
        model: sequelize.models.SectionAnalytique,
        as: 'section'
      }],
      order: [['ordre', 'ASC']]
    });
  };

  /**
   * Definit la repartition analytique d'une prestation
   * Remplace toute repartition existante
   * @param {string} type - Type de prestation
   * @param {number} id - ID de la prestation
   * @param {Array<{section_analytique_id: number, pourcentage: number}>} repartitions
   */
  RepartitionAnalytique.setRepartition = async function(type, id, repartitions) {
    // Valider que le total = 100%
    const total = repartitions.reduce((sum, r) => sum + parseFloat(r.pourcentage), 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new Error(`La somme des pourcentages doit etre 100% (actuellement: ${total}%)`);
    }

    // Transaction pour atomicite
    const transaction = await sequelize.transaction();
    try {
      // Supprimer les anciennes repartitions
      await this.destroy({
        where: {
          prestation_type: type,
          prestation_id: id
        },
        transaction
      });

      // Creer les nouvelles
      const records = repartitions.map((r, index) => ({
        prestation_type: type,
        prestation_id: id,
        section_analytique_id: r.section_analytique_id,
        pourcentage: r.pourcentage,
        ordre: index
      }));

      await this.bulkCreate(records, { transaction });

      await transaction.commit();
      return await this.getRepartition(type, id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  /**
   * Calcule la ventilation d'un montant selon la repartition
   * @param {string} type - Type de prestation
   * @param {number} id - ID de la prestation
   * @param {number} montant - Montant a ventiler
   * @returns {Promise<Array<{section: object, montant: number, pourcentage: number}>>}
   */
  RepartitionAnalytique.ventilerMontant = async function(type, id, montant) {
    const repartitions = await this.getRepartition(type, id);

    if (repartitions.length === 0) {
      return [{
        section: null,
        montant: parseFloat(montant),
        pourcentage: 100
      }];
    }

    return repartitions.map(r => ({
      section: r.section,
      montant: Math.round((parseFloat(montant) * r.pourcentage / 100) * 100) / 100,
      pourcentage: parseFloat(r.pourcentage)
    }));
  };

  return RepartitionAnalytique;
};
