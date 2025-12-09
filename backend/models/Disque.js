const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Disque = sequelize.define('Disque', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    nb_pistes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    duree_totale: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duree totale en minutes'
    },
    code_barre: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },
    ean: {
      type: DataTypes.STRING(13),
      allowNull: true,
      comment: 'Code-barres commercial EAN'
    },
    catalogue_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Numero de catalogue du label'
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    format_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'formats_disques',
        key: 'id'
      }
    },
    label_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'labels_disques',
        key: 'id'
      }
    },
    emplacement_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_disques',
        key: 'id'
      }
    },
    statut: {
      type: DataTypes.ENUM('disponible', 'emprunte', 'maintenance', 'perdu', 'archive'),
      defaultValue: 'disponible'
    },
    etat: {
      type: DataTypes.ENUM('neuf', 'tres_bon', 'bon', 'acceptable', 'mauvais'),
      defaultValue: 'bon'
    },
    date_acquisition: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    prix_indicatif: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    prix_achat: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    nb_emprunts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'disques',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (disque) => {
        if (!disque.code_barre) {
          const lastDisque = await Disque.findOne({
            order: [['id', 'DESC']]
          });
          const nextId = lastDisque ? lastDisque.id + 1 : 1;
          disque.code_barre = `DSQ${String(nextId).padStart(8, '0')}`;
        }
      },
      afterCreate: async (disque) => {
        if (disque.code_barre) {
          try {
            const codeBarreService = require('../services/codeBarreService');
            await codeBarreService.assignCode('disque', disque.code_barre, disque.id);
          } catch (err) {
            console.warn(`Avertissement assignation code-barre disque: ${err.message}`);
          }
        }
      }
    }
  });

  return Disque;
};
