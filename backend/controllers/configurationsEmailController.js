/**
 * Controller pour la gestion des configurations email
 */

const { ConfigurationEmail } = require('../models');
const emailService = require('../services/emailService');

/**
 * Récupérer toutes les configurations email
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

    const configurations = await ConfigurationEmail.findAll({
      where,
      order: [['ordre_affichage', 'ASC'], ['id', 'ASC']],
      attributes: { exclude: ['smtp_password'] } // Ne pas exposer le mot de passe
    });

    res.json(configurations);
  } catch (error) {
    console.error('Erreur lors de la récupération des configurations email:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des configurations email',
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

    const configuration = await ConfigurationEmail.findByPk(id, {
      attributes: { exclude: ['smtp_password'] }
    });

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration email introuvable'
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
    console.log('createConfiguration appelé avec:', req.body);
    const {
      libelle,
      email_expediteur,
      nom_expediteur,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_password,
      smtp_timeout,
      smtp_require_tls,
      role_minimum,
      actif,
      par_defaut,
      icone,
      couleur,
      notes
    } = req.body;

    // Validation
    if (!libelle || !email_expediteur || !smtp_host || !smtp_user || !smtp_password) {
      console.error('Validation échouée:', { libelle, email_expediteur, smtp_host, smtp_user, password: !!smtp_password });
      return res.status(400).json({
        error: 'Champs requis manquants'
      });
    }

    // Chiffrer le mot de passe
    const passwordChiffre = emailService.encryptPassword(smtp_password);

    // Récupérer le dernier ordre
    const maxOrdre = await ConfigurationEmail.max('ordre_affichage') || 0;

    // Si c'est le premier, le mettre par défaut
    const isFirst = await ConfigurationEmail.count() === 0;

    // Si on définit comme par défaut, désactiver les autres
    if (par_defaut || isFirst) {
      await ConfigurationEmail.update(
        { par_defaut: false },
        { where: {} }
      );
    }

    console.log('Création de la configuration...');
    const configuration = await ConfigurationEmail.create({
      libelle,
      email_expediteur,
      nom_expediteur: nom_expediteur || null,
      smtp_host,
      smtp_port: smtp_port || 587,
      smtp_secure: smtp_secure || false,
      smtp_user,
      smtp_password: passwordChiffre,
      smtp_timeout: smtp_timeout || 10000,
      smtp_require_tls: smtp_require_tls !== false,
      role_minimum: role_minimum || 'gestionnaire',
      actif: actif !== undefined ? actif : true,
      par_defaut: par_defaut || isFirst,
      icone: icone || 'bi-envelope',
      couleur: couleur || 'primary',
      notes: notes || null,
      ordre_affichage: maxOrdre + 1
    });

    // Retourner sans le mot de passe
    const result = configuration.toJSON();
    delete result.smtp_password;

    console.log('Configuration créée avec succès:', result.id);
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
      email_expediteur,
      nom_expediteur,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_password,
      smtp_timeout,
      smtp_require_tls,
      role_minimum,
      actif,
      par_defaut,
      icone,
      couleur,
      notes
    } = req.body;

    const configuration = await ConfigurationEmail.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration email introuvable'
      });
    }

    // Préparer les données de mise à jour
    const updateData = {};
    if (libelle !== undefined) updateData.libelle = libelle;
    if (email_expediteur !== undefined) updateData.email_expediteur = email_expediteur;
    if (nom_expediteur !== undefined) updateData.nom_expediteur = nom_expediteur;
    if (smtp_host !== undefined) updateData.smtp_host = smtp_host;
    if (smtp_port !== undefined) updateData.smtp_port = smtp_port;
    if (smtp_secure !== undefined) updateData.smtp_secure = smtp_secure;
    if (smtp_user !== undefined) updateData.smtp_user = smtp_user;
    if (smtp_timeout !== undefined) updateData.smtp_timeout = smtp_timeout;
    if (smtp_require_tls !== undefined) updateData.smtp_require_tls = smtp_require_tls;
    if (role_minimum !== undefined) updateData.role_minimum = role_minimum;
    if (actif !== undefined) updateData.actif = actif;
    if (icone !== undefined) updateData.icone = icone;
    if (couleur !== undefined) updateData.couleur = couleur;
    if (notes !== undefined) updateData.notes = notes;

    // Si le mot de passe est fourni, le chiffrer
    if (smtp_password && smtp_password !== '') {
      updateData.smtp_password = emailService.encryptPassword(smtp_password);
    }

    // Si on définit comme par défaut, désactiver les autres
    if (par_defaut && !configuration.par_defaut) {
      await ConfigurationEmail.update(
        { par_defaut: false },
        { where: { id: { [require('sequelize').Op.ne]: id } } }
      );
      updateData.par_defaut = true;
    }

    await configuration.update(updateData);

    // Retourner sans le mot de passe
    const result = configuration.toJSON();
    delete result.smtp_password;

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

    const configuration = await ConfigurationEmail.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration email introuvable'
      });
    }

    // Empêcher la suppression si c'est la seule configuration
    const count = await ConfigurationEmail.count();
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
      message: 'Configuration email supprimée avec succès'
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
      await ConfigurationEmail.update(
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

    const configuration = await ConfigurationEmail.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration email introuvable'
      });
    }

    await configuration.toggleActif();

    // Retourner sans le mot de passe
    const result = configuration.toJSON();
    delete result.smtp_password;

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

    const configuration = await ConfigurationEmail.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration email introuvable'
      });
    }

    await configuration.setAsDefault();

    // Retourner sans le mot de passe
    const result = configuration.toJSON();
    delete result.smtp_password;

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
 * Tester une connexion SMTP sans sauvegarder (depuis le modal)
 */
exports.testerConnexionSansSauvegarder = async (req, res) => {
  try {
    const emailService = require('../utils/emailService');
    const configData = req.body;

    // Validation des champs obligatoires
    if (!configData.smtp_host || !configData.smtp_port || !configData.smtp_user || !configData.smtp_password) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres SMTP incomplets'
      });
    }

    // Créer une configuration temporaire pour le test
    const tempConfig = {
      smtp_host: configData.smtp_host,
      smtp_port: configData.smtp_port,
      smtp_user: configData.smtp_user,
      smtp_password: configData.smtp_password,
      smtp_secure: configData.smtp_secure || false,
      smtp_require_tls: configData.smtp_require_tls !== false,
      smtp_timeout: configData.smtp_timeout || 10000
    };

    // Tester la connexion
    const result = await emailService.testConfiguration(tempConfig);

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
 * Tester une configuration SMTP
 */
exports.testerConnexion = async (req, res) => {
  try {
    const { id } = req.params;

    const configuration = await ConfigurationEmail.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration email introuvable'
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
 * Envoyer un email de test
 */
exports.envoyerEmailTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { destinataire } = req.body;

    if (!destinataire) {
      return res.status(400).json({
        error: 'L\'adresse email du destinataire est requise'
      });
    }

    const configuration = await ConfigurationEmail.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        error: 'Configuration email introuvable'
      });
    }

    const result = await configuration.envoyerEmailTest(destinataire);

    res.json(result);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de test:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi de l\'email de test',
      details: error.message
    });
  }
};
