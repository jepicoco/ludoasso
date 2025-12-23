/**
 * Routes pour la gestion des limites d'emprunt
 *
 * GET    /api/parametres/limites-emprunt            - Liste tous les paramètres de limites
 * GET    /api/parametres/limites-emprunt/genres/:module - Liste les limites par genre pour un module
 * POST   /api/parametres/limites-emprunt/genres     - Créer une limite par genre
 * PUT    /api/parametres/limites-emprunt/genres/:id - Modifier une limite par genre
 * DELETE /api/parametres/limites-emprunt/genres/:id - Supprimer une limite par genre
 * GET    /api/parametres/limites-emprunt/genres-disponibles/:module - Liste les genres disponibles
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const {
  LimiteEmpruntGenre, ParametresFront, ParametresFrontStructure,
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

// Mapping module -> modèle de genres
const GENRE_MODELS = {
  ludotheque: { model: Categorie, label: 'Catégories' },
  bibliotheque: { model: GenreLitteraire, label: 'Genres littéraires' },
  filmotheque: { model: GenreFilm, label: 'Genres de films' },
  discotheque: { model: GenreMusical, label: 'Genres musicaux' }
};

/**
 * GET /api/parametres/limites-emprunt
 * Récupère tous les paramètres de limites (généraux + par genre)
 * Si X-Structure-Id est fourni, utilise les paramètres de la structure
 */
router.get('/', verifyToken, checkRole(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const structureId = req.headers['x-structure-id'];
    let params;

    if (structureId) {
      // Paramètres spécifiques à la structure
      params = await getOrCreateStructureParams(parseInt(structureId));
    } else {
      // Fallback sur les paramètres globaux
      params = await ParametresFront.getParametres();
    }

    // Extraire les paramètres de limites
    const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];
    const limitesGenerales = {};

    for (const mod of modules) {
      limitesGenerales[mod] = {
        limite: params[`limite_emprunt_${mod}`] || 5,
        limiteNouveaute: params[`limite_emprunt_nouveaute_${mod}`] || 1,
        bloquante: params[`limite_emprunt_bloquante_${mod}`] !== false,
        actif: params[`limite_emprunt_active_${mod}`] !== false
      };
    }

    // Récupérer toutes les limites par genre (globales pour l'instant)
    // TODO: Ajouter structure_id à LimiteEmpruntGenre pour filtrage par structure
    const limitesGenre = await LimiteEmpruntGenre.findAll({
      order: [['module', 'ASC'], ['genre_nom', 'ASC']]
    });

    res.json({
      limitesGenerales,
      limitesGenre,
      structureId: structureId ? parseInt(structureId) : null
    });
  } catch (error) {
    console.error('Get limites emprunt error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * PUT /api/parametres/limites-emprunt
 * Met à jour les paramètres généraux de limites
 * Si X-Structure-Id est fourni, met à jour les paramètres de la structure
 */
router.put('/', verifyToken, checkRole(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const { limitesGenerales } = req.body;
    const structureId = req.headers['x-structure-id'];

    if (!limitesGenerales) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'limitesGenerales est requis'
      });
    }

    let params;
    if (structureId) {
      // Paramètres spécifiques à la structure
      params = await getOrCreateStructureParams(parseInt(structureId));
    } else {
      // Fallback sur les paramètres globaux
      params = await ParametresFront.getParametres();
    }

    const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

    for (const mod of modules) {
      if (limitesGenerales[mod]) {
        if (limitesGenerales[mod].limite !== undefined) {
          params[`limite_emprunt_${mod}`] = limitesGenerales[mod].limite;
        }
        if (limitesGenerales[mod].limiteNouveaute !== undefined) {
          params[`limite_emprunt_nouveaute_${mod}`] = limitesGenerales[mod].limiteNouveaute;
        }
        if (limitesGenerales[mod].bloquante !== undefined) {
          params[`limite_emprunt_bloquante_${mod}`] = limitesGenerales[mod].bloquante;
        }
        if (limitesGenerales[mod].actif !== undefined) {
          params[`limite_emprunt_active_${mod}`] = limitesGenerales[mod].actif;
        }
      }
    }

    await params.save();

    res.json({
      message: 'Paramètres de limites mis à jour',
      limitesGenerales,
      structureId: structureId ? parseInt(structureId) : null
    });
  } catch (error) {
    console.error('Update limites emprunt error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /api/parametres/limites-emprunt/genres/:module
 * Liste les limites par genre pour un module spécifique
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

    const limites = await LimiteEmpruntGenre.findAll({
      where: { module },
      order: [['genre_nom', 'ASC']]
    });

    res.json({ limites });
  } catch (error) {
    console.error('Get limites genre error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /api/parametres/limites-emprunt/genres-disponibles/:module
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

    // Récupérer tous les genres actifs
    const genres = await GenreModel.findAll({
      where: { actif: true },
      attributes: ['id', 'nom'],
      order: [['nom', 'ASC']]
    });

    // Récupérer les genres déjà configurés
    const limitesExistantes = await LimiteEmpruntGenre.findAll({
      where: { module },
      attributes: ['genre_id']
    });

    const genresConfigures = new Set(limitesExistantes.map(l => l.genre_id));

    // Filtrer pour ne garder que les genres non configurés
    const genresDisponibles = genres.filter(g => !genresConfigures.has(g.id));

    res.json({
      module,
      label: GENRE_MODELS[module].label,
      genres: genresDisponibles
    });
  } catch (error) {
    console.error('Get genres disponibles error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * POST /api/parametres/limites-emprunt/genres
 * Créer une nouvelle limite par genre
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

    // Vérifier que le genre existe
    const GenreModel = GENRE_MODELS[module].model;
    const genre = await GenreModel.findByPk(genre_id);

    if (!genre) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Genre introuvable'
      });
    }

    // Vérifier qu'il n'existe pas déjà
    const existante = await LimiteEmpruntGenre.findOne({
      where: { module, genre_id }
    });

    if (existante) {
      return res.status(400).json({
        error: 'Duplicate',
        message: 'Une limite existe déjà pour ce genre'
      });
    }

    // Créer la limite
    const limite = await LimiteEmpruntGenre.create({
      module,
      genre_id,
      genre_nom: genre.nom,
      limite_max,
      actif: true
    });

    res.status(201).json({
      message: 'Limite par genre créée',
      limite
    });
  } catch (error) {
    console.error('Create limite genre error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * PUT /api/parametres/limites-emprunt/genres/:id
 * Modifier une limite par genre
 */
router.put('/genres/:id', verifyToken, checkRole(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const { id } = req.params;
    const { limite_max, actif } = req.body;

    const limite = await LimiteEmpruntGenre.findByPk(id);

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
      message: 'Limite par genre mise à jour',
      limite
    });
  } catch (error) {
    console.error('Update limite genre error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/parametres/limites-emprunt/genres/:id
 * Supprimer une limite par genre
 */
router.delete('/genres/:id', verifyToken, checkRole(['administrateur', 'gestionnaire']), async (req, res) => {
  try {
    const { id } = req.params;

    const limite = await LimiteEmpruntGenre.findByPk(id);

    if (!limite) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Limite introuvable'
      });
    }

    await limite.destroy();

    res.json({
      message: 'Limite par genre supprimée'
    });
  } catch (error) {
    console.error('Delete limite genre error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

module.exports = router;
