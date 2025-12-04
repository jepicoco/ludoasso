const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ArchiveAccessLog = sequelize.define('ArchiveAccessLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID de l\'utilisateur ayant accédé aux archives'
    },
    user_nom: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nom de l\'utilisateur (dénormalisé pour historique)'
    },
    user_prenom: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Prénom de l\'utilisateur (dénormalisé pour historique)'
    },
    user_role: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Rôle de l\'utilisateur au moment de l\'accès'
    },
    action: {
      type: DataTypes.ENUM('consultation_liste', 'consultation_fiche', 'archivage', 'anonymisation', 'archivage_masse', 'anonymisation_masse'),
      allowNull: false,
      comment: 'Type d\'action effectuée'
    },
    adherent_archive_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de l\'adhérent archivé consulté (null pour consultation_liste)'
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Détails supplémentaires (nombre d\'éléments pour actions de masse, etc.)'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'Adresse IP de l\'utilisateur'
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'User-Agent du navigateur'
    },
    date_acces: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'archives_access_logs',
    timestamps: false,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['date_acces']
      },
      {
        fields: ['action']
      }
    ]
  });

  return ArchiveAccessLog;
};
