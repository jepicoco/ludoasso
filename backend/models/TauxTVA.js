const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TauxTVA = sequelize.define('TauxTVA', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      comment: 'Code court (ex: TVA20, TVA10, TVA55, TVA21, EXO)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle complet (ex: TVA 20%, TVA reduite 10%)'
    },
    taux: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Taux en pourcentage (ex: 20.00, 10.00, 5.50, 2.10, 0)'
    },
    compte_tva_collectee: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Compte comptable TVA collectee (ex: 44571)'
    },
    compte_tva_deductible: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Compte comptable TVA deductible (ex: 44566)'
    },
    mention_facture: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Mention obligatoire sur facture (ex: TVA non applicable art. 293B CGI)'
    },
    exonere: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True si exoneration (associations non assujetties)'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'taux_tva',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Methodes statiques
  TauxTVA.getActifs = async function() {
    return await this.findAll({
      where: { actif: true },
      order: [['ordre_affichage', 'ASC']]
    });
  };

  TauxTVA.getExonere = async function() {
    return await this.findOne({
      where: { exonere: true, actif: true }
    });
  };

  // Instance methods
  TauxTVA.prototype.calculerMontantTTC = function(montantHT) {
    if (this.exonere || this.taux === 0) {
      return parseFloat(montantHT);
    }
    const ht = parseFloat(montantHT);
    return Math.round((ht * (1 + this.taux / 100)) * 100) / 100;
  };

  TauxTVA.prototype.calculerMontantHT = function(montantTTC) {
    if (this.exonere || this.taux === 0) {
      return parseFloat(montantTTC);
    }
    const ttc = parseFloat(montantTTC);
    return Math.round((ttc / (1 + this.taux / 100)) * 100) / 100;
  };

  TauxTVA.prototype.calculerMontantTVA = function(montantHT) {
    if (this.exonere || this.taux === 0) {
      return 0;
    }
    const ht = parseFloat(montantHT);
    return Math.round((ht * this.taux / 100) * 100) / 100;
  };

  return TauxTVA;
};
