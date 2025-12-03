/**
 * Controller pour la gestion des templates de messages
 */

const { TemplateMessage } = require('../models');

/**
 * R�cup�rer tous les templates
 */
exports.getAllTemplates = async (req, res) => {
  try {
    const { type, categorie, actif } = req.query;

    const where = {};
    if (type) where.type_message = type;
    if (categorie) where.categorie = categorie;
    if (actif !== undefined) where.actif = actif === 'true';

    const templates = await TemplateMessage.findAll({
      where,
      order: [['ordre_affichage', 'ASC'], ['id', 'ASC']]
    });

    res.json(templates);
  } catch (error) {
    console.error('Erreur lors de la r�cup�ration des templates:', error);
    res.status(500).json({
      error: 'Erreur lors de la r�cup�ration des templates',
      details: error.message
    });
  }
};

/**
 * R�cup�rer un template par ID
 */
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await TemplateMessage.findByPk(id);

    if (!template) {
      return res.status(404).json({
        error: 'Template introuvable'
      });
    }

    res.json(template);
  } catch (error) {
    console.error('Erreur lors de la r�cup�ration du template:', error);
    res.status(500).json({
      error: 'Erreur lors de la r�cup�ration du template',
      details: error.message
    });
  }
};

/**
 * R�cup�rer un template par code
 */
exports.getTemplateByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const template = await TemplateMessage.findOne({
      where: { code: code.toUpperCase() }
    });

    if (!template) {
      return res.status(404).json({
        error: 'Template introuvable'
      });
    }

    res.json(template);
  } catch (error) {
    console.error('Erreur lors de la r�cup�ration du template:', error);
    res.status(500).json({
      error: 'Erreur lors de la r�cup�ration du template',
      details: error.message
    });
  }
};

/**
 * Cr�er un nouveau template
 */
exports.createTemplate = async (req, res) => {
  try {
    const {
      code,
      libelle,
      description,
      type_message,
      categorie,
      email_objet,
      email_corps,
      sms_corps,
      variables_disponibles,
      icone,
      couleur,
      actif
    } = req.body;

    // Validation
    if (!code || !libelle || !type_message) {
      return res.status(400).json({
        error: 'Champs requis manquants (code, libelle, type_message)'
      });
    }

    // Validation du type
    if (!['email', 'sms', 'both'].includes(type_message)) {
      return res.status(400).json({
        error: 'Type de message invalide (email, sms, ou both)'
      });
    }

    // Validation des contenus selon le type
    if ((type_message === 'email' || type_message === 'both') && (!email_objet || !email_corps)) {
      return res.status(400).json({
        error: 'L\'objet et le corps de l\'email sont requis pour un template email'
      });
    }

    if ((type_message === 'sms' || type_message === 'both') && !sms_corps) {
      return res.status(400).json({
        error: 'Le corps du SMS est requis pour un template SMS'
      });
    }

    // R�cup�rer le dernier ordre
    const maxOrdre = await TemplateMessage.max('ordre_affichage') || 0;

    // Cr�er le template
    const template = await TemplateMessage.create({
      code: code.toUpperCase(),
      libelle,
      description: description || null,
      type_message,
      categorie: categorie || 'Adh�rent',
      email_objet: email_objet || null,
      email_corps: email_corps || null,
      sms_corps: sms_corps || null,
      variables_disponibles: variables_disponibles || null, // Sequelize gère le JSON automatiquement
      icone: icone || 'bi-chat-dots',
      couleur: couleur || 'info',
      actif: actif !== undefined ? actif : true,
      ordre_affichage: maxOrdre + 1
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Erreur lors de la cr�ation du template:', error);

    // Erreur de duplication de code
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Un template avec ce code existe d�j�'
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la cr�ation du template',
      details: error.message
    });
  }
};

/**
 * Mettre � jour un template
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      libelle,
      description,
      type_message,
      categorie,
      email_objet,
      email_corps,
      sms_corps,
      variables_disponibles,
      icone,
      couleur,
      actif
    } = req.body;

    const template = await TemplateMessage.findByPk(id);

    if (!template) {
      return res.status(404).json({
        error: 'Template introuvable'
      });
    }

    // Pr�parer les donn�es de mise � jour
    const updateData = {};
    if (libelle !== undefined) updateData.libelle = libelle;
    if (description !== undefined) updateData.description = description;
    if (type_message !== undefined) updateData.type_message = type_message;
    if (categorie !== undefined) updateData.categorie = categorie;
    if (email_objet !== undefined) updateData.email_objet = email_objet;
    if (email_corps !== undefined) updateData.email_corps = email_corps;
    if (sms_corps !== undefined) updateData.sms_corps = sms_corps;
    if (icone !== undefined) updateData.icone = icone;
    if (couleur !== undefined) updateData.couleur = couleur;
    if (actif !== undefined) updateData.actif = actif;

    // Variables disponibles (Sequelize gère le JSON automatiquement)
    if (variables_disponibles !== undefined) {
      updateData.variables_disponibles = variables_disponibles;
    }

    await template.update(updateData);

    res.json(template);
  } catch (error) {
    console.error('Erreur lors de la mise � jour du template:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise � jour du template',
      details: error.message
    });
  }
};

/**
 * Supprimer un template
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await TemplateMessage.findByPk(id);

    if (!template) {
      return res.status(404).json({
        error: 'Template introuvable'
      });
    }

    await template.destroy();

    res.json({
      message: 'Template supprim� avec succ�s'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du template:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du template',
      details: error.message
    });
  }
};

/**
 * R�organiser les templates (drag & drop)
 */
exports.reorderTemplates = async (req, res) => {
  try {
    const { ordre } = req.body;

    if (!Array.isArray(ordre)) {
      return res.status(400).json({
        error: 'Le format des donn�es est invalide'
      });
    }

    // Mettre � jour l'ordre de chaque template
    for (const item of ordre) {
      await TemplateMessage.update(
        { ordre_affichage: item.ordre_affichage },
        { where: { id: item.id } }
      );
    }

    res.json({
      message: 'Ordre des templates mis � jour avec succ�s'
    });
  } catch (error) {
    console.error('Erreur lors de la r�organisation des templates:', error);
    res.status(500).json({
      error: 'Erreur lors de la r�organisation des templates',
      details: error.message
    });
  }
};

/**
 * Activer/d�sactiver un template
 */
exports.toggleActif = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await TemplateMessage.findByPk(id);

    if (!template) {
      return res.status(404).json({
        error: 'Template introuvable'
      });
    }

    template.actif = !template.actif;
    await template.save();

    res.json({
      message: `Template ${template.actif ? 'activ�' : 'd�sactiv�'} avec succ�s`,
      template
    });
  } catch (error) {
    console.error('Erreur lors du changement de statut du template:', error);
    res.status(500).json({
      error: 'Erreur lors du changement de statut du template',
      details: error.message
    });
  }
};

/**
 * Pr�visualiser un template avec des donn�es
 */
exports.previewTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    const template = await TemplateMessage.findByPk(id);

    if (!template) {
      return res.status(404).json({
        error: 'Template introuvable'
      });
    }

    const preview = {};

    // Fonction pour remplacer les variables
    const replaceVariables = (text, data) => {
      if (!text) return '';
      let result = text;
      for (const [key, value] of Object.entries(data || {})) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, value);
      }
      return result;
    };

    // Pr�visualiser l'email
    if (template.type_message === 'email' || template.type_message === 'both') {
      preview.email = {
        objet: replaceVariables(template.email_objet, data),
        corps: replaceVariables(template.email_corps, data)
      };
    }

    // Pr�visualiser le SMS
    if (template.type_message === 'sms' || template.type_message === 'both') {
      preview.sms = replaceVariables(template.sms_corps, data);
    }

    res.json(preview);
  } catch (error) {
    console.error('Erreur lors de la pr�visualisation du template:', error);
    res.status(500).json({
      error: 'Erreur lors de la pr�visualisation du template',
      details: error.message
    });
  }
};

/**
 * Dupliquer un template
 */
exports.duplicateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { nouveau_code } = req.body;

    if (!nouveau_code) {
      return res.status(400).json({
        error: 'Le nouveau code est requis'
      });
    }

    const templateOriginal = await TemplateMessage.findByPk(id);

    if (!templateOriginal) {
      return res.status(404).json({
        error: 'Template introuvable'
      });
    }

    // R�cup�rer le dernier ordre
    const maxOrdre = await TemplateMessage.max('ordre_affichage') || 0;

    // Cr�er la copie
    const templateCopie = await TemplateMessage.create({
      code: nouveau_code.toUpperCase(),
      libelle: `${templateOriginal.libelle} (copie)`,
      description: templateOriginal.description,
      type_message: templateOriginal.type_message,
      categorie: templateOriginal.categorie,
      email_objet: templateOriginal.email_objet,
      email_corps: templateOriginal.email_corps,
      sms_corps: templateOriginal.sms_corps,
      variables_disponibles: templateOriginal.variables_disponibles,
      icone: templateOriginal.icone,
      couleur: templateOriginal.couleur,
      actif: false, // Inactif par d�faut pour les copies
      ordre_affichage: maxOrdre + 1
    });

    res.status(201).json(templateCopie);
  } catch (error) {
    console.error('Erreur lors de la duplication du template:', error);

    // Erreur de duplication de code
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Un template avec ce code existe d�j�'
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la duplication du template',
      details: error.message
    });
  }
};
