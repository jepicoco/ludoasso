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
  GenreMusical,
  Structure,
  GroupeFrontend
} = require('../models');
const RechercheNaturelleService = require('../services/rechercheNaturelleService');
const themesSiteController = require('../controllers/themesSiteController');
const {
  isNouveau,
  getParamsNouveaute,
  buildNouveauteWhereClause
} = require('../utils/nouveauteHelper');
const {
  groupeFrontendContext,
  filterByGroupeStructures,
  buildStructureWhereClause
} = require('../middleware/groupeFrontendContext');

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
 * @param {Object} item - Sequelize model instance
 * @param {string} type - Type of item (jeu, livre, film, disque)
 * @param {Object} nouveauteParams - Optional { duree, actif } params for novelty calculation
 */
function transformRefs(item, type, nouveauteParams = null) {
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

  // Add novelty status if params provided
  if (nouveauteParams) {
    json.est_nouveau = isNouveau(json, nouveauteParams.duree, nouveauteParams.actif);
  }

  return { ...json, type, type_label: type.charAt(0).toUpperCase() + type.slice(1) };
}

/**
 * Helper: Build public config response
 */
async function getPublicConfig() {
  const parametres = await ParametresFront.getParametres();

  return {
    // Identite
    nom_site: parametres.nom_site,
    nom: parametres.nom_site, // Alias for themes
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
      reservations: parametres.module_reservations,
      recherche_ia: parametres.module_recherche_ia || false,
      plan_interactif: parametres.module_plan_interactif || false
    },

    // Modules (format direct pour compatibilite themes)
    module_ludotheque: parametres.module_ludotheque,
    module_bibliotheque: parametres.module_bibliotheque,
    module_filmotheque: parametres.module_filmotheque || false,
    module_discotheque: parametres.module_discotheque || false,
    module_inscriptions: parametres.module_inscriptions,
    module_reservations: parametres.module_reservations,
    module_recherche_ia: parametres.module_recherche_ia || false,
    module_plan_interactif: parametres.module_plan_interactif || false,

    // Style
    couleur_primaire: parametres.couleur_primaire,
    couleur_secondaire: parametres.couleur_secondaire,
    css_personnalise: parametres.css_personnalise,

    // Contact
    email_contact: parametres.email_contact,
    email: parametres.email_contact, // Alias for themes
    telephone_contact: parametres.telephone_contact,
    telephone: parametres.telephone_contact, // Alias for themes
    adresse_contact: parametres.adresse_contact,
    adresse: parametres.adresse_contact, // Alias for themes

    // Reseaux sociaux
    reseaux_sociaux: {
      facebook: parametres.facebook_url,
      instagram: parametres.instagram_url,
      twitter: parametres.twitter_url,
      youtube: parametres.youtube_url
    }
  };
}

/**
 * @route   GET /api/public/config
 * @desc    Get public site configuration (name, colors, modules, contact, etc.)
 * @access  Public
 */
router.get('/config', async (req, res) => {
  try {
    const config = await getPublicConfig();
    res.json(config);
  } catch (error) {
    console.error('Erreur config publique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/public/parametres
 * @desc    Alias for /config - Get public site configuration
 * @access  Public
 */
router.get('/parametres', async (req, res) => {
  try {
    const config = await getPublicConfig();
    res.json(config);
  } catch (error) {
    console.error('Erreur parametres publics:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/public/catalogue
 * @desc    Get unified catalog from all active modules
 * @access  Public
 * @query   ?type=jeux|livres|films|disques&search=&categorie=&page=1&limit=20&nouveautes=true
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
      ordre = 'ASC',
      nouveautes
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const results = {
      items: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit),
      modules_actifs: []
    };

    // Filter by novelty only?
    const filterNouveautes = nouveautes === 'true' || nouveautes === '1';

    // Get novelty params for each module
    const nouveauteParamsJeux = getParamsNouveaute(parametres, 'ludotheque');
    const nouveauteParamsLivres = getParamsNouveaute(parametres, 'bibliotheque');
    const nouveauteParamsFilms = getParamsNouveaute(parametres, 'filmotheque');
    const nouveauteParamsDisques = getParamsNouveaute(parametres, 'discotheque');

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

    // Add novelty filter if requested
    if (filterNouveautes) {
      const nouveauteWhereJeux = buildNouveauteWhereClause('ludotheque', parametres);
      const nouveauteWhereLivres = buildNouveauteWhereClause('bibliotheque', parametres);
      const nouveauteWhereFilms = buildNouveauteWhereClause('filmotheque', parametres);
      const nouveauteWhereDisques = buildNouveauteWhereClause('discotheque', parametres);

      if (nouveauteWhereJeux) {
        Object.assign(jeuWhere, nouveauteWhereJeux);
      }
      if (nouveauteWhereLivres) {
        Object.assign(baseWhere, nouveauteWhereLivres);
      }
    }

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
        // Build jeux where clause (with novelty filter if needed)
        let jeuxWhere = { ...jeuWhere };
        if (filterNouveautes) {
          const nouveauteWhereJeux = buildNouveauteWhereClause('ludotheque', parametres);
          if (nouveauteWhereJeux) {
            jeuxWhere = { ...jeuxWhere, ...nouveauteWhereJeux };
          }
        }

        const { count, rows } = await Jeu.findAndCountAll({
          where: jeuxWhere,
          attributes: ['id', 'code_barre', 'titre', 'sous_titre', 'annee_sortie',
                       'age_min', 'nb_joueurs_min', 'nb_joueurs_max', 'duree_partie',
                       'statut', 'image_url', 'prix_indicatif', 'date_acquisition', 'statut_nouveaute'],
          include: JEU_INCLUDES,
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'jeux' ? parseInt(limit) : undefined,
          offset: type === 'jeux' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(j => transformRefs(j, 'jeu', nouveauteParamsJeux)));

        if (type === 'jeux') {
          results.total = count;
        }
      } catch (err) {
        console.error('Erreur query jeux:', err.message);
      }
    }

    if (modulesToQuery.includes('livres')) {
      try {
        // Build livres where clause (with novelty filter if needed)
        let livresWhere = { ...baseWhere };
        if (filterNouveautes) {
          const nouveauteWhereLivres = buildNouveauteWhereClause('bibliotheque', parametres);
          if (nouveauteWhereLivres) {
            livresWhere = { ...livresWhere, ...nouveauteWhereLivres };
          }
        }

        const { count, rows } = await Livre.findAndCountAll({
          where: livresWhere,
          attributes: ['id', 'code_barre', 'titre', 'sous_titre', 'annee_publication',
                       'nb_pages', 'statut', 'image_url', 'prix_indicatif', 'date_acquisition', 'statut_nouveaute'],
          include: LIVRE_INCLUDES,
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'livres' ? parseInt(limit) : undefined,
          offset: type === 'livres' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(l => transformRefs(l, 'livre', nouveauteParamsLivres)));

        if (type === 'livres') {
          results.total = count;
        }
      } catch (err) {
        console.error('Erreur query livres:', err.message);
      }
    }

    if (modulesToQuery.includes('films')) {
      try {
        // Build films where clause (with novelty filter if needed)
        let filmsWhere = { ...baseWhere };
        if (filterNouveautes) {
          const nouveauteWhereFilms = buildNouveauteWhereClause('filmotheque', parametres);
          if (nouveauteWhereFilms) {
            filmsWhere = { ...filmsWhere, ...nouveauteWhereFilms };
          }
        }

        const { count, rows } = await Film.findAndCountAll({
          where: filmsWhere,
          attributes: ['id', 'code_barre', 'titre', 'titre_original', 'annee_sortie',
                       'duree', 'classification', 'statut', 'image_url', 'prix_indicatif', 'date_acquisition', 'statut_nouveaute'],
          include: FILM_INCLUDES,
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'films' ? parseInt(limit) : undefined,
          offset: type === 'films' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(f => transformRefs(f, 'film', nouveauteParamsFilms)));

        if (type === 'films') {
          results.total = count;
        }
      } catch (err) {
        console.error('Erreur query films:', err.message);
      }
    }

    if (modulesToQuery.includes('disques')) {
      try {
        // Build disques where clause (with novelty filter if needed)
        let disquesWhere = { ...baseWhere };
        if (filterNouveautes) {
          const nouveauteWhereDisques = buildNouveauteWhereClause('discotheque', parametres);
          if (nouveauteWhereDisques) {
            disquesWhere = { ...disquesWhere, ...nouveauteWhereDisques };
          }
        }

        const { count, rows } = await Disque.findAndCountAll({
          where: disquesWhere,
          attributes: ['id', 'code_barre', 'titre', 'titre_original', 'annee_sortie',
                       'nb_pistes', 'duree_totale', 'statut', 'image_url', 'prix_indicatif', 'date_acquisition', 'statut_nouveaute'],
          include: DISQUE_INCLUDES,
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'disques' ? parseInt(limit) : undefined,
          offset: type === 'disques' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(d => transformRefs(d, 'disque', nouveauteParamsDisques)));

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
        const nouveauteParams = getParamsNouveaute(parametres, 'ludotheque');
        item = transformRefs(result, 'jeu', nouveauteParams);
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
        const nouveauteParams = getParamsNouveaute(parametres, 'bibliotheque');
        item = transformRefs(result, 'livre', nouveauteParams);
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
        const nouveauteParams = getParamsNouveaute(parametres, 'filmotheque');
        item = transformRefs(result, 'film', nouveauteParams);
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
        const nouveauteParams = getParamsNouveaute(parametres, 'discotheque');
        item = transformRefs(result, 'disque', nouveauteParams);
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

// ============================================
// Routes pour les themes publics
// ============================================

/**
 * @route   GET /api/public/theme
 * @desc    Get current active theme CSS
 * @access  Public
 */
router.get('/theme', themesSiteController.getPublicTheme);

/**
 * @route   GET /api/public/themes
 * @desc    List available themes for public selection (if enabled)
 * @access  Public
 */
router.get('/themes', themesSiteController.getPublicThemes);

/**
 * @route   GET /api/public/themes/:code/css
 * @desc    Get CSS for a specific theme
 * @access  Public
 */
router.get('/themes/:code/css', themesSiteController.getPublicThemeCSS);

/**
 * @route   GET /api/public/random-items
 * @desc    Get random items from active modules (for mini-game)
 * @access  Public
 * @query   count=20 (number of items to return)
 */
router.get('/random-items', async (req, res) => {
  try {
    const parametres = await ParametresFront.getParametres();
    const count = Math.min(parseInt(req.query.count) || 20, 100);

    const items = [];
    const baseWhere = {
      statut: { [Op.notIn]: ['archive', 'perdu'] }
    };

    // Collecter les articles de chaque module actif
    const promises = [];

    if (parametres.module_ludotheque) {
      promises.push(
        Jeu.findAll({
          where: { ...baseWhere, prive: { [Op.ne]: true } },
          attributes: ['id', 'titre', 'image_url'],
          order: Jeu.sequelize.random(),
          limit: Math.ceil(count / 4)
        }).then(rows => rows.map(r => ({ id: r.id, titre: r.titre, image: r.image_url, type: 'jeu', icon: 'bi-dice-6', color: '#ff6b9d' })))
      );
    }

    if (parametres.module_bibliotheque) {
      promises.push(
        Livre.findAll({
          where: baseWhere,
          attributes: ['id', 'titre', 'image_url'],
          order: Livre.sequelize.random(),
          limit: Math.ceil(count / 4)
        }).then(rows => rows.map(r => ({ id: r.id, titre: r.titre, image: r.image_url, type: 'livre', icon: 'bi-book', color: '#6bcb77' })))
      );
    }

    if (parametres.module_filmotheque) {
      promises.push(
        Film.findAll({
          where: baseWhere,
          attributes: ['id', 'titre', 'image_url'],
          order: Film.sequelize.random(),
          limit: Math.ceil(count / 4)
        }).then(rows => rows.map(r => ({ id: r.id, titre: r.titre, image: r.image_url, type: 'film', icon: 'bi-film', color: '#00d4ff' })))
      );
    }

    if (parametres.module_discotheque) {
      promises.push(
        Disque.findAll({
          where: baseWhere,
          attributes: ['id', 'titre', 'image_url'],
          order: Disque.sequelize.random(),
          limit: Math.ceil(count / 4)
        }).then(rows => rows.map(r => ({ id: r.id, titre: r.titre, image: r.image_url, type: 'disque', icon: 'bi-vinyl', color: '#ffd93d' })))
      );
    }

    const results = await Promise.all(promises);
    results.forEach(arr => items.push(...arr));

    // Melanger et limiter
    const shuffled = items.sort(() => Math.random() - 0.5).slice(0, count);

    res.json({
      success: true,
      items: shuffled,
      modules: {
        jeux: parametres.module_ludotheque,
        livres: parametres.module_bibliotheque,
        films: parametres.module_filmotheque,
        disques: parametres.module_discotheque
      }
    });
  } catch (error) {
    console.error('Erreur random-items:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

// ============================================
// Routes Multi-Structures (V0.9)
// ============================================

/**
 * @route   GET /api/public/groupe
 * @desc    Get current frontend group info (resolved by domain or default)
 * @access  Public
 */
router.get('/groupe', groupeFrontendContext, async (req, res) => {
  try {
    if (!req.groupeFrontend) {
      // Pas de groupe configure, retourner toutes les structures
      const structures = await Structure.findAll({
        where: { actif: true },
        attributes: ['id', 'code', 'nom', 'couleur', 'couleur_texte', 'icone', 'description'],
        order: [['nom', 'ASC']]
      });

      return res.json({
        groupe: null,
        structures: structures,
        multi_structures: structures.length > 1
      });
    }

    res.json({
      groupe: {
        id: req.groupeFrontend.id,
        code: req.groupeFrontend.code,
        nom: req.groupeFrontend.nom,
        slug: req.groupeFrontend.slug,
        theme_code: req.groupeFrontend.theme_code,
        logo_url: req.groupeFrontend.logo_url
      },
      structures: req.structures.map(s => ({
        id: s.id,
        code: s.code,
        nom: s.nom,
        couleur: s.couleur,
        couleur_texte: s.couleur_texte,
        icone: s.icone,
        description: s.description
      })),
      multi_structures: req.structures.length > 1
    });
  } catch (error) {
    console.error('Erreur groupe frontend:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/public/structures
 * @desc    List all active structures (for public selection)
 * @access  Public
 */
router.get('/structures', async (req, res) => {
  try {
    const structures = await Structure.findAll({
      where: { actif: true },
      attributes: ['id', 'code', 'nom', 'description', 'couleur', 'couleur_texte', 'icone',
                   'adresse', 'telephone', 'email'],
      order: [['nom', 'ASC']]
    });

    res.json(structures);
  } catch (error) {
    console.error('Erreur liste structures:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/public/structures/:code
 * @desc    Get a specific structure by code
 * @access  Public
 */
router.get('/structures/:code', async (req, res) => {
  try {
    const structure = await Structure.findOne({
      where: {
        code: req.params.code,
        actif: true
      },
      attributes: ['id', 'code', 'nom', 'description', 'couleur', 'couleur_texte', 'icone',
                   'adresse', 'telephone', 'email', 'modules_actifs'],
      include: [{
        model: Site,
        as: 'sites',
        where: { actif: true },
        required: false,
        attributes: ['id', 'code', 'nom', 'type', 'adresse', 'code_postal', 'ville'],
        include: [{
          model: HoraireOuverture,
          as: 'horaires',
          where: { actif: true },
          required: false,
          attributes: ['jour_semaine', 'heure_debut', 'heure_fin', 'recurrence', 'periode']
        }]
      }]
    });

    if (!structure) {
      return res.status(404).json({ error: 'Structure non trouvee' });
    }

    res.json(structure);
  } catch (error) {
    console.error('Erreur detail structure:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/public/groupes-frontend
 * @desc    List all frontend groups (for portal selection)
 * @access  Public
 */
router.get('/groupes-frontend', async (req, res) => {
  try {
    const groupes = await GroupeFrontend.findAll({
      where: { actif: true },
      attributes: ['id', 'code', 'nom', 'slug', 'logo_url', 'theme_code'],
      include: [{
        model: Structure,
        as: 'structures',
        where: { actif: true },
        required: false,
        attributes: ['id', 'code', 'nom', 'couleur', 'icone'],
        through: { attributes: ['ordre_affichage'] }
      }],
      order: [['nom', 'ASC']]
    });

    res.json(groupes);
  } catch (error) {
    console.error('Erreur liste groupes frontend:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/public/g/:slug/config
 * @desc    Get config for a specific frontend group (by slug)
 * @access  Public
 */
router.get('/g/:slug/config', async (req, res) => {
  try {
    const groupe = await GroupeFrontend.findOne({
      where: {
        slug: req.params.slug,
        actif: true
      },
      include: [{
        model: Structure,
        as: 'structures',
        where: { actif: true },
        required: false,
        attributes: ['id', 'code', 'nom', 'couleur', 'couleur_texte', 'icone', 'modules_actifs'],
        through: { attributes: ['ordre_affichage'] }
      }]
    });

    if (!groupe) {
      return res.status(404).json({ error: 'Groupe non trouve' });
    }

    // Fusionner les modules actifs de toutes les structures
    const modulesActifs = new Set();
    groupe.structures.forEach(s => {
      if (s.modules_actifs && Array.isArray(s.modules_actifs)) {
        s.modules_actifs.forEach(m => modulesActifs.add(m));
      }
    });

    // Recuperer la config de base
    const baseConfig = await getPublicConfig();

    res.json({
      ...baseConfig,
      groupe: {
        id: groupe.id,
        code: groupe.code,
        nom: groupe.nom,
        slug: groupe.slug,
        logo_url: groupe.logo_url,
        theme_code: groupe.theme_code
      },
      structures: groupe.structures.map(s => ({
        id: s.id,
        code: s.code,
        nom: s.nom,
        couleur: s.couleur,
        couleur_texte: s.couleur_texte,
        icone: s.icone
      })),
      modules_groupe: Array.from(modulesActifs),
      multi_structures: groupe.structures.length > 1
    });
  } catch (error) {
    console.error('Erreur config groupe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/public/g/:slug/catalogue
 * @desc    Get catalog filtered by frontend group structures
 * @access  Public
 * @query   Same as /catalogue + structure_id to filter within group
 */
router.get('/g/:slug/catalogue', groupeFrontendContext, filterByGroupeStructures, async (req, res) => {
  try {
    // Utiliser les memes parametres que /catalogue
    const parametres = await ParametresFront.getParametres();
    const {
      type,
      search,
      page = 1,
      limit = 20,
      tri = 'titre',
      ordre = 'ASC',
      nouveautes,
      structure_id
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const results = {
      items: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit),
      modules_actifs: [],
      groupe: req.groupeFrontend ? {
        id: req.groupeFrontend.id,
        code: req.groupeFrontend.code,
        nom: req.groupeFrontend.nom
      } : null,
      structures: req.structures.map(s => ({
        id: s.id,
        code: s.code,
        nom: s.nom,
        couleur: s.couleur
      })),
      structure_filtre: structure_id ? parseInt(structure_id) : null
    };

    const filterNouveautes = nouveautes === 'true' || nouveautes === '1';

    // Build structure filter clause
    const structureFilter = buildStructureWhereClause(req.filterStructureIds);

    // Base where clause - exclude archived items + structure filter
    const baseWhere = {
      statut: { [Op.notIn]: ['archive', 'perdu'] },
      ...structureFilter
    };

    if (search) {
      baseWhere.titre = { [Op.like]: `%${search}%` };
    }

    const jeuWhere = { ...baseWhere, prive: { [Op.ne]: true } };

    // Determine which modules to query based on structures' active modules
    const activeModulesFromStructures = new Set();
    req.structures.forEach(s => {
      if (s.modules_actifs && Array.isArray(s.modules_actifs)) {
        s.modules_actifs.forEach(m => activeModulesFromStructures.add(m));
      }
    });

    // Si aucun module defini dans les structures, utiliser les parametres globaux
    const useGlobalModules = activeModulesFromStructures.size === 0;

    const modulesToQuery = [];
    if ((useGlobalModules ? parametres.module_ludotheque : activeModulesFromStructures.has('jeux')) && (!type || type === 'jeux')) {
      modulesToQuery.push('jeux');
      results.modules_actifs.push('jeux');
    }
    if ((useGlobalModules ? parametres.module_bibliotheque : activeModulesFromStructures.has('livres')) && (!type || type === 'livres')) {
      modulesToQuery.push('livres');
      results.modules_actifs.push('livres');
    }
    if ((useGlobalModules ? parametres.module_filmotheque : activeModulesFromStructures.has('films')) && (!type || type === 'films')) {
      modulesToQuery.push('films');
      results.modules_actifs.push('films');
    }
    if ((useGlobalModules ? parametres.module_discotheque : activeModulesFromStructures.has('disques')) && (!type || type === 'disques')) {
      modulesToQuery.push('disques');
      results.modules_actifs.push('disques');
    }

    // Get novelty params
    const nouveauteParamsJeux = getParamsNouveaute(parametres, 'ludotheque');
    const nouveauteParamsLivres = getParamsNouveaute(parametres, 'bibliotheque');
    const nouveauteParamsFilms = getParamsNouveaute(parametres, 'filmotheque');
    const nouveauteParamsDisques = getParamsNouveaute(parametres, 'discotheque');

    // Include structure info in results
    const includeStructure = [{ model: Structure, as: 'structure', attributes: ['id', 'code', 'nom', 'couleur'], required: false }];

    // Query each module
    if (modulesToQuery.includes('jeux')) {
      try {
        let jeuxWhere = { ...jeuWhere };
        if (filterNouveautes) {
          const nw = buildNouveauteWhereClause('ludotheque', parametres);
          if (nw) jeuxWhere = { ...jeuxWhere, ...nw };
        }

        const { count, rows } = await Jeu.findAndCountAll({
          where: jeuxWhere,
          attributes: ['id', 'code_barre', 'titre', 'sous_titre', 'annee_sortie',
                       'age_min', 'nb_joueurs_min', 'nb_joueurs_max', 'duree_partie',
                       'statut', 'image_url', 'prix_indicatif', 'date_acquisition', 'statut_nouveaute', 'structure_id'],
          include: [...JEU_INCLUDES, ...includeStructure],
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'jeux' ? parseInt(limit) : undefined,
          offset: type === 'jeux' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(j => transformRefs(j, 'jeu', nouveauteParamsJeux)));
        if (type === 'jeux') results.total = count;
      } catch (err) {
        console.error('Erreur query jeux:', err.message);
      }
    }

    if (modulesToQuery.includes('livres')) {
      try {
        let livresWhere = { ...baseWhere };
        if (filterNouveautes) {
          const nw = buildNouveauteWhereClause('bibliotheque', parametres);
          if (nw) livresWhere = { ...livresWhere, ...nw };
        }

        const { count, rows } = await Livre.findAndCountAll({
          where: livresWhere,
          attributes: ['id', 'code_barre', 'titre', 'sous_titre', 'annee_publication',
                       'nb_pages', 'statut', 'image_url', 'prix_indicatif', 'date_acquisition', 'statut_nouveaute', 'structure_id'],
          include: [...LIVRE_INCLUDES, ...includeStructure],
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'livres' ? parseInt(limit) : undefined,
          offset: type === 'livres' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(l => transformRefs(l, 'livre', nouveauteParamsLivres)));
        if (type === 'livres') results.total = count;
      } catch (err) {
        console.error('Erreur query livres:', err.message);
      }
    }

    if (modulesToQuery.includes('films')) {
      try {
        let filmsWhere = { ...baseWhere };
        if (filterNouveautes) {
          const nw = buildNouveauteWhereClause('filmotheque', parametres);
          if (nw) filmsWhere = { ...filmsWhere, ...nw };
        }

        const { count, rows } = await Film.findAndCountAll({
          where: filmsWhere,
          attributes: ['id', 'code_barre', 'titre', 'titre_original', 'annee_sortie',
                       'duree', 'classification', 'statut', 'image_url', 'prix_indicatif', 'date_acquisition', 'statut_nouveaute', 'structure_id'],
          include: [...FILM_INCLUDES, ...includeStructure],
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'films' ? parseInt(limit) : undefined,
          offset: type === 'films' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(f => transformRefs(f, 'film', nouveauteParamsFilms)));
        if (type === 'films') results.total = count;
      } catch (err) {
        console.error('Erreur query films:', err.message);
      }
    }

    if (modulesToQuery.includes('disques')) {
      try {
        let disquesWhere = { ...baseWhere };
        if (filterNouveautes) {
          const nw = buildNouveauteWhereClause('discotheque', parametres);
          if (nw) disquesWhere = { ...disquesWhere, ...nw };
        }

        const { count, rows } = await Disque.findAndCountAll({
          where: disquesWhere,
          attributes: ['id', 'code_barre', 'titre', 'titre_original', 'annee_sortie',
                       'nb_pistes', 'duree_totale', 'statut', 'image_url', 'prix_indicatif', 'date_acquisition', 'statut_nouveaute', 'structure_id'],
          include: [...DISQUE_INCLUDES, ...includeStructure],
          order: [[tri === 'titre' ? 'titre' : tri, ordre]],
          limit: type === 'disques' ? parseInt(limit) : undefined,
          offset: type === 'disques' ? offset : undefined,
          distinct: true
        });

        results.items.push(...rows.map(d => transformRefs(d, 'disque', nouveauteParamsDisques)));
        if (type === 'disques') results.total = count;
      } catch (err) {
        console.error('Erreur query disques:', err.message);
      }
    }

    // If no specific type, paginate combined results
    if (!type) {
      results.total = results.items.length;
      results.items.sort((a, b) => {
        const aVal = a[tri] || '';
        const bVal = b[tri] || '';
        return ordre === 'ASC'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
      results.items = results.items.slice(offset, offset + parseInt(limit));
    }

    results.pages = Math.ceil(results.total / parseInt(limit));

    res.json(results);
  } catch (error) {
    console.error('Erreur catalogue groupe:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

/**
 * @route   GET /api/public/g/:slug/stats
 * @desc    Get stats for a specific frontend group
 * @access  Public
 */
router.get('/g/:slug/stats', groupeFrontendContext, async (req, res) => {
  try {
    const structureFilter = buildStructureWhereClause(req.structureIds);
    const stats = {};

    const baseCountWhere = {
      statut: { [Op.notIn]: ['archive', 'perdu'] },
      ...structureFilter
    };

    const jeuCountWhere = {
      ...baseCountWhere,
      prive: { [Op.ne]: true }
    };

    // Compter par module
    stats.jeux = await Jeu.count({ where: jeuCountWhere });
    stats.livres = await Livre.count({ where: baseCountWhere });
    stats.films = await Film.count({ where: baseCountWhere });
    stats.disques = await Disque.count({ where: baseCountWhere });
    stats.total = stats.jeux + stats.livres + stats.films + stats.disques;

    // Stats par structure
    if (req.structures.length > 1) {
      stats.par_structure = {};
      for (const s of req.structures) {
        const sWhere = { structure_id: s.id, statut: { [Op.notIn]: ['archive', 'perdu'] } };
        const sJeuWhere = { ...sWhere, prive: { [Op.ne]: true } };

        stats.par_structure[s.code] = {
          nom: s.nom,
          couleur: s.couleur,
          jeux: await Jeu.count({ where: sJeuWhere }),
          livres: await Livre.count({ where: sWhere }),
          films: await Film.count({ where: sWhere }),
          disques: await Disque.count({ where: sWhere })
        };
        stats.par_structure[s.code].total =
          stats.par_structure[s.code].jeux +
          stats.par_structure[s.code].livres +
          stats.par_structure[s.code].films +
          stats.par_structure[s.code].disques;
      }
    }

    res.json({
      groupe: req.groupeFrontend ? {
        id: req.groupeFrontend.id,
        code: req.groupeFrontend.code,
        nom: req.groupeFrontend.nom
      } : null,
      stats
    });
  } catch (error) {
    console.error('Erreur stats groupe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
