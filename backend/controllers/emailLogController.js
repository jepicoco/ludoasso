const { EmailLog, Utilisateur } = require('../models');
const { Op } = require('sequelize');

/**
 * Récupérer tous les logs d'emails
 */
exports.getAllEmailLogs = async (req, res) => {
  try {
    const {
      statut,
      template_code,
      adherent_id,
      destinataire,
      date_debut,
      date_fin,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (statut) {
      where.statut = statut;
    }

    if (template_code) {
      where.template_code = template_code;
    }

    if (adherent_id) {
      where.adherent_id = adherent_id;
    }

    // Filtre par destinataire (email ou nom)
    if (destinataire) {
      where[Op.or] = [
        { destinataire: { [Op.like]: `%${destinataire}%` } },
        { destinataire_nom: { [Op.like]: `%${destinataire}%` } }
      ];
    }

    if (date_debut && date_fin) {
      where.date_envoi = {
        [Op.between]: [new Date(date_debut), new Date(date_fin)]
      };
    } else if (date_debut) {
      where.date_envoi = {
        [Op.gte]: new Date(date_debut)
      };
    } else if (date_fin) {
      where.date_envoi = {
        [Op.lte]: new Date(date_fin)
      };
    }

    const { count, rows } = await EmailLog.findAndCountAll({
      where,
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur',
          attributes: ['id', 'nom', 'prenom', 'email'],
          required: false
        }
      ],
      order: [['date_envoi', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const logsWithAlias = rows.map(e => {
      const data = e.toJSON();
      data.adherent = data.utilisateur;
      return data;
    });

    res.json({
      emailLogs: logsWithAlias,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération logs emails:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Récupérer un log d'email par ID
 */
exports.getEmailLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const emailLog = await EmailLog.findByPk(id, {
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur',
          attributes: ['id', 'nom', 'prenom', 'email']
        }
      ]
    });

    if (!emailLog) {
      return res.status(404).json({
        error: 'Log non trouvé'
      });
    }

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = emailLog.toJSON();
    data.adherent = data.utilisateur;

    res.json(data);
  } catch (error) {
    console.error('Erreur récupération log email:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Récupérer les statistiques des emails
 */
exports.getEmailStatistics = async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;

    const dateDebut = date_debut ? new Date(date_debut) : null;
    const dateFin = date_fin ? new Date(date_fin) : null;

    // Statistiques générales
    const stats = await EmailLog.getStatistiques(dateDebut, dateFin);

    // Statistiques par template
    const parTemplate = await EmailLog.getParTemplate(10);

    // Statistiques par jour (7 derniers jours)
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const parJour = await EmailLog.findAll({
      attributes: [
        [EmailLog.sequelize.fn('DATE', EmailLog.sequelize.col('date_envoi')), 'jour'],
        [EmailLog.sequelize.fn('COUNT', EmailLog.sequelize.col('id')), 'total'],
        [EmailLog.sequelize.fn('SUM', EmailLog.sequelize.literal('CASE WHEN statut = "envoye" THEN 1 ELSE 0 END')), 'envoyes'],
        [EmailLog.sequelize.fn('SUM', EmailLog.sequelize.literal('CASE WHEN statut = "erreur" THEN 1 ELSE 0 END')), 'erreurs']
      ],
      where: {
        date_envoi: {
          [Op.between]: [sevenDaysAgo, now]
        }
      },
      group: [EmailLog.sequelize.fn('DATE', EmailLog.sequelize.col('date_envoi'))],
      order: [[EmailLog.sequelize.fn('DATE', EmailLog.sequelize.col('date_envoi')), 'ASC']],
      raw: true
    });

    res.json({
      statistiquesGenerales: stats,
      parTemplate,
      parJour
    });
  } catch (error) {
    console.error('Erreur récupération statistiques emails:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Supprimer les anciens logs d'emails
 */
exports.purgeOldLogs = async (req, res) => {
  try {
    const { jours = 90 } = req.body;

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(jours));

    const count = await EmailLog.destroy({
      where: {
        date_envoi: {
          [Op.lt]: dateLimit
        }
      }
    });

    res.json({
      message: `${count} log(s) supprimé(s)`,
      count
    });
  } catch (error) {
    console.error('Erreur purge logs emails:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Obtenir la liste des templates utilisés
 */
exports.getTemplatesList = async (req, res) => {
  try {
    const templates = await EmailLog.findAll({
      attributes: [
        'template_code',
        [EmailLog.sequelize.fn('COUNT', EmailLog.sequelize.col('id')), 'total']
      ],
      where: {
        template_code: {
          [Op.ne]: null
        }
      },
      group: ['template_code'],
      order: [[EmailLog.sequelize.fn('COUNT', EmailLog.sequelize.col('id')), 'DESC']],
      raw: true
    });

    res.json(templates);
  } catch (error) {
    console.error('Erreur récupération liste templates:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};
