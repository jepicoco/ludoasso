/**
 * Modele ThematiqueAlias - Alias pour deduplication automatique
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ThematiqueAlias = sequelize.define('ThematiqueAlias', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    thematique_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'thematiques',
        key: 'id'
      }
    },
    alias: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    alias_normalise: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    tableName: 'thematiques_alias',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // Pas de updated_at
    hooks: {
      beforeValidate: (instance) => {
        // Normaliser l'alias avant sauvegarde
        if (instance.alias && !instance.alias_normalise) {
          const Thematique = sequelize.models.Thematique;
          instance.alias_normalise = Thematique.normaliserNom(instance.alias);
        }
      }
    }
  });

  /**
   * Trouve la thematique principale pour un alias donne
   */
  ThematiqueAlias.findThematiqueByAlias = async function(alias) {
    const Thematique = sequelize.models.Thematique;
    const aliasNormalise = Thematique.normaliserNom(alias);

    const aliasEntry = await this.findOne({
      where: { alias_normalise: aliasNormalise },
      include: [{ model: Thematique, as: 'thematique' }]
    });

    return aliasEntry ? aliasEntry.thematique : null;
  };

  return ThematiqueAlias;
};
