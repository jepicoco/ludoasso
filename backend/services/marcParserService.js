/**
 * Service de parsing ISO 2709 / MARC
 *
 * Parse les fichiers au format ISO 2709 (UNIMARC/MARC21) utilisés
 * par les bibliothèques pour l'échange de notices bibliographiques.
 *
 * Format ISO 2709:
 * - Leader (24 chars): métadonnées du record
 * - Directory: index des champs (tag + length + offset)
 * - Field Terminator (0x1E)
 * - Data Fields: contenu avec sous-champs ($a, $b...)
 * - Record Terminator (0x1D)
 */

const logger = require('../utils/logger');

// Constantes ISO 2709
const RECORD_TERMINATOR = 0x1D;
const FIELD_TERMINATOR = 0x1E;
const SUBFIELD_DELIMITER = 0x1F;

// Mapping UNIMARC standard (utilisé par BNF, BDP, Savoie Biblio)
const UNIMARC_FIELDS = {
  isbn: { tag: '010', subfield: 'a' },
  ean: { tag: '073', subfield: 'a' },
  titre: { tag: '200', subfield: 'a' },
  sousTitre: { tag: '200', subfield: 'e' },
  responsabilite: { tag: '200', subfield: 'f' },
  auteurPrincipal: { tag: '700', subfields: ['a', 'b'] },
  coAuteurs: { tag: '701', subfields: ['a', 'b'], repeatable: true },
  auteurSecondaire: { tag: '702', subfields: ['a', 'b'], repeatable: true },
  editeur: { tag: '210', subfield: 'c' },
  lieuEdition: { tag: '210', subfield: 'a' },
  annee: { tag: '210', subfield: 'd' },
  pages: { tag: '215', subfield: 'a' },
  dimensions: { tag: '215', subfield: 'd' },
  collection: { tag: '225', subfield: 'a' },
  numeroCollection: { tag: '225', subfield: 'v' },
  notes: { tag: '300', subfield: 'a', repeatable: true },
  resume: { tag: '330', subfield: 'a' },
  publicCible: { tag: '333', subfield: 'a' },
  sujets: { tag: '606', subfield: 'a', repeatable: true },
  dewey: { tag: '676', subfield: 'a' },
  indexation: { tag: '686', subfield: 'a' },
  langue: { tag: '101', subfield: 'a' }
};

// Mapping MARC21 (standard international)
const MARC21_FIELDS = {
  isbn: { tag: '020', subfield: 'a' },
  titre: { tag: '245', subfield: 'a' },
  sousTitre: { tag: '245', subfield: 'b' },
  auteurPrincipal: { tag: '100', subfields: ['a', 'b'] },
  coAuteurs: { tag: '700', subfields: ['a', 'b'], repeatable: true },
  editeur: { tag: '260', subfield: 'b' },
  lieuEdition: { tag: '260', subfield: 'a' },
  annee: { tag: '260', subfield: 'c' },
  pages: { tag: '300', subfield: 'a' },
  collection: { tag: '490', subfield: 'a' },
  resume: { tag: '520', subfield: 'a' },
  sujets: { tag: '650', subfield: 'a', repeatable: true },
  dewey: { tag: '082', subfield: 'a' },
  langue: { tag: '041', subfield: 'a' }
};

class MarcParserService {
  constructor() {
    this.format = 'unimarc'; // default
    this.errors = [];
  }

  /**
   * Parse un fichier ISO 2709 complet (buffer)
   * @param {Buffer} buffer - Contenu du fichier
   * @returns {Array} Liste de MarcRecord
   */
  parseISO2709(buffer) {
    const records = [];
    let offset = 0;

    while (offset < buffer.length) {
      // Trouver la fin du record (0x1D)
      let recordEnd = offset;
      while (recordEnd < buffer.length && buffer[recordEnd] !== RECORD_TERMINATOR) {
        recordEnd++;
      }

      if (recordEnd >= buffer.length) {
        // Pas de terminateur trouvé, fin du fichier
        if (offset < buffer.length - 1) {
          logger.warn(`MARC Parser: Record incomplet ignoré à l'offset ${offset}`);
        }
        break;
      }

      // Extraire le record
      const recordBuffer = buffer.slice(offset, recordEnd + 1);

      try {
        const record = this.parseRecord(recordBuffer);
        if (record) {
          records.push(record);
        }
      } catch (err) {
        logger.error(`MARC Parser: Erreur parsing record à l'offset ${offset}: ${err.message}`);
        this.errors.push({
          offset,
          error: err.message
        });
      }

      offset = recordEnd + 1;
    }

    logger.info(`MARC Parser: ${records.length} records parsés, ${this.errors.length} erreurs`);
    return records;
  }

  /**
   * Parse un enregistrement MARC unique
   * @param {Buffer} recordBuffer - Buffer d'un record
   * @returns {Object} MarcRecord
   */
  parseRecord(recordBuffer) {
    // Leader (24 premiers caractères)
    const leader = recordBuffer.slice(0, 24).toString('utf8');

    // Longueur du record (positions 0-4)
    const recordLength = parseInt(leader.substring(0, 5), 10);

    // Base address of data (positions 12-16)
    const baseAddress = parseInt(leader.substring(12, 17), 10);

    // Détecter le format (UNIMARC vs MARC21)
    this.format = this.detectFormat(leader);

    // Directory: de position 24 jusqu'à baseAddress-1
    const directoryBuffer = recordBuffer.slice(24, baseAddress - 1);
    const directory = this.parseDirectory(directoryBuffer);

    // Data fields: de baseAddress jusqu'à la fin
    const dataBuffer = recordBuffer.slice(baseAddress);

    // Parser les champs
    const fields = {};
    for (const entry of directory) {
      const fieldData = dataBuffer.slice(entry.offset, entry.offset + entry.length);
      const field = this.parseField(entry.tag, fieldData);

      if (field) {
        if (fields[entry.tag]) {
          // Champ répétable
          if (!Array.isArray(fields[entry.tag])) {
            fields[entry.tag] = [fields[entry.tag]];
          }
          fields[entry.tag].push(field);
        } else {
          fields[entry.tag] = field;
        }
      }
    }

    return {
      leader,
      format: this.format,
      fields
    };
  }

  /**
   * Détecte le format MARC (UNIMARC vs MARC21)
   * @param {string} leader - Leader du record
   * @returns {string} 'unimarc' ou 'marc21'
   */
  detectFormat(leader) {
    // Position 9 du leader indique le système de caractères
    // En UNIMARC, souvent vide ou ' '
    // En MARC21, souvent 'a' pour UTF-8

    // Position 6 indique le type de record
    const recordType = leader.charAt(6);

    // Heuristique simple: si le record vient d'une source française, c'est probablement UNIMARC
    // Pour une détection plus robuste, on pourrait analyser les tags utilisés

    // Par défaut, on suppose UNIMARC pour les imports BDP français
    return 'unimarc';
  }

  /**
   * Parse le directory (index des champs)
   * @param {Buffer} buffer - Buffer du directory
   * @returns {Array} Liste d'entrées {tag, length, offset}
   */
  parseDirectory(buffer) {
    const entries = [];
    const entryLength = 12; // tag(3) + length(4) + offset(5)

    for (let i = 0; i + entryLength <= buffer.length; i += entryLength) {
      const tag = buffer.slice(i, i + 3).toString('utf8');
      const length = parseInt(buffer.slice(i + 3, i + 7).toString('utf8'), 10);
      const offset = parseInt(buffer.slice(i + 7, i + 12).toString('utf8'), 10);

      if (tag && !isNaN(length) && !isNaN(offset)) {
        entries.push({ tag, length, offset });
      }
    }

    return entries;
  }

  /**
   * Parse un champ de données
   * @param {string} tag - Tag du champ
   * @param {Buffer} buffer - Contenu du champ
   * @returns {Object} Champ parsé avec indicateurs et sous-champs
   */
  parseField(tag, buffer) {
    // Retirer le terminateur de champ s'il existe
    let content = buffer;
    if (buffer[buffer.length - 1] === FIELD_TERMINATOR) {
      content = buffer.slice(0, -1);
    }

    // Champs de contrôle (00X): pas de sous-champs
    if (tag.startsWith('00')) {
      return {
        tag,
        value: content.toString('utf8').trim()
      };
    }

    // Champs de données: indicateurs (2 chars) + sous-champs
    const indicators = content.slice(0, 2).toString('utf8');
    const subfieldData = content.slice(2);

    const subfields = this.parseSubfields(subfieldData);

    return {
      tag,
      indicators,
      subfields
    };
  }

  /**
   * Parse les sous-champs d'un champ
   * @param {Buffer} buffer - Buffer des sous-champs
   * @returns {Object} Sous-champs {a: 'valeur', b: 'valeur', ...}
   */
  parseSubfields(buffer) {
    const subfields = {};
    const parts = [];

    // Split sur le délimiteur de sous-champ (0x1F)
    let start = 0;
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === SUBFIELD_DELIMITER) {
        if (i > start) {
          parts.push(buffer.slice(start, i));
        }
        start = i + 1;
      }
    }
    if (start < buffer.length) {
      parts.push(buffer.slice(start));
    }

    for (const part of parts) {
      if (part.length < 2) continue;

      const code = String.fromCharCode(part[0]);
      const value = part.slice(1).toString('utf8').trim();

      if (value) {
        if (subfields[code]) {
          // Sous-champ répété
          if (!Array.isArray(subfields[code])) {
            subfields[code] = [subfields[code]];
          }
          subfields[code].push(value);
        } else {
          subfields[code] = value;
        }
      }
    }

    return subfields;
  }

  /**
   * Extrait un champ spécifique d'un record
   * @param {Object} record - MarcRecord
   * @param {string} tag - Tag du champ
   * @param {string|Array} subfields - Sous-champ(s) à extraire
   * @returns {string|Array|null}
   */
  extractField(record, tag, subfields) {
    const field = record.fields[tag];
    if (!field) return null;

    // Si c'est un tableau (champ répétable), prendre le premier
    const fieldData = Array.isArray(field) ? field[0] : field;

    // Champ de contrôle
    if (fieldData.value !== undefined) {
      return fieldData.value;
    }

    // Champ avec sous-champs
    if (!fieldData.subfields) return null;

    if (typeof subfields === 'string') {
      return fieldData.subfields[subfields] || null;
    }

    if (Array.isArray(subfields)) {
      // Concaténer plusieurs sous-champs
      const values = subfields
        .map(sf => fieldData.subfields[sf])
        .filter(Boolean);
      return values.length > 0 ? values.join(' ') : null;
    }

    return null;
  }

  /**
   * Extrait tous les champs répétables
   * @param {Object} record - MarcRecord
   * @param {string} tag - Tag du champ
   * @param {string|Array} subfields - Sous-champ(s) à extraire
   * @returns {Array}
   */
  extractAllFields(record, tag, subfields) {
    const field = record.fields[tag];
    if (!field) return [];

    const fields = Array.isArray(field) ? field : [field];
    const results = [];

    for (const f of fields) {
      if (f.value !== undefined) {
        results.push(f.value);
      } else if (f.subfields) {
        if (typeof subfields === 'string') {
          const val = f.subfields[subfields];
          if (val) {
            results.push(Array.isArray(val) ? val[0] : val);
          }
        } else if (Array.isArray(subfields)) {
          const values = subfields.map(sf => f.subfields[sf]).filter(Boolean);
          if (values.length > 0) {
            results.push(values.join(' '));
          }
        }
      }
    }

    return results;
  }

  /**
   * Mappe un MarcRecord vers un objet LivreDTO
   * @param {Object} record - MarcRecord
   * @returns {Object} LivreDTO compatible avec le modèle Livre
   */
  mapToLivre(record) {
    const mapping = this.format === 'marc21' ? MARC21_FIELDS : UNIMARC_FIELDS;

    // Extraire ISBN et normaliser
    let isbn = this.extractField(record, mapping.isbn.tag, mapping.isbn.subfield);
    if (isbn) {
      isbn = this.normalizeISBN(isbn);
    }

    // Extraire le titre
    const titre = this.extractField(record, mapping.titre.tag, mapping.titre.subfield);

    // Extraire auteurs
    const auteurPrincipal = this.extractField(record, mapping.auteurPrincipal.tag, mapping.auteurPrincipal.subfields);
    const coAuteurs = this.extractAllFields(record, mapping.coAuteurs.tag, mapping.coAuteurs.subfields);

    // Combiner tous les auteurs
    const auteurs = [];
    if (auteurPrincipal) {
      auteurs.push({ nom: this.normalizeAuteur(auteurPrincipal), role: 'auteur' });
    }
    for (const ca of coAuteurs) {
      auteurs.push({ nom: this.normalizeAuteur(ca), role: 'auteur' });
    }

    // Extraire l'année et la normaliser
    let annee = this.extractField(record, mapping.annee.tag, mapping.annee.subfield);
    if (annee) {
      annee = this.extractYear(annee);
    }

    // Extraire nombre de pages
    let nbPages = this.extractField(record, mapping.pages.tag, mapping.pages.subfield);
    if (nbPages) {
      nbPages = this.extractPageCount(nbPages);
    }

    // Extraire sujets/genres
    const sujets = this.extractAllFields(record, mapping.sujets.tag, mapping.sujets.subfield);

    const livreDTO = {
      isbn,
      titre: titre?.trim() || 'Sans titre',
      sous_titre: this.extractField(record, mapping.sousTitre.tag, mapping.sousTitre.subfield)?.trim(),
      annee_publication: annee,
      nb_pages: nbPages,
      resume: this.extractField(record, mapping.resume.tag, mapping.resume.subfield)?.trim(),
      dewey_code: this.extractField(record, mapping.dewey.tag, mapping.dewey.subfield)?.trim(),
      editeur: this.extractField(record, mapping.editeur.tag, mapping.editeur.subfield)?.trim(),
      collection: this.extractField(record, mapping.collection.tag, mapping.collection.subfield)?.trim(),
      langue: this.extractField(record, mapping.langue.tag, mapping.langue.subfield)?.trim(),
      auteurs,
      genres: sujets.map(s => s.trim()).filter(Boolean),
      source_import: 'bdp',
      _raw: record // Garder le record brut pour debug
    };

    return livreDTO;
  }

  /**
   * Normalise un ISBN (retire tirets, espaces, préfixes)
   */
  normalizeISBN(isbn) {
    if (!isbn) return null;

    // Retirer tout sauf les chiffres et X
    let normalized = isbn.replace(/[^0-9Xx]/g, '').toUpperCase();

    // Garder seulement les 10 ou 13 premiers caractères
    if (normalized.length > 13) {
      normalized = normalized.substring(0, 13);
    } else if (normalized.length > 10 && normalized.length < 13) {
      normalized = normalized.substring(0, 10);
    }

    return normalized || null;
  }

  /**
   * Normalise un nom d'auteur (inverse "Nom, Prénom" en "Prénom Nom")
   */
  normalizeAuteur(auteur) {
    if (!auteur) return null;

    // Format UNIMARC: "Nom, Prénom" ou "Nom$bPrénom"
    if (auteur.includes(', ')) {
      const [nom, prenom] = auteur.split(', ');
      return `${prenom?.trim() || ''} ${nom?.trim() || ''}`.trim();
    }

    return auteur.trim();
  }

  /**
   * Extrait une année d'une chaîne
   */
  extractYear(str) {
    if (!str) return null;

    // Chercher un nombre à 4 chiffres
    const match = str.match(/(\d{4})/);
    if (match) {
      const year = parseInt(match[1], 10);
      // Vérifier que c'est une année raisonnable
      if (year >= 1000 && year <= new Date().getFullYear() + 1) {
        return year;
      }
    }

    return null;
  }

  /**
   * Extrait le nombre de pages d'une chaîne
   */
  extractPageCount(str) {
    if (!str) return null;

    // Chercher un nombre suivi de "p" ou "pages"
    const match = str.match(/(\d+)\s*p/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    // Sinon, chercher juste un nombre
    const numMatch = str.match(/(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }

    return null;
  }

  /**
   * Valide un LivreDTO
   * @param {Object} dto - LivreDTO
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateLivreDTO(dto) {
    const errors = [];

    if (!dto.titre || dto.titre === 'Sans titre') {
      errors.push('Titre manquant');
    }

    if (!dto.isbn) {
      // Pas bloquant, mais warning
      errors.push('ISBN manquant (non bloquant)');
    } else {
      // Vérifier format ISBN
      if (dto.isbn.length !== 10 && dto.isbn.length !== 13) {
        errors.push(`ISBN invalide: ${dto.isbn}`);
      }
    }

    if (dto.auteurs.length === 0) {
      errors.push('Aucun auteur trouvé (non bloquant)');
    }

    return {
      valid: errors.filter(e => !e.includes('non bloquant')).length === 0,
      warnings: errors.filter(e => e.includes('non bloquant')),
      errors: errors.filter(e => !e.includes('non bloquant'))
    };
  }

  /**
   * Retourne les erreurs de parsing accumulées
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Reset les erreurs
   */
  resetErrors() {
    this.errors = [];
  }
}

// Export singleton
module.exports = new MarcParserService();
