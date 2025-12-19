/**
 * GroupeFrontend Model
 * Groupe de structures pour l'affichage frontend public
 * Permet de combiner ou separer les structures sur le site public
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GroupeFrontend = sequelize.define('GroupeFrontend', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Code unique ex: foyer-culturel-sciez'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom affiche ex: Foyer Culturel de Sciez'
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      comment: 'Slug pour URL ex: /foyer-culturel-sciez'
    },
    domaine_personnalise: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Domaine personnalise ex: mediatheque.sciez.fr'
    },
    theme_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'default',
      comment: 'Theme a utiliser pour ce groupe'
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL du logo du groupe'
    },
    nom_affiche: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Nom affiche sur le portail (override nom_site)'
    },
    favicon_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL du favicon'
    },
    meta_description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Meta description pour SEO'
    },
    email_contact: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Email de contact du portail'
    },
    telephone_contact: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Telephone de contact'
    },
    mode_maintenance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Mode maintenance specifique au portail'
    },
    message_maintenance: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Message de maintenance specifique'
    },
    parametres: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Overrides des parametres ParametresFront pour ce portail'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'groupes_frontend',
    timestamps: false,
    hooks: {
      beforeUpdate: (groupe) => {
        groupe.updated_at = new Date();
      },
      beforeCreate: (groupe) => {
        // Generer slug a partir du code si non fourni
        if (!groupe.slug && groupe.code) {
          groupe.slug = groupe.code
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        }
      }
    }
  });

  return GroupeFrontend;
};
