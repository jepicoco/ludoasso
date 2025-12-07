const {
  Film,
  GenreFilm,
  Realisateur,
  Acteur,
  Studio,
  SupportVideo,
  EmplacementFilm,
  Theme,
  Langue,
  FilmRealisateur,
  FilmActeur,
  FilmGenre,
  FilmTheme,
  FilmLangue,
  FilmSousTitre,
  FilmStudio,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

// Include configurations for queries
const INCLUDE_REFS = [
  { model: GenreFilm, as: 'genresRef', through: { attributes: [] } },
  { model: Theme, as: 'themesRef', through: { attributes: [] } },
  { model: Langue, as: 'languesRef', through: { attributes: [] } },
  { model: Langue, as: 'sousTitresRef', through: { attributes: [] } },
  { model: Realisateur, as: 'realisateursRef', through: { attributes: [] } },
  { model: Acteur, as: 'acteursRef', through: { attributes: ['role'] } },
  { model: Studio, as: 'studiosRef', through: { attributes: [] } },
  { model: SupportVideo, as: 'supportRef' },
  { model: EmplacementFilm, as: 'emplacementRef' }
];

// ============================================
// CRUD Principal - Films
// ============================================

// GET /api/films - Liste tous les films
exports.getAll = async (req, res) => {
  try {
    const {
      search,
      genre_id,
      support_id,
      emplacement_id,
      statut,
      classification,
      annee_min,
      annee_max,
      realisateur_id,
      acteur_id,
      studio_id,
      page = 1,
      limit = 50,
      sort = 'titre',
      order = 'ASC'
    } = req.query;

    // Build where clause
    const where = {};

    if (search) {
      where[Op.or] = [
        { titre: { [Op.like]: `%${search}%` } },
        { titre_original: { [Op.like]: `%${search}%` } },
        { code_barre: { [Op.like]: `%${search}%` } },
        { ean: { [Op.like]: `%${search}%` } }
      ];
    }

    if (support_id) where.support_id = support_id;
    if (emplacement_id) where.emplacement_id = emplacement_id;
    if (statut) where.statut = statut;
    if (classification) where.classification = classification;
    if (annee_min) where.annee_sortie = { ...where.annee_sortie, [Op.gte]: annee_min };
    if (annee_max) where.annee_sortie = { ...where.annee_sortie, [Op.lte]: annee_max };

    // Build include with optional filters
    const include = [...INCLUDE_REFS];

    // Handle genre filter
    if (genre_id) {
      const genreIncludeIndex = include.findIndex(i => i.as === 'genresRef');
      if (genreIncludeIndex !== -1) {
        include[genreIncludeIndex] = {
          ...include[genreIncludeIndex],
          where: { id: genre_id }
        };
      }
    }

    // Handle realisateur filter
    if (realisateur_id) {
      const realIncludeIndex = include.findIndex(i => i.as === 'realisateursRef');
      if (realIncludeIndex !== -1) {
        include[realIncludeIndex] = {
          ...include[realIncludeIndex],
          where: { id: realisateur_id }
        };
      }
    }

    // Handle acteur filter
    if (acteur_id) {
      const acteurIncludeIndex = include.findIndex(i => i.as === 'acteursRef');
      if (acteurIncludeIndex !== -1) {
        include[acteurIncludeIndex] = {
          ...include[acteurIncludeIndex],
          where: { id: acteur_id }
        };
      }
    }

    // Handle studio filter
    if (studio_id) {
      const studioIncludeIndex = include.findIndex(i => i.as === 'studiosRef');
      if (studioIncludeIndex !== -1) {
        include[studioIncludeIndex] = {
          ...include[studioIncludeIndex],
          where: { id: studio_id }
        };
      }
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const { count, rows: films } = await Film.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order: [[sort, order.toUpperCase()]],
      distinct: true
    });

    res.json({
      films,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching films:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des films' });
  }
};

// GET /api/films/:id - Récupère un film par ID
exports.getById = async (req, res) => {
  try {
    const film = await Film.findByPk(req.params.id, {
      include: INCLUDE_REFS
    });

    if (!film) {
      return res.status(404).json({ error: 'Film non trouvé' });
    }

    res.json(film);
  } catch (error) {
    console.error('Error fetching film:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du film' });
  }
};

// POST /api/films - Crée un nouveau film
exports.create = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      genres,
      themes,
      langues,
      sous_titres,
      realisateurs,
      acteurs,
      studios,
      ...filmData
    } = req.body;

    // Create the film
    const film = await Film.create(filmData, { transaction: t });

    // Add associations
    if (genres?.length) {
      await film.setGenresRef(genres, { transaction: t });
    }

    if (themes?.length) {
      await film.setThemesRef(themes, { transaction: t });
    }

    if (langues?.length) {
      await film.setLanguesRef(langues, { transaction: t });
    }

    if (sous_titres?.length) {
      await film.setSousTitresRef(sous_titres, { transaction: t });
    }

    if (realisateurs?.length) {
      await film.setRealisateursRef(realisateurs, { transaction: t });
    }

    if (acteurs?.length) {
      // Handle acteurs with roles
      for (const acteurData of acteurs) {
        const acteurId = typeof acteurData === 'object' ? acteurData.id : acteurData;
        const role = typeof acteurData === 'object' ? acteurData.role : null;

        await FilmActeur.create({
          film_id: film.id,
          acteur_id: acteurId,
          role: role
        }, { transaction: t });
      }
    }

    if (studios?.length) {
      await film.setStudiosRef(studios, { transaction: t });
    }

    await t.commit();

    // Reload with associations
    const createdFilm = await Film.findByPk(film.id, {
      include: INCLUDE_REFS
    });

    res.status(201).json(createdFilm);
  } catch (error) {
    await t.rollback();
    console.error('Error creating film:', error);
    res.status(500).json({ error: 'Erreur lors de la création du film' });
  }
};

// PUT /api/films/:id - Met à jour un film
exports.update = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const film = await Film.findByPk(req.params.id);

    if (!film) {
      await t.rollback();
      return res.status(404).json({ error: 'Film non trouvé' });
    }

    const {
      genres,
      themes,
      langues,
      sous_titres,
      realisateurs,
      acteurs,
      studios,
      ...filmData
    } = req.body;

    // Update film data
    await film.update(filmData, { transaction: t });

    // Update associations
    if (genres !== undefined) {
      await film.setGenresRef(genres || [], { transaction: t });
    }

    if (themes !== undefined) {
      await film.setThemesRef(themes || [], { transaction: t });
    }

    if (langues !== undefined) {
      await film.setLanguesRef(langues || [], { transaction: t });
    }

    if (sous_titres !== undefined) {
      await film.setSousTitresRef(sous_titres || [], { transaction: t });
    }

    if (realisateurs !== undefined) {
      await film.setRealisateursRef(realisateurs || [], { transaction: t });
    }

    if (acteurs !== undefined) {
      // Remove existing acteurs
      await FilmActeur.destroy({
        where: { film_id: film.id },
        transaction: t
      });

      // Add new acteurs with roles
      if (acteurs?.length) {
        for (const acteurData of acteurs) {
          const acteurId = typeof acteurData === 'object' ? acteurData.id : acteurData;
          const role = typeof acteurData === 'object' ? acteurData.role : null;

          await FilmActeur.create({
            film_id: film.id,
            acteur_id: acteurId,
            role: role
          }, { transaction: t });
        }
      }
    }

    if (studios !== undefined) {
      await film.setStudiosRef(studios || [], { transaction: t });
    }

    await t.commit();

    // Reload with associations
    const updatedFilm = await Film.findByPk(film.id, {
      include: INCLUDE_REFS
    });

    res.json(updatedFilm);
  } catch (error) {
    await t.rollback();
    console.error('Error updating film:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du film' });
  }
};

// DELETE /api/films/:id - Supprime un film
exports.delete = async (req, res) => {
  try {
    const film = await Film.findByPk(req.params.id);

    if (!film) {
      return res.status(404).json({ error: 'Film non trouvé' });
    }

    await film.destroy();

    res.json({ message: 'Film supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting film:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du film' });
  }
};

// ============================================
// Référentiels - Genres Films
// ============================================

exports.getGenres = async (req, res) => {
  try {
    const genres = await GenreFilm.findAll({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });
    res.json(genres);
  } catch (error) {
    console.error('Error fetching genres films:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des genres' });
  }
};

exports.createGenre = async (req, res) => {
  try {
    const genre = await GenreFilm.create(req.body);
    res.status(201).json(genre);
  } catch (error) {
    console.error('Error creating genre film:', error);
    res.status(500).json({ error: 'Erreur lors de la création du genre' });
  }
};

exports.updateGenre = async (req, res) => {
  try {
    const genre = await GenreFilm.findByPk(req.params.id);
    if (!genre) {
      return res.status(404).json({ error: 'Genre non trouvé' });
    }
    await genre.update(req.body);
    res.json(genre);
  } catch (error) {
    console.error('Error updating genre film:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du genre' });
  }
};

exports.deleteGenre = async (req, res) => {
  try {
    const genre = await GenreFilm.findByPk(req.params.id);
    if (!genre) {
      return res.status(404).json({ error: 'Genre non trouvé' });
    }
    await genre.destroy();
    res.json({ message: 'Genre supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting genre film:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du genre' });
  }
};

// ============================================
// Référentiels - Réalisateurs
// ============================================

exports.getRealisateurs = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { actif: true };

    if (search) {
      where[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { prenom: { [Op.like]: `%${search}%` } }
      ];
    }

    const realisateurs = await Realisateur.findAll({
      where,
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });
    res.json(realisateurs);
  } catch (error) {
    console.error('Error fetching realisateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des réalisateurs' });
  }
};

exports.createRealisateur = async (req, res) => {
  try {
    const realisateur = await Realisateur.create(req.body);
    res.status(201).json(realisateur);
  } catch (error) {
    console.error('Error creating realisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la création du réalisateur' });
  }
};

exports.updateRealisateur = async (req, res) => {
  try {
    const realisateur = await Realisateur.findByPk(req.params.id);
    if (!realisateur) {
      return res.status(404).json({ error: 'Réalisateur non trouvé' });
    }
    await realisateur.update(req.body);
    res.json(realisateur);
  } catch (error) {
    console.error('Error updating realisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du réalisateur' });
  }
};

exports.deleteRealisateur = async (req, res) => {
  try {
    const realisateur = await Realisateur.findByPk(req.params.id);
    if (!realisateur) {
      return res.status(404).json({ error: 'Réalisateur non trouvé' });
    }
    await realisateur.destroy();
    res.json({ message: 'Réalisateur supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting realisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du réalisateur' });
  }
};

// ============================================
// Référentiels - Acteurs
// ============================================

exports.getActeurs = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { actif: true };

    if (search) {
      where[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { prenom: { [Op.like]: `%${search}%` } }
      ];
    }

    const acteurs = await Acteur.findAll({
      where,
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });
    res.json(acteurs);
  } catch (error) {
    console.error('Error fetching acteurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des acteurs' });
  }
};

exports.createActeur = async (req, res) => {
  try {
    const acteur = await Acteur.create(req.body);
    res.status(201).json(acteur);
  } catch (error) {
    console.error('Error creating acteur:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'acteur' });
  }
};

exports.updateActeur = async (req, res) => {
  try {
    const acteur = await Acteur.findByPk(req.params.id);
    if (!acteur) {
      return res.status(404).json({ error: 'Acteur non trouvé' });
    }
    await acteur.update(req.body);
    res.json(acteur);
  } catch (error) {
    console.error('Error updating acteur:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'acteur' });
  }
};

exports.deleteActeur = async (req, res) => {
  try {
    const acteur = await Acteur.findByPk(req.params.id);
    if (!acteur) {
      return res.status(404).json({ error: 'Acteur non trouvé' });
    }
    await acteur.destroy();
    res.json({ message: 'Acteur supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting acteur:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'acteur' });
  }
};

// ============================================
// Référentiels - Studios
// ============================================

exports.getStudios = async (req, res) => {
  try {
    const studios = await Studio.findAll({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });
    res.json(studios);
  } catch (error) {
    console.error('Error fetching studios:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des studios' });
  }
};

exports.createStudio = async (req, res) => {
  try {
    const studio = await Studio.create(req.body);
    res.status(201).json(studio);
  } catch (error) {
    console.error('Error creating studio:', error);
    res.status(500).json({ error: 'Erreur lors de la création du studio' });
  }
};

exports.updateStudio = async (req, res) => {
  try {
    const studio = await Studio.findByPk(req.params.id);
    if (!studio) {
      return res.status(404).json({ error: 'Studio non trouvé' });
    }
    await studio.update(req.body);
    res.json(studio);
  } catch (error) {
    console.error('Error updating studio:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du studio' });
  }
};

exports.deleteStudio = async (req, res) => {
  try {
    const studio = await Studio.findByPk(req.params.id);
    if (!studio) {
      return res.status(404).json({ error: 'Studio non trouvé' });
    }
    await studio.destroy();
    res.json({ message: 'Studio supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting studio:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du studio' });
  }
};

// ============================================
// Référentiels - Supports Vidéo
// ============================================

exports.getSupports = async (req, res) => {
  try {
    const supports = await SupportVideo.findAll({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });
    res.json(supports);
  } catch (error) {
    console.error('Error fetching supports video:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des supports' });
  }
};

exports.createSupport = async (req, res) => {
  try {
    const support = await SupportVideo.create(req.body);
    res.status(201).json(support);
  } catch (error) {
    console.error('Error creating support video:', error);
    res.status(500).json({ error: 'Erreur lors de la création du support' });
  }
};

exports.updateSupport = async (req, res) => {
  try {
    const support = await SupportVideo.findByPk(req.params.id);
    if (!support) {
      return res.status(404).json({ error: 'Support non trouvé' });
    }
    await support.update(req.body);
    res.json(support);
  } catch (error) {
    console.error('Error updating support video:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du support' });
  }
};

exports.deleteSupport = async (req, res) => {
  try {
    const support = await SupportVideo.findByPk(req.params.id);
    if (!support) {
      return res.status(404).json({ error: 'Support non trouvé' });
    }
    await support.destroy();
    res.json({ message: 'Support supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting support video:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du support' });
  }
};

// ============================================
// Référentiels - Emplacements Films
// ============================================

exports.getEmplacements = async (req, res) => {
  try {
    const emplacements = await EmplacementFilm.findAll({
      where: { actif: true },
      order: [['libelle', 'ASC']]
    });
    res.json(emplacements);
  } catch (error) {
    console.error('Error fetching emplacements films:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des emplacements' });
  }
};

exports.createEmplacement = async (req, res) => {
  try {
    const emplacement = await EmplacementFilm.create(req.body);
    res.status(201).json(emplacement);
  } catch (error) {
    console.error('Error creating emplacement film:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'emplacement' });
  }
};

exports.updateEmplacement = async (req, res) => {
  try {
    const emplacement = await EmplacementFilm.findByPk(req.params.id);
    if (!emplacement) {
      return res.status(404).json({ error: 'Emplacement non trouvé' });
    }
    await emplacement.update(req.body);
    res.json(emplacement);
  } catch (error) {
    console.error('Error updating emplacement film:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'emplacement' });
  }
};

exports.deleteEmplacement = async (req, res) => {
  try {
    const emplacement = await EmplacementFilm.findByPk(req.params.id);
    if (!emplacement) {
      return res.status(404).json({ error: 'Emplacement non trouvé' });
    }
    await emplacement.destroy();
    res.json({ message: 'Emplacement supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting emplacement film:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'emplacement' });
  }
};

// ============================================
// Statistiques Films
// ============================================

exports.getStats = async (req, res) => {
  try {
    const totalFilms = await Film.count();
    const filmsDisponibles = await Film.count({ where: { statut: 'disponible' } });
    const filmsEmpruntes = await Film.count({ where: { statut: 'emprunte' } });

    // Films par support
    const filmsParSupport = await Film.findAll({
      attributes: [
        'support_id',
        [sequelize.fn('COUNT', sequelize.col('Film.id')), 'count']
      ],
      include: [{
        model: SupportVideo,
        as: 'supportRef',
        attributes: ['nom']
      }],
      group: ['support_id', 'supportRef.id'],
      raw: false
    });

    // Films par genre
    const filmsParGenre = await sequelize.query(`
      SELECT g.nom, COUNT(fg.film_id) as count
      FROM genres_films g
      LEFT JOIN film_genres fg ON g.id = fg.genre_id
      GROUP BY g.id, g.nom
      ORDER BY count DESC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT,
      raw: true
    });

    // Films par classification
    const filmsParClassification = await Film.findAll({
      attributes: [
        'classification',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['classification'],
      raw: true
    });

    // Top réalisateurs
    const topRealisateurs = await sequelize.query(`
      SELECT r.nom, r.prenom, COUNT(fr.film_id) as count
      FROM realisateurs r
      LEFT JOIN film_realisateurs fr ON r.id = fr.realisateur_id
      GROUP BY r.id, r.nom, r.prenom
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT,
      raw: true
    });

    // Top acteurs
    const topActeurs = await sequelize.query(`
      SELECT a.nom, a.prenom, COUNT(fa.film_id) as count
      FROM acteurs a
      LEFT JOIN film_acteurs fa ON a.id = fa.acteur_id
      GROUP BY a.id, a.nom, a.prenom
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT,
      raw: true
    });

    res.json({
      totalFilms,
      filmsDisponibles,
      filmsEmpruntes,
      filmsParSupport,
      filmsParGenre,
      filmsParClassification,
      topRealisateurs,
      topActeurs
    });
  } catch (error) {
    console.error('Error fetching film stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};
