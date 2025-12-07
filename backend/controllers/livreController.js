const {
  Livre, Emprunt, Utilisateur,
  GenreLitteraire, FormatLivre, CollectionLivre, EmplacementLivre,
  Auteur, Editeur, Theme, Langue,
  LivreAuteur, LivreEditeur, LivreGenre, LivreTheme, LivreLangue
} = require('../models');
const { Op } = require('sequelize');

// Configuration des includes pour les associations
const INCLUDE_REFS = [
  { model: GenreLitteraire, as: 'genresRef', through: { attributes: [] } },
  { model: Theme, as: 'themesRef', through: { attributes: [] } },
  { model: Langue, as: 'languesRef', through: { attributes: [] } },
  { model: Auteur, as: 'auteursRef', through: { attributes: [] } },
  { model: Editeur, as: 'editeursRef', through: { attributes: [] } },
  { model: FormatLivre, as: 'formatRef' },
  { model: CollectionLivre, as: 'collectionRef' },
  { model: EmplacementLivre, as: 'emplacementRef' }
];

/**
 * Get all livres with optional filters and search
 * GET /api/livres?statut=disponible&genre_id=1&search=asterix&include_refs=true
 */
const getAllLivres = async (req, res) => {
  try {
    const {
      statut, genre_id, theme_id, format_id, collection_id,
      search, page = 1, limit = 50,
      include_refs = 'false'
    } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (statut) {
      where.statut = statut;
    }

    if (format_id) {
      where.format_id = parseInt(format_id);
    }

    if (collection_id) {
      where.collection_id = parseInt(collection_id);
    }

    if (search) {
      where[Op.or] = [
        { titre: { [Op.like]: `%${search}%` } },
        { sous_titre: { [Op.like]: `%${search}%` } },
        { isbn: { [Op.like]: `%${search}%` } },
        { code_barre: { [Op.like]: `%${search}%` } }
      ];
    }

    // Configuration de la requête
    const queryOptions = {
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['titre', 'ASC']],
      distinct: true
    };

    // Inclure les références si demandé
    if (include_refs === 'true') {
      queryOptions.include = INCLUDE_REFS;
    }

    // Filtres par ID de référentiel (nécessite des sous-requêtes)
    if (genre_id) {
      const livreIds = await LivreGenre.findAll({
        attributes: ['livre_id'],
        where: { genre_id: parseInt(genre_id) }
      });
      where.id = { [Op.in]: livreIds.map(l => l.livre_id) };
    }

    if (theme_id) {
      const livreIds = await LivreTheme.findAll({
        attributes: ['livre_id'],
        where: { theme_id: parseInt(theme_id) }
      });
      if (where.id) {
        where.id[Op.in] = where.id[Op.in].filter(id =>
          livreIds.map(l => l.livre_id).includes(id)
        );
      } else {
        where.id = { [Op.in]: livreIds.map(l => l.livre_id) };
      }
    }

    const { count, rows } = await Livre.findAndCountAll(queryOptions);

    res.json({
      livres: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get livres error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get livre by ID with all references
 * GET /api/livres/:id
 */
const getLivreById = async (req, res) => {
  try {
    const { id } = req.params;

    const livre = await Livre.findByPk(id, {
      include: INCLUDE_REFS
    });

    if (!livre) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Livre not found'
      });
    }

    res.json({ livre });
  } catch (error) {
    console.error('Get livre error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Synchronise les relations many-to-many pour un livre
 */
async function syncLivreRelations(livre, data) {
  // Genres littéraires
  if (data.genre_ids !== undefined) {
    await LivreGenre.destroy({ where: { livre_id: livre.id } });
    if (data.genre_ids && data.genre_ids.length > 0) {
      await LivreGenre.bulkCreate(
        data.genre_ids.map(id => ({ livre_id: livre.id, genre_id: id }))
      );
    }
  }

  // Thèmes
  if (data.theme_ids !== undefined) {
    await LivreTheme.destroy({ where: { livre_id: livre.id } });
    if (data.theme_ids && data.theme_ids.length > 0) {
      await LivreTheme.bulkCreate(
        data.theme_ids.map(id => ({ livre_id: livre.id, theme_id: id }))
      );
    }
  }

  // Langues
  if (data.langue_ids !== undefined) {
    await LivreLangue.destroy({ where: { livre_id: livre.id } });
    if (data.langue_ids && data.langue_ids.length > 0) {
      await LivreLangue.bulkCreate(
        data.langue_ids.map(id => ({ livre_id: livre.id, langue_id: id }))
      );
    }
  }

  // Auteurs
  if (data.auteur_ids !== undefined) {
    await LivreAuteur.destroy({ where: { livre_id: livre.id } });
    if (data.auteur_ids && data.auteur_ids.length > 0) {
      await LivreAuteur.bulkCreate(
        data.auteur_ids.map(id => ({ livre_id: livre.id, auteur_id: id }))
      );
    }
  }

  // Éditeurs
  if (data.editeur_ids !== undefined) {
    await LivreEditeur.destroy({ where: { livre_id: livre.id } });
    if (data.editeur_ids && data.editeur_ids.length > 0) {
      await LivreEditeur.bulkCreate(
        data.editeur_ids.map(id => ({ livre_id: livre.id, editeur_id: id }))
      );
    }
  }
}

/**
 * Create new livre
 * POST /api/livres
 */
const createLivre = async (req, res) => {
  try {
    const {
      titre, sous_titre, isbn, tome,
      annee_publication, nb_pages, resume, notes,
      format_id, collection_id, emplacement_id,
      prix_indicatif, prix_achat, date_acquisition,
      etat, image_url,
      // Relations normalisées (tableaux d'IDs)
      genre_ids, theme_ids, langue_ids, auteur_ids, editeur_ids
    } = req.body;

    // Validate required fields
    if (!titre) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Titre is required'
      });
    }

    const livre = await Livre.create({
      titre,
      sous_titre,
      isbn,
      tome,
      annee_publication,
      nb_pages,
      resume,
      notes,
      format_id,
      collection_id,
      emplacement_id,
      prix_indicatif,
      prix_achat,
      date_acquisition,
      etat,
      statut: 'disponible',
      image_url
    });

    // Synchroniser les relations many-to-many
    await syncLivreRelations(livre, {
      genre_ids, theme_ids, langue_ids, auteur_ids, editeur_ids
    });

    // Recharger avec les associations
    const livreComplet = await Livre.findByPk(livre.id, { include: INCLUDE_REFS });

    res.status(201).json({
      message: 'Livre created successfully',
      livre: livreComplet
    });
  } catch (error) {
    console.error('Create livre error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Duplicate error',
        message: 'Un livre avec cet ISBN existe déjà'
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Update livre
 * PUT /api/livres/:id
 */
const updateLivre = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titre, sous_titre, isbn, tome,
      annee_publication, nb_pages, resume, notes,
      format_id, collection_id, emplacement_id,
      prix_indicatif, prix_achat, date_acquisition,
      etat, statut, image_url,
      // Relations normalisées
      genre_ids, theme_ids, langue_ids, auteur_ids, editeur_ids
    } = req.body;

    const livre = await Livre.findByPk(id);

    if (!livre) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Livre not found'
      });
    }

    // Update scalar fields
    if (titre) livre.titre = titre;
    if (sous_titre !== undefined) livre.sous_titre = sous_titre;
    if (isbn !== undefined) livre.isbn = isbn;
    if (tome !== undefined) livre.tome = tome;
    if (annee_publication !== undefined) livre.annee_publication = annee_publication;
    if (nb_pages !== undefined) livre.nb_pages = nb_pages;
    if (resume !== undefined) livre.resume = resume;
    if (notes !== undefined) livre.notes = notes;
    if (format_id !== undefined) livre.format_id = format_id;
    if (collection_id !== undefined) livre.collection_id = collection_id;
    if (emplacement_id !== undefined) livre.emplacement_id = emplacement_id;
    if (prix_indicatif !== undefined) livre.prix_indicatif = prix_indicatif;
    if (prix_achat !== undefined) livre.prix_achat = prix_achat;
    if (date_acquisition !== undefined) livre.date_acquisition = date_acquisition;
    if (etat !== undefined) livre.etat = etat;
    if (statut) livre.statut = statut;
    if (image_url !== undefined) livre.image_url = image_url;

    await livre.save();

    // Synchroniser les relations many-to-many
    await syncLivreRelations(livre, {
      genre_ids, theme_ids, langue_ids, auteur_ids, editeur_ids
    });

    // Recharger avec les associations
    const livreComplet = await Livre.findByPk(livre.id, { include: INCLUDE_REFS });

    res.json({
      message: 'Livre updated successfully',
      livre: livreComplet
    });
  } catch (error) {
    console.error('Update livre error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Duplicate error',
        message: 'Un livre avec cet ISBN existe déjà'
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Delete livre
 * DELETE /api/livres/:id
 */
const deleteLivre = async (req, res) => {
  try {
    const { id } = req.params;

    const livre = await Livre.findByPk(id);

    if (!livre) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Livre not found'
      });
    }

    // Check if livre has active emprunts
    const activeEmprunts = await Emprunt.count({
      where: {
        livre_id: id,
        statut: { [Op.in]: ['en_cours', 'en_retard'] }
      }
    });

    if (activeEmprunts > 0) {
      return res.status(400).json({
        error: 'Cannot delete',
        message: 'Ce livre est actuellement emprunté. Veuillez attendre le retour.'
      });
    }

    await livre.destroy();

    res.json({
      message: 'Livre deleted successfully'
    });
  } catch (error) {
    console.error('Delete livre error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get genres littéraires
 * GET /api/livres/genres
 */
const getGenres = async (req, res) => {
  try {
    const genres = await GenreLitteraire.findAll({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    res.json({ genres });
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get formats livres
 * GET /api/livres/formats
 */
const getFormats = async (req, res) => {
  try {
    const formats = await FormatLivre.findAll({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    res.json({ formats });
  } catch (error) {
    console.error('Get formats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get collections livres
 * GET /api/livres/collections
 */
const getCollections = async (req, res) => {
  try {
    const collections = await CollectionLivre.findAll({
      where: { actif: true },
      include: [{ model: Editeur, as: 'editeur' }],
      order: [['nom', 'ASC']]
    });

    res.json({ collections });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get emplacements livres
 * GET /api/livres/emplacements
 */
const getEmplacements = async (req, res) => {
  try {
    const emplacements = await EmplacementLivre.findAll({
      where: { actif: true },
      order: [['libelle', 'ASC']]
    });

    res.json({ emplacements });
  } catch (error) {
    console.error('Get emplacements error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get statistics for livres
 * GET /api/livres/stats
 */
const getStats = async (req, res) => {
  try {
    const total = await Livre.count();
    const disponibles = await Livre.count({ where: { statut: 'disponible' } });
    const empruntes = await Livre.count({ where: { statut: 'emprunte' } });

    res.json({
      stats: {
        total,
        disponibles,
        empruntes
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

module.exports = {
  getAllLivres,
  getLivreById,
  createLivre,
  updateLivre,
  deleteLivre,
  getGenres,
  getFormats,
  getCollections,
  getEmplacements,
  getStats
};
