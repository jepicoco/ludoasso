const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmailLog = sequelize.define('EmailLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    template_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Code du template utilisé'
    },
    destinataire: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Email du destinataire'
    },
    destinataire_nom: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nom du destinataire'
    },
    objet: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Objet de l\'email'
    },
    corps: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Corps de l\'email (HTML)'
    },
    statut: {
      type: DataTypes.ENUM('envoye', 'erreur', 'en_attente'),
      allowNull: false,
      defaultValue: 'en_attente',
      comment: 'Statut de l\'envoi'
    },
    date_envoi: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date d\'envoi'
    },
    message_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ID du message retourné par le serveur SMTP'
    },
    erreur_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Message d\'erreur si échec'
    },
    adherent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'adherents',
        key: 'id'
      },
      comment: 'ID de l\'adhérent concerné'
    },
    emprunt_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de l\'emprunt concerné'
    },
    cotisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de la cotisation concernée'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Données supplémentaires (variables utilisées, etc.)'
    }
  }, {
    tableName: 'email_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['template_code']
      },
      {
        fields: ['destinataire']
      },
      {
        fields: ['statut']
      },
      {
        fields: ['date_envoi']
      },
      {
        fields: ['adherent_id']
      }
    ]
  });

  // Méthodes d'instance
  EmailLog.prototype.estEnvoye = function() {
    return this.statut === 'envoye';
  };

  EmailLog.prototype.estEnErreur = function() {
    return this.statut === 'erreur';
  };

  // Méthodes de classe
  EmailLog.getStatistiques = async function(dateDebut = null, dateFin = null) {
    const where = {};

    if (dateDebut && dateFin) {
      where.date_envoi = {
        [sequelize.Sequelize.Op.between]: [dateDebut, dateFin]
      };
    }

    const [total, envoyes, erreurs] = await Promise.all([
      this.count({ where }),
      this.count({ where: { ...where, statut: 'envoye' } }),
      this.count({ where: { ...where, statut: 'erreur' } })
    ]);

    return {
      total,
      envoyes,
      erreurs,
      tauxReussite: total > 0 ? ((envoyes / total) * 100).toFixed(2) : 0
    };
  };

  EmailLog.getParTemplate = async function(limit = 10) {
    const results = await this.findAll({
      attributes: [
        'template_code',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN statut = "envoye" THEN 1 ELSE 0 END')), 'envoyes'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN statut = "erreur" THEN 1 ELSE 0 END')), 'erreurs']
      ],
      where: {
        template_code: {
          [sequelize.Sequelize.Op.ne]: null
        }
      },
      group: ['template_code'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit,
      raw: true
    });

    return results;
  };

  return EmailLog;
};
