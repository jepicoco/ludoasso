/**
 * Controller Enrichissement - Enrichissement IA des articles
 */

const EnrichissementService = require('../services/enrichissementService');

/**
 * Lance un batch d'enrichissement
 * POST /api/enrichissement/batch
 */
exports.lancerBatch = async (req, res) => {
  try {
    const options = {
      types: req.body.types, // ['jeu', 'livre', 'film', 'disque']
      nonEnrichis: req.body.nonEnrichis !== false, // Par defaut, non enrichis
      enrichisAvant: req.body.enrichisAvant ? new Date(req.body.enrichisAvant) : null,
      ids: req.body.ids, // IDs specifiques
      limit: parseInt(req.body.limit) || 100,
      priorite: parseInt(req.body.priorite) || 0
    };

    const result = await EnrichissementService.lancerBatch(options);
    res.json(result);
  } catch (error) {
    console.error('Erreur lancement batch:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Dry run - estimation sans traitement
 * POST /api/enrichissement/dry-run
 */
exports.dryRun = async (req, res) => {
  try {
    const options = {
      types: req.body.types,
      nonEnrichis: req.body.nonEnrichis !== false,
      enrichisAvant: req.body.enrichisAvant ? new Date(req.body.enrichisAvant) : null,
      ids: req.body.ids,
      limit: parseInt(req.body.limit) || 100,
      configId: req.body.configId
    };

    const result = await EnrichissementService.dryRun(options);
    res.json(result);
  } catch (error) {
    console.error('Erreur dry run:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Traite un batch avec streaming SSE
 * GET /api/enrichissement/batch/:batchId/stream
 */
exports.streamBatch = async (req, res) => {
  const { batchId } = req.params;
  const autoValidate = req.query.autoValidate === 'true';
  const configId = req.query.configId ? parseInt(req.query.configId) : null;
  const userId = req.user?.id;

  // Configuration SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Pour nginx

  try {
    const generator = EnrichissementService.traiterBatch(batchId, {
      autoValidate,
      configId,
      userId
    });

    for await (const event of generator) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);

      // Flush pour envoyer immediatement
      if (res.flush) res.flush();
    }

    res.write('data: {"type":"end"}\n\n');
    res.end();
  } catch (error) {
    console.error('Erreur streaming batch:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
};

/**
 * Statistiques d'un batch
 * GET /api/enrichissement/batch/:batchId
 */
exports.getStatsBatch = async (req, res) => {
  try {
    const stats = await EnrichissementService.getStatsBatch(req.params.batchId);
    res.json(stats);
  } catch (error) {
    console.error('Erreur stats batch:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Liste des batches recents
 * GET /api/enrichissement/batches
 */
exports.getBatchsRecents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const batches = await EnrichissementService.getBatchsRecents(limit);
    res.json(batches);
  } catch (error) {
    console.error('Erreur listing batches:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Items en attente de validation
 * GET /api/enrichissement/validation
 */
exports.getEnAttenteValidation = async (req, res) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      typeArticle: req.query.type || null
    };

    const items = await EnrichissementService.getEnAttenteValidation(options);
    res.json(items);
  } catch (error) {
    console.error('Erreur listing validation:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Detail d'un item pour validation/edition
 * GET /api/enrichissement/:id
 */
exports.getItemValidation = async (req, res) => {
  try {
    const item = await EnrichissementService.getItemValidation(req.params.id);
    res.json(item);
  } catch (error) {
    console.error('Erreur detail item:', error);
    res.status(404).json({ error: error.message });
  }
};

/**
 * Valide un item
 * POST /api/enrichissement/:id/valider
 */
exports.validerItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const item = await EnrichissementService.validerItem(req.params.id, userId);
    res.json(item);
  } catch (error) {
    console.error('Erreur validation item:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Rejette un item
 * POST /api/enrichissement/:id/rejeter
 */
exports.rejeterItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const item = await EnrichissementService.rejeterItem(req.params.id, userId);
    res.json(item);
  } catch (error) {
    console.error('Erreur rejet item:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Valide tout un batch
 * POST /api/enrichissement/batch/:batchId/valider
 */
exports.validerBatch = async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await EnrichissementService.validerBatch(req.params.batchId, userId);
    res.json(result);
  } catch (error) {
    console.error('Erreur validation batch:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Modifie les thematiques proposees avant validation
 * PUT /api/enrichissement/:id/thematiques
 */
exports.modifierProposition = async (req, res) => {
  try {
    const { thematiques } = req.body;

    if (!thematiques || !Array.isArray(thematiques)) {
      return res.status(400).json({ error: 'thematiques (array) requis' });
    }

    const item = await EnrichissementService.modifierProposition(req.params.id, thematiques);
    res.json(item);
  } catch (error) {
    console.error('Erreur modification proposition:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Enrichit un seul article (pour test)
 * POST /api/enrichissement/article
 */
exports.enrichirArticle = async (req, res) => {
  try {
    const { typeArticle, articleId, configId } = req.body;

    if (!typeArticle || !articleId) {
      return res.status(400).json({ error: 'typeArticle et articleId requis' });
    }

    const result = await EnrichissementService.enrichirArticle(typeArticle, articleId, {
      configId
    });

    res.json(result);
  } catch (error) {
    console.error('Erreur enrichissement article:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Annule un batch en cours
 * POST /api/enrichissement/batch/:batchId/annuler
 */
exports.annulerBatch = async (req, res) => {
  try {
    const result = await EnrichissementService.annulerBatch(req.params.batchId);
    res.json(result);
  } catch (error) {
    console.error('Erreur annulation batch:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Retourne les batches actifs
 * GET /api/enrichissement/active
 */
exports.getActiveBatches = async (req, res) => {
  try {
    const batches = EnrichissementService.getActiveBatches();
    res.json(batches);
  } catch (error) {
    console.error('Erreur listing batches actifs:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Liste les articles disponibles pour enrichissement
 * GET /api/enrichissement/articles
 */
exports.getArticlesAEnrichir = async (req, res) => {
  try {
    const options = {
      types: req.query.types ? req.query.types.split(',') : undefined,
      nonEnrichis: req.query.nonEnrichis !== 'false',
      limit: parseInt(req.query.limit) || 100
    };

    const articles = await EnrichissementService.getArticlesAEnrichir(options);

    // Grouper par type
    const grouped = {};
    for (const art of articles) {
      if (!grouped[art.type_article]) {
        grouped[art.type_article] = [];
      }
      grouped[art.type_article].push(art.article_id);
    }

    res.json({
      total: articles.length,
      parType: grouped
    });
  } catch (error) {
    console.error('Erreur listing articles:', error);
    res.status(500).json({ error: error.message });
  }
};
