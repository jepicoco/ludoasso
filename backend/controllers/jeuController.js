const { Jeu, Emprunt, Adherent } = require('../models');
const { Op } = require('sequelize');
const eanLookupService = require('../services/eanLookupService');

/**
 * Get all jeux with optional filters and search
 * GET /api/jeux?statut=disponible&categorie=Stratégie&search=monopoly
 */
const getAllJeux = async (req, res) => {
  try {
    const { statut, categorie, search, age_min, nb_joueurs, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (statut) {
      where.statut = statut;
    }

    if (categorie) {
      where.categorie = categorie;
    }

    if (age_min) {
      where.age_min = { [Op.lte]: parseInt(age_min) };
    }

    if (nb_joueurs) {
      const nbJoueurs = parseInt(nb_joueurs);
      where.nb_joueurs_min = { [Op.lte]: nbJoueurs };
      where.nb_joueurs_max = { [Op.gte]: nbJoueurs };
    }

    if (search) {
      where[Op.or] = [
        { titre: { [Op.like]: `%${search}%` } },
        { editeur: { [Op.like]: `%${search}%` } },
        { auteur: { [Op.like]: `%${search}%` } },
        { code_barre: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Jeu.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['titre', 'ASC']]
    });

    res.json({
      jeux: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get jeux error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get jeu by ID with emprunts history
 * GET /api/jeux/:id
 */
const getJeuById = async (req, res) => {
  try {
    const { id } = req.params;

    const jeu = await Jeu.findByPk(id, {
      include: [{
        model: Emprunt,
        as: 'emprunts',
        include: [{
          model: Adherent,
          as: 'adherent'
        }],
        order: [['date_emprunt', 'DESC']],
        limit: 10
      }]
    });

    if (!jeu) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Jeu not found'
      });
    }

    res.json({ jeu });
  } catch (error) {
    console.error('Get jeu error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Create new jeu
 * POST /api/jeux
 */
const createJeu = async (req, res) => {
  try {
    const {
      titre, editeur, auteur, annee_sortie, age_min,
      nb_joueurs_min, nb_joueurs_max, duree_partie,
      categorie, description, regles_url, image_url,
      emplacement, date_acquisition, prix_achat, notes
    } = req.body;

    // Validate required fields
    if (!titre) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Titre is required'
      });
    }

    const jeu = await Jeu.create({
      titre,
      editeur,
      auteur,
      annee_sortie,
      age_min,
      nb_joueurs_min,
      nb_joueurs_max,
      duree_partie,
      categorie,
      description,
      regles_url,
      image_url,
      statut: 'disponible',
      emplacement,
      date_acquisition,
      prix_achat,
      notes
    });

    res.status(201).json({
      message: 'Jeu created successfully',
      jeu
    });
  } catch (error) {
    console.error('Create jeu error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Update jeu
 * PUT /api/jeux/:id
 */
const updateJeu = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titre, editeur, auteur, annee_sortie, age_min,
      nb_joueurs_min, nb_joueurs_max, duree_partie,
      categorie, description, regles_url, image_url,
      statut, emplacement, date_acquisition, prix_achat, notes
    } = req.body;

    const jeu = await Jeu.findByPk(id);

    if (!jeu) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Jeu not found'
      });
    }

    // Update fields
    if (titre) jeu.titre = titre;
    if (editeur !== undefined) jeu.editeur = editeur;
    if (auteur !== undefined) jeu.auteur = auteur;
    if (annee_sortie !== undefined) jeu.annee_sortie = annee_sortie;
    if (age_min !== undefined) jeu.age_min = age_min;
    if (nb_joueurs_min !== undefined) jeu.nb_joueurs_min = nb_joueurs_min;
    if (nb_joueurs_max !== undefined) jeu.nb_joueurs_max = nb_joueurs_max;
    if (duree_partie !== undefined) jeu.duree_partie = duree_partie;
    if (categorie !== undefined) jeu.categorie = categorie;
    if (description !== undefined) jeu.description = description;
    if (regles_url !== undefined) jeu.regles_url = regles_url;
    if (image_url !== undefined) jeu.image_url = image_url;
    if (statut) jeu.statut = statut;
    if (emplacement !== undefined) jeu.emplacement = emplacement;
    if (date_acquisition !== undefined) jeu.date_acquisition = date_acquisition;
    if (prix_achat !== undefined) jeu.prix_achat = prix_achat;
    if (notes !== undefined) jeu.notes = notes;

    await jeu.save();

    res.json({
      message: 'Jeu updated successfully',
      jeu
    });
  } catch (error) {
    console.error('Update jeu error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Delete jeu
 * DELETE /api/jeux/:id
 */
const deleteJeu = async (req, res) => {
  try {
    const { id } = req.params;

    const jeu = await Jeu.findByPk(id);

    if (!jeu) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Jeu not found'
      });
    }

    // Check if jeu has active emprunts
    const activeEmprunts = await Emprunt.count({
      where: {
        jeu_id: id,
        statut: { [Op.in]: ['en_cours', 'en_retard'] }
      }
    });

    if (activeEmprunts > 0) {
      return res.status(400).json({
        error: 'Cannot delete',
        message: 'Jeu is currently borrowed. Please wait for return.'
      });
    }

    await jeu.destroy();

    res.json({
      message: 'Jeu deleted successfully'
    });
  } catch (error) {
    console.error('Delete jeu error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get available categories
 * GET /api/jeux/categories
 */
const getCategories = async (req, res) => {
  try {
    const categories = await Jeu.findAll({
      attributes: [
        [Jeu.sequelize.fn('DISTINCT', Jeu.sequelize.col('categorie')), 'categorie']
      ],
      where: {
        categorie: { [Op.ne]: null }
      },
      order: [['categorie', 'ASC']]
    });

    res.json({
      categories: categories.map(c => c.categorie).filter(c => c)
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Lookup game info from EAN barcode
 * POST /api/jeux/lookup-ean
 * Body: { ean: "3558380077992" } or { title: "Catan" }
 */
const lookupEAN = async (req, res) => {
  try {
    const { ean, title } = req.body;

    if (!ean && !title) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'EAN ou titre requis'
      });
    }

    let result;

    if (ean) {
      console.log(`[API] Lookup EAN: ${ean}`);
      result = await eanLookupService.lookupEAN(ean);
    } else {
      console.log(`[API] Lookup Title: ${title}`);
      result = await eanLookupService.lookupByTitle(title);
    }

    // Si pas de resultat, retourner un objet standard
    if (!result || !result.found) {
      return res.json({
        found: false,
        source: 'not_found',
        jeu: null,
        message: ean
          ? `Aucun jeu trouve pour le code EAN ${ean}`
          : `Aucun jeu trouve pour "${title}"`
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Lookup EAN error:', error);
    // Retourner un resultat non-trouve plutot qu'une erreur 500
    res.json({
      found: false,
      source: 'error',
      jeu: null,
      message: `Erreur de recherche: ${error.message}`
    });
  }
};

module.exports = {
  getAllJeux,
  getJeuById,
  createJeu,
  updateJeu,
  deleteJeu,
  getCategories,
  lookupEAN
};
