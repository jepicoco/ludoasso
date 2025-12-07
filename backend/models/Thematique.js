/**
 * Modele Thematique - Themes/mecanismes/ambiances pour la recherche IA
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Thematique = sequelize.define('Thematique', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    nom_normalise: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Lowercase, sans accents, pour deduplication'
    },
    type: {
      type: DataTypes.ENUM('theme', 'mecanisme', 'ambiance', 'public', 'complexite', 'duree', 'autre'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'thematiques',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeValidate: (instance) => {
        // Normaliser le nom avant sauvegarde
        if (instance.nom && !instance.nom_normalise) {
          instance.nom_normalise = Thematique.normaliserNom(instance.nom);
        }
      }
    }
  });

  /**
   * Normalise un nom pour comparaison/deduplication
   * - Lowercase
   * - Supprime accents
   * - Supprime espaces multiples
   * - Trim
   */
  Thematique.normaliserNom = function(nom) {
    if (!nom) return '';
    return nom
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime accents
      .replace(/[^a-z0-9\s-]/g, '') // Garde lettres, chiffres, espaces, tirets
      .replace(/\s+/g, ' ') // Espaces multiples -> simple
      .trim();
  };

  /**
   * Trouve ou cree une thematique par nom et type
   * Gere les alias automatiquement
   */
  Thematique.findOrCreateByNom = async function(nom, type, options = {}) {
    const nomNormalise = this.normaliserNom(nom);

    // 1. Chercher thematique existante
    let thematique = await this.findOne({
      where: { nom_normalise: nomNormalise, type }
    });

    if (thematique) {
      return { thematique, created: false };
    }

    // 2. Chercher dans les alias
    const ThematiqueAlias = sequelize.models.ThematiqueAlias;
    if (ThematiqueAlias) {
      const alias = await ThematiqueAlias.findOne({
        where: { alias_normalise: nomNormalise },
        include: [{ model: this, as: 'thematique' }]
      });

      if (alias && alias.thematique && alias.thematique.type === type) {
        return { thematique: alias.thematique, created: false, viaAlias: true };
      }
    }

    // 3. Creer nouvelle thematique
    thematique = await this.create({
      nom,
      nom_normalise: nomNormalise,
      type,
      description: options.description || null,
      actif: options.actif !== undefined ? options.actif : true
    });

    return { thematique, created: true };
  };

  /**
   * Fusionne une thematique source dans une thematique cible
   * - Transfere tous les liens article_thematiques
   * - Cree un alias de la source vers la cible
   * - Desactive la source
   */
  Thematique.fusionner = async function(sourceId, cibleId, userId = null) {
    const source = await this.findByPk(sourceId);
    const cible = await this.findByPk(cibleId);

    if (!source || !cible) {
      throw new Error('Thematique source ou cible introuvable');
    }

    if (source.type !== cible.type) {
      throw new Error('Les thematiques doivent etre du meme type');
    }

    const ArticleThematique = sequelize.models.ArticleThematique;
    const ThematiqueAlias = sequelize.models.ThematiqueAlias;
    const ArticleThematiqueHistorique = sequelize.models.ArticleThematiqueHistorique;

    // Transaction pour atomicite
    const t = await sequelize.transaction();

    try {
      // 1. Transferer les liens (ou mettre a jour si existe deja)
      const liens = await ArticleThematique.findAll({
        where: { thematique_id: sourceId },
        transaction: t
      });

      for (const lien of liens) {
        // Verifier si lien existe deja vers cible
        const lienExistant = await ArticleThematique.findOne({
          where: {
            type_article: lien.type_article,
            article_id: lien.article_id,
            thematique_id: cibleId
          },
          transaction: t
        });

        if (lienExistant) {
          // Garder la force max
          if (lien.force > lienExistant.force) {
            lienExistant.force = lien.force;
            await lienExistant.save({ transaction: t });
          }
          await lien.destroy({ transaction: t });
        } else {
          // Transferer le lien
          lien.thematique_id = cibleId;
          await lien.save({ transaction: t });
        }

        // Historique
        if (ArticleThematiqueHistorique) {
          await ArticleThematiqueHistorique.create({
            type_article: lien.type_article,
            article_id: lien.article_id,
            action: 'update',
            thematique_id: cibleId,
            thematique_nom: cible.nom,
            source: 'manuel',
            user_id: userId,
            details: { fusion_depuis: source.nom, fusion_depuis_id: sourceId }
          }, { transaction: t });
        }
      }

      // 2. Creer alias
      await ThematiqueAlias.create({
        thematique_id: cibleId,
        alias: source.nom,
        alias_normalise: source.nom_normalise
      }, { transaction: t });

      // 3. Mettre a jour compteur usage cible
      cible.usage_count += source.usage_count;
      await cible.save({ transaction: t });

      // 4. Desactiver source (on ne la supprime pas pour l'historique)
      source.actif = false;
      await source.save({ transaction: t });

      await t.commit();

      return { source, cible, liensTransferes: liens.length };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  };

  /**
   * Recherche thematiques avec filtres
   */
  Thematique.rechercher = async function(options = {}) {
    const where = {};

    if (options.type) {
      where.type = options.type;
    }

    if (options.actif !== undefined) {
      where.actif = options.actif;
    }

    if (options.recherche) {
      const recherche = this.normaliserNom(options.recherche);
      where.nom_normalise = {
        [sequelize.Sequelize.Op.like]: `%${recherche}%`
      };
    }

    return await this.findAll({
      where,
      order: options.order || [['usage_count', 'DESC'], ['nom', 'ASC']],
      limit: options.limit || 100,
      offset: options.offset || 0
    });
  };

  /**
   * Incremente le compteur d'usage
   */
  Thematique.prototype.incrementerUsage = async function() {
    this.usage_count += 1;
    await this.save();
    return this;
  };

  return Thematique;
};
