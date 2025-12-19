/**
 * GroupeFrontend Controller
 * Gestion des groupes de structures pour le frontend public
 */

const {
  GroupeFrontend,
  GroupeFrontendStructure,
  Structure,
  ParametresFrontStructure,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const portalSettingsService = require('../services/portalSettingsService');

/**
 * Liste tous les groupes frontend
 */
exports.getAll = async (req, res) => {
  try {
    const { actif } = req.query;
    const where = {};

    if (actif !== undefined) {
      where.actif = actif === 'true' || actif === '1';
    }

    const groupes = await GroupeFrontend.findAll({
      where,
      include: [{
        model: Structure,
        as: 'structures',
        through: { attributes: ['ordre_affichage'] },
        include: [{ model: ParametresFrontStructure, as: 'parametresFront' }]
      }],
      order: [['nom', 'ASC']]
    });

    res.json(groupes);
  } catch (error) {
    console.error('Erreur getAll groupes frontend:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Recupere un groupe par ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const groupe = await GroupeFrontend.findByPk(id, {
      include: [{
        model: Structure,
        as: 'structures',
        through: { attributes: ['ordre_affichage'] },
        include: [{ model: ParametresFrontStructure, as: 'parametresFront' }]
      }]
    });

    if (!groupe) {
      return res.status(404).json({ error: 'Groupe introuvable' });
    }

    res.json(groupe);
  } catch (error) {
    console.error('Erreur getById groupe frontend:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Recupere un groupe par son slug (pour le routing public)
 */
exports.getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const groupe = await GroupeFrontend.findOne({
      where: { slug, actif: true },
      include: [{
        model: Structure,
        as: 'structures',
        where: { actif: true },
        required: false,
        through: { attributes: ['ordre_affichage'] },
        include: [{ model: ParametresFrontStructure, as: 'parametresFront' }]
      }]
    });

    if (!groupe) {
      return res.status(404).json({ error: 'Groupe introuvable' });
    }

    // Trier les structures par ordre_affichage
    if (groupe.structures) {
      groupe.structures.sort((a, b) => {
        const ordreA = a.GroupeFrontendStructure?.ordre_affichage || 0;
        const ordreB = b.GroupeFrontendStructure?.ordre_affichage || 0;
        return ordreA - ordreB;
      });
    }

    res.json(groupe);
  } catch (error) {
    console.error('Erreur getBySlug groupe frontend:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Recupere un groupe par domaine personnalise
 */
exports.getByDomain = async (req, res) => {
  try {
    const { domain } = req.params;

    const groupe = await GroupeFrontend.findOne({
      where: { domaine_personnalise: domain, actif: true },
      include: [{
        model: Structure,
        as: 'structures',
        where: { actif: true },
        required: false,
        through: { attributes: ['ordre_affichage'] },
        include: [{ model: ParametresFrontStructure, as: 'parametresFront' }]
      }]
    });

    if (!groupe) {
      return res.status(404).json({ error: 'Groupe introuvable pour ce domaine' });
    }

    res.json(groupe);
  } catch (error) {
    console.error('Erreur getByDomain groupe frontend:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Cree un nouveau groupe frontend
 */
exports.create = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      code,
      nom,
      slug,
      domaine_personnalise,
      theme_code,
      logo_url,
      nom_affiche,
      favicon_url,
      meta_description,
      email_contact,
      telephone_contact,
      mode_maintenance,
      message_maintenance,
      parametres,
      structure_ids
    } = req.body;

    // Validation
    if (!code || !nom) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Code et nom obligatoires' });
    }

    // Verifier unicite code
    const existingCode = await GroupeFrontend.findOne({ where: { code } });
    if (existingCode) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Ce code de groupe existe deja' });
    }

    // Verifier unicite slug si fourni
    if (slug) {
      const existingSlug = await GroupeFrontend.findOne({ where: { slug } });
      if (existingSlug) {
        await transaction.rollback();
        return res.status(409).json({ error: 'Ce slug existe deja' });
      }
    }

    // Creer groupe
    const groupe = await GroupeFrontend.create({
      code,
      nom,
      slug: slug || code.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      domaine_personnalise,
      theme_code: theme_code || 'default',
      logo_url,
      nom_affiche,
      favicon_url,
      meta_description,
      email_contact,
      telephone_contact,
      mode_maintenance: mode_maintenance || false,
      message_maintenance,
      parametres: parametres || {},
      actif: true
    }, { transaction });

    // Ajouter structures si fournies
    if (structure_ids && structure_ids.length > 0) {
      const liaisons = structure_ids.map((structureId, index) => ({
        groupe_frontend_id: groupe.id,
        structure_id: structureId,
        ordre_affichage: index
      }));

      await GroupeFrontendStructure.bulkCreate(liaisons, { transaction });
    }

    await transaction.commit();

    // Recharger avec structures
    const createdGroupe = await GroupeFrontend.findByPk(groupe.id, {
      include: [{ model: Structure, as: 'structures' }]
    });

    res.status(201).json(createdGroupe);
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur create groupe frontend:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Met a jour un groupe frontend
 */
exports.update = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      code,
      nom,
      slug,
      domaine_personnalise,
      theme_code,
      logo_url,
      nom_affiche,
      favicon_url,
      meta_description,
      email_contact,
      telephone_contact,
      mode_maintenance,
      message_maintenance,
      parametres,
      actif,
      structure_ids
    } = req.body;

    const groupe = await GroupeFrontend.findByPk(id);
    if (!groupe) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Groupe introuvable' });
    }

    // Verifier unicite code si modifie
    if (code && code !== groupe.code) {
      const existing = await GroupeFrontend.findOne({ where: { code } });
      if (existing) {
        await transaction.rollback();
        return res.status(409).json({ error: 'Ce code de groupe existe deja' });
      }
    }

    // Verifier unicite slug si modifie
    if (slug && slug !== groupe.slug) {
      const existing = await GroupeFrontend.findOne({ where: { slug } });
      if (existing) {
        await transaction.rollback();
        return res.status(409).json({ error: 'Ce slug existe deja' });
      }
    }

    // Preparer les donnees de mise a jour
    const updateData = {
      code,
      nom,
      slug,
      domaine_personnalise,
      theme_code,
      logo_url,
      nom_affiche,
      favicon_url,
      meta_description,
      email_contact,
      telephone_contact,
      actif
    };

    // Gerer mode_maintenance et message_maintenance
    if (mode_maintenance !== undefined) {
      updateData.mode_maintenance = mode_maintenance;
    }
    if (message_maintenance !== undefined) {
      updateData.message_maintenance = message_maintenance;
    }

    // Gerer les parametres JSON (merge avec existants)
    if (parametres !== undefined) {
      // Merge avec parametres existants
      updateData.parametres = { ...(groupe.parametres || {}), ...parametres };
    }

    // Mettre a jour groupe
    await groupe.update(updateData, { transaction });

    // Mettre a jour structures si fournies
    if (structure_ids !== undefined) {
      // Supprimer anciennes liaisons
      await GroupeFrontendStructure.destroy({
        where: { groupe_frontend_id: id },
        transaction
      });

      // Ajouter nouvelles liaisons
      if (structure_ids.length > 0) {
        const liaisons = structure_ids.map((structureId, index) => ({
          groupe_frontend_id: groupe.id,
          structure_id: structureId,
          ordre_affichage: index
        }));

        await GroupeFrontendStructure.bulkCreate(liaisons, { transaction });
      }
    }

    await transaction.commit();

    // Recharger avec structures
    const updatedGroupe = await GroupeFrontend.findByPk(id, {
      include: [{ model: Structure, as: 'structures' }]
    });

    res.json(updatedGroupe);
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur update groupe frontend:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Supprime un groupe frontend
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const groupe = await GroupeFrontend.findByPk(id);
    if (!groupe) {
      return res.status(404).json({ error: 'Groupe introuvable' });
    }

    // Les liaisons seront supprimees en cascade
    await groupe.destroy();
    res.json({ message: 'Groupe supprime' });
  } catch (error) {
    console.error('Erreur delete groupe frontend:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Active/Desactive un groupe
 */
exports.toggle = async (req, res) => {
  try {
    const { id } = req.params;

    const groupe = await GroupeFrontend.findByPk(id);
    if (!groupe) {
      return res.status(404).json({ error: 'Groupe introuvable' });
    }

    await groupe.update({ actif: !groupe.actif });
    res.json({ actif: groupe.actif, message: groupe.actif ? 'Groupe active' : 'Groupe desactive' });
  } catch (error) {
    console.error('Erreur toggle groupe frontend:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Met a jour l'ordre des structures dans un groupe
 */
exports.updateStructuresOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { structure_ids } = req.body;

    if (!structure_ids || !Array.isArray(structure_ids)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'structure_ids obligatoire (tableau)' });
    }

    // Supprimer anciennes liaisons
    await GroupeFrontendStructure.destroy({
      where: { groupe_frontend_id: id },
      transaction
    });

    // Recreer avec nouvel ordre
    const liaisons = structure_ids.map((structureId, index) => ({
      groupe_frontend_id: parseInt(id),
      structure_id: structureId,
      ordre_affichage: index
    }));

    await GroupeFrontendStructure.bulkCreate(liaisons, { transaction });

    await transaction.commit();

    // Recharger
    const groupe = await GroupeFrontend.findByPk(id, {
      include: [{ model: Structure, as: 'structures' }]
    });

    res.json(groupe);
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur updateStructuresOrder:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

// ============================================
// Gestion des parametres du portail
// ============================================

/**
 * Recupere les parametres resolus d'un portail (avec fallback global)
 */
exports.getResolvedParams = async (req, res) => {
  try {
    const { id } = req.params;

    const groupe = await GroupeFrontend.findByPk(id);
    if (!groupe) {
      return res.status(404).json({ error: 'Groupe introuvable' });
    }

    const resolvedParams = await portalSettingsService.getResolvedPortalParams(groupe);
    res.json(resolvedParams);
  } catch (error) {
    console.error('Erreur getResolvedParams:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Met a jour les parametres specifiques d'un portail (JSON overrides)
 */
exports.updateParametres = async (req, res) => {
  try {
    const { id } = req.params;
    const { parametres } = req.body;

    const groupe = await GroupeFrontend.findByPk(id);
    if (!groupe) {
      return res.status(404).json({ error: 'Groupe introuvable' });
    }

    // Merge avec parametres existants
    const newParametres = { ...(groupe.parametres || {}), ...parametres };
    await groupe.update({ parametres: newParametres });

    res.json({
      message: 'Parametres mis a jour',
      parametres: newParametres
    });
  } catch (error) {
    console.error('Erreur updateParametres:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Supprime un ou plusieurs parametres specifiques d'un portail
 */
exports.deleteParametres = async (req, res) => {
  try {
    const { id } = req.params;
    const { keys } = req.body; // Array de cles a supprimer

    if (!keys || !Array.isArray(keys)) {
      return res.status(400).json({ error: 'keys obligatoire (tableau)' });
    }

    const groupe = await GroupeFrontend.findByPk(id);
    if (!groupe) {
      return res.status(404).json({ error: 'Groupe introuvable' });
    }

    // Supprimer les cles specifiees
    const newParametres = { ...(groupe.parametres || {}) };
    keys.forEach(key => delete newParametres[key]);

    await groupe.update({ parametres: newParametres });

    res.json({
      message: 'Parametres supprimes',
      deletedKeys: keys,
      parametres: newParametres
    });
  } catch (error) {
    console.error('Erreur deleteParametres:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};

/**
 * Retourne la liste des parametres configurables avec leurs categories
 */
exports.getConfigurableParams = async (req, res) => {
  try {
    res.json(portalSettingsService.CONFIGURABLE_PARAMS);
  } catch (error) {
    console.error('Erreur getConfigurableParams:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
};
