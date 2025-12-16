const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define('Reservation', {
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
      onDelete: 'CASCADE'
    },
    jeu_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'jeux',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    livre_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'livres',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    film_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'films',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    cd_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'disques',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'prete', 'empruntee', 'expiree', 'annulee'),
      allowNull: false,
      defaultValue: 'en_attente',
      comment: 'Statut de la reservation'
    },
    position_queue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Position dans la file d attente'
    },
    date_creation: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date de creation de la reservation'
    },
    date_notification: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de notification (quand article disponible)'
    },
    date_expiration: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date limite de recuperation'
    },
    date_conversion: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de conversion en emprunt'
    },
    emprunt_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'emprunts',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK vers emprunts (apres conversion)'
    },
    commentaire: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Commentaire optionnel'
    },
    notifie: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Usager notifie de la disponibilite'
    },
    prolongations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Nombre de prolongations accordees'
    }
  }, {
    tableName: 'reservations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['utilisateur_id'] },
      { fields: ['jeu_id'] },
      { fields: ['livre_id'] },
      { fields: ['film_id'] },
      { fields: ['cd_id'] },
      { fields: ['statut'] },
      { fields: ['position_queue'] },
      { fields: ['date_expiration'] }
    ]
  });

  // ===== Instance Methods =====

  /**
   * Retourne le type d'article reserve
   * @returns {'jeu'|'livre'|'film'|'cd'|null}
   */
  Reservation.prototype.getItemType = function() {
    if (this.jeu_id) return 'jeu';
    if (this.livre_id) return 'livre';
    if (this.film_id) return 'film';
    if (this.cd_id) return 'cd';
    return null;
  };

  /**
   * Retourne l'ID de l'article reserve
   * @returns {number|null}
   */
  Reservation.prototype.getItemId = function() {
    return this.jeu_id || this.livre_id || this.film_id || this.cd_id;
  };

  /**
   * Retourne le nom du module correspondant au type d'article
   * @returns {'ludotheque'|'bibliotheque'|'filmotheque'|'discotheque'|null}
   */
  Reservation.prototype.getModule = function() {
    const itemType = this.getItemType();
    const moduleMap = {
      jeu: 'ludotheque',
      livre: 'bibliotheque',
      film: 'filmotheque',
      cd: 'discotheque'
    };
    return moduleMap[itemType] || null;
  };

  /**
   * Verifie si la reservation est expiree
   * @returns {boolean}
   */
  Reservation.prototype.estExpiree = function() {
    if (this.statut !== 'prete') {
      return false;
    }
    if (!this.date_expiration) {
      return false;
    }
    const maintenant = new Date();
    return maintenant > new Date(this.date_expiration);
  };

  /**
   * Calcule le nombre de jours avant expiration
   * @returns {number} Nombre de jours (negatif si deja expire)
   */
  Reservation.prototype.joursAvantExpiration = function() {
    if (!this.date_expiration) {
      return null;
    }
    const maintenant = new Date();
    const expiration = new Date(this.date_expiration);
    const diffTime = expiration - maintenant;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  /**
   * Passe la reservation en statut "prete" avec calcul de la date d'expiration
   * @param {number} joursExpiration - Nombre de jours avant expiration
   * @returns {Promise<Reservation>}
   */
  Reservation.prototype.marquerPrete = async function(joursExpiration = 15) {
    const maintenant = new Date();
    this.statut = 'prete';
    this.date_notification = maintenant;
    this.date_expiration = new Date(maintenant.getTime() + joursExpiration * 24 * 60 * 60 * 1000);
    await this.save();
    return this;
  };

  /**
   * Prolonge la reservation (ajoute des jours a la date d'expiration)
   * @param {number} jours - Nombre de jours a ajouter
   * @returns {Promise<Reservation>}
   */
  Reservation.prototype.prolonger = async function(jours = 15) {
    if (this.statut !== 'prete' && this.statut !== 'expiree') {
      throw new Error('Seule une reservation prete ou expiree peut etre prolongee');
    }

    const base = this.date_expiration ? new Date(this.date_expiration) : new Date();
    this.date_expiration = new Date(base.getTime() + jours * 24 * 60 * 60 * 1000);
    this.prolongations += 1;

    // Si elle etait expiree, la repasser en prete
    if (this.statut === 'expiree') {
      this.statut = 'prete';
    }

    await this.save();
    return this;
  };

  /**
   * Annule la reservation
   * @returns {Promise<Reservation>}
   */
  Reservation.prototype.annuler = async function() {
    if (this.statut === 'empruntee') {
      throw new Error('Une reservation deja convertie en emprunt ne peut pas etre annulee');
    }
    this.statut = 'annulee';
    await this.save();
    return this;
  };

  // ===== Class Methods =====

  /**
   * Met a jour les reservations expirees
   * @returns {Promise<number>} Nombre de reservations mises a jour
   */
  Reservation.updateExpiredReservations = async function() {
    const maintenant = new Date();
    const [affectedCount] = await Reservation.update(
      { statut: 'expiree' },
      {
        where: {
          statut: 'prete',
          date_expiration: {
            [sequelize.Sequelize.Op.lt]: maintenant
          }
        }
      }
    );
    return affectedCount;
  };

  /**
   * Recupere la prochaine reservation en file pour un article
   * @param {'jeu'|'livre'|'film'|'cd'} itemType - Type d'article
   * @param {number} itemId - ID de l'article
   * @returns {Promise<Reservation|null>}
   */
  Reservation.getNextInQueue = async function(itemType, itemId) {
    const foreignKey = `${itemType}_id`;

    return await Reservation.findOne({
      where: {
        [foreignKey]: itemId,
        statut: 'en_attente'
      },
      order: [['position_queue', 'ASC'], ['date_creation', 'ASC']],
      include: [
        {
          model: sequelize.models.Utilisateur,
          as: 'utilisateur'
        }
      ]
    });
  };

  /**
   * Compte le nombre de reservations en attente pour un article
   * @param {'jeu'|'livre'|'film'|'cd'} itemType - Type d'article
   * @param {number} itemId - ID de l'article
   * @returns {Promise<number>}
   */
  Reservation.countQueueForItem = async function(itemType, itemId) {
    const foreignKey = `${itemType}_id`;

    return await Reservation.count({
      where: {
        [foreignKey]: itemId,
        statut: 'en_attente'
      }
    });
  };

  /**
   * Calcule la prochaine position dans la file pour un article
   * @param {'jeu'|'livre'|'film'|'cd'} itemType - Type d'article
   * @param {number} itemId - ID de l'article
   * @returns {Promise<number>}
   */
  Reservation.getNextQueuePosition = async function(itemType, itemId) {
    const foreignKey = `${itemType}_id`;

    const maxPosition = await Reservation.max('position_queue', {
      where: {
        [foreignKey]: itemId,
        statut: { [sequelize.Sequelize.Op.in]: ['en_attente', 'prete'] }
      }
    });

    return (maxPosition || 0) + 1;
  };

  /**
   * Recherche une reservation active pour un utilisateur et un article
   * @param {number} utilisateurId - ID de l'utilisateur
   * @param {'jeu'|'livre'|'film'|'cd'} itemType - Type d'article
   * @param {number} itemId - ID de l'article
   * @returns {Promise<Reservation|null>}
   */
  Reservation.findActiveForUserAndItem = async function(utilisateurId, itemType, itemId) {
    const foreignKey = `${itemType}_id`;

    return await Reservation.findOne({
      where: {
        utilisateur_id: utilisateurId,
        [foreignKey]: itemId,
        statut: { [sequelize.Sequelize.Op.in]: ['en_attente', 'prete'] }
      }
    });
  };

  return Reservation;
};
