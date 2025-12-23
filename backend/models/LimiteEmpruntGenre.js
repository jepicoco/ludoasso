const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LimiteEmpruntGenre = sequelize.define('LimiteEmpruntGenre', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de la structure (null = global)',
      references: {
        model: 'structures',
        key: 'id'
      }
    },
    module: {
      type: DataTypes.ENUM('ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'),
      allowNull: false,
      comment: 'Module concerne'
    },
    genre_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID du genre (selon le module)'
    },
    genre_nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom du genre (cache pour affichage)'
    },
    limite_max: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      comment: 'Limite max pour ce genre'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'limites_emprunt_genre',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        name: 'idx_limite_emprunt_genre_unique',
        fields: ['structure_id', 'module', 'genre_id']
      }
    ]
  });

  return LimiteEmpruntGenre;
};
