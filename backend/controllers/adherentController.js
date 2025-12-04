const { Adherent, Emprunt, Jeu } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');
const eventTriggerService = require('../services/eventTriggerService');

/**
 * Get all adherents with optional filters
 * GET /api/adherents?statut=actif&search=dupont
 */
const getAllAdherents = async (req, res) => {
  try {
    const { statut, search, role, adhesion_association, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (statut) {
      where.statut = statut;
    }

    if (role) {
      where.role = role;
    }

    if (adhesion_association !== undefined) {
      where.adhesion_association = adhesion_association === 'true';
    }

    if (search) {
      where[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { prenom: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { code_barre: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Adherent.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nom', 'ASC'], ['prenom', 'ASC']],
      attributes: { exclude: ['password'] } // Ne pas retourner le mot de passe
    });

    res.json({
      adherents: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get adherents error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get adherent by ID with emprunts
 * GET /api/adherents/:id
 */
const getAdherentById = async (req, res) => {
  try {
    const { id } = req.params;

    const adherent = await Adherent.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Emprunt,
        as: 'emprunts',
        include: [{
          model: Jeu,
          as: 'jeu'
        }],
        order: [['date_emprunt', 'DESC']]
      }]
    });

    if (!adherent) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Adherent not found'
      });
    }

    res.json({ adherent });
  } catch (error) {
    console.error('Get adherent error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Create new adherent
 * POST /api/adherents
 */
const createAdherent = async (req, res) => {
  try {
    const {
      nom, prenom, email, password, telephone,
      adresse, ville, code_postal, date_naissance,
      date_adhesion, date_fin_adhesion, statut,
      role, photo, adhesion_association, notes
    } = req.body;

    // Validate required fields
    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Nom, prenom, email, and password are required'
      });
    }

    const adherent = await Adherent.create({
      nom,
      prenom,
      email,
      password,
      telephone,
      adresse,
      ville,
      code_postal,
      date_naissance,
      date_adhesion: date_adhesion || new Date(),
      date_fin_adhesion,
      statut: statut || 'actif',
      role: role || 'usager',
      photo: photo || null,
      adhesion_association: adhesion_association || false,
      notes
    });

    // Déclencher l'événement de création d'adhérent
    try {
      await eventTriggerService.triggerAdherentCreated(adherent);
      // console.log('Event ADHERENT_CREATED déclenché pour:', adherent.email);
    } catch (eventError) {
      console.error('Erreur déclenchement événement:', eventError);
      // Ne pas bloquer la création si l'événement échoue
    }

    // Ne pas retourner le mot de passe
    const adherentResponse = adherent.toJSON();
    delete adherentResponse.password;

    res.status(201).json({
      message: 'Adherent created successfully',
      adherent: adherentResponse
    });
  } catch (error) {
    console.error('Create adherent error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Duplicate entry',
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Update adherent
 * PUT /api/adherents/:id
 */
const updateAdherent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom, prenom, email, telephone, adresse, ville,
      code_postal, date_naissance, date_adhesion, date_fin_adhesion,
      statut, role, photo, adhesion_association, notes
    } = req.body;

    const adherent = await Adherent.findByPk(id);

    if (!adherent) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Adherent not found'
      });
    }

    // Track status change for event triggering
    const previousStatut = adherent.statut;

    // Update fields
    if (nom) adherent.nom = nom;
    if (prenom) adherent.prenom = prenom;
    if (email) adherent.email = email;
    if (telephone !== undefined) adherent.telephone = telephone;
    if (adresse !== undefined) adherent.adresse = adresse;
    if (ville !== undefined) adherent.ville = ville;
    if (code_postal !== undefined) adherent.code_postal = code_postal;
    if (date_naissance !== undefined) adherent.date_naissance = date_naissance;
    if (date_adhesion !== undefined) adherent.date_adhesion = date_adhesion;
    if (date_fin_adhesion !== undefined) adherent.date_fin_adhesion = date_fin_adhesion;
    if (statut) adherent.statut = statut;
    if (role) adherent.role = role;
    if (photo !== undefined) adherent.photo = photo;
    if (adhesion_association !== undefined) adherent.adhesion_association = adhesion_association;
    if (notes !== undefined) adherent.notes = notes;

    await adherent.save();

    // Déclencher les événements appropriés
    try {
      // Si le statut a changé vers suspendu
      if (statut && statut === 'suspendu' && previousStatut !== 'suspendu') {
        await eventTriggerService.triggerAdherentSuspended(adherent);
// console.('Event ADHERENT_SUSPENDED déclenché pour:', adherent.email);
      } else {
        // Pour toute autre modification
        await eventTriggerService.triggerAdherentUpdated(adherent);
// console.('Event ADHERENT_UPDATED déclenché pour:', adherent.email);
      }
    } catch (eventError) {
      console.error('Erreur déclenchement événement:', eventError);
      // Ne pas bloquer la mise à jour si l'événement échoue
    }

    // Ne pas retourner le mot de passe
    const adherentResponse = adherent.toJSON();
    delete adherentResponse.password;

    res.json({
      message: 'Adherent updated successfully',
      adherent: adherentResponse
    });
  } catch (error) {
    console.error('Update adherent error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Delete adherent
 * DELETE /api/adherents/:id
 */
const deleteAdherent = async (req, res) => {
  try {
    const { id } = req.params;

    const adherent = await Adherent.findByPk(id);

    if (!adherent) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Adherent not found'
      });
    }

    // Check if adherent has active emprunts
    const activeEmprunts = await Emprunt.count({
      where: {
        adherent_id: id,
        statut: { [Op.in]: ['en_cours', 'en_retard'] }
      }
    });

    if (activeEmprunts > 0) {
      return res.status(400).json({
        error: 'Cannot delete',
        message: `Adherent has ${activeEmprunts} active loan(s). Please return all items first.`
      });
    }

    await adherent.destroy();

    res.json({
      message: 'Adherent deleted successfully'
    });
  } catch (error) {
    console.error('Delete adherent error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get adherent statistics
 * GET /api/adherents/:id/stats
 */
const getAdherentStats = async (req, res) => {
  try {
    const { id } = req.params;

    const adherent = await Adherent.findByPk(id);

    if (!adherent) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Adherent not found'
      });
    }

    const totalEmprunts = await Emprunt.count({
      where: { adherent_id: id }
    });

    const empruntsEnCours = await Emprunt.count({
      where: {
        adherent_id: id,
        statut: 'en_cours'
      }
    });

    const empruntsEnRetard = await Emprunt.count({
      where: {
        adherent_id: id,
        statut: 'en_retard'
      }
    });

    res.json({
      adherent: {
        id: adherent.id,
        nom: adherent.nom,
        prenom: adherent.prenom,
        code_barre: adherent.code_barre
      },
      stats: {
        totalEmprunts,
        empruntsEnCours,
        empruntsEnRetard
      }
    });
  } catch (error) {
    console.error('Get adherent stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Send email to adherent (manual or template)
 * POST /api/adherents/:id/send-email
 */
const sendEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { mode, templateCode, subject, body, variables } = req.body;

    const adherent = await Adherent.findByPk(id);

    if (!adherent) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Adherent not found'
      });
    }

    const emailService = require('../services/emailService');
    const { TemplateMessage } = require('../models');

    let emailData = {
      to: adherent.email,
      adherentId: adherent.id
    };

    if (mode === 'template') {
      // Mode template
      if (!templateCode) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Template code is required'
        });
      }

      const template = await TemplateMessage.findByCode(templateCode);

      if (!template) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Template not found'
        });
      }

      // Préparer les variables
      const templateVariables = {
        prenom: adherent.prenom,
        nom: adherent.nom,
        email: adherent.email,
        code_barre: adherent.code_barre,
        date_adhesion: adherent.date_adhesion,
        ...variables
      };

      // Compiler le template
      const compiled = template.compileEmail(templateVariables);

      emailData.subject = compiled.objet;
      emailData.html = compiled.corps;
      emailData.templateCode = templateCode;
    } else {
      // Mode manuel
      if (!subject || !body) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Subject and body are required'
        });
      }

      // Remplacer les variables dans le texte manuel
      const templateVariables = {
        prenom: adherent.prenom,
        nom: adherent.nom,
        email: adherent.email,
        code_barre: adherent.code_barre,
        ...variables
      };

      emailData.subject = replaceVariables(subject, templateVariables);
      emailData.html = replaceVariables(body, templateVariables);
    }

    emailData.metadata = {
      destinataire_nom: `${adherent.prenom} ${adherent.nom}`,
      sent_by: req.user.id,
      mode: mode
    };

    // Envoyer l'email
    const result = await emailService.sendEmail(emailData);

    res.json({
      success: true,
      message: 'Email envoyé avec succès',
      messageId: result.messageId,
      logId: result.logId
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Send SMS to adherent (manual or template)
 * POST /api/adherents/:id/send-sms
 */
const sendSms = async (req, res) => {
  try {
    const { id } = req.params;
    const { mode, templateCode, body, variables } = req.body;

    const adherent = await Adherent.findByPk(id);

    if (!adherent) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Adherent not found'
      });
    }

    if (!adherent.telephone) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Adherent has no phone number'
      });
    }

    const { TemplateMessage } = require('../models');

    let smsText = '';

    if (mode === 'template') {
      // Mode template
      if (!templateCode) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Template code is required'
        });
      }

      const template = await TemplateMessage.findByCode(templateCode);

      if (!template) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Template not found'
        });
      }

      // Préparer les variables
      const templateVariables = {
        prenom: adherent.prenom,
        nom: adherent.nom,
        telephone: adherent.telephone,
        ...variables
      };

      // Compiler le template
      smsText = template.compileSMS(templateVariables);
    } else {
      // Mode manuel
      if (!body) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'SMS body is required'
        });
      }

      // Remplacer les variables dans le texte manuel
      const templateVariables = {
        prenom: adherent.prenom,
        nom: adherent.nom,
        telephone: adherent.telephone,
        ...variables
      };

      smsText = replaceVariables(body, templateVariables);
    }

    // Vérifier la longueur
    if (smsText.length > 160) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'SMS text exceeds 160 characters'
      });
    }

    // TODO: Implémenter l'envoi de SMS via un service SMS
    // Pour l'instant, on simule un succès
// console.(`[SMS] Envoi à ${adherent.telephone}: ${smsText}`);

    res.json({
      success: true,
      message: 'SMS envoyé avec succès (simulation)',
      to: adherent.telephone,
      text: smsText,
      mode: mode
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Helper function to replace variables in text
 */
function replaceVariables(text, variables) {
  let result = text;

  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const value = variables[key];
    result = result.replace(regex, value !== null && value !== undefined ? String(value) : '');
  });

  return result;
}

module.exports = {
  getAllAdherents,
  getAdherentById,
  createAdherent,
  updateAdherent,
  deleteAdherent,
  getAdherentStats,
  sendEmail,
  sendSms
};
