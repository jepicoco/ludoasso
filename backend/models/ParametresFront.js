const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ParametresFront = sequelize.define('ParametresFront', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // === Identite du site ===
    nom_site: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Ludotheque',
      comment: 'Nom du site affiche en public'
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL du logo principal'
    },
    favicon_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL du favicon'
    },

    // === SEO ===
    meta_description: {
      type: DataTypes.STRING(300),
      allowNull: true,
      comment: 'Meta description pour le referencement (max 160 caracteres recommande)'
    },
    meta_keywords: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Mots-cles separes par des virgules'
    },
    meta_author: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Auteur du site (meta author)'
    },
    og_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Image par defaut pour Open Graph (partage reseaux sociaux)'
    },
    google_analytics_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'ID Google Analytics (ex: G-XXXXXXXXXX)'
    },
    google_site_verification: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Code de verification Google Search Console'
    },
    robots_txt: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Contenu personnalise du fichier robots.txt'
    },

    // === Mode de fonctionnement ===
    mode_fonctionnement: {
      type: DataTypes.ENUM('catalogue', 'complet'),
      allowNull: false,
      defaultValue: 'complet',
      comment: 'catalogue = lecture seule, complet = gestion complete'
    },

    // === Modules actifs ===
    module_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Module jeux de societe actif'
    },
    module_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Module livres actif'
    },
    module_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Module films actif'
    },
    module_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Module disques/musique actif'
    },
    module_inscriptions: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Inscriptions en ligne actives'
    },
    module_reservations: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Reservations en ligne actives'
    },
    module_paiement_en_ligne: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Paiement en ligne actif'
    },
    module_recherche_ia: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Recherche intelligente IA activee sur le site usager'
    },
    module_plan_interactif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Plan interactif affiche sur le site public'
    },
    module_charte: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Validation de charte usager activee'
    },

    // === Pages legales ===
    cgv: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Conditions Generales de Vente (HTML)'
    },
    cgu: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Conditions Generales d\'Utilisation (HTML)'
    },
    politique_confidentialite: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Politique de confidentialite (HTML)'
    },
    mentions_legales: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Mentions legales (HTML)'
    },

    // === Contact ===
    email_contact: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      },
      comment: 'Email de contact public'
    },
    telephone_contact: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Telephone de contact public'
    },
    adresse_contact: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Adresse affichee sur le site'
    },

    // === Reseaux sociaux ===
    facebook_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    instagram_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    twitter_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    youtube_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    // === Personnalisation ===
    couleur_primaire: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#0d6efd',
      comment: 'Couleur primaire (hex)'
    },
    couleur_secondaire: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#6c757d',
      comment: 'Couleur secondaire (hex)'
    },
    css_personnalise: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'CSS personnalise injecte dans le site'
    },
    theme_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'DEPRECATED - Ancien ID du theme (FK themes_site)'
    },
    theme_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'default',
      comment: 'Code du theme actif (nom du dossier dans frontend/themes/)'
    },
    allow_theme_selection: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Autoriser selection theme par visiteurs'
    },

    // === Maintenance ===
    mode_maintenance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Site en mode maintenance'
    },
    maintenance_key: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'Cle aleatoire generee a chaque activation de la maintenance, utilisee pour valider les cookies de bypass'
    },
    message_maintenance: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Message affiche en mode maintenance'
    },
    autoriser_ip_locales: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Autoriser les IPs locales (127.x.x.x, 192.168.x.x) a outrepasser la maintenance'
    },

    // === Parametres de prolongation - Ludotheque ===
    prolongation_active_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Prolongations activees pour les jeux'
    },
    prolongation_jours_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 14,
      comment: 'Jours par prolongation (jeux)'
    },
    prolongation_auto_max_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Nb prolongations auto max (jeux)'
    },
    prolongation_manuelle_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Autoriser demande manuelle apres auto (jeux)'
    },
    prolongation_msg_reservation_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Afficher message si reserve (jeux)'
    },

    // === Parametres de prolongation - Bibliotheque ===
    prolongation_active_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Prolongations activees pour les livres'
    },
    prolongation_jours_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 14,
      comment: 'Jours par prolongation (livres)'
    },
    prolongation_auto_max_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Nb prolongations auto max (livres)'
    },
    prolongation_manuelle_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Autoriser demande manuelle apres auto (livres)'
    },
    prolongation_msg_reservation_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Afficher message si reserve (livres)'
    },

    // === Parametres de prolongation - Filmotheque ===
    prolongation_active_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Prolongations activees pour les films'
    },
    prolongation_jours_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      comment: 'Jours par prolongation (films)'
    },
    prolongation_auto_max_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Nb prolongations auto max (films)'
    },
    prolongation_manuelle_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Autoriser demande manuelle apres auto (films)'
    },
    prolongation_msg_reservation_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Afficher message si reserve (films)'
    },

    // === Parametres de prolongation - Discotheque ===
    prolongation_active_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Prolongations activees pour les disques'
    },
    prolongation_jours_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      comment: 'Jours par prolongation (disques)'
    },
    prolongation_auto_max_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Nb prolongations auto max (disques)'
    },
    prolongation_manuelle_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Autoriser demande manuelle apres auto (disques)'
    },
    prolongation_msg_reservation_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Afficher message si reserve (disques)'
    },

    // === Parametres Reservations par module ===
    // Ludotheque
    limite_reservation_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Limite de reservations actives (jeux)'
    },
    limite_reservation_nouveaute_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Limite reservations nouveautes (0=non reservable) (jeux)'
    },
    reservation_expiration_jours_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Jours pour recuperer apres notification (jeux)'
    },
    reservation_active_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Reservations actives (jeux)'
    },
    // Bibliotheque
    limite_reservation_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Limite de reservations actives (livres)'
    },
    limite_reservation_nouveaute_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Limite reservations nouveautes (0=non reservable) (livres)'
    },
    reservation_expiration_jours_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Jours pour recuperer apres notification (livres)'
    },
    reservation_active_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Reservations actives (livres)'
    },
    // Filmotheque
    limite_reservation_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Limite de reservations actives (films)'
    },
    limite_reservation_nouveaute_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Limite reservations nouveautes (0=non reservable) (films)'
    },
    reservation_expiration_jours_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Jours pour recuperer apres notification (films)'
    },
    reservation_active_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Reservations actives (films)'
    },
    // Discotheque
    limite_reservation_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Limite de reservations actives (disques)'
    },
    limite_reservation_nouveaute_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Limite reservations nouveautes (0=non reservable) (disques)'
    },
    reservation_expiration_jours_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Jours pour recuperer apres notification (disques)'
    },
    reservation_active_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Reservations actives (disques)'
    },

    // === Parametres TVA par module ===
    tva_assujetti: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Association assujettie a la TVA'
    },
    tva_numero: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Numero de TVA intracommunautaire (ex: FR12345678901)'
    },

    // TVA Cotisations
    cotisations_soumis_tva: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Cotisations soumises a TVA'
    },
    cotisations_taux_tva_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Taux TVA par defaut pour cotisations (FK taux_tva)'
    },

    // TVA Ludotheque
    ludotheque_soumis_tva: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Prestations ludotheque soumises a TVA'
    },
    ludotheque_taux_tva_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Taux TVA par defaut pour ludotheque (FK taux_tva)'
    },

    // TVA Bibliotheque
    bibliotheque_soumis_tva: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Prestations bibliotheque soumises a TVA'
    },
    bibliotheque_taux_tva_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Taux TVA par defaut pour bibliotheque (FK taux_tva)'
    },

    // TVA Filmotheque
    filmotheque_soumis_tva: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Prestations filmotheque soumises a TVA'
    },
    filmotheque_taux_tva_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Taux TVA par defaut pour filmotheque (FK taux_tva)'
    },

    // TVA Discotheque
    discotheque_soumis_tva: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Prestations discotheque soumises a TVA'
    },
    discotheque_taux_tva_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Taux TVA par defaut pour discotheque (FK taux_tva)'
    },

    // TVA Animations/Ateliers
    animations_soumis_tva: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Animations/ateliers soumis a TVA'
    },
    animations_taux_tva_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Taux TVA par defaut pour animations (FK taux_tva)'
    },

    // === Parametres de nouveaute par module ===
    nouveaute_duree_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      comment: 'Duree nouveaute jeux (jours)'
    },
    nouveaute_duree_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Duree nouveaute livres (jours)'
    },
    nouveaute_duree_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 45,
      comment: 'Duree nouveaute films (jours)'
    },
    nouveaute_duree_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: 'Duree nouveaute disques (jours)'
    },
    nouveaute_active_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Activer nouveautes jeux'
    },
    nouveaute_active_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Activer nouveautes livres'
    },
    nouveaute_active_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Activer nouveautes films'
    },
    nouveaute_active_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Activer nouveautes disques'
    },

    // === Limites d'emprunt - Ludotheque ===
    limite_emprunt_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Limite generale emprunts simultanes (jeux)'
    },
    limite_emprunt_nouveaute_ludotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Limite emprunts nouveautes (jeux)'
    },
    limite_emprunt_bloquante_ludotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limite bloquante (jeux) - si false, affiche un warning'
    },

    // === Limites d'emprunt - Bibliotheque ===
    limite_emprunt_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Limite generale emprunts simultanes (livres)'
    },
    limite_emprunt_nouveaute_bibliotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Limite emprunts nouveautes (livres)'
    },
    limite_emprunt_bloquante_bibliotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limite bloquante (livres) - si false, affiche un warning'
    },

    // === Limites d'emprunt - Filmotheque ===
    limite_emprunt_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Limite generale emprunts simultanes (films)'
    },
    limite_emprunt_nouveaute_filmotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Limite emprunts nouveautes (films)'
    },
    limite_emprunt_bloquante_filmotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limite bloquante (films) - si false, affiche un warning'
    },

    // === Limites d'emprunt - Discotheque ===
    limite_emprunt_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Limite generale emprunts simultanes (disques)'
    },
    limite_emprunt_nouveaute_discotheque: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Limite emprunts nouveautes (disques)'
    },
    limite_emprunt_bloquante_discotheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Limite bloquante (disques) - si false, affiche un warning'
    },

    // === Parametres validation charte usager ===
    charte_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Systeme de charte usager actif'
    },
    charte_grace_jours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      comment: 'Periode de grace en jours avant blocage des emprunts'
    },
    charte_otp_email: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Autoriser validation par email'
    },
    charte_otp_email_config_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de la configuration email a utiliser pour OTP (null = defaut)'
    },
    charte_otp_sms: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Autoriser validation par SMS'
    },
    charte_otp_sms_config_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de la configuration SMS a utiliser pour OTP (null = defaut)'
    },
    charte_otp_preference: {
      type: DataTypes.ENUM('email', 'sms', 'choix_usager'),
      allowNull: false,
      defaultValue: 'email',
      comment: 'Preference par defaut pour envoi OTP'
    }
  }, {
    tableName: 'parametres_front',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Methode statique pour recuperer les parametres (il n'y a qu'une seule ligne)
  ParametresFront.getParametres = async function() {
    let params = await this.findOne();
    if (!params) {
      // Creer les parametres par defaut
      params = await this.create({});
    }
    return params;
  };

  // Methode pour obtenir les donnees publiques (sans infos sensibles)
  ParametresFront.prototype.toPublicJSON = function() {
    return {
      nom_site: this.nom_site,
      logo_url: this.logo_url,
      favicon_url: this.favicon_url,
      meta_description: this.meta_description,
      meta_keywords: this.meta_keywords,
      meta_author: this.meta_author,
      og_image_url: this.og_image_url,
      mode_fonctionnement: this.mode_fonctionnement,
      module_ludotheque: this.module_ludotheque,
      module_bibliotheque: this.module_bibliotheque,
      module_filmotheque: this.module_filmotheque,
      module_discotheque: this.module_discotheque,
      module_inscriptions: this.module_inscriptions,
      module_reservations: this.module_reservations,
      module_paiement_en_ligne: this.module_paiement_en_ligne,
      module_recherche_ia: this.module_recherche_ia,
      module_plan_interactif: this.module_plan_interactif,
      module_charte: this.module_charte,
      email_contact: this.email_contact,
      telephone_contact: this.telephone_contact,
      adresse_contact: this.adresse_contact,
      facebook_url: this.facebook_url,
      instagram_url: this.instagram_url,
      twitter_url: this.twitter_url,
      youtube_url: this.youtube_url,
      couleur_primaire: this.couleur_primaire,
      couleur_secondaire: this.couleur_secondaire,
      mode_maintenance: this.mode_maintenance,
      message_maintenance: this.message_maintenance
    };
  };

  return ParametresFront;
};
