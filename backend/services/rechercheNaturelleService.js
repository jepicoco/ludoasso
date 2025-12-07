/**
 * Service de Recherche Naturelle
 * Recherche par thematiques via extraction de mots-cles
 */

const { Thematique, ThematiqueAlias, ArticleThematique, Jeu, Livre, Film, Disque } = require('../models');
const { Op } = require('sequelize');

// Stopwords francais courants
const STOPWORDS = new Set([
  // Articles
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
  // Prepositions
  'a', 'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'en', 'vers', 'chez',
  // Conjonctions
  'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'quoi',
  // Pronoms
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'se', 'lui', 'leur', 'ce', 'cet', 'cette', 'ces',
  // Verbes auxiliaires
  'etre', 'avoir', 'est', 'sont', 'ai', 'as', 'a', 'avons', 'avez', 'ont',
  'suis', 'es', 'sommes', 'etes', 'etais', 'etait', 'serai', 'sera',
  // Adverbes
  'tres', 'bien', 'peu', 'plus', 'moins', 'aussi', 'assez', 'trop',
  'ne', 'pas', 'jamais', 'toujours', 'encore', 'deja',
  // Autres mots courants
  'tout', 'tous', 'toute', 'toutes', 'autre', 'autres',
  'meme', 'comme', 'si', 'quand', 'comment', 'pourquoi', 'ou',
  'bon', 'bonne', 'grand', 'grande', 'petit', 'petite',
  'nouveau', 'nouvelle', 'vieux', 'vieille',
  // Mots specifiques recherche
  'cherche', 'recherche', 'veux', 'voudrais', 'aimerais', 'trouve', 'trouver',
  'jeu', 'jeux', 'livre', 'livres', 'film', 'films', 'disque', 'disques',
  'type', 'genre', 'style', 'sorte'
]);

// Suffixes courants pour stemming basique
const SUFFIXES = [
  'issement', 'ement', 'ation', 'ition', 'ement',
  'ique', 'iste', 'isme', 'eur', 'euse', 'eux', 'euses',
  'able', 'ible', 'ment', 'tion', 'sion',
  'ant', 'ent', 'if', 'ive', 'ifs', 'ives',
  'er', 'ir', 're', 'es', 's'
];

class RechercheNaturelleService {

  /**
   * Normalise un texte (lowercase, sans accents)
   */
  static normaliser(texte) {
    if (!texte) return '';
    return texte
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Applique un stemming basique (retire les suffixes courants)
   */
  static stem(mot) {
    if (!mot || mot.length < 4) return mot;

    for (const suffix of SUFFIXES) {
      if (mot.endsWith(suffix) && mot.length > suffix.length + 2) {
        return mot.slice(0, -suffix.length);
      }
    }
    return mot;
  }

  /**
   * Extrait les mots-cles d'une requete
   */
  static extraireMotsCles(requete) {
    const normalise = this.normaliser(requete);
    const mots = normalise.split(' ').filter(m => m.length > 0);

    // Filtrer stopwords et mots trop courts
    const motsCles = mots.filter(mot => {
      return mot.length >= 2 && !STOPWORDS.has(mot);
    });

    // Retourner mots originaux + stems
    const result = new Set();
    for (const mot of motsCles) {
      result.add(mot);
      const stemmed = this.stem(mot);
      if (stemmed !== mot && stemmed.length >= 2) {
        result.add(stemmed);
      }
    }

    return Array.from(result);
  }

  /**
   * Trouve les thematiques correspondant aux mots-cles
   */
  static async matcherThematiques(motsCles) {
    if (!motsCles || motsCles.length === 0) return [];

    // Construire les conditions LIKE pour chaque mot-cle
    const conditions = motsCles.map(mot => ({
      nom_normalise: { [Op.like]: `%${mot}%` }
    }));

    // Chercher dans les thematiques
    const thematiques = await Thematique.findAll({
      where: {
        actif: true,
        [Op.or]: conditions
      }
    });

    // Chercher aussi dans les alias
    const aliasConditions = motsCles.map(mot => ({
      alias_normalise: { [Op.like]: `%${mot}%` }
    }));

    const aliases = await ThematiqueAlias.findAll({
      where: {
        [Op.or]: aliasConditions
      },
      include: [{
        model: Thematique,
        as: 'thematique',
        where: { actif: true }
      }]
    });

    // Fusionner les resultats avec score de pertinence
    const thematiqueMap = new Map();

    // Thematiques directes - score base sur le match
    for (const th of thematiques) {
      let score = 0;
      for (const mot of motsCles) {
        if (th.nom_normalise.includes(mot)) {
          // Score plus eleve pour match exact
          if (th.nom_normalise === mot) {
            score += 1.0;
          } else if (th.nom_normalise.startsWith(mot)) {
            score += 0.8;
          } else {
            score += 0.5;
          }
        }
      }
      thematiqueMap.set(th.id, {
        thematique: th,
        score,
        matchType: 'direct'
      });
    }

    // Alias - score legerement inferieur
    for (const alias of aliases) {
      const th = alias.thematique;
      if (!th) continue;

      let score = 0;
      for (const mot of motsCles) {
        if (alias.alias_normalise.includes(mot)) {
          if (alias.alias_normalise === mot) {
            score += 0.9;
          } else if (alias.alias_normalise.startsWith(mot)) {
            score += 0.7;
          } else {
            score += 0.4;
          }
        }
      }

      if (thematiqueMap.has(th.id)) {
        // Ajouter au score existant
        thematiqueMap.get(th.id).score += score;
      } else {
        thematiqueMap.set(th.id, {
          thematique: th,
          score,
          matchType: 'alias'
        });
      }
    }

    // Trier par score decroissant
    const resultats = Array.from(thematiqueMap.values());
    resultats.sort((a, b) => b.score - a.score);

    return resultats;
  }

  /**
   * Recherche principale - retourne les articles correspondants
   */
  static async rechercher(requete, options = {}) {
    const {
      typeArticle = null,  // 'jeu', 'livre', 'film', 'disque' ou null pour tout
      limit = 20,
      offset = 0,
      forceMin = 0.3       // Force minimum de la thematique
    } = options;

    // 1. Extraire les mots-cles
    const motsCles = this.extraireMotsCles(requete);

    if (motsCles.length === 0) {
      return {
        success: false,
        message: 'Aucun mot-cle pertinent trouve dans la recherche',
        motsCles: [],
        thematiques: [],
        articles: [],
        total: 0
      };
    }

    // 2. Trouver les thematiques correspondantes
    const thematiqueMatches = await this.matcherThematiques(motsCles);

    if (thematiqueMatches.length === 0) {
      return {
        success: true,
        message: 'Aucune thematique correspondante trouvee',
        motsCles,
        thematiques: [],
        articles: [],
        total: 0
      };
    }

    // 3. Rechercher les articles via ArticleThematique
    const thematiqueIds = thematiqueMatches.map(t => t.thematique.id);

    // Construire la requete
    const whereArticle = {
      thematique_id: { [Op.in]: thematiqueIds },
      force: { [Op.gte]: forceMin }
    };

    if (typeArticle) {
      whereArticle.type_article = typeArticle;
    }

    const liens = await ArticleThematique.findAll({
      where: whereArticle,
      include: [{
        model: Thematique,
        as: 'thematique',
        where: { actif: true }
      }]
    });

    // 4. Grouper et scorer les articles
    const articlesMap = new Map();

    for (const lien of liens) {
      const key = `${lien.type_article}:${lien.article_id}`;

      if (!articlesMap.has(key)) {
        articlesMap.set(key, {
          type_article: lien.type_article,
          article_id: lien.article_id,
          thematiquesMatchees: [],
          score: 0
        });
      }

      const article = articlesMap.get(key);

      // Trouver le score de la thematique dans nos matchs
      const thMatch = thematiqueMatches.find(t => t.thematique.id === lien.thematique_id);
      const thematiqueScore = thMatch ? thMatch.score : 0;

      // Score = force du lien * score de pertinence de la thematique
      const scoreContrib = parseFloat(lien.force) * (1 + thematiqueScore);
      article.score += scoreContrib;

      article.thematiquesMatchees.push({
        id: lien.thematique.id,
        nom: lien.thematique.nom,
        type: lien.thematique.type,
        force: parseFloat(lien.force),
        scoreMatch: thematiqueScore
      });
    }

    // 5. Trier par score et paginer
    let articles = Array.from(articlesMap.values());
    articles.sort((a, b) => b.score - a.score);

    const total = articles.length;
    articles = articles.slice(offset, offset + limit);

    // 6. Charger les details des articles
    const articlesDetailles = await this.chargerDetailsArticles(articles);

    return {
      success: true,
      motsCles,
      thematiques: thematiqueMatches.slice(0, 10).map(t => ({
        id: t.thematique.id,
        nom: t.thematique.nom,
        type: t.thematique.type,
        score: t.score
      })),
      articles: articlesDetailles,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }

  /**
   * Charge les details complets des articles
   */
  static async chargerDetailsArticles(articles) {
    const result = [];

    // Grouper par type pour optimiser les requetes
    const parType = {
      jeu: [],
      livre: [],
      film: [],
      disque: []
    };

    for (const art of articles) {
      parType[art.type_article].push(art);
    }

    // Charger jeux
    if (parType.jeu.length > 0) {
      const ids = parType.jeu.map(a => a.article_id);
      const jeux = await Jeu.findAll({
        where: { id: { [Op.in]: ids } }
      });

      const jeuxMap = new Map(jeux.map(j => [j.id, j]));
      for (const art of parType.jeu) {
        const jeu = jeuxMap.get(art.article_id);
        if (jeu) {
          result.push({
            ...art,
            article: {
              id: jeu.id,
              type: 'jeu',
              type_label: 'Jeu',
              titre: jeu.titre,
              image_url: jeu.image_url,
              statut: jeu.statut,
              nb_joueurs_min: jeu.nb_joueurs_min,
              nb_joueurs_max: jeu.nb_joueurs_max,
              duree_partie: jeu.duree_partie,
              age_min: jeu.age_min,
              annee_sortie: jeu.annee_sortie
            }
          });
        }
      }
    }

    // Charger livres
    if (parType.livre.length > 0) {
      const ids = parType.livre.map(a => a.article_id);
      const livres = await Livre.findAll({
        where: { id: { [Op.in]: ids } }
      });

      const livresMap = new Map(livres.map(l => [l.id, l]));
      for (const art of parType.livre) {
        const livre = livresMap.get(art.article_id);
        if (livre) {
          result.push({
            ...art,
            article: {
              id: livre.id,
              type: 'livre',
              type_label: 'Livre',
              titre: livre.titre,
              image_url: livre.image_url,
              statut: livre.statut,
              nb_pages: livre.nb_pages,
              annee_publication: livre.annee_publication
            }
          });
        }
      }
    }

    // Charger films
    if (parType.film.length > 0) {
      const ids = parType.film.map(a => a.article_id);
      const films = await Film.findAll({
        where: { id: { [Op.in]: ids } }
      });

      const filmsMap = new Map(films.map(f => [f.id, f]));
      for (const art of parType.film) {
        const film = filmsMap.get(art.article_id);
        if (film) {
          result.push({
            ...art,
            article: {
              id: film.id,
              type: 'film',
              type_label: 'Film',
              titre: film.titre,
              image_url: film.image_url,
              statut: film.statut,
              duree: film.duree,
              classification: film.classification,
              annee_sortie: film.annee_sortie
            }
          });
        }
      }
    }

    // Charger disques
    if (parType.disque.length > 0) {
      const ids = parType.disque.map(a => a.article_id);
      const disques = await Disque.findAll({
        where: { id: { [Op.in]: ids } }
      });

      const disquesMap = new Map(disques.map(d => [d.id, d]));
      for (const art of parType.disque) {
        const disque = disquesMap.get(art.article_id);
        if (disque) {
          result.push({
            ...art,
            article: {
              id: disque.id,
              type: 'disque',
              type_label: 'Disque',
              titre: disque.titre,
              image_url: disque.image_url,
              statut: disque.statut,
              nb_pistes: disque.nb_pistes,
              duree_totale: disque.duree_totale,
              annee_sortie: disque.annee_sortie
            }
          });
        }
      }
    }

    // Retrier par score (l'ordre peut avoir change apres chargement)
    result.sort((a, b) => b.score - a.score);

    return result;
  }
}

module.exports = RechercheNaturelleService;
