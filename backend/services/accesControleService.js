/**
 * Service de controle d'acces aux donnees personnelles
 * Filtre les champs PII selon le role de l'utilisateur
 */

// Champs PII configurables
const PII_FIELDS = [
  'nom', 'prenom', 'email', 'telephone',
  'adresse', 'ville', 'code_postal',
  'date_naissance', 'photo', 'notes'
];

// Champs systeme toujours visibles (non-PII)
const SYSTEM_FIELDS = [
  'id', 'code_barre', 'statut', 'role',
  'date_adhesion', 'date_fin_adhesion',
  'date_fin_adhesion_association', 'charte_validee',
  'charte_version_validee', 'date_validation_charte',
  'modules_autorises', 'structure_id'
];

class AccesControleService {
  constructor() {
    this.configCache = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Obtient la configuration (avec cache)
   * @returns {Promise<Object>}
   */
  async getConfig() {
    // Cache valide ?
    if (this.configCache && this.cacheExpiry > Date.now()) {
      return this.configCache;
    }

    const { ConfigurationAccesDonnees } = require('../models');
    const config = await ConfigurationAccesDonnees.getInstance();

    this.configCache = config;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;
    return config;
  }

  /**
   * Invalide le cache (apres modification de la config)
   */
  clearCache() {
    this.configCache = null;
    this.cacheExpiry = null;
  }

  /**
   * Obtient les champs visibles pour un role
   * @param {string} role - Role de l'utilisateur
   * @returns {Promise<string[]>} Liste des champs visibles
   */
  async getChampsVisibles(role) {
    // Admin voit toujours tout
    if (role === 'administrateur') {
      return [...SYSTEM_FIELDS, ...PII_FIELDS];
    }

    const config = await this.getConfig();
    const champsConfig = config.champs_visibles_par_role || {};
    const visiblePII = champsConfig[role] || ['nom', 'prenom'];

    return [...SYSTEM_FIELDS, ...visiblePII];
  }

  /**
   * Verifie si un role peut voir l'historique des emprunts
   * @param {string} role
   * @returns {Promise<boolean>}
   */
  async peutVoirHistoriqueEmprunts(role) {
    if (role === 'administrateur') return true;

    const config = await this.getConfig();
    const accesConfig = config.acces_historique_emprunts || {};
    // Par defaut autorise (backward compatible)
    return accesConfig[role] !== false;
  }

  /**
   * Verifie si un role peut voir les cotisations
   * @param {string} role
   * @returns {Promise<boolean>}
   */
  async peutVoirCotisations(role) {
    if (role === 'administrateur') return true;

    const config = await this.getConfig();
    const accesConfig = config.acces_cotisations || {};
    // Par defaut refuse (securite)
    return accesConfig[role] === true;
  }

  /**
   * Filtre les donnees d'un utilisateur selon le role
   * @param {Object} utilisateur - Donnees de l'utilisateur
   * @param {string} role - Role de l'observateur
   * @returns {Promise<Object>} Utilisateur filtre
   */
  async filterUtilisateurData(utilisateur, role) {
    if (!utilisateur) return null;

    // Admin voit tout
    if (role === 'administrateur') {
      return utilisateur;
    }

    const champsVisibles = await this.getChampsVisibles(role);
    const filtered = {};

    const data = utilisateur.toJSON ? utilisateur.toJSON() : utilisateur;

    for (const [key, value] of Object.entries(data)) {
      // Garder les champs visibles ou les champs non-PII
      if (champsVisibles.includes(key) || !PII_FIELDS.includes(key)) {
        // Ne pas inclure les emprunts si non autorise
        if (key === 'emprunts' || key === 'historique_emprunts') {
          if (await this.peutVoirHistoriqueEmprunts(role)) {
            filtered[key] = value;
          }
        }
        // Ne pas inclure les cotisations si non autorise
        else if (key === 'cotisations') {
          if (await this.peutVoirCotisations(role)) {
            filtered[key] = value;
          }
        }
        else {
          filtered[key] = value;
        }
      }
    }

    return filtered;
  }

  /**
   * Filtre un tableau d'utilisateurs
   * @param {Array} utilisateurs
   * @param {string} role
   * @returns {Promise<Array>}
   */
  async filterUtilisateursArray(utilisateurs, role) {
    if (!utilisateurs || !Array.isArray(utilisateurs)) {
      return utilisateurs;
    }

    // Admin voit tout
    if (role === 'administrateur') {
      return utilisateurs;
    }

    const results = [];
    for (const u of utilisateurs) {
      results.push(await this.filterUtilisateurData(u, role));
    }
    return results;
  }

  /**
   * Obtient les champs PII disponibles (pour l'UI admin)
   * @returns {Array}
   */
  getPIIFields() {
    return [
      { code: 'nom', label: 'Nom', category: 'identite', required: true },
      { code: 'prenom', label: 'Prenom', category: 'identite', required: true },
      { code: 'email', label: 'Email', category: 'contact' },
      { code: 'telephone', label: 'Telephone', category: 'contact' },
      { code: 'adresse', label: 'Adresse', category: 'adresse' },
      { code: 'ville', label: 'Ville', category: 'adresse' },
      { code: 'code_postal', label: 'Code postal', category: 'adresse' },
      { code: 'date_naissance', label: 'Date de naissance', category: 'identite' },
      { code: 'photo', label: 'Photo', category: 'identite' },
      { code: 'notes', label: 'Notes administratives', category: 'autre' }
    ];
  }

  /**
   * Obtient la liste des roles (pour l'UI admin)
   * @returns {Array}
   */
  getRoles() {
    return [
      { code: 'benevole', label: 'Benevole', level: 1 },
      { code: 'agent', label: 'Agent', level: 2 },
      { code: 'gestionnaire', label: 'Gestionnaire', level: 3 },
      { code: 'comptable', label: 'Comptable', level: 4 },
      { code: 'administrateur', label: 'Administrateur', level: 5 }
    ];
  }
}

// Export singleton
module.exports = new AccesControleService();
