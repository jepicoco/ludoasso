const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EventTrigger = sequelize.define('EventTrigger', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Le code est requis'
        },
        isUppercase: {
          msg: 'Le code doit être en majuscules'
        }
      },
      comment: 'Code technique unique (ex: ADHERENT_CREATED, EMPRUNT_CREATED)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le libellé est requis'
        }
      },
      comment: 'Nom de l\'événement'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description de l\'événement'
    },
    categorie: {
      type: DataTypes.ENUM('adherent', 'emprunt', 'cotisation', 'systeme'),
      allowNull: false,
      comment: 'Catégorie de l\'événement'
    },
    template_email_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Code du template email à utiliser'
    },
    template_sms_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Code du template SMS à utiliser'
    },
    email_actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Envoi d\'email activé pour cet événement'
    },
    sms_actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Envoi de SMS activé pour cet événement'
    },
    delai_envoi: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Délai en minutes avant envoi (0 = immédiat)'
    },
    condition_envoi: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Condition JSON pour l\'envoi (ex: adherent.actif = true)'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage dans les listes'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'bi-bell',
      comment: 'Icône Bootstrap Icons'
    },
    couleur: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'primary',
      comment: 'Couleur Bootstrap'
    }
  }, {
    tableName: 'event_triggers',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['code']
      },
      {
        fields: ['categorie']
      },
      {
        fields: ['email_actif']
      },
      {
        fields: ['sms_actif']
      },
      {
        fields: ['ordre_affichage']
      }
    ],
    comment: 'Configuration des déclencheurs d\'événements pour les communications',
    hooks: {
      beforeValidate: (trigger) => {
        // Forcer le code en majuscules
        if (trigger.code) {
          trigger.code = trigger.code.toUpperCase();
        }
      }
    }
  });

  // Méthodes d'instance

  /**
   * Vérifie si l'email doit être envoyé pour cet événement
   * @returns {boolean}
   */
  EventTrigger.prototype.shouldSendEmail = function() {
    return this.email_actif && this.template_email_code !== null;
  };

  /**
   * Vérifie si le SMS doit être envoyé pour cet événement
   * @returns {boolean}
   */
  EventTrigger.prototype.shouldSendSMS = function() {
    return this.sms_actif && this.template_sms_code !== null;
  };

  /**
   * Évalue la condition d'envoi
   * @param {Object} data - Données contextuelles
   * @returns {boolean}
   */
  EventTrigger.prototype.evaluateCondition = function(data) {
    if (!this.condition_envoi) {
      return true; // Pas de condition = toujours vrai
    }

    try {
      // Parse la condition JSON
      const condition = JSON.parse(this.condition_envoi);

      // Évaluation simple des conditions
      // Format attendu: { "field": "value", "operator": "eq|ne|gt|lt" }
      for (const [key, value] of Object.entries(condition)) {
        const actualValue = this.getNestedValue(data, key);

        if (typeof value === 'object' && value.operator) {
          if (!this.compareValues(actualValue, value.value, value.operator)) {
            return false;
          }
        } else {
          if (actualValue !== value) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Erreur évaluation condition:', error);
      return false;
    }
  };

  /**
   * Récupère une valeur imbriquée dans un objet
   * @param {Object} obj - Objet source
   * @param {string} path - Chemin (ex: "adherent.actif")
   * @returns {*}
   */
  EventTrigger.prototype.getNestedValue = function(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  /**
   * Compare deux valeurs selon un opérateur
   * @param {*} a - Valeur A
   * @param {*} b - Valeur B
   * @param {string} operator - Opérateur (eq, ne, gt, lt, gte, lte)
   * @returns {boolean}
   */
  EventTrigger.prototype.compareValues = function(a, b, operator) {
    switch (operator) {
      case 'eq': return a == b;
      case 'ne': return a != b;
      case 'gt': return a > b;
      case 'lt': return a < b;
      case 'gte': return a >= b;
      case 'lte': return a <= b;
      default: return false;
    }
  };

  /**
   * Bascule le statut email actif
   * @returns {Promise<EventTrigger>}
   */
  EventTrigger.prototype.toggleEmailActif = async function() {
    this.email_actif = !this.email_actif;
    await this.save();
    return this;
  };

  /**
   * Bascule le statut SMS actif
   * @returns {Promise<EventTrigger>}
   */
  EventTrigger.prototype.toggleSMSActif = async function() {
    this.sms_actif = !this.sms_actif;
    await this.save();
    return this;
  };

  // Méthodes statiques

  /**
   * Obtient un trigger par code
   * @param {string} code - Code du trigger
   * @returns {Promise<EventTrigger|null>}
   */
  EventTrigger.findByCode = async function(code) {
    return await this.findOne({
      where: {
        code: code.toUpperCase()
      }
    });
  };

  /**
   * Obtient les triggers par catégorie
   * @param {string} categorie - Catégorie
   * @returns {Promise<Array<EventTrigger>>}
   */
  EventTrigger.getByCategorie = async function(categorie) {
    return await this.findAll({
      where: {
        categorie
      },
      order: [['ordre_affichage', 'ASC'], ['id', 'ASC']]
    });
  };

  /**
   * Obtient tous les triggers actifs (email ou SMS)
   * @returns {Promise<Array<EventTrigger>>}
   */
  EventTrigger.getActifs = async function() {
    const { Op } = require('sequelize');

    return await this.findAll({
      where: {
        [Op.or]: [
          { email_actif: true },
          { sms_actif: true }
        ]
      },
      order: [['ordre_affichage', 'ASC'], ['id', 'ASC']]
    });
  };

  return EventTrigger;
};
