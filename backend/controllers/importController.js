/**
 * Import Controller
 * Gestion de l'import de jeux depuis des fichiers CSV (MyLudo, etc.)
 */

const { Jeu } = require('../models');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Parse le contenu CSV et retourne les donnees
 * @param {string} filePath - Chemin du fichier CSV
 * @param {string} separator - Separateur (default: ;)
 * @returns {Promise<{columns: string[], rows: object[]}>}
 */
function parseCSV(filePath, separator = ';') {
  return new Promise((resolve, reject) => {
    const rows = [];
    let columns = [];

    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv({
        separator: separator,
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').replace(/^'/, '').trim() // Remove BOM and leading quote
      }))
      .on('headers', (headers) => {
        columns = headers;
      })
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve({ columns, rows });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Suggere un mapping automatique des colonnes MyLudo vers le modele Jeu
 */
function suggestMapping(columns) {
  const mapping = {};
  const suggestions = {
    'Titre': 'titre',
    'Éditeur(s)': 'editeur',
    'Editeur(s)': 'editeur',
    'Auteur(s)': 'auteur',
    'Joueur(s)': 'joueurs',
    'Durée': 'duree_partie',
    'Duree': 'duree_partie',
    'Age(s)': 'age_min',
    'Catégorie(s)': 'categorie',
    'Categorie(s)': 'categorie',
    'Thème(s)': 'themes',
    'Theme(s)': 'themes',
    'Date d\'acquisition': 'date_acquisition',
    'Prix d\'achat': 'prix_achat',
    'Emplacement': 'emplacement',
    'Commentaire': 'notes',
    'EAN': 'ean',
    'Édition': 'annee_sortie',
    'Edition': 'annee_sortie',
    'Sous-titre': 'sous_titre',
    'Dimensions': 'dimensions',
    'Univers': 'univers',
    'Langues': 'langues'
  };

  columns.forEach(col => {
    const normalized = col.trim();
    if (suggestions[normalized]) {
      mapping[normalized] = suggestions[normalized];
    }
  });

  return mapping;
}

/**
 * Parse la valeur "Joueur(s)" pour extraire min/max
 * Formats: "2 — 7", "Solo", "2-4", "2+"
 */
function parseJoueurs(value) {
  if (!value) return { min: null, max: null };

  const str = value.toString().trim().toLowerCase();

  if (str === 'solo' || str === '1') {
    return { min: 1, max: 1 };
  }

  // Format "2 — 7" ou "2 - 7" ou "2-7"
  const rangeMatch = str.match(/(\d+)\s*[—\-–]\s*(\d+)/);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
  }

  // Format "2+"
  const plusMatch = str.match(/(\d+)\+/);
  if (plusMatch) {
    return { min: parseInt(plusMatch[1]), max: null };
  }

  // Juste un nombre
  const numMatch = str.match(/^(\d+)$/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    return { min: num, max: num };
  }

  return { min: null, max: null };
}

/**
 * Parse la valeur "Age(s)" pour extraire l'age minimum
 * Formats: "10+", "8 ans", "12"
 */
function parseAge(value) {
  if (!value) return null;

  const str = value.toString().trim();
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Parse la valeur "Durée" pour extraire les minutes
 * Formats: "30", "30 min", "1h", "1h30"
 */
function parseDuree(value) {
  if (!value) return null;

  const str = value.toString().trim().toLowerCase();

  // Format "1h30" ou "1h 30"
  const hoursMinMatch = str.match(/(\d+)\s*h\s*(\d+)?/);
  if (hoursMinMatch) {
    const hours = parseInt(hoursMinMatch[1]) || 0;
    const mins = parseInt(hoursMinMatch[2]) || 0;
    return hours * 60 + mins;
  }

  // Juste des minutes
  const minMatch = str.match(/(\d+)/);
  return minMatch ? parseInt(minMatch[1]) : null;
}

/**
 * Parse une date au format YYYY-MM-DD ou DD/MM/YYYY
 */
function parseDate(value) {
  if (!value) return null;

  const str = value.toString().trim();

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Format DD/MM/YYYY
  const frMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (frMatch) {
    return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
  }

  return null;
}

/**
 * Transforme une ligne CSV en objet Jeu selon le mapping
 */
function transformRow(row, mapping) {
  const jeu = {
    statut: 'disponible'
  };

  Object.entries(mapping).forEach(([csvCol, jeuField]) => {
    const value = row[csvCol];
    if (!value || value.toString().trim() === '') return;

    switch (jeuField) {
      case 'titre':
        jeu.titre = value.toString().trim();
        break;

      case 'editeur':
        jeu.editeur = value.toString().trim();
        break;

      case 'auteur':
        jeu.auteur = value.toString().trim();
        break;

      case 'joueurs':
        const { min, max } = parseJoueurs(value);
        if (min !== null) jeu.nb_joueurs_min = min;
        if (max !== null) jeu.nb_joueurs_max = max;
        break;

      case 'duree_partie':
        const duree = parseDuree(value);
        if (duree !== null) jeu.duree_partie = duree;
        break;

      case 'age_min':
        const age = parseAge(value);
        if (age !== null) jeu.age_min = age;
        break;

      case 'categorie':
        // Prendre la premiere categorie si plusieurs
        const cats = value.toString().split(',');
        jeu.categorie = cats[0].trim();
        break;

      case 'annee_sortie':
        const year = parseInt(value);
        if (year >= 1900 && year <= new Date().getFullYear() + 1) {
          jeu.annee_sortie = year;
        }
        break;

      case 'date_acquisition':
        const date = parseDate(value);
        if (date) jeu.date_acquisition = date;
        break;

      case 'prix_achat':
        const prix = parseFloat(value.toString().replace(',', '.'));
        if (!isNaN(prix)) jeu.prix_achat = prix;
        break;

      case 'emplacement':
        jeu.emplacement = value.toString().trim();
        break;

      case 'notes':
        jeu.notes = value.toString().trim();
        break;

      // Champs ignores mais utiles pour reference
      case 'ean':
      case 'sous_titre':
      case 'themes':
      case 'dimensions':
      case 'univers':
      case 'langues':
        // Stocker dans notes si pas d'autre champ
        break;
    }
  });

  return jeu;
}

/**
 * Preview d'un import CSV
 * POST /api/import/jeux/preview
 */
const previewImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Aucun fichier fourni'
      });
    }

    const separator = req.body.separator || ';';
    const { columns, rows } = await parseCSV(req.file.path, separator);

    // Suggerer le mapping
    const mapping = suggestMapping(columns);

    // Transformer les 10 premieres lignes pour preview
    const previewRows = rows.slice(0, 10).map(row => transformRow(row, mapping));

    // Nettoyer le fichier temporaire
    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
      columns,
      mapping,
      totalRows: rows.length,
      preview: previewRows,
      rawPreview: rows.slice(0, 5) // Donnees brutes pour debug
    });

  } catch (error) {
    console.error('Erreur preview import:', error);

    // Nettoyer le fichier en cas d'erreur
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Import effectif des jeux
 * POST /api/import/jeux
 */
const importJeux = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Aucun fichier fourni'
      });
    }

    const separator = req.body.separator || ';';
    const customMapping = req.body.mapping ? JSON.parse(req.body.mapping) : null;
    const skipDuplicates = req.body.skipDuplicates === 'true';

    const { columns, rows } = await parseCSV(req.file.path, separator);

    // Utiliser le mapping custom ou le suggere
    const mapping = customMapping || suggestMapping(columns);

    const results = {
      total: rows.length,
      imported: 0,
      skipped: 0,
      errors: []
    };

    // Importer chaque ligne
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2; // +2 car ligne 1 = headers

      try {
        const jeuData = transformRow(row, mapping);

        // Verifier que le titre existe
        if (!jeuData.titre) {
          results.errors.push({
            line: lineNum,
            error: 'Titre manquant',
            data: row
          });
          continue;
        }

        // Verifier les doublons si demande
        if (skipDuplicates) {
          const existing = await Jeu.findOne({
            where: { titre: jeuData.titre }
          });

          if (existing) {
            results.skipped++;
            continue;
          }
        }

        // Creer le jeu
        await Jeu.create(jeuData);
        results.imported++;

      } catch (error) {
        results.errors.push({
          line: lineNum,
          error: error.message,
          data: row
        });
      }
    }

    // Nettoyer le fichier temporaire
    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Erreur import:', error);

    // Nettoyer le fichier en cas d'erreur
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Retourne les champs disponibles pour le mapping
 * GET /api/import/jeux/fields
 */
const getAvailableFields = async (req, res) => {
  const fields = [
    { id: 'titre', label: 'Titre', required: true },
    { id: 'editeur', label: 'Editeur' },
    { id: 'auteur', label: 'Auteur' },
    { id: 'annee_sortie', label: 'Annee de sortie' },
    { id: 'joueurs', label: 'Nombre de joueurs (min-max)' },
    { id: 'duree_partie', label: 'Duree (minutes)' },
    { id: 'age_min', label: 'Age minimum' },
    { id: 'categorie', label: 'Categorie' },
    { id: 'description', label: 'Description' },
    { id: 'date_acquisition', label: 'Date d\'acquisition' },
    { id: 'prix_achat', label: 'Prix d\'achat' },
    { id: 'emplacement', label: 'Emplacement' },
    { id: 'notes', label: 'Notes' },
    { id: 'ean', label: 'Code EAN (non importe)' },
    { id: 'ignore', label: '-- Ignorer cette colonne --' }
  ];

  res.json({ fields });
};

module.exports = {
  previewImport,
  importJeux,
  getAvailableFields
};
