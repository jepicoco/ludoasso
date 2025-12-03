const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ModePaiement = sequelize.define('ModePaiement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libellé affiché: Espèces, Chèque, CB, Virement, etc.'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Mode de paiement actif et utilisable'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage (pour drag-and-drop)'
    },
    journal_comptable: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Code du journal comptable (BQ, CA, VT, etc.)'
    },
    type_operation: {
      type: DataTypes.ENUM('debit', 'credit'),
      allowNull: false,
      defaultValue: 'debit',
      comment: 'Type d\'opération comptable'
    },
    libelle_export_comptable: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Libellé utilisé dans les exports comptables'
    },
    code_comptable: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Numéro de compte général (ex: 530, 512, etc.)'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'bi-wallet2',
      comment: 'Classe Bootstrap Icons (ex: bi-cash, bi-credit-card)'
    },
    couleur: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'primary',
      comment: 'Couleur Bootstrap (primary, success, info, etc.)'
    }
  }, {
    tableName: 'modes_paiement',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Static methods
  ModePaiement.getActifs = async function() {
    return await this.findAll({
      where: { actif: true },
      order: [['ordre_affichage', 'ASC']]
    });
  };

  // Instance methods
  ModePaiement.prototype.toggleActif = async function() {
    this.actif = !this.actif;
    await this.save();
    return this;
  };

  return ModePaiement;
};
