/**
 * Controleur Arbre de Decision Tarifaire
 * API pour la gestion des arbres de decision
 */

const arbreDecisionService = require('../services/arbreDecisionService');
const { ArbreDecision, TarifCotisation, Utilisateur } = require('../models');
const logger = require('../utils/logger');

// ============================================================
// CRUD ARBRE
// ============================================================

/**
 * Recupere l'arbre d'un tarif
 * GET /api/arbres-decision/tarif/:tarifId
 */
exports.getArbre = async (req, res) => {
  try {
    const { tarifId } = req.params;

    const arbre = await arbreDecisionService.getArbreByTarif(parseInt(tarifId));

    if (!arbre) {
      return res.status(404).json({
        success: false,
        error: 'Aucun arbre de decision pour ce tarif'
      });
    }

    // Recuperer les bornes de tarif
    const tarif = await TarifCotisation.findByPk(tarifId);
    const montantBase = parseFloat(tarif?.montant_base) || 0;
    const bornes = arbre.calculerBornes(montantBase);

    res.json({
      success: true,
      data: {
        ...arbre.toJSON(),
        bornes,
        montant_base: montantBase,
        tarif: tarif ? {
          id: tarif.id,
          libelle: tarif.libelle,
          montant_base: montantBase
        } : null
      }
    });

  } catch (error) {
    logger.error(`Erreur getArbre: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Cree un arbre pour un tarif
 * POST /api/arbres-decision/tarif/:tarifId
 */
exports.creerArbre = async (req, res) => {
  try {
    const { tarifId } = req.params;
    const { mode_affichage, arbre_json } = req.body;

    // Verifier que le tarif existe
    const tarif = await TarifCotisation.findByPk(tarifId);
    if (!tarif) {
      return res.status(404).json({
        success: false,
        error: 'Tarif de cotisation non trouve'
      });
    }

    const arbre = await arbreDecisionService.creerArbre(
      parseInt(tarifId),
      { mode_affichage, arbre_json },
      req.structureId
    );

    res.status(201).json({
      success: true,
      data: arbre
    });

  } catch (error) {
    logger.error(`Erreur creerArbre: ${error.message}`);
    if (error.message.includes('existe deja')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Modifie un arbre
 * PUT /api/arbres-decision/:id
 */
exports.modifierArbre = async (req, res) => {
  try {
    const { id } = req.params;
    const { mode_affichage, arbre_json } = req.body;

    const arbre = await arbreDecisionService.modifierArbre(
      parseInt(id),
      { mode_affichage, arbre_json }
    );

    res.json({
      success: true,
      data: arbre
    });

  } catch (error) {
    logger.error(`Erreur modifierArbre: ${error.message}`);
    if (error.message.includes('verrouille')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Supprime un arbre
 * DELETE /api/arbres-decision/:id
 */
exports.supprimerArbre = async (req, res) => {
  try {
    const { id } = req.params;

    const arbre = await ArbreDecision.findByPk(id);
    if (!arbre) {
      return res.status(404).json({
        success: false,
        error: 'Arbre non trouve'
      });
    }

    if (arbre.verrouille) {
      return res.status(403).json({
        success: false,
        error: 'Impossible de supprimer un arbre verrouille'
      });
    }

    await arbre.destroy();

    res.json({
      success: true,
      message: 'Arbre supprime'
    });

  } catch (error) {
    logger.error(`Erreur supprimerArbre: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

// ============================================================
// SIMULATION
// ============================================================

/**
 * Simule le calcul d'un arbre pour un utilisateur
 * POST /api/arbres-decision/:id/simuler
 */
exports.simulerArbre = async (req, res) => {
  try {
    const { id } = req.params;
    const { utilisateur_id, utilisateur_data, montant_base, date_cotisation } = req.body;

    let utilisateur;
    if (utilisateur_id) {
      utilisateur = await Utilisateur.findByPk(utilisateur_id);
      if (!utilisateur) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouve'
        });
      }
    } else if (utilisateur_data) {
      // Simulation avec donnees manuelles
      utilisateur = utilisateur_data;
    } else {
      return res.status(400).json({
        success: false,
        error: 'utilisateur_id ou utilisateur_data requis'
      });
    }

    const arbre = await ArbreDecision.findByPk(id, {
      include: [{ model: TarifCotisation, as: 'tarifCotisation' }]
    });

    if (!arbre) {
      return res.status(404).json({
        success: false,
        error: 'Arbre non trouve'
      });
    }

    const montant = montant_base || arbre.tarifCotisation?.montant || 0;

    const resultat = await arbreDecisionService.evaluerArbre(
      parseInt(id),
      utilisateur,
      {
        montantBase: montant,
        dateCotisation: date_cotisation || new Date(),
        structureId: req.structureId
      }
    );

    res.json({
      success: true,
      data: {
        montant_base: montant,
        total_reductions: resultat.totalReductions,
        montant_final: Math.max(0, montant - resultat.totalReductions),
        reductions: resultat.reductions,
        chemin: resultat.chemin,
        trace: resultat.trace,  // Trace detaillee de l'evaluation
        utilisateur_teste: utilisateur  // Donnees utilisees pour debug
      }
    });

  } catch (error) {
    logger.error(`Erreur simulerArbre: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

// ============================================================
// VERROUILLAGE
// ============================================================

/**
 * Recupere le statut de verrouillage
 * GET /api/arbres-decision/:id/statut
 */
exports.getStatut = async (req, res) => {
  try {
    const { id } = req.params;

    const arbre = await ArbreDecision.findByPk(id);
    if (!arbre) {
      return res.status(404).json({
        success: false,
        error: 'Arbre non trouve'
      });
    }

    res.json({
      success: true,
      data: {
        id: arbre.id,
        verrouille: arbre.verrouille,
        date_verrouillage: arbre.date_verrouillage,
        version: arbre.version,
        modifiable: !arbre.verrouille
      }
    });

  } catch (error) {
    logger.error(`Erreur getStatut: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Duplique un arbre (cree nouvelle version modifiable)
 * POST /api/arbres-decision/:id/dupliquer
 */
exports.dupliquerArbre = async (req, res) => {
  try {
    const { id } = req.params;

    const arbre = await arbreDecisionService.dupliquerArbre(parseInt(id));

    res.json({
      success: true,
      data: arbre,
      message: 'Arbre deverrouille pour modification'
    });

  } catch (error) {
    logger.error(`Erreur dupliquerArbre: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

// ============================================================
// TYPES DE CONDITION
// ============================================================

/**
 * Liste des types de condition
 * GET /api/arbres-decision/types-condition
 */
exports.getTypesCondition = async (req, res) => {
  try {
    const types = await arbreDecisionService.getTypesCondition();

    res.json({
      success: true,
      data: types
    });

  } catch (error) {
    logger.error(`Erreur getTypesCondition: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

// ============================================================
// OPERATIONS COMPTABLES
// ============================================================

/**
 * Liste des operations comptables
 * GET /api/arbres-decision/operations-reduction
 */
exports.getOperationsReduction = async (req, res) => {
  try {
    const operations = await arbreDecisionService.getOperationsComptables(req.structureId);

    res.json({
      success: true,
      data: operations
    });

  } catch (error) {
    logger.error(`Erreur getOperationsReduction: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

/**
 * Cree une operation comptable
 * POST /api/arbres-decision/operations-reduction
 */
exports.creerOperationReduction = async (req, res) => {
  try {
    const operation = await arbreDecisionService.creerOperationComptable({
      ...req.body,
      structure_id: req.body.structure_id || req.structureId
    });

    res.status(201).json({
      success: true,
      data: operation
    });

  } catch (error) {
    logger.error(`Erreur creerOperationReduction: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

// ============================================================
// EXPORT COMPTABLE
// ============================================================

/**
 * Export des reductions par operation
 * GET /api/arbres-decision/reductions/export
 */
exports.exportReductions = async (req, res) => {
  try {
    const { date_debut, date_fin, format } = req.query;

    if (!date_debut || !date_fin) {
      return res.status(400).json({
        success: false,
        error: 'date_debut et date_fin requis'
      });
    }

    const reductions = await arbreDecisionService.exportReductionsParOperation(
      date_debut,
      date_fin,
      req.structureId
    );

    if (format === 'csv') {
      // Generer CSV
      let csv = 'Type Source;Operation;Code Compte;Total Reductions;Nombre\n';
      for (const r of reductions) {
        csv += `${r.type_source};${r.operationComptable?.libelle || 'N/A'};${r.operationComptable?.compte_comptable || ''};${r.total};${r.count}\n`;
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=reductions_${date_debut}_${date_fin}.csv`);
      return res.send(csv);
    }

    res.json({
      success: true,
      data: reductions,
      periode: { date_debut, date_fin }
    });

  } catch (error) {
    logger.error(`Erreur exportReductions: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};
