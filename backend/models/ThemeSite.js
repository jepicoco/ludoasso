const { DataTypes } = require('sequelize');

/**
 * Modele pour les themes du site public
 * Permet de definir des themes predefinis et personnalises
 */
module.exports = (sequelize) => {
  const ThemeSite = sequelize.define('ThemeSite', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Identite
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Code unique du theme'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom du theme'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description du theme'
    },

    // Type de theme
    type: {
      type: DataTypes.ENUM('system', 'custom'),
      defaultValue: 'custom',
      comment: 'system = non supprimable, custom = cree par admin'
    },
    mode: {
      type: DataTypes.ENUM('light', 'dark'),
      defaultValue: 'light',
      comment: 'Mode clair ou sombre'
    },

    // Couleurs principales
    couleur_primaire: {
      type: DataTypes.STRING(20),
      defaultValue: '#667eea',
      comment: 'Couleur principale'
    },
    couleur_primaire_light: {
      type: DataTypes.STRING(20),
      defaultValue: '#f0f4ff',
      comment: 'Variante claire de la couleur primaire'
    },
    couleur_primaire_dark: {
      type: DataTypes.STRING(20),
      defaultValue: '#5568d3',
      comment: 'Variante foncee de la couleur primaire'
    },
    couleur_secondaire: {
      type: DataTypes.STRING(20),
      defaultValue: '#764ba2',
      comment: 'Couleur secondaire'
    },
    couleur_accent: {
      type: DataTypes.STRING(20),
      defaultValue: '#20c997',
      comment: 'Couleur d\'accent'
    },

    // Couleurs de fond
    couleur_fond_principal: {
      type: DataTypes.STRING(20),
      defaultValue: '#ffffff',
      comment: 'Couleur de fond principale'
    },
    couleur_fond_secondaire: {
      type: DataTypes.STRING(20),
      defaultValue: '#f8f9fa',
      comment: 'Couleur de fond secondaire'
    },
    couleur_fond_navbar: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Couleur de fond navbar (null = gradient primaire/secondaire)'
    },
    couleur_fond_footer: {
      type: DataTypes.STRING(20),
      defaultValue: '#343a40',
      comment: 'Couleur de fond du footer'
    },

    // Couleurs de texte
    couleur_texte_principal: {
      type: DataTypes.STRING(20),
      defaultValue: '#333333',
      comment: 'Couleur du texte principal'
    },
    couleur_texte_secondaire: {
      type: DataTypes.STRING(20),
      defaultValue: '#6c757d',
      comment: 'Couleur du texte secondaire'
    },
    couleur_texte_navbar: {
      type: DataTypes.STRING(20),
      defaultValue: '#ffffff',
      comment: 'Couleur du texte navbar'
    },
    couleur_texte_footer: {
      type: DataTypes.STRING(20),
      defaultValue: '#ffffff',
      comment: 'Couleur du texte footer'
    },

    // Couleurs semantiques
    couleur_success: {
      type: DataTypes.STRING(20),
      defaultValue: '#10b981',
      comment: 'Couleur succes'
    },
    couleur_warning: {
      type: DataTypes.STRING(20),
      defaultValue: '#f59e0b',
      comment: 'Couleur avertissement'
    },
    couleur_danger: {
      type: DataTypes.STRING(20),
      defaultValue: '#ef4444',
      comment: 'Couleur danger'
    },
    couleur_info: {
      type: DataTypes.STRING(20),
      defaultValue: '#3b82f6',
      comment: 'Couleur info'
    },

    // Couleurs des badges collection
    couleur_badge_jeu: {
      type: DataTypes.STRING(20),
      defaultValue: '#0d6efd',
      comment: 'Couleur badge jeu'
    },
    couleur_badge_livre: {
      type: DataTypes.STRING(20),
      defaultValue: '#6610f2',
      comment: 'Couleur badge livre'
    },
    couleur_badge_film: {
      type: DataTypes.STRING(20),
      defaultValue: '#d63384',
      comment: 'Couleur badge film'
    },
    couleur_badge_disque: {
      type: DataTypes.STRING(20),
      defaultValue: '#fd7e14',
      comment: 'Couleur badge disque'
    },

    // Typographie
    police_principale: {
      type: DataTypes.STRING(100),
      defaultValue: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      comment: 'Police principale'
    },
    police_titres: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Police pour les titres (null = meme que principale)'
    },
    taille_police_base: {
      type: DataTypes.STRING(10),
      defaultValue: '16px',
      comment: 'Taille de police de base'
    },

    // Style
    border_radius: {
      type: DataTypes.STRING(10),
      defaultValue: '8px',
      comment: 'Rayon des bordures'
    },
    shadow_style: {
      type: DataTypes.ENUM('none', 'subtle', 'medium', 'strong'),
      defaultValue: 'subtle',
      comment: 'Style des ombres'
    },
    navbar_style: {
      type: DataTypes.ENUM('gradient', 'solid', 'transparent'),
      defaultValue: 'gradient',
      comment: 'Style de la navbar'
    },

    // CSS personnalise
    css_personnalise: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'CSS additionnel personnalise'
    },

    // Preview
    preview_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'URL image de preview'
    },

    // Statut
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Theme actif'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Ordre d\'affichage'
    }
  }, {
    tableName: 'themes_site',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['code'], unique: true },
      { fields: ['actif'] },
      { fields: ['type'] },
      { fields: ['ordre_affichage'] }
    ]
  });

  // ==================== METHODES STATIQUES ====================

  /**
   * Obtient tous les themes actifs
   */
  ThemeSite.getActifs = async function() {
    return ThemeSite.findAll({
      where: { actif: true },
      order: [['ordre_affichage', 'ASC'], ['nom', 'ASC']]
    });
  };

  /**
   * Obtient un theme par son code
   */
  ThemeSite.getByCode = async function(code) {
    return ThemeSite.findOne({
      where: { code, actif: true }
    });
  };

  /**
   * Genere le CSS d'un theme
   */
  ThemeSite.prototype.genererCSS = function() {
    const shadowValues = {
      none: 'none',
      subtle: '0 2px 4px rgba(0,0,0,0.05)',
      medium: '0 4px 8px rgba(0,0,0,0.1)',
      strong: '0 8px 16px rgba(0,0,0,0.15)'
    };

    let css = `:root {
  /* Couleurs principales */
  --primary-color: ${this.couleur_primaire};
  --primary-color-light: ${this.couleur_primaire_light};
  --primary-color-dark: ${this.couleur_primaire_dark};
  --secondary-color: ${this.couleur_secondaire};
  --accent-color: ${this.couleur_accent};

  /* Couleurs de fond */
  --bg-primary: ${this.couleur_fond_principal};
  --bg-secondary: ${this.couleur_fond_secondaire};
  --bg-navbar: ${this.couleur_fond_navbar || this.couleur_primaire};
  --bg-footer: ${this.couleur_fond_footer};

  /* Couleurs de texte */
  --text-primary: ${this.couleur_texte_principal};
  --text-secondary: ${this.couleur_texte_secondaire};
  --text-navbar: ${this.couleur_texte_navbar};
  --text-footer: ${this.couleur_texte_footer};

  /* Couleurs semantiques */
  --color-success: ${this.couleur_success};
  --color-warning: ${this.couleur_warning};
  --color-danger: ${this.couleur_danger};
  --color-info: ${this.couleur_info};

  /* Couleurs badges */
  --badge-jeu: ${this.couleur_badge_jeu};
  --badge-livre: ${this.couleur_badge_livre};
  --badge-film: ${this.couleur_badge_film};
  --badge-disque: ${this.couleur_badge_disque};

  /* Typographie */
  --font-family-base: ${this.police_principale};
  --font-family-headings: ${this.police_titres || this.police_principale};
  --font-size-base: ${this.taille_police_base};

  /* Style */
  --border-radius: ${this.border_radius};
  --shadow-default: ${shadowValues[this.shadow_style] || shadowValues.subtle};
}`;

    // Ajouter CSS navbar
    if (this.navbar_style === 'gradient') {
      css += `

.navbar-custom {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%) !important;
}`;
    } else if (this.navbar_style === 'solid') {
      css += `

.navbar-custom {
  background: var(--bg-navbar) !important;
}`;
    } else if (this.navbar_style === 'transparent') {
      css += `

.navbar-custom {
  background: transparent !important;
  backdrop-filter: blur(10px);
}`;
    }

    // Mode sombre
    if (this.mode === 'dark') {
      css += `

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.card, .modal-content {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}`;
    }

    // CSS personnalise
    if (this.css_personnalise) {
      css += `

/* CSS Personnalise */
${this.css_personnalise}`;
    }

    return css;
  };

  /**
   * Exporte le theme en JSON
   */
  ThemeSite.prototype.toExportJSON = function() {
    const data = this.toJSON();
    delete data.id;
    delete data.type;
    delete data.actif;
    delete data.created_at;
    delete data.updated_at;
    return data;
  };

  return ThemeSite;
};
