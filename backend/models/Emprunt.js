const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Emprunt = sequelize.define('Emprunt', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    adherent_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'adherents',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    jeu_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'jeux',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
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
    }
  }, {
    tableName: 'emprunts',
    timestamps: false,
    indexes: [
      {
        fields: ['adherent_id']
      },
      {
        fields: ['jeu_id']
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

    // Update game status to available
    const jeu = await sequelize.models.Jeu.findByPk(this.jeu_id);
    if (jeu) {
      await jeu.changerStatut('disponible');
    }

    return this;
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
