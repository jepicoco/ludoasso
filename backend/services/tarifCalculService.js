/**
 * Service de Calcul de Tarif Cotisation
 * Orchestre le calcul complet du tarif avec toutes les réductions
 */

const {
  Utilisateur, TarifCotisation, TypeTarif, TarifTypeTarif,
  ConfigurationQuotientFamilial, TrancheQuotientFamilial,
  RegleReduction, HistoriqueQuotientFamilial, Cotisation,
  CotisationReduction, Commune, ArbreDecision, sequelize
} = require('../models');
const quotientFamilialService = require('./quotientFamilialService');
const arbreDecisionService = require('./arbreDecisionService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Calcule l'âge d'un utilisateur à une date donnée
 * @param {Date|string} dateNaissance - Date de naissance
 * @param {Date|string} dateReference - Date de référence (défaut: aujourd'hui)
 * @returns {number|null}
 */
function calculerAge(dateNaissance, dateReference = new Date()) {
  if (!dateNaissance) return null;

  const naissance = new Date(dateNaissance);
  const reference = new Date(dateReference);

  let age = reference.getFullYear() - naissance.getFullYear();
  const moisDiff = reference.getMonth() - naissance.getMonth();

  if (moisDiff < 0 || (moisDiff === 0 && reference.getDate() < naissance.getDate())) {
    age--;
  }

  return age;
}

/**
 * Trouve le type de tarif applicable selon l'âge
 * @param {number|null} age - Âge de l'utilisateur
 * @param {number|null} structureId - ID de la structure
 * @returns {Object|null} TypeTarif applicable
 */
async function trouverTypeTarif(age, structureId = null) {
  if (age === null) {
    // Pas d'âge = tarif STANDARD
    return await TypeTarif.findOne({
      where: {
        code: 'STANDARD',
        actif: true,
        [Op.or]: [
          { structure_id: structureId },
          { structure_id: null }
        ]
      }
    });
  }

  return await TypeTarif.findByAge(age, structureId);
}

/**
 * Trouve le montant de base pour un tarif et un type de tarif
 * Cherche d'abord dans TarifTypeTarif (montants par type),
 * sinon utilise le montant_base du TarifCotisation
 * @param {number} tarifCotisationId - ID du tarif de cotisation
 * @param {number|null} typeTarifId - ID du type de tarif
 * @returns {Object} { tarif, montantBase, sourceMontan }
 */
async function trouverMontantPourType(tarifCotisationId, typeTarifId = null) {
  // Charger le tarif de cotisation de base
  const tarif = await TarifCotisation.findByPk(tarifCotisationId, {
    include: [
      {
        model: TarifTypeTarif,
        as: 'montantsParType',
        where: { actif: true },
        required: false,
        include: [{ model: TypeTarif, as: 'typeTarif' }]
      }
    ]
  });

  if (!tarif) {
    return null;
  }

  // Chercher le montant spécifique pour ce type de tarif
  if (typeTarifId && tarif.montantsParType?.length > 0) {
    const montantType = tarif.montantsParType.find(
      m => m.type_tarif_id === typeTarifId
    );

    if (montantType) {
      return {
        tarif,
        montantBase: parseFloat(montantType.montant_base),
        sourceMontant: 'type_tarif',
        typeTarifInfo: montantType.typeTarif
      };
    }
  }

  // Sinon utiliser le montant de base du tarif
  return {
    tarif,
    montantBase: parseFloat(tarif.montant_base),
    sourceMontant: 'tarif_base',
    typeTarifInfo: null
  };
}

/**
 * Trouve le tarif de cotisation pour un type de tarif (retrocompat)
 * @deprecated Utiliser trouverMontantPourType à la place
 * @param {number} typeTarifId - ID du type de tarif
 * @param {number} tarifCotisationId - ID du tarif de cotisation de base
 * @param {number|null} structureId - ID de la structure
 * @returns {Object|null} TarifCotisation applicable
 */
async function trouverTarifPourType(typeTarifId, tarifCotisationId, structureId = null) {
  // Chercher un tarif spécifique pour ce type
  let tarif = await TarifCotisation.findOne({
    where: {
      type_tarif_id: typeTarifId,
      actif: true,
      [Op.or]: [
        { structure_id: structureId },
        { structure_id: null }
      ]
    }
  });

  // Si pas de tarif spécifique, utiliser le tarif de base
  if (!tarif && tarifCotisationId) {
    tarif = await TarifCotisation.findByPk(tarifCotisationId);
  }

  return tarif;
}

/**
 * Collecte les règles de réduction applicables
 * @param {Object} utilisateur - Utilisateur complet avec relations
 * @param {Object} context - Contexte (structureId, dateCotisation, etc.)
 * @returns {Array} Règles applicables ordonnées par priorité
 */
async function collecterReglesApplicables(utilisateur, context) {
  // Récupérer toutes les règles actives pour la structure
  const regles = await RegleReduction.findAll({
    where: {
      actif: true,
      [Op.or]: [
        { structure_id: context.structureId },
        { structure_id: null }
      ]
    },
    order: [['ordre_application', 'ASC']]
  });

  const reglesApplicables = [];

  for (const regle of regles) {
    if (regle.matchUtilisateur(utilisateur, context)) {
      reglesApplicables.push(regle);
    }
  }

  return reglesApplicables;
}

/**
 * Applique les réductions sur un montant de base
 * @param {number} montantBase - Montant de base
 * @param {Array} regles - Règles à appliquer
 * @param {Object} contexte - Contexte pour traçabilité
 * @returns {Object} { montantFinal, reductions[], totalReductions }
 */
function appliquerReductions(montantBase, regles, contexte = {}) {
  let montantCourant = montantBase;
  const reductions = [];
  let totalReductions = 0;

  for (let i = 0; i < regles.length; i++) {
    const regle = regles[i];
    const baseCalcul = montantCourant;
    const montantReduction = regle.calculerMontant(baseCalcul);

    // Ne pas descendre en dessous de 0
    const reductionEffective = Math.min(montantReduction, montantCourant);

    reductions.push({
      regle_reduction_id: regle.id,
      type_source: regle.type_source,
      libelle: regle.libelle,
      type_calcul: regle.type_calcul,
      valeur: parseFloat(regle.valeur),
      montant_reduction: reductionEffective,
      ordre_application: i + 1,
      base_calcul: baseCalcul,
      contexte_json: { ...contexte, regle_code: regle.code },
      section_analytique_id: regle.section_analytique_id,
      regroupement_analytique_id: regle.regroupement_analytique_id
    });

    montantCourant -= reductionEffective;
    totalReductions += reductionEffective;
  }

  return {
    montantFinal: Math.max(0, montantCourant),
    reductions,
    totalReductions
  };
}

/**
 * Simule le calcul d'une cotisation sans la créer
 * @param {number} utilisateurId - ID de l'utilisateur
 * @param {number} tarifCotisationId - ID du tarif de cotisation
 * @param {Object} options - Options
 * @param {Date} options.dateCotisation - Date de la cotisation (défaut: aujourd'hui)
 * @param {number} options.structureId - ID de la structure
 * @param {boolean} options.inclureDetails - Inclure les détails de calcul
 * @returns {Object} Résultat de la simulation
 */
async function simulerCotisation(utilisateurId, tarifCotisationId, options = {}) {
  const dateCotisation = options.dateCotisation || new Date();
  const structureId = options.structureId || null;

  // 1. Charger l'utilisateur avec toutes les relations nécessaires
  const utilisateur = await Utilisateur.findByPk(utilisateurId, {
    include: [
      {
        model: Utilisateur,
        as: 'parent',
        attributes: ['id', 'quotient_familial']
      },
      {
        model: Utilisateur,
        as: 'enfants',
        attributes: ['id']
      },
      {
        model: Commune,
        as: 'communeResidence',
        required: false
      },
      {
        model: Commune,
        as: 'communePriseEnCharge',
        required: false
      }
    ]
  });

  if (!utilisateur) {
    throw new Error('Utilisateur non trouvé');
  }

  // 2. Calculer l'âge à la date de cotisation
  const age = calculerAge(utilisateur.date_naissance, dateCotisation);

  // 3. Trouver le type de tarif selon l'âge
  const typeTarif = await trouverTypeTarif(age, structureId);

  // 4. Trouver le tarif et le montant applicable pour ce type
  const tarifInfo = await trouverMontantPourType(tarifCotisationId, typeTarif?.id);

  if (!tarifInfo) {
    throw new Error('Aucun tarif applicable trouvé');
  }

  const { tarif, montantBase: montantTarif, sourceMontant } = tarifInfo;

  // 5. Récupérer le QF de l'utilisateur
  const qfInfo = await quotientFamilialService.getQFAtDate(utilisateurId, dateCotisation);

  // 6. Calculer le montant selon le QF (si applicable)
  let montantBase = montantTarif;
  let trancheQF = null;
  let montantQF = null;

  if (qfInfo.quotient_familial !== null) {
    const calculQF = await quotientFamilialService.calculerMontantQF(
      qfInfo.quotient_familial,
      montantBase,
      null, // configurationId
      structureId,
      typeTarif?.id // typeTarifId pour valeurs QF par type
    );

    if (calculQF.tranche) {
      trancheQF = calculQF.tranche;
      trancheQF.valeur_specifique_type = calculQF.valeur_specifique_type;
      montantQF = calculQF.montant;
      // Le montant QF devient la nouvelle base
      montantBase = montantQF;
    }
  }

  // 7. Construire le contexte pour les règles de réduction
  const contexteReduction = {
    structureId,
    dateCotisation,
    age,
    quotientFamilial: qfInfo.quotient_familial,
    nombreEnfants: utilisateur.enfants?.length || 0,
    anneesAnciennete: calculerAnciennete(utilisateur.date_premiere_adhesion, dateCotisation)
  };

  // 8. Collecter et appliquer les règles de réduction (ancien système)
  const reglesApplicables = await collecterReglesApplicables(utilisateur, contexteReduction);
  const resultatReductions = appliquerReductions(montantBase, reglesApplicables, contexteReduction);

  // 8.5 Evaluer l'arbre de décision si un existe pour ce tarif
  let arbreInfo = null;
  let reductionsArbre = [];
  let cheminArbre = [];
  let traceArbre = [];

  try {
    const arbre = await arbreDecisionService.getArbreByTarif(tarifCotisationId);

    if (arbre && arbre.arbre_json?.noeuds?.length > 0) {
      // Préparer les données utilisateur pour l'évaluation
      const utilisateurPourArbre = {
        ...utilisateur.toJSON ? utilisateur.toJSON() : utilisateur,
        commune_id: utilisateur.commune_prise_en_charge_id || utilisateur.commune_id,
        quotient_familial: qfInfo.quotient_familial,
        date_naissance: utilisateur.date_naissance,
        date_premiere_adhesion: utilisateur.date_premiere_adhesion,
        tags: utilisateur.tags || []
      };

      const contexteArbre = {
        montantBase: resultatReductions.montantFinal, // Appliquer sur le montant après règles
        dateCotisation,
        structureId
      };

      const resultatArbre = await arbreDecisionService.evaluerArbre(
        arbre.id,
        utilisateurPourArbre,
        contexteArbre
      );

      if (resultatArbre.reductions?.length > 0) {
        // Convertir les réductions de l'arbre au format attendu
        reductionsArbre = resultatArbre.reductions.map((r, index) => ({
          regle_reduction_id: null,
          arbre_decision_id: arbre.id,
          type_source: `ARBRE_${r.type_source}`,
          libelle: r.branche_libelle || `Réduction ${r.type_source}`,
          type_calcul: r.type_calcul,
          valeur: parseFloat(r.valeur),
          montant_reduction: r.montant_reduction,
          ordre_application: resultatReductions.reductions.length + index + 1,
          base_calcul: contexteArbre.montantBase,
          contexte_json: {
            arbre_id: arbre.id,
            branche_code: r.branche_code,
            type_source: r.type_source
          }
        }));

        cheminArbre = resultatArbre.chemin;
        traceArbre = resultatArbre.trace;
      }

      arbreInfo = {
        id: arbre.id,
        version: arbre.version,
        verrouille: arbre.verrouille,
        mode_affichage: arbre.mode_affichage
      };
    }
  } catch (error) {
    logger.warn(`Erreur évaluation arbre pour tarif ${tarifCotisationId}: ${error.message}`);
    // Continuer sans l'arbre en cas d'erreur
  }

  // Fusionner les réductions
  const toutesReductions = [...resultatReductions.reductions, ...reductionsArbre];
  const totalReductionsArbre = reductionsArbre.reduce((sum, r) => sum + r.montant_reduction, 0);
  const totalReductionsFinal = resultatReductions.totalReductions + totalReductionsArbre;
  const montantFinal = Math.max(0, montantBase - totalReductionsFinal);

  // 9. Construire le résultat
  const resultat = {
    utilisateur: {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      age,
      quotient_familial: qfInfo.quotient_familial,
      qf_source: qfInfo.source,
      qf_herite_de: qfInfo.herite_de
    },
    tarif: {
      id: tarif.id,
      libelle: tarif.libelle,
      montant_catalogue: montantTarif,
      montant_base_tarif: parseFloat(tarif.montant_base),
      source_montant: sourceMontant
    },
    type_tarif: typeTarif ? {
      id: typeTarif.id,
      code: typeTarif.code,
      libelle: typeTarif.libelle
    } : null,
    calcul: {
      tarif_base: montantTarif,
      montant_apres_qf: montantBase,
      total_reductions: totalReductionsFinal,
      montant_final: montantFinal
    },
    tranche_qf: trancheQF,
    reductions: toutesReductions,
    commune: utilisateur.communePriseEnCharge || utilisateur.communeResidence ? {
      id: (utilisateur.communePriseEnCharge || utilisateur.communeResidence).id,
      nom: (utilisateur.communePriseEnCharge || utilisateur.communeResidence).nom
    } : null,
    // Informations sur l'arbre de décision
    arbre_decision: arbreInfo,
    chemin_arbre: cheminArbre.length > 0 ? cheminArbre : null,
    trace_arbre: traceArbre.length > 0 ? traceArbre : null
  };

  // Détails pour audit si demandé
  if (options.inclureDetails) {
    resultat.detail_calcul = {
      date_simulation: new Date().toISOString(),
      date_cotisation: dateCotisation,
      structure_id: structureId,
      regles_evaluees: reglesApplicables.map(r => ({
        id: r.id,
        code: r.code,
        libelle: r.libelle,
        type_source: r.type_source
      })),
      arbre_decision_id: arbreInfo?.id,
      arbre_version: arbreInfo?.version,
      contexte: contexteReduction
    };
  }

  return resultat;
}

/**
 * Calcule l'ancienneté en années
 * @param {Date|string} datePremiereAdhesion - Date de première adhésion
 * @param {Date|string} dateReference - Date de référence
 * @returns {number}
 */
function calculerAnciennete(datePremiereAdhesion, dateReference = new Date()) {
  if (!datePremiereAdhesion) return 0;

  const premiere = new Date(datePremiereAdhesion);
  const reference = new Date(dateReference);

  const diffMs = reference - premiere;
  const diffAnnees = diffMs / (1000 * 60 * 60 * 24 * 365.25);

  return Math.floor(diffAnnees);
}

/**
 * Crée une cotisation avec calcul complet des réductions
 * @param {number} utilisateurId - ID de l'utilisateur
 * @param {number} tarifCotisationId - ID du tarif de cotisation
 * @param {Object} data - Données de la cotisation
 * @param {Date} data.periode_debut - Date de début de période
 * @param {Date} data.periode_fin - Date de fin de période
 * @param {Date} data.date_paiement - Date de paiement
 * @param {string} data.mode_paiement - Mode de paiement
 * @param {string} data.reference_paiement - Référence de paiement
 * @param {string} data.notes - Notes
 * @param {number} data.structureId - ID de la structure
 * @param {Array} data.reductionsManuelles - Réductions manuelles à ajouter
 * @param {number} createdBy - ID de l'utilisateur qui crée
 * @returns {Object} Cotisation créée avec ses réductions
 */
async function creerCotisation(utilisateurId, tarifCotisationId, data, createdBy = null) {
  const transaction = await sequelize.transaction();

  try {
    // 1. Simuler le calcul
    const simulation = await simulerCotisation(utilisateurId, tarifCotisationId, {
      dateCotisation: data.periode_debut || new Date(),
      structureId: data.structureId,
      inclureDetails: true
    });

    // 2. Récupérer l'historique QF actuel pour le lier
    const historiqueQF = await HistoriqueQuotientFamilial.getCurrentQF(utilisateurId);

    // 3. Créer la cotisation
    const cotisation = await Cotisation.create({
      utilisateur_id: utilisateurId,
      tarif_cotisation_id: tarifCotisationId,
      periode_debut: data.periode_debut,
      periode_fin: data.periode_fin,
      montant_base: simulation.calcul.tarif_base,
      reduction_appliquee: simulation.calcul.total_reductions,
      montant_paye: simulation.calcul.montant_final,
      date_paiement: data.date_paiement || new Date(),
      mode_paiement: data.mode_paiement || 'especes',
      reference_paiement: data.reference_paiement,
      notes: data.notes,
      statut: 'en_cours',
      structure_id: data.structureId,
      // Champs tarification avancée
      type_tarif_id: simulation.type_tarif?.id,
      tarif_base: simulation.calcul.montant_apres_qf,
      total_reductions: simulation.calcul.total_reductions,
      historique_qf_id: historiqueQF?.id,
      quotient_familial_snapshot: simulation.utilisateur.quotient_familial,
      tranche_qf_id: simulation.tranche_qf?.id,
      commune_id_snapshot: simulation.commune?.id,
      age_snapshot: simulation.utilisateur.age,
      detail_calcul_json: simulation.detail_calcul,
      // Champs arbre de décision
      arbre_decision_id: simulation.arbre_decision?.id || null,
      arbre_version: simulation.arbre_decision?.version || null,
      chemin_arbre_json: simulation.chemin_arbre || null
    }, { transaction });

    // 4. Créer les réductions liées
    for (const reduction of simulation.reductions) {
      await CotisationReduction.create({
        cotisation_id: cotisation.id,
        ...reduction
      }, { transaction });
    }

    // 5. Ajouter les réductions manuelles si présentes
    if (data.reductionsManuelles?.length > 0) {
      for (const reductionManuelle of data.reductionsManuelles) {
        await CotisationReduction.createManuelle({
          cotisation_id: cotisation.id,
          ...reductionManuelle,
          base_calcul: simulation.calcul.montant_final
        }, { transaction });
      }

      // Recalculer le montant final
      const totalReductionsManuelles = await CotisationReduction.getTotalReductions(cotisation.id);
      const nouveauMontant = Math.max(0, simulation.calcul.tarif_base - totalReductionsManuelles);
      await cotisation.update({
        total_reductions: totalReductionsManuelles,
        montant_paye: nouveauMontant
      }, { transaction });
    }

    // 6. Mettre à jour la date de fin d'adhésion de l'utilisateur
    await Utilisateur.update(
      { date_fin_adhesion: data.periode_fin },
      { where: { id: utilisateurId }, transaction }
    );

    await transaction.commit();

    // 7. Verrouiller l'arbre de décision s'il a été utilisé
    if (simulation.arbre_decision?.id) {
      try {
        await arbreDecisionService.verrouillerArbre(simulation.arbre_decision.id);
        logger.info(`Arbre de décision ${simulation.arbre_decision.id} verrouillé`);
      } catch (error) {
        logger.warn(`Erreur verrouillage arbre: ${error.message}`);
        // Ne pas bloquer la création de la cotisation
      }
    }

    logger.info(`Cotisation créée: ${cotisation.id}`, {
      utilisateurId,
      montant: cotisation.montant_paye,
      reductions: simulation.reductions.length,
      arbreId: simulation.arbre_decision?.id
    });

    // 7. Recharger avec relations
    return await Cotisation.findByPk(cotisation.id, {
      include: [
        { model: CotisationReduction, as: 'reductions' },
        { model: TypeTarif, as: 'typeTarif' },
        { model: TrancheQuotientFamilial, as: 'trancheQF' }
      ]
    });

  } catch (error) {
    await transaction.rollback();
    logger.error(`Erreur création cotisation: ${error.message}`, { utilisateurId });
    throw error;
  }
}

/**
 * Récupère les tarifs disponibles pour un utilisateur
 * @param {number} utilisateurId - ID de l'utilisateur
 * @param {number|null} structureId - ID de la structure
 * @returns {Array} Liste des tarifs avec simulation
 */
async function getTarifsDisponibles(utilisateurId, structureId = null) {
  const tarifs = await TarifCotisation.findAll({
    where: {
      actif: true,
      [Op.or]: [
        { structure_id: structureId },
        { structure_id: null }
      ]
    },
    include: [{ model: TypeTarif, as: 'typeTarif' }]
  });

  const tarifsSimes = [];

  for (const tarif of tarifs) {
    try {
      const simulation = await simulerCotisation(utilisateurId, tarif.id, {
        structureId
      });

      tarifsSimes.push({
        tarif: {
          id: tarif.id,
          libelle: tarif.libelle,
          duree_mois: tarif.duree_mois,
          montant_catalogue: parseFloat(tarif.montant)
        },
        type_tarif: simulation.type_tarif,
        calcul: simulation.calcul,
        reductions_count: simulation.reductions.length,
        recommande: tarif.typeTarif?.code === simulation.type_tarif?.code
      });
    } catch (error) {
      // Ignorer les tarifs non applicables
      logger.debug(`Tarif ${tarif.id} non applicable: ${error.message}`);
    }
  }

  return tarifsSimes;
}

/**
 * Récapitulatif des réductions pour affichage
 * @param {number} cotisationId - ID de la cotisation
 * @returns {Object} Récapitulatif des réductions
 */
async function getRecapitulatifReductions(cotisationId) {
  const cotisation = await Cotisation.findByPk(cotisationId, {
    include: [
      {
        model: CotisationReduction,
        as: 'reductions',
        order: [['ordre_application', 'ASC']]
      },
      { model: TypeTarif, as: 'typeTarif' },
      { model: TrancheQuotientFamilial, as: 'trancheQF' },
      { model: Commune, as: 'communeSnapshot' }
    ]
  });

  if (!cotisation) {
    throw new Error('Cotisation non trouvée');
  }

  return {
    cotisation_id: cotisation.id,
    tarif_base: parseFloat(cotisation.tarif_base || cotisation.montant_base),
    type_tarif: cotisation.typeTarif ? {
      code: cotisation.typeTarif.code,
      libelle: cotisation.typeTarif.libelle
    } : null,
    quotient_familial: {
      valeur: cotisation.quotient_familial_snapshot,
      tranche: cotisation.trancheQF ? {
        libelle: cotisation.trancheQF.libelle,
        borne_min: cotisation.trancheQF.borne_min,
        borne_max: cotisation.trancheQF.borne_max
      } : null
    },
    age: cotisation.age_snapshot,
    commune: cotisation.communeSnapshot ? {
      id: cotisation.communeSnapshot.id,
      nom: cotisation.communeSnapshot.nom
    } : null,
    reductions: cotisation.reductions.map(r => ({
      source: r.type_source,
      libelle: r.libelle,
      type_calcul: r.type_calcul,
      valeur: parseFloat(r.valeur),
      montant: parseFloat(r.montant_reduction),
      base_calcul: parseFloat(r.base_calcul)
    })),
    total_reductions: parseFloat(cotisation.total_reductions),
    montant_final: parseFloat(cotisation.montant_paye)
  };
}

module.exports = {
  calculerAge,
  trouverTypeTarif,
  trouverMontantPourType,
  calculerAnciennete,
  simulerCotisation,
  creerCotisation,
  getTarifsDisponibles,
  getRecapitulatifReductions,
  collecterReglesApplicables,
  appliquerReductions
};
