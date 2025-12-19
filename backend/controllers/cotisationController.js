const { Cotisation, Utilisateur, TarifCotisation, CodeReduction, ModePaiement, ParametresStructure, ParametresFront, Structure } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');
const eventTriggerService = require('../services/eventTriggerService');
const pdfService = require('../services/pdfService');
const charteValidationService = require('../services/charteValidationService');

/**
 * Récupérer toutes les cotisations
 */
exports.getAllCotisations = async (req, res) => {
  try {
    // Support adherent_id pour rétrocompatibilité frontend
    const { adherent_id, utilisateur_id, statut, annee, structure_id } = req.query;

    let where = {};

    // Filtrer par structure
    if (structure_id) {
      where.structure_id = parseInt(structure_id);
    }

    // Utiliser utilisateur_id (ou adherent_id pour rétrocompatibilité)
    const userId = utilisateur_id || adherent_id;
    if (userId) {
      where.utilisateur_id = userId;
    }

    if (statut) {
      where.statut = statut;
    }

    // Filtrer par année
    if (annee) {
      const year = parseInt(annee);
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          {
            periode_debut: {
              [Op.between]: [
                new Date(`${year}-01-01`),
                new Date(`${year}-12-31`)
              ]
            }
          },
          {
            periode_fin: {
              [Op.between]: [
                new Date(`${year}-01-01`),
                new Date(`${year}-12-31`)
              ]
            }
          }
        ]
      });
    }

    const cotisations = await Cotisation.findAll({
      where,
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur',
          attributes: ['id', 'nom', 'prenom', 'email', 'code_barre']
        },
        {
          model: TarifCotisation,
          as: 'tarif',
          attributes: ['id', 'libelle', 'type_periode', 'type_montant']
        },
        {
          model: Structure,
          as: 'structure',
          attributes: ['id', 'code', 'nom', 'couleur']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const cotisationsWithAlias = cotisations.map(c => {
      const data = c.toJSON();
      data.adherent = data.utilisateur;
      return data;
    });

    res.json(cotisationsWithAlias);
  } catch (error) {
    console.error('Erreur lors de la récupération des cotisations:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des cotisations',
      message: error.message
    });
  }
};

/**
 * Récupérer une cotisation par ID
 */
exports.getCotisationById = async (req, res) => {
  try {
    const { id } = req.params;

    const cotisation = await Cotisation.findByPk(id, {
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur'
        },
        {
          model: TarifCotisation,
          as: 'tarif'
        },
        {
          model: Structure,
          as: 'structure',
          attributes: ['id', 'code', 'nom', 'couleur']
        }
      ]
    });

    if (!cotisation) {
      return res.status(404).json({
        error: 'Cotisation non trouvée'
      });
    }

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = cotisation.toJSON();
    data.adherent = data.utilisateur;

    res.json(data);
  } catch (error) {
    console.error('Erreur lors de la récupération de la cotisation:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la cotisation',
      message: error.message
    });
  }
};

/**
 * Créer une nouvelle cotisation
 */
exports.createCotisation = async (req, res) => {
  try {
    // Support adherent_id pour rétrocompatibilité frontend
    const {
      adherent_id,
      utilisateur_id,
      tarif_cotisation_id,
      date_debut, // Optionnel, sinon calculé automatiquement
      date_fin,   // Optionnel, sinon calculé automatiquement
      date_paiement,
      mode_paiement,
      mode_paiement_id,
      reference_paiement,
      notes,
      code_reduction_id,
      structure_id // Optionnel, sinon utilise celui du tarif
    } = req.body;

    // Utiliser utilisateur_id (ou adherent_id pour rétrocompatibilité)
    const userId = utilisateur_id || adherent_id;

    // Validation
    if (!userId || !tarif_cotisation_id) {
      return res.status(400).json({
        error: 'L\'utilisateur et le tarif sont obligatoires'
      });
    }

    // Vérifier que l'utilisateur existe
    const utilisateur = await Utilisateur.findByPk(userId);
    if (!utilisateur) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Vérifier que le tarif existe et est valide
    const tarif = await TarifCotisation.findByPk(tarif_cotisation_id);
    if (!tarif) {
      return res.status(404).json({
        error: 'Tarif non trouvé'
      });
    }

    if (!tarif.estValide()) {
      return res.status(400).json({
        error: 'Ce tarif n\'est pas valide ou n\'est plus actif'
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

    // Calculer le montant
    const estMembreAssociation = utilisateur.adhesion_association || false;
    const montantBase = parseFloat(tarif.montant_base);
    let montantFinal = tarif.calculerMontant(dateDebut, dateFin, estMembreAssociation);
    let reductionAppliquee = montantBase - montantFinal;
    let codeReductionApplique = null;
    let avoirGenere = 0;

    // Appliquer le code de réduction si fourni
    if (code_reduction_id) {
      const codeReduction = await CodeReduction.findByPk(code_reduction_id);

      if (!codeReduction) {
        return res.status(404).json({
          error: 'Code de réduction non trouvé'
        });
      }

      if (!codeReduction.estValide()) {
        return res.status(400).json({
          error: 'Ce code de réduction n\'est pas valide ou est expiré'
        });
      }

      // Calculer la réduction du code
      const calculReduction = codeReduction.calculerReduction(montantFinal);
      montantFinal = calculReduction.montant_final;
      reductionAppliquee += calculReduction.reduction;
      avoirGenere = calculReduction.avoir || 0;
      codeReductionApplique = codeReduction.code;

      // Incrémenter le compteur d'utilisation du code
      await codeReduction.incrementerUsage();
    }

    // Gérer le mode de paiement (nouveau système avec ID ou ancien système avec string)
    let modePaiementValue = mode_paiement || 'especes';
    if (mode_paiement_id) {
      const modePaiement = await ModePaiement.findByPk(mode_paiement_id);
      if (modePaiement) {
        modePaiementValue = modePaiement.libelle.toLowerCase().replace(/\s+/g, '_');
      }
    }

    // Determiner la structure (explicite, ou celle du tarif, ou null)
    const cotisationStructureId = structure_id || tarif.structure_id || null;

    // Créer la cotisation
    const cotisation = await Cotisation.create({
      utilisateur_id: userId,
      tarif_cotisation_id,
      periode_debut: dateDebut,
      periode_fin: dateFin,
      montant_base: montantBase,
      reduction_appliquee: reductionAppliquee,
      montant_paye: montantFinal,
      adhesion_association: estMembreAssociation,
      date_paiement: date_paiement || new Date(),
      mode_paiement: modePaiementValue,
      reference_paiement,
      statut: 'en_cours',
      notes,
      code_reduction_id: code_reduction_id || null,
      code_reduction_applique: codeReductionApplique,
      avoir_genere: avoirGenere,
      structure_id: cotisationStructureId
    });

    // Mettre à jour les dates d'adhésion de l'utilisateur
    await utilisateur.update({
      date_adhesion: dateDebut,
      date_fin_adhesion: dateFin,
      statut: 'actif'
    });

    // Déclencher l'événement de création de cotisation
    try {
      await eventTriggerService.triggerCotisationCreated(cotisation, utilisateur);
// console.('Event COTISATION_CREATED déclenché pour cotisation:', cotisation.id);
    } catch (eventError) {
      console.error('Erreur déclenchement événement:', eventError);
      // Ne pas bloquer la création si l'événement échoue
    }

    // Déclencher la validation de charte si nécessaire
    try {
      const params = await ParametresFront.getParametres();
      if (params.charte_active) {
        const needsValidation = await charteValidationService.verifierRevalidationNecessaire(userId);
        if (needsValidation) {
          await charteValidationService.initierValidation(userId, cotisation.id);
          console.log('Validation charte initiée pour utilisateur:', userId);
        }
      }
    } catch (charteError) {
      console.error('Erreur initiation validation charte:', charteError);
      // Ne pas bloquer la création si la validation charte échoue
    }

    // Recharger la cotisation avec les relations
    const cotisationComplete = await Cotisation.findByPk(cotisation.id, {
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur',
          attributes: ['id', 'nom', 'prenom', 'email']
        },
        {
          model: TarifCotisation,
          as: 'tarif'
        },
        {
          model: Structure,
          as: 'structure',
          attributes: ['id', 'code', 'nom', 'couleur']
        }
      ]
    });

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = cotisationComplete.toJSON();
    data.adherent = data.utilisateur;

    res.status(201).json(data);
  } catch (error) {
    console.error('Erreur lors de la création de la cotisation:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la cotisation',
      message: error.message
    });
  }
};

/**
 * Mettre à jour une cotisation
 */
exports.updateCotisation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const cotisation = await Cotisation.findByPk(id);

    if (!cotisation) {
      return res.status(404).json({
        error: 'Cotisation non trouvée'
      });
    }

    // Ne pas permettre la modification de certains champs critiques
    delete updateData.adherent_id;
    delete updateData.montant_base;
    delete updateData.reduction_appliquee;
    delete updateData.montant_paye;

    await cotisation.update(updateData);

    const cotisationComplete = await Cotisation.findByPk(id, {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: TarifCotisation, as: 'tarif' }
      ]
    });

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = cotisationComplete.toJSON();
    data.adherent = data.utilisateur;

    res.json(data);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la cotisation:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour de la cotisation',
      message: error.message
    });
  }
};

/**
 * Annuler une cotisation
 */
exports.annulerCotisation = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    const cotisation = await Cotisation.findByPk(id);

    if (!cotisation) {
      return res.status(404).json({
        error: 'Cotisation non trouvée'
      });
    }

    if (cotisation.statut === 'annulee') {
      return res.status(400).json({
        error: 'Cette cotisation est déjà annulée'
      });
    }

    await cotisation.annuler(motif);

    res.json({
      message: 'Cotisation annulée avec succès',
      cotisation
    });
  } catch (error) {
    console.error('Erreur lors de l\'annulation de la cotisation:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'annulation de la cotisation',
      message: error.message
    });
  }
};

/**
 * Supprimer une cotisation
 */
exports.deleteCotisation = async (req, res) => {
  try {
    const { id } = req.params;

    const cotisation = await Cotisation.findByPk(id);

    if (!cotisation) {
      return res.status(404).json({
        error: 'Cotisation non trouvée'
      });
    }

    // Sécurité : ne permettre la suppression que des cotisations annulées
    if (cotisation.statut !== 'annulee') {
      return res.status(400).json({
        error: 'Seules les cotisations annulées peuvent être supprimées. Veuillez d\'abord annuler cette cotisation.'
      });
    }

    await cotisation.destroy();

    res.json({
      message: 'Cotisation supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la cotisation:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de la cotisation',
      message: error.message
    });
  }
};

/**
 * Vérifier la cotisation active d'un adhérent
 */
exports.verifierCotisationActive = async (req, res) => {
  try {
    // Support adherent_id pour rétrocompatibilité frontend
    const { adherent_id, utilisateur_id } = req.params;
    const userId = utilisateur_id || adherent_id;
    const { date } = req.query;

    const dateReference = date ? new Date(date) : new Date();

    const utilisateur = await Utilisateur.findByPk(userId);
    if (!utilisateur) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    const cotisationActive = await Cotisation.findOne({
      where: {
        utilisateur_id: userId,
        statut: 'en_cours',
        periode_debut: {
          [Op.lte]: dateReference
        },
        periode_fin: {
          [Op.gte]: dateReference
        }
      },
      include: [
        {
          model: TarifCotisation,
          as: 'tarif'
        }
      ],
      order: [['periode_fin', 'DESC']]
    });

    if (cotisationActive) {
      res.json({
        actif: true,
        cotisation: cotisationActive,
        jours_restants: cotisationActive.joursRestants(dateReference)
      });
    } else {
      res.json({
        actif: false,
        message: 'Aucune cotisation active trouvée pour cet adhérent'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de la cotisation:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification de la cotisation',
      message: error.message
    });
  }
};

/**
 * Mettre à jour automatiquement les statuts des cotisations expirées
 *
 * Optimise: utilise un UPDATE groupe au lieu de N saves individuels
 */
exports.mettreAJourStatutsExpires = async (req, res) => {
  try {
    // Mise a jour groupee (evite N+1 writes)
    const [count] = await Cotisation.update(
      { statut: 'expiree' },
      {
        where: {
          statut: 'en_cours',
          periode_fin: {
            [Op.lt]: new Date()
          }
        }
      }
    );

    res.json({
      message: `${count} cotisation(s) mise(s) à jour`,
      count
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des statuts:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour des statuts',
      message: error.message
    });
  }
};

/**
 * Obtenir les statistiques des cotisations
 */
exports.getStatistiques = async (req, res) => {
  try {
    const { annee } = req.query;
    const year = annee ? parseInt(annee) : new Date().getFullYear();

    const where = {
      [Op.or]: [
        {
          periode_debut: {
            [Op.between]: [
              new Date(`${year}-01-01`),
              new Date(`${year}-12-31`)
            ]
          }
        },
        {
          periode_fin: {
            [Op.between]: [
              new Date(`${year}-01-01`),
              new Date(`${year}-12-31`)
            ]
          }
        }
      ]
    };

    const total = await Cotisation.count({ where });
    const enCours = await Cotisation.count({ where: { ...where, statut: 'en_cours' } });
    const expirees = await Cotisation.count({ where: { ...where, statut: 'expiree' } });
    const annulees = await Cotisation.count({ where: { ...where, statut: 'annulee' } });

    // Calcul du montant total encaissé
    const cotisations = await Cotisation.findAll({
      where: { ...where, statut: { [Op.ne]: 'annulee' } },
      attributes: ['montant_paye']
    });

    const montantTotal = cotisations.reduce((sum, c) => sum + parseFloat(c.montant_paye), 0);

    res.json({
      annee: year,
      total,
      par_statut: {
        en_cours: enCours,
        expirees,
        annulees
      },
      montant_total: Math.round(montantTotal * 100) / 100
    });
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    res.status(500).json({
      error: 'Erreur lors du calcul des statistiques',
      message: error.message
    });
  }
};

/**
 * Générer un reçu PDF pour une cotisation
 */
exports.genererRecuPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer la cotisation avec les relations
    const cotisation = await Cotisation.findByPk(id, {
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur'
        },
        {
          model: TarifCotisation,
          as: 'tarif'
        }
      ]
    });

    if (!cotisation) {
      return res.status(404).json({
        error: 'Cotisation non trouvée'
      });
    }

    // Récupérer les paramètres de la structure
    const structure = await ParametresStructure.findOne({
      order: [['id', 'ASC']]
    });

    if (!structure) {
      return res.status(500).json({
        error: 'Paramètres de structure non configurés'
      });
    }

    // Générer le PDF
    const { filepath, filename } = await pdfService.genererRecuCotisation(cotisation, structure);

    // Télécharger le fichier
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Erreur lors du téléchargement du PDF:', err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Erreur lors du téléchargement du PDF',
            message: err.message
          });
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la génération du reçu PDF:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération du reçu PDF',
      message: error.message
    });
  }
};
