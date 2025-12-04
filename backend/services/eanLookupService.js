/**
 * Service de lookup EAN
 * Recherche les informations d'un jeu a partir de son code-barre EAN
 * Utilise UPCitemdb (gratuit, 100 req/jour) puis enrichit avec BGG
 */

const axios = require('axios');
const bggService = require('./bggService');

// Configuration UPCitemdb (version gratuite)
const UPCITEMDB_BASE_URL = 'https://api.upcitemdb.com/prod/trial/lookup';

// Cache simple en memoire (en production, utiliser Redis ou une table SQL)
const cache = new Map();
const CACHE_TTL = 90 * 24 * 60 * 60 * 1000; // 90 jours

/**
 * Recherche les informations d'un produit via UPCitemdb
 * @param {string} ean - Code EAN/UPC a rechercher
 * @returns {Promise<Object|null>} - Informations du produit ou null
 */
async function lookupUPCitemdb(ean) {
  try {
    const response = await axios.get(UPCITEMDB_BASE_URL, {
      params: { upc: ean },
      headers: {
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (response.data && response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      return {
        title: item.title,
        brand: item.brand,
        category: item.category,
        description: item.description,
        images: item.images || []
      };
    }

    return null;
  } catch (error) {
    // Gerer les erreurs de rate limit
    if (error.response && error.response.status === 429) {
      console.warn('UPCitemdb rate limit atteint');
      throw new Error('Limite quotidienne d\'API atteinte. Reessayez demain.');
    }

    console.error('Erreur UPCitemdb:', error.message);
    return null;
  }
}

/**
 * Nettoie le titre pour la recherche BGG
 * Supprime les mentions d'edition, langue, etc.
 */
function cleanTitleForSearch(title) {
  if (!title) return '';

  return title
    // Supprimer les mentions entre parentheses
    .replace(/\([^)]*\)/g, '')
    // Supprimer les mentions entre crochets
    .replace(/\[[^\]]*\]/g, '')
    // Supprimer "edition", "version", etc.
    .replace(/\b(edition|version|francais|french|anglais|english|vf|vo)\b/gi, '')
    // Supprimer les caracteres speciaux
    .replace(/[^\w\s-]/g, ' ')
    // Nettoyer les espaces multiples
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Recherche complete d'un jeu par EAN
 * 1. Cherche dans le cache
 * 2. Lookup UPCitemdb pour le titre
 * 3. Recherche BGG pour les details
 * @param {string} ean - Code EAN a rechercher
 * @returns {Promise<Object>} - Resultat de la recherche
 */
async function lookupEAN(ean) {
  // Normaliser l'EAN
  ean = ean.toString().trim().replace(/\D/g, '');

  if (ean.length < 8 || ean.length > 14) {
    throw new Error('Code EAN invalide (doit contenir 8 a 14 chiffres)');
  }

  // Verifier le cache
  const cached = cache.get(ean);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return {
      ...cached.data,
      source: 'cache',
      cached: true
    };
  }

  const result = {
    found: false,
    ean: ean,
    source: null,
    jeu: null
  };

  try {
    // Etape 1: Lookup UPCitemdb
    console.log(`[EAN Lookup] Recherche UPCitemdb pour ${ean}...`);
    const upcResult = await lookupUPCitemdb(ean);

    if (upcResult && upcResult.title) {
      result.found = true;
      result.source = 'upcitemdb';
      result.jeu = {
        titre: upcResult.title,
        editeur: upcResult.brand || null,
        image_url: upcResult.images && upcResult.images[0] ? upcResult.images[0] : null
      };

      // Etape 2: Enrichir avec BGG
      const searchTitle = cleanTitleForSearch(upcResult.title);
      console.log(`[EAN Lookup] Recherche BGG pour "${searchTitle}"...`);

      try {
        const bggResult = await bggService.searchAndGetDetails(searchTitle);

        if (bggResult) {
          result.source = 'upcitemdb+bgg';
          result.jeu = {
            ...result.jeu,
            titre: bggResult.name || result.jeu.titre,
            editeur: bggResult.publisher || result.jeu.editeur,
            auteur: bggResult.designer || null,
            annee_sortie: bggResult.yearPublished || null,
            age_min: bggResult.minAge || null,
            nb_joueurs_min: bggResult.minPlayers || null,
            nb_joueurs_max: bggResult.maxPlayers || null,
            duree_partie: bggResult.playingTime || null,
            categorie: bggResult.categories && bggResult.categories[0] ? bggResult.categories[0] : null,
            description: bggResult.description || null,
            image_url: bggResult.image || result.jeu.image_url,
            bgg_id: bggResult.id || null,
            bgg_rating: bggResult.rating || null
          };
        }
      } catch (bggError) {
        console.warn('[EAN Lookup] Erreur BGG (resultat partiel):', bggError.message);
        // Continuer avec les donnees UPCitemdb
      }
    } else {
      // Pas trouve dans UPCitemdb, essayer directement BGG si ca ressemble a un nom
      result.source = 'not_found';
    }

    // Mettre en cache si trouve
    if (result.found) {
      cache.set(ean, {
        data: result,
        timestamp: Date.now()
      });
    }

    return result;

  } catch (error) {
    console.error('[EAN Lookup] Erreur:', error.message);
    throw error;
  }
}

/**
 * Recherche un jeu directement par son titre sur BGG
 * Utile quand l'EAN n'est pas trouve
 * @param {string} title - Titre du jeu
 * @returns {Promise<Object>} - Resultat de la recherche
 */
async function lookupByTitle(title) {
  try {
    const bggResult = await bggService.searchAndGetDetails(title);

    if (bggResult) {
      return {
        found: true,
        source: 'bgg',
        jeu: {
          titre: bggResult.name,
          editeur: bggResult.publisher || null,
          auteur: bggResult.designer || null,
          annee_sortie: bggResult.yearPublished || null,
          age_min: bggResult.minAge || null,
          nb_joueurs_min: bggResult.minPlayers || null,
          nb_joueurs_max: bggResult.maxPlayers || null,
          duree_partie: bggResult.playingTime || null,
          categorie: bggResult.categories && bggResult.categories[0] ? bggResult.categories[0] : null,
          description: bggResult.description || null,
          image_url: bggResult.image || null,
          bgg_id: bggResult.id || null,
          bgg_rating: bggResult.rating || null
        }
      };
    }

    return {
      found: false,
      source: 'bgg',
      jeu: null
    };
  } catch (error) {
    console.error('[Title Lookup] Erreur:', error.message);
    throw error;
  }
}

/**
 * Vide le cache
 */
function clearCache() {
  cache.clear();
}

/**
 * Retourne les statistiques du cache
 */
function getCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.keys())
  };
}

module.exports = {
  lookupEAN,
  lookupByTitle,
  clearCache,
  getCacheStats
};
