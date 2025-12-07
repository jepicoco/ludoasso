const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UtilisateurArchive = sequelize.define('UtilisateurArchive', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ID original de l'utilisateur (pour les liaisons avec emprunts, cotisations, etc.)
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: 'ID original de l\'utilisateur dans la table utilisateurs'
    },
    // Donnees de l'utilisateur au moment de l'archivage
    code_barre: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    civilite: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Conserve lors de l\'anonymisation'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Anonymise en ***** apres 3 ans'
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Anonymise en ***** apres 3 ans'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Anonymise en ***** apres 3 ans'
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Anonymise en ***** apres 3 ans'
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Anonymise en ***** apres 3 ans'
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Commune - Conserve lors de l\'anonymisation'
    },
    code_postal: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    date_naissance: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Conserve lors de l\'anonymisation'
    },
    date_adhesion: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    date_fin_adhesion: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    adhesion_association: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    statut_avant_archivage: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Statut de l\'utilisateur avant archivage'
    },
    photo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date_fin_adhesion_association: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de fin d\'adhesion a l\'association'
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    // Metadonnees d'archivage
    date_archivage: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date de l\'archivage'
    },
    archive_par: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de l\'utilisateur ayant effectue l\'archivage'
    },
    motif_archivage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Motif de l\'archivage (manuel, inactivite 3 ans, etc.)'
    },
    // Anonymisation
    est_anonymise: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indique si les donnees personnelles ont ete anonymisees'
    },
    date_anonymisation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de l\'anonymisation'
    },
    anonymise_par: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de l\'utilisateur ayant effectue l\'anonymisation'
    },
    // Derniere activite
    derniere_activite: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de la derniere activite (emprunt ou cotisation)'
    }
  }, {
    tableName: 'utilisateurs_archives',
    timestamps: false
  });

  // Methode pour anonymiser les donnees personnelles
  UtilisateurArchive.prototype.anonymiser = async function(userId) {
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

  return UtilisateurArchive;
};
