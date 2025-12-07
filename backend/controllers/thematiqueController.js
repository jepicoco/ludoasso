/**
 * Controller Thematique - Gestion des thematiques IA
 */

const ThematiqueService = require('../services/thematiqueService');

/**
 * Liste les thematiques avec filtres
 * GET /api/thematiques
 */
exports.lister = async (req, res) => {
  try {
    const options = {
      type: req.query.type,
      actif: req.query.actif !== undefined ? req.query.actif === 'true' : undefined,
      recherche: req.query.recherche || req.query.q,
      ordre: req.query.ordre || 'usage',
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      includeAlias: req.query.includeAlias === 'true'
    };

    const result = await ThematiqueService.lister(options);
    res.json(result);
  } catch (error) {
    console.error('Erreur listing thematiques:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Recupere une thematique par ID
 * GET /api/thematiques/:id
 */
exports.getById = async (req, res) => {
  try {
    const thematique = await ThematiqueService.getById(req.params.id);

    if (!thematique) {
      return res.status(404).json({ error: 'Thematique non trouvee' });
    }

    res.json(thematique);
  } catch (error) {
    console.error('Erreur get thematique:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cree une nouvelle thematique
 * POST /api/thematiques
 */
exports.creer = async (req, res) => {
  try {
    const { nom, type, description, actif } = req.body;

    if (!nom || !type) {
      return res.status(400).json({ error: 'Nom et type requis' });
    }

    const thematique = await ThematiqueService.creer({
      nom,
      type,
      description,
      actif
    });

    res.status(201).json(thematique);
  } catch (error) {
    console.error('Erreur creation thematique:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Met a jour une thematique
 * PUT /api/thematiques/:id
 */
exports.modifier = async (req, res) => {
  try {
    const thematique = await ThematiqueService.modifier(req.params.id, req.body);
    res.json(thematique);
  } catch (error) {
    console.error('Erreur modification thematique:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Supprime une thematique (soft delete par defaut)
 * DELETE /api/thematiques/:id
 */
exports.supprimer = async (req, res) => {
  try {
    const hard = req.query.hard === 'true';
    const result = await ThematiqueService.supprimer(req.params.id, hard);
    res.json(result);
  } catch (error) {
    console.error('Erreur suppression thematique:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Ajoute un alias a une thematique
 * POST /api/thematiques/:id/alias
 */
exports.ajouterAlias = async (req, res) => {
  try {
    const { alias } = req.body;

    if (!alias) {
      return res.status(400).json({ error: 'Alias requis' });
    }

    const result = await ThematiqueService.ajouterAlias(req.params.id, alias);
    res.status(201).json(result);
  } catch (error) {
    console.error('Erreur ajout alias:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Supprime un alias
 * DELETE /api/thematiques/alias/:aliasId
 */
exports.supprimerAlias = async (req, res) => {
  try {
    const result = await ThematiqueService.supprimerAlias(req.params.aliasId);
    res.json(result);
  } catch (error) {
    console.error('Erreur suppression alias:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Fusionne deux thematiques
 * POST /api/thematiques/fusionner
 */
exports.fusionner = async (req, res) => {
  try {
    const { sourceId, cibleId } = req.body;

    if (!sourceId || !cibleId) {
      return res.status(400).json({ error: 'sourceId et cibleId requis' });
    }

    const userId = req.user?.id;
    const result = await ThematiqueService.fusionner(sourceId, cibleId, userId);
    res.json(result);
  } catch (error) {
    console.error('Erreur fusion thematiques:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Statistiques des thematiques
 * GET /api/thematiques/stats
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await ThematiqueService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Erreur stats thematiques:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Autocompletion pour recherche
 * GET /api/thematiques/autocomplete
 */
exports.autocomplete = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const thematiques = await ThematiqueService.autocomplete(query, {
      type: req.query.type,
      limit: parseInt(req.query.limit) || 10
    });

    res.json(thematiques);
  } catch (error) {
    console.error('Erreur autocomplete:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Detecte les doublons potentiels
 * GET /api/thematiques/doublons
 */
exports.detecterDoublons = async (req, res) => {
  try {
    const seuil = parseFloat(req.query.seuil) || 0.8;
    const doublons = await ThematiqueService.detecterDoublons(seuil);
    res.json(doublons);
  } catch (error) {
    console.error('Erreur detection doublons:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Recupere les thematiques d'un article
 * GET /api/thematiques/article/:typeArticle/:articleId
 */
exports.getThematiquesArticle = async (req, res) => {
  try {
    const { typeArticle, articleId } = req.params;
    const thematiques = await ThematiqueService.getThematiquesArticle(typeArticle, articleId);
    res.json(thematiques);
  } catch (error) {
    console.error('Erreur get thematiques article:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Ajoute un lien article-thematique
 * POST /api/thematiques/article/:typeArticle/:articleId
 * Body: { thematiqueId } ou { nom, type } pour creer a la volee
 */
exports.ajouterLien = async (req, res) => {
  try {
    const { typeArticle, articleId } = req.params;
    let { thematiqueId, nom, type, force, source } = req.body;

    // Si pas de thematiqueId, creer/trouver par nom+type
    if (!thematiqueId) {
      if (!nom || !type) {
        return res.status(400).json({ error: 'thematiqueId ou (nom + type) requis' });
      }

      // Trouver ou creer la thematique
      const thematique = await ThematiqueService.findOrCreate(nom, type);
      thematiqueId = thematique.id;
    }

    const userId = req.user?.id;
    const lien = await ThematiqueService.ajouterLien(
      typeArticle,
      parseInt(articleId),
      thematiqueId,
      force || 0.5,
      userId,
      source || 'manuel'
    );

    res.status(201).json(lien);
  } catch (error) {
    console.error('Erreur ajout lien:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Modifie la force d'un lien
 * PUT /api/thematiques/article/:typeArticle/:articleId/:thematiqueId
 */
exports.modifierForce = async (req, res) => {
  try {
    const { typeArticle, articleId, thematiqueId } = req.params;
    const { force } = req.body;

    if (force === undefined) {
      return res.status(400).json({ error: 'force requise' });
    }

    const userId = req.user?.id;
    const lien = await ThematiqueService.modifierForce(
      typeArticle,
      parseInt(articleId),
      parseInt(thematiqueId),
      parseFloat(force),
      userId
    );

    res.json(lien);
  } catch (error) {
    console.error('Erreur modification force:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Supprime un lien article-thematique
 * DELETE /api/thematiques/article/:typeArticle/:articleId/:thematiqueId
 */
exports.supprimerLien = async (req, res) => {
  try {
    const { typeArticle, articleId, thematiqueId } = req.params;
    const userId = req.user?.id;

    const result = await ThematiqueService.supprimerLien(
      typeArticle,
      parseInt(articleId),
      parseInt(thematiqueId),
      userId
    );

    res.json(result);
  } catch (error) {
    console.error('Erreur suppression lien:', error);
    res.status(400).json({ error: error.message });
  }
};
