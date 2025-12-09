const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Jeu = sequelize.define('Jeu', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code_barre: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
      comment: 'Format: JEU00000001 - Code interne ludotheque'
    },
    id_externe: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID source (MyLudo, BGG, etc.)'
    },
    ean: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Code EAN-13 commercial'
    },
    titre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    sous_titre: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Sous-titre ou nom d\'extension'
    },
    type_jeu: {
      type: DataTypes.ENUM('basegame', 'extension', 'standalone', 'accessoire'),
      allowNull: true,
      defaultValue: 'basegame',
      comment: 'Type: jeu de base, extension, standalone, accessoire'
    },
    editeur: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Peut contenir plusieurs editeurs separes par virgule'
    },
    auteur: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Peut contenir plusieurs auteurs separes par virgule'
    },
    illustrateur: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Peut contenir plusieurs illustrateurs separes par virgule'
    },
    annee_sortie: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1900,
        max: new Date().getFullYear() + 1
      }
    },
    age_min: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 99
      }
    },
    nb_joueurs_min: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    nb_joueurs_max: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    duree_partie: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duree en minutes'
    },
    // Champs multi-valeurs (stockes en JSON ou texte separe par virgules)
    langues: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Langues disponibles, separees par virgule'
    },
    categories: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Categories, separees par virgule (Jeu de des, Casse-tete, etc.)'
    },
    themes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Themes, separes par virgule (Antiquite, Sports, etc.)'
    },
    mecanismes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mecanismes de jeu, separes par virgule (Roll & Write, etc.)'
    },
    univers: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Univers thematique'
    },
    // Ancien champ texte conserve pour retrocompatibilite (migration)
    gamme: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'DEPRECATED: Utiliser gamme_id. Collection ou gamme du jeu'
    },
    // Nouvelle FK vers table gammes
    gamme_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'gammes',
        key: 'id'
      },
      comment: 'FK vers table gammes'
    },
    // Informations physiques
    dimensions: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Dimensions de la boite'
    },
    poids: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Poids de la boite'
    },
    // Prix
    prix_indicatif: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Prix catalogue/public'
    },
    prix_achat: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Prix paye a l\'achat'
    },
    gratuit: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Jeu obtenu gratuitement'
    },
    // Gestion ludotheque
    statut: {
      type: DataTypes.ENUM('disponible', 'emprunte', 'maintenance', 'perdu', 'archive'),
      allowNull: false,
      defaultValue: 'disponible'
    },
    etat: {
      type: DataTypes.ENUM('neuf', 'tres_bon', 'bon', 'acceptable', 'mauvais'),
      allowNull: true,
      comment: 'Etat physique du jeu'
    },
    // Ancien champ texte conserve pour retrocompatibilite (migration)
    emplacement: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'DEPRECATED: Utiliser emplacement_id. Emplacement physique dans la ludotheque'
    },
    // Nouvelle FK vers table emplacements_jeux
    emplacement_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'emplacements_jeux',
        key: 'id'
      },
      comment: 'FK vers table emplacements_jeux'
    },
    date_acquisition: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    proprietaire: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Proprietaire si pret/depot'
    },
    cadeau: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Jeu recu en cadeau/don'
    },
    // Flags de gestion
    prive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Jeu prive (non visible publiquement)'
    },
    protege: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Jeu protege (sleeves, etc.)'
    },
    organise: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Jeu avec rangement/insert'
    },
    personnalise: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Jeu personnalise/modifie'
    },
    figurines_peintes: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Figurines peintes'
    },
    // Contenu additionnel
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes internes/commentaires'
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Reference interne'
    },
    referent: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Personne referente pour ce jeu'
    },
    // URLs et medias
    regles_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    // Statistiques
    derniere_partie: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de la derniere partie jouee'
    },
    nb_emprunts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Nombre total d\'emprunts'
    }
  }, {
    tableName: 'jeux',
    timestamps: false,
    hooks: {
      afterCreate: async (jeu) => {
        // Si un code-barre a ete fourni (pre-imprime ou scanne)
        if (jeu.code_barre) {
          try {
            // Marquer le code comme utilise dans la table des codes reserves
            const codeBarreService = require('../services/codeBarreService');
            await codeBarreService.assignCode('jeu', jeu.code_barre, jeu.id);
          } catch (err) {
            // Si erreur (code deja utilise, etc.), on log mais on ne bloque pas
            console.warn(`Avertissement assignation code-barre jeu: ${err.message}`);
          }
        } else {
          // Generer un code automatiquement: JEU + 8-digit padded ID
          const paddedId = String(jeu.id).padStart(8, '0');
          jeu.code_barre = `JEU${paddedId}`;
          await jeu.save();
        }
      }
    }
  });

  // Instance methods
  Jeu.prototype.estDisponible = function() {
    return this.statut === 'disponible';
  };

  Jeu.prototype.changerStatut = async function(nouveauStatut) {
    const statutsValides = ['disponible', 'emprunte', 'maintenance', 'perdu', 'archive'];
    if (!statutsValides.includes(nouveauStatut)) {
      throw new Error(`Statut invalide: ${nouveauStatut}`);
    }
    this.statut = nouveauStatut;
    await this.save();
    return this;
  };

  // Helper pour obtenir les categories comme tableau
  Jeu.prototype.getCategoriesArray = function() {
    if (!this.categories) return [];
    return this.categories.split(',').map(c => c.trim()).filter(c => c);
  };

  // Helper pour obtenir les themes comme tableau
  Jeu.prototype.getThemesArray = function() {
    if (!this.themes) return [];
    return this.themes.split(',').map(t => t.trim()).filter(t => t);
  };

  // Helper pour obtenir les mecanismes comme tableau
  Jeu.prototype.getMecanismesArray = function() {
    if (!this.mecanismes) return [];
    return this.mecanismes.split(',').map(m => m.trim()).filter(m => m);
  };

  return Jeu;
};
