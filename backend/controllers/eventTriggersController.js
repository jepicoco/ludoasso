const { EventTrigger, TemplateMessage } = require('../models');

/**
 * Récupère tous les déclencheurs d'événements
 */
exports.getAll = async (req, res) => {
  try {
    const { categorie } = req.query;

    const where = {};
    if (categorie) {
      where.categorie = categorie;
    }

    const triggers = await EventTrigger.findAll({
      where,
      order: [['ordre_affichage', 'ASC'], ['id', 'ASC']]
    });

    res.json({
      success: true,
      data: triggers
    });
  } catch (error) {
    console.error('Erreur récupération déclencheurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des déclencheurs'
    });
  }
};

/**
 * Récupère un déclencheur par ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const trigger = await EventTrigger.findByPk(id);

    if (!trigger) {
      return res.status(404).json({
        success: false,
        message: 'Déclencheur non trouvé'
      });
    }

    res.json({
      success: true,
      data: trigger
    });
  } catch (error) {
    console.error('Erreur récupération déclencheur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du déclencheur'
    });
  }
};

/**
 * Récupère un déclencheur par code
 */
exports.getByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const trigger = await EventTrigger.findByCode(code);

    if (!trigger) {
      return res.status(404).json({
        success: false,
        message: 'Déclencheur non trouvé'
      });
    }

    res.json({
      success: true,
      data: trigger
    });
  } catch (error) {
    console.error('Erreur récupération déclencheur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du déclencheur'
    });
  }
};

/**
 * Crée un nouveau déclencheur
 */
exports.create = async (req, res) => {
  try {
    const triggerData = req.body;

    // Validation
    if (!triggerData.code || !triggerData.libelle || !triggerData.categorie) {
      return res.status(400).json({
        success: false,
        message: 'Code, libellé et catégorie requis'
      });
    }

    const trigger = await EventTrigger.create(triggerData);

    res.status(201).json({
      success: true,
      message: 'Déclencheur créé avec succès',
      data: trigger
    });
  } catch (error) {
    console.error('Erreur création déclencheur:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Un déclencheur avec ce code existe déjà'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du déclencheur'
    });
  }
};

/**
 * Met à jour un déclencheur
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const trigger = await EventTrigger.findByPk(id);

    if (!trigger) {
      return res.status(404).json({
        success: false,
        message: 'Déclencheur non trouvé'
      });
    }

    await trigger.update(updateData);

    res.json({
      success: true,
      message: 'Déclencheur mis à jour avec succès',
      data: trigger
    });
  } catch (error) {
    console.error('Erreur mise à jour déclencheur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du déclencheur'
    });
  }
};

/**
 * Supprime un déclencheur
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const trigger = await EventTrigger.findByPk(id);

    if (!trigger) {
      return res.status(404).json({
        success: false,
        message: 'Déclencheur non trouvé'
      });
    }

    await trigger.destroy();

    res.json({
      success: true,
      message: 'Déclencheur supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression déclencheur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du déclencheur'
    });
  }
};

/**
 * Bascule l'activation de l'email
 */
exports.toggleEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const trigger = await EventTrigger.findByPk(id);

    if (!trigger) {
      return res.status(404).json({
        success: false,
        message: 'Déclencheur non trouvé'
      });
    }

    await trigger.toggleEmailActif();

    res.json({
      success: true,
      message: `Email ${trigger.email_actif ? 'activé' : 'désactivé'}`,
      data: trigger
    });
  } catch (error) {
    console.error('Erreur toggle email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification'
    });
  }
};

/**
 * Bascule l'activation du SMS
 */
exports.toggleSMS = async (req, res) => {
  try {
    const { id } = req.params;

    const trigger = await EventTrigger.findByPk(id);

    if (!trigger) {
      return res.status(404).json({
        success: false,
        message: 'Déclencheur non trouvé'
      });
    }

    await trigger.toggleSMSActif();

    res.json({
      success: true,
      message: `SMS ${trigger.sms_actif ? 'activé' : 'désactivé'}`,
      data: trigger
    });
  } catch (error) {
    console.error('Erreur toggle SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification'
    });
  }
};

/**
 * Récupère les templates disponibles pour un déclencheur
 */
exports.getAvailableTemplates = async (req, res) => {
  try {
    const { type } = req.query; // email ou sms

    const where = { actif: true };

    if (type === 'email') {
      where.type_message = ['email', 'both'];
    } else if (type === 'sms') {
      where.type_message = ['sms', 'both'];
    }

    const templates = await TemplateMessage.findAll({
      where,
      attributes: ['id', 'code', 'libelle', 'type_message', 'categorie'],
      order: [['ordre_affichage', 'ASC'], ['libelle', 'ASC']]
    });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Erreur récupération templates:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des templates'
    });
  }
};

/**
 * Récupère les statistiques des déclencheurs
 */
exports.getStats = async (req, res) => {
  try {
    const total = await EventTrigger.count();
    const emailActifs = await EventTrigger.count({ where: { email_actif: true } });
    const smsActifs = await EventTrigger.count({ where: { sms_actif: true } });

    const parCategorie = await EventTrigger.findAll({
      attributes: [
        'categorie',
        [EventTrigger.sequelize.fn('COUNT', EventTrigger.sequelize.col('id')), 'total'],
        [EventTrigger.sequelize.fn('SUM', EventTrigger.sequelize.literal('CASE WHEN email_actif = 1 THEN 1 ELSE 0 END')), 'email_actifs'],
        [EventTrigger.sequelize.fn('SUM', EventTrigger.sequelize.literal('CASE WHEN sms_actif = 1 THEN 1 ELSE 0 END')), 'sms_actifs']
      ],
      group: ['categorie'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        total,
        emailActifs,
        smsActifs,
        parCategorie
      }
    });
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};
