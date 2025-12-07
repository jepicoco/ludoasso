const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {
  ParametresFront,
  Jeu,
  Livre,
  Film,
  Disque,
  Site,
  HoraireOuverture,
  FermetureExceptionnelle,
  Categorie,
  Theme,
  Mecanisme,
  GenreLitteraire,
  GenreFilm,
  GenreMusical
} = require('../models');
const RechercheNaturelleService = require('../services/rechercheNaturelleService');

// Include configurations for public queries (simplified, no sensitive data)
const JEU_INCLUDES = [
  { model: Categorie, as: 'categoriesRef', attributes: ['id', 'nom'], through: { attributes: [] } },
  { model: Theme, as: 'themesRef', attributes: ['id', 'nom'], through: { attributes: [] } },
  { model: Mecanisme, as: 'mecanismesRef', attributes: ['id', 'nom'], through: { attributes: [] } }
];

const LIVRE_INCLUDES = [
  { model: GenreLitteraire, as: 'genresRef', attributes: ['id', 'nom'], through: { attributes: [] } },
  { model: Theme, as: 'themesRef', attributes: ['id', 'nom'], through: { attributes: [] } }
];

const FILM_INCLUDES = [
  { model: GenreFilm, as: 'genresRef', attributes: ['id', 'nom'], through: { attributes: [] } },
  { model: Theme, as: 'themesRef', attributes: ['id', 'nom'], through: { attributes: [] } }
];

const DISQUE_INCLUDES = [
  { model: GenreMusical, as: 'genresRef', attributes: ['id', 'nom'], through: { attributes: [] } }
];

/**
 * Helper: Transform model data for public API response
 */
function transformRefs(item, type) {
  const json = item.toJSON();

  // Rename *Ref to cleaner names for frontend
  if (json.categoriesRef) {
    json.categories = json.categoriesRef;
    delete json.categoriesRef;
  }
  if (json.themesRef) {
    json.themes = json.themesRef;
    delete json.themesRef;
  }
  if (json.mecanismesRef) {
    json.mecanismes = json.mecanismesRef;
    delete json.mecanismesRef;
  }
  if (json.genresRef) {
    json.genres = json.genresRef;
    delete json.genresRef;
  }

  return { ...json, type, type_label: type.charAt(0).toUpperCase() + type.slice(1) };
}

/**
 * @route   GET /api/public/config
 * @desc    Get public site configuration (name, colors, modules, contact, etc.)
 * @access  Public
 */
router.get('/config', async (req, res) => {
  try {
    const parametres = await ParametresFront.getParametres();

    res.json({
      // Identite
      nom_site: parametres.nom_site,
      logo_url: parametres.logo_url,
      favicon_url: parametres.favicon_url,

      // SEO
      meta_description: parametres.meta_description,
      meta_keywords: parametres.meta_keywords,
      og_image_url: parametres.og_image_url,

      // Modules actifs
      modules: {
        ludotheque: parametres.module_ludotheque,
        bibliotheque: parametres.module_bibliotheque,
        filmotheque: parametres.module_filmotheque || false,
        discotheque: parametres.module_discotheque || false,
        inscriptions: parametres.module_inscriptions,
        reservations: parametres.module_reservations
      },

      // Style
      couleur_primaire: parametres.couleur_primaire,
      couleur_secondaire: parametres.couleur_secondaire,
      css_personnalise: parametres.css_personnalise,

      // Contact
      email_contact: parametres.email_contact,
      telephone_contact: parametres.telephone_contact,
      adresse_contact: parametres.adresse_contact,

      // Reseaux sociaux
      reseaux_sociaux: {
        facebook: parametres.facebook_url,
        instagram: parametres.instagram_url,
        twitter: parametres.twitter_url,
        youtube: parametres.youtube_url
      }
    });
  } catch (error) {
    console.error('Erreur config publique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/public/catalogue
 * @desc    Get unified catalog from all active modules
 * @access  Public
 * @query   ?type=jeux|livres|films|disques&search=&categorie=&page=1&limit=20
 */
router.get('/catalogue', async (req, res) => {
  try {
    const parametres = await ParametresFront.getParametres();
    const {
      type,
      search,
      page = 1,
      limit = 20,
      tri = 'titre',
      ordre = 'ASC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const results = {
      items: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit),
      modules_actifs: []
    };

    // Base where clause - exclude archived items
    const baseWhere = {
      statut: { [Op.notIn]: ['archive', 'perdu'] }
    };

    // Search filter
    if (search) {
      baseWhere.titre = { [Op.like]: `%${search}%` };
    }

    // Jeux have a 'prive' field, others don't
    const jeuWhere = { ...baseWhere, prive: { [Op.ne]: true } };

    // Determine which modules to query
    const modulesToQuery = [];

    if (parametres.module_ludotheque && (!type || type === 'jeux')) {
      modulesToQuery.push('jeux');
      results.modules_actifs.push('jeux');
    }
    if (parametres.module_bibliotheque && (!type || type === 'livres')) {
      modulesToQuery.push('livres');
      results.modules_actifs.push('livres');
    }
    if (parametres.module_filmotheque && (!type || type === 'films')) {
      modulesToQuery.push('films');
      results.modules_actifs.push('films');
    }
    if (parametres.module_discotheque && (!type || type === 'disques')) {
      modulesToQuery.push('disques');
      results.modules_actifs.push('disques');
    }

    // Query each active module
    if (modulesToQuery.includes('jeux')) {
      try {
        const { count, rows } = await Jeu.findAndCountAll({
          where: jeuWhere,
          attributes: ['id', 'code_barre', 'titre', 'sous_titre', 'annee_sortie',
                       'age_min', 'nb_joueurs_min', 'nb_joueurs_max', 'duree_partie',
                       'statut', 'image_url', 'prix_indicatif'],
          include: JEU_INCLUDES,
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'jeux' ? parseInt(limit) : undefined,
          offset: type === 'jeux' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(j => transformRefs(j, 'jeu')));

        if (type === 'jeux') {
          results.total = count;
        }
      } catch (err) {
        console.error('Erreur query jeux:', err.message);
      }
    }

    if (modulesToQuery.includes('livres')) {
      try {
        const { count, rows } = await Livre.findAndCountAll({
          where: { ...baseWhere },
          attributes: ['id', 'code_barre', 'titre', 'sous_titre', 'annee_publication',
                       'nb_pages', 'statut', 'image_url', 'prix_indicatif'],
          include: LIVRE_INCLUDES,
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'livres' ? parseInt(limit) : undefined,
          offset: type === 'livres' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(l => transformRefs(l, 'livre')));

        if (type === 'livres') {
          results.total = count;
        }
      } catch (err) {
        console.error('Erreur query livres:', err.message);
      }
    }

    if (modulesToQuery.includes('films')) {
      try {
        const { count, rows } = await Film.findAndCountAll({
          where: { ...baseWhere },
          attributes: ['id', 'code_barre', 'titre', 'titre_original', 'annee_sortie',
                       'duree', 'classification', 'statut', 'image_url', 'prix_indicatif'],
          include: FILM_INCLUDES,
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'films' ? parseInt(limit) : undefined,
          offset: type === 'films' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(f => transformRefs(f, 'film')));

        if (type === 'films') {
          results.total = count;
        }
      } catch (err) {
        console.error('Erreur query films:', err.message);
      }
    }

    if (modulesToQuery.includes('disques')) {
      try {
        const { count, rows } = await Disque.findAndCountAll({
          where: { ...baseWhere },
          attributes: ['id', 'code_barre', 'titre', 'titre_original', 'annee_sortie',
                       'nb_pistes', 'duree_totale', 'statut', 'image_url', 'prix_indicatif'],
          include: DISQUE_INCLUDES,
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'disques' ? parseInt(limit) : undefined,
          offset: type === 'disques' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(d => transformRefs(d, 'disque')));

        if (type === 'disques') {
          results.total = count;
        }
      } catch (err) {
        console.error('Erreur query disques:', err.message);
      }
    }

    // If no specific type, calculate total and paginate combined results
    if (!type) {
      results.total = results.items.length;
      // Sort combined results
      results.items.sort((a, b) => {
        const aVal = a[tri] || '';
        const bVal = b[tri] || '';
        return ordre === 'ASC'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
      // Paginate
      results.items = results.items.slice(offset, offset + parseInt(limit));
    }

    results.pages = Math.ceil(results.total / parseInt(limit));

    res.json(results);
  } catch (error) {
    console.error('Erreur catalogue:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * @route   GET /api/public/catalogue/:type/:id
 * @desc    Get single item details
 * @access  Public
 */
router.get('/catalogue/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const parametres = await ParametresFront.getParametres();

    let item = null;

    if (type === 'jeu' && parametres.module_ludotheque) {
      const result = await Jeu.findOne({
        where: {
          id,
          prive: { [Op.ne]: true },
          statut: { [Op.notIn]: ['archive', 'perdu'] }
        },
        include: JEU_INCLUDES
      });
      if (result) {
        item = transformRefs(result, 'jeu');
      }
    }

    if (type === 'livre' && parametres.module_bibliotheque) {
      const result = await Livre.findOne({
        where: {
          id,
          statut: { [Op.notIn]: ['archive', 'perdu'] }
        },
        include: LIVRE_INCLUDES
      });
      if (result) {
        item = transformRefs(result, 'livre');
      }
    }

    if (type === 'film' && parametres.module_filmotheque) {
      const result = await Film.findOne({
        where: {
          id,
          statut: { [Op.notIn]: ['archive', 'perdu'] }
        },
        include: FILM_INCLUDES
      });
      if (result) {
        item = transformRefs(result, 'film');
      }
    }

    if (type === 'disque' && parametres.module_discotheque) {
      const result = await Disque.findOne({
        where: {
          id,
          statut: { [Op.notIn]: ['archive', 'perdu'] }
        },
        include: DISQUE_INCLUDES
      });
      if (result) {
        item = transformRefs(result, 'disque');
      }
    }

    if (!item) {
      return res.status(404).json({ error: 'Item non trouve' });
    }

    res.json(item);
  } catch (error) {
    console.error('Erreur detail item:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * @route   GET /api/public/sites
 * @desc    Get all active sites with opening hours
 * @access  Public
 */
router.get('/sites', async (req, res) => {
  try {
    const sites = await Site.findAll({
      where: { actif: true },
      attributes: ['id', 'code', 'nom', 'type', 'description', 'adresse',
                   'code_postal', 'ville', 'telephone', 'email', 'couleur', 'icone'],
      include: [
        {
          model: HoraireOuverture,
          as: 'horaires',
          where: { actif: true },
          required: false,
          attributes: ['jour_semaine', 'heure_debut', 'heure_fin', 'recurrence',
                       'periode', 'lieu_specifique', 'adresse_specifique']
        }
      ],
      order: [['ordre_affichage', 'ASC'], ['nom', 'ASC']]
    });

    // Get current/upcoming closures
    const today = new Date();
    const inOneMonth = new Date(today);
    inOneMonth.setMonth(inOneMonth.getMonth() + 1);

    const fermetures = await FermetureExceptionnelle.findAll({
      where: {
        date_fin: { [Op.gte]: today },
        date_debut: { [Op.lte]: inOneMonth }
      },
      attributes: ['id', 'site_id', 'date_debut', 'date_fin', 'motif', 'type'],
      order: [['date_debut', 'ASC']]
    });

    res.json({
      sites,
      fermetures_a_venir: fermetures
    });
  } catch (error) {
    console.error('Erreur sites:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * @route   GET /api/public/stats
 * @desc    Get public statistics (counts)
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const parametres = await ParametresFront.getParametres();
    const stats = {};

    const baseCountWhere = {
      statut: { [Op.notIn]: ['archive', 'perdu'] }
    };

    const jeuCountWhere = {
      ...baseCountWhere,
      prive: { [Op.ne]: true }
    };

    if (parametres.module_ludotheque) {
      stats.jeux = await Jeu.count({ where: jeuCountWhere });
    }

    if (parametres.module_bibliotheque) {
      stats.livres = await Livre.count({ where: baseCountWhere });
    }

    if (parametres.module_filmotheque) {
      stats.films = await Film.count({ where: baseCountWhere });
    }

    if (parametres.module_discotheque) {
      stats.disques = await Disque.count({ where: baseCountWhere });
    }

    stats.total = Object.values(stats).reduce((a, b) => a + b, 0);

    res.json(stats);
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * @route   GET /api/public/filtres/:type
 * @desc    Get available filters for a catalog type
 * @access  Public
 */
router.get('/filtres/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const filtres = {};

    if (type === 'jeux') {
      filtres.categories = await Categorie.findAll({
        where: { actif: true },
        attributes: ['id', 'nom'],
        order: [['nom', 'ASC']]
      });
      filtres.mecanismes = await Mecanisme.findAll({
        where: { actif: true },
        attributes: ['id', 'nom'],
        order: [['nom', 'ASC']]
      });
    }

    if (type === 'livres') {
      filtres.genres = await GenreLitteraire.findAll({
        where: { actif: true },
        attributes: ['id', 'nom'],
        order: [['nom', 'ASC']]
      });
    }

    if (type === 'films') {
      filtres.genres = await GenreFilm.findAll({
        where: { actif: true },
        attributes: ['id', 'nom'],
        order: [['nom', 'ASC']]
      });
      filtres.classifications = ['TP', '-10', '-12', '-16', '-18'];
    }

    if (type === 'disques') {
      filtres.genres = await GenreMusical.findAll({
        where: { actif: true },
        attributes: ['id', 'nom'],
        order: [['nom', 'ASC']]
      });
    }

    res.json(filtres);
  } catch (error) {
    console.error('Erreur filtres:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * @route   GET /api/public/recherche-intelligente
 * @desc    Recherche par thematiques (recherche naturelle)
 * @access  Public
 * @query   q=requete&type=jeu|livre|film|disque&limit=20&offset=0
 */
router.get('/recherche-intelligente', async (req, res) => {
  try {
    const parametres = await ParametresFront.getParametres();

    // Verifier que le module recherche IA est actif
    if (!parametres.module_recherche_ia) {
      return res.status(403).json({
        error: 'Recherche intelligente non activee',
        message: 'Le module de recherche intelligente n\'est pas active sur ce site'
      });
    }

    const { q, type, limit = 20, offset = 0 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Requete invalide',
        message: 'Veuillez entrer au moins 2 caracteres'
      });
    }

    // Mapper le type frontend vers le type backend
    const typeMap = {
      'jeux': 'jeu',
      'livres': 'livre',
      'films': 'film',
      'disques': 'disque'
    };

    const typeArticle = type ? typeMap[type] || type : null;

    // Verifier que le module correspondant est actif
    if (typeArticle) {
      const moduleMap = {
        'jeu': parametres.module_ludotheque,
        'livre': parametres.module_bibliotheque,
        'film': parametres.module_filmotheque,
        'disque': parametres.module_discotheque
      };

      if (!moduleMap[typeArticle]) {
        return res.status(400).json({
          error: 'Module inactif',
          message: 'Ce type de contenu n\'est pas disponible'
        });
      }
    }

    const result = await RechercheNaturelleService.rechercher(q, {
      typeArticle,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(result);
  } catch (error) {
    console.error('Erreur recherche intelligente:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * @route   GET /api/public/recherche-intelligente/check
 * @desc    Verifie si la recherche intelligente est disponible
 * @access  Public
 */
router.get('/recherche-intelligente/check', async (req, res) => {
  try {
    const parametres = await ParametresFront.getParametres();
    res.json({
      disponible: !!parametres.module_recherche_ia
    });
  } catch (error) {
    res.json({ disponible: false });
  }
});

module.exports = router;
