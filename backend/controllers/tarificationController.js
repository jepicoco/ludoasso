/**
 * Contrôleur Tarification Avancée
 * API pour le calcul et la simulation des tarifs de cotisation
 */

const { Op } = require('sequelize');
const tarifCalculService = require('../services/tarifCalculService');
const quotientFamilialService = require('../services/quotientFamilialService');
const {
  TypeTarif, ConfigurationQuotientFamilial, TrancheQuotientFamilial,
  RegleReduction, HistoriqueQuotientFamilial, Utilisateur
} = require('../models');
const logger = require('../utils/logger');

// ============================================================
// SIMULATION ET CALCUL
// ============================================================

/**
 * Simuler le calcul d'une cotisation
 * POST /api/tarification/simuler
 */
exports.simulerCotisation = async (req, res) => {
  try {
    const { utilisateur_id, tarif_cotisation_id, date_cotisation, structure_id } = req.body;

    if (!utilisateur_id || !tarif_cotisation_id) {
      return res.status(400).json({
        error: 'utilisateur_id et tarif_cotisation_id requis'
      });
    }

    const simulation = await tarifCalculService.simulerCotisation(
      utilisateur_id,
      tarif_cotisation_id,
      {
        dateCotisation: date_cotisation,
        structureId: structure_id || req.structureId,
        inclureDetails: true
      }
    );

    res.json({
      success: true,
      data: simulation
    });

  } catch (error) {
    logger.error(`Erreur simulation cotisation: ${error.message}`);
    res.status(500).json({
      error: 'Erreur lors de la simulation',
      message: error.message
    });
  }
};

/**
 * Créer une cotisation avec le calcul complet (arbre de décision inclus)
 * POST /api/tarification/creer
 */
exports.creerCotisation = async (req, res) => {
  try {
    const {
      utilisateur_id,
      tarif_cotisation_id,
      date_cotisation,
      date_paiement,
      mode_paiement,
      mode_paiement_id,
      reference_paiement,
      notes,
      code_reduction_id,
      structure_id
    } = req.body;

    if (!utilisateur_id || !tarif_cotisation_id) {
      return res.status(400).json({
        error: 'utilisateur_id et tarif_cotisation_id requis'
      });
    }

    const cotisation = await tarifCalculService.creerCotisation(
      utilisateur_id,
      tarif_cotisation_id,
      {
        dateCotisation: date_cotisation,
        datePaiement: date_paiement,
        modePaiement: mode_paiement,
        modePaiementId: mode_paiement_id,
        referencePaiement: reference_paiement,
        notes,
        codeReductionId: code_reduction_id,
        structureId: structure_id || req.structureId
      }
    );

    res.status(201).json({
      success: true,
      data: cotisation
    });

  } catch (error) {
    logger.error(`Erreur création cotisation: ${error.message}`);
    res.status(500).json({
      error: 'Erreur lors de la création de la cotisation',
      message: error.message
    });
  }
};

/**
 * Récupérer les tarifs disponibles pour un utilisateur
 * GET /api/tarification/tarifs-disponibles/:utilisateurId
 */
exports.getTarifsDisponibles = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const structureId = req.query.structure_id || req.structureId;

    const tarifs = await tarifCalculService.getTarifsDisponibles(
      parseInt(utilisateurId),
      structureId
    );

    res.json({
      success: true,
      data: tarifs
    });

  } catch (error) {
    logger.error(`Erreur tarifs disponibles: ${error.message}`);
    res.status(500).json({
      error: 'Erreur lors de la récupération des tarifs',
      message: error.message
    });
  }
};

/**
 * Récapitulatif des réductions d'une cotisation
 * GET /api/tarification/cotisation/:cotisationId/reductions
 */
exports.getRecapitulatifReductions = async (req, res) => {
  try {
    const { cotisationId } = req.params;

    const recap = await tarifCalculService.getRecapitulatifReductions(
      parseInt(cotisationId)
    );

    res.json({
      success: true,
      data: recap
    });

  } catch (error) {
    logger.error(`Erreur récapitulatif réductions: ${error.message}`);
    res.status(500).json({
      error: 'Erreur lors de la récupération du récapitulatif',
      message: error.message
    });
  }
};

// ============================================================
// TYPES DE TARIFS
// ============================================================

/**
 * Liste des types de tarifs
 * GET /api/tarification/types-tarifs
 */
exports.getTypesTarifs = async (req, res) => {
  try {
    const structureId = req.query.structure_id || req.structureId;
    const organisationId = req.query.organisation_id || req.organisationId;

    // Logique: structure_id OU organisation_id OU global (les deux null)
    const orConditions = [
      { structure_id: null, organisation_id: null } // Global
    ];
    if (structureId) {
      orConditions.push({ structure_id: structureId });
    }
    if (organisationId) {
      orConditions.push({ organisation_id: organisationId, structure_id: null });
    }

    const types = await TypeTarif.findAll({
      where: {
        actif: true,
        [Op.or]: orConditions
      },
      order: [['priorite', 'ASC']]
    });

    res.json({
      success: true,
      data: types
    });

  } catch (error) {
    logger.error(`Erreur liste types tarifs: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Créer un type de tarif
 * POST /api/tarification/types-tarifs
 */
exports.createTypeTarif = async (req, res) => {
  try {
    const {
      code, libelle, description,
      condition_age_operateur, condition_age_min, condition_age_max,
      priorite, structure_id, organisation_id
    } = req.body;

    const type = await TypeTarif.create({
      code,
      libelle,
      description,
      condition_age_operateur: condition_age_operateur || 'aucune',
      condition_age_min,
      condition_age_max,
      priorite: priorite || 100,
      structure_id: structure_id || req.structureId,
      organisation_id: organisation_id || null,
      actif: true
    });

    res.status(201).json({
      success: true,
      data: type
    });

  } catch (error) {
    logger.error(`Erreur création type tarif: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Modifier un type de tarif
 * PUT /api/tarification/types-tarifs/:id
 */
exports.updateTypeTarif = async (req, res) => {
  try {
    const { id } = req.params;
    const type = await TypeTarif.findByPk(id);

    if (!type) {
      return res.status(404).json({ error: 'Type de tarif non trouvé' });
    }

    await type.update(req.body);

    res.json({
      success: true,
      data: type
    });

  } catch (error) {
    logger.error(`Erreur modification type tarif: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============================================================
// QUOTIENT FAMILIAL - CONFIGURATION
// ============================================================

/**
 * Liste des configurations QF
 * GET /api/tarification/configurations-qf
 */
exports.getConfigurationsQF = async (req, res) => {
  try {
    const structureId = req.query.structure_id || req.structureId;
    const organisationId = req.query.organisation_id || req.organisationId;

    // Logique: structure_id OU organisation_id OU global (les deux null)
    const orConditions = [
      { structure_id: null, organisation_id: null } // Global
    ];
    if (structureId) {
      orConditions.push({ structure_id: structureId });
    }
    if (organisationId) {
      orConditions.push({ organisation_id: organisationId, structure_id: null });
    }

    const configs = await ConfigurationQuotientFamilial.findAll({
      where: {
        actif: true,
        [Op.or]: orConditions
      },
      include: [{
        model: TrancheQuotientFamilial,
        as: 'tranches',
        where: { actif: true },
        required: false,
        order: [['ordre', 'ASC']]
      }]
    });

    res.json({
      success: true,
      data: configs
    });

  } catch (error) {
    logger.error(`Erreur liste configurations QF: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Créer une configuration QF
 * POST /api/tarification/configurations-qf
 */
exports.createConfigurationQF = async (req, res) => {
  try {
    const { code, libelle, description, par_defaut, tranches, structure_id, organisation_id } = req.body;

    const config = await ConfigurationQuotientFamilial.create({
      code,
      libelle,
      description,
      par_defaut: par_defaut || false,
      structure_id: structure_id || req.structureId,
      organisation_id: organisation_id || null,
      actif: true
    });

    // Créer les tranches si fournies
    if (tranches?.length > 0) {
      for (let i = 0; i < tranches.length; i++) {
        await TrancheQuotientFamilial.create({
          configuration_qf_id: config.id,
          libelle: tranches[i].libelle,
          borne_min: tranches[i].borne_min,
          borne_max: tranches[i].borne_max,
          type_calcul: tranches[i].type_calcul || 'fixe',
          valeur: tranches[i].valeur,
          ordre: i + 1,
          actif: true
        });
      }
    }

    // Recharger avec les tranches
    const configComplete = await ConfigurationQuotientFamilial.findByPk(config.id, {
      include: [{ model: TrancheQuotientFamilial, as: 'tranches' }]
    });

    res.status(201).json({
      success: true,
      data: configComplete
    });

  } catch (error) {
    logger.error(`Erreur création configuration QF: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============================================================
// QUOTIENT FAMILIAL - UTILISATEURS
// ============================================================

/**
 * Récupérer le QF d'un utilisateur
 * GET /api/tarification/utilisateur/:id/qf
 */
exports.getUtilisateurQF = async (req, res) => {
  try {
    const { id } = req.params;
    const date = req.query.date;

    const qf = await quotientFamilialService.getQFAtDate(parseInt(id), date);
    const historique = await quotientFamilialService.getHistoriqueQF(parseInt(id));

    res.json({
      success: true,
      data: {
        actuel: qf,
        historique
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération QF: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Définir le QF d'un utilisateur
 * POST /api/tarification/utilisateur/:id/qf
 */
exports.setUtilisateurQF = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      quotient_familial, source, date_debut,
      justificatif, notes, surcharge_manuelle, propager_enfants
    } = req.body;

    if (quotient_familial === undefined) {
      return res.status(400).json({ error: 'quotient_familial requis' });
    }

    const result = await quotientFamilialService.setQF(
      parseInt(id),
      parseInt(quotient_familial),
      {
        source: source || 'manuel',
        dateDebut: date_debut,
        justificatif,
        notes,
        createdBy: req.user?.id,
        surchargeManuelle: surcharge_manuelle,
        propagerEnfants: propager_enfants !== false
      }
    );

    res.json({
      success: true,
      data: {
        historique: result.historique,
        enfants_mis_a_jour: result.enfantsMisAJour
      }
    });

  } catch (error) {
    logger.error(`Erreur définition QF: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Activer/désactiver l'héritage QF
 * PUT /api/tarification/utilisateur/:id/qf/heritage
 */
exports.setHeritageQF = async (req, res) => {
  try {
    const { id } = req.params;
    const { heriter } = req.body;

    if (heriter === undefined) {
      return res.status(400).json({ error: 'heriter (boolean) requis' });
    }

    const utilisateur = await quotientFamilialService.setHeritageQF(
      parseInt(id),
      heriter,
      req.user?.id
    );

    res.json({
      success: true,
      data: {
        id: utilisateur.id,
        quotient_familial: utilisateur.quotient_familial,
        qf_herite_parent: utilisateur.qf_herite_parent,
        qf_surcharge_manuelle: utilisateur.qf_surcharge_manuelle
      }
    });

  } catch (error) {
    logger.error(`Erreur modification héritage QF: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Importer des QF depuis un fichier
 * POST /api/tarification/qf/import
 */
exports.importerQF = async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        error: 'data doit être un tableau non vide'
      });
    }

    const result = await quotientFamilialService.importerQF(data, req.user?.id);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error(`Erreur import QF: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============================================================
// RÈGLES DE RÉDUCTION
// ============================================================

/**
 * Liste des règles de réduction
 * GET /api/tarification/regles-reduction
 */
exports.getReglesReduction = async (req, res) => {
  try {
    const structureId = req.query.structure_id || req.structureId;
    const organisationId = req.query.organisation_id || req.organisationId;

    // Logique: structure_id OU organisation_id OU global (les deux null)
    const orConditions = [
      { structure_id: null, organisation_id: null } // Global
    ];
    if (structureId) {
      orConditions.push({ structure_id: structureId });
    }
    if (organisationId) {
      orConditions.push({ organisation_id: organisationId, structure_id: null });
    }

    const regles = await RegleReduction.findAll({
      where: {
        actif: true,
        [Op.or]: orConditions
      },
      order: [['ordre_application', 'ASC']]
    });

    res.json({
      success: true,
      data: regles
    });

  } catch (error) {
    logger.error(`Erreur liste règles réduction: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Créer une règle de réduction
 * POST /api/tarification/regles-reduction
 */
exports.createRegleReduction = async (req, res) => {
  try {
    const {
      code, libelle, description, type_source, type_calcul, valeur,
      ordre_application, condition_json, section_analytique_id, regroupement_analytique_id,
      cumulable, permet_avoir, structure_id, organisation_id
    } = req.body;

    const regle = await RegleReduction.create({
      code,
      libelle,
      description,
      type_source,
      type_calcul: type_calcul || 'fixe',
      valeur,
      ordre_application: ordre_application || 100,
      condition_json,
      cumulable: cumulable !== false,
      permet_avoir: permet_avoir === true,
      section_analytique_id,
      regroupement_analytique_id,
      structure_id: structure_id || req.structureId,
      organisation_id: organisation_id || null,
      actif: true
    });

    res.status(201).json({
      success: true,
      data: regle
    });

  } catch (error) {
    logger.error(`Erreur création règle réduction: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Modifier une règle de réduction
 * PUT /api/tarification/regles-reduction/:id
 */
exports.updateRegleReduction = async (req, res) => {
  try {
    const { id } = req.params;
    const regle = await RegleReduction.findByPk(id);

    if (!regle) {
      return res.status(404).json({ error: 'Règle de réduction non trouvée' });
    }

    await regle.update(req.body);

    res.json({
      success: true,
      data: regle
    });

  } catch (error) {
    logger.error(`Erreur modification règle réduction: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Supprimer (désactiver) une règle de réduction
 * DELETE /api/tarification/regles-reduction/:id
 */
exports.deleteRegleReduction = async (req, res) => {
  try {
    const { id } = req.params;
    const regle = await RegleReduction.findByPk(id);

    if (!regle) {
      return res.status(404).json({ error: 'Règle de réduction non trouvée' });
    }

    await regle.update({ actif: false });

    res.json({
      success: true,
      message: 'Règle de réduction désactivée'
    });

  } catch (error) {
    logger.error(`Erreur suppression règle réduction: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
