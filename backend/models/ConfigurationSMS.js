const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConfigurationSMS = sequelize.define('ConfigurationSMS', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Le libellé est requis'
        }
      },
      comment: 'Nom de la configuration SMS'
    },
    provider: {
      type: DataTypes.ENUM('smsfactor', 'brevo', 'twilio', 'ovh', 'autre'),
      allowNull: false,
      defaultValue: 'smsfactor',
      comment: 'Fournisseur SMS'
    },
    api_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'L\'URL de l\'API doit être une URL valide'
        }
      },
      comment: 'URL de base de l\'API SMS (ex: https://api.smsfactor.com)'
    },
    api_token: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le token API est requis'
        }
      },
      comment: 'Token API chiffré'
    },
    sender_name: {
      type: DataTypes.STRING(11),
      allowNull: true,
      validate: {
        len: {
          args: [1, 11],
          msg: 'Le nom d\'expéditeur doit faire entre 1 et 11 caractères'
        }
      },
      comment: 'Nom expéditeur (11 caractères max)'
    },
    gsm7: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Encodage GSM7'
    },
    sandbox: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Mode sandbox (test)'
    },
    role_minimum: {
      type: DataTypes.ENUM('gestionnaire', 'comptable', 'administrateur'),
      allowNull: false,
      defaultValue: 'gestionnaire',
      comment: 'Rôle minimum requis pour utiliser cette configuration'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Configuration active'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordre d\'affichage dans les listes'
    },
    par_defaut: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Configuration par défaut'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'bi-phone',
      comment: 'Icône Bootstrap Icons'
    },
    couleur: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'success',
      comment: 'Couleur Bootstrap'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes internes'
    },
    sms_envoyes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Nombre de SMS envoyés'
    },
    credits_restants: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Crédits restants'
    }
  }, {
    tableName: 'configurations_sms',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['actif']
      },
      {
        fields: ['ordre_affichage']
      },
      {
        fields: ['par_defaut']
      },
      {
        fields: ['role_minimum']
      }
    ],
    comment: 'Configurations SMS pour envoi de SMS via SMSFactor'
  });

  // Méthodes d'instance

  /**
   * Teste la connexion API
   * @returns {Promise<Object>} - {success: boolean, message: string, credits: number}
   */
  ConfigurationSMS.prototype.testerConnexion = async function() {
    const smsService = require('../utils/smsService');
    return await smsService.testConfiguration(this);
  };

  /**
   * Envoie un SMS de test
   * @param {string} numeroDestinataire - Numéro du destinataire (format +33...)
   * @returns {Promise<Object>} - {success: boolean, ticket: string, error: string}
   */
  ConfigurationSMS.prototype.envoyerSMSTest = async function(numeroDestinataire) {
    const smsService = require('../utils/smsService');
    return await smsService.sendSMS(this.id, {
      to: numeroDestinataire,
      text: `Test réussi ! Ce SMS a été envoyé depuis la configuration ${this.libelle}.`
    });
  };

  /**
   * Bascule le statut actif
   * @returns {Promise<ConfigurationSMS>}
   */
  ConfigurationSMS.prototype.toggleActif = async function() {
    this.actif = !this.actif;

    // Si on désactive et c'était par défaut, retirer le par_defaut
    if (!this.actif && this.par_defaut) {
      this.par_defaut = false;
    }

    await this.save();
    return this;
  };

  /**
   * Définit cette configuration comme par défaut
   * @returns {Promise<ConfigurationSMS>}
   */
  ConfigurationSMS.prototype.setAsDefault = async function() {
    const { Op } = require('sequelize');

    // Retirer le par_defaut des autres configs
    await ConfigurationSMS.update(
      { par_defaut: false },
      { where: { id: { [Op.ne]: this.id } } }
    );

    // Définir celle-ci comme par défaut et l'activer
    this.par_defaut = true;
    if (!this.actif) {
      this.actif = true;
    }

    await this.save();
    return this;
  };

  /**
   * Incrémente le compteur de SMS envoyés
   * @returns {Promise<ConfigurationSMS>}
   */
  ConfigurationSMS.prototype.incrementerCompteur = async function() {
    this.sms_envoyes += 1;
    await this.save();
    return this;
  };

  /**
   * Actualise les crédits restants
   * @returns {Promise<Object>}
   */
  ConfigurationSMS.prototype.actualiserCredits = async function() {
    const smsService = require('../utils/smsService');
    try {
      const result = await smsService.getCredits(this);
      this.credits_restants = result.credits || 0;
      await this.save();
      return {
        credits: result.credits,
        postpaid: result.postpaid,
        postpaid_limit: result.postpaid_limit,
        unlimited: result.unlimited
      };
    } catch (error) {
      console.error('Erreur lors de l\'actualisation des crédits:', error);
      throw error;
    }
  };

  // Méthodes statiques

  /**
   * Obtient les configurations actives pour un rôle
   * @param {string} userRole - Rôle de l'utilisateur
   * @returns {Promise<Array<ConfigurationSMS>>}
   */
  ConfigurationSMS.getForRole = async function(userRole) {
    const ROLE_HIERARCHY = {
      'usager': 0,
      'benevole': 1,
      'gestionnaire': 2,
      'comptable': 3,
      'administrateur': 4
    };

    const roleLevel = ROLE_HIERARCHY[userRole] || 0;
    const minRoleLevel = ROLE_HIERARCHY['gestionnaire'];

    // Si l'utilisateur n'a pas au moins le rôle gestionnaire, retourner vide
    if (roleLevel < minRoleLevel) {
      return [];
    }

    return await this.findAll({
      where: { actif: true },
      order: [['ordre_affichage', 'ASC'], ['id', 'ASC']]
    });
  };

  /**
   * Obtient la configuration par défaut
   * @returns {Promise<ConfigurationSMS|null>}
   */
  ConfigurationSMS.getDefault = async function() {
    return await this.findOne({
      where: {
        par_defaut: true,
        actif: true
      }
    });
  };

  return ConfigurationSMS;
};
