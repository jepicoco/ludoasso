/**
 * Service BoardGameGeek (BGG)
 * Recherche et recuperation de details de jeux via l'API XML BGG
 */

const axios = require('axios');
const xml2js = require('xml2js');

// Configuration BGG API
const BGG_API_BASE = 'https://boardgamegeek.com/xmlapi2';
const BGG_DELAY = 5000; // 5 secondes entre les requetes (recommande par BGG)

// Timestamp de la derniere requete
let lastRequestTime = 0;

/**
 * Attend le delai requis entre les requetes BGG
 */
async function waitForRateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;

  if (elapsed < BGG_DELAY) {
    const waitTime = BGG_DELAY - elapsed;
    console.log(`[BGG] Attente rate limit: ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Parse le XML BGG en JSON
 */
async function parseXML(xml) {
  const parser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: false,
    attrkey: '$',
    charkey: '_'
  });

  return parser.parseStringPromise(xml);
}

/**
 * Recherche un jeu par son nom sur BGG
 * @param {string} query - Terme de recherche
 * @param {boolean} exact - Recherche exacte
 * @returns {Promise<Array>} - Liste des resultats
 */
async function search(query, exact = false) {
  await waitForRateLimit();

  try {
    console.log(`[BGG Search] Recherche: "${query}" (exact: ${exact})`);

    const response = await axios.get(`${BGG_API_BASE}/search`, {
      params: {
        query: query,
        type: 'boardgame',
        exact: exact ? 1 : 0
      },
      timeout: 15000,
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Ludotheque-App/1.0'
      }
    });

    console.log(`[BGG Search] Response status: ${response.status}`);

    const result = await parseXML(response.data);

    if (!result.items || !result.items.item) {
      console.log('[BGG Search] Aucun resultat trouve');
      return [];
    }

    // Normaliser en tableau
    const items = Array.isArray(result.items.item)
      ? result.items.item
      : [result.items.item];

    console.log(`[BGG Search] ${items.length} resultat(s) trouve(s)`);

    return items.map(item => ({
      id: item.$.id,
      name: item.name ? (item.name.$ ? item.name.$.value : item.name) : null,
      yearPublished: item.yearpublished ? item.yearpublished.$.value : null
    }));

  } catch (error) {
    console.error('[BGG Search] Erreur:', error.message);
    if (error.response) {
      console.error('[BGG Search] Status:', error.response.status);
      console.error('[BGG Search] Data:', error.response.data?.substring?.(0, 200));
    }
    // Retourner tableau vide au lieu de throw pour ne pas bloquer
    return [];
  }
}

/**
 * Recupere les details complets d'un jeu par son ID BGG
 * @param {string} id - ID BGG du jeu
 * @returns {Promise<Object|null>} - Details du jeu
 */
async function getDetails(id) {
  await waitForRateLimit();

  try {
    console.log(`[BGG Details] Recuperation ID: ${id}`);

    const response = await axios.get(`${BGG_API_BASE}/thing`, {
      params: {
        id: id,
        stats: 1
      },
      timeout: 15000,
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Ludotheque-App/1.0'
      }
    });

    console.log(`[BGG Details] Response status: ${response.status}`);

    const result = await parseXML(response.data);

    if (!result.items || !result.items.item) {
      console.log('[BGG Details] Pas de donnees');
      return null;
    }

    const item = result.items.item;

    // Extraire les liens (editeurs, designers, categories)
    const links = item.link ? (Array.isArray(item.link) ? item.link : [item.link]) : [];

    const publishers = links
      .filter(l => l.$.type === 'boardgamepublisher')
      .map(l => l.$.value);

    const designers = links
      .filter(l => l.$.type === 'boardgamedesigner')
      .map(l => l.$.value);

    const categories = links
      .filter(l => l.$.type === 'boardgamecategory')
      .map(l => l.$.value);

    const mechanics = links
      .filter(l => l.$.type === 'boardgamemechanic')
      .map(l => l.$.value);

    // Extraire le nom principal
    const names = item.name ? (Array.isArray(item.name) ? item.name : [item.name]) : [];
    const primaryName = names.find(n => n.$.type === 'primary');
    const name = primaryName ? primaryName.$.value : (names[0] ? names[0].$.value : null);

    // Extraire les stats
    const stats = item.statistics && item.statistics.ratings;
    const rating = stats && stats.average ? parseFloat(stats.average.$.value) : null;

    return {
      id: item.$.id,
      name: name,
      yearPublished: item.yearpublished ? parseInt(item.yearpublished.$.value) : null,
      minPlayers: item.minplayers ? parseInt(item.minplayers.$.value) : null,
      maxPlayers: item.maxplayers ? parseInt(item.maxplayers.$.value) : null,
      playingTime: item.playingtime ? parseInt(item.playingtime.$.value) : null,
      minAge: item.minage ? parseInt(item.minage.$.value) : null,
      description: item.description ? cleanDescription(item.description) : null,
      image: item.image || null,
      thumbnail: item.thumbnail || null,
      publisher: publishers[0] || null,
      publishers: publishers,
      designer: designers[0] || null,
      designers: designers,
      categories: categories,
      mechanics: mechanics,
      rating: rating
    };

  } catch (error) {
    console.error('[BGG Details] Erreur:', error.message);
    if (error.response) {
      console.error('[BGG Details] Status:', error.response.status);
    }
    // Retourner null au lieu de throw
    return null;
  }
}

/**
 * Nettoie la description BGG (supprime les balises HTML)
 */
function cleanDescription(desc) {
  if (!desc) return null;

  return desc
    .replace(/&#10;/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Recherche un jeu et retourne ses details complets
 * Combine search + getDetails
 * @param {string} title - Titre du jeu
 * @returns {Promise<Object|null>} - Details du jeu ou null
 */
async function searchAndGetDetails(title) {
  try {
    console.log(`[BGG] searchAndGetDetails: "${title}"`);

    // D'abord essayer une recherche exacte
    let results = await search(title, true);

    // Si pas de resultat exact, recherche normale
    if (results.length === 0) {
      results = await search(title, false);
    }

    if (results.length === 0) {
      console.log('[BGG] Aucun resultat pour ce titre');
      return null;
    }

    // Prendre le premier resultat (le plus pertinent)
    const best = results[0];
    console.log(`[BGG] Meilleur resultat: ${best.name} (ID: ${best.id})`);

    // Recuperer les details complets
    const details = await getDetails(best.id);

    if (details) {
      console.log(`[BGG] Details recuperes: ${details.name}`);
    }

    return details;

  } catch (error) {
    console.error('[BGG] searchAndGetDetails error:', error.message);
    // Ne pas propager l'erreur, retourner null
    return null;
  }
}

/**
 * Traduit les categories BGG en francais
 */
const categoryTranslations = {
  'Abstract Strategy': 'Strategie abstraite',
  'Adventure': 'Aventure',
  'Ancient': 'Antiquite',
  'Animals': 'Animaux',
  'Bluffing': 'Bluff',
  'Card Game': 'Jeu de cartes',
  'Children\'s Game': 'Jeu pour enfants',
  'City Building': 'Construction de ville',
  'Civilization': 'Civilisation',
  'Deduction': 'Deduction',
  'Dice': 'Des',
  'Economic': 'Economie',
  'Educational': 'Educatif',
  'Exploration': 'Exploration',
  'Family Game': 'Jeu familial',
  'Fantasy': 'Fantaisie',
  'Farming': 'Agriculture',
  'Fighting': 'Combat',
  'Horror': 'Horreur',
  'Humor': 'Humour',
  'Medieval': 'Medieval',
  'Memory': 'Memoire',
  'Miniatures': 'Figurines',
  'Mythology': 'Mythologie',
  'Party Game': 'Jeu d\'ambiance',
  'Puzzle': 'Puzzle',
  'Racing': 'Course',
  'Science Fiction': 'Science-fiction',
  'Strategy': 'Strategie',
  'Trivia': 'Quiz',
  'Wargame': 'Wargame',
  'Word Game': 'Jeu de mots'
};

function translateCategory(category) {
  return categoryTranslations[category] || category;
}

module.exports = {
  search,
  getDetails,
  searchAndGetDetails,
  translateCategory
};
