/**
 * Controller pour la gestion des configurations SMS
 */

const { ConfigurationSMS } = require('../models');
const { encryptToken } = require('../utils/smsService');

/**
 * Récupérer toutes les configurations SMS
 */
exports.getAllConfigurations = async (req, res) => {
  try {
    const { actif, role_minimum } = req.query;

    const where = {};
    if (actif !== undefined) {
      where.actif = actif === 'true';
    }
    if (role_minimum) {
      where.role_minimum = role_minimum;
    }

    const configurations = await ConfigurationSMS.findAll({
      where,
      order: [['ordre_affichage', 'ASC'], ['id', 'ASC']],
      attributes: { exclude: ['api_token'] } // Ne pas exposer le token
    });

    res.json(configurations);
  } catch (error) {
    console.error('Erreur lors de la récupération des configurations SMS:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des configurations SMS',
      details: error.message
    });
  }
};

/**
 * Récupérer une configuration par ID
 */
exports.getConfigurationById = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationSMS.findByPk(id, {
      attributes: { exclude: ['api_token'] }
    });

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration SMS introuvable'
      });
    }

    res.json(configuration);
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la configuration',
      details: error.message
    });
  }
};

/**
 * Créer une nouvelle configuration
 */
exports.createConfiguration = async (req, res) => {
  try {
    const {
      libelle,
      provider,
      api_url,
      api_token,
      sender_name,
      gsm7,
      sandbox,
      role_minimum,
      actif,
      par_defaut,
      icone,
      couleur,
      notes
    } = req.body;

    // Validation
    if (!libelle || !api_token) {
      return res.status(400).json({
        error: 'Champs requis manquants (libelle et api_token sont obligatoires)'
      });
    }

    // Chiffrer le token
    const tokenChiffre = encryptToken(api_token);

    // Récupérer le dernier ordre
    const maxOrdre = await ConfigurationSMS.max('ordre_affichage') || 0;

    // Si c'est le premier, le mettre par défaut
    const isFirst = await ConfigurationSMS.count() === 0;

    // Si on définit comme par défaut, désactiver les autres
    if (par_defaut || isFirst) {
      await ConfigurationSMS.update(
        { par_defaut: false },
        { where: {} }
      );
    }

    const configuration = await ConfigurationSMS.create({
      libelle,
      provider: provider || 'smsfactor',
      api_url: api_url || null,
      api_token: tokenChiffre,
      sender_name: sender_name || null,
      gsm7: gsm7 || false,
      sandbox: sandbox || false,
      role_minimum: role_minimum || 'gestionnaire',
      actif: actif !== undefined ? actif : true,
      par_defaut: par_defaut || isFirst,
      icone: icone || 'bi-phone',
      couleur: couleur || 'success',
      notes: notes || null,
      ordre_affichage: maxOrdre + 1
    });

    // Retourner sans le token
    const result = configuration.toJSON();
    delete result.api_token;

    res.status(201).json(result);
  } catch (error) {
    console.error('Erreur lors de la création de la configuration:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la configuration',
      details: error.message
    });
  }
};

/**
 * Mettre à jour une configuration
 */
exports.updateConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      libelle,
      provider,
      api_url,
      api_token,
      sender_name,
      gsm7,
      sandbox,
      role_minimum,
      actif,
      par_defaut,
      icone,
      couleur,
      notes
    } = req.body;

    const configuration = await ConfigurationSMS.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration SMS introuvable'
      });
    }

    // Préparer les données de mise à jour
    const updateData = {};
    if (libelle !== undefined) updateData.libelle = libelle;
    if (provider !== undefined) updateData.provider = provider;
    if (api_url !== undefined) updateData.api_url = api_url || null;
    if (sender_name !== undefined) updateData.sender_name = sender_name;
    if (gsm7 !== undefined) updateData.gsm7 = gsm7;
    if (sandbox !== undefined) updateData.sandbox = sandbox;
    if (role_minimum !== undefined) updateData.role_minimum = role_minimum;
    if (actif !== undefined) updateData.actif = actif;
    if (icone !== undefined) updateData.icone = icone;
    if (couleur !== undefined) updateData.couleur = couleur;
    if (notes !== undefined) updateData.notes = notes;

    // Si le token est fourni, le chiffrer
    if (api_token && api_token !== '') {
      updateData.api_token = encryptToken(api_token);
    }

    // Si on définit comme par défaut, désactiver les autres
    if (par_defaut && !configuration.par_defaut) {
      await ConfigurationSMS.update(
        { par_defaut: false },
        { where: { id: { [require('sequelize').Op.ne]: id } } }
      );
      updateData.par_defaut = true;
    }

    await configuration.update(updateData);

    // Retourner sans le token
    const result = configuration.toJSON();
    delete result.api_token;

    res.json(result);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour de la configuration',
      details: error.message
    });
  }
};

/**
 * Supprimer une configuration
 */
exports.deleteConfiguration = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationSMS.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration SMS introuvable'
      });
    }

    // Empêcher la suppression si c'est la seule configuration
    const count = await ConfigurationSMS.count();
    if (count === 1) {
      return res.status(400).json({
        error: 'Impossible de supprimer la dernière configuration',
        suggest: 'Créez une autre configuration avant de supprimer celle-ci'
      });
    }

    // Si c'est la config par défaut, proposer d'en définir une autre
    if (configuration.par_defaut) {
      return res.status(400).json({
        error: 'Impossible de supprimer la configuration par défaut',
        suggest: 'Définissez une autre configuration par défaut avant de supprimer celle-ci'
      });
    }

    await configuration.destroy();

    res.json({
      message: 'Configuration SMS supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la configuration:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de la configuration',
      details: error.message
    });
  }
};

/**
 * Réorganiser les configurations (drag & drop)
 */
exports.reorderConfigurations = async (req, res) => {
  try {
    const { ordres } = req.body;

    if (!Array.isArray(ordres)) {
      return res.status(400).json({
        error: 'Le format des données est invalide'
      });
    }

    // Mettre à jour l'ordre de chaque configuration
    for (const item of ordres) {
      await ConfigurationSMS.update(
        { ordre_affichage: item.ordre },
        { where: { id: item.id } }
      );
    }

    res.json({
      message: 'Ordre des configurations mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réorganisation des configurations:', error);
    res.status(500).json({
      error: 'Erreur lors de la réorganisation des configurations',
      details: error.message
    });
  }
};

/**
 * Activer/désactiver une configuration
 */
exports.toggleActif = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationSMS.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration SMS introuvable'
      });
    }

    await configuration.toggleActif();

    // Retourner sans le token
    const result = configuration.toJSON();
    delete result.api_token;

    res.json({
      message: `Configuration ${configuration.actif ? 'activée' : 'désactivée'} avec succès`,
      configuration: result
    });
  } catch (error) {
    console.error('Erreur lors du changement de statut de la configuration:', error);
    res.status(500).json({
      error: 'Erreur lors du changement de statut de la configuration',
      details: error.message
    });
  }
};

/**
 * Définir une configuration comme par défaut
 */
exports.setAsDefault = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationSMS.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration SMS introuvable'
      });
    }

    await configuration.setAsDefault();

    // Retourner sans le token
    const result = configuration.toJSON();
    delete result.api_token;

    res.json({
      message: 'Configuration définie comme par défaut',
      configuration: result
    });
  } catch (error) {
    console.error('Erreur lors de la définition de la configuration par défaut:', error);
    res.status(500).json({
      error: 'Erreur lors de la définition de la configuration par défaut',
      details: error.message
    });
  }
};

/**
 * Tester une configuration SMSFactor
 */
exports.testerConnexion = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationSMS.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration SMS introuvable'
      });
    }

    const result = await configuration.testerConnexion();

    res.json(result);
  } catch (error) {
    console.error('Erreur lors du test de connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test de connexion',
      details: error.message
    });
  }
};

/**
 * Envoyer un SMS de test
 */
exports.envoyerSMSTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero } = req.body;

    if (!numero) {
      return res.status(400).json({
        error: 'Le numéro de téléphone du destinataire est requis'
      });
    }

    const configuration = await ConfigurationSMS.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration SMS introuvable'
      });
    }

    const result = await configuration.envoyerSMSTest(numero);

    res.json(result);
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS de test:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi du SMS de test',
      details: error.message
    });
  }
};

/**
 * Obtenir les crédits restants
 */
exports.getCredits = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationSMS.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration SMS introuvable'
      });
    }

    const result = await configuration.actualiserCredits();

    res.json({
      credits: result.credits,
      postpaid: result.postpaid,
      postpaid_limit: result.postpaid_limit,
      unlimited: result.unlimited,
      provider: configuration.provider
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des crédits:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des crédits',
      details: error.message
    });
  }
};
