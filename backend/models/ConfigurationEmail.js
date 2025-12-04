const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConfigurationEmail = sequelize.define('ConfigurationEmail', {
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
      comment: 'Nom de la configuration email'
    },
    email_expediteur: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: {
          msg: 'L\'adresse email doit être valide'
        },
        notEmpty: {
          msg: 'L\'email expéditeur est requis'
        }
      },
      comment: 'Adresse email expéditeur'
    },
    nom_expediteur: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nom affiché pour l\'expéditeur'
    },
    smtp_host: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'L\'hôte SMTP est requis'
        }
      },
      comment: 'Hôte SMTP (ex: smtp.gmail.com)'
    },
    smtp_port: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 587,
      validate: {
        min: {
          args: [1],
          msg: 'Le port doit être supérieur à 0'
        },
        max: {
          args: [65535],
          msg: 'Le port doit être inférieur à 65536'
        }
      },
      comment: 'Port SMTP (25, 465, 587, 2525)'
    },
    smtp_secure: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Utiliser SSL/TLS (true pour port 465)'
    },
    smtp_user: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le nom d\'utilisateur SMTP est requis'
        }
      },
      comment: 'Nom d\'utilisateur SMTP'
    },
    smtp_password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le mot de passe SMTP est requis'
        }
      },
      comment: 'Mot de passe SMTP (chiffré)'
    },
    smtp_timeout: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 10000,
      comment: 'Timeout en millisecondes'
    },
    smtp_require_tls: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Forcer TLS'
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
      defaultValue: 'bi-envelope',
      comment: 'Icône Bootstrap Icons'
    },
    couleur: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'primary',
      comment: 'Couleur Bootstrap'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes internes'
    }
  }, {
    tableName: 'configurations_email',
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
    comment: 'Configurations email SMTP pour envoi d\'emails'
  });

  // Méthodes d'instance

  /**
   * Teste la connexion SMTP
   * @returns {Promise<Object>} - {success: boolean, message: string}
   */
  ConfigurationEmail.prototype.testerConnexion = async function() {
    const emailService = require('../services/emailService');
    return await emailService.testConfiguration(this);
  };

  /**
   * Envoie un email de test
   * @param {string} destinataire - Email du destinataire
   * @returns {Promise<Object>} - {success: boolean, messageId: string, error: string}
   */
  ConfigurationEmail.prototype.envoyerEmailTest = async function(destinataire) {
    const emailService = require('../services/emailService');
    return await emailService.sendEmail(this.id, {
      to: destinataire,
      subject: 'Test de configuration email',
      html: `
        <h1>Test réussi !</h1>
        <p>Cet email a été envoyé depuis la configuration <strong>${this.libelle}</strong>.</p>
        <p>Configuration:</p>
        <ul>
          <li>Hôte: ${this.smtp_host}</li>
          <li>Port: ${this.smtp_port}</li>
          <li>Sécurisé: ${this.smtp_secure ? 'Oui' : 'Non'}</li>
        </ul>
        <p><em>Ceci est un email de test automatique.</em></p>
      `,
      text: `Test réussi ! Cet email a été envoyé depuis la configuration ${this.libelle}.`
    });
  };

  /**
   * Bascule le statut actif
   * @returns {Promise<ConfigurationEmail>}
   */
  ConfigurationEmail.prototype.toggleActif = async function() {
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
   * @returns {Promise<ConfigurationEmail>}
   */
  ConfigurationEmail.prototype.setAsDefault = async function() {
    const { Op } = require('sequelize');

    // Retirer le par_defaut des autres configs
    await ConfigurationEmail.update(
      { par_defaut: false },
      { where: { id: { [Op.ne]: this.id } } }
    );

    // Définir celle-ci comme par défaut et l'activer si nécessaire
    this.par_defaut = true;
    if (!this.actif) {
      this.actif = true;
    }

    await this.save();
    return this;
  };

  // Méthodes statiques

  /**
   * Obtient les configurations actives pour un rôle
   * @param {string} userRole - Rôle de l'utilisateur
   * @returns {Promise<Array<ConfigurationEmail>>}
   */
  ConfigurationEmail.getForRole = async function(userRole) {
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
   * @returns {Promise<ConfigurationEmail|null>}
   */
  ConfigurationEmail.getDefault = async function() {
    return await this.findOne({
      where: {
        par_defaut: true,
        actif: true
      }
    });
  };

  return ConfigurationEmail;
};
