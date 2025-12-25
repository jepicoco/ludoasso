/**
 * Livre Import Controller
 * Gestion de l'import de livres depuis des fichiers ISO 2709 (MARC/UNIMARC)
 * pour les lots BDP (Bibliotheque Departementale de Pret)
 */

const {
  Livre,
  ExemplaireLivre,
  Auteur,
  Editeur,
  GenreLitteraire,
  CollectionLivre,
  Theme,
  Langue,
  LivreAuteur,
  LivreEditeur,
  LivreGenre,
  LivreTheme,
  LivreLangue,
  ImportSession,
  LotBDP,
  sequelize
} = require('../models');
const marcParserService = require('../services/marcParserService');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Trouve ou cree un element dans une table de reference
 * @param {Model} Model - Modele Sequelize
 * @param {string} nom - Nom de l'element
 * @param {object} extraData - Donnees supplementaires
 * @param {Transaction} transaction - Transaction Sequelize
 * @returns {Promise<Model|null>}
 */
async function findOrCreateRef(Model, nom, extraData = {}, transaction = null) {
  if (!nom || nom.trim().length === 0) return null;

  const cleanNom = nom.trim();
  const options = transaction ? { transaction } : {};

  try {
    const [instance] = await Model.findOrCreate({
      where: { nom: cleanNom },
      defaults: { nom: cleanNom, actif: true, ...extraData },
      ...options
    });
    return instance;
  } catch (error) {
    // En cas d'erreur (ex: contrainte unique), essayer de retrouver
    const existing = await Model.findOne({ where: { nom: cleanNom }, ...options });
    return existing;
  }
}

/**
 * Trouve ou cree une collection de livres (serie/collection editoriale)
 */
async function findOrCreateCollection(nom, editeurId = null, transaction = null) {
  if (!nom || nom.trim().length === 0) return null;

  const cleanNom = nom.trim();
  const options = transaction ? { transaction } : {};

  try {
    const [instance] = await CollectionLivre.findOrCreate({
      where: { nom: cleanNom },
      defaults: { nom: cleanNom, editeur_id: editeurId, actif: true },
      ...options
    });
    return instance;
  } catch (error) {
    const existing = await CollectionLivre.findOne({ where: { nom: cleanNom }, ...options });
    return existing;
  }
}

/**
 * Trouve ou cree une langue (gere les codes et noms)
 */
const LANGUE_MAPPING = {
  'fre': 'Francais',
  'fra': 'Francais',
  'fr': 'Francais',
  'eng': 'Anglais',
  'en': 'Anglais',
  'ger': 'Allemand',
  'deu': 'Allemand',
  'de': 'Allemand',
  'spa': 'Espagnol',
  'es': 'Espagnol',
  'ita': 'Italien',
  'it': 'Italien',
  'por': 'Portugais',
  'pt': 'Portugais',
  'rus': 'Russe',
  'ru': 'Russe',
  'jpn': 'Japonais',
  'ja': 'Japonais',
  'chi': 'Chinois',
  'zho': 'Chinois',
  'zh': 'Chinois',
  'ara': 'Arabe',
  'ar': 'Arabe',
  'lat': 'Latin'
};

async function findOrCreateLangue(value, transaction = null) {
  if (!value || value.trim().length === 0) return null;

  let nom = value.trim().toLowerCase();
  let code = null;
  const options = transaction ? { transaction } : {};

  // Verifier si c'est un code ISO 639
  if (LANGUE_MAPPING[nom]) {
    code = nom;
    nom = LANGUE_MAPPING[nom];
  } else {
    // Chercher si c'est un nom qui correspond a un code
    for (const [c, n] of Object.entries(LANGUE_MAPPING)) {
      if (n.toLowerCase() === nom) {
        code = c;
        nom = n;
        break;
      }
    }
  }

  // Capitaliser le nom
  nom = nom.charAt(0).toUpperCase() + nom.slice(1);

  try {
    const [instance] = await Langue.findOrCreate({
      where: { nom },
      defaults: { nom, code, actif: true },
      ...options
    });
    return instance;
  } catch (error) {
    const existing = await Langue.findOne({ where: { nom }, ...options });
    return existing;
  }
}

/**
 * Detecte les conflits (categories/auteurs inconnus) avant import
 * @param {LivreDTO[]} livres - Livres parses
 * @returns {object} Conflits detectes
 */
async function detectConflicts(livres) {
  const conflicts = {
    auteurs: new Set(),
    editeurs: new Set(),
    genres: new Set(),
    collections: new Set()
  };

  // Collecter tous les noms uniques
  const allAuteurs = new Set();
  const allEditeurs = new Set();
  const allGenres = new Set();
  const allCollections = new Set();

  for (const livre of livres) {
    if (livre.auteurs) {
      // auteurs peut etre un tableau d'objets {nom, role} ou de strings
      livre.auteurs.forEach(a => {
        const nom = typeof a === 'string' ? a : a.nom;
        if (nom) allAuteurs.add(nom);
      });
    }
    if (livre.editeur) {
      allEditeurs.add(livre.editeur);
    }
    if (livre.genres) {
      livre.genres.forEach(g => allGenres.add(g));
    }
    if (livre.collection) {
      allCollections.add(livre.collection);
    }
  }

  // Verifier lesquels existent deja
  for (const nom of allAuteurs) {
    const exists = await Auteur.findOne({ where: { nom } });
    if (!exists) conflicts.auteurs.add(nom);
  }

  for (const nom of allEditeurs) {
    const exists = await Editeur.findOne({ where: { nom } });
    if (!exists) conflicts.editeurs.add(nom);
  }

  for (const nom of allGenres) {
    const exists = await GenreLitteraire.findOne({ where: { nom } });
    if (!exists) conflicts.genres.add(nom);
  }

  for (const nom of allCollections) {
    const exists = await CollectionLivre.findOne({ where: { nom } });
    if (!exists) conflicts.collections.add(nom);
  }

  return {
    auteurs: Array.from(conflicts.auteurs),
    editeurs: Array.from(conflicts.editeurs),
    genres: Array.from(conflicts.genres),
    collections: Array.from(conflicts.collections),
    hasConflicts: conflicts.auteurs.size > 0 ||
                  conflicts.editeurs.size > 0 ||
                  conflicts.genres.size > 0 ||
                  conflicts.collections.size > 0
  };
}

/**
 * Cree les relations many-to-many pour un livre
 */
async function createLivreRelations(livre, dto, transaction = null) {
  const options = transaction ? { transaction } : {};

  // Auteurs (many-to-many)
  if (dto.auteurs && dto.auteurs.length > 0) {
    for (const auteurItem of dto.auteurs) {
      // auteurs peut etre un tableau d'objets {nom, role} ou de strings
      const auteurNom = typeof auteurItem === 'string' ? auteurItem : auteurItem.nom;
      const auteur = await findOrCreateRef(Auteur, auteurNom, {}, transaction);
      if (auteur) {
        await LivreAuteur.findOrCreate({
          where: { livre_id: livre.id, auteur_id: auteur.id },
          ...options
        }).catch(() => {});
      }
    }
  }

  // Editeur (many-to-many)
  if (dto.editeur) {
    const editeur = await findOrCreateRef(Editeur, dto.editeur, {}, transaction);
    if (editeur) {
      await LivreEditeur.findOrCreate({
        where: { livre_id: livre.id, editeur_id: editeur.id },
        ...options
      }).catch(() => {});
    }
  }

  // Genres/Sujets (many-to-many)
  if (dto.genres && dto.genres.length > 0) {
    for (const genreNom of dto.genres) {
      const genre = await findOrCreateRef(GenreLitteraire, genreNom, {}, transaction);
      if (genre) {
        await LivreGenre.findOrCreate({
          where: { livre_id: livre.id, genre_id: genre.id },
          ...options
        }).catch(() => {});
      }
    }
  }

  // Collection (N:1) - via collection_id
  if (dto.collection && !livre.collection_id) {
    let editeurId = null;
    if (dto.editeur) {
      const editeur = await Editeur.findOne({ where: { nom: dto.editeur }, ...options });
      editeurId = editeur?.id;
    }
    const collection = await findOrCreateCollection(dto.collection, editeurId, transaction);
    if (collection) {
      await livre.update({ collection_id: collection.id }, options);
    }
  }

  // Langue (many-to-many)
  if (dto.langue) {
    const langue = await findOrCreateLangue(dto.langue, transaction);
    if (langue) {
      await LivreLangue.findOrCreate({
        where: { livre_id: livre.id, langue_id: langue.id },
        ...options
      }).catch(() => {});
    }
  }
}

/**
 * Upload et parse un fichier ISO 2709
 * POST /api/import/livres/iso
 */
const uploadISO = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Aucun fichier fourni'
      });
    }

    const {
      numero_lot,
      date_reception,
      date_retour_prevue,
      source = 'bdp'
    } = req.body;

    // 1. Lire et parser le fichier ISO
    const buffer = fs.readFileSync(req.file.path);
    let records;

    try {
      records = marcParserService.parseISO2709(buffer);
    } catch (parseError) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        error: 'Parse error',
        message: `Erreur de parsing ISO 2709: ${parseError.message}`
      });
    }

    if (records.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        error: 'Empty file',
        message: 'Aucun enregistrement trouve dans le fichier'
      });
    }

    // 2. Mapper vers LivreDTO
    const livres = [];
    const parseErrors = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const dto = marcParserService.mapToLivre(records[i]);
        const validation = marcParserService.validateLivreDTO(dto);

        dto._recordIndex = i;
        dto._valid = validation.valid;
        dto._errors = validation.errors;

        livres.push(dto);
      } catch (err) {
        parseErrors.push({ index: i, error: err.message });
      }
    }

    // 3. Detecter les conflits
    const conflicts = await detectConflicts(livres.filter(l => l._valid));

    // 4. Creer la session d'import
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const session = await ImportSession.create({
      id: sessionId,
      type: 'iso',
      source,
      filename: req.file.originalname,
      total_records: records.length,
      parsed_records: livres,
      conflicts: conflicts.hasConflicts ? conflicts : null,
      statut: conflicts.hasConflicts ? 'pending' : 'resolved',
      structure_id: req.structureId || null,
      created_by: req.user.id,
      expires_at: expiresAt
    });

    // 5. Creer le lot BDP si numero fourni
    let lotBDP = null;
    if (numero_lot) {
      try {
        lotBDP = await LotBDP.create({
          numero_lot,
          date_reception: date_reception || new Date(),
          date_retour_prevue: date_retour_prevue || null,
          nb_exemplaires: livres.filter(l => l._valid).length,
          structure_id: req.structureId || null,
          import_session_id: sessionId
        });
      } catch (lotError) {
        // Lot existe peut-etre deja
        lotBDP = await LotBDP.findOne({ where: { numero_lot } });
      }
    }

    // 6. Cleanup fichier temp
    fs.unlink(req.file.path, () => {});

    // 7. Reponse
    const validCount = livres.filter(l => l._valid).length;
    const invalidCount = livres.filter(l => !l._valid).length;

    res.json({
      success: true,
      sessionId: session.id,
      total: records.length,
      valid: validCount,
      invalid: invalidCount,
      parseErrors: parseErrors.length,
      conflicts: conflicts.hasConflicts ? conflicts : null,
      statut: session.statut,
      lotBDP: lotBDP ? {
        id: lotBDP.id,
        numero_lot: lotBDP.numero_lot,
        date_retour_prevue: lotBDP.date_retour_prevue
      } : null,
      preview: livres.slice(0, 10).map(l => ({
        titre: l.titre,
        isbn: l.isbn,
        auteurs: l.auteurs,
        editeur: l.editeur,
        annee: l.annee_publication,
        valid: l._valid,
        errors: l._errors
      }))
    });

  } catch (error) {
    console.error('Erreur upload ISO:', error);

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
 * Apercu d'une session d'import
 * GET /api/import/livres/preview/:sessionId
 */
const previewImport = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const session = await ImportSession.findByPk(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Session d\'import non trouvee'
      });
    }

    // Verifier expiration
    if (session.isExpired()) {
      return res.status(410).json({
        error: 'Expired',
        message: 'Session d\'import expiree'
      });
    }

    const livres = session.parsed_records || [];
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLivres = livres.slice(startIndex, endIndex);

    res.json({
      success: true,
      sessionId: session.id,
      statut: session.statut,
      total: session.total_records,
      valid: livres.filter(l => l._valid).length,
      invalid: livres.filter(l => !l._valid).length,
      conflicts: session.conflicts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(livres.length / limit)
      },
      livres: paginatedLivres.map(l => ({
        index: l._recordIndex,
        titre: l.titre,
        isbn: l.isbn,
        auteurs: l.auteurs,
        editeur: l.editeur,
        annee: l.annee_publication,
        pages: l.nb_pages,
        collection: l.collection,
        genres: l.genres,
        dewey: l.dewey_code,
        resume: l.resume ? l.resume.substring(0, 200) + '...' : null,
        valid: l._valid,
        errors: l._errors
      }))
    });

  } catch (error) {
    console.error('Erreur preview import:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Resoudre les conflits (creer les references manquantes)
 * POST /api/import/livres/resolve/:sessionId
 */
const resolveConflicts = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { createMissing = true, mappings = {} } = req.body;

    const session = await ImportSession.findByPk(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Session d\'import non trouvee'
      });
    }

    if (session.statut !== 'pending') {
      return res.status(400).json({
        error: 'Invalid state',
        message: 'La session n\'est pas en attente de resolution'
      });
    }

    const conflicts = session.conflicts || {};
    const resolved = {
      auteurs: 0,
      editeurs: 0,
      genres: 0,
      collections: 0
    };

    // Creer les references manquantes si demande
    if (createMissing) {
      // Auteurs
      for (const nom of (conflicts.auteurs || [])) {
        const mapped = mappings.auteurs?.[nom] || nom;
        if (mapped !== '__skip__') {
          await findOrCreateRef(Auteur, mapped);
          resolved.auteurs++;
        }
      }

      // Editeurs
      for (const nom of (conflicts.editeurs || [])) {
        const mapped = mappings.editeurs?.[nom] || nom;
        if (mapped !== '__skip__') {
          await findOrCreateRef(Editeur, mapped);
          resolved.editeurs++;
        }
      }

      // Genres
      for (const nom of (conflicts.genres || [])) {
        const mapped = mappings.genres?.[nom] || nom;
        if (mapped !== '__skip__') {
          await findOrCreateRef(GenreLitteraire, mapped);
          resolved.genres++;
        }
      }

      // Collections
      for (const nom of (conflicts.collections || [])) {
        const mapped = mappings.collections?.[nom] || nom;
        if (mapped !== '__skip__') {
          await findOrCreateCollection(mapped);
          resolved.collections++;
        }
      }
    }

    // Mettre a jour le statut de la session
    await session.update({
      statut: 'resolved',
      conflicts: null
    });

    res.json({
      success: true,
      resolved,
      statut: 'resolved'
    });

  } catch (error) {
    console.error('Erreur resolution conflits:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Confirmer et executer l'import avec streaming SSE
 * POST /api/import/livres/confirm/:sessionId
 */
const confirmImport = async (req, res) => {
  // Configuration SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (res.flush) res.flush();
  };

  try {
    const { sessionId } = req.params;
    const {
      updateExisting = false,
      skipInvalid = true,
      createExemplaires = true
    } = req.body || {};

    const session = await ImportSession.findByPk(sessionId, {
      include: [{ model: LotBDP, as: 'lotsBDP' }]
    });

    if (!session) {
      sendEvent('error', { message: 'Session d\'import non trouvee' });
      return res.end();
    }

    if (!session.canConfirm()) {
      sendEvent('error', { message: 'La session ne peut pas etre confirmee (conflits non resolus ou deja importee)' });
      return res.end();
    }

    const livres = session.parsed_records || [];
    const livresValides = skipInvalid ? livres.filter(l => l._valid) : livres;
    const total = livresValides.length;

    sendEvent('start', { total, message: `Import de ${total} livres...` });

    const lotBDP = session.lotsBDP?.[0] || null;
    const errors = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < livresValides.length; i++) {
      const dto = livresValides[i];

      try {
        await sequelize.transaction(async (t) => {
          // Chercher un livre existant (par ISBN)
          let existing = null;
          if (dto.isbn) {
            existing = await Livre.findOne({
              where: { isbn: dto.isbn },
              transaction: t
            });
          }

          let livreInstance = null;

          // Preparer les donnees du livre
          const livreData = {
            isbn: dto.isbn,
            titre: dto.titre,
            sous_titre: dto.sous_titre,
            annee_publication: dto.annee_publication,
            nb_pages: dto.nb_pages,
            resume: dto.resume,
            dewey_code: dto.dewey_code,
            source_import: session.source,
            structure_id: session.structure_id
          };

          if (existing) {
            if (updateExisting) {
              await existing.update(livreData, { transaction: t });
              livreInstance = existing;
              updated++;
            } else {
              skipped++;
              return; // Skip dans la transaction
            }
          } else {
            livreInstance = await Livre.create(livreData, { transaction: t });
            imported++;
          }

          // Creer les relations
          if (livreInstance) {
            await createLivreRelations(livreInstance, dto, t);

            // Creer un exemplaire si demande et lot BDP existant
            if (createExemplaires && lotBDP) {
              await ExemplaireLivre.create({
                livre_id: livreInstance.id,
                lot_bdp_id: lotBDP.id,
                statut: 'disponible',
                structure_id: session.structure_id
              }, { transaction: t });
            }
          }
        });

        // Envoyer la progression
        sendEvent('progress', {
          current: i + 1,
          total,
          percent: Math.round(((i + 1) / total) * 100),
          titre: dto.titre,
          status: existing && !updateExisting ? 'skipped' : (existing ? 'updated' : 'created'),
          imported,
          updated,
          skipped,
          errors: errors.length
        });

      } catch (err) {
        errors.push({
          index: dto._recordIndex,
          titre: dto.titre,
          isbn: dto.isbn,
          error: err.message
        });

        sendEvent('progress', {
          current: i + 1,
          total,
          percent: Math.round(((i + 1) / total) * 100),
          titre: dto.titre,
          status: 'error',
          imported,
          updated,
          skipped,
          errors: errors.length
        });
      }
    }

    // Mettre a jour la session
    await session.update({
      statut: 'imported',
      imported_count: imported,
      error_count: errors.length,
      import_log: errors.length > 0 ? errors : null
    });

    // Mettre a jour le compteur du lot BDP
    if (lotBDP) {
      await lotBDP.updateExemplaireCount();
    }

    // Envoyer le resultat final
    sendEvent('complete', {
      success: true,
      imported,
      updated,
      skipped,
      errors: errors.length,
      errorDetails: errors.slice(0, 20) // Limiter les details d'erreur
    });

    res.end();

  } catch (error) {
    console.error('Erreur confirmation import:', error);
    sendEvent('error', { message: error.message });
    res.end();
  }
};

/**
 * Historique des imports
 * GET /api/import/livres/history
 */
const getImportHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.structureId) {
      where.structure_id = req.structureId;
    }

    const { count, rows } = await ImportSession.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [
        { model: LotBDP, as: 'lotsBDP' }
      ]
    });

    res.json({
      success: true,
      sessions: rows.map(s => ({
        id: s.id,
        type: s.type,
        source: s.source,
        filename: s.filename,
        total_records: s.total_records,
        imported_count: s.imported_count,
        error_count: s.error_count,
        statut: s.statut,
        lotBDP: s.lotsBDP?.[0] ? {
          numero_lot: s.lotsBDP[0].numero_lot,
          date_retour_prevue: s.lotsBDP[0].date_retour_prevue
        } : null,
        created_at: s.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Erreur historique import:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Annuler une session d'import
 * DELETE /api/import/livres/cancel/:sessionId
 */
const cancelImport = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ImportSession.findByPk(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Session d\'import non trouvee'
      });
    }

    if (session.statut === 'imported') {
      return res.status(400).json({
        error: 'Cannot cancel',
        message: 'L\'import a deja ete effectue'
      });
    }

    await session.update({ statut: 'cancelled' });

    res.json({
      success: true,
      message: 'Session annulee'
    });

  } catch (error) {
    console.error('Erreur annulation import:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Gestion des lots BDP
 * GET /api/import/livres/lots
 */
const getLotsBDP = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.structureId) {
      where.structure_id = req.structureId;
    }
    if (status === 'enCours') {
      where.retourne = false;
    } else if (status === 'retourne') {
      where.retourne = true;
    }

    const { count, rows } = await LotBDP.findAndCountAll({
      where,
      order: [['date_retour_prevue', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      lots: rows.map(l => ({
        id: l.id,
        numero_lot: l.numero_lot,
        date_reception: l.date_reception,
        date_retour_prevue: l.date_retour_prevue,
        retourne: l.retourne,
        date_retour_effectif: l.date_retour_effectif,
        nb_exemplaires: l.nb_exemplaires,
        nb_exemplaires_retournes: l.nb_exemplaires_retournes,
        isOverdue: l.isOverdue(),
        daysUntilReturn: l.getDaysUntilReturn(),
        notes: l.notes
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Erreur liste lots BDP:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Marquer un lot BDP comme retourne
 * POST /api/import/livres/lots/:lotId/retour
 */
const marquerLotRetourne = async (req, res) => {
  try {
    const { lotId } = req.params;
    const { nb_exemplaires_retournes } = req.body;

    const lot = await LotBDP.findByPk(lotId);

    if (!lot) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Lot BDP non trouve'
      });
    }

    await lot.marquerRetourne(nb_exemplaires_retournes);

    // Mettre a jour le statut des exemplaires du lot
    await ExemplaireLivre.update(
      { statut: 'retourne_bdp' },
      { where: { lot_bdp_id: lot.id } }
    );

    res.json({
      success: true,
      lot: {
        id: lot.id,
        numero_lot: lot.numero_lot,
        retourne: lot.retourne,
        date_retour_effectif: lot.date_retour_effectif,
        nb_exemplaires_retournes: lot.nb_exemplaires_retournes
      }
    });

  } catch (error) {
    console.error('Erreur marquage retour lot:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Statistiques des lots BDP
 * GET /api/import/livres/lots/stats
 */
const getLotsBDPStats = async (req, res) => {
  try {
    const stats = await LotBDP.getStats(req.structureId);
    const overdue = await LotBDP.findOverdue(req.structureId);
    const upcoming = await LotBDP.findUpcomingReturns(30, req.structureId);

    res.json({
      success: true,
      stats,
      alertes: {
        enRetard: overdue.map(l => ({
          id: l.id,
          numero_lot: l.numero_lot,
          date_retour_prevue: l.date_retour_prevue,
          jours_retard: Math.abs(l.getDaysUntilReturn())
        })),
        prochains: upcoming.map(l => ({
          id: l.id,
          numero_lot: l.numero_lot,
          date_retour_prevue: l.date_retour_prevue,
          jours_restants: l.getDaysUntilReturn()
        }))
      }
    });

  } catch (error) {
    console.error('Erreur stats lots BDP:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

module.exports = {
  uploadISO,
  previewImport,
  resolveConflicts,
  confirmImport,
  getImportHistory,
  cancelImport,
  getLotsBDP,
  marquerLotRetourne,
  getLotsBDPStats
};
