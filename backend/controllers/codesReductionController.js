const { CodeReduction } = require('../models');

/**
 * Récupérer tous les codes de réduction
 */
exports.getAllCodes = async (req, res) => {
  try {
    const { actif } = req.query;

    let where = {};

    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    const codes = await CodeReduction.findAll({
      where,
      order: [['ordre_affichage', 'ASC']]
    });

    res.json(codes);
  } catch (error) {
    console.error('Erreur lors de la récupération des codes de réduction:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des codes de réduction',
      message: error.message
    });
  }
};

/**
 * Récupérer un code de réduction par ID
 */
exports.getCodeById = async (req, res) => {
  try {
    const { id } = req.params;

    const code = await CodeReduction.findByPk(id);

    if (!code) {
      return res.status(404).json({
        error: 'Code de réduction non trouvé'
      });
    }

    res.json(code);
  } catch (error) {
    console.error('Erreur lors de la récupération du code de réduction:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du code de réduction',
      message: error.message
    });
  }
};

/**
 * Vérifier et récupérer un code de réduction par son code
 */
exports.verifierCode = async (req, res) => {
  try {
    const { code } = req.params;

    const codeReduction = await CodeReduction.findByCode(code);

    if (!codeReduction) {
      return res.status(404).json({
        error: 'Code de réduction non trouvé',
        valide: false
      });
    }

    const estValide = codeReduction.estValide();

    if (!estValide) {
      let raison = 'Code inactif';
      if (!codeReduction.actif) {
        raison = 'Code désactivé';
      } else if (codeReduction.usage_limite !== null && codeReduction.usage_count >= codeReduction.usage_limite) {
        raison = 'Limite d\'utilisation atteinte';
      } else {
        raison = 'Code expiré ou pas encore valide';
      }

      return res.status(400).json({
        error: raison,
        valide: false,
        code: codeReduction
      });
    }

    res.json({
      valide: true,
      code: codeReduction
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du code:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification du code',
      message: error.message
    });
  }
};

/**
 * Calculer la réduction pour un montant donné
 */
exports.calculerReduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { montant } = req.body;

    if (!montant || montant <= 0) {
      return res.status(400).json({
        error: 'Montant invalide'
      });
    }

    const code = await CodeReduction.findByPk(id);

    if (!code) {
      return res.status(404).json({
        error: 'Code de réduction non trouvé'
      });
    }

    if (!code.estValide()) {
      return res.status(400).json({
        error: 'Ce code n\'est plus valide'
      });
    }

    const calcul = code.calculerReduction(montant);

    res.json({
      code: {
        id: code.id,
        code: code.code,
        libelle: code.libelle,
        type: code.type_reduction,
        valeur: code.valeur
      },
      calcul
    });
  } catch (error) {
    console.error('Erreur lors du calcul de la réduction:', error);
    res.status(500).json({
      error: 'Erreur lors du calcul de la réduction',
      message: error.message
    });
  }
};

/**
 * Créer un nouveau code de réduction
 */
exports.createCode = async (req, res) => {
  try {
    const {
      code,
      libelle,
      description,
      type_reduction,
      valeur,
      actif,
      date_debut_validite,
      date_fin_validite,
      usage_limite,
      ordre_affichage,
      icone,
      couleur
    } = req.body;

    // Validation
    if (!code || !libelle || !valeur) {
      return res.status(400).json({
        error: 'Le code, le libellé et la valeur sont obligatoires'
      });
    }

    if (valeur < 0) {
      return res.status(400).json({
        error: 'La valeur ne peut pas être négative'
      });
    }

    // Convertir le code en majuscules
    const codeUpper = code.toUpperCase();

    // Vérifier si le code existe déjà
    const existing = await CodeReduction.findByCode(codeUpper);
    if (existing) {
      return res.status(400).json({
        error: 'Ce code existe déjà'
      });
    }

    // Si pas d'ordre spécifié, mettre à la fin
    let ordre = ordre_affichage;
    if (ordre === undefined || ordre === null) {
      const maxOrdre = await CodeReduction.max('ordre_affichage');
      ordre = (maxOrdre || 0) + 1;
    }

    const codeReduction = await CodeReduction.create({
      code: codeUpper,
      libelle,
      description,
      type_reduction: type_reduction || 'pourcentage',
      valeur,
      actif: actif !== undefined ? actif : true,
      date_debut_validite,
      date_fin_validite,
      usage_limite,
      ordre_affichage: ordre,
      icone: icone || 'bi-percent',
      couleur: couleur || 'success'
    });

    res.status(201).json(codeReduction);
  } catch (error) {
    console.error('Erreur lors de la création du code de réduction:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du code de réduction',
      message: error.message
    });
  }
};

/**
 * Mettre à jour un code de réduction
 */
exports.updateCode = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const code = await CodeReduction.findByPk(id);

    if (!code) {
      return res.status(404).json({
        error: 'Code de réduction non trouvé'
      });
    }

    // Validation
    if (updateData.valeur !== undefined && updateData.valeur < 0) {
      return res.status(400).json({
        error: 'La valeur ne peut pas être négative'
      });
    }

    // Si on modifie le code, le convertir en majuscules et vérifier l'unicité
    if (updateData.code && updateData.code !== code.code) {
      const codeUpper = updateData.code.toUpperCase();
      const existing = await CodeReduction.findByCode(codeUpper);
      if (existing && existing.id !== code.id) {
        return res.status(400).json({
          error: 'Ce code existe déjà'
        });
      }
      updateData.code = codeUpper;
    }

    await code.update(updateData);

    res.json(code);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du code de réduction:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du code de réduction',
      message: error.message
    });
  }
};

/**
 * Supprimer un code de réduction
 */
exports.deleteCode = async (req, res) => {
  try {
    const { id } = req.params;

    const code = await CodeReduction.findByPk(id, {
      include: ['cotisations']
    });

    if (!code) {
      return res.status(404).json({
        error: 'Code de réduction non trouvé'
      });
    }

    // Vérifier si le code est utilisé
    if (code.cotisations && code.cotisations.length > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce code car il est utilisé par des cotisations',
        message: `Ce code est associé à ${code.cotisations.length} cotisation(s)`
      });
    }

    await code.destroy();

    res.json({
      message: 'Code de réduction supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du code de réduction:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du code de réduction',
      message: error.message
    });
  }
};

/**
 * Réorganiser les codes de réduction (drag-and-drop)
 */
exports.reorderCodes = async (req, res) => {
  try {
    const { ordres } = req.body;

    if (!Array.isArray(ordres)) {
      return res.status(400).json({
        error: 'Format invalide',
        message: 'Le corps de la requête doit contenir un tableau "ordres"'
      });
    }

    const promises = ordres.map(({ id, ordre_affichage }) => {
      return CodeReduction.update(
        { ordre_affichage },
        { where: { id } }
      );
    });

    await Promise.all(promises);

    const codes = await CodeReduction.findAll({
      order: [['ordre_affichage', 'ASC']]
    });

    res.json({
      message: 'Ordre mis à jour avec succès',
      codes
    });
  } catch (error) {
    console.error('Erreur lors de la réorganisation des codes de réduction:', error);
    res.status(500).json({
      error: 'Erreur lors de la réorganisation des codes de réduction',
      message: error.message
    });
  }
};

/**
 * Activer/Désactiver un code de réduction
 */
exports.toggleActif = async (req, res) => {
  try {
    const { id } = req.params;

    const code = await CodeReduction.findByPk(id);

    if (!code) {
      return res.status(404).json({
        error: 'Code de réduction non trouvé'
      });
    }

    await code.toggleActif();

    res.json({
      message: `Code de réduction ${code.actif ? 'activé' : 'désactivé'} avec succès`,
      code
    });
  } catch (error) {
    console.error('Erreur lors du changement de statut:', error);
    res.status(500).json({
      error: 'Erreur lors du changement de statut',
      message: error.message
    });
  }
};
