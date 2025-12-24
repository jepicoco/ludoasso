/**
 * Controller pour la gestion des exemplaires multiples
 * Gere les CRUD pour exemplaires_jeux, exemplaires_livres, exemplaires_films, exemplaires_disques
 */

const {
  ExemplaireJeu,
  ExemplaireLivre,
  ExemplaireFilm,
  ExemplaireDisque,
  Jeu,
  Livre,
  Film,
  Disque,
  EmplacementJeu,
  EmplacementLivre,
  EmplacementFilm,
  EmplacementDisque,
  JeuEan,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

// Mapping module -> model
const EXEMPLAIRE_MODELS = {
  jeu: ExemplaireJeu,
  livre: ExemplaireLivre,
  film: ExemplaireFilm,
  disque: ExemplaireDisque
};

const ARTICLE_MODELS = {
  jeu: Jeu,
  livre: Livre,
  film: Film,
  disque: Disque
};

const EMPLACEMENT_MODELS = {
  jeu: EmplacementJeu,
  livre: EmplacementLivre,
  film: EmplacementFilm,
  disque: EmplacementDisque
};

const FK_FIELDS = {
  jeu: 'jeu_id',
  livre: 'livre_id',
  film: 'film_id',
  disque: 'disque_id'
};

/**
 * Helper pour obtenir le modele d'exemplaire selon le module
 */
function getExemplaireModel(module) {
  const model = EXEMPLAIRE_MODELS[module];
  if (!model) {
    throw new Error(`Module inconnu: ${module}. Valeurs acceptees: jeu, livre, film, disque`);
  }
  return model;
}

/**
 * Lister les exemplaires d'un article
 * GET /api/:module/:articleId/exemplaires
 */
exports.getExemplaires = async (req, res) => {
  try {
    const { module, articleId } = req.params;
    const ExemplaireModel = getExemplaireModel(module);
    const EmplacementModel = EMPLACEMENT_MODELS[module];
    const fkField = FK_FIELDS[module];

    const exemplaires = await ExemplaireModel.findAll({
      where: { [fkField]: articleId },
      include: [
        { model: EmplacementModel, as: 'emplacement' }
      ],
      order: [['numero_exemplaire', 'ASC']]
    });

    res.json(exemplaires);
  } catch (error) {
    console.error('Erreur getExemplaires:', error);
    res.status(500).json({
      error: 'Erreur lors de la recuperation des exemplaires',
      message: error.message
    });
  }
};

/**
 * Obtenir un exemplaire par ID
 * GET /api/exemplaires/:module/:exemplaireId
 */
exports.getExemplaireById = async (req, res) => {
  try {
    const { module, exemplaireId } = req.params;
    const ExemplaireModel = getExemplaireModel(module);
    const ArticleModel = ARTICLE_MODELS[module];
    const EmplacementModel = EMPLACEMENT_MODELS[module];

    const exemplaire = await ExemplaireModel.findByPk(exemplaireId, {
      include: [
        { model: ArticleModel, as: module },
        { model: EmplacementModel, as: 'emplacement' }
      ]
    });

    if (!exemplaire) {
      return res.status(404).json({ error: 'Exemplaire non trouve' });
    }

    res.json(exemplaire);
  } catch (error) {
    console.error('Erreur getExemplaireById:', error);
    res.status(500).json({
      error: 'Erreur lors de la recuperation de l\'exemplaire',
      message: error.message
    });
  }
};

/**
 * Trouver un exemplaire par code-barre
 * GET /api/exemplaires/by-barcode/:codeBarre
 */
exports.getExemplaireByBarcode = async (req, res) => {
  try {
    const { codeBarre } = req.params;

    // Chercher dans tous les modeles d'exemplaires
    for (const [module, ExemplaireModel] of Object.entries(EXEMPLAIRE_MODELS)) {
      const ArticleModel = ARTICLE_MODELS[module];
      const EmplacementModel = EMPLACEMENT_MODELS[module];

      const exemplaire = await ExemplaireModel.findOne({
        where: { code_barre: codeBarre },
        include: [
          { model: ArticleModel, as: module },
          { model: EmplacementModel, as: 'emplacement' }
        ]
      });

      if (exemplaire) {
        return res.json({
          module,
          exemplaire,
          article: exemplaire[module]
        });
      }
    }

    res.status(404).json({ error: 'Aucun exemplaire trouve avec ce code-barre' });
  } catch (error) {
    console.error('Erreur getExemplaireByBarcode:', error);
    res.status(500).json({
      error: 'Erreur lors de la recherche par code-barre',
      message: error.message
    });
  }
};

/**
 * Creer un nouvel exemplaire
 * POST /api/:module/:articleId/exemplaires
 */
exports.createExemplaire = async (req, res) => {
  try {
    const { module, articleId } = req.params;
    const ExemplaireModel = getExemplaireModel(module);
    const ArticleModel = ARTICLE_MODELS[module];
    const fkField = FK_FIELDS[module];

    // Verifier que l'article existe
    const article = await ArticleModel.findByPk(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article non trouve' });
    }

    // Obtenir le prochain numero d'exemplaire
    const nextNumero = await ExemplaireModel.getNextNumeroExemplaire(articleId);

    // Creer l'exemplaire
    const exemplaireData = {
      [fkField]: articleId,
      numero_exemplaire: nextNumero,
      code_barre: req.body.code_barre || null,
      etat: req.body.etat || 'bon',
      notes: req.body.notes || null,
      emplacement_id: req.body.emplacement_id || null,
      prix_achat: req.body.prix_achat || null,
      date_acquisition: req.body.date_acquisition || null,
      statut: req.body.statut || 'disponible'
    };

    const exemplaire = await ExemplaireModel.create(exemplaireData);

    res.status(201).json({
      message: 'Exemplaire cree avec succes',
      exemplaire
    });
  } catch (error) {
    console.error('Erreur createExemplaire:', error);

    // Gerer l'erreur de code-barre unique
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Code-barre deja utilise',
        message: 'Ce code-barre est deja assigne a un autre exemplaire'
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la creation de l\'exemplaire',
      message: error.message
    });
  }
};

/**
 * Modifier un exemplaire
 * PUT /api/exemplaires/:module/:exemplaireId
 */
exports.updateExemplaire = async (req, res) => {
  try {
    const { module, exemplaireId } = req.params;
    const ExemplaireModel = getExemplaireModel(module);

    const exemplaire = await ExemplaireModel.findByPk(exemplaireId);
    if (!exemplaire) {
      return res.status(404).json({ error: 'Exemplaire non trouve' });
    }

    // Champs modifiables
    const updateData = {};
    if (req.body.code_barre !== undefined) updateData.code_barre = req.body.code_barre;
    if (req.body.etat !== undefined) updateData.etat = req.body.etat;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.emplacement_id !== undefined) updateData.emplacement_id = req.body.emplacement_id;
    if (req.body.prix_achat !== undefined) updateData.prix_achat = req.body.prix_achat;
    if (req.body.date_acquisition !== undefined) updateData.date_acquisition = req.body.date_acquisition;
    if (req.body.statut !== undefined) updateData.statut = req.body.statut;

    await exemplaire.update(updateData);

    res.json({
      message: 'Exemplaire mis a jour',
      exemplaire
    });
  } catch (error) {
    console.error('Erreur updateExemplaire:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Code-barre deja utilise',
        message: 'Ce code-barre est deja assigne a un autre exemplaire'
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la mise a jour de l\'exemplaire',
      message: error.message
    });
  }
};

/**
 * Supprimer un exemplaire
 * DELETE /api/exemplaires/:module/:exemplaireId
 */
exports.deleteExemplaire = async (req, res) => {
  try {
    const { module, exemplaireId } = req.params;
    const ExemplaireModel = getExemplaireModel(module);

    const exemplaire = await ExemplaireModel.findByPk(exemplaireId);
    if (!exemplaire) {
      return res.status(404).json({ error: 'Exemplaire non trouve' });
    }

    // Verifier que l'exemplaire n'est pas emprunte
    if (exemplaire.statut === 'emprunte') {
      return res.status(400).json({
        error: 'Impossible de supprimer un exemplaire emprunte',
        message: 'Veuillez d\'abord enregistrer le retour de l\'emprunt'
      });
    }

    await exemplaire.destroy();

    res.json({ message: 'Exemplaire supprime avec succes' });
  } catch (error) {
    console.error('Erreur deleteExemplaire:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de l\'exemplaire',
      message: error.message
    });
  }
};

/**
 * Assigner un code-barre a un exemplaire
 * POST /api/exemplaires/assign-barcode
 * Body: { module, exemplaireId, codeBarre }
 */
exports.assignBarcode = async (req, res) => {
  try {
    const { module, exemplaireId, codeBarre } = req.body;

    if (!module || !exemplaireId || !codeBarre) {
      return res.status(400).json({
        error: 'Parametres manquants',
        message: 'module, exemplaireId et codeBarre sont requis'
      });
    }

    const ExemplaireModel = getExemplaireModel(module);
    const ArticleModel = ARTICLE_MODELS[module];

    const exemplaire = await ExemplaireModel.findByPk(exemplaireId, {
      include: [{ model: ArticleModel, as: module }]
    });

    if (!exemplaire) {
      return res.status(404).json({ error: 'Exemplaire non trouve' });
    }

    // Verifier que l'exemplaire n'a pas deja un code-barre
    if (exemplaire.code_barre) {
      return res.status(400).json({
        error: 'Exemplaire deja identifie',
        message: `Cet exemplaire a deja le code-barre: ${exemplaire.code_barre}`
      });
    }

    // Verifier que le code-barre n'est pas deja utilise
    for (const [mod, Model] of Object.entries(EXEMPLAIRE_MODELS)) {
      const existing = await Model.findOne({ where: { code_barre: codeBarre } });
      if (existing) {
        return res.status(400).json({
          error: 'Code-barre deja utilise',
          message: `Ce code-barre est deja assigne a un exemplaire de ${mod}`
        });
      }
    }

    // Assigner le code-barre
    await exemplaire.update({ code_barre: codeBarre });

    res.json({
      message: 'Code-barre assigne avec succes',
      exemplaire,
      article: exemplaire[module]
    });
  } catch (error) {
    console.error('Erreur assignBarcode:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'assignation du code-barre',
      message: error.message
    });
  }
};

/**
 * Lister les exemplaires disponibles d'un article
 * GET /api/:module/:articleId/exemplaires/disponibles
 */
exports.getExemplairesDisponibles = async (req, res) => {
  try {
    const { module, articleId } = req.params;
    const ExemplaireModel = getExemplaireModel(module);
    const EmplacementModel = EMPLACEMENT_MODELS[module];
    const fkField = FK_FIELDS[module];

    const exemplaires = await ExemplaireModel.findAll({
      where: {
        [fkField]: articleId,
        statut: 'disponible'
      },
      include: [
        { model: EmplacementModel, as: 'emplacement' }
      ],
      order: [['numero_exemplaire', 'ASC']]
    });

    res.json(exemplaires);
  } catch (error) {
    console.error('Erreur getExemplairesDisponibles:', error);
    res.status(500).json({
      error: 'Erreur lors de la recuperation des exemplaires disponibles',
      message: error.message
    });
  }
};

/**
 * Lister les exemplaires sans code-barre d'un article
 * GET /api/:module/:articleId/exemplaires/sans-code-barre
 */
exports.getExemplairesSansCodeBarre = async (req, res) => {
  try {
    const { module, articleId } = req.params;
    const ExemplaireModel = getExemplaireModel(module);
    const EmplacementModel = EMPLACEMENT_MODELS[module];
    const fkField = FK_FIELDS[module];

    const exemplaires = await ExemplaireModel.findAll({
      where: {
        [fkField]: articleId,
        code_barre: { [Op.is]: null }
      },
      include: [
        { model: EmplacementModel, as: 'emplacement' }
      ],
      order: [['numero_exemplaire', 'ASC']]
    });

    res.json(exemplaires);
  } catch (error) {
    console.error('Erreur getExemplairesSansCodeBarre:', error);
    res.status(500).json({
      error: 'Erreur lors de la recuperation des exemplaires sans code-barre',
      message: error.message
    });
  }
};

/**
 * Rechercher un article par EAN et retourner ses exemplaires sans code-barre
 * GET /api/exemplaires/search-by-ean/:ean
 * Pour le workflow d'attribution de code-barre: scan EAN -> selection exemplaire
 */
exports.searchByEAN = async (req, res) => {
  try {
    const { ean } = req.params;

    // Chercher dans tous les types d'articles
    for (const [module, ArticleModel] of Object.entries(ARTICLE_MODELS)) {
      let article = await ArticleModel.findOne({
        where: { ean },
        include: [
          {
            model: EXEMPLAIRE_MODELS[module],
            as: 'exemplaires',
            where: { code_barre: { [Op.is]: null } },
            required: false,
            include: [
              { model: EMPLACEMENT_MODELS[module], as: 'emplacement' }
            ]
          }
        ]
      });

      // Pour les jeux, chercher aussi dans jeu_eans (EAN alternatifs)
      if (!article && module === 'jeu') {
        const jeuEan = await JeuEan.findOne({
          where: { ean },
          include: [{
            model: Jeu,
            as: 'jeu',
            include: [
              {
                model: ExemplaireJeu,
                as: 'exemplaires',
                where: { code_barre: { [Op.is]: null } },
                required: false,
                include: [
                  { model: EmplacementJeu, as: 'emplacement' }
                ]
              }
            ]
          }]
        });

        if (jeuEan && jeuEan.jeu) {
          article = jeuEan.jeu;
        }
      }

      if (article) {
        return res.json({
          found: true,
          module,
          article,
          exemplaires_sans_code_barre: article.exemplaires || []
        });
      }
    }

    res.json({
      found: false,
      message: 'Aucun article trouve avec cet EAN'
    });
  } catch (error) {
    console.error('Erreur searchByEAN:', error);
    res.status(500).json({
      error: 'Erreur lors de la recherche par EAN',
      message: error.message
    });
  }
};

/**
 * Obtenir les statistiques d'exemplaires pour un article
 * GET /api/:module/:articleId/exemplaires/stats
 */
// Mapping module -> nom de table exemplaires
const EXEMPLAIRE_TABLE_NAMES = {
  jeu: 'exemplaires_jeux',
  livre: 'exemplaires_livres',
  film: 'exemplaires_films',
  disque: 'exemplaires_disques'
};

exports.getExemplairesStats = async (req, res) => {
  try {
    const { module, articleId } = req.params;
    const ExemplaireModel = getExemplaireModel(module);
    const fkField = FK_FIELDS[module];
    const tableName = EXEMPLAIRE_TABLE_NAMES[module];

    const [stats] = await sequelize.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'disponible' THEN 1 ELSE 0 END) as disponibles,
        SUM(CASE WHEN statut = 'emprunte' THEN 1 ELSE 0 END) as empruntes,
        SUM(CASE WHEN statut = 'reserve' THEN 1 ELSE 0 END) as reserves,
        SUM(CASE WHEN statut = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN statut = 'perdu' THEN 1 ELSE 0 END) as perdus,
        SUM(CASE WHEN statut = 'archive' THEN 1 ELSE 0 END) as archives,
        SUM(CASE WHEN code_barre IS NULL THEN 1 ELSE 0 END) as sans_code_barre
      FROM ${tableName}
      WHERE ${fkField} = :articleId
    `, {
      replacements: { articleId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json(stats);
  } catch (error) {
    console.error('Erreur getExemplairesStats:', error);
    res.status(500).json({
      error: 'Erreur lors de la recuperation des statistiques',
      message: error.message
    });
  }
};
