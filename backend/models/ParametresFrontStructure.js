/**
 * ParametresFrontStructure Model
 * Configuration frontend specifique par structure
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ParametresFrontStructure = sequelize.define('ParametresFrontStructure', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'structures',
        key: 'id'
      }
    },
    theme_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'default',
      comment: 'Theme a utiliser pour cette structure'
    },
    couleur_primaire: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: 'Couleur primaire hex ex: #007bff'
    },
    couleur_secondaire: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: 'Couleur secondaire hex'
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL du logo de la structure'
    },
    modules_visibles: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: ['catalogue', 'reservations', 'emprunts', 'prolongations'],
      comment: 'Modules visibles sur le frontend usager'
    },
    permettre_reservations: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Autoriser les reservations en ligne'
    },
    permettre_prolongations: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Autoriser les demandes de prolongation'
    },
    max_prolongations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Nombre max de prolongations par emprunt'
    },
    delai_prolongation_jours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 14,
      comment: 'Duree de prolongation en jours'
    },
    limite_emprunts_defaut: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Limite d\'emprunts simultanees par defaut'
    },
    limite_emprunts_par_collection: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Limites par collection ex: {"jeux":3,"livres":5}'
    },
    message_accueil: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Message d\'accueil sur le frontend'
    },
    conditions_utilisation: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Conditions d\'utilisation / reglement'
    },
    // Parametres nouveautes par module
    nouveaute_active_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Nouveautes activees pour la ludotheque'
    },
    nouveaute_duree_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      comment: 'Duree en jours pour ludotheque'
    },
    nouveaute_active_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Nouveautes activees pour la bibliotheque'
    },
    nouveaute_duree_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Duree en jours pour bibliotheque'
    },
    nouveaute_active_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Nouveautes activees pour la filmotheque'
    },
    nouveaute_duree_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 45,
      comment: 'Duree en jours pour filmotheque'
    },
    nouveaute_active_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Nouveautes activees pour la discotheque'
    },
    nouveaute_duree_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: 'Duree en jours pour discotheque'
    },

    // === Limites d'emprunt par module ===
    limite_emprunt_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Limite emprunts simultanes (ludotheque)'
    },
    limite_emprunt_nouveaute_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Limite emprunts nouveautes (ludotheque)'
    },
    limite_emprunt_bloquante_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limite bloquante (ludotheque)'
    },
    limite_emprunt_active_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limites emprunt actives (ludotheque)'
    },
    limite_emprunt_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Limite emprunts simultanes (bibliotheque)'
    },
    limite_emprunt_nouveaute_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Limite emprunts nouveautes (bibliotheque)'
    },
    limite_emprunt_bloquante_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limite bloquante (bibliotheque)'
    },
    limite_emprunt_active_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limites emprunt actives (bibliotheque)'
    },
    limite_emprunt_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Limite emprunts simultanes (filmotheque)'
    },
    limite_emprunt_nouveaute_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Limite emprunts nouveautes (filmotheque)'
    },
    limite_emprunt_bloquante_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limite bloquante (filmotheque)'
    },
    limite_emprunt_active_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limites emprunt actives (filmotheque)'
    },
    limite_emprunt_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Limite emprunts simultanes (discotheque)'
    },
    limite_emprunt_nouveaute_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Limite emprunts nouveautes (discotheque)'
    },
    limite_emprunt_bloquante_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limite bloquante (discotheque)'
    },
    limite_emprunt_active_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limites emprunt actives (discotheque)'
    },

    // === Limites de reservation par module ===
    limite_reservation_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Limite reservations actives (ludotheque)'
    },
    limite_reservation_nouveaute_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Limite reservations nouveautes (ludotheque)'
    },
    reservation_expiration_jours_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Jours pour recuperer (ludotheque)'
    },
    reservation_active_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Reservations actives (ludotheque)'
    },
    limite_reservation_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Limite reservations actives (bibliotheque)'
    },
    limite_reservation_nouveaute_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Limite reservations nouveautes (bibliotheque)'
    },
    reservation_expiration_jours_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Jours pour recuperer (bibliotheque)'
    },
    reservation_active_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Reservations actives (bibliotheque)'
    },
    limite_reservation_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Limite reservations actives (filmotheque)'
    },
    limite_reservation_nouveaute_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Limite reservations nouveautes (filmotheque)'
    },
    reservation_expiration_jours_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Jours pour recuperer (filmotheque)'
    },
    reservation_active_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Reservations actives (filmotheque)'
    },
    limite_reservation_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Limite reservations actives (discotheque)'
    },
    limite_reservation_nouveaute_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Limite reservations nouveautes (discotheque)'
    },
    reservation_expiration_jours_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Jours pour recuperer (discotheque)'
    },
    reservation_active_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Reservations actives (discotheque)'
    },

    // === Prolongations par module ===
    // Ludotheque
    prolongation_active_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Prolongations actives (ludotheque)'
    },
    prolongation_jours_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 14,
      comment: 'Jours par prolongation (ludotheque)'
    },
    prolongation_auto_max_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Prolongations auto max (ludotheque)'
    },
    prolongation_manuelle_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Demandes manuelles autorisees (ludotheque)'
    },
    prolongation_msg_reservation_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Avertissement reservation (ludotheque)'
    },
    // Bibliotheque
    prolongation_active_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Prolongations actives (bibliotheque)'
    },
    prolongation_jours_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 14,
      comment: 'Jours par prolongation (bibliotheque)'
    },
    prolongation_auto_max_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Prolongations auto max (bibliotheque)'
    },
    prolongation_manuelle_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Demandes manuelles autorisees (bibliotheque)'
    },
    prolongation_msg_reservation_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Avertissement reservation (bibliotheque)'
    },
    // Filmotheque
    prolongation_active_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Prolongations actives (filmotheque)'
    },
    prolongation_jours_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      comment: 'Jours par prolongation (filmotheque)'
    },
    prolongation_auto_max_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Prolongations auto max (filmotheque)'
    },
    prolongation_manuelle_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Demandes manuelles autorisees (filmotheque)'
    },
    prolongation_msg_reservation_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Avertissement reservation (filmotheque)'
    },
    // Discotheque
    prolongation_active_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Prolongations actives (discotheque)'
    },
    prolongation_jours_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      comment: 'Jours par prolongation (discotheque)'
    },
    prolongation_auto_max_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Prolongations auto max (discotheque)'
    },
    prolongation_manuelle_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Demandes manuelles autorisees (discotheque)'
    },
    prolongation_msg_reservation_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Avertissement reservation (discotheque)'
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'parametres_front_structure',
    timestamps: false,
    hooks: {
      beforeUpdate: (params) => {
        params.updated_at = new Date();
      }
    }
  });

  // Instance methods
  ParametresFrontStructure.prototype.hasModule = function(moduleCode) {
    if (!this.modules_visibles) return false;
    return this.modules_visibles.includes(moduleCode);
  };

  ParametresFrontStructure.prototype.getLimiteEmprunts = function(collection) {
    if (this.limite_emprunts_par_collection && this.limite_emprunts_par_collection[collection]) {
      return this.limite_emprunts_par_collection[collection];
    }
    return this.limite_emprunts_defaut;
  };

  return ParametresFrontStructure;
};
