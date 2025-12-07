/**
 * Service Enrichissement - Enrichissement IA des articles avec thematiques
 */

const {
  EnrichissementQueue,
  ArticleThematique,
  Thematique,
  Jeu,
  Livre,
  Film,
  Disque,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const LLMService = require('./llmService');

class EnrichissementService {

  // Batches actifs (pour annulation)
  static activeBatches = new Map();

  /**
   * Prompt template pour l'enrichissement
   */
  static getPromptEnrichissement(article) {
    const basePrompt = `Analyse cet article et extrais les thematiques pertinentes.

Article:
- Type: ${article.type}
- Titre: ${article.titre}
${article.description ? `- Description: ${article.description}` : ''}
${article.annee ? `- Annee: ${article.annee}` : ''}
${article.metadonnees || ''}

Retourne UNIQUEMENT un JSON valide avec les thematiques (pas d'explication):
{
  "thematiques": [
    {"nom": "...", "type": "theme|mecanisme|ambiance|public|complexite|duree|autre", "force": 0.0-1.0},
    ...
  ]
}

Types disponibles:
- theme: Univers, setting (Fantasy, Science-Fiction, Historique, Medieval, Pirates, Zombies...)
- mecanisme: Mecanique de jeu (Cooperation, Deck-building, Draft, Placement d'ouvriers, Bluff...)
- ambiance: Atmosphere (Familial, Expert, Tendu, Relaxant, Festif, Strategique...)
- public: Cible (Enfants, Adultes, Solo, Grande tablée, 2 joueurs...)
- complexite: Niveau (Initiation, Intermediaire, Expert, Tres complexe...)
- duree: Temps (Partie rapide, 30 minutes, 1-2 heures, Longue duree...)
- autre: Autres caracteristiques pertinentes

Force: 1.0 = tres representatif, 0.5 = moyennement, 0.1 = legerement present

Limite: Maximum 10 thematiques les plus pertinentes.`;

    return basePrompt;
  }

  /**
   * Recupere les details d'un article selon son type
   */
  static async getArticleDetails(typeArticle, articleId) {
    let article;
    let metadonnees = '';

    switch (typeArticle) {
      case 'jeu':
        article = await Jeu.findByPk(articleId);
        if (article) {
          metadonnees = [
            article.nb_joueurs_min && article.nb_joueurs_max ?
              `- Joueurs: ${article.nb_joueurs_min}-${article.nb_joueurs_max}` : '',
            article.age_min ? `- Age minimum: ${article.age_min} ans` : '',
            article.duree ? `- Duree: ${article.duree} minutes` : ''
          ].filter(Boolean).join('\n');
        }
        break;

      case 'livre':
        article = await Livre.findByPk(articleId);
        if (article) {
          metadonnees = [
            article.isbn ? `- ISBN: ${article.isbn}` : '',
            article.nb_pages ? `- Pages: ${article.nb_pages}` : ''
          ].filter(Boolean).join('\n');
        }
        break;

      case 'film':
        article = await Film.findByPk(articleId);
        if (article) {
          metadonnees = [
            article.duree ? `- Duree: ${article.duree} minutes` : '',
            article.pays ? `- Pays: ${article.pays}` : ''
          ].filter(Boolean).join('\n');
        }
        break;

      case 'disque':
        article = await Disque.findByPk(articleId);
        if (article) {
          metadonnees = [
            article.nb_pistes ? `- Pistes: ${article.nb_pistes}` : ''
          ].filter(Boolean).join('\n');
        }
        break;
    }

    if (!article) {
      return null;
    }

    return {
      type: typeArticle,
      titre: article.nom || article.titre,
      description: article.description || article.synopsis || article.resume || '',
      annee: article.annee || article.date_sortie?.getFullYear() || '',
      metadonnees
    };
  }

  /**
   * Enrichit un seul article via LLM
   */
  static async enrichirArticle(typeArticle, articleId, options = {}) {
    const articleDetails = await this.getArticleDetails(typeArticle, articleId);

    if (!articleDetails) {
      throw new Error(`Article ${typeArticle}:${articleId} non trouve`);
    }

    const prompt = this.getPromptEnrichissement(articleDetails);

    // Appel LLM
    const llmService = new LLMService();
    const response = await llmService.chat([
      { role: 'user', content: prompt }
    ], {
      configId: options.configId,
      maxTokens: 1000,
      temperature: 0.3
    });

    // Parser la reponse JSON
    let thematiques;
    try {
      // Extraire le JSON de la reponse
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Pas de JSON trouve dans la reponse');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      thematiques = parsed.thematiques || [];
    } catch (e) {
      throw new Error(`Erreur parsing reponse LLM: ${e.message}`);
    }

    // Valider et nettoyer les thematiques
    const typesValides = ['theme', 'mecanisme', 'ambiance', 'public', 'complexite', 'duree', 'autre'];
    thematiques = thematiques
      .filter(t => t.nom && t.type && typesValides.includes(t.type))
      .map(t => ({
        nom: String(t.nom).trim(),
        type: t.type,
        force: Math.max(0, Math.min(1, parseFloat(t.force) || 0.5))
      }))
      .slice(0, 10); // Max 10

    return {
      provider: response.provider,
      model: response.model,
      prompt,
      response: response.content,
      thematiques,
      tokensInput: response.usage?.input_tokens || 0,
      tokensOutput: response.usage?.output_tokens || 0,
      cout: this.estimerCout(response.provider, response.model, response.usage)
    };
  }

  /**
   * Estime le cout d'un appel LLM
   */
  static estimerCout(provider, model, usage) {
    // Prix approximatifs en USD par 1K tokens
    const tarifs = {
      anthropic: {
        'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
        'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
        'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 }
      },
      openai: {
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 }
      },
      mistral: {
        'mistral-small-latest': { input: 0.001, output: 0.003 },
        'mistral-medium-latest': { input: 0.0027, output: 0.0081 },
        'mistral-large-latest': { input: 0.004, output: 0.012 }
      },
      ollama: {
        default: { input: 0, output: 0 } // Gratuit local
      }
    };

    const providerTarifs = tarifs[provider] || {};
    const modelTarif = providerTarifs[model] || providerTarifs.default || { input: 0.001, output: 0.003 };

    const inputTokens = usage?.input_tokens || 0;
    const outputTokens = usage?.output_tokens || 0;

    return (inputTokens / 1000 * modelTarif.input) + (outputTokens / 1000 * modelTarif.output);
  }

  /**
   * Lance un batch d'enrichissement
   */
  static async lancerBatch(options = {}) {
    const batchId = EnrichissementQueue.generateBatchId();

    // Recuperer les articles a traiter
    const articles = await this.getArticlesAEnrichir(options);

    if (articles.length === 0) {
      return { batchId, count: 0, message: 'Aucun article a traiter' };
    }

    // Ajouter a la queue
    await EnrichissementQueue.ajouterArticles(articles, {
      batchId,
      priorite: options.priorite || 0
    });

    return {
      batchId,
      count: articles.length,
      articles
    };
  }

  /**
   * Recupere la liste des articles a enrichir selon les filtres
   */
  static async getArticlesAEnrichir(options = {}) {
    const articles = [];
    const types = options.types || ['jeu', 'livre', 'film', 'disque'];
    const limit = options.limit || 100;

    for (const type of types) {
      let tableName, model;

      switch (type) {
        case 'jeu':
          tableName = 'jeux';
          model = Jeu;
          break;
        case 'livre':
          tableName = 'livres';
          model = Livre;
          break;
        case 'film':
          tableName = 'films';
          model = Film;
          break;
        case 'disque':
          tableName = 'disques';
          model = Disque;
          break;
        default:
          continue;
      }

      let where = {};

      // Filtrer par enrichissement
      if (options.nonEnrichis) {
        where.thematiques_updated_at = null;
      } else if (options.enrichisAvant) {
        where.thematiques_updated_at = {
          [Op.lt]: options.enrichisAvant
        };
      }

      // Autres filtres
      if (options.ids) {
        where.id = { [Op.in]: options.ids };
      }

      try {
        const items = await model.findAll({
          where,
          attributes: ['id'],
          limit: Math.ceil(limit / types.length),
          order: [['id', 'ASC']]
        });

        articles.push(...items.map(item => ({
          type_article: type,
          article_id: item.id
        })));
      } catch (e) {
        console.warn(`Erreur lecture ${tableName}:`, e.message);
      }
    }

    return articles.slice(0, limit);
  }

  /**
   * Traite le prochain item de la queue
   */
  static async traiterProchain(options = {}) {
    const item = await EnrichissementQueue.getProchain(options.batchId);

    if (!item) {
      return null;
    }

    try {
      const resultat = await this.enrichirArticle(
        item.type_article,
        item.article_id,
        { configId: options.configId }
      );

      await item.marquerComplete(resultat);

      // Si validation automatique
      if (options.autoValidate) {
        await item.valider(options.userId);
      }

      return item;
    } catch (error) {
      await item.marquerEchec(error.message);
      return item;
    }
  }

  /**
   * Traite tout un batch
   * Retourne un generateur pour le streaming
   */
  static async* traiterBatch(batchId, options = {}) {
    let traite = 0;
    let item;

    // Marquer le batch comme actif
    this.activeBatches.set(batchId, { status: 'running', startedAt: new Date() });

    try {
      while ((item = await this.traiterProchain({ batchId, ...options }))) {
        // Verifier si le batch a ete annule
        const batchStatus = this.activeBatches.get(batchId);
        if (batchStatus?.status === 'cancelled') {
          // Annuler les items restants
          await this.annulerItemsRestants(batchId);
          yield {
            type: 'cancelled',
            message: 'Batch annule par l\'utilisateur',
            traite
          };
          break;
        }

        traite++;

        // Recuperer les details de l'article pour affichage
        const articleDetails = await this.getArticleDetails(item.type_article, item.article_id);

        yield {
          type: 'progress',
          item: {
            id: item.id,
            type_article: item.type_article,
            article_id: item.article_id,
            titre: articleDetails?.titre || `Article #${item.article_id}`,
            statut: item.statut,
            thematiques: item.thematiques_proposees,
            cout: item.cout_estime,
            erreur: item.error_message
          },
          traite
        };
      }

      // Stats finales (si pas annule)
      const batchStatus = this.activeBatches.get(batchId);
      if (batchStatus?.status !== 'cancelled') {
        const stats = await EnrichissementQueue.getStatsBatch(batchId);
        yield {
          type: 'complete',
          stats
        };
      }
    } finally {
      // Nettoyer le batch actif
      this.activeBatches.delete(batchId);
    }
  }

  /**
   * Annule un batch en cours
   */
  static async annulerBatch(batchId) {
    const batchStatus = this.activeBatches.get(batchId);

    if (!batchStatus) {
      // Le batch n'est pas actif, verifier s'il existe
      const items = await EnrichissementQueue.findAll({
        where: { batch_id: batchId, statut: 'pending' },
        limit: 1
      });

      if (items.length > 0) {
        // Annuler directement les items pending
        await this.annulerItemsRestants(batchId);
        return { success: true, message: 'Batch annule (items pending marques comme rejected)' };
      }

      return { success: false, message: 'Batch non trouve ou deja termine' };
    }

    // Marquer pour annulation (sera detecte par le generateur)
    this.activeBatches.set(batchId, { ...batchStatus, status: 'cancelled' });
    return { success: true, message: 'Annulation en cours...' };
  }

  /**
   * Annule les items restants d'un batch
   */
  static async annulerItemsRestants(batchId) {
    await EnrichissementQueue.update(
      { statut: 'rejected', error_message: 'Batch annule' },
      { where: { batch_id: batchId, statut: 'pending' } }
    );
  }

  /**
   * Retourne le statut des batches actifs
   */
  static getActiveBatches() {
    const batches = [];
    for (const [batchId, status] of this.activeBatches.entries()) {
      batches.push({ batchId, ...status });
    }
    return batches;
  }

  /**
   * Dry run - estime le cout sans traiter
   */
  static async dryRun(options = {}) {
    // Recuperer les articles
    const articles = await this.getArticlesAEnrichir(options);

    if (articles.length === 0) {
      return {
        articles: 0,
        coutEstime: 0,
        tokensEstimes: 0,
        message: 'Aucun article a traiter'
      };
    }

    // Faire UN SEUL appel pour estimer
    let coutUnitaire = 0;
    let tokensUnitaires = 0;
    let sampleResult = null;

    if (articles.length > 0) {
      try {
        const sample = articles[0];
        sampleResult = await this.enrichirArticle(
          sample.type_article,
          sample.article_id,
          { configId: options.configId }
        );

        coutUnitaire = sampleResult.cout;
        tokensUnitaires = sampleResult.tokensInput + sampleResult.tokensOutput;
      } catch (e) {
        return {
          articles: articles.length,
          erreur: e.message,
          message: 'Erreur lors du test'
        };
      }
    }

    // Extrapoler
    const coutEstime = coutUnitaire * articles.length;
    const tokensEstimes = tokensUnitaires * articles.length;

    return {
      articles: articles.length,
      coutUnitaire,
      coutEstime,
      tokensUnitaires,
      tokensEstimes,
      sample: sampleResult ? {
        type: articles[0].type_article,
        id: articles[0].article_id,
        thematiques: sampleResult.thematiques
      } : null,
      provider: sampleResult?.provider,
      model: sampleResult?.model
    };
  }

  /**
   * Valide un item (applique les thematiques)
   */
  static async validerItem(itemId, userId) {
    const item = await EnrichissementQueue.findByPk(itemId);
    if (!item) {
      throw new Error('Item non trouve');
    }

    return await item.valider(userId);
  }

  /**
   * Rejette un item
   */
  static async rejeterItem(itemId, userId) {
    const item = await EnrichissementQueue.findByPk(itemId);
    if (!item) {
      throw new Error('Item non trouve');
    }

    return await item.rejeter(userId);
  }

  /**
   * Valide tous les items d'un batch
   */
  static async validerBatch(batchId, userId) {
    const items = await EnrichissementQueue.findAll({
      where: { batch_id: batchId, statut: 'completed' }
    });

    let valides = 0;
    for (const item of items) {
      await item.valider(userId);
      valides++;
    }

    return { valides };
  }

  /**
   * Modifie les thematiques proposees avant validation
   */
  static async modifierProposition(itemId, thematiques) {
    const item = await EnrichissementQueue.findByPk(itemId);
    if (!item) {
      throw new Error('Item non trouve');
    }

    if (item.statut !== 'completed') {
      throw new Error('Seuls les items completed peuvent etre modifies');
    }

    item.thematiques_proposees = thematiques;
    await item.save();

    return item;
  }

  /**
   * Recupere les items en attente de validation avec infos article
   */
  static async getEnAttenteValidation(options = {}) {
    const where = { statut: 'completed' };

    // Filtrage par type d'article
    if (options.typeArticle) {
      where.type_article = options.typeArticle;
    }

    const items = await EnrichissementQueue.findAll({
      where,
      order: [['processed_at', 'DESC']],
      limit: options.limit || 50,
      offset: options.offset || 0
    });

    // Enrichir avec les details de l'article
    const enrichedItems = [];
    for (const item of items) {
      const articleDetails = await this.getArticleDetails(item.type_article, item.article_id);
      enrichedItems.push({
        id: item.id,
        type_article: item.type_article,
        article_id: item.article_id,
        titre: articleDetails?.titre || `Article #${item.article_id}`,
        description: articleDetails?.description?.substring(0, 200) || '',
        thematiques_proposees: item.thematiques_proposees,
        processed_at: item.processed_at,
        llm_provider: item.llm_provider,
        llm_model: item.llm_model,
        cout_estime: item.cout_estime
      });
    }

    return enrichedItems;
  }

  /**
   * Recupere un item avec details pour edition
   */
  static async getItemValidation(itemId) {
    const item = await EnrichissementQueue.findByPk(itemId);
    if (!item) {
      throw new Error('Item non trouve');
    }

    const articleDetails = await this.getArticleDetails(item.type_article, item.article_id);

    return {
      id: item.id,
      type_article: item.type_article,
      article_id: item.article_id,
      statut: item.statut,
      titre: articleDetails?.titre || `Article #${item.article_id}`,
      description: articleDetails?.description || '',
      annee: articleDetails?.annee || '',
      metadonnees: articleDetails?.metadonnees || '',
      thematiques_proposees: item.thematiques_proposees,
      processed_at: item.processed_at,
      llm_provider: item.llm_provider,
      llm_model: item.llm_model,
      response_raw: item.response_raw,
      cout_estime: item.cout_estime
    };
  }

  /**
   * Statistiques d'un batch
   */
  static async getStatsBatch(batchId) {
    return await EnrichissementQueue.getStatsBatch(batchId);
  }

  /**
   * Liste des batches recents
   */
  static async getBatchsRecents(limit = 10) {
    const batches = await sequelize.query(`
      SELECT
        batch_id,
        MIN(created_at) as debut,
        MAX(processed_at) as fin,
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN statut = 'validated' THEN 1 ELSE 0 END) as validated,
        SUM(CASE WHEN statut = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(cout_estime) as cout_total
      FROM enrichissement_queue
      WHERE batch_id IS NOT NULL
      GROUP BY batch_id
      ORDER BY debut DESC
      LIMIT ?
    `, {
      replacements: [limit],
      type: sequelize.QueryTypes.SELECT
    });

    return batches;
  }
}

module.exports = EnrichissementService;
