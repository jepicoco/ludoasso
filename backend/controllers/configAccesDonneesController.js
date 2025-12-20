/**
 * Controleur pour la configuration d'acces aux donnees personnelles
 * Gestion des champs PII visibles par role
 */

const { ConfigurationAccesDonnees } = require('../models');
const accesControleService = require('../services/accesControleService');
const logger = require('../utils/logger');

// Roles disponibles (hors usager)
const ROLES = ['benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur'];

/**
 * Obtient la configuration actuelle
 * GET /api/parametres/acces-donnees
 */
exports.getConfiguration = async (req, res) => {
  try {
    const config = await ConfigurationAccesDonnees.getInstance();

    res.json({
      success: true,
      data: {
        champs_visibles_par_role: config.champs_visibles_par_role,
        acces_historique_emprunts: config.acces_historique_emprunts,
        acces_cotisations: config.acces_cotisations,
        updated_at: config.updated_at
      }
    });
  } catch (error) {
    logger.error('Erreur getConfiguration acces donnees:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recuperation de la configuration'
    });
  }
};

/**
 * Met a jour la configuration
 * PUT /api/parametres/acces-donnees
 */
exports.updateConfiguration = async (req, res) => {
  try {
    const { champs_visibles_par_role, acces_historique_emprunts, acces_cotisations } = req.body;

    const config = await ConfigurationAccesDonnees.getInstance();

    // Valider et mettre a jour les champs visibles
    if (champs_visibles_par_role) {
      // S'assurer que nom et prenom sont toujours inclus
      const validated = {};
      for (const role of ROLES) {
        if (role === 'administrateur') continue; // Admin voit tout

        const champs = champs_visibles_par_role[role] || [];
        // Forcer nom et prenom
        if (!champs.includes('nom')) champs.push('nom');
        if (!champs.includes('prenom')) champs.push('prenom');
        validated[role] = champs;
      }
      // Admin a toujours tous les champs
      validated.administrateur = ConfigurationAccesDonnees.PII_FIELDS;
      config.champs_visibles_par_role = validated;
    }

    // Mettre a jour les permissions emprunts
    if (acces_historique_emprunts) {
      const emprunts = { administrateur: true };
      for (const role of ROLES.slice(0, -1)) {
        emprunts[role] = acces_historique_emprunts[role] === true;
      }
      config.acces_historique_emprunts = emprunts;
    }

    // Mettre a jour les permissions cotisations
    if (acces_cotisations) {
      const cotisations = { administrateur: true };
      for (const role of ROLES.slice(0, -1)) {
        cotisations[role] = acces_cotisations[role] === true;
      }
      config.acces_cotisations = cotisations;
    }

    await config.save();

    // Invalider le cache du service
    accesControleService.clearCache();

    logger.info('Configuration acces donnees mise a jour par', req.user?.email);

    res.json({
      success: true,
      message: 'Configuration mise a jour',
      data: {
        champs_visibles_par_role: config.champs_visibles_par_role,
        acces_historique_emprunts: config.acces_historique_emprunts,
        acces_cotisations: config.acces_cotisations
      }
    });
  } catch (error) {
    logger.error('Erreur updateConfiguration acces donnees:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise a jour de la configuration'
    });
  }
};

/**
 * Obtient les champs PII disponibles (pour l'UI)
 * GET /api/parametres/acces-donnees/champs
 */
exports.getChampsDisponibles = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        champs: accesControleService.getPIIFields(),
        roles: accesControleService.getRoles()
      }
    });
  } catch (error) {
    logger.error('Erreur getChampsDisponibles:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recuperation des champs'
    });
  }
};

/**
 * Obtient la configuration effective pour un role donne
 * GET /api/parametres/acces-donnees/role/:role
 */
exports.getConfigForRole = async (req, res) => {
  try {
    const { role } = req.params;

    if (!ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role invalide',
        valid_roles: ROLES
      });
    }

    const champsVisibles = await accesControleService.getChampsVisibles(role);
    const peutVoirEmprunts = await accesControleService.peutVoirHistoriqueEmprunts(role);
    const peutVoirCotisations = await accesControleService.peutVoirCotisations(role);

    res.json({
      success: true,
      data: {
        role,
        champs_visibles: champsVisibles,
        acces_historique_emprunts: peutVoirEmprunts,
        acces_cotisations: peutVoirCotisations
      }
    });
  } catch (error) {
    logger.error('Erreur getConfigForRole:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recuperation de la configuration du role'
    });
  }
};

/**
 * Reinitialise la configuration aux valeurs par defaut
 * POST /api/parametres/acces-donnees/reset
 */
exports.resetConfiguration = async (req, res) => {
  try {
    const config = await ConfigurationAccesDonnees.getInstance();

    config.champs_visibles_par_role = ConfigurationAccesDonnees.DEFAULT_CHAMPS;
    config.acces_historique_emprunts = ConfigurationAccesDonnees.DEFAULT_EMPRUNTS;
    config.acces_cotisations = ConfigurationAccesDonnees.DEFAULT_COTISATIONS;

    await config.save();

    // Invalider le cache
    accesControleService.clearCache();

    logger.info('Configuration acces donnees reinitialisee par', req.user?.email);

    res.json({
      success: true,
      message: 'Configuration reinitialisee aux valeurs par defaut',
      data: {
        champs_visibles_par_role: config.champs_visibles_par_role,
        acces_historique_emprunts: config.acces_historique_emprunts,
        acces_cotisations: config.acces_cotisations
      }
    });
  } catch (error) {
    logger.error('Erreur resetConfiguration:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la reinitialisation'
    });
  }
};
