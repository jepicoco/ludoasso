const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TemplateMessage = sequelize.define('TemplateMessage', {
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
      comment: 'Code technique unique (ex: BIENVENUE, RAPPEL_ADHESION)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le libellé est requis'
        }
      },
      comment: 'Nom du template'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description du template'
    },
    type_message: {
      type: DataTypes.ENUM('email', 'sms', 'both'),
      allowNull: false,
      comment: 'Type de message supporté'
    },
    email_objet: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Sujet de l\'email'
    },
    email_corps: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Corps de l\'email (HTML)'
    },
    sms_corps: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 480],
          msg: 'Le SMS ne peut pas dépasser 480 caractères (3 SMS)'
        }
      },
      comment: 'Corps du SMS (max 480 chars)'
    },
    variables_disponibles: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Liste des variables disponibles (JSON stringifié)',
      get() {
        const rawValue = this.getDataValue('variables_disponibles');
        if (!rawValue) return null;
        try {
          return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        } catch (e) {
          return null;
        }
      },
      set(value) {
        if (value === null || value === undefined) {
          this.setDataValue('variables_disponibles', null);
        } else if (typeof value === 'string') {
          this.setDataValue('variables_disponibles', value);
        } else {
          this.setDataValue('variables_disponibles', JSON.stringify(value));
        }
      }
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Template actif'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage dans les listes'
    },
    categorie: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Catégorie (Adhérent, Cotisation, Emprunt, Système)'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'bi-file-text',
      comment: 'Icône Bootstrap Icons'
    },
    couleur: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'info',
      comment: 'Couleur Bootstrap'
    }
  }, {
    tableName: 'templates_messages',
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
        fields: ['actif']
      },
      {
        fields: ['type_message']
      },
      {
        fields: ['categorie']
      },
      {
        fields: ['ordre_affichage']
      }
    ],
    comment: 'Templates de messages pour emails et SMS',
    hooks: {
      beforeValidate: (template) => {
        // Forcer le code en majuscules
        if (template.code) {
          template.code = template.code.toUpperCase();
        }
      }
    }
  });

  // Méthodes d'instance

  /**
   * Compile le template email avec les données
   * @param {Object} data - Données pour remplacer les variables
   * @returns {Object} - {objet: string, corps: string}
   */
  TemplateMessage.prototype.compileEmail = function(data) {
    if (this.type_message !== 'email' && this.type_message !== 'both') {
      throw new Error('Ce template n\'est pas compatible avec l\'email');
    }

    if (!this.email_objet || !this.email_corps) {
      throw new Error('Template email incomplet (objet ou corps manquant)');
    }

    return {
      objet: this.replaceVariables(this.email_objet, data),
      corps: this.replaceVariables(this.email_corps, data)
    };
  };

  /**
   * Compile le template SMS avec les données
   * @param {Object} data - Données pour remplacer les variables
   * @returns {string} - Texte du SMS
   */
  TemplateMessage.prototype.compileSMS = function(data) {
    if (this.type_message !== 'sms' && this.type_message !== 'both') {
      throw new Error('Ce template n\'est pas compatible avec le SMS');
    }

    if (!this.sms_corps) {
      throw new Error('Template SMS incomplet (corps manquant)');
    }

    return this.replaceVariables(this.sms_corps, data);
  };

  /**
   * Remplace les variables dans un texte
   * @param {string} text - Texte avec variables {{variable}}
   * @param {Object} data - Données
   * @returns {string} - Texte avec variables remplacées
   */
  TemplateMessage.prototype.replaceVariables = function(text, data) {
    if (!text) return '';

    let result = text;

    // Remplacer toutes les variables {{variable}}
    const regex = /\{\{(\w+)\}\}/g;
    result = result.replace(regex, (match, variable) => {
      // Si la variable existe dans data, la remplacer
      if (data.hasOwnProperty(variable)) {
        return data[variable] !== null && data[variable] !== undefined ? String(data[variable]) : '';
      }
      // Sinon, laisser la variable telle quelle
      return match;
    });

    return result;
  };

  /**
   * Valide que toutes les variables requises sont présentes
   * @param {Object} data - Données
   * @returns {Object} - {valid: boolean, missing: Array}
   */
  TemplateMessage.prototype.validerVariables = function(data) {
    const variablesRequises = this.variables_disponibles || [];
    const missing = [];

    variablesRequises.forEach(variable => {
      if (!data.hasOwnProperty(variable) || data[variable] === null || data[variable] === undefined) {
        missing.push(variable);
      }
    });

    return {
      valid: missing.length === 0,
      missing
    };
  };

  /**
   * Bascule le statut actif
   * @returns {Promise<TemplateMessage>}
   */
  TemplateMessage.prototype.toggleActif = async function() {
    this.actif = !this.actif;
    await this.save();
    return this;
  };

  // Méthodes statiques

  /**
   * Obtient un template par code
   * @param {string} code - Code du template
   * @returns {Promise<TemplateMessage|null>}
   */
  TemplateMessage.findByCode = async function(code) {
    return await this.findOne({
      where: {
        code: code.toUpperCase(),
        actif: true
      }
    });
  };

  /**
   * Obtient les templates par type
   * @param {string} type - Type (email, sms, both)
   * @returns {Promise<Array<TemplateMessage>>}
   */
  TemplateMessage.getByType = async function(type) {
    const { Op } = require('sequelize');

    return await this.findAll({
      where: {
        actif: true,
        [Op.or]: [
          { type_message: type },
          { type_message: 'both' }
        ]
      },
      order: [['ordre_affichage', 'ASC'], ['id', 'ASC']]
    });
  };

  /**
   * Obtient les templates par catégorie
   * @param {string} categorie - Catégorie
   * @returns {Promise<Array<TemplateMessage>>}
   */
  TemplateMessage.getByCategorie = async function(categorie) {
    return await this.findAll({
      where: {
        actif: true,
        categorie
      },
      order: [['ordre_affichage', 'ASC'], ['id', 'ASC']]
    });
  };

  return TemplateMessage;
};
