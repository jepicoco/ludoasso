/**
 * Controller pour la gestion des modules actifs
 */

const { ModuleActif, ParametresFront } = require('../models');
const { invalidateModulesCache } = require('../middleware/checkModuleActif');

/**
 * Cascade la desactivation de certains modules vers parametres_front
 * @param {string} code - Code du module
 * @param {boolean} actif - Nouvel etat
 */
async function cascadeModuleChange(code, actif) {
  // Si on desactive le module plans, desactiver aussi l'affichage public
  if (code === 'plans' && !actif) {
    try {
      await ParametresFront.update(
        { module_plan_interactif: false },
        { where: { id: 1 } }
      );
      console.log('Cascade: module_plan_interactif desactive dans parametres_front');
    } catch (error) {
      console.error('Erreur cascade module plans:', error.message);
    }
  }

  // Invalider le cache des modules
  invalidateModulesCache();
}

/**
 * Recuperer la liste des codes de modules actifs (pour le frontend)
 */
exports.getActifs = async (req, res) => {
  try {
    const modulesActifs = await ModuleActif.getActifs();
    res.json(modulesActifs);
  } catch (error) {
    console.error('Erreur recuperation modules actifs:', error);
    res.status(500).json({
      error: 'Erreur lors de la recuperation des modules actifs',
      message: error.message
    });
  }
};

/**
 * Recuperer tous les modules avec leurs details (admin)
 */
exports.getAll = async (req, res) => {
  try {
    const modules = await ModuleActif.getAllWithDetails();
    res.json(modules);
  } catch (error) {
    console.error('Erreur recuperation modules:', error);
    res.status(500).json({
      error: 'Erreur lors de la recuperation des modules',
      message: error.message
    });
  }
};

/**
 * Activer/desactiver un module
 */
exports.toggle = async (req, res) => {
  try {
    const { code } = req.params;

    const module = await ModuleActif.toggleModule(code);

    // Cascade des effets de la desactivation
    await cascadeModuleChange(code, module.actif);

    res.json({
      success: true,
      message: `Module ${module.libelle} ${module.actif ? 'active' : 'desactive'}`,
      module
    });
  } catch (error) {
    console.error('Erreur toggle module:', error);

    if (error.message.includes('introuvable')) {
      return res.status(404).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la modification du module',
      message: error.message
    });
  }
};

/**
 * Mettre a jour l'etat de plusieurs modules en une fois
 */
exports.updateAll = async (req, res) => {
  try {
    const { modules } = req.body;

    if (!modules || !Array.isArray(modules)) {
      return res.status(400).json({
        error: 'Le parametre modules doit etre un tableau'
      });
    }

    const results = [];

    for (const { code, actif } of modules) {
      const module = await ModuleActif.findOne({ where: { code } });
      if (module) {
        module.actif = actif;
        await module.save();

        // Cascade des effets de la desactivation
        await cascadeModuleChange(code, actif);

        results.push({ code, actif: module.actif, success: true });
      } else {
        results.push({ code, success: false, error: 'Module introuvable' });
      }
    }

    res.json({
      success: true,
      message: 'Modules mis a jour',
      results
    });
  } catch (error) {
    console.error('Erreur mise a jour modules:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise a jour des modules',
      message: error.message
    });
  }
};

/**
 * Verifier si un module specifique est actif
 */
exports.checkModule = async (req, res) => {
  try {
    const { code } = req.params;
    const isActif = await ModuleActif.isActif(code);

    res.json({
      code,
      actif: isActif
    });
  } catch (error) {
    console.error('Erreur verification module:', error);
    res.status(500).json({
      error: 'Erreur lors de la verification du module',
      message: error.message
    });
  }
};

/**
 * Mettre a jour la couleur d'un module (fond et/ou texte)
 */
exports.updateCouleur = async (req, res) => {
  try {
    const { code } = req.params;
    const { couleur, couleur_texte } = req.body;

    // Au moins une couleur doit etre fournie
    if (!couleur && !couleur_texte) {
      return res.status(400).json({
        error: 'Au moins une couleur (couleur ou couleur_texte) est requise'
      });
    }

    // Valider le format des couleurs (hex)
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;

    if (couleur && !hexPattern.test(couleur)) {
      return res.status(400).json({
        error: 'Format de couleur invalide. Utilisez le format hexadecimal (#RRGGBB)'
      });
    }

    if (couleur_texte && !hexPattern.test(couleur_texte)) {
      return res.status(400).json({
        error: 'Format de couleur_texte invalide. Utilisez le format hexadecimal (#RRGGBB)'
      });
    }

    const module = await ModuleActif.findOne({ where: { code } });
    if (!module) {
      return res.status(404).json({
        error: `Module ${code} introuvable`
      });
    }

    // Mettre a jour les couleurs fournies
    if (couleur) module.couleur = couleur;
    if (couleur_texte) module.couleur_texte = couleur_texte;

    await module.save();

    // Invalider le cache des modules
    invalidateModulesCache();

    res.json({
      success: true,
      message: `Couleurs du module ${module.libelle} mises a jour`,
      module
    });
  } catch (error) {
    console.error('Erreur mise a jour couleur module:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise a jour de la couleur',
      message: error.message
    });
  }
};
