const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LotCodesBarres = sequelize.define('LotCodesBarres', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    module: {
      type: DataTypes.ENUM('utilisateur', 'jeu', 'livre', 'film', 'disque'),
      allowNull: false
    },
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 1000
      }
    },
    code_debut: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    code_fin: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    cree_par: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date_creation: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    date_impression: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nb_reimpressions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    nb_utilises: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    nb_annules: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    statut: {
      type: DataTypes.ENUM('actif', 'annule', 'complet'),
      allowNull: false,
      defaultValue: 'actif'
    }
  }, {
    tableName: 'lots_codes_barres',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Obtenir les statistiques d'un lot
  LotCodesBarres.prototype.getStats = function() {
    return {
      id: this.id,
      module: this.module,
      quantite: this.quantite,
      code_debut: this.code_debut,
      code_fin: this.code_fin,
      date_creation: this.date_creation,
      date_impression: this.date_impression,
      nb_reimpressions: this.nb_reimpressions,
      nb_utilises: this.nb_utilises,
      nb_annules: this.nb_annules,
      nb_disponibles: this.quantite - this.nb_utilises - this.nb_annules,
      statut: this.statut,
      pourcentage_utilise: Math.round((this.nb_utilises / this.quantite) * 100)
    };
  };

  // Verifier si le lot peut etre annule
  LotCodesBarres.prototype.canCancel = function() {
    return this.statut === 'actif' && this.nb_utilises < this.quantite;
  };

  // Verifier si le lot est complet (tous codes utilises)
  LotCodesBarres.prototype.checkCompletion = async function() {
    if (this.nb_utilises >= this.quantite && this.statut === 'actif') {
      this.statut = 'complet';
      await this.save();
    }
  };

  return LotCodesBarres;
};
