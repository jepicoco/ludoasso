const { DataTypes, Op } = require('sequelize');
const crypto = require('crypto');

// Utilise la meme cle de chiffrement que les emails
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
  ? Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, 'hex')
  : Buffer.alloc(32);

/**
 * Chiffre une valeur sensible (cle API, secret)
 */
function encryptValue(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Dechiffre une valeur sensible
 */
function decryptValue(encryptedValue) {
  if (!encryptedValue || !encryptedValue.includes(':')) return null;
  try {
    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Erreur dechiffrement:', error.message);
    return null;
  }
}

module.exports = (sequelize) => {
  const ConfigurationAPI = sequelize.define('ConfigurationAPI', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Identite
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Nom de la configuration API'
    },

    // Type d\'API
    type_api: {
      type: DataTypes.ENUM('ean_lookup', 'isbn_lookup', 'enrichissement', 'custom'),
      allowNull: false,
      defaultValue: 'ean_lookup',
      comment: 'Type d\'API (lookup EAN, lookup ISBN, enrichissement, custom)'
    },

    // Fournisseur
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Fournisseur API (upcitemdb, bgg, openlibrary, tmdb, discogs, isbndb, etc.)'
    },

    // Configuration de l\'API
    api_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL de base de l\'API'
    },
    api_key_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Cle API chiffree'
    },
    api_secret_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Secret API chiffre (optionnel)'
    },

    // Collections supportees (JSON array)
    collections_supportees: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: ['jeu'],
      comment: 'Collections supportees: jeu, livre, film, disque'
    },

    // Mapping des champs (JSON object)
    mapping_champs: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Mapping API vers champs Assotheque'
    },

    // Configuration du cache
    cache_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Activer le cache des resultats'
    },
    cache_duree_jours: {
      type: DataTypes.INTEGER,
      defaultValue: 90,
      comment: 'Duree du cache en jours'
    },

    // Limite de requetes
    limite_requetes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Limite de requetes (null = illimite)'
    },
    periode_limite: {
      type: DataTypes.ENUM('jour', 'heure', 'mois'),
      defaultValue: 'jour',
      comment: 'Periode de la limite de requetes'
    },
    requetes_compteur: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Compteur de requetes pour la periode en cours'
    },
    date_reset_compteur: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date du prochain reset du compteur'
    },

    // Priorite et ordre
    priorite: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Priorite d\'utilisation (0 = plus haute)'
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Ordre d\'affichage dans l\'interface'
    },

    // UI
    icone: {
      type: DataTypes.STRING(50),
      defaultValue: 'bi-search',
      comment: 'Icone Bootstrap Icons'
    },
    couleur: {
      type: DataTypes.STRING(20),
      defaultValue: 'info',
      comment: 'Couleur Bootstrap (primary, success, info, etc.)'
    },

    // Acces et statut
    role_minimum: {
      type: DataTypes.ENUM('gestionnaire', 'comptable', 'administrateur'),
      defaultValue: 'gestionnaire',
      comment: 'Role minimum pour utiliser cette API'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Configuration active'
    },
    par_defaut: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Configuration par defaut pour ce type'
    },

    // Notes et documentation
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description de l\'API'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes internes'
    },
    documentation_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL de la documentation de l\'API'
    },

    // Statistiques
    total_requetes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total des requetes effectuees'
    },
    total_succes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total des requetes reussies'
    },
    derniere_utilisation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de derniere utilisation'
    },
    dernier_statut: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Dernier statut de la connexion'
    }
  }, {
    tableName: 'configurations_api',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['actif'] },
      { fields: ['type_api'] },
      { fields: ['provider'] },
      { fields: ['priorite'] },
      { fields: ['ordre_affichage'] },
      { fields: ['par_defaut'] }
    ],
    hooks: {
      beforeSave: async (config) => {
        // Si c'est le premier de ce type, le mettre par defaut
        if (config.isNewRecord) {
          const count = await ConfigurationAPI.count({
            where: { type_api: config.type_api }
          });
          if (count === 0) {
            config.par_defaut = true;
          }
        }

        // S'assurer qu'un seul par defaut par type
        if (config.par_defaut && config.changed('par_defaut')) {
          await ConfigurationAPI.update(
            { par_defaut: false },
            {
              where: {
                type_api: config.type_api,
                id: { [Op.ne]: config.id || 0 }
              }
            }
          );
        }
      }
    }
  });

  // ==================== GETTERS/SETTERS ====================

  // Ne jamais exposer les cles API en clair
  ConfigurationAPI.prototype.getApiKey = function() {
    return this.api_key_encrypted ? '****' : null;
  };

  ConfigurationAPI.prototype.getApiSecret = function() {
    return this.api_secret_encrypted ? '****' : null;
  };

  // Methodes pour obtenir les valeurs dechiffrees (usage interne uniquement)
  ConfigurationAPI.prototype.getDecryptedApiKey = function() {
    return decryptValue(this.api_key_encrypted);
  };

  ConfigurationAPI.prototype.getDecryptedApiSecret = function() {
    return decryptValue(this.api_secret_encrypted);
  };

  // ==================== METHODES D'INSTANCE ====================

  /**
   * Active/desactive la configuration
   */
  ConfigurationAPI.prototype.toggleActif = async function() {
    this.actif = !this.actif;
    return this.save();
  };

  /**
   * Definit comme configuration par defaut pour ce type
   */
  ConfigurationAPI.prototype.setAsDefault = async function() {
    // Desactiver les autres par defaut du meme type
    await ConfigurationAPI.update(
      { par_defaut: false },
      { where: { type_api: this.type_api, id: { [Op.ne]: this.id } } }
    );

    this.par_defaut = true;
    this.actif = true;
    return this.save();
  };

  /**
   * Verifie si la limite de requetes est atteinte
   */
  ConfigurationAPI.prototype.peutFaireRequete = function() {
    if (!this.limite_requetes) return true;

    // Verifier si on doit reset le compteur
    if (this.date_reset_compteur && new Date() >= this.date_reset_compteur) {
      return true; // Le compteur sera reset lors de incrementerCompteur
    }

    return this.requetes_compteur < this.limite_requetes;
  };

  /**
   * Incremente le compteur de requetes
   */
  ConfigurationAPI.prototype.incrementerCompteur = async function(succes = true) {
    const maintenant = new Date();

    // Reset du compteur si necessaire
    if (!this.date_reset_compteur || maintenant >= this.date_reset_compteur) {
      this.requetes_compteur = 0;

      // Calculer la prochaine date de reset selon la periode
      const prochainReset = new Date();
      switch (this.periode_limite) {
        case 'heure':
          prochainReset.setHours(prochainReset.getHours() + 1);
          break;
        case 'mois':
          prochainReset.setMonth(prochainReset.getMonth() + 1);
          break;
        case 'jour':
        default:
          prochainReset.setDate(prochainReset.getDate() + 1);
          prochainReset.setHours(0, 0, 0, 0);
          break;
      }
      this.date_reset_compteur = prochainReset;
    }

    this.requetes_compteur += 1;
    this.total_requetes += 1;
    if (succes) {
      this.total_succes += 1;
    }
    this.derniere_utilisation = maintenant;

    return this.save();
  };

  /**
   * Met a jour le dernier statut
   */
  ConfigurationAPI.prototype.updateStatus = async function(statut) {
    this.dernier_statut = statut;
    this.derniere_utilisation = new Date();
    return this.save();
  };

  // ==================== METHODES STATIQUES ====================

  /**
   * Obtient toutes les configurations actives pour un type
   */
  ConfigurationAPI.getByType = async function(type, activeOnly = true) {
    const where = { type_api: type };
    if (activeOnly) where.actif = true;

    return ConfigurationAPI.findAll({
      where,
      order: [['priorite', 'ASC'], ['ordre_affichage', 'ASC']]
    });
  };

  /**
   * Obtient la configuration par defaut pour un type
   */
  ConfigurationAPI.getDefault = async function(type) {
    return ConfigurationAPI.findOne({
      where: { type_api: type, par_defaut: true, actif: true }
    });
  };

  /**
   * Obtient les configurations accessibles pour un role
   */
  ConfigurationAPI.getForRole = async function(userRole) {
    const roleHierarchy = {
      'gestionnaire': ['gestionnaire'],
      'comptable': ['gestionnaire', 'comptable'],
      'administrateur': ['gestionnaire', 'comptable', 'administrateur']
    };

    const allowedRoles = roleHierarchy[userRole] || [];

    return ConfigurationAPI.findAll({
      where: {
        actif: true,
        role_minimum: { [Op.in]: allowedRoles }
      },
      order: [['type_api', 'ASC'], ['priorite', 'ASC']]
    });
  };

  /**
   * Obtient les fournisseurs disponibles par type
   */
  ConfigurationAPI.getProviders = function() {
    return {
      ean_lookup: [
        { value: 'upcitemdb', label: 'UPCitemdb', gratuit: true, limite: '100/jour', collections: ['jeu'] },
        { value: 'bgg', label: 'BoardGameGeek', gratuit: true, limite: 'illimite', collections: ['jeu'] },
        { value: 'openlibrary', label: 'Open Library', gratuit: true, limite: 'illimite', collections: ['livre'] },
        { value: 'googlebooks', label: 'Google Books', gratuit: true, limite: '1000/jour', collections: ['livre'] },
        { value: 'tmdb', label: 'TMDB', gratuit: true, limite: '1000/jour', collections: ['film'] },
        { value: 'discogs', label: 'Discogs', gratuit: false, limite: '60/min', collections: ['disque'] },
        { value: 'musicbrainz', label: 'MusicBrainz', gratuit: true, limite: '1/sec', collections: ['disque'] }
      ],
      isbn_lookup: [
        { value: 'openlibrary', label: 'Open Library', gratuit: true, limite: 'illimite', collections: ['livre'] },
        { value: 'googlebooks', label: 'Google Books', gratuit: true, limite: '1000/jour', collections: ['livre'] },
        { value: 'isbndb', label: 'ISBNdb', gratuit: false, limite: 'selon plan', collections: ['livre'] }
      ],
      enrichissement: [
        { value: 'bgg', label: 'BoardGameGeek', gratuit: true, limite: 'illimite', collections: ['jeu'] },
        { value: 'tmdb', label: 'TMDB', gratuit: true, limite: '1000/jour', collections: ['film'] }
      ]
    };
  };

  // ==================== FONCTIONS UTILITAIRES EXPORTEES ====================

  ConfigurationAPI.encryptValue = encryptValue;
  ConfigurationAPI.decryptValue = decryptValue;

  return ConfigurationAPI;
};
