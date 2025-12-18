const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExemplaireFilm = sequelize.define('ExemplaireFilm', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    film_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'films',
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
        model: 'emplacements_films',
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
    tableName: 'exemplaires_films',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['film_id'] },
      { fields: ['code_barre'] },
      { fields: ['statut'] },
      { fields: ['emplacement_id'] }
    ]
  });

  // Instance methods
  ExemplaireFilm.prototype.estDisponible = function() {
    return this.statut === 'disponible';
  };

  ExemplaireFilm.prototype.estEmprunte = function() {
    return this.statut === 'emprunte';
  };

  ExemplaireFilm.prototype.estReserve = function() {
    return this.statut === 'reserve';
  };

  // Class methods
  ExemplaireFilm.findByBarcode = async function(codeBarre) {
    return this.findOne({
      where: { code_barre: codeBarre },
      include: [{ association: 'film' }]
    });
  };

  ExemplaireFilm.findDisponiblesByFilm = async function(filmId) {
    return this.findAll({
      where: {
        film_id: filmId,
        statut: 'disponible'
      },
      order: [['numero_exemplaire', 'ASC']]
    });
  };

  ExemplaireFilm.getNextNumeroExemplaire = async function(filmId) {
    const maxResult = await this.findOne({
      where: { film_id: filmId },
      attributes: [[sequelize.fn('MAX', sequelize.col('numero_exemplaire')), 'max_numero']],
      raw: true
    });
    return (maxResult?.max_numero || 0) + 1;
  };

  return ExemplaireFilm;
};
