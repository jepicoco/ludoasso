const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Livre = sequelize.define('Livre', {
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
    isbn: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true
    },
    titre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    sous_titre: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    tome: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    annee_publication: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    nb_pages: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    resume: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    format_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'formats_livres',
        key: 'id'
      }
    },
    collection_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'collections_livres',
        key: 'id'
      }
    },
    emplacement_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_livres',
        key: 'id'
      }
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
    nb_emprunts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'livres',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (livre, options) => {
        // Generer un code automatiquement si non fourni
        if (!livre.code_barre) {
          const maxId = await sequelize.models.Livre.max('id') || 0;
          const nextId = maxId + 1;
          livre.code_barre = `LIV${String(nextId).padStart(8, '0')}`;
        }
      },
      afterCreate: async (livre) => {
        // Marquer le code comme utilise dans la table des codes reserves
        if (livre.code_barre) {
          try {
            const codeBarreService = require('../services/codeBarreService');
            await codeBarreService.assignCode('livre', livre.code_barre, livre.id);
          } catch (err) {
            console.warn(`Avertissement assignation code-barre livre: ${err.message}`);
          }
        }
      }
    }
  });

  return Livre;
};
