/**
 * Service de validation des limites de reservation
 *
 * Gere 3 niveaux de limites hierarchiques :
 * 1. Limite generale par module (ex: max 2 jeux reservables)
 * 2. Limite par genre (ex: max 1 BD, max 1 roman)
 * 3. Limite de nouveautes (ex: max 0 nouveaute reservable)
 *
 * Les limites sont toujours bloquantes pour les reservations.
 */

const {
  Reservation, ParametresFront, LimiteReservationGenre,
  Jeu, Livre, Film, Disque,
  GenreLitteraire, GenreFilm, GenreMusical, Categorie
} = require('../models');
const { Op } = require('sequelize');

// Mapping module -> type d'item et table
const MODULE_CONFIG = {
  ludotheque: {
    itemType: 'jeu',
    model: Jeu,
    foreignKey: 'jeu_id',
    genreModel: Categorie, // Les jeux utilisent les categories comme "genres"
    genreAssociation: 'categoriesRef',
    nouveauteDureeField: 'nouveaute_duree_ludotheque',
    nouveauteActiveField: 'nouveaute_active_ludotheque'
  },
  bibliotheque: {
    itemType: 'livre',
    model: Livre,
    foreignKey: 'livre_id',
    genreModel: GenreLitteraire,
    genreAssociation: 'genresRef',
    nouveauteDureeField: 'nouveaute_duree_bibliotheque',
    nouveauteActiveField: 'nouveaute_active_bibliotheque'
  },
  filmotheque: {
    itemType: 'film',
    model: Film,
    foreignKey: 'film_id',
    genreModel: GenreFilm,
    genreAssociation: 'genresRef',
    nouveauteDureeField: 'nouveaute_duree_filmotheque',
    nouveauteActiveField: 'nouveaute_active_filmotheque'
  },
  discotheque: {
    itemType: 'disque',
    model: Disque,
    foreignKey: 'cd_id',
    genreModel: GenreMusical,
    genreAssociation: 'genresRef',
    nouveauteDureeField: 'nouveaute_duree_discotheque',
    nouveauteActiveField: 'nouveaute_active_discotheque'
  }
};

/**
 * Verifie si un article est une nouveaute
 * @param {Object} item - L'article (jeu, livre, film, disque)
 * @param {string} module - Le module (ludotheque, bibliotheque, etc.)
 * @param {Object} params - Les parametres front
 * @returns {boolean}
 */
function isNouveaute(item, module, params) {
  const config = MODULE_CONFIG[module];
  if (!config) return false;

  // Verifier si les nouveautes sont actives pour ce module
  if (!params[config.nouveauteActiveField]) return false;

  // Statut force
  if (item.statut_nouveaute === 'force_nouveau') return true;
  if (item.statut_nouveaute === 'jamais_nouveau') return false;

  // Calcul automatique base sur date_ajout
  if (!item.date_ajout) return false;

  const dureeNouveaute = params[config.nouveauteDureeField] || 30;
  const dateAjout = new Date(item.date_ajout);
  const dateLimite = new Date();
  dateLimite.setDate(dateLimite.getDate() - dureeNouveaute);

  return dateAjout >= dateLimite;
}

/**
 * Compte les reservations actives d'un utilisateur par module
 * (statuts: en_attente, prete)
 * @param {number} utilisateurId
 * @param {string} module
 * @returns {Promise<number>}
 */
async function countReservationsActives(utilisateurId, module) {
  const config = MODULE_CONFIG[module];
  if (!config) return 0;

  const where = {
    utilisateur_id: utilisateurId,
    statut: { [Op.in]: ['en_attente', 'prete'] },
    [config.foreignKey]: { [Op.not]: null }
  };

  return await Reservation.count({ where });
}

/**
 * Compte les reservations actives d'un utilisateur pour un genre specifique
 * @param {number} utilisateurId
 * @param {string} module
 * @param {number} genreId
 * @returns {Promise<number>}
 */
async function countReservationsParGenre(utilisateurId, module, genreId) {
  const config = MODULE_CONFIG[module];
  if (!config) return 0;

  // Recuperer les reservations actives pour ce module
  const reservations = await Reservation.findAll({
    where: {
      utilisateur_id: utilisateurId,
      statut: { [Op.in]: ['en_attente', 'prete'] },
      [config.foreignKey]: { [Op.not]: null }
    },
    include: [{
      model: config.model,
      as: config.itemType,
      include: [{
        model: config.genreModel,
        as: config.genreAssociation,
        where: { id: genreId },
        required: true
      }]
    }]
  });

  return reservations.filter(r => r[config.itemType]).length;
}

/**
 * Compte les reservations de nouveautes actives d'un utilisateur par module
 * @param {number} utilisateurId
 * @param {string} module
 * @param {Object} params - Les parametres front
 * @returns {Promise<number>}
 */
async function countReservationsNouveautes(utilisateurId, module, params) {
  const config = MODULE_CONFIG[module];
  if (!config) return 0;

  // Recuperer les reservations actives pour ce module avec l'item
  const reservations = await Reservation.findAll({
    where: {
      utilisateur_id: utilisateurId,
      statut: { [Op.in]: ['en_attente', 'prete'] },
      [config.foreignKey]: { [Op.not]: null }
    },
    include: [{
      model: config.model,
      as: config.itemType
    }]
  });

  // Filtrer ceux qui sont des nouveautes
  let count = 0;
  for (const reservation of reservations) {
    const item = reservation[config.itemType];
    if (item && isNouveaute(item, module, params)) {
      count++;
    }
  }

  return count;
}

/**
 * Recupere les genres d'un article
 * @param {Object} item - L'article charge avec ses associations
 * @param {string} module
 * @returns {Array<{id: number, nom: string}>}
 */
function getGenresFromItem(item, module) {
  const config = MODULE_CONFIG[module];
  if (!config || !item) return [];

  const genres = item[config.genreAssociation];
  if (!genres || !Array.isArray(genres)) return [];

  return genres.map(g => ({ id: g.id, nom: g.nom }));
}

/**
 * Verifie si le module de reservation est actif
 * @param {string} module
 * @param {Object} params - Les parametres front
 * @returns {boolean}
 */
function isReservationActive(module, params) {
  // Verifier module_reservations global
  if (!params.module_reservations) return false;

  // Verifier reservation_active_<module>
  const activeField = `reservation_active_${module}`;
  return params[activeField] !== false;
}

/**
 * Valide les limites de reservation pour un utilisateur et un article
 *
 * @param {number} utilisateurId - ID de l'utilisateur
 * @param {string} module - Module concerne (ludotheque, bibliotheque, filmotheque, discotheque)
 * @param {number} itemId - ID de l'article a reserver
 * @param {Object} options - Options
 * @param {boolean} options.skipWarnings - Si true, ignore les limites non-bloquantes
 * @returns {Promise<{
 *   allowed: boolean,
 *   blocking: boolean,
 *   warnings: Array<{type: string, message: string, current: number, limit: number}>,
 *   errors: Array<{type: string, message: string, current: number, limit: number}>
 * }>}
 */
async function validateReservationLimits(utilisateurId, module, itemId, options = {}) {
  const result = {
    allowed: true,
    blocking: false,
    warnings: [],
    errors: []
  };

  const config = MODULE_CONFIG[module];
  if (!config) {
    return result; // Module inconnu, pas de validation
  }

  // Charger les parametres
  const params = await ParametresFront.getParametres();

  // Verifier si les reservations sont actives
  if (!isReservationActive(module, params)) {
    result.allowed = false;
    result.blocking = true;
    result.errors.push({
      type: 'module_inactif',
      message: 'Les reservations ne sont pas actives pour ce module',
      current: 0,
      limit: 0
    });
    return result;
  }

  // Recuperer les parametres de limite pour ce module
  const limiteGenerale = params[`limite_reservation_${module}`] || 2;
  const limiteNouveaute = params[`limite_reservation_nouveaute_${module}`] || 0;

  // Charger l'article avec ses genres
  const item = await config.model.findByPk(itemId, {
    include: [{
      model: config.genreModel,
      as: config.genreAssociation
    }]
  });

  if (!item) {
    result.allowed = false;
    result.blocking = true;
    result.errors.push({
      type: 'item_not_found',
      message: 'Article introuvable',
      current: 0,
      limit: 0
    });
    return result;
  }

  // Verifier si l'utilisateur a deja une reservation active pour cet article
  const existingReservation = await Reservation.findActiveForUserAndItem(
    utilisateurId,
    config.itemType,
    itemId
  );

  if (existingReservation) {
    result.allowed = false;
    result.blocking = true;
    result.errors.push({
      type: 'deja_reserve',
      message: 'Vous avez deja une reservation active pour cet article',
      current: 1,
      limit: 1
    });
    return result;
  }

  // 1. Verifier la limite generale
  const currentTotal = await countReservationsActives(utilisateurId, module);
  if (currentTotal >= limiteGenerale) {
    result.allowed = false;
    result.blocking = true;
    result.errors.push({
      type: 'limite_generale',
      message: `Limite de reservations atteinte (${currentTotal}/${limiteGenerale})`,
      current: currentTotal,
      limit: limiteGenerale
    });
  }

  // 2. Verifier la limite de nouveaute (si l'article est une nouveaute)
  if (isNouveaute(item, module, params)) {
    const currentNouveautes = await countReservationsNouveautes(utilisateurId, module, params);
    if (currentNouveautes >= limiteNouveaute) {
      result.allowed = false;
      result.blocking = true;
      result.errors.push({
        type: 'limite_nouveaute',
        message: limiteNouveaute === 0
          ? 'Les nouveautes ne sont pas reservables'
          : `Limite de nouveautes atteinte (${currentNouveautes}/${limiteNouveaute})`,
        current: currentNouveautes,
        limit: limiteNouveaute
      });
    }
  }

  // 3. Verifier les limites par genre
  const genres = getGenresFromItem(item, module);
  const limitesGenre = await LimiteReservationGenre.findAll({
    where: {
      module,
      actif: true,
      genre_id: { [Op.in]: genres.map(g => g.id) }
    }
  });

  for (const limiteGenre of limitesGenre) {
    const genre = genres.find(g => g.id === limiteGenre.genre_id);
    const currentGenre = await countReservationsParGenre(utilisateurId, module, limiteGenre.genre_id);

    if (currentGenre >= limiteGenre.limite_max) {
      result.allowed = false;
      result.blocking = true;
      result.errors.push({
        type: 'limite_genre',
        message: `Limite pour "${genre?.nom || limiteGenre.genre_nom}" atteinte (${currentGenre}/${limiteGenre.limite_max})`,
        current: currentGenre,
        limit: limiteGenre.limite_max,
        genreId: limiteGenre.genre_id,
        genreNom: genre?.nom || limiteGenre.genre_nom
      });
    }
  }

  return result;
}

/**
 * Recupere le resume des limites actuelles pour un utilisateur et un module
 *
 * @param {number} utilisateurId
 * @param {string} module
 * @returns {Promise<{
 *   general: {current: number, limit: number},
 *   nouveautes: {current: number, limit: number},
 *   genres: Array<{genreId: number, genreNom: string, current: number, limit: number}>
 * }>}
 */
async function getLimitsSummary(utilisateurId, module) {
  const config = MODULE_CONFIG[module];
  if (!config) return null;

  const params = await ParametresFront.getParametres();

  const limiteGenerale = params[`limite_reservation_${module}`] || 2;
  const limiteNouveaute = params[`limite_reservation_nouveaute_${module}`] || 0;

  const currentTotal = await countReservationsActives(utilisateurId, module);
  const currentNouveautes = await countReservationsNouveautes(utilisateurId, module, params);

  // Recuperer toutes les limites par genre pour ce module
  const limitesGenre = await LimiteReservationGenre.findAll({
    where: { module, actif: true }
  });

  const genres = [];
  for (const limite of limitesGenre) {
    const current = await countReservationsParGenre(utilisateurId, module, limite.genre_id);
    genres.push({
      genreId: limite.genre_id,
      genreNom: limite.genre_nom,
      current,
      limit: limite.limite_max
    });
  }

  return {
    general: { current: currentTotal, limit: limiteGenerale },
    nouveautes: { current: currentNouveautes, limit: limiteNouveaute },
    genres
  };
}

/**
 * Calcule la position dans la file d'attente pour un nouvel article
 * @param {string} itemType - Type d'article (jeu, livre, film, cd)
 * @param {number} itemId - ID de l'article
 * @returns {Promise<number>}
 */
async function getNextQueuePosition(itemType, itemId) {
  return await Reservation.getNextQueuePosition(itemType, itemId);
}

/**
 * Verifie si un article est disponible ou deja reserve/emprunte
 * @param {string} module
 * @param {number} itemId
 * @returns {Promise<{available: boolean, status: string, queueLength: number}>}
 */
async function checkArticleAvailability(module, itemId) {
  const config = MODULE_CONFIG[module];
  if (!config) return { available: false, status: 'unknown', queueLength: 0 };

  const item = await config.model.findByPk(itemId);
  if (!item) return { available: false, status: 'not_found', queueLength: 0 };

  const queueLength = await Reservation.countQueueForItem(config.itemType, itemId);

  return {
    available: item.statut === 'disponible',
    status: item.statut,
    queueLength
  };
}

module.exports = {
  validateReservationLimits,
  getLimitsSummary,
  countReservationsActives,
  countReservationsParGenre,
  countReservationsNouveautes,
  isNouveaute,
  isReservationActive,
  getNextQueuePosition,
  checkArticleAvailability,
  MODULE_CONFIG
};
