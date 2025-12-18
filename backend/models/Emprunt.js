const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Emprunt = sequelize.define('Emprunt', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    jeu_id: {
      type: DataTypes.INTEGER,
      allowNull: true,  // Changé en nullable pour permettre emprunts d'autres types
      references: {
        model: 'jeux',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    livre_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'livres',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    film_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'films',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    cd_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'disques',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    // Champs pour lier aux exemplaires (systeme multi-exemplaires)
    exemplaire_jeu_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'exemplaires_jeux',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK vers exemplaire specifique du jeu emprunte'
    },
    exemplaire_livre_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'exemplaires_livres',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK vers exemplaire specifique du livre emprunte'
    },
    exemplaire_film_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'exemplaires_films',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK vers exemplaire specifique du film emprunte'
    },
    exemplaire_disque_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'exemplaires_disques',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK vers exemplaire specifique du disque emprunte'
    },
    date_emprunt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    date_retour_prevue: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterEmprunt(value) {
          if (value <= this.date_emprunt) {
            throw new Error('La date de retour prévue doit être après la date d\'emprunt');
          }
        }
      }
    },
    date_retour_effective: {
      type: DataTypes.DATE,
      allowNull: true
    },
    statut: {
      type: DataTypes.ENUM('en_cours', 'retourne', 'en_retard'),
      allowNull: false,
      defaultValue: 'en_cours'
    },
    commentaire: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nb_prolongations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Nombre de prolongations effectuees'
    },
    date_retour_initiale: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de retour initiale avant prolongations'
    }
  }, {
    tableName: 'emprunts',
    timestamps: false,
    indexes: [
      {
        fields: ['utilisateur_id']
      },
      {
        fields: ['jeu_id']
      },
      {
        fields: ['livre_id']
      },
      {
        fields: ['film_id']
      },
      {
        fields: ['cd_id']
      },
      {
        fields: ['exemplaire_jeu_id']
      },
      {
        fields: ['exemplaire_livre_id']
      },
      {
        fields: ['exemplaire_film_id']
      },
      {
        fields: ['exemplaire_disque_id']
      },
      {
        fields: ['statut']
      },
      {
        fields: ['date_retour_prevue']
      }
    ]
  });

  // Instance methods
  Emprunt.prototype.estEnRetard = function() {
    if (this.statut === 'retourne') {
      return false;
    }
    const maintenant = new Date();
    return maintenant > new Date(this.date_retour_prevue);
  };

  Emprunt.prototype.joursDeRetard = function() {
    if (!this.estEnRetard()) {
      return 0;
    }
    const maintenant = new Date();
    const retourPrevu = new Date(this.date_retour_prevue);
    const diffTime = Math.abs(maintenant - retourPrevu);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  Emprunt.prototype.retourner = async function() {
    this.date_retour_effective = new Date();
    this.statut = 'retourne';
    await this.save();

    // Update item status to available based on type
    if (this.jeu_id) {
      const jeu = await sequelize.models.Jeu.findByPk(this.jeu_id);
      if (jeu) {
        await jeu.changerStatut('disponible');
      }
    } else if (this.livre_id) {
      const livre = await sequelize.models.Livre.findByPk(this.livre_id);
      if (livre) {
        livre.statut = 'disponible';
        await livre.save();
      }
    } else if (this.film_id && sequelize.models.Film) {
      const film = await sequelize.models.Film.findByPk(this.film_id);
      if (film) {
        film.statut = 'disponible';
        await film.save();
      }
    } else if (this.cd_id && sequelize.models.Cd) {
      const cd = await sequelize.models.Cd.findByPk(this.cd_id);
      if (cd) {
        cd.statut = 'disponible';
        await cd.save();
      }
    }

    return this;
  };

  // Helper pour obtenir le type d'item emprunté
  Emprunt.prototype.getItemType = function() {
    if (this.jeu_id) return 'jeu';
    if (this.livre_id) return 'livre';
    if (this.film_id) return 'film';
    if (this.cd_id) return 'cd';
    return null;
  };

  // Helper pour obtenir l'ID de l'item emprunté
  Emprunt.prototype.getItemId = function() {
    return this.jeu_id || this.livre_id || this.film_id || this.cd_id;
  };

  // Helper pour obtenir l'ID de l'exemplaire emprunté
  Emprunt.prototype.getExemplaireId = function() {
    return this.exemplaire_jeu_id || this.exemplaire_livre_id || this.exemplaire_film_id || this.exemplaire_disque_id;
  };

  // Helper pour savoir si l'emprunt utilise le systeme d'exemplaires
  Emprunt.prototype.hasExemplaire = function() {
    return !!(this.exemplaire_jeu_id || this.exemplaire_livre_id || this.exemplaire_film_id || this.exemplaire_disque_id);
  };

  // Class method to update overdue loans
  Emprunt.updateOverdueLoans = async function() {
    const maintenant = new Date();
    await Emprunt.update(
      { statut: 'en_retard' },
      {
        where: {
          statut: 'en_cours',
          date_retour_prevue: {
            [sequelize.Sequelize.Op.lt]: maintenant
          }
        }
      }
    );
  };

  return Emprunt;
};
