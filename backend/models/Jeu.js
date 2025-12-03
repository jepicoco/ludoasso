const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Jeu = sequelize.define('Jeu', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code_barre: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
      comment: 'Format: JEU00000001'
    },
    titre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    editeur: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    auteur: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    annee_sortie: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1900,
        max: new Date().getFullYear() + 1
      }
    },
    age_min: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 99
      }
    },
    nb_joueurs_min: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    nb_joueurs_max: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    duree_partie: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Durée en minutes'
    },
    categorie: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Stratégie, Famille, Ambiance, Enfants, etc.'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    regles_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    statut: {
      type: DataTypes.ENUM('disponible', 'emprunte', 'maintenance', 'perdu'),
      allowNull: false,
      defaultValue: 'disponible'
    },
    emplacement: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Emplacement physique dans la ludothèque'
    },
    date_acquisition: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    prix_achat: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'jeux',
    timestamps: false,
    hooks: {
      afterCreate: async (jeu) => {
        // Generate barcode: JEU + 8-digit padded ID
        if (!jeu.code_barre) {
          const paddedId = String(jeu.id).padStart(8, '0');
          jeu.code_barre = `JEU${paddedId}`;
          await jeu.save();
        }
      }
    }
  });

  // Instance methods
  Jeu.prototype.estDisponible = function() {
    return this.statut === 'disponible';
  };

  Jeu.prototype.changerStatut = async function(nouveauStatut) {
    const statutsValides = ['disponible', 'emprunte', 'maintenance', 'perdu'];
    if (!statutsValides.includes(nouveauStatut)) {
      throw new Error(`Statut invalide: ${nouveauStatut}`);
    }
    this.statut = nouveauStatut;
    await this.save();
    return this;
  };

  return Jeu;
};
