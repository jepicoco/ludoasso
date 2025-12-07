const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TarifCotisation = sequelize.define('TarifCotisation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom du tarif (ex: "Tarif annuel standard", "Tarif étudiant")'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description détaillée du tarif'
    },
    type_periode: {
      type: DataTypes.ENUM('annee_civile', 'annee_scolaire', 'date_a_date'),
      allowNull: false,
      defaultValue: 'annee_civile',
      comment: 'Type de période: année civile (1er jan-31 déc), année scolaire (1er sep-31 août), ou date à date'
    },
    type_montant: {
      type: DataTypes.ENUM('fixe', 'prorata'),
      allowNull: false,
      defaultValue: 'fixe',
      comment: 'Montant fixe ou calculé au prorata du mois entamé'
    },
    montant_base: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'Montant de base de la cotisation en euros'
    },
    reduction_association_type: {
      type: DataTypes.ENUM('pourcentage', 'montant'),
      allowNull: false,
      defaultValue: 'pourcentage',
      comment: 'Type de réduction pour les adhérents à l\'association'
    },
    reduction_association_valeur: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Valeur de la réduction (pourcentage ou montant en euros)'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Tarif actif et utilisable'
    },
    date_debut_validite: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date à partir de laquelle ce tarif est valide'
    },
    date_fin_validite: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date jusqu\'à laquelle ce tarif est valide'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage dans les listes'
    },
    // Champs pour la gestion comptable
    code_comptable: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Code comptable general (ex: 756 Cotisations, 706 Prestations)'
    },
    taux_tva_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'taux_tva',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Taux de TVA applicable (null = utilise le taux du module)'
    },
    // Ancien champ conserve pour retrocompatibilite, utiliser RepartitionAnalytique
    code_analytique: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'DEPRECATED: Utiliser RepartitionAnalytique pour multi-axes'
    },
    par_defaut: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Tarif par défaut préchargé dans le formulaire de cotisation'
    }
  }, {
    tableName: 'tarifs_cotisation',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Instance methods
  TarifCotisation.prototype.calculerMontant = function(dateDebut, dateFin, estAdherentAssociation = false) {
    let montant = parseFloat(this.montant_base);

    // Calcul au prorata si nécessaire
    if (this.type_montant === 'prorata') {
      const moisTotal = this.calculerDureePeriode();
      const moisEffectifs = this.calculerMoisEffectifs(dateDebut, dateFin);
      montant = (montant / moisTotal) * moisEffectifs;
    }

    // Application de la réduction association
    if (estAdherentAssociation && this.reduction_association_valeur > 0) {
      if (this.reduction_association_type === 'pourcentage') {
        montant = montant * (1 - this.reduction_association_valeur / 100);
      } else {
        montant = Math.max(0, montant - parseFloat(this.reduction_association_valeur));
      }
    }

    return Math.round(montant * 100) / 100; // Arrondi à 2 décimales
  };

  TarifCotisation.prototype.calculerDureePeriode = function() {
    // Retourne la durée de la période en mois
    switch (this.type_periode) {
      case 'annee_civile':
      case 'annee_scolaire':
        return 12;
      default:
        return 12; // Par défaut
    }
  };

  TarifCotisation.prototype.calculerMoisEffectifs = function(dateDebut, dateFin) {
    // Calcule le nombre de mois entre deux dates (mois entamé = mois compté)
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    const mois = (fin.getFullYear() - debut.getFullYear()) * 12
                + (fin.getMonth() - debut.getMonth()) + 1;

    return Math.max(1, mois); // Minimum 1 mois
  };

  TarifCotisation.prototype.calculerDatesPeriode = function(dateReference = new Date()) {
    const annee = dateReference.getFullYear();
    let dateDebut, dateFin;

    switch (this.type_periode) {
      case 'annee_civile':
        dateDebut = new Date(annee, 0, 1); // 1er janvier
        dateFin = new Date(annee, 11, 31); // 31 décembre
        break;

      case 'annee_scolaire':
        // Si on est avant septembre, on prend l'année scolaire précédente
        if (dateReference.getMonth() < 8) { // Avant septembre (mois 8)
          dateDebut = new Date(annee - 1, 8, 1); // 1er septembre année précédente
          dateFin = new Date(annee, 7, 31); // 31 août année en cours
        } else {
          dateDebut = new Date(annee, 8, 1); // 1er septembre
          dateFin = new Date(annee + 1, 7, 31); // 31 août année suivante
        }
        break;

      case 'date_a_date':
        // Pour date à date, la période commence à la date de référence
        dateDebut = new Date(dateReference);
        dateFin = new Date(dateDebut);
        dateFin.setFullYear(dateFin.getFullYear() + 1);
        dateFin.setDate(dateFin.getDate() - 1); // -1 jour pour avoir exactement 1 an
        break;

      default:
        dateDebut = new Date(annee, 0, 1);
        dateFin = new Date(annee, 11, 31);
    }

    return { dateDebut, dateFin };
  };

  TarifCotisation.prototype.estValide = function(dateReference = new Date()) {
    if (!this.actif) return false;

    const date = new Date(dateReference);

    if (this.date_debut_validite) {
      if (date < new Date(this.date_debut_validite)) return false;
    }

    if (this.date_fin_validite) {
      if (date > new Date(this.date_fin_validite)) return false;
    }

    return true;
  };

  /**
   * Recupere le taux de TVA associe a ce tarif
   * @returns {Promise<TauxTVA|null>}
   */
  TarifCotisation.prototype.getTauxTVA = async function() {
    if (!this.taux_tva_id) return null;
    return await sequelize.models.TauxTVA.findByPk(this.taux_tva_id);
  };

  /**
   * Recupere la repartition analytique de ce tarif
   * @returns {Promise<Array>}
   */
  TarifCotisation.prototype.getRepartitionAnalytique = async function() {
    return await sequelize.models.RepartitionAnalytique.getRepartition(
      'tarif_cotisation',
      this.id
    );
  };

  /**
   * Definit la repartition analytique de ce tarif
   * @param {Array<{section_analytique_id: number, pourcentage: number}>} repartitions
   */
  TarifCotisation.prototype.setRepartitionAnalytique = async function(repartitions) {
    return await sequelize.models.RepartitionAnalytique.setRepartition(
      'tarif_cotisation',
      this.id,
      repartitions
    );
  };

  /**
   * Calcule les montants HT/TVA/TTC pour ce tarif
   * @param {number} montantBase - Montant de base (apres reduction eventuelle)
   * @returns {Promise<{montant_ht: number, montant_tva: number, montant_ttc: number, taux_tva: object|null}>}
   */
  TarifCotisation.prototype.calculerMontantsTVA = async function(montantBase) {
    const tauxTVA = await this.getTauxTVA();

    if (!tauxTVA || tauxTVA.exonere) {
      return {
        montant_ht: parseFloat(montantBase),
        montant_tva: 0,
        montant_ttc: parseFloat(montantBase),
        taux_tva: tauxTVA
      };
    }

    const ht = parseFloat(montantBase);
    const tva = tauxTVA.calculerMontantTVA(ht);
    const ttc = tauxTVA.calculerMontantTTC(ht);

    return {
      montant_ht: ht,
      montant_tva: tva,
      montant_ttc: ttc,
      taux_tva: tauxTVA
    };
  };

  return TarifCotisation
};
