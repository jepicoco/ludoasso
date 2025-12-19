const { TarifCotisation, Cotisation, Structure } = require('../models');
const { Op } = require('sequelize');

/**
 * Récupérer tous les tarifs de cotisation
 */
exports.getAllTarifs = async (req, res) => {
  try {
    const { actif, valide, structure_id } = req.query;

    let where = {};

    // Filtrer par structure
    if (structure_id) {
      // Tarifs de la structure OU tarifs globaux (structure_id = null)
      where[Op.or] = [
        { structure_id: parseInt(structure_id) },
        { structure_id: null }
      ];
    }

    // Filtrer par statut actif
    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    // Filtrer par validité (date)
    if (valide === 'true') {
      const now = new Date();
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { date_debut_validite: null },
          { date_debut_validite: { [Op.lte]: now } }
        ]
      });
      where[Op.and].push({
        [Op.or]: [
          { date_fin_validite: null },
          { date_fin_validite: { [Op.gte]: now } }
        ]
      });
    }

    const tarifs = await TarifCotisation.findAll({
      where,
      include: [
        {
          model: Cotisation,
          as: 'cotisations',
          attributes: [],
          required: false
        },
        {
          model: Structure,
          as: 'structure',
          attributes: ['id', 'code', 'nom', 'couleur']
        }
      ],
      attributes: {
        include: [
          [TarifCotisation.sequelize.fn('COUNT', TarifCotisation.sequelize.col('cotisations.id')), 'nb_utilisations']
        ]
      },
      group: ['TarifCotisation.id', 'structure.id'],
      order: [['ordre_affichage', 'ASC'], ['libelle', 'ASC']]
    });

    // Formater les résultats pour inclure nb_utilisations en tant que nombre
    const tarifsFormatted = tarifs.map(t => {
      const tarif = t.toJSON();
      tarif.nb_utilisations = parseInt(tarif.nb_utilisations) || 0;
      return tarif;
    });

    res.json(tarifsFormatted);
  } catch (error) {
    console.error('Erreur lors de la récupération des tarifs:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des tarifs',
      message: error.message
    });
  }
};

/**
 * Récupérer un tarif par ID
 */
exports.getTarifById = async (req, res) => {
  try {
    const { id } = req.params;

    const tarif = await TarifCotisation.findByPk(id, {
      include: [
        {
          model: Cotisation,
          as: 'cotisations',
          attributes: [],
          required: false
        },
        {
          model: Structure,
          as: 'structure',
          attributes: ['id', 'code', 'nom', 'couleur']
        }
      ],
      attributes: {
        include: [
          [TarifCotisation.sequelize.fn('COUNT', TarifCotisation.sequelize.col('cotisations.id')), 'nb_utilisations']
        ]
      },
      group: ['TarifCotisation.id', 'structure.id']
    });

    if (!tarif) {
      return res.status(404).json({
        error: 'Tarif non trouvé'
      });
    }

    const tarifFormatted = tarif.toJSON();
    tarifFormatted.nb_utilisations = parseInt(tarifFormatted.nb_utilisations) || 0;

    res.json(tarifFormatted);
  } catch (error) {
    console.error('Erreur lors de la récupération du tarif:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du tarif',
      message: error.message
    });
  }
};

/**
 * Créer un nouveau tarif
 */
exports.createTarif = async (req, res) => {
  try {
    const {
      libelle,
      description,
      type_periode,
      type_montant,
      montant_base,
      reduction_association_type,
      reduction_association_valeur,
      actif,
      date_debut_validite,
      date_fin_validite,
      ordre_affichage,
      code_comptable,
      code_analytique,
      structure_id
    } = req.body;

    // Validation
    if (!libelle || !montant_base) {
      return res.status(400).json({
        error: 'Le libellé et le montant de base sont obligatoires'
      });
    }

    if (montant_base < 0) {
      return res.status(400).json({
        error: 'Le montant de base ne peut pas être négatif'
      });
    }

    const tarif = await TarifCotisation.create({
      libelle,
      description,
      type_periode: type_periode || 'annee_civile',
      type_montant: type_montant || 'fixe',
      montant_base,
      reduction_association_type: reduction_association_type || 'pourcentage',
      reduction_association_valeur: reduction_association_valeur || 0,
      actif: actif !== undefined ? actif : true,
      date_debut_validite,
      date_fin_validite,
      ordre_affichage: ordre_affichage || 0,
      code_comptable,
      code_analytique,
      structure_id: structure_id || null
    });

    // Recharger avec la structure
    const tarifWithStructure = await TarifCotisation.findByPk(tarif.id, {
      include: [{
        model: Structure,
        as: 'structure',
        attributes: ['id', 'code', 'nom', 'couleur']
      }]
    });

    res.status(201).json(tarifWithStructure);
  } catch (error) {
    console.error('Erreur lors de la création du tarif:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du tarif',
      message: error.message
    });
  }
};

/**
 * Mettre à jour un tarif
 */
exports.updateTarif = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const tarif = await TarifCotisation.findByPk(id);

    if (!tarif) {
      return res.status(404).json({
        error: 'Tarif non trouvé'
      });
    }

    // Validation
    if (updateData.montant_base !== undefined && updateData.montant_base < 0) {
      return res.status(400).json({
        error: 'Le montant de base ne peut pas être négatif'
      });
    }

    // Gerer structure_id explicitement (peut etre null pour global)
    if ('structure_id' in updateData) {
      updateData.structure_id = updateData.structure_id || null;
    }

    await tarif.update(updateData);

    // Recharger avec la structure
    const tarifWithStructure = await TarifCotisation.findByPk(id, {
      include: [{
        model: Structure,
        as: 'structure',
        attributes: ['id', 'code', 'nom', 'couleur']
      }]
    });

    res.json(tarifWithStructure);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du tarif:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du tarif',
      message: error.message
    });
  }
};

/**
 * Supprimer un tarif
 */
exports.deleteTarif = async (req, res) => {
  try {
    const { id } = req.params;

    const tarif = await TarifCotisation.findByPk(id, {
      include: ['cotisations']
    });

    if (!tarif) {
      return res.status(404).json({
        error: 'Tarif non trouvé'
      });
    }

    // Vérifier s'il y a des cotisations associées
    if (tarif.cotisations && tarif.cotisations.length > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce tarif car il est utilisé par des cotisations',
        message: `Ce tarif est associé à ${tarif.cotisations.length} cotisation(s)`
      });
    }

    await tarif.destroy();

    res.json({
      message: 'Tarif supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du tarif:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du tarif',
      message: error.message
    });
  }
};

/**
 * Calculer le montant d'une cotisation pour un tarif donné
 */
exports.calculerMontant = async (req, res) => {
  try {
    const { id } = req.params;
    const { date_debut, date_fin, adhesion_association } = req.body;

    const tarif = await TarifCotisation.findByPk(id);

    if (!tarif) {
      return res.status(404).json({
        error: 'Tarif non trouvé'
      });
    }

    if (!tarif.estValide()) {
      return res.status(400).json({
        error: 'Ce tarif n\'est plus valide'
      });
    }

    // Calculer les dates de période
    let dateDebut, dateFin;

    // Parse date string properly to avoid timezone issues
    let dateRef;
    if (date_debut) {
      // Parse date string as local date (not UTC)
      const parts = date_debut.split('-');
      dateRef = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      dateRef = new Date();
    }

    if (date_debut && date_fin) {
      // Dates explicites fournies
      const partsDebut = date_debut.split('-');
      dateDebut = new Date(parseInt(partsDebut[0]), parseInt(partsDebut[1]) - 1, parseInt(partsDebut[2]));
      const partsFin = date_fin.split('-');
      dateFin = new Date(parseInt(partsFin[0]), parseInt(partsFin[1]) - 1, parseInt(partsFin[2]));
    } else {
      // Calculer la période selon le type
      const periode = tarif.calculerDatesPeriode(dateRef);

      // Pour le prorata, on commence toujours à la date de référence (date_debut ou aujourd'hui)
      // et on va jusqu'à la fin de la période
      if (tarif.type_montant === 'prorata') {
        dateDebut = dateRef;
        dateFin = periode.dateFin;
      } else {
        // Pour les tarifs fixes, on prend toute la période
        dateDebut = periode.dateDebut;
        dateFin = periode.dateFin;
      }
    }

    const estAdherentAssociation = adhesion_association === true;
    const montantBase = parseFloat(tarif.montant_base);

    // Calculer le montant avec prorata
    let montantApresProrata = montantBase;
    let prorata = null;
    if (tarif.type_montant === 'prorata') {
      const moisTotal = tarif.calculerDureePeriode();
      const moisEffectifs = tarif.calculerMoisEffectifs(dateDebut, dateFin);
      montantApresProrata = (montantBase / moisTotal) * moisEffectifs;
      prorata = {
        mois_total: moisTotal,
        mois_effectifs: moisEffectifs,
        montant_prorata: Math.round(montantApresProrata * 100) / 100
      };
    }

    // Calculer la réduction association
    let montantFinal = montantApresProrata;
    let reductionAppliquee = 0;
    if (estAdherentAssociation && tarif.reduction_association_valeur > 0) {
      if (tarif.reduction_association_type === 'pourcentage') {
        reductionAppliquee = montantApresProrata * (tarif.reduction_association_valeur / 100);
        montantFinal = montantApresProrata * (1 - tarif.reduction_association_valeur / 100);
      } else {
        reductionAppliquee = Math.min(montantApresProrata, parseFloat(tarif.reduction_association_valeur));
        montantFinal = Math.max(0, montantApresProrata - parseFloat(tarif.reduction_association_valeur));
      }
    }

    montantFinal = Math.round(montantFinal * 100) / 100;
    reductionAppliquee = Math.round(reductionAppliquee * 100) / 100;

    // Format dates as YYYY-MM-DD in local timezone
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    res.json({
      tarif: {
        id: tarif.id,
        libelle: tarif.libelle,
        type_periode: tarif.type_periode,
        type_montant: tarif.type_montant
      },
      periode: {
        debut: formatDate(dateDebut),
        fin: formatDate(dateFin)
      },
      calcul: {
        montant_base: montantBase,
        prorata: prorata,
        montant_apres_prorata: prorata ? prorata.montant_prorata : montantBase,
        reduction_appliquee: reductionAppliquee,
        montant_final: montantFinal
      },
      adhesion_association: estAdherentAssociation
    });
  } catch (error) {
    console.error('Erreur lors du calcul du montant:', error);
    res.status(500).json({
      error: 'Erreur lors du calcul du montant',
      message: error.message
    });
  }
};

/**
 * Activer/Désactiver un tarif
 */
exports.toggleActif = async (req, res) => {
  try {
    const { id } = req.params;

    const tarif = await TarifCotisation.findByPk(id);

    if (!tarif) {
      return res.status(404).json({
        error: 'Tarif non trouvé'
      });
    }

    tarif.actif = !tarif.actif;
    await tarif.save();

    res.json({
      message: `Tarif ${tarif.actif ? 'activé' : 'désactivé'} avec succès`,
      tarif
    });
  } catch (error) {
    console.error('Erreur lors du changement de statut:', error);
    res.status(500).json({
      error: 'Erreur lors du changement de statut',
      message: error.message
    });
  }
};
