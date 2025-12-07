/**
 * Modele ArticleThematiqueHistorique - Historique des modifications de thematiques
 */
const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const ArticleThematiqueHistorique = sequelize.define('ArticleThematiqueHistorique', {
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
    action: {
      type: DataTypes.ENUM('add', 'update', 'delete', 'batch_replace'),
      allowNull: false
    },
    thematique_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    thematique_nom: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    force_avant: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true
    },
    force_apres: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true
    },
    source: {
      type: DataTypes.ENUM('ia', 'manuel', 'import', 'validation'),
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    user_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    batch_id: {
      type: DataTypes.STRING(36),
      allowNull: true
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'article_thematiques_historique',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  /**
   * Recupere l'historique d'un article
   */
  ArticleThematiqueHistorique.getHistoriqueArticle = async function(typeArticle, articleId, options = {}) {
    return await this.findAll({
      where: {
        type_article: typeArticle,
        article_id: articleId
      },
      order: [['created_at', 'DESC']],
      limit: options.limit || 100,
      offset: options.offset || 0
    });
  };

  /**
   * Recupere l'historique d'une thematique
   */
  ArticleThematiqueHistorique.getHistoriqueThematique = async function(thematiqueId, options = {}) {
    return await this.findAll({
      where: { thematique_id: thematiqueId },
      order: [['created_at', 'DESC']],
      limit: options.limit || 100,
      offset: options.offset || 0
    });
  };

  /**
   * Recupere l'historique d'un batch
   */
  ArticleThematiqueHistorique.getHistoriqueBatch = async function(batchId) {
    return await this.findAll({
      where: { batch_id: batchId },
      order: [['created_at', 'ASC']]
    });
  };

  /**
   * Statistiques globales
   */
  ArticleThematiqueHistorique.getStats = async function(options = {}) {
    const where = {};

    if (options.depuis) {
      where.created_at = { [Op.gte]: options.depuis };
    }

    const stats = await this.findAll({
      where,
      attributes: [
        'action',
        'source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['action', 'source']
    });

    return stats.map(s => ({
      action: s.action,
      source: s.source,
      count: parseInt(s.get('count'))
    }));
  };

  /**
   * Derniers changements
   */
  ArticleThematiqueHistorique.getDerniersChangements = async function(limit = 50) {
    return await this.findAll({
      order: [['created_at', 'DESC']],
      limit
    });
  };

  return ArticleThematiqueHistorique;
};
