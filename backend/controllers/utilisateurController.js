const { Utilisateur, Emprunt, Jeu, Cotisation, UtilisateurArchive, ArchiveAccessLog, TagUtilisateur, UtilisateurTag, sequelize } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');
const eventTriggerService = require('../services/eventTriggerService');
const familleService = require('../services/familleService');

/**
 * Get all utilisateurs with optional filters
 * GET /api/utilisateurs?statut=actif&search=dupont&sexe=M&tag=SALARIE
 */
const getAllUtilisateurs = async (req, res) => {
  try {
    const { statut, search, role, date_fin_adhesion_association, sexe, tag, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (statut) {
      where.statut = statut;
    }

    if (role) {
      where.role = role;
    }

    // Filtrer par sexe
    if (sexe) {
      where.sexe = sexe;
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

    // Options de la requete
    const queryOptions = {
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nom', 'ASC'], ['prenom', 'ASC']],
      attributes: { exclude: ['password'] },
      include: [{
        model: TagUtilisateur,
        as: 'tags',
        through: { attributes: ['date_attribution'] },
        attributes: ['id', 'code', 'libelle', 'couleur', 'icone']
      }]
    };

    // Filtrer par tag si specifie
    if (tag) {
      queryOptions.include[0].where = { code: tag };
      queryOptions.include[0].required = true;
    }

    const { count, rows } = await Utilisateur.findAndCountAll(queryOptions);

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
 * Get utilisateur by ID with emprunts and tags
 * GET /api/utilisateurs/:id
 */
const getUtilisateurById = async (req, res) => {
  try {
    const { id } = req.params;

    const utilisateur = await Utilisateur.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Emprunt,
          as: 'emprunts',
          include: [{
            model: Jeu,
            as: 'jeu'
          }],
          order: [['date_emprunt', 'DESC']]
        },
        {
          model: TagUtilisateur,
          as: 'tags',
          through: { attributes: ['date_attribution'] },
          attributes: ['id', 'code', 'libelle', 'couleur', 'icone']
        }
      ]
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
      adresse, ville, code_postal,
      code_postal_prise_en_charge, ville_prise_en_charge,
      date_naissance,
      date_inscription, date_fin_cotisation, statut,
      role, photo, date_fin_adhesion_association, notes,
      sexe, tags
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
      code_postal_prise_en_charge,
      ville_prise_en_charge,
      date_naissance,
      date_inscription: date_inscription || new Date(),
      date_fin_cotisation,
      statut: statut || 'actif',
      role: role || 'usager',
      photo: photo || null,
      date_fin_adhesion_association: date_fin_adhesion_association || null,
      notes,
      sexe: sexe || 'N'
    });

    // Gerer les tags
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagRecords = await TagUtilisateur.findAll({
        where: { id: { [Op.in]: tags }, actif: true }
      });
      if (tagRecords.length > 0) {
        await utilisateur.setTags(tagRecords);
      }
    }

    // Declencher l'evenement de creation d'utilisateur
    try {
      await eventTriggerService.trigger('UTILISATEUR_CREATION', { utilisateur });
    } catch (eventError) {
      console.error('Erreur declenchement evenement:', eventError);
    }

    // Recharger avec les tags
    const utilisateurWithTags = await Utilisateur.findByPk(utilisateur.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: TagUtilisateur,
        as: 'tags',
        through: { attributes: ['date_attribution'] },
        attributes: ['id', 'code', 'libelle', 'couleur', 'icone']
      }]
    });

    res.status(201).json({
      message: 'Usager cree avec succes',
      utilisateur: utilisateurWithTags,
      // Alias pour compatibilite
      adherent: utilisateurWithTags
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
      nom, prenom, email, password, telephone, adresse, ville,
      code_postal, code_postal_prise_en_charge, ville_prise_en_charge,
      date_naissance, date_inscription, date_fin_cotisation,
      statut, role, photo, date_fin_adhesion_association, notes,
      sexe, tags
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
    // Flag pour savoir si on a hashé manuellement
    let passwordHashed = false;
    if (password) {
      // Hasher le mot de passe directement
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      utilisateur.password = await bcrypt.hash(password, salt);
      passwordHashed = true;
    }
    if (telephone !== undefined) utilisateur.telephone = telephone;
    if (adresse !== undefined) utilisateur.adresse = adresse;
    if (ville !== undefined) utilisateur.ville = ville;
    if (code_postal !== undefined) utilisateur.code_postal = code_postal;
    if (code_postal_prise_en_charge !== undefined) utilisateur.code_postal_prise_en_charge = code_postal_prise_en_charge;
    if (ville_prise_en_charge !== undefined) utilisateur.ville_prise_en_charge = ville_prise_en_charge;
    if (date_naissance !== undefined) utilisateur.date_naissance = date_naissance;
    if (date_inscription !== undefined) utilisateur.date_inscription = date_inscription;
    if (date_fin_cotisation !== undefined) utilisateur.date_fin_cotisation = date_fin_cotisation;
    if (statut) utilisateur.statut = statut;
    if (role) utilisateur.role = role;
    if (photo !== undefined) utilisateur.photo = photo;
    if (date_fin_adhesion_association !== undefined) utilisateur.date_fin_adhesion_association = date_fin_adhesion_association;
    if (notes !== undefined) utilisateur.notes = notes;
    if (sexe !== undefined) utilisateur.sexe = sexe;

    // Si mot de passe hashé manuellement, sauvegarder sans hook pour éviter double hashage
    await utilisateur.save({ hooks: !passwordHashed });

    // Gerer les tags (si fournis dans la requete)
    if (tags !== undefined) {
      if (Array.isArray(tags) && tags.length > 0) {
        const tagRecords = await TagUtilisateur.findAll({
          where: { id: { [Op.in]: tags }, actif: true }
        });
        await utilisateur.setTags(tagRecords);
      } else {
        // Si tags est un tableau vide, supprimer tous les tags
        await utilisateur.setTags([]);
      }
    }

    // Declencher les evenements appropries
    try {
      if (statut && statut === 'suspendu' && previousStatut !== 'suspendu') {
        await eventTriggerService.triggerAdherentSuspended(utilisateur);
      } else {
        await eventTriggerService.triggerAdherentUpdated(utilisateur);
      }
    } catch (eventError) {
      console.error('Erreur declenchement evenement:', eventError);
    }

    // Recharger avec les tags
    const utilisateurWithTags = await Utilisateur.findByPk(utilisateur.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: TagUtilisateur,
        as: 'tags',
        through: { attributes: ['date_attribution'] },
        attributes: ['id', 'code', 'libelle', 'couleur', 'icone']
      }]
    });

    res.json({
      message: 'Usager mis a jour avec succes',
      utilisateur: utilisateurWithTags,
      // Alias pour compatibilite
      adherent: utilisateurWithTags
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
    const activeEmprunts = await Emprunt.count({
      where: {
        utilisateur_id: id,
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
    const [dernierEmprunt, derniereCotisation] = await Promise.all([
      Emprunt.findOne({
        where: { utilisateur_id: id },
        order: [['date_emprunt', 'DESC']],
        transaction
      }),
      Cotisation.findOne({
        where: { utilisateur_id: id },
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
    const archive = await UtilisateurArchive.create({
      utilisateur_id: utilisateur.id,
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

    const totalEmprunts = await Emprunt.count({
      where: { utilisateur_id: id }
    });

    const empruntsEnCours = await Emprunt.count({
      where: {
        utilisateur_id: id,
        statut: 'en_cours'
      }
    });

    const empruntsEnRetard = await Emprunt.count({
      where: {
        utilisateur_id: id,
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

// ========== FAMILLE ==========

/**
 * Get family members for a user
 * GET /api/adherents/:id/famille
 */
const getFamille = async (req, res) => {
  try {
    const { id } = req.params;
    const famille = await familleService.getFamille(id);
    res.json(famille);
  } catch (error) {
    console.error('Erreur getFamille:', error);
    res.status(error.message.includes('non trouve') ? 404 : 500).json({
      message: error.message
    });
  }
};

/**
 * Get children of a user
 * GET /api/adherents/:id/enfants
 */
const getEnfants = async (req, res) => {
  try {
    const { id } = req.params;
    const enfants = await familleService.getEnfants(id);
    res.json({ enfants });
  } catch (error) {
    console.error('Erreur getEnfants:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Link a child to a parent
 * POST /api/adherents/:id/enfants
 * Body: { enfantId, typeLien }
 */
const ajouterEnfant = async (req, res) => {
  try {
    const { id } = req.params; // ID du parent
    const { enfantId, typeLien = 'parent' } = req.body;

    if (!enfantId) {
      return res.status(400).json({ message: 'enfantId est requis' });
    }

    const enfant = await familleService.lierEnfant(enfantId, parseInt(id), typeLien);
    res.status(201).json({
      message: 'Lien familial cree avec succes',
      enfant
    });
  } catch (error) {
    console.error('Erreur ajouterEnfant:', error);
    res.status(error.message.includes('non trouve') ? 404 : 400).json({
      message: error.message
    });
  }
};

/**
 * Unlink a child from parent
 * DELETE /api/adherents/:id/enfants/:enfantId
 */
const retirerEnfant = async (req, res) => {
  try {
    const { enfantId } = req.params;

    const enfant = await familleService.delierEnfant(parseInt(enfantId));
    res.json({
      message: 'Lien familial supprime',
      enfant
    });
  } catch (error) {
    console.error('Erreur retirerEnfant:', error);
    res.status(error.message.includes('non trouve') ? 404 : 400).json({
      message: error.message
    });
  }
};

/**
 * Calculate family subscription cost
 * GET /api/adherents/:id/famille/cout
 */
const calculerCoutFamille = async (req, res) => {
  try {
    const { id } = req.params;
    const cout = await familleService.calculerCoutFamille(id);
    res.json(cout);
  } catch (error) {
    console.error('Erreur calculerCoutFamille:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Search users available for family linking
 * GET /api/adherents/recherche/disponibles?q=dupont&exclude=5
 */
const rechercherDisponibles = async (req, res) => {
  try {
    const { q, exclude } = req.query;
    const utilisateurs = await familleService.rechercherUtilisateursDisponibles(
      q,
      exclude ? parseInt(exclude) : null
    );
    res.json({ utilisateurs });
  } catch (error) {
    console.error('Erreur rechercherDisponibles:', error);
    res.status(500).json({ message: error.message });
  }
};

// ========== Foyers (système étendu) ==========

/**
 * Get available relationship types
 * GET /api/adherents/foyers/types-liens
 */
const getTypesLiensFamille = async (req, res) => {
  try {
    const types = familleService.getTypesLiens();
    res.json(types);
  } catch (error) {
    console.error('Erreur getTypesLiensFamille:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get foyers (households) of a user
 * GET /api/adherents/:id/foyers
 */
const getFoyersUtilisateur = async (req, res) => {
  try {
    const { id } = req.params;
    const foyers = await familleService.getFoyersUtilisateur(id);
    res.json({ foyers });
  } catch (error) {
    console.error('Erreur getFoyersUtilisateur:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a new foyer with user as main responsible
 * POST /api/adherents/:id/foyers
 */
const creerFoyer = async (req, res) => {
  try {
    const { id } = req.params;
    const options = {
      ...req.body,
      structure_id: req.structureId
    };
    const foyer = await familleService.creerFoyer(parseInt(id), options);
    res.status(201).json(foyer);
  } catch (error) {
    console.error('Erreur creerFoyer:', error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Get members of a foyer
 * GET /api/adherents/foyers/:foyerId/membres
 */
const getMembresFoyer = async (req, res) => {
  try {
    const { foyerId } = req.params;
    const membres = await familleService.getMembresFoyer(foyerId);
    res.json({ membres });
  } catch (error) {
    console.error('Erreur getMembresFoyer:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add a member to a foyer
 * POST /api/adherents/foyers/:foyerId/membres
 */
const ajouterMembreFoyer = async (req, res) => {
  try {
    const { foyerId } = req.params;
    const { utilisateur_id, ...options } = req.body;
    const membre = await familleService.ajouterMembreFoyer(
      parseInt(foyerId),
      parseInt(utilisateur_id),
      options
    );
    res.status(201).json(membre);
  } catch (error) {
    console.error('Erreur ajouterMembreFoyer:', error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Remove a member from a foyer
 * DELETE /api/adherents/foyers/:foyerId/membres/:utilisateurId
 */
const retirerMembreFoyer = async (req, res) => {
  try {
    const { foyerId, utilisateurId } = req.params;
    await familleService.retirerMembreFoyer(
      parseInt(foyerId),
      parseInt(utilisateurId)
    );
    res.json({ success: true, message: 'Membre retiré du foyer' });
  } catch (error) {
    console.error('Erreur retirerMembreFoyer:', error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Update shared custody configuration
 * PUT /api/adherents/foyers/membres/:membreId/garde
 */
const updateConfigGarde = async (req, res) => {
  try {
    const { membreId } = req.params;
    const membre = await familleService.updateConfigGarde(parseInt(membreId), req.body);
    res.json(membre);
  } catch (error) {
    console.error('Erreur updateConfigGarde:', error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Copy data from a responsible to a member
 * POST /api/adherents/:id/copier-donnees
 */
const copierDonneesResponsable = async (req, res) => {
  try {
    const { id } = req.params;
    const { sourceId, typeLien } = req.body;
    const membre = await familleService.copierDonneesResponsable(
      parseInt(sourceId),
      parseInt(id),
      { typeLien }
    );
    res.json(membre);
  } catch (error) {
    console.error('Erreur copierDonneesResponsable:', error);
    res.status(400).json({ message: error.message });
  }
};

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
  sendSms,
  // Famille
  getFamille,
  getEnfants,
  ajouterEnfant,
  retirerEnfant,
  calculerCoutFamille,
  rechercherDisponibles,
  // Foyers (système étendu)
  getTypesLiensFamille,
  getFoyersUtilisateur,
  creerFoyer,
  getMembresFoyer,
  ajouterMembreFoyer,
  retirerMembreFoyer,
  updateConfigGarde,
  copierDonneesResponsable
};
