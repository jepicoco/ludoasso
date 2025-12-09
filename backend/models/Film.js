const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Film = sequelize.define('Film', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code_barre: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true
    },
    ean: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true
    },
    titre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    titre_original: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    annee_sortie: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    duree: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Durée en minutes'
    },
    synopsis: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    support_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'supports_video',
        key: 'id'
      }
    },
    emplacement_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_films',
        key: 'id'
      }
    },
    classification: {
      type: DataTypes.ENUM('TP', '-10', '-12', '-16', '-18'),
      allowNull: true,
      defaultValue: 'TP',
      comment: 'Classification : Tout Public, -10, -12, -16, -18 ans'
    },
    prix_indicatif: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    prix_achat: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    date_acquisition: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    etat: {
      type: DataTypes.ENUM('neuf', 'tres_bon', 'bon', 'acceptable', 'mauvais'),
      allowNull: true,
      defaultValue: 'bon'
    },
    statut: {
      type: DataTypes.ENUM('disponible', 'emprunte', 'maintenance', 'perdu', 'archive'),
      allowNull: false,
      defaultValue: 'disponible'
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    bande_annonce_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    nb_emprunts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'films',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (film, options) => {
        if (!film.code_barre) {
          const maxId = await sequelize.models.Film.max('id') || 0;
          const nextId = maxId + 1;
          film.code_barre = `FLM${String(nextId).padStart(8, '0')}`;
        }
      },
      afterCreate: async (film) => {
        if (film.code_barre) {
          try {
            const codeBarreService = require('../services/codeBarreService');
            await codeBarreService.assignCode('film', film.code_barre, film.id);
          } catch (err) {
            console.warn(`Avertissement assignation code-barre film: ${err.message}`);
          }
        }
      }
    }
  });

  return Film;
};
