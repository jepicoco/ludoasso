/**
 * Modele EnrichissementQueue - File d'attente pour traitement batch IA
 */
const { DataTypes, Op } = require('sequelize');
const { v4: uuidv4 } = require('crypto');

module.exports = (sequelize) => {
  const EnrichissementQueue = sequelize.define('EnrichissementQueue', {
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
    statut: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'validated', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    priorite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Plus haut = plus prioritaire'
    },
    batch_id: {
      type: DataTypes.STRING(36),
      allowNull: true
    },
    llm_provider: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    llm_model: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    prompt_used: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    response_raw: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    thematiques_proposees: {
      type: DataTypes.JSON,
      allowNull: true
    },
    tokens_input: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tokens_output: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cout_estime: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    validated_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    validated_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'enrichissement_queue',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  /**
   * Genere un UUID pour batch
   */
  EnrichissementQueue.generateBatchId = function() {
    return require('crypto').randomUUID();
  };

  /**
   * Ajoute des articles a la file d'attente
   */
  EnrichissementQueue.ajouterArticles = async function(articles, options = {}) {
    const batchId = options.batchId || this.generateBatchId();
    const priorite = options.priorite || 0;

    const items = articles.map(art => ({
      type_article: art.type_article,
      article_id: art.article_id,
      statut: 'pending',
      priorite,
      batch_id: batchId
    }));

    await this.bulkCreate(items, {
      ignoreDuplicates: true // Ignore si deja en queue
    });

    return { batchId, count: items.length };
  };

  /**
   * Recupere le prochain article a traiter
   */
  EnrichissementQueue.getProchain = async function(batchId = null) {
    const where = { statut: 'pending' };
    if (batchId) {
      where.batch_id = batchId;
    }

    const item = await this.findOne({
      where,
      order: [
        ['priorite', 'DESC'],
        ['created_at', 'ASC']
      ]
    });

    if (item) {
      item.statut = 'processing';
      await item.save();
    }

    return item;
  };

  /**
   * Marque un item comme complete
   */
  EnrichissementQueue.prototype.marquerComplete = async function(resultats) {
    this.statut = 'completed';
    this.processed_at = new Date();
    this.llm_provider = resultats.provider;
    this.llm_model = resultats.model;
    this.prompt_used = resultats.prompt;
    this.response_raw = resultats.response;
    this.thematiques_proposees = resultats.thematiques;
    this.tokens_input = resultats.tokensInput;
    this.tokens_output = resultats.tokensOutput;
    this.cout_estime = resultats.cout;
    await this.save();
    return this;
  };

  /**
   * Marque un item comme echoue
   */
  EnrichissementQueue.prototype.marquerEchec = async function(errorMessage) {
    this.statut = 'failed';
    this.processed_at = new Date();
    this.error_message = errorMessage;
    await this.save();
    return this;
  };

  /**
   * Valide un item (applique les thematiques)
   */
  EnrichissementQueue.prototype.valider = async function(userId) {
    if (this.statut !== 'completed') {
      throw new Error('Seuls les items completed peuvent etre valides');
    }

    const ArticleThematique = sequelize.models.ArticleThematique;

    // Appliquer les thematiques
    await ArticleThematique.associerThematiques(
      this.type_article,
      this.article_id,
      this.thematiques_proposees,
      {
        replace: true,
        source: 'ia',
        userId,
        batchId: this.batch_id
      }
    );

    this.statut = 'validated';
    this.validated_at = new Date();
    this.validated_by = userId;
    await this.save();

    return this;
  };

  /**
   * Rejette un item
   */
  EnrichissementQueue.prototype.rejeter = async function(userId) {
    this.statut = 'rejected';
    this.validated_at = new Date();
    this.validated_by = userId;
    await this.save();
    return this;
  };

  /**
   * Statistiques d'un batch
   */
  EnrichissementQueue.getStatsBatch = async function(batchId) {
    const stats = await this.findAll({
      where: { batch_id: batchId },
      attributes: [
        'statut',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('cout_estime')), 'cout_total'],
        [sequelize.fn('SUM', sequelize.col('tokens_input')), 'tokens_input_total'],
        [sequelize.fn('SUM', sequelize.col('tokens_output')), 'tokens_output_total']
      ],
      group: ['statut']
    });

    const result = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      validated: 0,
      rejected: 0,
      cout_total: 0,
      tokens_total: 0
    };

    for (const stat of stats) {
      const count = parseInt(stat.get('count'));
      result[stat.statut] = count;
      result.total += count;
      result.cout_total += parseFloat(stat.get('cout_total') || 0);
      result.tokens_total += parseInt(stat.get('tokens_input_total') || 0) + parseInt(stat.get('tokens_output_total') || 0);
    }

    return result;
  };

  /**
   * Items en attente de validation
   */
  EnrichissementQueue.getEnAttenteValidation = async function(options = {}) {
    return await this.findAll({
      where: { statut: 'completed' },
      order: [['processed_at', 'DESC']],
      limit: options.limit || 50,
      offset: options.offset || 0
    });
  };

  /**
   * Nettoie les vieux items (garder historique)
   */
  EnrichissementQueue.nettoyer = async function(joursRetention = 30) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - joursRetention);

    const deleted = await this.destroy({
      where: {
        statut: { [Op.in]: ['validated', 'rejected'] },
        validated_at: { [Op.lt]: dateLimit }
      }
    });

    return deleted;
  };

  return EnrichissementQueue;
};
