const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LeaderboardScore = sequelize.define('LeaderboardScore', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pseudo: {
      type: DataTypes.STRING(5),
      allowNull: false,
      validate: {
        len: [1, 5],
        isAlphanumeric: true
      },
      comment: 'Pseudo arcade style (5 lettres max)'
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Score total'
    },
    temps_secondes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Duree de la partie en secondes'
    },
    vies_restantes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Nombre de vies restantes a la fin'
    },
    niveau_vitesse: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Niveau de vitesse atteint'
    },
    friandises_attrapees: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Nombre total de friandises attrapees'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'Adresse IP du joueur (IPv4 ou IPv6)'
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'User agent du navigateur'
    },
    game_version: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '1.0',
      comment: 'Version du jeu'
    }
  }, {
    tableName: 'leaderboard_scores',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        name: 'idx_leaderboard_score',
        fields: [{ name: 'score', order: 'DESC' }]
      },
      {
        name: 'idx_leaderboard_created',
        fields: [{ name: 'created_at', order: 'DESC' }]
      }
    ]
  });

  return LeaderboardScore;
};
