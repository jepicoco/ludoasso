const {
  Jeu, Emprunt, Utilisateur,
  Categorie, Theme, Mecanisme, Langue,
  Editeur, Auteur, Illustrateur,
  Gamme, EmplacementJeu,
  JeuCategorie, JeuTheme, JeuMecanisme, JeuLangue,
  JeuEditeur, JeuAuteur, JeuIllustrateur
} = require('../models');
const { Op } = require('sequelize');
const eanLookupService = require('../services/eanLookupService');

// Configuration des includes pour les associations
const INCLUDE_REFS = [
  { model: Categorie, as: 'categoriesRef', through: { attributes: [] } },
  { model: Theme, as: 'themesRef', through: { attributes: [] } },
  { model: Mecanisme, as: 'mecanismesRef', through: { attributes: [] } },
  { model: Langue, as: 'languesRef', through: { attributes: [] } },
  { model: Editeur, as: 'editeursRef', through: { attributes: [] } },
  { model: Auteur, as: 'auteursRef', through: { attributes: [] } },
  { model: Illustrateur, as: 'illustrateursRef', through: { attributes: [] } },
  { model: Gamme, as: 'gammeRef' },
  { model: EmplacementJeu, as: 'emplacementRef' }
];

/**
 * Get all jeux with optional filters and search
 * GET /api/jeux?statut=disponible&categorie_id=1&search=monopoly&include_refs=true
 */
const getAllJeux = async (req, res) => {
  try {
    const {
      statut, categorie, categorie_id, theme_id, mecanisme_id,
      search, age_min, nb_joueurs, page = 1, limit = 50,
      include_refs = 'false'
    } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (statut) {
      where.statut = statut;
    }

    // Support ancien filtre par nom (retrocompatibilité)
    if (categorie) {
      where.categories = { [Op.like]: `%${categorie}%` };
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
        { code_barre: { [Op.like]: `%${search}%` } },
        { ean: { [Op.like]: `%${search}%` } }
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
    if (categorie_id) {
      const jeuIds = await JeuCategorie.findAll({
        attributes: ['jeu_id'],
        where: { categorie_id: parseInt(categorie_id) }
      });
      where.id = { [Op.in]: jeuIds.map(j => j.jeu_id) };
    }

    if (theme_id) {
      const jeuIds = await JeuTheme.findAll({
        attributes: ['jeu_id'],
        where: { theme_id: parseInt(theme_id) }
      });
      if (where.id) {
        where.id[Op.in] = where.id[Op.in].filter(id =>
          jeuIds.map(j => j.jeu_id).includes(id)
        );
      } else {
        where.id = { [Op.in]: jeuIds.map(j => j.jeu_id) };
      }
    }

    if (mecanisme_id) {
      const jeuIds = await JeuMecanisme.findAll({
        attributes: ['jeu_id'],
        where: { mecanisme_id: parseInt(mecanisme_id) }
      });
      if (where.id) {
        where.id[Op.in] = where.id[Op.in].filter(id =>
          jeuIds.map(j => j.jeu_id).includes(id)
        );
      } else {
        where.id = { [Op.in]: jeuIds.map(j => j.jeu_id) };
      }
    }

    const { count, rows } = await Jeu.findAndCountAll(queryOptions);

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
 * Get jeu by ID with emprunts history and all references
 * GET /api/jeux/:id
 */
const getJeuById = async (req, res) => {
  try {
    const { id } = req.params;

    const jeu = await Jeu.findByPk(id, {
      include: [
        ...INCLUDE_REFS,
        {
          model: Emprunt,
          as: 'emprunts',
          include: [{
            model: Utilisateur,
            as: 'adherent'
          }],
          order: [['date_emprunt', 'DESC']],
          limit: 10
        }
      ]
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
 * Synchronise les relations many-to-many pour un jeu
 */
async function syncJeuRelations(jeu, data) {
  // Catégories
  if (data.categorie_ids !== undefined) {
    await JeuCategorie.destroy({ where: { jeu_id: jeu.id } });
    if (data.categorie_ids && data.categorie_ids.length > 0) {
      await JeuCategorie.bulkCreate(
        data.categorie_ids.map(id => ({ jeu_id: jeu.id, categorie_id: id }))
      );
    }
  }

  // Thèmes
  if (data.theme_ids !== undefined) {
    await JeuTheme.destroy({ where: { jeu_id: jeu.id } });
    if (data.theme_ids && data.theme_ids.length > 0) {
      await JeuTheme.bulkCreate(
        data.theme_ids.map(id => ({ jeu_id: jeu.id, theme_id: id }))
      );
    }
  }

  // Mécanismes
  if (data.mecanisme_ids !== undefined) {
    await JeuMecanisme.destroy({ where: { jeu_id: jeu.id } });
    if (data.mecanisme_ids && data.mecanisme_ids.length > 0) {
      await JeuMecanisme.bulkCreate(
        data.mecanisme_ids.map(id => ({ jeu_id: jeu.id, mecanisme_id: id }))
      );
    }
  }

  // Langues
  if (data.langue_ids !== undefined) {
    await JeuLangue.destroy({ where: { jeu_id: jeu.id } });
    if (data.langue_ids && data.langue_ids.length > 0) {
      await JeuLangue.bulkCreate(
        data.langue_ids.map(id => ({ jeu_id: jeu.id, langue_id: id }))
      );
    }
  }

  // Éditeurs
  if (data.editeur_ids !== undefined) {
    await JeuEditeur.destroy({ where: { jeu_id: jeu.id } });
    if (data.editeur_ids && data.editeur_ids.length > 0) {
      await JeuEditeur.bulkCreate(
        data.editeur_ids.map(id => ({ jeu_id: jeu.id, editeur_id: id }))
      );
    }
  }

  // Auteurs
  if (data.auteur_ids !== undefined) {
    await JeuAuteur.destroy({ where: { jeu_id: jeu.id } });
    if (data.auteur_ids && data.auteur_ids.length > 0) {
      await JeuAuteur.bulkCreate(
        data.auteur_ids.map(id => ({ jeu_id: jeu.id, auteur_id: id }))
      );
    }
  }

  // Illustrateurs
  if (data.illustrateur_ids !== undefined) {
    await JeuIllustrateur.destroy({ where: { jeu_id: jeu.id } });
    if (data.illustrateur_ids && data.illustrateur_ids.length > 0) {
      await JeuIllustrateur.bulkCreate(
        data.illustrateur_ids.map(id => ({ jeu_id: jeu.id, illustrateur_id: id }))
      );
    }
  }
}

/**
 * Create new jeu
 * POST /api/jeux
 */
const createJeu = async (req, res) => {
  try {
    const {
      titre, editeur, auteur, annee_sortie, age_min,
      nb_joueurs_min, nb_joueurs_max, duree_partie,
      categorie, categories, themes, mecanismes, langues,
      description, regles_url, image_url,
      emplacement, emplacement_id, gamme_id,
      date_acquisition, prix_achat, prix_indicatif, notes,
      sous_titre, type_jeu, illustrateur, univers, dimensions, poids,
      gratuit, etat, proprietaire, cadeau, prive, protege, organise,
      personnalise, figurines_peintes, reference, referent, ean, id_externe,
      // Relations normalisées (tableaux d'IDs)
      categorie_ids, theme_ids, mecanisme_ids, langue_ids,
      editeur_ids, auteur_ids, illustrateur_ids
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
      sous_titre,
      type_jeu,
      // Champs texte (rétrocompatibilité)
      editeur,
      auteur,
      illustrateur,
      // Champs multi-valeurs texte (rétrocompatibilité)
      categories: categorie || categories,
      themes,
      mecanismes,
      langues,
      // Infos de base
      annee_sortie,
      age_min,
      nb_joueurs_min,
      nb_joueurs_max,
      duree_partie,
      univers,
      // Physique
      dimensions,
      poids,
      // Prix
      prix_indicatif,
      prix_achat,
      gratuit,
      // Gestion
      description,
      regles_url,
      image_url,
      statut: 'disponible',
      etat,
      emplacement,
      emplacement_id,
      gamme_id,
      date_acquisition,
      proprietaire,
      cadeau,
      // Flags
      prive,
      protege,
      organise,
      personnalise,
      figurines_peintes,
      // Notes
      notes,
      reference,
      referent,
      // Identifiants externes
      ean,
      id_externe
    });

    // Synchroniser les relations many-to-many
    await syncJeuRelations(jeu, {
      categorie_ids, theme_ids, mecanisme_ids, langue_ids,
      editeur_ids, auteur_ids, illustrateur_ids
    });

    // Recharger avec les associations
    const jeuComplet = await Jeu.findByPk(jeu.id, { include: INCLUDE_REFS });

    res.status(201).json({
      message: 'Jeu created successfully',
      jeu: jeuComplet
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
      categorie, categories, themes, mecanismes, langues,
      description, regles_url, image_url,
      statut, emplacement, emplacement_id, gamme_id,
      date_acquisition, prix_achat, prix_indicatif, notes,
      sous_titre, type_jeu, illustrateur, univers, dimensions, poids,
      gratuit, etat, proprietaire, cadeau, prive, protege, organise,
      personnalise, figurines_peintes, reference, referent, ean, id_externe,
      // Relations normalisées
      categorie_ids, theme_ids, mecanisme_ids, langue_ids,
      editeur_ids, auteur_ids, illustrateur_ids
    } = req.body;

    const jeu = await Jeu.findByPk(id);

    if (!jeu) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Jeu not found'
      });
    }

    // Update scalar fields
    if (titre) jeu.titre = titre;
    if (sous_titre !== undefined) jeu.sous_titre = sous_titre;
    if (type_jeu !== undefined) jeu.type_jeu = type_jeu;
    if (editeur !== undefined) jeu.editeur = editeur;
    if (auteur !== undefined) jeu.auteur = auteur;
    if (illustrateur !== undefined) jeu.illustrateur = illustrateur;
    if (annee_sortie !== undefined) jeu.annee_sortie = annee_sortie;
    if (age_min !== undefined) jeu.age_min = age_min;
    if (nb_joueurs_min !== undefined) jeu.nb_joueurs_min = nb_joueurs_min;
    if (nb_joueurs_max !== undefined) jeu.nb_joueurs_max = nb_joueurs_max;
    if (duree_partie !== undefined) jeu.duree_partie = duree_partie;
    // Multi-valeurs texte (rétrocompatibilité)
    if (categorie !== undefined) jeu.categories = categorie;
    if (categories !== undefined) jeu.categories = categories;
    if (themes !== undefined) jeu.themes = themes;
    if (mecanismes !== undefined) jeu.mecanismes = mecanismes;
    if (langues !== undefined) jeu.langues = langues;
    if (univers !== undefined) jeu.univers = univers;
    // Physique
    if (dimensions !== undefined) jeu.dimensions = dimensions;
    if (poids !== undefined) jeu.poids = poids;
    // Prix
    if (prix_indicatif !== undefined) jeu.prix_indicatif = prix_indicatif;
    if (prix_achat !== undefined) jeu.prix_achat = prix_achat;
    if (gratuit !== undefined) jeu.gratuit = gratuit;
    // Gestion
    if (description !== undefined) jeu.description = description;
    if (regles_url !== undefined) jeu.regles_url = regles_url;
    if (image_url !== undefined) jeu.image_url = image_url;
    if (statut) jeu.statut = statut;
    if (etat !== undefined) jeu.etat = etat;
    if (emplacement !== undefined) jeu.emplacement = emplacement;
    if (emplacement_id !== undefined) jeu.emplacement_id = emplacement_id;
    if (gamme_id !== undefined) jeu.gamme_id = gamme_id;
    if (date_acquisition !== undefined) jeu.date_acquisition = date_acquisition;
    if (proprietaire !== undefined) jeu.proprietaire = proprietaire;
    if (cadeau !== undefined) jeu.cadeau = cadeau;
    // Flags
    if (prive !== undefined) jeu.prive = prive;
    if (protege !== undefined) jeu.protege = protege;
    if (organise !== undefined) jeu.organise = organise;
    if (personnalise !== undefined) jeu.personnalise = personnalise;
    if (figurines_peintes !== undefined) jeu.figurines_peintes = figurines_peintes;
    // Notes
    if (notes !== undefined) jeu.notes = notes;
    if (reference !== undefined) jeu.reference = reference;
    if (referent !== undefined) jeu.referent = referent;
    // Identifiants
    if (ean !== undefined) jeu.ean = ean;
    if (id_externe !== undefined) jeu.id_externe = id_externe;

    await jeu.save();

    // Synchroniser les relations many-to-many
    await syncJeuRelations(jeu, {
      categorie_ids, theme_ids, mecanisme_ids, langue_ids,
      editeur_ids, auteur_ids, illustrateur_ids
    });

    // Recharger avec les associations
    const jeuComplet = await Jeu.findByPk(jeu.id, { include: INCLUDE_REFS });

    res.json({
      message: 'Jeu updated successfully',
      jeu: jeuComplet
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
 * Get available categories (from normalized table)
 * GET /api/jeux/categories
 */
const getCategories = async (req, res) => {
  try {
    // Utiliser la table normalisée si elle contient des données
    const normalizedCategories = await Categorie.findAll({
      where: { actif: true },
      order: [['nom', 'ASC']]
    });

    if (normalizedCategories.length > 0) {
      return res.json({
        categories: normalizedCategories.map(c => c.nom),
        categoriesRef: normalizedCategories
      });
    }

    // Fallback: extraire depuis le champ texte (rétrocompatibilité)
    const jeux = await Jeu.findAll({
      attributes: ['categories'],
      where: { categories: { [Op.ne]: null } }
    });

    const categoriesSet = new Set();
    jeux.forEach(j => {
      if (j.categories) {
        j.categories.split(',').forEach(c => {
          const trimmed = c.trim();
          if (trimmed) categoriesSet.add(trimmed);
        });
      }
    });

    const categories = Array.from(categoriesSet).sort();

    res.json({
      categories,
      categoriesRef: categories.map((nom, idx) => ({ id: idx + 1, nom }))
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
