const { TarifCotisation, Cotisation, sequelize } = require('../models');

/**
 * Récupérer tous les tarifs avec le compteur de cotisations
 */
exports.getAllTarifs = async (req, res) => {
  try {
    const tarifs = await TarifCotisation.findAll({
      include: [{
        model: Cotisation,
        as: 'cotisations',
        attributes: [],
        required: false
      }],
      attributes: {
        include: [
          // Compter toutes les cotisations (pour compatibilité avec ancienne page)
          [
            sequelize.fn('COUNT', sequelize.col('cotisations.id')),
            'nb_utilisations'
          ],
          // Compter les cotisations en cours (statut actif)
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM cotisations
              WHERE cotisations.tarif_cotisation_id = TarifCotisation.id
              AND (cotisations.periode_fin >= CURDATE() OR cotisations.periode_fin IS NULL)
            )`),
            'cotisations_en_cours'
          ]
        ]
      },
      group: ['TarifCotisation.id'],
      order: [['ordre_affichage', 'ASC'], ['id', 'ASC']]
    });

    // Formater les résultats
    const tarifsFormatted = tarifs.map(t => {
      const tarif = t.toJSON();
      tarif.nb_utilisations = parseInt(tarif.nb_utilisations) || 0;
      tarif.cotisations_en_cours = parseInt(tarif.cotisations_en_cours) || 0;
      tarif.total_cotisations = tarif.nb_utilisations; // Alias
      return tarif;
    });

    res.json(tarifsFormatted);
  } catch (error) {
    console.error('Erreur lors de la récupération des tarifs:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des tarifs',
      details: error.message
    });
  }
};

/**
 * Récupérer un tarif par ID
 */
exports.getTarifById = async (req, res) => {
  try {
    const { id } = req.params;

    const tarif = await TarifCotisation.findByPk(id);

    if (!tarif) {
      return res.status(404).json({
        error: 'Tarif non trouvé'
      });
    }

    res.json(tarif);
  } catch (error) {
    console.error('Erreur lors de la récupération du tarif:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du tarif',
      details: error.message
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
      code_comptable,
      code_analytique,
      par_defaut
    } = req.body;

    // Validation
    if (!libelle || libelle.trim() === '') {
      return res.status(400).json({
        error: 'Le libellé est requis'
      });
    }

    if (montant_base === undefined || montant_base === null || montant_base < 0) {
      return res.status(400).json({
        error: 'Le montant de base est requis et doit être positif'
      });
    }

    // Récupérer le dernier ordre
    const maxOrdre = await TarifCotisation.max('ordre_affichage') || 0;

    // Si on définit ce tarif comme par défaut, désactiver les autres
    if (par_defaut) {
      await TarifCotisation.update(
        { par_defaut: false },
        { where: {} }
      );
    }

    const tarif = await TarifCotisation.create({
      libelle: libelle.trim(),
      description: description?.trim() || null,
      type_periode: type_periode || 'annee_civile',
      type_montant: type_montant || 'fixe',
      montant_base,
      reduction_association_type: reduction_association_type || 'pourcentage',
      reduction_association_valeur: reduction_association_valeur || 0,
      actif: actif !== undefined ? actif : true,
      date_debut_validite: date_debut_validite || null,
      date_fin_validite: date_fin_validite || null,
      code_comptable: code_comptable?.trim() || null,
      code_analytique: code_analytique?.trim() || null,
      par_defaut: par_defaut || false,
      ordre_affichage: maxOrdre + 1
    });

    res.status(201).json(tarif);
  } catch (error) {
    console.error('Erreur lors de la création du tarif:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du tarif',
      details: error.message
    });
  }
};

/**
 * Mettre à jour un tarif
 */
exports.updateTarif = async (req, res) => {
  try {
    const { id } = req.params;
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
      code_comptable,
      code_analytique,
      par_defaut
    } = req.body;

    const tarif = await TarifCotisation.findByPk(id);

    if (!tarif) {
      return res.status(404).json({
        error: 'Tarif non trouvé'
      });
    }

    // Validation
    if (libelle !== undefined && libelle.trim() === '') {
      return res.status(400).json({
        error: 'Le libellé ne peut pas être vide'
      });
    }

    if (montant_base !== undefined && (montant_base === null || montant_base < 0)) {
      return res.status(400).json({
        error: 'Le montant de base doit être positif'
      });
    }

    // Si on définit ce tarif comme par défaut, désactiver les autres
    if (par_defaut && !tarif.par_defaut) {
      await TarifCotisation.update(
        { par_defaut: false },
        { where: { id: { [sequelize.Op.ne]: id } } }
      );
    }

    // Mise à jour
    await tarif.update({
      libelle: libelle?.trim() || tarif.libelle,
      description: description !== undefined ? (description?.trim() || null) : tarif.description,
      type_periode: type_periode || tarif.type_periode,
      type_montant: type_montant || tarif.type_montant,
      montant_base: montant_base !== undefined ? montant_base : tarif.montant_base,
      reduction_association_type: reduction_association_type || tarif.reduction_association_type,
      reduction_association_valeur: reduction_association_valeur !== undefined ? reduction_association_valeur : tarif.reduction_association_valeur,
      actif: actif !== undefined ? actif : tarif.actif,
      date_debut_validite: date_debut_validite !== undefined ? date_debut_validite : tarif.date_debut_validite,
      date_fin_validite: date_fin_validite !== undefined ? date_fin_validite : tarif.date_fin_validite,
      code_comptable: code_comptable !== undefined ? (code_comptable?.trim() || null) : tarif.code_comptable,
      code_analytique: code_analytique !== undefined ? (code_analytique?.trim() || null) : tarif.code_analytique,
      par_defaut: par_defaut !== undefined ? par_defaut : tarif.par_defaut
    });

    res.json(tarif);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du tarif:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du tarif',
      details: error.message
    });
  }
};

/**
 * Supprimer un tarif
 */
exports.deleteTarif = async (req, res) => {
  try {
    const { id } = req.params;

    const tarif = await TarifCotisation.findByPk(id);

    if (!tarif) {
      return res.status(404).json({
        error: 'Tarif non trouvé'
      });
    }

    // Vérifier si le tarif est utilisé dans des cotisations
    const cotisationsCount = await Cotisation.count({
      where: { tarif_cotisation_id: id }
    });

    if (cotisationsCount > 0) {
      return res.status(400).json({
        error: `Ce tarif ne peut pas être supprimé car il est utilisé dans ${cotisationsCount} cotisation(s)`,
        cotisationsCount,
        canDelete: false,
        suggest: 'Vous pouvez le désactiver plutôt que le supprimer'
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
      details: error.message
    });
  }
};

/**
 * Dupliquer un tarif
 */
exports.duplicateTarif = async (req, res) => {
  try {
    const { id } = req.params;

    const tarifOriginal = await TarifCotisation.findByPk(id);

    if (!tarifOriginal) {
      return res.status(404).json({
        error: 'Tarif non trouvé'
      });
    }

    // Récupérer le dernier ordre
    const maxOrdre = await TarifCotisation.max('ordre_affichage') || 0;

    // Créer une copie
    const tarifDuplique = await TarifCotisation.create({
      libelle: `${tarifOriginal.libelle} (copie)`,
      description: tarifOriginal.description,
      type_periode: tarifOriginal.type_periode,
      type_montant: tarifOriginal.type_montant,
      montant_base: tarifOriginal.montant_base,
      reduction_association_type: tarifOriginal.reduction_association_type,
      reduction_association_valeur: tarifOriginal.reduction_association_valeur,
      actif: false, // Désactivé par défaut
      date_debut_validite: tarifOriginal.date_debut_validite,
      date_fin_validite: tarifOriginal.date_fin_validite,
      code_comptable: tarifOriginal.code_comptable,
      code_analytique: tarifOriginal.code_analytique,
      par_defaut: false, // Jamais par défaut
      ordre_affichage: maxOrdre + 1
    });

    res.status(201).json(tarifDuplique);
  } catch (error) {
    console.error('Erreur lors de la duplication du tarif:', error);
    res.status(500).json({
      error: 'Erreur lors de la duplication du tarif',
      details: error.message
    });
  }
};

/**
 * Définir un tarif comme par défaut
 */
exports.setAsDefault = async (req, res) => {
  try {
    const { id } = req.params;

    const tarif = await TarifCotisation.findByPk(id);

    if (!tarif) {
      return res.status(404).json({
        error: 'Tarif non trouvé'
      });
    }

    // Désactiver tous les autres par défaut
    await TarifCotisation.update(
      { par_defaut: false },
      { where: {} }
    );

    // Définir celui-ci comme par défaut
    await tarif.update({ par_defaut: true });

    res.json({
      message: 'Tarif défini comme par défaut',
      tarif
    });
  } catch (error) {
    console.error('Erreur lors de la définition du tarif par défaut:', error);
    res.status(500).json({
      error: 'Erreur lors de la définition du tarif par défaut',
      details: error.message
    });
  }
};

/**
 * Réorganiser les tarifs (drag & drop)
 */
exports.reorderTarifs = async (req, res) => {
  try {
    const { ordres } = req.body;

    if (!Array.isArray(ordres)) {
      return res.status(400).json({
        error: 'Le format des données est invalide'
      });
    }

    // Mettre à jour l'ordre de chaque tarif
    for (const item of ordres) {
      await TarifCotisation.update(
        { ordre_affichage: item.ordre },
        { where: { id: item.id } }
      );
    }

    res.json({
      message: 'Ordre des tarifs mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réorganisation des tarifs:', error);
    res.status(500).json({
      error: 'Erreur lors de la réorganisation des tarifs',
      details: error.message
    });
  }
};

/**
 * Activer/désactiver un tarif
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

    await tarif.update({
      actif: !tarif.actif
    });

    res.json({
      message: `Tarif ${tarif.actif ? 'activé' : 'désactivé'} avec succès`,
      tarif
    });
  } catch (error) {
    console.error('Erreur lors du changement de statut du tarif:', error);
    res.status(500).json({
      error: 'Erreur lors du changement de statut du tarif',
      details: error.message
    });
  }
};
