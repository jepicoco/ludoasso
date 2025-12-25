const { DataTypes } = require('sequelize');

/**
 * Modèle MembreFoyer
 * Table de liaison entre Utilisateur et Foyer
 * Permet la garde partagée (un enfant peut appartenir à plusieurs foyers)
 */
module.exports = (sequelize) => {
  const MembreFoyer = sequelize.define('MembreFoyer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Membre du foyer'
    },
    foyer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Foyer auquel appartient le membre'
    },
    type_lien: {
      type: DataTypes.ENUM(
        'responsable', 'conjoint', 'enfant',
        'parent', 'beau_parent', 'autre_adulte'
      ),
      allowNull: false,
      defaultValue: 'enfant',
      comment: 'Rôle dans le foyer'
    },
    lien_parente: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Lien de parenté détaillé (fils, fille, belle-fille...)'
    },
    est_foyer_principal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Foyer principal (pour garde partagée)'
    },
    pourcentage_garde: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Pourcentage de garde (50%, 70%, etc.) - null = 100%'
    },
    jours_garde: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Configuration des jours de garde (ex: {"lundi": true, "mardi": true...})'
    },
    semaines_garde: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Configuration des semaines (ex: "paires", "impaires", "1,3" pour 1ère et 3ème)'
    },
    herite_adresse: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Hérite de l\'adresse du foyer'
    },
    herite_qf: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Hérite du QF du foyer'
    },
    date_debut: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de début dans ce foyer'
    },
    date_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de fin (si quitte le foyer)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes sur la garde/arrangement'
    }
  }, {
    tableName: 'membres_foyer',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['utilisateur_id', 'foyer_id'],
        name: 'idx_membres_foyer_unique'
      }
    ]
  });

  /**
   * Labels lisibles pour les types de lien
   */
  MembreFoyer.TYPE_LIEN_LABELS = {
    'responsable': 'Responsable',
    'conjoint': 'Conjoint(e)',
    'enfant': 'Enfant',
    'parent': 'Parent',
    'beau_parent': 'Beau-parent',
    'autre_adulte': 'Autre adulte'
  };

  /**
   * Labels lisibles pour les liens de parenté détaillés
   */
  MembreFoyer.LIEN_PARENTE_LABELS = {
    'fils': 'Fils',
    'fille': 'Fille',
    'beau_fils': 'Beau-fils',
    'belle_fille': 'Belle-fille',
    'petit_fils': 'Petit-fils',
    'petite_fille': 'Petite-fille',
    'pere': 'Père',
    'mere': 'Mère',
    'beau_pere': 'Beau-père',
    'belle_mere': 'Belle-mère',
    'grand_pere': 'Grand-père',
    'grand_mere': 'Grand-mère',
    'frere': 'Frère',
    'soeur': 'Sœur',
    'demi_frere': 'Demi-frère',
    'demi_soeur': 'Demi-sœur',
    'oncle': 'Oncle',
    'tante': 'Tante',
    'neveu': 'Neveu',
    'niece': 'Nièce',
    'cousin': 'Cousin',
    'cousine': 'Cousine',
    'tuteur': 'Tuteur',
    'tutrice': 'Tutrice',
    'conjoint': 'Conjoint(e)',
    'marie': 'Mari',
    'mariee': 'Femme (épouse)'
  };

  /**
   * Catégorisation des liens (adulte vs enfant)
   */
  MembreFoyer.LIENS_ADULTE = [
    'conjoint', 'marie', 'mariee',
    'pere', 'mere', 'beau_pere', 'belle_mere',
    'grand_pere', 'grand_mere',
    'oncle', 'tante', 'tuteur', 'tutrice'
  ];

  MembreFoyer.LIENS_ENFANT = [
    'fils', 'fille', 'beau_fils', 'belle_fille',
    'petit_fils', 'petite_fille',
    'neveu', 'niece', 'frere', 'soeur',
    'demi_frere', 'demi_soeur', 'cousin', 'cousine'
  ];

  /**
   * Détermine si c'est un lien adulte
   */
  MembreFoyer.prototype.estLienAdulte = function() {
    return MembreFoyer.LIENS_ADULTE.includes(this.lien_parente);
  };

  /**
   * Détermine si c'est un lien enfant
   */
  MembreFoyer.prototype.estLienEnfant = function() {
    return MembreFoyer.LIENS_ENFANT.includes(this.lien_parente) ||
           this.type_lien === 'enfant';
  };

  /**
   * Vérifie si c'est aujourd'hui un jour de garde
   */
  MembreFoyer.prototype.estJourGarde = function(date = new Date()) {
    // Si pas de configuration, c'est toujours un jour de garde
    if (!this.jours_garde && !this.semaines_garde) {
      return true;
    }

    const joursMap = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const jourActuel = joursMap[date.getDay()];

    // Vérifier les jours de garde
    if (this.jours_garde && !this.jours_garde[jourActuel]) {
      return false;
    }

    // Vérifier les semaines de garde
    if (this.semaines_garde) {
      const numeroSemaine = getWeekNumber(date);
      const semainePaire = numeroSemaine % 2 === 0;

      if (this.semaines_garde === 'paires' && !semainePaire) {
        return false;
      }
      if (this.semaines_garde === 'impaires' && semainePaire) {
        return false;
      }

      // Format "1,3" = 1ère et 3ème semaine du mois
      if (this.semaines_garde.match(/^\d(,\d)*$/)) {
        const semainesDuMois = this.semaines_garde.split(',').map(Number);
        const semaineDuMois = Math.ceil(date.getDate() / 7);
        if (!semainesDuMois.includes(semaineDuMois)) {
          return false;
        }
      }
    }

    return true;
  };

  /**
   * Obtient le libellé complet du lien
   */
  MembreFoyer.prototype.getLibelleLien = function() {
    if (this.lien_parente && MembreFoyer.LIEN_PARENTE_LABELS[this.lien_parente]) {
      return MembreFoyer.LIEN_PARENTE_LABELS[this.lien_parente];
    }
    return MembreFoyer.TYPE_LIEN_LABELS[this.type_lien] || this.type_lien;
  };

  return MembreFoyer;
};

/**
 * Calcule le numéro de semaine ISO
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
