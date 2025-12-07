const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cotisation = sequelize.define('Cotisation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      comment: 'Utilisateur concerne par cette cotisation'
    },
    tarif_cotisation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tarifs_cotisation',
        key: 'id'
      },
      comment: 'Tarif appliqué pour cette cotisation'
    },
    periode_debut: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date de début de la période de cotisation'
    },
    periode_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date de fin de la période de cotisation'
    },
    montant_base: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'Montant de base avant réduction'
    },
    reduction_appliquee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Montant de la réduction appliquée'
    },
    montant_paye: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'Montant final payé (base - réduction)'
    },
    adhesion_association: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'L\'adhérent était-il membre de l\'association au moment de la cotisation'
    },
    date_paiement: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date du paiement de la cotisation'
    },
    mode_paiement: {
      type: DataTypes.ENUM('especes', 'cheque', 'carte_bancaire', 'virement', 'prelevement', 'autre'),
      allowNull: false,
      defaultValue: 'especes',
      comment: 'Mode de paiement utilisé'
    },
    reference_paiement: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Référence du paiement (numéro de chèque, transaction, etc.)'
    },
    statut: {
      type: DataTypes.ENUM('en_cours', 'expiree', 'annulee'),
      allowNull: false,
      defaultValue: 'en_cours',
      comment: 'Statut de la cotisation'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes ou remarques sur la cotisation'
    },
    // Champs pour la gestion comptable (Phase 2)
    code_comptable_usager: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Code comptable de l\'usager'
    },
    numero_piece_comptable: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Numéro de pièce comptable'
    },
    date_comptabilisation: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de comptabilisation'
    },
    // Code de réduction
    code_reduction_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID du code de réduction appliqué'
    },
    code_reduction_applique: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Code de réduction appliqué (copie pour historique)'
    },
    avoir_genere: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Montant d\'avoir généré si réduction > montant (fixe_avec_avoir)'
    }
  }, {
    tableName: 'cotisations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['utilisateur_id']
      },
      {
        fields: ['statut']
      },
      {
        fields: ['periode_debut', 'periode_fin']
      }
    ]
  });

  // Instance methods
  Cotisation.prototype.estActive = function(dateReference = new Date()) {
    if (this.statut !== 'en_cours') return false;

    const date = new Date(dateReference);
    const debut = new Date(this.periode_debut);
    const fin = new Date(this.periode_fin);

    return date >= debut && date <= fin;
  };

  Cotisation.prototype.estExpiree = function(dateReference = new Date()) {
    const date = new Date(dateReference);
    const fin = new Date(this.periode_fin);

    return date > fin;
  };

  Cotisation.prototype.joursRestants = function(dateReference = new Date()) {
    const date = new Date(dateReference);
    const fin = new Date(this.periode_fin);

    const diffTime = fin - date;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  };

  Cotisation.prototype.annuler = async function(motif = null) {
    this.statut = 'annulee';
    if (motif) {
      this.notes = (this.notes ? this.notes + '\n' : '') + `Annulation: ${motif}`;
    }
    await this.save();
  };

  Cotisation.prototype.verifierEtMettreAJourStatut = async function() {
    if (this.statut === 'en_cours' && this.estExpiree()) {
      this.statut = 'expiree';
      await this.save();
      return true;
    }
    return false;
  };

  // Class methods
  Cotisation.trouverCotisationActive = async function(utilisateurId, dateReference = new Date()) {
    const date = new Date(dateReference);

    return await this.findOne({
      where: {
        utilisateur_id: utilisateurId,
        statut: 'en_cours',
        periode_debut: {
          [sequelize.Sequelize.Op.lte]: date
        },
        periode_fin: {
          [sequelize.Sequelize.Op.gte]: date
        }
      },
      order: [['periode_fin', 'DESC']]
    });
  };

  return Cotisation;
};
