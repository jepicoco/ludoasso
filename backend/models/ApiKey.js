const { DataTypes, Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Genere une cle API unique
 * Format: ask_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (32 chars hex)
 */
function generateApiKey() {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `ask_${randomBytes}`;
}

/**
 * Hash une cle API pour stockage securise
 */
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

module.exports = (sequelize) => {
  const ApiKey = sequelize.define('ApiKey', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Identification
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nom descriptif de la cle (ex: Extension Chrome MyLudo)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description de l\'usage prevu'
    },

    // Cle API (stockee hashee)
    key_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: 'Hash SHA-256 de la cle API'
    },
    key_prefix: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Prefixe de la cle pour identification (ask_xxxx...)'
    },

    // Permissions
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['jeux:create', 'jeux:update'],
      comment: 'Liste des permissions accordees'
    },

    // Collections autorisees
    collections_autorisees: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['jeu'],
      comment: 'Collections accessibles: jeu, livre, film, disque'
    },

    // Limites de requetes
    limite_requetes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1000,
      comment: 'Limite de requetes par periode (null = illimite)'
    },
    periode_limite: {
      type: DataTypes.ENUM('heure', 'jour', 'mois'),
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

    // Restrictions IP (optionnel)
    ip_autorisees: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Liste des IPs autorisees (null = toutes)'
    },

    // Statut
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Cle active'
    },
    date_expiration: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date d\'expiration (null = jamais)'
    },

    // Statistiques
    total_requetes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total des requetes effectuees'
    },
    derniere_utilisation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de derniere utilisation'
    },
    derniere_ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'Derniere IP utilisee'
    },

    // Audit
    cree_par: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de l\'utilisateur qui a cree la cle'
    }
  }, {
    tableName: 'api_keys',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['key_hash'], unique: true },
      { fields: ['key_prefix'] },
      { fields: ['actif'] },
      { fields: ['date_expiration'] }
    ]
  });

  // ==================== METHODES STATIQUES ====================

  /**
   * Cree une nouvelle cle API et retourne la cle en clair (une seule fois)
   */
  ApiKey.creerCle = async function(data, userId = null) {
    const cleEnClair = generateApiKey();
    const hash = hashApiKey(cleEnClair);
    const prefix = cleEnClair.substring(0, 12) + '...';

    const apiKey = await ApiKey.create({
      nom: data.nom,
      description: data.description || null,
      key_hash: hash,
      key_prefix: prefix,
      permissions: data.permissions || ['jeux:create', 'jeux:update'],
      collections_autorisees: data.collections_autorisees || ['jeu'],
      limite_requetes: data.limite_requetes !== undefined ? data.limite_requetes : 1000,
      periode_limite: data.periode_limite || 'jour',
      ip_autorisees: data.ip_autorisees || null,
      date_expiration: data.date_expiration || null,
      cree_par: userId
    });

    // Retourner la cle en clair (sera affichee une seule fois a l'utilisateur)
    return {
      apiKey,
      cleEnClair
    };
  };

  /**
   * Valide une cle API et retourne l'objet ApiKey si valide
   */
  ApiKey.validerCle = async function(cleEnClair, ip = null) {
    if (!cleEnClair || !cleEnClair.startsWith('ask_')) {
      return { valid: false, error: 'Format de cle invalide' };
    }

    const hash = hashApiKey(cleEnClair);
    const apiKey = await ApiKey.findOne({ where: { key_hash: hash } });

    if (!apiKey) {
      return { valid: false, error: 'Cle API inconnue' };
    }

    // Verifier si active
    if (!apiKey.actif) {
      return { valid: false, error: 'Cle API desactivee' };
    }

    // Verifier expiration
    if (apiKey.date_expiration && new Date() > apiKey.date_expiration) {
      return { valid: false, error: 'Cle API expiree' };
    }

    // Verifier restriction IP
    if (apiKey.ip_autorisees && apiKey.ip_autorisees.length > 0 && ip) {
      if (!apiKey.ip_autorisees.includes(ip)) {
        return { valid: false, error: 'IP non autorisee' };
      }
    }

    // Verifier limite de requetes
    if (apiKey.limite_requetes) {
      // Reset du compteur si necessaire
      if (!apiKey.date_reset_compteur || new Date() >= apiKey.date_reset_compteur) {
        await apiKey.resetCompteur();
      }

      if (apiKey.requetes_compteur >= apiKey.limite_requetes) {
        return { valid: false, error: 'Limite de requetes atteinte' };
      }
    }

    return { valid: true, apiKey };
  };

  /**
   * Liste des permissions disponibles
   */
  ApiKey.getPermissionsDisponibles = function() {
    return [
      { id: 'jeux:read', label: 'Lecture des jeux', groupe: 'Jeux' },
      { id: 'jeux:create', label: 'Creation de jeux', groupe: 'Jeux' },
      { id: 'jeux:update', label: 'Modification de jeux', groupe: 'Jeux' },
      { id: 'jeux:delete', label: 'Suppression de jeux', groupe: 'Jeux' },
      { id: 'livres:read', label: 'Lecture des livres', groupe: 'Livres' },
      { id: 'livres:create', label: 'Creation de livres', groupe: 'Livres' },
      { id: 'livres:update', label: 'Modification de livres', groupe: 'Livres' },
      { id: 'films:read', label: 'Lecture des films', groupe: 'Films' },
      { id: 'films:create', label: 'Creation de films', groupe: 'Films' },
      { id: 'films:update', label: 'Modification de films', groupe: 'Films' },
      { id: 'disques:read', label: 'Lecture des disques', groupe: 'Disques' },
      { id: 'disques:create', label: 'Creation de disques', groupe: 'Disques' },
      { id: 'disques:update', label: 'Modification de disques', groupe: 'Disques' },
      { id: 'images:upload', label: 'Upload d\'images', groupe: 'Medias' },
      { id: 'frequentation:read', label: 'Lecture frequentation', groupe: 'Frequentation' },
      { id: 'frequentation:create', label: 'Enregistrement frequentation', groupe: 'Frequentation' }
    ];
  };

  // ==================== METHODES D'INSTANCE ====================

  /**
   * Incremente le compteur de requetes
   */
  ApiKey.prototype.incrementerCompteur = async function(ip = null) {
    const maintenant = new Date();

    // Reset du compteur si necessaire
    if (!this.date_reset_compteur || maintenant >= this.date_reset_compteur) {
      await this.resetCompteur();
    }

    this.requetes_compteur += 1;
    this.total_requetes += 1;
    this.derniere_utilisation = maintenant;
    if (ip) this.derniere_ip = ip;

    return this.save();
  };

  /**
   * Reset le compteur de requetes et calcule la prochaine date de reset
   */
  ApiKey.prototype.resetCompteur = async function() {
    this.requetes_compteur = 0;

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

    return this.save();
  };

  /**
   * Verifie si la cle a une permission specifique
   */
  ApiKey.prototype.hasPermission = function(permission) {
    return this.permissions && this.permissions.includes(permission);
  };

  /**
   * Verifie si la cle peut acceder a une collection
   */
  ApiKey.prototype.canAccessCollection = function(collection) {
    return this.collections_autorisees && this.collections_autorisees.includes(collection);
  };

  /**
   * Desactive la cle
   */
  ApiKey.prototype.desactiver = async function() {
    this.actif = false;
    return this.save();
  };

  /**
   * Reactive la cle
   */
  ApiKey.prototype.activer = async function() {
    this.actif = true;
    return this.save();
  };

  /**
   * Retourne les stats d'utilisation
   */
  ApiKey.prototype.getStats = function() {
    const limiteRestante = this.limite_requetes
      ? Math.max(0, this.limite_requetes - this.requetes_compteur)
      : null;

    return {
      total_requetes: this.total_requetes,
      requetes_periode: this.requetes_compteur,
      limite_periode: this.limite_requetes,
      limite_restante: limiteRestante,
      periode: this.periode_limite,
      prochain_reset: this.date_reset_compteur,
      derniere_utilisation: this.derniere_utilisation,
      derniere_ip: this.derniere_ip
    };
  };

  // Exporter les fonctions utilitaires
  ApiKey.generateApiKey = generateApiKey;
  ApiKey.hashApiKey = hashApiKey;

  return ApiKey;
};
