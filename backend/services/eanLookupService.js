/**
 * Service de recherche EAN/ISBN
 * Interroge les APIs externes configurees pour obtenir des informations sur un produit
 * Supporte: UPCitemdb, BGG, Wikiludo, OpenLibrary, GoogleBooks, BNF, TMDB, MusicBrainz, Discogs
 */

const { ConfigurationAPI } = require('../models');
const logger = require('../utils/logger');
const WikiludoProvider = require('./providers/WikiludoProvider');

// Cache en memoire pour eviter les requetes repetees
const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes pour le cache court terme
const CACHE_LONG_TTL = 90 * 24 * 60 * 60 * 1000; // 90 jours pour les resultats trouves

/**
 * Classe de base pour les providers
 */
class BaseProvider {
  constructor(config) {
    this.config = config;
    this.name = config.provider;
  }

  async search(code, type = 'ean') {
    throw new Error('search() must be implemented');
  }

  async searchByName(name, collection) {
    return null; // Par defaut, non supporte
  }

  normalizeResult(data, collection) {
    throw new Error('normalizeResult() must be implemented');
  }
}

/**
 * Provider UPCitemdb - Base de donnees EAN/UPC generique
 */
class UPCitemdbProvider extends BaseProvider {
  async search(code) {
    const apiKey = this.config.getDecryptedApiKey();
    const baseUrl = apiKey
      ? 'https://api.upcitemdb.com/prod/v1/lookup'
      : 'https://api.upcitemdb.com/prod/trial/lookup';

    const url = `${baseUrl}?upc=${code}`;

    const headers = { 'Accept': 'application/json' };
    if (apiKey) {
      headers['user_key'] = apiKey;
    }

    const response = await fetch(url, { headers, timeout: 10000 });

    if (response.status === 429) {
      throw new Error('Rate limit atteint pour UPCitemdb');
    }

    if (!response.ok) {
      throw new Error(`UPCitemdb error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    return this.normalizeResult(data.items[0]);
  }

  normalizeResult(item) {
    return {
      provider: 'upcitemdb',
      titre: item.title,
      description: item.description,
      marque: item.brand,
      categorie: item.category,
      image_url: item.images?.[0] || null,
      ean: item.ean || item.upc,
      raw: item
    };
  }
}

/**
 * Provider BoardGameGeek - Jeux de societe
 */
class BGGProvider extends BaseProvider {
  async search(code, type = 'ean') {
    // BGG n'a pas de recherche par EAN directe
    return null;
  }

  async searchByName(name) {
    const results = await this.searchByTitle(name, 1);
    return results && results.length > 0 ? results[0] : null;
  }

  async searchByTitle(name, maxResults = 10) {
    const cleanedName = this.cleanTitleForSearch(name);
    const encodedName = encodeURIComponent(cleanedName);
    const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodedName}&type=boardgame`;

    const searchResponse = await fetch(searchUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Liberteko/1.0 (Library Management System)',
        'Accept': 'application/xml, text/xml, */*'
      }
    });

    if (!searchResponse.ok) {
      logger.warn(`BGG search failed with status ${searchResponse.status}`);
      return [];
    }

    const searchText = await searchResponse.text();

    // Extraire tous les IDs de jeux
    const gameIds = [];
    const itemRegex = /<item[^>]*id="(\d+)"[^>]*>[\s\S]*?<name[^>]*value="([^"]*)"[^>]*\/?>[\s\S]*?(?:<yearpublished[^>]*value="(\d+)")?/gi;
    let match;

    while ((match = itemRegex.exec(searchText)) !== null && gameIds.length < maxResults) {
      gameIds.push({
        id: match[1],
        name: match[2],
        year: match[3] || null
      });
    }

    if (gameIds.length === 0) {
      return [];
    }

    // Recuperer les details pour chaque jeu (max 5 a la fois pour eviter timeout)
    const results = [];
    const batchSize = 5;

    for (let i = 0; i < gameIds.length && results.length < maxResults; i += batchSize) {
      const batch = gameIds.slice(i, i + batchSize);
      const ids = batch.map(g => g.id).join(',');

      try {
        const detailUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`;
        const response = await fetch(detailUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Liberteko/1.0 (Library Management System)',
            'Accept': 'application/xml, text/xml, */*'
          }
        });
        const text = await response.text();

        // Parser chaque item
        const itemsRegex = /<item[^>]*id="(\d+)"[^>]*>([\s\S]*?)<\/item>/gi;
        let itemMatch;

        while ((itemMatch = itemsRegex.exec(text)) !== null) {
          const gameId = itemMatch[1];
          const itemXml = itemMatch[2];
          const parsed = this.parseGameXML('<item>' + itemXml + '</item>', gameId);

          if (parsed && parsed.titre) {
            // Ajouter un objet _display pour l'affichage uniforme
            parsed._display = {
              titre: parsed.titre,
              auteurs: parsed.auteur || '',
              editeur: parsed.editeur || '',
              annee: parsed.annee_sortie ? String(parsed.annee_sortie) : '',
              image_url: parsed.thumbnail_url || parsed.image_url || null,
              joueurs: parsed.joueurs_min && parsed.joueurs_max ?
                `${parsed.joueurs_min}-${parsed.joueurs_max} joueurs` : '',
              duree: parsed.duree_partie ? `${parsed.duree_partie} min` : ''
            };
            results.push(parsed);
          }
        }
      } catch (error) {
        logger.warn(`BGG batch fetch error: ${error.message}`);
      }
    }

    return results;
  }

  async getGameById(gameId) {
    const detailUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;

    const response = await fetch(detailUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Liberteko/1.0 (Library Management System)',
        'Accept': 'application/xml, text/xml, */*'
      }
    });

    if (!response.ok) {
      logger.warn(`BGG getGameById failed with status ${response.status}`);
      return null;
    }

    const text = await response.text();
    return this.parseGameXML(text, gameId);
  }

  cleanTitleForSearch(title) {
    if (!title) return '';
    return title
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\b(edition|version|francais|french|anglais|english|vf|vo)\b/gi, '')
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  parseGameXML(xml, gameId) {
    // Extraction des donnees XML
    const getValue = (tag, attr = 'value') => {
      const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
      const match = xml.match(regex);
      return match ? match[1] : null;
    };

    // Nom principal (type="primary")
    const nameMatch = xml.match(/<name[^>]*type="primary"[^>]*value="([^"]*)"/i);
    const name = nameMatch ? nameMatch[1] : getValue('name', 'value');

    // Extraire les categories et mecanismes
    const categories = [];
    const mecanismes = [];
    const designers = [];
    const publishers = [];

    const linkRegex = /<link[^>]*type="([^"]*)"[^>]*value="([^"]*)"/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(xml)) !== null) {
      switch (linkMatch[1]) {
        case 'boardgamecategory':
          categories.push(linkMatch[2]);
          break;
        case 'boardgamemechanic':
          mecanismes.push(linkMatch[2]);
          break;
        case 'boardgamedesigner':
          designers.push(linkMatch[2]);
          break;
        case 'boardgamepublisher':
          if (publishers.length < 3) publishers.push(linkMatch[2]);
          break;
      }
    }

    // Image
    const imageMatch = xml.match(/<image>([^<]+)<\/image>/);
    const thumbnailMatch = xml.match(/<thumbnail>([^<]+)<\/thumbnail>/);

    // Valeurs numeriques
    const yearMatch = xml.match(/<yearpublished[^>]*value="(\d+)"/);
    const minPlayersMatch = xml.match(/<minplayers[^>]*value="(\d+)"/);
    const maxPlayersMatch = xml.match(/<maxplayers[^>]*value="(\d+)"/);
    const playingtimeMatch = xml.match(/<playingtime[^>]*value="(\d+)"/);
    const minAgeMatch = xml.match(/<minage[^>]*value="(\d+)"/);
    const ratingMatch = xml.match(/<average[^>]*value="([^"]*)"/);

    // Description
    const descMatch = xml.match(/<description>([^]*?)<\/description>/);
    let description = descMatch ? descMatch[1] : '';
    description = description
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#10;/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .substring(0, 2000);

    return {
      provider: 'bgg',
      bgg_id: parseInt(gameId),
      titre: name,
      description: description,
      annee_sortie: yearMatch ? parseInt(yearMatch[1]) : null,
      joueurs_min: minPlayersMatch ? parseInt(minPlayersMatch[1]) : null,
      joueurs_max: maxPlayersMatch ? parseInt(maxPlayersMatch[1]) : null,
      duree_partie: playingtimeMatch ? parseInt(playingtimeMatch[1]) : null,
      age_minimum: minAgeMatch ? parseInt(minAgeMatch[1]) : null,
      image_url: imageMatch ? imageMatch[1] : null,
      thumbnail_url: thumbnailMatch ? thumbnailMatch[1] : null,
      note_bgg: ratingMatch ? parseFloat(ratingMatch[1]).toFixed(1) : null,
      auteur: designers.join(', ') || null,
      editeur: publishers[0] || null,
      categories: categories,
      mecanismes: mecanismes,
      url_bgg: `https://boardgamegeek.com/boardgame/${gameId}`,
      raw: { bgg_id: gameId }
    };
  }
}

/**
 * Provider Open Library - Livres (gratuit, sans cle API)
 */
class OpenLibraryProvider extends BaseProvider {
  async search(code, type = 'isbn') {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${code}&format=json&jscmd=data`;

    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`OpenLibrary error: ${response.status}`);
    }

    const data = await response.json();
    const key = `ISBN:${code}`;

    if (!data[key]) {
      return null;
    }

    return this.normalizeResult(data[key], code);
  }

  async searchByName(name) {
    const encodedName = encodeURIComponent(name);
    const url = `https://openlibrary.org/search.json?q=${encodedName}&limit=5`;

    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.docs || data.docs.length === 0) return null;

    const book = data.docs[0];
    return {
      provider: 'openlibrary',
      titre: book.title,
      auteurs: book.author_name || [],
      annee_publication: book.first_publish_year,
      editeur: book.publisher?.[0],
      isbn: book.isbn?.[0],
      nombre_pages: book.number_of_pages_median,
      sujets: book.subject?.slice(0, 10) || [],
      image_url: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : null,
      raw: book
    };
  }

  normalizeResult(book, isbn) {
    return {
      provider: 'openlibrary',
      titre: book.title,
      sous_titre: book.subtitle,
      auteurs: book.authors?.map(a => a.name) || [],
      editeur: book.publishers?.[0]?.name,
      annee_publication: book.publish_date,
      nombre_pages: book.number_of_pages,
      isbn: isbn,
      sujets: book.subjects?.map(s => s.name).slice(0, 10) || [],
      image_url: book.cover?.large || book.cover?.medium || null,
      url_openlibrary: book.url,
      raw: book
    };
  }
}

/**
 * Provider Google Books - Livres
 */
class GoogleBooksProvider extends BaseProvider {
  async search(code, type = 'isbn') {
    const apiKey = this.config.getDecryptedApiKey();
    let url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${code}`;

    if (apiKey) {
      url += `&key=${apiKey}`;
    }

    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`Google Books error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    return this.normalizeResult(data.items[0], code);
  }

  async searchByName(name) {
    const results = await this.searchByTitle(name);
    return results && results.length > 0 ? results[0] : null;
  }

  async searchByTitle(name, maxResults = 10) {
    const apiKey = this.config.getDecryptedApiKey();
    const encodedName = encodeURIComponent(name);
    let url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodedName}&maxResults=${maxResults}&langRestrict=fr`;

    if (apiKey) {
      url += `&key=${apiKey}`;
    }

    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.items || data.items.length === 0) return [];

    return data.items.map(item => this.normalizeResult(item));
  }

  normalizeResult(item, isbn = null) {
    const info = item.volumeInfo || {};
    const identifiers = info.industryIdentifiers || [];
    const foundIsbn = identifiers.find(id => id.type === 'ISBN_13')?.identifier ||
                      identifiers.find(id => id.type === 'ISBN_10')?.identifier ||
                      isbn;

    return {
      provider: 'googlebooks',
      titre: info.title,
      sous_titre: info.subtitle,
      auteurs: info.authors || [],
      editeur: info.publisher,
      annee_publication: info.publishedDate?.substring(0, 4),
      description: info.description?.substring(0, 2000),
      nombre_pages: info.pageCount,
      isbn: foundIsbn,
      langue: info.language,
      categories: info.categories || [],
      image_url: info.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
      note_moyenne: info.averageRating,
      raw: item
    };
  }
}

/**
 * Provider BNF (Bibliotheque Nationale de France) - Livres francais
 * Utilise l'API SRU de data.bnf.fr (gratuit, sans cle API)
 */
class BNFProvider extends BaseProvider {
  async search(code, type = 'isbn') {
    // Normaliser l'ISBN
    const cleanIsbn = code.replace(/[- ]/g, '');

    // API SRU de la BNF avec recherche par ISBN
    const url = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=bib.isbn%20adj%20%22${cleanIsbn}%22&recordSchema=dublincore&maximumRecords=1`;

    const response = await fetch(url, { timeout: 15000 });
    if (!response.ok) {
      throw new Error(`BNF error: ${response.status}`);
    }

    const text = await response.text();

    // Verifier si on a des resultats
    const numberOfRecords = text.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/);
    if (!numberOfRecords || parseInt(numberOfRecords[1]) === 0) {
      return null;
    }

    return this.parseXML(text, cleanIsbn);
  }

  async searchByName(name) {
    const results = await this.searchByTitle(name);
    return results && results.length > 0 ? results[0] : null;
  }

  async searchByTitle(name, maxResults = 10) {
    const encodedName = encodeURIComponent(name);
    const url = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=bib.title%20all%20%22${encodedName}%22&recordSchema=dublincore&maximumRecords=${maxResults}`;

    const response = await fetch(url, { timeout: 15000 });
    if (!response.ok) return [];

    const text = await response.text();

    const numberOfRecords = text.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/);
    if (!numberOfRecords || parseInt(numberOfRecords[1]) === 0) {
      return [];
    }

    return this.parseMultipleXML(text);
  }

  parseMultipleXML(xml) {
    const results = [];
    // Extraire chaque record
    const recordRegex = /<srw:record>([\s\S]*?)<\/srw:record>/g;
    let match;

    while ((match = recordRegex.exec(xml)) !== null) {
      const recordXml = match[1];
      const parsed = this.parseSingleRecord(recordXml);
      if (parsed && parsed.titre) {
        results.push(parsed);
      }
    }

    return results;
  }

  parseSingleRecord(xml) {
    // Fonctions d'extraction XML
    const getValue = (tag) => {
      const regex = new RegExp(`<dc:${tag}>([^<]*)</dc:${tag}>`, 'i');
      const match = xml.match(regex);
      return match ? this.decodeXmlEntities(match[1]) : null;
    };

    const getAllValues = (tag) => {
      const regex = new RegExp(`<dc:${tag}>([^<]*)</dc:${tag}>`, 'gi');
      const matches = [];
      let match;
      while ((match = regex.exec(xml)) !== null) {
        matches.push(this.decodeXmlEntities(match[1]));
      }
      return matches;
    };

    const rawTitle = getValue('title');
    if (!rawTitle) return null;

    // Parser le titre BNF pour extraire titre, sous-titre et contributeurs
    const { titre, sousTitre, contributeurs } = this.parseBNFTitle(rawTitle);

    // Auteurs depuis dc:creator
    const creators = getAllValues('creator');
    const auteursFromCreator = creators.map(c => {
      const parsed = this.parseAuthorName(c);
      let role = 'auteur';
      if (/Traducteur/i.test(c)) role = 'traducteur';
      else if (/Illustrateur|Dessinateur/i.test(c)) role = 'illustrateur';
      else if (/Sc[ée]nariste/i.test(c)) role = 'scenariste';
      else if (/Coloriste/i.test(c)) role = 'coloriste';
      return { ...parsed, role };
    });

    // Fusionner contributeurs du titre et du creator
    const allContributeurs = [...auteursFromCreator];
    for (const contrib of contributeurs) {
      const exists = allContributeurs.some(a =>
        a.nom.toLowerCase() === contrib.nom.toLowerCase() &&
        (!a.prenom || !contrib.prenom || a.prenom.toLowerCase() === contrib.prenom.toLowerCase())
      );
      if (!exists) {
        allContributeurs.push(contrib);
      }
    }

    const editeurFromTitle = contributeurs.find(c => c.role === 'editeur');
    const auteursList = allContributeurs.filter(c => c.role !== 'editeur');

    // Editeur et date depuis publisher
    const publishers = getAllValues('publisher');
    let editeur = editeurFromTitle?.nom || null;
    let annee = null;

    for (const pub of publishers) {
      const parts = pub.split(/[,:]/).map(p => p.trim());
      if (parts.length >= 2) {
        for (const part of parts) {
          if (/^\d{4}$/.test(part)) {
            annee = part;
          } else if (!editeur && part.length > 3 && !/^[A-Z][a-z]+$/.test(part)) {
            editeur = part;
          }
        }
      }
    }

    // Date directe
    const dates = getAllValues('date');
    if (!annee && dates.length > 0) {
      const yearMatch = dates[0].match(/(\d{4})/);
      if (yearMatch) annee = yearMatch[1];
    }

    // Description
    const description = getValue('description');

    // Sujets
    const subjects = getAllValues('subject');

    // Langue
    const language = getValue('language');

    // Identifiant BNF (ark) et ISBN
    const identifiers = getAllValues('identifier');
    let arkId = null;
    let foundIsbn = null;
    for (const id of identifiers) {
      if (id.includes('ark:/')) {
        arkId = id;
      } else if (/^\d{10,13}$/.test(id.replace(/[- ]/g, ''))) {
        foundIsbn = id;
      }
    }

    // Format/type - nombre de pages
    const formats = getAllValues('format');
    let nombrePages = null;
    for (const fmt of formats) {
      const pagesMatch = fmt.match(/(\d+)\s*p/i);
      if (pagesMatch) {
        nombrePages = parseInt(pagesMatch[1]);
        break;
      }
    }

    return {
      provider: 'bnf',
      titre: titre,
      sous_titre: sousTitre || null,
      auteurs: auteursList,
      editeur: editeur,
      annee_publication: annee,
      isbn: foundIsbn,
      nombre_pages: nombrePages,
      description: description,
      sujets: subjects.slice(0, 10),
      langue: language,
      ark_id: arkId,
      url_bnf: arkId ? `https://data.bnf.fr/${arkId}` : null
    };
  }

  /**
   * Parse le titre BNF pour extraire titre, sous-titre et contributeurs
   * Format BNF: "Titre : sous-titre / auteur1 ; traduit par X ; [edite par] Y"
   */
  parseBNFTitle(rawTitle) {
    if (!rawTitle) return { titre: '', sousTitre: '', contributeurs: [] };

    let titre = rawTitle;
    let sousTitre = '';
    const contributeurs = [];

    // 1. Separer la partie avant "/" (titre+soustitre) de la partie apres (contributeurs)
    const slashIndex = rawTitle.indexOf(' / ');
    let contributeursPart = '';

    if (slashIndex > -1) {
      titre = rawTitle.substring(0, slashIndex).trim();
      contributeursPart = rawTitle.substring(slashIndex + 3).trim();
    }

    // 2. Separer titre et sous-titre (souvent separes par " : ")
    const colonIndex = titre.indexOf(' : ');
    if (colonIndex > -1) {
      sousTitre = titre.substring(colonIndex + 3).trim();
      titre = titre.substring(0, colonIndex).trim();
    }

    // 3. Parser les contributeurs (separes par " ; ")
    if (contributeursPart) {
      const parts = contributeursPart.split(/\s*;\s*/);

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        // Detecter editeur: "[édité par] Marvel" ou "[ed. par] X"
        const editeurMatch = trimmed.match(/^\[(?:[ée]dit[ée]|ed\.?)\s+par\]\s*(.+)$/i);
        if (editeurMatch) {
          contributeurs.push({
            nom: editeurMatch[1].trim(),
            role: 'editeur'
          });
          continue;
        }

        // Detecter traducteur: "traduit de l'anglais par X" ou "trad. par X"
        const traducteurMatch = trimmed.match(/(?:traduit|trad\.?)\s+(?:de\s+[^p]+\s+)?par\s+(.+)$/i);
        if (traducteurMatch) {
          contributeurs.push({
            ...this.parseAuthorName(traducteurMatch[1].trim()),
            role: 'traducteur'
          });
          continue;
        }

        // Detecter illustrateur: "illustrations de X" ou "dessins de X"
        const illustrateurMatch = trimmed.match(/(?:illustrations?|dessins?|dessin[ée])\s+(?:de|par)\s+(.+)$/i);
        if (illustrateurMatch) {
          contributeurs.push({
            ...this.parseAuthorName(illustrateurMatch[1].trim()),
            role: 'illustrateur'
          });
          continue;
        }

        // Detecter scenariste: "scenario de X"
        const scenaristeMatch = trimmed.match(/sc[ée]nario\s+(?:de|par)\s+(.+)$/i);
        if (scenaristeMatch) {
          contributeurs.push({
            ...this.parseAuthorName(scenaristeMatch[1].trim()),
            role: 'scenariste'
          });
          continue;
        }

        // Detecter coloriste: "couleurs de X"
        const coloristeMatch = trimmed.match(/couleurs?\s+(?:de|par)\s+(.+)$/i);
        if (coloristeMatch) {
          contributeurs.push({
            ...this.parseAuthorName(coloristeMatch[1].trim()),
            role: 'coloriste'
          });
          continue;
        }

        // Sinon, c'est probablement un auteur
        contributeurs.push({
          ...this.parseAuthorName(trimmed),
          role: 'auteur'
        });
      }
    }

    return { titre, sousTitre, contributeurs };
  }

  /**
   * Parse un nom d'auteur BNF
   * Formats: "Nom, Prenom (dates)" ou "Prenom Nom (dates)"
   */
  parseAuthorName(rawName) {
    if (!rawName) return { nom: '', prenom: '' };

    let name = rawName;

    // Supprimer les dates entre parentheses "(1970-....)" ou "(1945-2020)"
    name = name.replace(/\s*\(\d{4}(?:-(?:\d{4}|\.{3,4}))?\)\s*/g, '').trim();

    // Supprimer suffixes de role BNF "Auteur du texte", "Illustrateur", etc.
    name = name.replace(/\.\s*(?:Auteur[^,]*|Illustrateur[^,]*|Traducteur[^,]*|Sc[ée]nariste[^,]*|Dessinateur[^,]*)$/i, '').trim();

    // Si format "Nom, Prenom"
    if (name.includes(',')) {
      const parts = name.split(',').map(p => p.trim());
      return {
        nom: parts[0],
        prenom: parts.slice(1).join(' ').trim()
      };
    }

    // Sinon format "Prenom Nom" - le dernier mot est le nom
    const words = name.split(/\s+/);
    if (words.length >= 2) {
      return {
        nom: words[words.length - 1],
        prenom: words.slice(0, -1).join(' ')
      };
    }

    return { nom: name, prenom: '' };
  }

  parseXML(xml, isbn = null) {
    // Fonctions d'extraction XML
    const getValue = (tag) => {
      const regex = new RegExp(`<dc:${tag}>([^<]*)</dc:${tag}>`, 'i');
      const match = xml.match(regex);
      return match ? this.decodeXmlEntities(match[1]) : null;
    };

    const getAllValues = (tag) => {
      const regex = new RegExp(`<dc:${tag}>([^<]*)</dc:${tag}>`, 'gi');
      const matches = [];
      let match;
      while ((match = regex.exec(xml)) !== null) {
        matches.push(this.decodeXmlEntities(match[1]));
      }
      return matches;
    };

    const rawTitle = getValue('title');
    if (!rawTitle) return null;

    // Parser le titre BNF pour extraire titre, sous-titre et contributeurs
    const { titre, sousTitre, contributeurs } = this.parseBNFTitle(rawTitle);

    // Auteurs depuis dc:creator (format BNF: "Nom, Prenom (dates). Role")
    const creators = getAllValues('creator');
    const auteursFromCreator = creators.map(c => {
      const parsed = this.parseAuthorName(c);
      // Detecter le role depuis le suffixe BNF
      let role = 'auteur';
      if (/Traducteur/i.test(c)) role = 'traducteur';
      else if (/Illustrateur|Dessinateur/i.test(c)) role = 'illustrateur';
      else if (/Sc[ée]nariste/i.test(c)) role = 'scenariste';
      else if (/Coloriste/i.test(c)) role = 'coloriste';
      return { ...parsed, role };
    });

    // Fusionner contributeurs du titre et du creator (eviter doublons)
    const allContributeurs = [...auteursFromCreator];
    for (const contrib of contributeurs) {
      // Verifier si deja present
      const exists = allContributeurs.some(a =>
        a.nom.toLowerCase() === contrib.nom.toLowerCase() &&
        (!a.prenom || !contrib.prenom || a.prenom.toLowerCase() === contrib.prenom.toLowerCase())
      );
      if (!exists) {
        allContributeurs.push(contrib);
      }
    }

    // Separer les auteurs/contributeurs de l'editeur extrait du titre
    const editeurFromTitle = contributeurs.find(c => c.role === 'editeur');
    const auteursList = allContributeurs.filter(c => c.role !== 'editeur');

    // Editeur et date depuis publisher
    const publishers = getAllValues('publisher');
    let editeur = editeurFromTitle?.nom || null;
    let annee = null;

    for (const pub of publishers) {
      // Format typique BNF: "Paris : Gallimard , 2020"
      const parts = pub.split(/[,:]/).map(p => p.trim());
      if (parts.length >= 2) {
        // Trouver l'editeur (pas une ville, pas une date)
        for (const part of parts) {
          if (/^\d{4}$/.test(part)) {
            annee = part;
          } else if (!editeur && part.length > 3 && !/^[A-Z][a-z]+$/.test(part)) {
            // Probablement l'editeur (pas juste un nom de ville)
            editeur = part;
          }
        }
      }
    }

    // Date directe
    const dates = getAllValues('date');
    if (!annee && dates.length > 0) {
      const yearMatch = dates[0].match(/(\d{4})/);
      if (yearMatch) annee = yearMatch[1];
    }

    // Description
    const description = getValue('description');

    // Sujets
    const subjects = getAllValues('subject');

    // Langue
    const language = getValue('language');

    // Identifiant BNF (ark)
    const identifiers = getAllValues('identifier');
    let arkId = null;
    let foundIsbn = isbn;
    for (const id of identifiers) {
      if (id.includes('ark:/')) {
        arkId = id;
      } else if (/^\d{10,13}$/.test(id.replace(/[- ]/g, ''))) {
        foundIsbn = id;
      }
    }

    // Format/type
    const formats = getAllValues('format');
    let nombrePages = null;
    for (const fmt of formats) {
      const pagesMatch = fmt.match(/(\d+)\s*p/i);
      if (pagesMatch) {
        nombrePages = parseInt(pagesMatch[1]);
        break;
      }
    }

    return {
      provider: 'bnf',
      titre: titre,
      sous_titre: sousTitre || null,
      auteurs: auteursList, // Array d'objets {nom, prenom, role}
      editeur: editeur,
      annee_publication: annee,
      isbn: foundIsbn,
      nombre_pages: nombrePages,
      description: description,
      sujets: subjects.slice(0, 10),
      langue: language,
      ark_id: arkId,
      url_bnf: arkId ? `https://data.bnf.fr/${arkId}` : null,
      raw: { xml_snippet: xml.substring(0, 1000) }
    };
  }

  decodeXmlEntities(str) {
    if (!str) return str;
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code));
  }
}

/**
 * Provider TMDB - Films et series
 */
class TMDBProvider extends BaseProvider {
  async search(code, type = 'ean') {
    // TMDB n'a pas de recherche par EAN/UPC directement
    return null;
  }

  async searchByName(name, mediaType = 'movie') {
    const apiKey = this.config.getDecryptedApiKey();
    if (!apiKey) {
      throw new Error('TMDB requires an API key');
    }

    const encodedName = encodeURIComponent(name);
    const url = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${apiKey}&query=${encodedName}&language=fr-FR`;

    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`TMDB error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    // Obtenir les details complets
    const item = data.results[0];
    return this.getDetails(item.id, mediaType);
  }

  async getDetails(id, mediaType = 'movie') {
    const apiKey = this.config.getDecryptedApiKey();
    const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${apiKey}&language=fr-FR&append_to_response=credits`;

    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) return null;

    const data = await response.json();
    return this.normalizeResult(data, mediaType);
  }

  normalizeResult(item, mediaType = 'movie') {
    const isMovie = mediaType === 'movie';

    const realisateurs = item.credits?.crew
      ?.filter(c => c.job === 'Director')
      .map(c => c.name) || [];

    const acteurs = item.credits?.cast
      ?.slice(0, 10)
      .map(c => c.name) || [];

    return {
      provider: 'tmdb',
      tmdb_id: item.id,
      titre: isMovie ? item.title : item.name,
      titre_original: isMovie ? item.original_title : item.original_name,
      description: item.overview?.substring(0, 2000),
      annee_sortie: (isMovie ? item.release_date : item.first_air_date)?.substring(0, 4),
      duree: isMovie ? item.runtime : (item.episode_run_time?.[0] || null),
      genres: item.genres?.map(g => g.name) || [],
      realisateurs: realisateurs,
      acteurs: acteurs,
      pays_production: item.production_countries?.map(c => c.name) || [],
      langue_originale: item.original_language,
      note_moyenne: item.vote_average,
      image_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      type_media: mediaType,
      url_tmdb: `https://www.themoviedb.org/${mediaType}/${item.id}`,
      raw: item
    };
  }
}

/**
 * Provider MusicBrainz - Musique (gratuit, limite 1 req/sec)
 */
class MusicBrainzProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.lastCall = 0;
  }

  async search(code, type = 'barcode') {
    await this.rateLimitPause();

    const url = `https://musicbrainz.org/ws/2/release/?query=barcode:${code}&fmt=json`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Liberteko/1.0 (contact@liberteko.fr)' },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`MusicBrainz error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.releases || data.releases.length === 0) {
      return null;
    }

    const release = data.releases[0];
    return this.getDetails(release.id);
  }

  async getDetails(releaseId) {
    await this.rateLimitPause();

    const url = `https://musicbrainz.org/ws/2/release/${releaseId}?inc=artist-credits+labels+recordings&fmt=json`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Liberteko/1.0 (contact@liberteko.fr)' },
      timeout: 10000
    });

    if (!response.ok) return null;

    const data = await response.json();
    return this.normalizeResult(data);
  }

  async searchByName(name) {
    await this.rateLimitPause();

    const encodedName = encodeURIComponent(name);
    const url = `https://musicbrainz.org/ws/2/release/?query=${encodedName}&fmt=json&limit=5`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Liberteko/1.0 (contact@liberteko.fr)' },
      timeout: 10000
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.releases || data.releases.length === 0) return null;

    return this.getDetails(data.releases[0].id);
  }

  normalizeResult(release) {
    const artistes = release['artist-credit']?.map(ac => ac.name || ac.artist?.name).filter(Boolean) || [];
    const label = release['label-info']?.[0]?.label?.name;

    const pistes = release.media?.[0]?.tracks?.map(t => ({
      position: t.position,
      titre: t.title,
      duree: t.length ? Math.round(t.length / 1000) : null
    })) || [];

    return {
      provider: 'musicbrainz',
      musicbrainz_id: release.id,
      titre: release.title,
      artistes: artistes,
      label: label,
      annee_sortie: release.date?.substring(0, 4),
      pays: release.country,
      format: release.media?.[0]?.format,
      nombre_pistes: pistes.length,
      pistes: pistes,
      code_barres: release.barcode,
      url_musicbrainz: `https://musicbrainz.org/release/${release.id}`,
      raw: release
    };
  }

  async rateLimitPause() {
    const elapsed = Date.now() - this.lastCall;
    if (elapsed < 1100) {
      await new Promise(resolve => setTimeout(resolve, 1100 - elapsed));
    }
    this.lastCall = Date.now();
  }
}

/**
 * Provider Discogs - Musique (necessite token)
 */
class DiscogsProvider extends BaseProvider {
  async search(code, type = 'barcode') {
    const token = this.config.getDecryptedApiKey();
    if (!token) {
      throw new Error('Discogs requires an API token');
    }

    const url = `https://api.discogs.com/database/search?barcode=${code}&token=${token}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Liberteko/1.0' },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Discogs error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const item = data.results[0];
    if (item.type === 'release' && item.id) {
      return this.getRelease(item.id);
    }

    return this.normalizeResult(item);
  }

  async getRelease(releaseId) {
    const token = this.config.getDecryptedApiKey();
    const url = `https://api.discogs.com/releases/${releaseId}?token=${token}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Liberteko/1.0' },
      timeout: 10000
    });

    if (!response.ok) return null;

    const data = await response.json();
    return this.normalizeResult(data, true);
  }

  normalizeResult(item, isDetailed = false) {
    const artistes = item.artists?.map(a => a.name) || [item.title?.split(' - ')[0]];
    const titre = item.title?.includes(' - ') ? item.title.split(' - ').slice(1).join(' - ') : item.title;

    const result = {
      provider: 'discogs',
      discogs_id: item.id,
      titre: titre,
      artistes: artistes.filter(Boolean),
      label: isDetailed ? item.labels?.[0]?.name : null,
      annee_sortie: item.year?.toString(),
      pays: item.country,
      genres: [...(item.genre || []), ...(item.style || [])],
      format: isDetailed ? item.formats?.[0]?.name : item.format?.[0],
      image_url: item.cover_image || item.images?.[0]?.uri,
      url_discogs: item.uri || `https://www.discogs.com/release/${item.id}`,
      raw: item
    };

    if (isDetailed && item.tracklist) {
      result.pistes = item.tracklist.map(t => ({
        position: t.position,
        titre: t.title,
        duree: t.duration
      }));
      result.nombre_pistes = item.tracklist.length;
    }

    return result;
  }
}

// ==================== SERVICE PRINCIPAL ====================

/**
 * Factory pour creer le bon provider selon la configuration
 */
function createProvider(config) {
  switch (config.provider) {
    case 'upcitemdb':
      return new UPCitemdbProvider(config);
    case 'bgg':
      return new BGGProvider(config);
    case 'openlibrary':
      return new OpenLibraryProvider(config);
    case 'googlebooks':
      return new GoogleBooksProvider(config);
    case 'bnf':
      return new BNFProvider(config);
    case 'tmdb':
      return new TMDBProvider(config);
    case 'musicbrainz':
      return new MusicBrainzProvider(config);
    case 'discogs':
      return new DiscogsProvider(config);
    case 'wikiludo':
      return new WikiludoProvider(config);
    default:
      logger.warn(`Unknown provider: ${config.provider}`);
      return null;
  }
}

/**
 * Detecte le type de code (EAN-13, ISBN-10, ISBN-13, UPC-A)
 */
function detectCodeType(code) {
  const cleaned = code.replace(/[- ]/g, '');

  if (cleaned.length === 13) {
    if (cleaned.startsWith('978') || cleaned.startsWith('979')) {
      return 'isbn';
    }
    return 'ean';
  }

  if (cleaned.length === 10) {
    return 'isbn';
  }

  if (cleaned.length === 12) {
    return 'upc';
  }

  return 'unknown';
}

/**
 * Detecte la collection probable selon le code
 */
function guessCollection(code) {
  const cleaned = code.replace(/[- ]/g, '');

  // ISBN = livres
  if (cleaned.startsWith('978') || cleaned.startsWith('979') || cleaned.length === 10) {
    return 'livre';
  }

  // Par defaut, on ne sait pas
  return null;
}

/**
 * Recherche un produit par son code EAN/ISBN
 * @param {string} code - Code EAN ou ISBN
 * @param {string} collection - Type de collection (jeu, livre, film, disque) ou null pour auto
 * @param {object} options - Options de recherche
 */
async function lookupEAN(code, collection = null, options = {}) {
  const { forceRefresh = false, specificProvider = null } = options;

  // Normaliser le code
  code = code.toString().trim().replace(/\D/g, '');

  if (code.length < 8 || code.length > 14) {
    throw new Error('Code EAN invalide (doit contenir 8 a 14 chiffres)');
  }

  // Detecter automatiquement la collection si non specifiee
  if (!collection) {
    collection = guessCollection(code);
  }

  // Verifier le cache
  const cacheKey = `ean:${code}:${collection || 'auto'}`;
  if (!forceRefresh && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < (cached.data.found ? CACHE_LONG_TTL : CACHE_TTL)) {
      logger.debug(`EAN Lookup cache hit: ${code}`);
      return { ...cached.data, source: 'cache', cached: true };
    }
    cache.delete(cacheKey);
  }

  // Obtenir les configurations API actives
  let configs;
  try {
    configs = await ConfigurationAPI.getByType('ean_lookup', true);
  } catch (error) {
    logger.warn('ConfigurationAPI not available, using fallback');
    configs = [];
  }

  // Si pas de config, utiliser le mode legacy (UPCitemdb + BGG)
  if (configs.length === 0) {
    return legacyLookup(code, collection, cacheKey);
  }

  // Filtrer par collection si specifie
  let filteredConfigs = configs;
  if (collection) {
    filteredConfigs = configs.filter(c =>
      !c.collections_supportees || c.collections_supportees.includes(collection)
    );
  }

  if (filteredConfigs.length === 0 && configs.length > 0) {
    // Utiliser toutes les configs si aucune ne correspond a la collection
    filteredConfigs = configs;
  }

  // Si un provider specifique est demande, filtrer
  if (specificProvider) {
    filteredConfigs = filteredConfigs.filter(c => c.provider === specificProvider);
    if (filteredConfigs.length === 0) {
      throw new Error(`Provider '${specificProvider}' non configure ou non disponible`);
    }
  }

  const result = {
    found: false,
    ean: code,
    collection: collection,
    source: null,
    jeu: null,
    livre: null,
    film: null,
    disque: null,
    data: null,
    providers_tried: [],
    errors: []
  };

  // Essayer chaque provider dans l'ordre de priorite
  for (const config of filteredConfigs) {
    if (!config.peutFaireRequete()) {
      result.providers_tried.push({ provider: config.provider, status: 'rate_limited' });
      continue;
    }

    try {
      const provider = createProvider(config);
      if (!provider) continue;

      const codeType = detectCodeType(code);
      logger.info(`[EAN Lookup] Trying ${config.provider} for ${code} (type: ${codeType})`);

      const data = await provider.search(code, codeType);

      await config.incrementerCompteur(!!data);

      result.providers_tried.push({
        provider: config.provider,
        status: data ? 'success' : 'not_found'
      });

      if (data) {
        result.found = true;
        result.source = config.provider;
        result.data = data;

        // Mapper vers le format legacy pour compatibilite
        mapToLegacyFormat(result, data, collection);

        // Enrichir avec BGG pour les jeux
        if ((collection === 'jeu' || !collection) && data.titre && config.provider !== 'bgg') {
          await enrichWithBGG(result, data.titre, filteredConfigs);
        }

        // Mettre en cache
        cache.set(cacheKey, { timestamp: Date.now(), data: result });

        return result;
      }
    } catch (error) {
      logger.error(`EAN Lookup error with ${config.provider}:`, error.message);

      try {
        await config.updateStatus(`error: ${error.message.substring(0, 50)}`);
      } catch (e) { /* ignore */ }

      result.providers_tried.push({
        provider: config.provider,
        status: 'error',
        error: error.message
      });
      result.errors.push({ provider: config.provider, message: error.message });
    }
  }

  // Mettre en cache meme si non trouve
  cache.set(cacheKey, { timestamp: Date.now(), data: result });

  return result;
}

/**
 * Mode legacy pour compatibilite (UPCitemdb + BGG)
 */
async function legacyLookup(code, collection, cacheKey) {
  const result = {
    found: false,
    ean: code,
    source: null,
    jeu: null
  };

  try {
    // UPCitemdb
    const upcUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`;
    const upcResponse = await fetch(upcUrl, {
      headers: { 'Accept': 'application/json' },
      timeout: 10000
    });

    if (upcResponse.ok) {
      const upcData = await upcResponse.json();

      if (upcData.items && upcData.items.length > 0) {
        const item = upcData.items[0];
        result.found = true;
        result.source = 'upcitemdb';
        result.jeu = {
          titre: item.title,
          editeur: item.brand || null,
          image_url: item.images?.[0] || null
        };

        // Enrichir avec BGG
        if (item.title) {
          const bggProvider = new BGGProvider({ provider: 'bgg' });
          try {
            const bggData = await bggProvider.searchByName(item.title);
            if (bggData) {
              result.source = 'upcitemdb+bgg';
              result.jeu = {
                ...result.jeu,
                titre: bggData.titre || result.jeu.titre,
                editeur: bggData.editeur || result.jeu.editeur,
                auteur: bggData.auteur,
                annee_sortie: bggData.annee_sortie,
                age_min: bggData.age_minimum,
                nb_joueurs_min: bggData.joueurs_min,
                nb_joueurs_max: bggData.joueurs_max,
                duree_partie: bggData.duree_partie,
                categorie: bggData.categories?.[0],
                description: bggData.description,
                image_url: bggData.image_url || result.jeu.image_url,
                bgg_id: bggData.bgg_id,
                bgg_rating: bggData.note_bgg
              };
            }
          } catch (e) {
            logger.warn('BGG enrichment failed:', e.message);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Legacy lookup error:', error.message);
  }

  cache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}

/**
 * Mappe les donnees vers le format legacy
 */
function mapToLegacyFormat(result, data, collection) {
  const col = collection || 'jeu';

  if (col === 'jeu' || data.provider === 'bgg' || data.provider === 'upcitemdb') {
    result.jeu = {
      titre: data.titre,
      editeur: data.editeur || data.marque,
      auteur: data.auteur,
      annee_sortie: data.annee_sortie,
      age_min: data.age_minimum,
      nb_joueurs_min: data.joueurs_min,
      nb_joueurs_max: data.joueurs_max,
      duree_partie: data.duree_partie,
      categorie: data.categories?.[0] || data.categorie,
      description: data.description,
      image_url: data.image_url,
      bgg_id: data.bgg_id,
      bgg_rating: data.note_bgg
    };
  }

  if (col === 'livre') {
    result.livre = {
      titre: data.titre,
      auteur: data.auteurs?.join(', '),
      editeur: data.editeur,
      annee_publication: data.annee_publication,
      isbn: data.isbn,
      nombre_pages: data.nombre_pages,
      description: data.description,
      image_url: data.image_url,
      genres: data.categories || data.sujets
    };
  }

  if (col === 'film') {
    result.film = {
      titre: data.titre,
      realisateur: data.realisateurs?.join(', '),
      acteurs: data.acteurs,
      annee_sortie: data.annee_sortie,
      duree: data.duree,
      description: data.description,
      image_url: data.image_url,
      genres: data.genres,
      tmdb_id: data.tmdb_id
    };
  }

  if (col === 'disque') {
    result.disque = {
      titre: data.titre,
      artiste: data.artistes?.join(', '),
      label: data.label,
      annee_sortie: data.annee_sortie,
      format: data.format,
      nombre_pistes: data.nombre_pistes,
      image_url: data.image_url,
      genres: data.genres
    };
  }
}

/**
 * Enrichit avec BGG si disponible
 */
async function enrichWithBGG(result, titre, configs) {
  const bggConfig = configs.find(c => c.provider === 'bgg');

  try {
    const bggProvider = bggConfig ? createProvider(bggConfig) : new BGGProvider({ provider: 'bgg' });
    const bggData = await bggProvider.searchByName(titre);

    if (bggData && bggConfig) {
      await bggConfig.incrementerCompteur(true);
    }

    if (bggData) {
      result.source = result.source + '+bgg';

      if (result.jeu) {
        result.jeu = {
          ...result.jeu,
          titre: bggData.titre || result.jeu.titre,
          editeur: bggData.editeur || result.jeu.editeur,
          auteur: bggData.auteur,
          annee_sortie: bggData.annee_sortie,
          age_min: bggData.age_minimum,
          nb_joueurs_min: bggData.joueurs_min,
          nb_joueurs_max: bggData.joueurs_max,
          duree_partie: bggData.duree_partie,
          categorie: bggData.categories?.[0],
          description: bggData.description || result.jeu.description,
          image_url: bggData.image_url || result.jeu.image_url,
          bgg_id: bggData.bgg_id,
          bgg_rating: bggData.note_bgg
        };
      }
    }
  } catch (error) {
    logger.warn('BGG enrichment failed:', error.message);
  }
}

/**
 * Recherche par titre directement
 */
async function lookupByTitle(title, collection = 'jeu') {
  try {
    let configs = [];
    try {
      configs = await ConfigurationAPI.getByType('ean_lookup', true);
      configs = configs.filter(c =>
        !c.collections_supportees || c.collections_supportees.includes(collection)
      );
    } catch (e) { /* ignore */ }

    // Choisir le provider selon la collection
    let provider;
    if (collection === 'jeu') {
      const bggConfig = configs.find(c => c.provider === 'bgg');
      provider = bggConfig ? createProvider(bggConfig) : new BGGProvider({ provider: 'bgg' });
    } else if (collection === 'livre') {
      const config = configs.find(c => c.provider === 'bnf' || c.provider === 'openlibrary' || c.provider === 'googlebooks');
      provider = config ? createProvider(config) : new OpenLibraryProvider({ provider: 'openlibrary' });
    } else if (collection === 'film') {
      const config = configs.find(c => c.provider === 'tmdb');
      if (!config) throw new Error('TMDB non configure');
      provider = createProvider(config);
    } else if (collection === 'disque') {
      const config = configs.find(c => c.provider === 'musicbrainz' || c.provider === 'discogs');
      provider = config ? createProvider(config) : new MusicBrainzProvider({ provider: 'musicbrainz' });
    }

    if (!provider) {
      throw new Error(`Pas de provider pour la collection: ${collection}`);
    }

    const data = await provider.searchByName(title, collection);

    if (data) {
      const result = { found: true, source: data.provider, jeu: null, livre: null, film: null, disque: null };
      mapToLegacyFormat(result, data, collection);
      return result;
    }

    return { found: false, source: null };
  } catch (error) {
    logger.error('[Title Lookup] Error:', error.message);
    throw error;
  }
}

/**
 * Recherche par titre avec resultats multiples
 * @param {string} title - Titre a rechercher
 * @param {string} collection - Type de collection (livre, jeu, film, disque)
 * @param {number} maxResults - Nombre maximum de resultats
 * @param {string} specificProvider - Provider specifique a utiliser (optionnel)
 */
async function searchByTitleMultiple(title, collection = 'livre', maxResults = 10, specificProvider = null) {
  try {
    let configs = [];
    try {
      configs = await ConfigurationAPI.getByType('ean_lookup', true);
      // Ajouter aussi les providers ISBN pour les livres
      if (collection === 'livre') {
        const isbnConfigs = await ConfigurationAPI.getByType('isbn_lookup', true);
        configs = [...configs, ...isbnConfigs];
      }
      configs = configs.filter(c =>
        !c.collections_supportees || c.collections_supportees.includes(collection)
      );
    } catch (e) { /* ignore */ }

    const results = [];
    const providersUsed = [];

    // Pour les jeux, utiliser BGG
    if (collection === 'jeu') {
      if (!specificProvider || specificProvider === 'bgg') {
        const bggConfig = configs.find(c => c.provider === 'bgg');
        const bggProvider = bggConfig ? createProvider(bggConfig) : new BGGProvider({ provider: 'bgg' });

        try {
          if (bggConfig && !bggConfig.peutFaireRequete()) {
            providersUsed.push({ provider: 'bgg', status: 'rate_limited' });
          } else {
            const bggResults = await bggProvider.searchByTitle(title, maxResults);

            if (bggConfig) {
              await bggConfig.incrementerCompteur(bggResults.length > 0);
            }

            if (bggResults && bggResults.length > 0) {
              providersUsed.push({ provider: 'bgg', status: 'success', count: bggResults.length });

              for (const data of bggResults) {
                results.push({
                  ...data,
                  provider: 'bgg'
                  // _display deja inclus par BGGProvider.searchByTitle
                });
              }
            } else {
              providersUsed.push({ provider: 'bgg', status: 'not_found' });
            }
          }
        } catch (error) {
          logger.warn(`[Title Search] BGG error:`, error.message);
          providersUsed.push({ provider: 'bgg', status: 'error', error: error.message });
        }
      }
    }

    // Pour les livres, utiliser BNF et Google Books en priorite
    if (collection === 'livre') {
      const providers = [];

      // BNF (gratuit, pas de cle)
      if (!specificProvider || specificProvider === 'bnf') {
        const bnfConfig = configs.find(c => c.provider === 'bnf');
        providers.push({
          name: 'bnf',
          provider: bnfConfig ? createProvider(bnfConfig) : new BNFProvider({ provider: 'bnf' }),
          config: bnfConfig
        });
      }

      // Google Books
      if (!specificProvider || specificProvider === 'googlebooks') {
        const gbConfig = configs.find(c => c.provider === 'googlebooks');
        if (gbConfig || !specificProvider) {
          providers.push({
            name: 'googlebooks',
            provider: gbConfig ? createProvider(gbConfig) : new GoogleBooksProvider({ provider: 'googlebooks' }),
            config: gbConfig
          });
        }
      }

      // Open Library (fallback)
      if (!specificProvider || specificProvider === 'openlibrary') {
        const olConfig = configs.find(c => c.provider === 'openlibrary');
        providers.push({
          name: 'openlibrary',
          provider: olConfig ? createProvider(olConfig) : new OpenLibraryProvider({ provider: 'openlibrary' }),
          config: olConfig
        });
      }

      // Rechercher avec chaque provider
      for (const { name, provider, config } of providers) {
        try {
          if (config && !config.peutFaireRequete()) {
            providersUsed.push({ provider: name, status: 'rate_limited' });
            continue;
          }

          let providerResults = [];

          // Utiliser searchByTitle si disponible (retourne un tableau)
          if (typeof provider.searchByTitle === 'function') {
            providerResults = await provider.searchByTitle(title, maxResults);
          } else if (typeof provider.searchByName === 'function') {
            const single = await provider.searchByName(title);
            if (single) providerResults = [single];
          }

          if (config) {
            await config.incrementerCompteur(providerResults.length > 0);
          }

          if (providerResults && providerResults.length > 0) {
            providersUsed.push({ provider: name, status: 'success', count: providerResults.length });

            // Ajouter les resultats avec le nom du provider
            for (const data of providerResults) {
              results.push({
                ...data,
                provider: name,
                _display: {
                  titre: data.titre,
                  auteurs: data.auteurs?.join(', ') || '',
                  editeur: data.editeur || '',
                  annee: data.annee_publication || '',
                  isbn: data.isbn || '',
                  image_url: data.image_url || null
                }
              });
            }
          } else {
            providersUsed.push({ provider: name, status: 'not_found' });
          }
        } catch (error) {
          logger.warn(`[Title Search] ${name} error:`, error.message);
          providersUsed.push({ provider: name, status: 'error', error: error.message });
        }
      }
    }

    // Limiter le nombre total de resultats
    const limitedResults = results.slice(0, maxResults);

    return {
      found: limitedResults.length > 0,
      count: limitedResults.length,
      results: limitedResults,
      providers_used: providersUsed
    };

  } catch (error) {
    logger.error('[Title Search Multiple] Error:', error.message);
    throw error;
  }
}

/**
 * Vide le cache
 */
function clearCache() {
  cache.clear();
  logger.info('EAN Lookup cache cleared');
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

/**
 * Retourne la liste des providers configures pour une collection
 * @param {string} collection - Type de collection (livre, jeu, film, disque)
 */
async function getConfiguredProviders(collection = null) {
  try {
    let configs = await ConfigurationAPI.getByType('ean_lookup', true);

    // Ajouter aussi les providers ISBN pour les livres
    if (collection === 'livre') {
      const isbnConfigs = await ConfigurationAPI.getByType('isbn_lookup', true);
      configs = [...configs, ...isbnConfigs];
    }

    // Filtrer par collection si specifie
    if (collection) {
      configs = configs.filter(c =>
        !c.collections_supportees || c.collections_supportees.includes(collection)
      );
    }

    // Retourner les infos necessaires
    return configs.map(c => ({
      id: c.id,
      libelle: c.libelle,
      provider: c.provider,
      priorite: c.priorite,
      collections: c.collections_supportees,
      limite_atteinte: !c.peutFaireRequete()
    }));
  } catch (error) {
    logger.error('[getConfiguredProviders] Error:', error.message);
    return [];
  }
}

module.exports = {
  lookupEAN,
  lookupByTitle,
  searchByTitleMultiple,
  clearCache,
  getCacheStats,
  detectCodeType,
  getConfiguredProviders,
  // Export des providers pour tests
  providers: {
    UPCitemdbProvider,
    BGGProvider,
    OpenLibraryProvider,
    GoogleBooksProvider,
    BNFProvider,
    TMDBProvider,
    MusicBrainzProvider,
    DiscogsProvider
  }
};
