/**
 * Modele ArticleThematique - Liens entre articles et thematiques avec force
 */
const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const ArticleThematique = sequelize.define('ArticleThematique', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type_article: {
      type: DataTypes.ENUM('jeu', 'livre', 'film', 'disque'),
      allowNull: false
    },
    article_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    thematique_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'thematiques',
        key: 'id'
      }
    },
    force: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0.50,
      validate: {
        min: 0.00,
        max: 1.00
      }
    },
    source: {
      type: DataTypes.ENUM('ia', 'manuel', 'import'),
      allowNull: false,
      defaultValue: 'ia'
    }
  }, {
    tableName: 'article_thematiques',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  /**
   * Recupere toutes les thematiques d'un article
   */
  ArticleThematique.getThematiquesArticle = async function(typeArticle, articleId, options = {}) {
    const Thematique = sequelize.models.Thematique;

    const where = {
      type_article: typeArticle,
      article_id: articleId
    };

    if (options.forceMin) {
      where.force = { [Op.gte]: options.forceMin };
    }

    const liens = await this.findAll({
      where,
      include: [{
        model: Thematique,
        as: 'thematique',
        where: options.actifOnly ? { actif: true } : {}
      }],
      order: [['force', 'DESC']]
    });

    return liens.map(l => ({
      ...l.thematique.toJSON(),
      force: parseFloat(l.force),
      source: l.source
    }));
  };

  /**
   * Associe des thematiques a un article (remplace ou ajoute)
   */
  ArticleThematique.associerThematiques = async function(typeArticle, articleId, thematiques, options = {}) {
    const Thematique = sequelize.models.Thematique;
    const ArticleThematiqueHistorique = sequelize.models.ArticleThematiqueHistorique;

    const t = await sequelize.transaction();
    const resultats = [];

    try {
      // Si mode replace, supprimer les liens existants
      if (options.replace) {
        const existants = await this.findAll({
          where: { type_article: typeArticle, article_id: articleId },
          include: [{ model: Thematique, as: 'thematique' }],
          transaction: t
        });

        for (const lien of existants) {
          // Historique
          if (ArticleThematiqueHistorique) {
            await ArticleThematiqueHistorique.create({
              type_article: typeArticle,
              article_id: articleId,
              action: 'delete',
              thematique_id: lien.thematique_id,
              thematique_nom: lien.thematique?.nom,
              force_avant: lien.force,
              source: options.source || 'ia',
              user_id: options.userId,
              batch_id: options.batchId
            }, { transaction: t });
          }

          await lien.destroy({ transaction: t });
        }
      }

      // Ajouter/mettre a jour les nouvelles thematiques
      for (const th of thematiques) {
        // Trouver ou creer la thematique
        const { thematique, created } = await Thematique.findOrCreateByNom(
          th.nom,
          th.type,
          { transaction: t }
        );

        // Verifier si lien existe
        let lien = await this.findOne({
          where: {
            type_article: typeArticle,
            article_id: articleId,
            thematique_id: thematique.id
          },
          transaction: t
        });

        const forceAvant = lien ? parseFloat(lien.force) : null;
        const forceApres = th.force !== undefined ? th.force : 0.50;

        if (lien) {
          // Mettre a jour force si differente
          if (lien.force !== forceApres) {
            lien.force = forceApres;
            lien.source = options.source || 'ia';
            await lien.save({ transaction: t });

            if (ArticleThematiqueHistorique) {
              await ArticleThematiqueHistorique.create({
                type_article: typeArticle,
                article_id: articleId,
                action: 'update',
                thematique_id: thematique.id,
                thematique_nom: thematique.nom,
                force_avant: forceAvant,
                force_apres: forceApres,
                source: options.source || 'ia',
                user_id: options.userId,
                batch_id: options.batchId
              }, { transaction: t });
            }
          }
        } else {
          // Creer nouveau lien
          lien = await this.create({
            type_article: typeArticle,
            article_id: articleId,
            thematique_id: thematique.id,
            force: forceApres,
            source: options.source || 'ia'
          }, { transaction: t });

          // Incrementer usage
          thematique.usage_count += 1;
          await thematique.save({ transaction: t });

          if (ArticleThematiqueHistorique) {
            await ArticleThematiqueHistorique.create({
              type_article: typeArticle,
              article_id: articleId,
              action: 'add',
              thematique_id: thematique.id,
              thematique_nom: thematique.nom,
              force_apres: forceApres,
              source: options.source || 'ia',
              user_id: options.userId,
              batch_id: options.batchId
            }, { transaction: t });
          }
        }

        resultats.push({
          thematique: thematique.toJSON(),
          force: forceApres,
          created,
          updated: !!forceAvant && forceAvant !== forceApres
        });
      }

      // Mettre a jour thematiques_updated_at sur l'article
      const tableMap = {
        jeu: 'jeux',
        livre: 'livres',
        film: 'films',
        disque: 'disques'
      };

      const tableName = tableMap[typeArticle];
      if (tableName) {
        await sequelize.query(
          `UPDATE ${tableName} SET thematiques_updated_at = NOW() WHERE id = ?`,
          { replacements: [articleId], transaction: t }
        );
      }

      await t.commit();
      return resultats;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  };

  /**
   * Recherche articles par thematiques
   */
  ArticleThematique.rechercherArticles = async function(thematiqueIds, options = {}) {
    const where = {
      thematique_id: { [Op.in]: thematiqueIds }
    };

    if (options.typeArticle) {
      where.type_article = options.typeArticle;
    }

    if (options.forceMin) {
      where.force = { [Op.gte]: options.forceMin };
    }

    const liens = await this.findAll({
      where,
      attributes: ['type_article', 'article_id', 'thematique_id', 'force'],
      order: [['force', 'DESC']]
    });

    // Grouper par article avec score cumule
    const articlesMap = new Map();

    for (const lien of liens) {
      const key = `${lien.type_article}:${lien.article_id}`;
      if (!articlesMap.has(key)) {
        articlesMap.set(key, {
          type_article: lien.type_article,
          article_id: lien.article_id,
          thematiques: [],
          score: 0
        });
      }
      const article = articlesMap.get(key);
      article.thematiques.push({
        thematique_id: lien.thematique_id,
        force: parseFloat(lien.force)
      });
      article.score += parseFloat(lien.force);
    }

    // Trier par score
    const articles = Array.from(articlesMap.values());
    articles.sort((a, b) => b.score - a.score);

    return options.limit ? articles.slice(0, options.limit) : articles;
  };

  return ArticleThematique;
};
