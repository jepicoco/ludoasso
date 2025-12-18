const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExemplaireDisque = sequelize.define('ExemplaireDisque', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    disque_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'disques',
        key: 'id'
      }
    },
    code_barre: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: 'Code-barre unique de l\'exemplaire'
    },
    etat: {
      type: DataTypes.ENUM('neuf', 'tres_bon', 'bon', 'acceptable', 'mauvais'),
      allowNull: true,
      defaultValue: 'bon',
      comment: 'Etat physique de l\'exemplaire'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes specifiques a cet exemplaire'
    },
    emplacement_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_disques',
        key: 'id'
      },
      comment: 'Emplacement physique de l\'exemplaire'
    },
    prix_achat: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Prix d\'achat de cet exemplaire'
    },
    date_acquisition: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date d\'acquisition de cet exemplaire'
    },
    statut: {
      type: DataTypes.ENUM('disponible', 'emprunte', 'reserve', 'maintenance', 'perdu', 'archive'),
      allowNull: false,
      defaultValue: 'disponible',
      comment: 'Statut de l\'exemplaire'
    },
    numero_exemplaire: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Numero sequentiel par article (1, 2, 3...)'
    }
  }, {
    tableName: 'exemplaires_disques',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['disque_id'] },
      { fields: ['code_barre'] },
      { fields: ['statut'] },
      { fields: ['emplacement_id'] }
    ]
  });

  // Instance methods
  ExemplaireDisque.prototype.estDisponible = function() {
    return this.statut === 'disponible';
  };

  ExemplaireDisque.prototype.estEmprunte = function() {
    return this.statut === 'emprunte';
  };

  ExemplaireDisque.prototype.estReserve = function() {
    return this.statut === 'reserve';
  };

  // Class methods
  ExemplaireDisque.findByBarcode = async function(codeBarre) {
    return this.findOne({
      where: { code_barre: codeBarre },
      include: [{ association: 'disque' }]
    });
  };

  ExemplaireDisque.findDisponiblesByDisque = async function(disqueId) {
    return this.findAll({
      where: {
        disque_id: disqueId,
        statut: 'disponible'
      },
      order: [['numero_exemplaire', 'ASC']]
    });
  };

  ExemplaireDisque.getNextNumeroExemplaire = async function(disqueId) {
    const maxResult = await this.findOne({
      where: { disque_id: disqueId },
      attributes: [[sequelize.fn('MAX', sequelize.col('numero_exemplaire')), 'max_numero']],
      raw: true
    });
    return (maxResult?.max_numero || 0) + 1;
  };

  return ExemplaireDisque;
};
