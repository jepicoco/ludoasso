const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SmsLog = sequelize.define('SmsLog', {
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
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Numéro de téléphone du destinataire'
    },
    destinataire_nom: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nom du destinataire'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Contenu du SMS'
    },
    nb_segments: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Nombre de segments SMS (160 chars par segment)'
    },
    statut: {
      type: DataTypes.ENUM('envoye', 'erreur', 'en_attente', 'delivre', 'echec_livraison'),
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
    date_livraison: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de livraison confirmée'
    },
    message_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ID du message retourné par le provider SMS'
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Nom du provider SMS utilisé (Brevo, Twilio, etc.)'
    },
    cout: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      comment: 'Coût estimé du SMS'
    },
    erreur_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Code d\'erreur si échec'
    },
    erreur_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Message d\'erreur si échec'
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      comment: 'ID de l\'utilisateur concerne'
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
      comment: 'Données supplémentaires (variables utilisées, réponse API, etc.)'
    }
  }, {
    tableName: 'sms_logs',
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
        fields: ['utilisateur_id']
      },
      {
        fields: ['provider']
      }
    ]
  });

  // Méthodes d'instance
  SmsLog.prototype.estEnvoye = function() {
    return this.statut === 'envoye' || this.statut === 'delivre';
  };

  SmsLog.prototype.estEnErreur = function() {
    return this.statut === 'erreur' || this.statut === 'echec_livraison';
  };

  // Méthodes de classe
  SmsLog.getStatistiques = async function(dateDebut = null, dateFin = null) {
    const where = {};

    if (dateDebut && dateFin) {
      where.date_envoi = {
        [sequelize.Sequelize.Op.between]: [dateDebut, dateFin]
      };
    }

    const [total, envoyes, delivres, erreurs] = await Promise.all([
      this.count({ where }),
      this.count({ where: { ...where, statut: 'envoye' } }),
      this.count({ where: { ...where, statut: 'delivre' } }),
      this.count({ where: { ...where, statut: { [sequelize.Sequelize.Op.in]: ['erreur', 'echec_livraison'] } } })
    ]);

    return {
      total,
      envoyes,
      delivres,
      erreurs,
      tauxReussite: total > 0 ? (((envoyes + delivres) / total) * 100).toFixed(2) : 0
    };
  };

  SmsLog.getParTemplate = async function(limit = 10) {
    const results = await this.findAll({
      attributes: [
        'template_code',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN statut IN ("envoye", "delivre") THEN 1 ELSE 0 END')), 'envoyes'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN statut IN ("erreur", "echec_livraison") THEN 1 ELSE 0 END')), 'erreurs']
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

  SmsLog.getCoutTotal = async function(dateDebut = null, dateFin = null) {
    const where = {
      cout: {
        [sequelize.Sequelize.Op.ne]: null
      }
    };

    if (dateDebut && dateFin) {
      where.date_envoi = {
        [sequelize.Sequelize.Op.between]: [dateDebut, dateFin]
      };
    }

    const result = await this.sum('cout', { where });
    return result || 0;
  };

  return SmsLog;
};
