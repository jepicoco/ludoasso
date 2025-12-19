/**
 * Middleware de resolution du groupe frontend
 *
 * Resoud le groupe frontend actif en fonction de:
 * 1. Domaine personnalise (ex: bibliotheque.sciez.fr)
 * 2. Slug URL (ex: /bibliotheque/catalogue)
 * 3. Groupe par defaut si aucun match
 *
 * Ajoute a req:
 * - req.groupeFrontend: le groupe frontend resolu
 * - req.structures: les structures du groupe
 * - req.structureIds: tableau des IDs de structures
 */

const { GroupeFrontend, Structure } = require('../models');

/**
 * Middleware principal de resolution du groupe frontend
 */
const groupeFrontendContext = async (req, res, next) => {
  try {
    let groupe = null;

    // 1. Resolution par domaine personnalise
    const hostname = req.hostname || req.headers.host?.split(':')[0];
    if (hostname) {
      groupe = await GroupeFrontend.findOne({
        where: {
          domaine_personnalise: hostname,
          actif: true
        },
        include: [{
          model: Structure,
          as: 'structures',
          through: { attributes: ['ordre_affichage'] },
          where: { actif: true },
          required: false
        }]
      });
    }

    // 2. Resolution par slug URL (si pas trouve par domaine)
    if (!groupe && req.params.slug) {
      groupe = await GroupeFrontend.findOne({
        where: {
          slug: req.params.slug,
          actif: true
        },
        include: [{
          model: Structure,
          as: 'structures',
          through: { attributes: ['ordre_affichage'] },
          where: { actif: true },
          required: false
        }]
      });
    }

    // 3. Groupe par defaut (premier groupe actif)
    if (!groupe) {
      groupe = await GroupeFrontend.findOne({
        where: { actif: true },
        include: [{
          model: Structure,
          as: 'structures',
          through: { attributes: ['ordre_affichage'] },
          where: { actif: true },
          required: false
        }],
        order: [['id', 'ASC']]
      });
    }

    // Si toujours pas de groupe, creer un contexte vide (toutes structures)
    if (!groupe) {
      const allStructures = await Structure.findAll({
        where: { actif: true },
        order: [['nom', 'ASC']]
      });

      req.groupeFrontend = null;
      req.structures = allStructures;
      req.structureIds = allStructures.map(s => s.id);
    } else {
      // Trier les structures par ordre d'affichage
      const structures = groupe.structures || [];
      structures.sort((a, b) => {
        const ordreA = a.GroupeFrontendStructure?.ordre_affichage || 0;
        const ordreB = b.GroupeFrontendStructure?.ordre_affichage || 0;
        return ordreA - ordreB;
      });

      req.groupeFrontend = groupe;
      req.structures = structures;
      req.structureIds = structures.map(s => s.id);
    }

    next();
  } catch (error) {
    console.error('Erreur resolution groupe frontend:', error);
    // En cas d'erreur, continuer sans contexte
    req.groupeFrontend = null;
    req.structures = [];
    req.structureIds = [];
    next();
  }
};

/**
 * Middleware pour filtrer les articles par structures du groupe
 * A utiliser apres groupeFrontendContext
 */
const filterByGroupeStructures = (req, res, next) => {
  // Si structure specifique demandee en query param, l'utiliser
  if (req.query.structure_id) {
    const requestedId = parseInt(req.query.structure_id);
    // Verifier que la structure demandee fait partie du groupe
    if (req.structureIds.length > 0 && !req.structureIds.includes(requestedId)) {
      return res.status(403).json({
        error: 'Structure non autorisee pour ce groupe'
      });
    }
    req.filterStructureIds = [requestedId];
  } else {
    // Sinon, utiliser toutes les structures du groupe
    req.filterStructureIds = req.structureIds;
  }
  next();
};

/**
 * Helper pour construire une clause WHERE Sequelize pour filtrer par structures
 * @param {Array<number>} structureIds - IDs des structures autorisees
 * @returns {Object} Clause where pour Sequelize
 */
const buildStructureWhereClause = (structureIds) => {
  if (!structureIds || structureIds.length === 0) {
    return {}; // Pas de filtre
  }

  const { Op } = require('sequelize');
  return {
    [Op.or]: [
      { structure_id: { [Op.in]: structureIds } },
      { structure_id: null } // Articles sans structure (globaux)
    ]
  };
};

/**
 * Middleware pour injecter les infos du groupe dans la reponse JSON
 */
const injectGroupeInfo = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (data) => {
    // Si c'est un objet, ajouter les infos du groupe
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      data._groupe = req.groupeFrontend ? {
        id: req.groupeFrontend.id,
        code: req.groupeFrontend.code,
        nom: req.groupeFrontend.nom,
        structures: req.structures.map(s => ({
          id: s.id,
          code: s.code,
          nom: s.nom,
          couleur: s.couleur,
          icone: s.icone
        }))
      } : null;
    }
    return originalJson(data);
  };

  next();
};

module.exports = {
  groupeFrontendContext,
  filterByGroupeStructures,
  buildStructureWhereClause,
  injectGroupeInfo
};
