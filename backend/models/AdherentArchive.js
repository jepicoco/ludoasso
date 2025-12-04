const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdherentArchive = sequelize.define('AdherentArchive', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ID original de l'adhérent (pour les liaisons avec emprunts, cotisations, etc.)
    adherent_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: 'ID original de l\'adhérent dans la table adherents'
    },
    // Données de l'adhérent au moment de l'archivage
    code_barre: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    civilite: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Conservé lors de l\'anonymisation'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Anonymisé en ***** après 3 ans'
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Anonymisé en ***** après 3 ans'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Anonymisé en ***** après 3 ans'
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Anonymisé en ***** après 3 ans'
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Anonymisé en ***** après 3 ans'
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Commune - Conservé lors de l\'anonymisation'
    },
    code_postal: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    date_naissance: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Conservé lors de l\'anonymisation'
    },
    date_adhesion: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    date_fin_adhesion: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    statut_avant_archivage: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Statut de l\'adhérent avant archivage'
    },
    photo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    adhesion_association: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    // Métadonnées d'archivage
    date_archivage: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date de l\'archivage'
    },
    archive_par: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de l\'utilisateur ayant effectué l\'archivage'
    },
    motif_archivage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Motif de l\'archivage (manuel, inactivité 3 ans, etc.)'
    },
    // Anonymisation
    est_anonymise: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indique si les données personnelles ont été anonymisées'
    },
    date_anonymisation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de l\'anonymisation'
    },
    anonymise_par: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de l\'utilisateur ayant effectué l\'anonymisation'
    },
    // Dernière activité
    derniere_activite: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de la dernière activité (emprunt ou cotisation)'
    }
  }, {
    tableName: 'adherents_archives',
    timestamps: false
  });

  // Méthode pour anonymiser les données personnelles
  AdherentArchive.prototype.anonymiser = async function(userId) {
    this.nom = '*****';
    this.prenom = '*****';
    this.email = '*****';
    this.telephone = '*****';
    this.adresse = '*****';
    this.code_postal = '*****';
    this.photo = null;
    this.est_anonymise = true;
    this.date_anonymisation = new Date();
    this.anonymise_par = userId;
    await this.save();
    return this;
  };

  return AdherentArchive;
};
