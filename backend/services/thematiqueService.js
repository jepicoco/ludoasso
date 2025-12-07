/**
 * Service Thematique - Gestion des thematiques, normalisation et deduplication
 */

const { Thematique, ThematiqueAlias, ArticleThematique, ArticleThematiqueHistorique, sequelize } = require('../models');
const { Op } = require('sequelize');

class ThematiqueService {

  /**
   * Normalise un nom pour comparaison
   */
  static normaliserNom(nom) {
    return Thematique.normaliserNom(nom);
  }

  /**
   * Liste toutes les thematiques avec filtres
   */
  static async lister(options = {}) {
    const where = {};

    if (options.type) {
      where.type = options.type;
    }

    if (options.actif !== undefined) {
      where.actif = options.actif;
    }

    if (options.recherche) {
      const recherche = this.normaliserNom(options.recherche);
      where[Op.or] = [
        { nom_normalise: { [Op.like]: `%${recherche}%` } },
        { description: { [Op.like]: `%${options.recherche}%` } }
      ];
    }

    const ordre = options.ordre || 'usage';
    let order;
    switch (ordre) {
      case 'nom':
        order = [['nom', 'ASC']];
        break;
      case 'recent':
        order = [['created_at', 'DESC']];
        break;
      case 'usage':
      default:
        order = [['usage_count', 'DESC'], ['nom', 'ASC']];
    }

    const { count, rows } = await Thematique.findAndCountAll({
      where,
      order,
      limit: options.limit || 50,
      offset: options.offset || 0,
      include: options.includeAlias ? [{
        model: ThematiqueAlias,
        as: 'alias'
      }] : []
    });

    return { total: count, thematiques: rows };
  }

  /**
   * Recupere une thematique par ID avec ses alias
   */
  static async getById(id) {
    return await Thematique.findByPk(id, {
      include: [{
        model: ThematiqueAlias,
        as: 'alias'
      }]
    });
  }

  /**
   * Cree une nouvelle thematique
   */
  static async creer(data) {
    const nomNormalise = this.normaliserNom(data.nom);

    // Verifier si existe deja
    const existante = await Thematique.findOne({
      where: { nom_normalise: nomNormalise, type: data.type }
    });

    if (existante) {
      throw new Error(`Une thematique "${data.nom}" de type "${data.type}" existe deja`);
    }

    // Verifier si un alias existe
    const aliasExistant = await ThematiqueAlias.findOne({
      where: { alias_normalise: nomNormalise }
    });

    if (aliasExistant) {
      throw new Error(`Ce nom est deja un alias de la thematique ID ${aliasExistant.thematique_id}`);
    }

    return await Thematique.create({
      nom: data.nom,
      nom_normalise: nomNormalise,
      type: data.type,
      description: data.description || null,
      actif: data.actif !== undefined ? data.actif : true
    });
  }

  /**
   * Met a jour une thematique
   */
  static async modifier(id, data) {
    const thematique = await Thematique.findByPk(id);
    if (!thematique) {
      throw new Error('Thematique non trouvee');
    }

    // Si le nom change, verifier unicite
    if (data.nom && data.nom !== thematique.nom) {
      const nomNormalise = this.normaliserNom(data.nom);
      const type = data.type || thematique.type;

      const existante = await Thematique.findOne({
        where: {
          nom_normalise: nomNormalise,
          type,
          id: { [Op.ne]: id }
        }
      });

      if (existante) {
        throw new Error(`Une thematique "${data.nom}" de type "${type}" existe deja`);
      }

      thematique.nom = data.nom;
      thematique.nom_normalise = nomNormalise;
    }

    if (data.type !== undefined) thematique.type = data.type;
    if (data.description !== undefined) thematique.description = data.description;
    if (data.actif !== undefined) thematique.actif = data.actif;

    await thematique.save();
    return thematique;
  }

  /**
   * Trouve ou cree une thematique par nom et type
   */
  static async findOrCreate(nom, type) {
    const nomNormalise = this.normaliserNom(nom);

    // Chercher thematique existante
    let thematique = await Thematique.findOne({
      where: { nom_normalise: nomNormalise, type }
    });

    if (thematique) {
      return thematique;
    }

    // Chercher par alias
    const alias = await ThematiqueAlias.findOne({
      where: { alias_normalise: nomNormalise },
      include: [{ model: Thematique, as: 'thematique' }]
    });

    if (alias && alias.thematique) {
      return alias.thematique;
    }

    // Creer nouvelle thematique
    return await Thematique.create({
      nom,
      nom_normalise: nomNormalise,
      type,
      actif: true
    });
  }

  /**
   * Supprime une thematique (soft delete = desactivation)
   */
  static async supprimer(id, hard = false) {
    const thematique = await Thematique.findByPk(id);
    if (!thematique) {
      throw new Error('Thematique non trouvee');
    }

    if (hard) {
      // Suppression definitive
      await thematique.destroy();
      return { deleted: true };
    } else {
      // Soft delete
      thematique.actif = false;
      await thematique.save();
      return { deactivated: true };
    }
  }

  /**
   * Ajoute un alias a une thematique
   */
  static async ajouterAlias(thematiqueId, alias) {
    const thematique = await Thematique.findByPk(thematiqueId);
    if (!thematique) {
      throw new Error('Thematique non trouvee');
    }

    const aliasNormalise = this.normaliserNom(alias);

    // Verifier si cet alias existe deja
    const existant = await ThematiqueAlias.findOne({
      where: { alias_normalise: aliasNormalise }
    });

    if (existant) {
      throw new Error('Cet alias existe deja');
    }

    // Verifier si c'est deja un nom de thematique
    const thematiqueExistante = await Thematique.findOne({
      where: { nom_normalise: aliasNormalise }
    });

    if (thematiqueExistante) {
      throw new Error(`Ce nom est deja utilise par la thematique "${thematiqueExistante.nom}"`);
    }

    return await ThematiqueAlias.create({
      thematique_id: thematiqueId,
      alias,
      alias_normalise: aliasNormalise
    });
  }

  /**
   * Supprime un alias
   */
  static async supprimerAlias(aliasId) {
    const alias = await ThematiqueAlias.findByPk(aliasId);
    if (!alias) {
      throw new Error('Alias non trouve');
    }

    await alias.destroy();
    return { deleted: true };
  }

  /**
   * Fusionne deux thematiques
   */
  static async fusionner(sourceId, cibleId, userId = null) {
    return await Thematique.fusionner(sourceId, cibleId, userId);
  }

  /**
   * Trouve ou cree une thematique par nom
   */
  static async findOrCreate(nom, type, options = {}) {
    return await Thematique.findOrCreateByNom(nom, type, options);
  }

  /**
   * Statistiques globales des thematiques
   */
  static async getStats() {
    // Stats par type
    const parType = await Thematique.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('usage_count')), 'total_usage']
      ],
      where: { actif: true },
      group: ['type']
    });

    // Total thematiques
    const totalActives = await Thematique.count({ where: { actif: true } });
    const totalInactives = await Thematique.count({ where: { actif: false } });

    // Total alias
    const totalAlias = await ThematiqueAlias.count();

    // Top 10 plus utilisees
    const topUtilisees = await Thematique.findAll({
      where: { actif: true },
      order: [['usage_count', 'DESC']],
      limit: 10
    });

    // Articles enrichis
    const articlesEnrichis = await sequelize.query(`
      SELECT type_article, COUNT(DISTINCT article_id) as count
      FROM article_thematiques
      GROUP BY type_article
    `, { type: sequelize.QueryTypes.SELECT });

    return {
      parType: parType.map(p => ({
        type: p.type,
        count: parseInt(p.get('count')),
        totalUsage: parseInt(p.get('total_usage') || 0)
      })),
      totalActives,
      totalInactives,
      totalAlias,
      topUtilisees,
      articlesEnrichis
    };
  }

  /**
   * Recherche de thematiques pour autocompletion
   */
  static async autocomplete(query, options = {}) {
    const recherche = this.normaliserNom(query);

    const where = {
      actif: true,
      nom_normalise: { [Op.like]: `%${recherche}%` }
    };

    if (options.type) {
      where.type = options.type;
    }

    return await Thematique.findAll({
      where,
      order: [['usage_count', 'DESC'], ['nom', 'ASC']],
      limit: options.limit || 10
    });
  }

  /**
   * Detecte les doublons potentiels (thematiques similaires)
   */
  static async detecterDoublons(seuil = 0.8) {
    const thematiques = await Thematique.findAll({
      where: { actif: true },
      order: [['nom_normalise', 'ASC']]
    });

    const doublons = [];

    for (let i = 0; i < thematiques.length; i++) {
      for (let j = i + 1; j < thematiques.length; j++) {
        const t1 = thematiques[i];
        const t2 = thematiques[j];

        // Meme type seulement
        if (t1.type !== t2.type) continue;

        // Calcul similarite (Levenshtein simplifie)
        const similarite = this.calculerSimilarite(t1.nom_normalise, t2.nom_normalise);

        if (similarite >= seuil) {
          doublons.push({
            thematique1: t1.toJSON(),
            thematique2: t2.toJSON(),
            similarite: Math.round(similarite * 100)
          });
        }
      }
    }

    return doublons;
  }

  /**
   * Calcule la similarite entre deux chaines (0-1)
   */
  static calculerSimilarite(s1, s2) {
    if (s1 === s2) return 1;
    if (!s1 || !s2) return 0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    // Distance de Levenshtein
    const matrix = [];
    for (let i = 0; i <= shorter.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= longer.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= shorter.length; i++) {
      for (let j = 1; j <= longer.length; j++) {
        const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[shorter.length][longer.length];
    return (longer.length - distance) / longer.length;
  }

  /**
   * Recupere les thematiques d'un article
   */
  static async getThematiquesArticle(typeArticle, articleId) {
    return await ArticleThematique.getThematiquesArticle(typeArticle, articleId, {
      actifOnly: true
    });
  }

  /**
   * Modifie la force d'un lien article-thematique
   */
  static async modifierForce(typeArticle, articleId, thematiqueId, nouvelleForce, userId = null) {
    const lien = await ArticleThematique.findOne({
      where: {
        type_article: typeArticle,
        article_id: articleId,
        thematique_id: thematiqueId
      }
    });

    if (!lien) {
      throw new Error('Lien non trouve');
    }

    const forceAvant = parseFloat(lien.force);

    lien.force = nouvelleForce;
    lien.source = 'manuel';
    await lien.save();

    // Historique
    await ArticleThematiqueHistorique.create({
      type_article: typeArticle,
      article_id: articleId,
      action: 'update',
      thematique_id: thematiqueId,
      force_avant: forceAvant,
      force_apres: nouvelleForce,
      source: 'manuel',
      user_id: userId
    });

    return lien;
  }

  /**
   * Supprime un lien article-thematique
   */
  static async supprimerLien(typeArticle, articleId, thematiqueId, userId = null) {
    const lien = await ArticleThematique.findOne({
      where: {
        type_article: typeArticle,
        article_id: articleId,
        thematique_id: thematiqueId
      },
      include: [{ model: Thematique, as: 'thematique' }]
    });

    if (!lien) {
      throw new Error('Lien non trouve');
    }

    // Historique
    await ArticleThematiqueHistorique.create({
      type_article: typeArticle,
      article_id: articleId,
      action: 'delete',
      thematique_id: thematiqueId,
      thematique_nom: lien.thematique?.nom,
      force_avant: parseFloat(lien.force),
      source: 'manuel',
      user_id: userId
    });

    // Decrementer usage
    if (lien.thematique) {
      lien.thematique.usage_count = Math.max(0, lien.thematique.usage_count - 1);
      await lien.thematique.save();
    }

    await lien.destroy();
    return { deleted: true };
  }

  /**
   * Ajoute manuellement un lien article-thematique
   */
  static async ajouterLien(typeArticle, articleId, thematiqueId, force = 0.5, userId = null, source = 'manuel') {
    const thematique = await Thematique.findByPk(thematiqueId);
    if (!thematique) {
      throw new Error('Thematique non trouvee');
    }

    // Verifier si existe deja
    const existant = await ArticleThematique.findOne({
      where: {
        type_article: typeArticle,
        article_id: articleId,
        thematique_id: thematiqueId
      }
    });

    if (existant) {
      throw new Error('Ce lien existe deja');
    }

    const lien = await ArticleThematique.create({
      type_article: typeArticle,
      article_id: articleId,
      thematique_id: thematiqueId,
      force,
      source
    });

    // Incrementer usage
    thematique.usage_count += 1;
    await thematique.save();

    // Historique
    await ArticleThematiqueHistorique.create({
      type_article: typeArticle,
      article_id: articleId,
      action: 'add',
      thematique_id: thematiqueId,
      thematique_nom: thematique.nom,
      force_apres: force,
      source,
      user_id: userId
    });

    return lien;
  }
}


module.exports = ThematiqueService;
