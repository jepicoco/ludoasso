/**
 * Portal Settings Service
 *
 * Gere la resolution des parametres de portail avec fallback vers ParametresFront.
 * Pattern: portal.parametres[key] ?? portal[key] ?? ParametresFront[key]
 */

const { GroupeFrontend, ParametresFront } = require('../models');

// Cache des parametres globaux (refresh toutes les 5 minutes)
let globalParamsCache = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Liste des cles qui existent directement sur GroupeFrontend (colonnes dedicaces)
const PORTAL_DIRECT_KEYS = [
  'nom', 'nom_affiche', 'logo_url', 'favicon_url', 'meta_description',
  'email_contact', 'telephone_contact', 'theme_code',
  'mode_maintenance', 'message_maintenance'
];

// Mapping des cles portail vers cles ParametresFront
const KEY_MAPPING = {
  'nom_affiche': 'nom_site',
  'nom': 'nom_site'
};

/**
 * Recupere les parametres globaux avec cache
 */
async function getGlobalParams() {
  const now = Date.now();

  if (globalParamsCache.data && (now - globalParamsCache.timestamp) < CACHE_TTL) {
    return globalParamsCache.data;
  }

  try {
    const params = await ParametresFront.findOne();
    globalParamsCache = {
      data: params ? params.toJSON() : {},
      timestamp: now
    };
    return globalParamsCache.data;
  } catch (error) {
    console.error('Erreur recuperation ParametresFront:', error.message);
    return globalParamsCache.data || {};
  }
}

/**
 * Invalide le cache des parametres globaux
 */
function invalidateGlobalParamsCache() {
  globalParamsCache = { data: null, timestamp: 0 };
}

/**
 * Recupere un parametre pour un portail avec fallback
 *
 * @param {Object} portal - Instance GroupeFrontend ou objet avec parametres
 * @param {string} key - Cle du parametre
 * @param {Object} globalParams - Parametres globaux (optionnel, pour eviter requete)
 * @returns {any} Valeur du parametre
 */
function getPortalSetting(portal, key, globalParams = null) {
  if (!portal) {
    return globalParams?.[key] ?? null;
  }

  // 1. Verifier dans portal.parametres (JSON overrides)
  const parametres = portal.parametres || {};
  if (parametres[key] !== undefined && parametres[key] !== null) {
    return parametres[key];
  }

  // 2. Verifier les colonnes directes du portail
  if (PORTAL_DIRECT_KEYS.includes(key) && portal[key] !== undefined && portal[key] !== null) {
    return portal[key];
  }

  // 3. Fallback vers ParametresFront
  if (globalParams) {
    const globalKey = KEY_MAPPING[key] || key;
    return globalParams[globalKey] ?? null;
  }

  return null;
}

/**
 * Recupere plusieurs parametres pour un portail
 *
 * @param {Object} portal - Instance GroupeFrontend
 * @param {string[]} keys - Liste des cles
 * @param {Object} globalParams - Parametres globaux (optionnel)
 * @returns {Object} Objet avec les valeurs
 */
function getPortalSettings(portal, keys, globalParams = null) {
  const result = {};
  for (const key of keys) {
    result[key] = getPortalSetting(portal, key, globalParams);
  }
  return result;
}

/**
 * Recupere tous les parametres resolus pour un portail
 * Combine les parametres du portail avec les defaults globaux
 *
 * @param {Object} portal - Instance GroupeFrontend
 * @returns {Object} Tous les parametres resolus
 */
async function getResolvedPortalParams(portal) {
  const globalParams = await getGlobalParams();

  if (!portal) {
    return globalParams;
  }

  // Commencer avec les params globaux
  const resolved = { ...globalParams };

  // Override avec les colonnes directes du portail
  PORTAL_DIRECT_KEYS.forEach(key => {
    if (portal[key] !== undefined && portal[key] !== null) {
      const globalKey = KEY_MAPPING[key] || key;
      resolved[globalKey] = portal[key];
    }
  });

  // Override avec le JSON parametres
  const parametres = portal.parametres || {};
  Object.keys(parametres).forEach(key => {
    if (parametres[key] !== undefined && parametres[key] !== null) {
      resolved[key] = parametres[key];
    }
  });

  // Ajouter les infos du portail
  resolved._portal = {
    id: portal.id,
    code: portal.code,
    nom: portal.nom,
    slug: portal.slug,
    theme_code: portal.theme_code
  };

  return resolved;
}

/**
 * Recupere un portail par slug avec ses parametres resolus
 *
 * @param {string} slug - Slug du portail
 * @returns {Object|null} Portail avec parametres resolus ou null
 */
async function getPortalBySlug(slug) {
  try {
    const portal = await GroupeFrontend.findOne({
      where: { slug, actif: true }
    });

    if (!portal) {
      return null;
    }

    const params = await getResolvedPortalParams(portal);

    return {
      portal: portal.toJSON(),
      params
    };
  } catch (error) {
    console.error('Erreur getPortalBySlug:', error.message);
    return null;
  }
}

/**
 * Liste des parametres disponibles pour configuration portail
 * Utilise pour l'interface d'administration
 */
const CONFIGURABLE_PARAMS = {
  // Identite
  identite: {
    label: 'Identite',
    params: [
      { key: 'nom_affiche', label: 'Nom du site', type: 'text' },
      { key: 'logo_url', label: 'URL du logo', type: 'url' },
      { key: 'favicon_url', label: 'URL du favicon', type: 'url' }
    ]
  },
  // SEO
  seo: {
    label: 'SEO / Meta',
    params: [
      { key: 'meta_description', label: 'Meta description', type: 'textarea' },
      { key: 'meta_keywords', label: 'Meta keywords', type: 'text' },
      { key: 'og_image_url', label: 'Image OpenGraph', type: 'url' }
    ]
  },
  // Contact
  contact: {
    label: 'Contact',
    params: [
      { key: 'email_contact', label: 'Email', type: 'email' },
      { key: 'telephone_contact', label: 'Telephone', type: 'tel' },
      { key: 'adresse_contact', label: 'Adresse', type: 'textarea' }
    ]
  },
  // Reseaux sociaux
  reseaux: {
    label: 'Reseaux sociaux',
    params: [
      { key: 'facebook_url', label: 'Facebook', type: 'url' },
      { key: 'instagram_url', label: 'Instagram', type: 'url' },
      { key: 'twitter_url', label: 'Twitter/X', type: 'url' },
      { key: 'youtube_url', label: 'YouTube', type: 'url' }
    ]
  },
  // Apparence
  apparence: {
    label: 'Apparence',
    params: [
      { key: 'theme_code', label: 'Theme', type: 'select', options: 'themes' },
      { key: 'couleur_primaire', label: 'Couleur primaire', type: 'color' },
      { key: 'couleur_secondaire', label: 'Couleur secondaire', type: 'color' },
      { key: 'css_personnalise', label: 'CSS personnalise', type: 'code' }
    ]
  },
  // Modules
  modules: {
    label: 'Modules visibles',
    params: [
      { key: 'module_ludotheque', label: 'Ludotheque (Jeux)', type: 'boolean' },
      { key: 'module_bibliotheque', label: 'Bibliotheque (Livres)', type: 'boolean' },
      { key: 'module_filmotheque', label: 'Filmotheque (Films)', type: 'boolean' },
      { key: 'module_discotheque', label: 'Discotheque (Disques)', type: 'boolean' },
      { key: 'module_reservations', label: 'Reservations', type: 'boolean' },
      { key: 'module_plan_interactif', label: 'Plan interactif', type: 'boolean' }
    ]
  },
  // Maintenance
  maintenance: {
    label: 'Maintenance',
    params: [
      { key: 'mode_maintenance', label: 'Mode maintenance', type: 'boolean' },
      { key: 'message_maintenance', label: 'Message', type: 'textarea' }
    ]
  },
  // Legal
  legal: {
    label: 'Pages legales',
    params: [
      { key: 'mentions_legales', label: 'Mentions legales', type: 'richtext' },
      { key: 'cgu', label: 'CGU', type: 'richtext' },
      { key: 'cgv', label: 'CGV', type: 'richtext' },
      { key: 'politique_confidentialite', label: 'Politique confidentialite', type: 'richtext' }
    ]
  }
};

module.exports = {
  getGlobalParams,
  invalidateGlobalParamsCache,
  getPortalSetting,
  getPortalSettings,
  getResolvedPortalParams,
  getPortalBySlug,
  CONFIGURABLE_PARAMS,
  PORTAL_DIRECT_KEYS
};
