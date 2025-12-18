const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExemplaireLivre = sequelize.define('ExemplaireLivre', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    livre_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'livres',
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
        model: 'emplacements_livres',
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
    tableName: 'exemplaires_livres',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['livre_id'] },
      { fields: ['code_barre'] },
      { fields: ['statut'] },
      { fields: ['emplacement_id'] }
    ]
  });

  // Instance methods
  ExemplaireLivre.prototype.estDisponible = function() {
    return this.statut === 'disponible';
  };

  ExemplaireLivre.prototype.estEmprunte = function() {
    return this.statut === 'emprunte';
  };

  ExemplaireLivre.prototype.estReserve = function() {
    return this.statut === 'reserve';
  };

  // Class methods
  ExemplaireLivre.findByBarcode = async function(codeBarre) {
    return this.findOne({
      where: { code_barre: codeBarre },
      include: [{ association: 'livre' }]
    });
  };

  ExemplaireLivre.findDisponiblesByLivre = async function(livreId) {
    return this.findAll({
      where: {
        livre_id: livreId,
        statut: 'disponible'
      },
      order: [['numero_exemplaire', 'ASC']]
    });
  };

  ExemplaireLivre.getNextNumeroExemplaire = async function(livreId) {
    const maxResult = await this.findOne({
      where: { livre_id: livreId },
      attributes: [[sequelize.fn('MAX', sequelize.col('numero_exemplaire')), 'max_numero']],
      raw: true
    });
    return (maxResult?.max_numero || 0) + 1;
  };

  return ExemplaireLivre;
};
