const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SectionAnalytique = sequelize.define('SectionAnalytique', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Code analytique (ex: LUDO, BIBLIO, ATELIER, SITE1)'
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle complet (ex: Ludotheque, Bibliotheque, Ateliers creatifs)'
    },
    axe: {
      type: DataTypes.ENUM('activite', 'site', 'projet', 'financeur', 'autre'),
      allowNull: false,
      defaultValue: 'activite',
      comment: 'Axe analytique pour regroupement'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description detaillee de la section'
    },
    compte_analytique: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Code comptable analytique pour export'
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sections_analytiques',
        key: 'id'
      },
      comment: 'Section parente pour hierarchie (optionnel)'
    },
    couleur: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#6c757d',
      comment: 'Couleur pour affichage (hex)'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'sections_analytiques',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Methodes statiques
  SectionAnalytique.getActives = async function(axe = null) {
    const where = { actif: true };
    if (axe) where.axe = axe;

    return await this.findAll({
      where,
      order: [['axe', 'ASC'], ['ordre_affichage', 'ASC']]
    });
  };

  SectionAnalytique.getByAxe = async function(axe) {
    return await this.findAll({
      where: { axe, actif: true },
      order: [['ordre_affichage', 'ASC']]
    });
  };

  SectionAnalytique.getArbre = async function() {
    const sections = await this.findAll({
      where: { actif: true },
      order: [['axe', 'ASC'], ['ordre_affichage', 'ASC']]
    });

    // Construire l'arbre hierarchique
    const map = {};
    const roots = [];

    sections.forEach(s => {
      map[s.id] = { ...s.toJSON(), enfants: [] };
    });

    sections.forEach(s => {
      if (s.parent_id && map[s.parent_id]) {
        map[s.parent_id].enfants.push(map[s.id]);
      } else {
        roots.push(map[s.id]);
      }
    });

    return roots;
  };

  return SectionAnalytique;
};
