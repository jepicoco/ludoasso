/**
 * Routes pour la gestion des limites de reservation
 *
 * GET    /api/parametres/limites-reservation            - Liste tous les parametres de limites
 * PUT    /api/parametres/limites-reservation            - Met a jour les parametres generaux
 * GET    /api/parametres/limites-reservation/genres/:module - Liste les limites par genre pour un module
 * POST   /api/parametres/limites-reservation/genres     - Creer une limite par genre
 * PUT    /api/parametres/limites-reservation/genres/:id - Modifier une limite par genre
 * DELETE /api/parametres/limites-reservation/genres/:id - Supprimer une limite par genre
 * GET    /api/parametres/limites-reservation/genres-disponibles/:module - Liste les genres disponibles
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const {
  LimiteReservationGenre, ParametresFront, ParametresFrontStructure,
  Categorie, GenreLitteraire, GenreFilm, GenreMusical
} = require('../models');

/**
 * Helper: Get or create ParametresFrontStructure for a given structure_id
 */
async function getOrCreateStructureParams(structureId) {
  if (!structureId) {
    return null;
  }

  let params = await ParametresFrontStructure.findOne({
    where: { structure_id: structureId }
  });

  if (!params) {
    params = await ParametresFrontStructure.create({
      structure_id: structureId
    });
  }

  return params;
}

// Mapping module -> modele de genres
const GENRE_MODELS = {
  ludotheque: { model: Categorie, label: 'Categories' },
  bibliotheque: { model: GenreLitteraire, label: 'Genres litteraires' },
  filmotheque: { model: GenreFilm, label: 'Genres de films' },
  discotheque: { model: GenreMusical, label: 'Genres musicaux' }
};

/**
 * GET /api/parametres/limites-reservation
 * Recupere tous les parametres de limites (generaux + par genre)
 * Si X-Structure-Id est fourni, utilise les parametres de la structure
 */
router.get('/', verifyToken, checkRole(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const structureId = req.headers['x-structure-id'];
    let params;

    if (structureId) {
      // Parametres specifiques a la structure
      params = await getOrCreateStructureParams(parseInt(structureId));
    } else {
      // Fallback sur les parametres globaux
      params = await ParametresFront.getParametres();
    }

    // Extraire les parametres de limites
    const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];
    const limitesGenerales = {};

    for (const mod of modules) {
      limitesGenerales[mod] = {
        limite: params[`limite_reservation_${mod}`] || 2,
        limiteNouveaute: params[`limite_reservation_nouveaute_${mod}`] || 0,
        joursExpiration: params[`reservation_expiration_jours_${mod}`] || 15,
        actif: params[`reservation_active_${mod}`] !== false
      };
    }

    // Module reservations global (from global params)
    const globalParams = await ParametresFront.getParametres();
    const moduleReservationsActif = globalParams.module_reservations !== false;

    // Recuperer toutes les limites par genre (globales pour l'instant)
    // TODO: Ajouter structure_id a LimiteReservationGenre pour filtrage par structure
    const limitesGenre = await LimiteReservationGenre.findAll({
      order: [['module', 'ASC'], ['genre_nom', 'ASC']]
    });

    res.json({
      moduleReservationsActif,
      limitesGenerales,
      limitesGenre,
      structureId: structureId ? parseInt(structureId) : null
    });
  } catch (error) {
    console.error('Get limites reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * PUT /api/parametres/limites-reservation
 * Met a jour les parametres generaux de limites
 * Si X-Structure-Id est fourni, met a jour les parametres de la structure
 */
router.put('/', verifyToken, checkRole(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const { limitesGenerales, moduleReservationsActif } = req.body;
    const structureId = req.headers['x-structure-id'];

    let params;
    if (structureId) {
      // Parametres specifiques a la structure
      params = await getOrCreateStructureParams(parseInt(structureId));
    } else {
      // Fallback sur les parametres globaux
      params = await ParametresFront.getParametres();
    }

    const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

    // Module reservations global (only update global params, not structure params)
    if (moduleReservationsActif !== undefined && !structureId) {
      params.module_reservations = moduleReservationsActif;
    }

    // Limites par module
    if (limitesGenerales) {
      for (const mod of modules) {
        if (limitesGenerales[mod]) {
          if (limitesGenerales[mod].limite !== undefined) {
            params[`limite_reservation_${mod}`] = limitesGenerales[mod].limite;
          }
          if (limitesGenerales[mod].limiteNouveaute !== undefined) {
            params[`limite_reservation_nouveaute_${mod}`] = limitesGenerales[mod].limiteNouveaute;
          }
          if (limitesGenerales[mod].joursExpiration !== undefined) {
            params[`reservation_expiration_jours_${mod}`] = limitesGenerales[mod].joursExpiration;
          }
          if (limitesGenerales[mod].actif !== undefined) {
            params[`reservation_active_${mod}`] = limitesGenerales[mod].actif;
          }
        }
      }
    }

    await params.save();

    // Get global moduleReservationsActif for response
    const globalParams = structureId ? await ParametresFront.getParametres() : params;

    res.json({
      message: 'Parametres de limites de reservation mis a jour',
      limitesGenerales,
      moduleReservationsActif: globalParams.module_reservations,
      structureId: structureId ? parseInt(structureId) : null
    });
  } catch (error) {
    console.error('Update limites reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /api/parametres/limites-reservation/genres/:module
 * Liste les limites par genre pour un module specifique
 */
router.get('/genres/:module', verifyToken, checkRole(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const { module } = req.params;

    if (!GENRE_MODELS[module]) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Module invalide'
      });
    }

    const limites = await LimiteReservationGenre.findAll({
      where: { module },
      order: [['genre_nom', 'ASC']]
    });

    res.json({ limites });
  } catch (error) {
    console.error('Get limites genre reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /api/parametres/limites-reservation/genres-disponibles/:module
 * Liste les genres disponibles pour un module (pour ajout de nouvelles limites)
 */
router.get('/genres-disponibles/:module', verifyToken, checkRole(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const { module } = req.params;

    if (!GENRE_MODELS[module]) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Module invalide'
      });
    }

    const GenreModel = GENRE_MODELS[module].model;

    // Recuperer tous les genres actifs
    const genres = await GenreModel.findAll({
      where: { actif: true },
      attributes: ['id', 'nom'],
      order: [['nom', 'ASC']]
    });

    // Recuperer les genres deja configures
    const limitesExistantes = await LimiteReservationGenre.findAll({
      where: { module },
      attributes: ['genre_id']
    });

    const genresConfigures = new Set(limitesExistantes.map(l => l.genre_id));

    // Filtrer pour ne garder que les genres non configures
    const genresDisponibles = genres.filter(g => !genresConfigures.has(g.id));

    res.json({
      module,
      label: GENRE_MODELS[module].label,
      genres: genresDisponibles
    });
  } catch (error) {
    console.error('Get genres disponibles reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * POST /api/parametres/limites-reservation/genres
 * Creer une nouvelle limite par genre
 */
router.post('/genres', verifyToken, checkRole(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const { module, genre_id, limite_max } = req.body;

    if (!module || !genre_id || limite_max === undefined) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'module, genre_id et limite_max sont requis'
      });
    }

    if (!GENRE_MODELS[module]) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Module invalide'
      });
    }

    // Verifier que le genre existe
    const GenreModel = GENRE_MODELS[module].model;
    const genre = await GenreModel.findByPk(genre_id);

    if (!genre) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Genre introuvable'
      });
    }

    // Verifier qu'il n'existe pas deja
    const existante = await LimiteReservationGenre.findOne({
      where: { module, genre_id }
    });

    if (existante) {
      return res.status(400).json({
        error: 'Duplicate',
        message: 'Une limite existe deja pour ce genre'
      });
    }

    // Creer la limite
    const limite = await LimiteReservationGenre.create({
      module,
      genre_id,
      genre_nom: genre.nom,
      limite_max,
      actif: true
    });

    res.status(201).json({
      message: 'Limite par genre creee',
      limite
    });
  } catch (error) {
    console.error('Create limite genre reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * PUT /api/parametres/limites-reservation/genres/:id
 * Modifier une limite par genre
 */
router.put('/genres/:id', verifyToken, checkRole(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const { id } = req.params;
    const { limite_max, actif } = req.body;

    const limite = await LimiteReservationGenre.findByPk(id);

    if (!limite) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Limite introuvable'
      });
    }

    if (limite_max !== undefined) limite.limite_max = limite_max;
    if (actif !== undefined) limite.actif = actif;

    await limite.save();

    res.json({
      message: 'Limite par genre mise a jour',
      limite
    });
  } catch (error) {
    console.error('Update limite genre reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/parametres/limites-reservation/genres/:id
 * Supprimer une limite par genre
 */
router.delete('/genres/:id', verifyToken, checkRole(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const { id } = req.params;

    const limite = await LimiteReservationGenre.findByPk(id);

    if (!limite) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Limite introuvable'
      });
    }

    await limite.destroy();

    res.json({
      message: 'Limite par genre supprimee'
    });
  } catch (error) {
    console.error('Delete limite genre reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

module.exports = router;
