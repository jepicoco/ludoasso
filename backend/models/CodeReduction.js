const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CodeReduction = sequelize.define('CodeReduction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Code de réduction (ex: NOEL2024, PROMO10)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libellé descriptif de la réduction'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description détaillée de la réduction'
    },
    type_reduction: {
      type: DataTypes.ENUM('pourcentage', 'fixe', 'fixe_avec_avoir'),
      allowNull: false,
      defaultValue: 'pourcentage',
      comment: 'Type de réduction: pourcentage, fixe (min 0€), fixe avec avoir (crédit si <0€)'
    },
    valeur: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'Valeur de la réduction (pourcentage ou montant en euros)'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Code de réduction actif et utilisable'
    },
    date_debut_validite: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date à partir de laquelle ce code est valide'
    },
    date_fin_validite: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date jusqu\'à laquelle ce code est valide'
    },
    usage_limite: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Nombre maximum d\'utilisations (null = illimité)'
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Nombre d\'utilisations actuelles'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage dans les listes'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'bi-percent',
      comment: 'Classe Bootstrap Icons'
    },
    couleur: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'success',
      comment: 'Couleur Bootstrap'
    }
  }, {
    tableName: 'codes_reduction',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Instance methods
  CodeReduction.prototype.estValide = function(dateReference = new Date()) {
    if (!this.actif) return false;

    const date = new Date(dateReference);

    // Vérifier les dates de validité
    if (this.date_debut_validite) {
      if (date < new Date(this.date_debut_validite)) return false;
    }

    if (this.date_fin_validite) {
      if (date > new Date(this.date_fin_validite)) return false;
    }

    // Vérifier la limite d'usage
    if (this.usage_limite !== null && this.usage_count >= this.usage_limite) {
      return false;
    }

    return true;
  };

  CodeReduction.prototype.calculerReduction = function(montantBase) {
    const montant = parseFloat(montantBase);
    const valeur = parseFloat(this.valeur);

    let reduction = 0;
    let montantFinal = montant;
    let avoir = 0;

    switch (this.type_reduction) {
      case 'pourcentage':
        reduction = montant * (valeur / 100);
        montantFinal = montant - reduction;
        break;

      case 'fixe':
        reduction = Math.min(montant, valeur);
        montantFinal = Math.max(0, montant - valeur);
        break;

      case 'fixe_avec_avoir':
        reduction = valeur;
        montantFinal = montant - valeur;
        if (montantFinal < 0) {
          avoir = Math.abs(montantFinal);
          montantFinal = 0;
        }
        break;
    }

    return {
      montant_base: montant,
      reduction: Math.round(reduction * 100) / 100,
      montant_final: Math.round(montantFinal * 100) / 100,
      avoir: Math.round(avoir * 100) / 100,
      type: this.type_reduction
    };
  };

  CodeReduction.prototype.incrementerUsage = async function() {
    this.usage_count += 1;
    await this.save();
    return this;
  };

  CodeReduction.prototype.toggleActif = async function() {
    this.actif = !this.actif;
    await this.save();
    return this;
  };

  // Static methods
  CodeReduction.getActifs = async function() {
    return await this.findAll({
      where: { actif: true },
      order: [['ordre_affichage', 'ASC']]
    });
  };

  CodeReduction.findByCode = async function(code) {
    return await this.findOne({
      where: { code: code.toUpperCase() }
    });
  };

  return CodeReduction;
};
