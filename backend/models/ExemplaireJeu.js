const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExemplaireJeu = sequelize.define('ExemplaireJeu', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    jeu_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'jeux',
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
        model: 'emplacements_jeux',
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
    tableName: 'exemplaires_jeux',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['jeu_id'] },
      { fields: ['code_barre'] },
      { fields: ['statut'] },
      { fields: ['emplacement_id'] }
    ]
  });

  // Instance methods
  ExemplaireJeu.prototype.estDisponible = function() {
    return this.statut === 'disponible';
  };

  ExemplaireJeu.prototype.estEmprunte = function() {
    return this.statut === 'emprunte';
  };

  ExemplaireJeu.prototype.estReserve = function() {
    return this.statut === 'reserve';
  };

  // Class methods
  ExemplaireJeu.findByBarcode = async function(codeBarre) {
    return this.findOne({
      where: { code_barre: codeBarre },
      include: [{ association: 'jeu' }]
    });
  };

  ExemplaireJeu.findDisponiblesByJeu = async function(jeuId) {
    return this.findAll({
      where: {
        jeu_id: jeuId,
        statut: 'disponible'
      },
      order: [['numero_exemplaire', 'ASC']]
    });
  };

  ExemplaireJeu.getNextNumeroExemplaire = async function(jeuId) {
    const maxResult = await this.findOne({
      where: { jeu_id: jeuId },
      attributes: [[sequelize.fn('MAX', sequelize.col('numero_exemplaire')), 'max_numero']],
      raw: true
    });
    return (maxResult?.max_numero || 0) + 1;
  };

  return ExemplaireJeu;
};
