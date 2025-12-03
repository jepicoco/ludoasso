const { ModePaiement } = require('../models');

/**
 * Récupérer tous les modes de paiement
 */
exports.getAllModes = async (req, res) => {
  try {
    const { actif } = req.query;

    let where = {};

    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    const modes = await ModePaiement.findAll({
      where,
      order: [['ordre_affichage', 'ASC']]
    });

    res.json(modes);
  } catch (error) {
    console.error('Erreur lors de la récupération des modes de paiement:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des modes de paiement',
      message: error.message
    });
  }
};

/**
 * Récupérer un mode de paiement par ID
 */
exports.getModeById = async (req, res) => {
  try {
    const { id } = req.params;

    const mode = await ModePaiement.findByPk(id);

    if (!mode) {
      return res.status(404).json({
        error: 'Mode de paiement non trouvé'
      });
    }

    res.json(mode);
  } catch (error) {
    console.error('Erreur lors de la récupération du mode de paiement:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du mode de paiement',
      message: error.message
    });
  }
};

/**
 * Créer un nouveau mode de paiement
 * Accessible uniquement aux administrateurs
 */
exports.createMode = async (req, res) => {
  try {
    const {
      libelle,
      actif,
      ordre_affichage,
      journal_comptable,
      type_operation,
      libelle_export_comptable,
      code_comptable,
      icone,
      couleur
    } = req.body;

    // Validation
    if (!libelle) {
      return res.status(400).json({
        error: 'Le libellé est obligatoire'
      });
    }

    // Si pas d'ordre spécifié, mettre à la fin
    let ordre = ordre_affichage;
    if (ordre === undefined || ordre === null) {
      const maxOrdre = await ModePaiement.max('ordre_affichage');
      ordre = (maxOrdre || 0) + 1;
    }

    const mode = await ModePaiement.create({
      libelle,
      actif: actif !== undefined ? actif : true,
      ordre_affichage: ordre,
      journal_comptable,
      type_operation: type_operation || 'debit',
      libelle_export_comptable,
      code_comptable,
      icone: icone || 'bi-wallet2',
      couleur: couleur || 'primary'
    });

    res.status(201).json(mode);
  } catch (error) {
    console.error('Erreur lors de la création du mode de paiement:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du mode de paiement',
      message: error.message
    });
  }
};

/**
 * Mettre à jour un mode de paiement
 * Accessible uniquement aux administrateurs
 */
exports.updateMode = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const mode = await ModePaiement.findByPk(id);

    if (!mode) {
      return res.status(404).json({
        error: 'Mode de paiement non trouvé'
      });
    }

    await mode.update(updateData);

    res.json(mode);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mode de paiement:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du mode de paiement',
      message: error.message
    });
  }
};

/**
 * Supprimer un mode de paiement
 * Accessible uniquement aux administrateurs
 */
exports.deleteMode = async (req, res) => {
  try {
    const { id } = req.params;

    const mode = await ModePaiement.findByPk(id);

    if (!mode) {
      return res.status(404).json({
        error: 'Mode de paiement non trouvé'
      });
    }

    // TODO: Vérifier si le mode est utilisé dans des cotisations/emprunts
    // Si oui, empêcher la suppression ou proposer de désactiver

    await mode.destroy();

    res.json({
      message: 'Mode de paiement supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du mode de paiement:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du mode de paiement',
      message: error.message
    });
  }
};

/**
 * Réorganiser les modes de paiement (drag-and-drop)
 * Accessible uniquement aux administrateurs
 */
exports.reorderModes = async (req, res) => {
  try {
    const { ordres } = req.body;

    // ordres doit être un tableau d'objets {id, ordre_affichage}
    if (!Array.isArray(ordres)) {
      return res.status(400).json({
        error: 'Format invalide',
        message: 'Le corps de la requête doit contenir un tableau "ordres"'
      });
    }

    // Mettre à jour l'ordre de chaque mode
    const promises = ordres.map(({ id, ordre_affichage }) => {
      return ModePaiement.update(
        { ordre_affichage },
        { where: { id } }
      );
    });

    await Promise.all(promises);

    // Récupérer la liste mise à jour
    const modes = await ModePaiement.findAll({
      order: [['ordre_affichage', 'ASC']]
    });

    res.json({
      message: 'Ordre mis à jour avec succès',
      modes
    });
  } catch (error) {
    console.error('Erreur lors de la réorganisation des modes de paiement:', error);
    res.status(500).json({
      error: 'Erreur lors de la réorganisation des modes de paiement',
      message: error.message
    });
  }
};

/**
 * Activer/Désactiver un mode de paiement
 * Accessible uniquement aux administrateurs
 */
exports.toggleActif = async (req, res) => {
  try {
    const { id } = req.params;

    const mode = await ModePaiement.findByPk(id);

    if (!mode) {
      return res.status(404).json({
        error: 'Mode de paiement non trouvé'
      });
    }

    await mode.toggleActif();

    res.json({
      message: `Mode de paiement ${mode.actif ? 'activé' : 'désactivé'} avec succès`,
      mode
    });
  } catch (error) {
    console.error('Erreur lors du changement de statut:', error);
    res.status(500).json({
      error: 'Erreur lors du changement de statut',
      message: error.message
    });
  }
};
