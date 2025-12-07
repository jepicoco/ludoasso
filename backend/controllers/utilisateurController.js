const { Utilisateur, Emprunt, Jeu, Cotisation, UtilisateurArchive, ArchiveAccessLog, sequelize } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');
const eventTriggerService = require('../services/eventTriggerService');

/**
 * Get all utilisateurs with optional filters
 * GET /api/utilisateurs?statut=actif&search=dupont
 */
const getAllUtilisateurs = async (req, res) => {
  try {
    const { statut, search, role, date_fin_adhesion_association, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (statut) {
      where.statut = statut;
    }

    if (role) {
      where.role = role;
    }

    // Filtrer par statut d'adhesion a l'association
    if (date_fin_adhesion_association === 'actif') {
      where.date_fin_adhesion_association = { [Op.gte]: new Date() };
    } else if (date_fin_adhesion_association === 'expire') {
      where.date_fin_adhesion_association = { [Op.lt]: new Date() };
    }

    if (search) {
      where[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { prenom: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { code_barre: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Utilisateur.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nom', 'ASC'], ['prenom', 'ASC']],
      attributes: { exclude: ['password'] }
    });

    res.json({
      utilisateurs: rows,
      // Alias pour compatibilite
      adherents: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get utilisateurs error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get utilisateur by ID with emprunts
 * GET /api/utilisateurs/:id
 */
const getUtilisateurById = async (req, res) => {
  try {
    const { id } = req.params;

    const utilisateur = await Utilisateur.findByPk(id, {
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

    if (!utilisateur) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Usager non trouve'
      });
    }

    res.json({
      utilisateur,
      // Alias pour compatibilite
      adherent: utilisateur
    });
  } catch (error) {
    console.error('Get utilisateur error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Create new utilisateur
 * POST /api/utilisateurs
 */
const createUtilisateur = async (req, res) => {
  try {
    const {
      nom, prenom, email, password, telephone,
      adresse, ville, code_postal, date_naissance,
      date_inscription, date_fin_cotisation, statut,
      role, photo, date_fin_adhesion_association, notes
    } = req.body;

    // Validate required fields
    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Nom, prenom, email et mot de passe sont requis'
      });
    }

    const utilisateur = await Utilisateur.create({
      nom,
      prenom,
      email,
      password,
      telephone,
      adresse,
      ville,
      code_postal,
      date_naissance,
      date_inscription: date_inscription || new Date(),
      date_fin_cotisation,
      statut: statut || 'actif',
      role: role || 'usager',
      photo: photo || null,
      date_fin_adhesion_association: date_fin_adhesion_association || null,
      notes
    });

    // Declencher l'evenement de creation d'utilisateur
    try {
      await eventTriggerService.trigger('UTILISATEUR_CREATION', { utilisateur });
    } catch (eventError) {
      console.error('Erreur declenchement evenement:', eventError);
    }

    const utilisateurResponse = utilisateur.toJSON();
    delete utilisateurResponse.password;

    res.status(201).json({
      message: 'Usager cree avec succes',
      utilisateur: utilisateurResponse,
      // Alias pour compatibilite
      adherent: utilisateurResponse
    });
  } catch (error) {
    console.error('Create utilisateur error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Duplicate entry',
        message: 'Cet email existe deja'
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Update utilisateur
 * PUT /api/utilisateurs/:id
 */
const updateUtilisateur = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom, prenom, email, telephone, adresse, ville,
      code_postal, date_naissance, date_inscription, date_fin_cotisation,
      statut, role, photo, date_fin_adhesion_association, notes
    } = req.body;

    const utilisateur = await Utilisateur.findByPk(id);

    if (!utilisateur) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Usager non trouve'
      });
    }

    const previousStatut = utilisateur.statut;

    // Update fields
    if (nom) utilisateur.nom = nom;
    if (prenom) utilisateur.prenom = prenom;
    if (email) utilisateur.email = email;
    if (telephone !== undefined) utilisateur.telephone = telephone;
    if (adresse !== undefined) utilisateur.adresse = adresse;
    if (ville !== undefined) utilisateur.ville = ville;
    if (code_postal !== undefined) utilisateur.code_postal = code_postal;
    if (date_naissance !== undefined) utilisateur.date_naissance = date_naissance;
    if (date_inscription !== undefined) utilisateur.date_inscription = date_inscription;
    if (date_fin_cotisation !== undefined) utilisateur.date_fin_cotisation = date_fin_cotisation;
    if (statut) utilisateur.statut = statut;
    if (role) utilisateur.role = role;
    if (photo !== undefined) utilisateur.photo = photo;
    if (date_fin_adhesion_association !== undefined) utilisateur.date_fin_adhesion_association = date_fin_adhesion_association;
    if (notes !== undefined) utilisateur.notes = notes;

    await utilisateur.save();

    // Declencher les evenements appropries
    try {
      if (statut && statut === 'suspendu' && previousStatut !== 'suspendu') {
        await eventTriggerService.trigger('UTILISATEUR_SUSPENDED', { utilisateur });
      } else {
        await eventTriggerService.trigger('UTILISATEUR_MODIFICATION', { utilisateur });
      }
    } catch (eventError) {
      console.error('Erreur declenchement evenement:', eventError);
    }

    const utilisateurResponse = utilisateur.toJSON();
    delete utilisateurResponse.password;

    res.json({
      message: 'Usager mis a jour avec succes',
      utilisateur: utilisateurResponse,
      // Alias pour compatibilite
      adherent: utilisateurResponse
    });
  } catch (error) {
    console.error('Update utilisateur error:', error);

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
 * Delete utilisateur (archives instead of deleting - RGPD compliant)
 * DELETE /api/utilisateurs/:id
 */
const deleteUtilisateur = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { motif } = req.body;

    const utilisateur = await Utilisateur.findByPk(id, { transaction });

    if (!utilisateur) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Usager non trouve'
      });
    }

    // Check if utilisateur has active emprunts
    // NOTE: Utilise 'adherent_id' pour compatibilite jusqu'a migration
    const activeEmprunts = await Emprunt.count({
      where: {
        adherent_id: id,
        statut: { [Op.in]: ['en_cours', 'en_retard'] }
      },
      transaction
    });

    if (activeEmprunts > 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Cannot archive',
        message: `Impossible d'archiver : ${activeEmprunts} emprunt(s) en cours. Veuillez d'abord cloturer tous les emprunts.`
      });
    }

    // Trouver la derniere activite
    // NOTE: Utilise 'adherent_id' pour compatibilite jusqu'a migration
    const [dernierEmprunt, derniereCotisation] = await Promise.all([
      Emprunt.findOne({
        where: { adherent_id: id },
        order: [['date_emprunt', 'DESC']],
        transaction
      }),
      Cotisation.findOne({
        where: { adherent_id: id },
        order: [['date_paiement', 'DESC']],
        transaction
      })
    ]);

    const dateDernierEmprunt = dernierEmprunt?.date_emprunt ? new Date(dernierEmprunt.date_emprunt) : null;
    const dateDerniereCotisation = derniereCotisation?.date_paiement ? new Date(derniereCotisation.date_paiement) : null;

    let derniereActivite = null;
    if (dateDernierEmprunt && dateDerniereCotisation) {
      derniereActivite = dateDernierEmprunt > dateDerniereCotisation ? dateDernierEmprunt : dateDerniereCotisation;
    } else {
      derniereActivite = dateDernierEmprunt || dateDerniereCotisation;
    }

    // Creer l'archive
    // NOTE: Utilise 'adherent_id' pour compatibilite jusqu'a migration
    const archive = await UtilisateurArchive.create({
      adherent_id: utilisateur.id,
      code_barre: utilisateur.code_barre,
      civilite: utilisateur.civilite || null,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email,
      telephone: utilisateur.telephone,
      adresse: utilisateur.adresse,
      ville: utilisateur.ville,
      code_postal: utilisateur.code_postal,
      date_naissance: utilisateur.date_naissance,
      date_adhesion: utilisateur.date_adhesion,
      date_fin_adhesion: utilisateur.date_fin_adhesion,
      adhesion_association: utilisateur.adhesion_association,
      statut_avant_archivage: utilisateur.statut,
      photo: utilisateur.photo,
      notes: utilisateur.notes,
      date_fin_adhesion_association: utilisateur.date_fin_adhesion_association,
      role: utilisateur.role,
      archive_par: req.user?.id || null,
      motif_archivage: motif || 'Archivage manuel',
      derniere_activite: derniereActivite
    }, { transaction });

    // Supprimer l'utilisateur de la table principale
    await utilisateur.destroy({ transaction });

    await transaction.commit();

    // Logger l'acces aux archives
    if (req.user) {
      try {
        await ArchiveAccessLog.create({
          user_id: req.user.id,
          user_nom: req.user.nom,
          user_prenom: req.user.prenom,
          user_role: req.user.role,
          action: 'archivage',
          utilisateur_archive_id: archive.id,
          details: `Usager ${utilisateur.prenom} ${utilisateur.nom} archive`,
          ip_address: req.ip || req.connection?.remoteAddress,
          user_agent: req.get('User-Agent')?.substring(0, 500)
        });
      } catch (logError) {
        console.error('Erreur log archive:', logError);
      }
    }

    res.json({
      message: 'Usager archive avec succes',
      archived: true,
      archiveId: archive.id
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete/Archive utilisateur error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get utilisateur statistics
 * GET /api/utilisateurs/:id/stats
 */
const getUtilisateurStats = async (req, res) => {
  try {
    const { id } = req.params;

    const utilisateur = await Utilisateur.findByPk(id);

    if (!utilisateur) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Usager non trouve'
      });
    }

    // NOTE: Utilise 'adherent_id' pour compatibilite jusqu'a migration
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
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        code_barre: utilisateur.code_barre
      },
      // Alias pour compatibilite
      adherent: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        code_barre: utilisateur.code_barre
      },
      stats: {
        totalEmprunts,
        empruntsEnCours,
        empruntsEnRetard
      }
    });
  } catch (error) {
    console.error('Get utilisateur stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Send email to utilisateur
 * POST /api/utilisateurs/:id/send-email
 */
const sendEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { mode, templateCode, subject, body, variables } = req.body;

    const utilisateur = await Utilisateur.findByPk(id);

    if (!utilisateur) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Usager non trouve'
      });
    }

    const emailService = require('../services/emailService');
    const { TemplateMessage } = require('../models');

    let emailData = {
      to: utilisateur.email,
      utilisateurId: utilisateur.id
    };

    if (mode === 'template') {
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

      const templateVariables = await prepareAllVariables(utilisateur, variables);
      const compiled = template.compileEmail(templateVariables);

      emailData.subject = compiled.objet;
      emailData.html = compiled.corps;
      emailData.templateCode = templateCode;
    } else {
      if (!subject || !body) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Subject and body are required'
        });
      }

      const templateVariables = await prepareAllVariables(utilisateur, variables);

      emailData.subject = replaceVariables(subject, templateVariables);
      emailData.html = replaceVariables(body, templateVariables);
    }

    emailData.metadata = {
      destinataire_nom: `${utilisateur.prenom} ${utilisateur.nom}`,
      sent_by: req.user.id,
      mode: mode
    };

    const result = await emailService.sendEmail(emailData);

    res.json({
      success: true,
      message: 'Email envoye avec succes',
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
 * Send SMS to utilisateur
 * POST /api/utilisateurs/:id/send-sms
 */
const sendSms = async (req, res) => {
  try {
    const { id } = req.params;
    const { mode, templateCode, body, variables } = req.body;

    const utilisateur = await Utilisateur.findByPk(id);

    if (!utilisateur) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Usager non trouve'
      });
    }

    if (!utilisateur.telephone) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'L\'usager n\'a pas de numero de telephone'
      });
    }

    const { TemplateMessage } = require('../models');

    let smsText = '';

    if (mode === 'template') {
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

      const templateVariables = await prepareAllVariables(utilisateur, variables);
      smsText = template.compileSMS(templateVariables);
    } else {
      if (!body) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'SMS body is required'
        });
      }

      const templateVariables = await prepareAllVariables(utilisateur, variables);
      smsText = replaceVariables(body, templateVariables);
    }

    if (smsText.length > 480) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Le SMS depasse 480 caracteres (max 3 segments)'
      });
    }

    const { ConfigurationSMS } = require('../models');
    const smsService = require('../utils/smsService');

    const smsConfig = await ConfigurationSMS.findOne({
      where: { actif: true },
      order: [['id', 'ASC']]
    });

    if (!smsConfig) {
      return res.status(400).json({
        error: 'Configuration error',
        message: 'Aucune configuration SMS active.'
      });
    }

    const phoneNumber = normalizePhoneNumber(utilisateur.telephone);

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Numero de telephone invalide'
      });
    }

    // NOTE: Utilise 'adherent_id' pour compatibilite jusqu'a migration
    const result = await smsService.sendSMS(smsConfig.id, {
      to: phoneNumber,
      text: smsText,
      adherent_id: utilisateur.id,
      destinataire_nom: `${utilisateur.prenom} ${utilisateur.nom}`,
      template_code: mode === 'template' ? templateCode : null
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'SMS error',
        message: result.error || 'Erreur lors de l\'envoi du SMS'
      });
    }

    res.json({
      success: true,
      message: 'SMS envoye avec succes',
      to: utilisateur.telephone,
      text: smsText,
      mode: mode,
      ticket: result.ticket,
      smsLogId: result.smsLogId
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

// Helper functions
function replaceVariables(text, variables) {
  let result = text;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const value = variables[key];
    result = result.replace(regex, value !== null && value !== undefined ? String(value) : '');
  });
  return result;
}

function normalizePhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-\.]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 10) return '+33' + cleaned.substring(1);
  if (cleaned.startsWith('33') && cleaned.length === 11) return '+' + cleaned;
  return '+' + cleaned;
}

async function prepareAllVariables(utilisateur, additionalVariables = {}) {
  const variables = {};

  variables.structure_nom = process.env.STRUCTURE_NOM || 'Ludotheque';
  variables.structure_adresse = process.env.STRUCTURE_ADRESSE || '';
  variables.structure_email = process.env.STRUCTURE_EMAIL || '';
  variables.structure_telephone = process.env.STRUCTURE_TELEPHONE || '';
  variables.date_jour = new Date().toLocaleDateString('fr-FR');

  if (utilisateur) {
    variables.prenom = utilisateur.prenom || '';
    variables.nom = utilisateur.nom || '';
    variables.email = utilisateur.email || '';
    variables.telephone = utilisateur.telephone || '';
    variables.code_barre = utilisateur.code_barre || '';
    variables.date_inscription = utilisateur.date_inscription ? new Date(utilisateur.date_inscription).toLocaleDateString('fr-FR') : '';
    variables.adresse = utilisateur.adresse || '';
    variables.ville = utilisateur.ville || '';
    variables.code_postal = utilisateur.code_postal || '';

    try {
      const empruntsVars = await eventTriggerService.prepareEmpruntsVariables(utilisateur.id);
      Object.assign(variables, empruntsVars);
    } catch (error) {
      console.error('Erreur preparation variables emprunts:', error);
      variables.jeux_en_cours = '';
      variables.jeux_en_cours_sms = '';
      variables.jeux_non_rendus = '';
      variables.jeux_non_rendus_sms = '';
      variables.nb_jeux_en_cours = 0;
      variables.nb_jeux_non_rendus = 0;
    }
  }

  Object.assign(variables, additionalVariables);
  return variables;
}

// Export avec alias pour compatibilite
module.exports = {
  // Nouveaux noms
  getAllUtilisateurs,
  getUtilisateurById,
  createUtilisateur,
  updateUtilisateur,
  deleteUtilisateur,
  getUtilisateurStats,
  // Alias pour compatibilite (ancien code)
  getAllAdherents: getAllUtilisateurs,
  getAdherentById: getUtilisateurById,
  createAdherent: createUtilisateur,
  updateAdherent: updateUtilisateur,
  deleteAdherent: deleteUtilisateur,
  getAdherentStats: getUtilisateurStats,
  // Email/SMS
  sendEmail,
  sendSms
};
