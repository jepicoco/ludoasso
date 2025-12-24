/**
 * Service de validation des emprunts pour le scanner
 *
 * Centralise toutes les verifications avant emprunt :
 * - Adhesion a l'organisation (si requise)
 * - Cotisation a la structure (si requise)
 * - Reservations (par autre ou par l'usager)
 * - Limites d'emprunts (generale, nouveautes, par genre)
 */

const {
  Emprunt, Cotisation, Reservation, Structure,
  ParametresFront, LimiteEmpruntGenre, Utilisateur,
  Jeu, Livre, Film, Disque,
  Categorie, GenreLitteraire, GenreFilm, GenreMusical
} = require('../models');
const { Op } = require('sequelize');
const limiteEmpruntService = require('./limiteEmpruntService');

// Mapping type article -> module
const TYPE_TO_MODULE = {
  jeu: 'ludotheque',
  livre: 'bibliotheque',
  film: 'filmotheque',
  disque: 'discotheque'
};

// Mapping module -> configuration
const MODULE_CONFIG = {
  ludotheque: {
    itemType: 'jeu',
    model: Jeu,
    foreignKey: 'jeu_id',
    genreModel: Categorie,
    genreAssociation: 'categoriesRef'
  },
  bibliotheque: {
    itemType: 'livre',
    model: Livre,
    foreignKey: 'livre_id',
    genreModel: GenreLitteraire,
    genreAssociation: 'genresRef'
  },
  filmotheque: {
    itemType: 'film',
    model: Film,
    foreignKey: 'film_id',
    genreModel: GenreFilm,
    genreAssociation: 'genresRef'
  },
  discotheque: {
    itemType: 'disque',
    model: Disque,
    foreignKey: 'disque_id',
    genreModel: GenreMusical,
    genreAssociation: 'genresRef'
  }
};

/**
 * Valide un emprunt avant creation
 *
 * @param {Object} params
 * @param {number} params.utilisateurId - ID de l'utilisateur
 * @param {number} params.articleId - ID de l'article
 * @param {string} params.articleType - Type d'article (jeu, livre, film, disque)
 * @param {number} params.structureId - ID de la structure
 * @returns {Promise<Object>} Resultat de validation
 */
async function validateEmprunt({ utilisateurId, articleId, articleType, structureId }) {
  const result = {
    canProceed: true,
    blocking: [],
    warnings: [],
    info: null,
    adhesion: null,
    cotisation: null,
    reservation: null,
    limites: {
      generale: null,
      nouveautes: null,
      genres: []
    },
    article: null,
    utilisateur: null
  };

  try {
    // Charger les donnees necessaires
    const [structure, utilisateur, params] = await Promise.all([
      Structure.findByPk(structureId),
      Utilisateur.findByPk(utilisateurId),
      ParametresFront.getParametres()
    ]);

    if (!structure) {
      result.canProceed = false;
      result.blocking.push({
        type: 'structure_introuvable',
        message: 'Structure introuvable',
        canOverride: false
      });
      return result;
    }

    if (!utilisateur) {
      result.canProceed = false;
      result.blocking.push({
        type: 'utilisateur_introuvable',
        message: 'Utilisateur introuvable',
        canOverride: false
      });
      return result;
    }

    result.utilisateur = {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email
    };

    // Charger l'article avec ses genres
    const module = TYPE_TO_MODULE[articleType];
    const config = MODULE_CONFIG[module];
    if (!config) {
      result.canProceed = false;
      result.blocking.push({
        type: 'type_article_invalide',
        message: `Type d'article invalide: ${articleType}`,
        canOverride: false
      });
      return result;
    }

    const article = await config.model.findByPk(articleId, {
      include: config.genreModel ? [{
        model: config.genreModel,
        as: config.genreAssociation,
        required: false
      }] : []
    });

    if (!article) {
      result.canProceed = false;
      result.blocking.push({
        type: 'article_introuvable',
        message: 'Article introuvable',
        canOverride: false
      });
      return result;
    }

    result.article = {
      id: article.id,
      titre: article.titre,
      type: articleType,
      statut: article.statut,
      estNouveaute: limiteEmpruntService.isNouveaute(article, module, params)
    };

    // ========== 1. Verifier adhesion organisation ==========
    if (structure.adhesion_organisation_obligatoire && structure.organisation_id) {
      const adhesionResult = await checkAdhesionOrganisation(utilisateur, structure);
      result.adhesion = adhesionResult;

      if (!adhesionResult.valide) {
        result.warnings.push({
          type: 'adhesion_expiree',
          message: adhesionResult.dateExpiration
            ? `Adhesion expir\u00e9e le ${formatDate(adhesionResult.dateExpiration)}`
            : `Aucune adhesion a l'organisation`,
          canOverride: true,
          canSendReminder: true
        });
      } else if (adhesionResult.joursRestants <= 7) {
        result.info = `Adhesion expire dans ${adhesionResult.joursRestants} jour(s)`;
      }
    }

    // ========== 2. Verifier cotisation structure ==========
    if (structure.cotisation_obligatoire) {
      const cotisationResult = await checkCotisation(utilisateurId, structureId);
      result.cotisation = cotisationResult;

      if (!cotisationResult.valide) {
        result.warnings.push({
          type: 'cotisation_expiree',
          message: cotisationResult.dateExpiration
            ? `Cotisation expir\u00e9e le ${formatDate(cotisationResult.dateExpiration)}`
            : `Aucune cotisation active pour cette structure`,
          canOverride: true,
          canSendReminder: true
        });
      } else if (cotisationResult.joursRestants <= 7) {
        if (!result.info) {
          result.info = `Cotisation expire dans ${cotisationResult.joursRestants} jour(s)`;
        }
      }
    }

    // ========== 3. Verifier reservations ==========
    const reservationResult = await checkReservation(utilisateurId, articleType, articleId);
    result.reservation = reservationResult;

    if (reservationResult.exists) {
      if (reservationResult.isCurrentUser) {
        // Reservation par l'usager courant - info positive
        result.info = `Article reserv\u00e9 par vous. La reservation sera convertie en emprunt.`;
      } else {
        // Reservation par un autre - avertissement outrepassable
        result.warnings.push({
          type: 'reserve_autre',
          message: `Article reserv\u00e9 par ${reservationResult.reservedBy.prenom} ${reservationResult.reservedBy.nom}`,
          canOverride: true,
          cancelReservation: true
        });
      }
    }

    // ========== 4. Verifier limites d'emprunts ==========
    const limitesResult = await checkLimitesEmprunt(utilisateurId, module, article, params, structureId);
    result.limites = limitesResult.limites;

    // Ajouter les erreurs/warnings de limites
    for (const error of limitesResult.errors) {
      result.blocking.push({
        type: error.type,
        message: error.message,
        canOverride: false,
        current: error.current,
        limit: error.limit
      });
    }

    for (const warning of limitesResult.warnings) {
      result.warnings.push({
        type: warning.type,
        message: warning.message,
        canOverride: true,
        current: warning.current,
        limit: warning.limit
      });
    }

    // ========== Determiner si on peut continuer ==========
    result.canProceed = result.blocking.length === 0;

  } catch (error) {
    console.error('[ScannerValidation] Erreur:', error);
    result.canProceed = false;
    result.blocking.push({
      type: 'erreur_systeme',
      message: `Erreur systeme: ${error.message}`,
      canOverride: false
    });
  }

  return result;
}

/**
 * Verifie l'adhesion a l'organisation parente
 */
async function checkAdhesionOrganisation(utilisateur, structure) {
  // Pour l'instant, on verifie s'il existe une cotisation avec adhesion_association = true
  // dans n'importe quelle structure de l'organisation
  const result = {
    required: true,
    valide: false,
    dateExpiration: null,
    joursRestants: 0
  };

  try {
    // Chercher une cotisation avec adhesion_association dans l'organisation
    const cotisation = await Cotisation.findOne({
      where: {
        utilisateur_id: utilisateur.id,
        adhesion_association: true,
        statut: 'en_cours',
        periode_fin: { [Op.gte]: new Date() }
      },
      include: [{
        model: Structure,
        as: 'structure',
        where: { organisation_id: structure.organisation_id },
        required: false
      }],
      order: [['periode_fin', 'DESC']]
    });

    if (cotisation) {
      result.valide = true;
      result.dateExpiration = cotisation.periode_fin;
      result.joursRestants = cotisation.joursRestants();
    }
  } catch (error) {
    console.error('[ScannerValidation] Erreur verification adhesion:', error);
  }

  return result;
}

/**
 * Verifie la cotisation pour la structure
 */
async function checkCotisation(utilisateurId, structureId) {
  const result = {
    required: true,
    valide: false,
    dateExpiration: null,
    joursRestants: 0
  };

  try {
    // Chercher une cotisation active pour cette structure
    const cotisation = await Cotisation.findOne({
      where: {
        utilisateur_id: utilisateurId,
        structure_id: structureId,
        statut: 'en_cours',
        periode_debut: { [Op.lte]: new Date() },
        periode_fin: { [Op.gte]: new Date() }
      },
      order: [['periode_fin', 'DESC']]
    });

    if (cotisation) {
      result.valide = true;
      result.dateExpiration = cotisation.periode_fin;
      result.joursRestants = cotisation.joursRestants();
    } else {
      // Chercher la derniere cotisation expiree pour la date
      const lastCotisation = await Cotisation.findOne({
        where: {
          utilisateur_id: utilisateurId,
          structure_id: structureId
        },
        order: [['periode_fin', 'DESC']]
      });

      if (lastCotisation) {
        result.dateExpiration = lastCotisation.periode_fin;
      }
    }
  } catch (error) {
    console.error('[ScannerValidation] Erreur verification cotisation:', error);
  }

  return result;
}

/**
 * Verifie les reservations pour l'article
 */
async function checkReservation(utilisateurId, articleType, articleId) {
  const result = {
    exists: false,
    isCurrentUser: false,
    reservedBy: null
  };

  try {
    const foreignKey = `${articleType}_id`;

    // Chercher une reservation active (en_attente ou prete)
    const reservation = await Reservation.findOne({
      where: {
        [foreignKey]: articleId,
        statut: { [Op.in]: ['en_attente', 'prete'] }
      },
      include: [{
        model: Utilisateur,
        as: 'utilisateur',
        attributes: ['id', 'nom', 'prenom', 'email']
      }],
      order: [['position_queue', 'ASC'], ['date_creation', 'ASC']]
    });

    if (reservation) {
      result.exists = true;
      result.isCurrentUser = reservation.utilisateur_id === utilisateurId;
      result.reservedBy = reservation.utilisateur ? {
        id: reservation.utilisateur.id,
        nom: reservation.utilisateur.nom,
        prenom: reservation.utilisateur.prenom
      } : null;
      result.reservationId = reservation.id;
      result.statut = reservation.statut;
    }
  } catch (error) {
    console.error('[ScannerValidation] Erreur verification reservation:', error);
  }

  return result;
}

/**
 * Verifie les limites d'emprunt
 */
async function checkLimitesEmprunt(utilisateurId, module, article, params, structureId) {
  const result = {
    errors: [],
    warnings: [],
    limites: {
      generale: null,
      nouveautes: null,
      genres: []
    }
  };

  // Verifier si les limites sont actives pour ce module
  const limiteActiveKey = `limite_emprunt_active_${module}`;
  if (!params[limiteActiveKey]) {
    return result;
  }

  const config = MODULE_CONFIG[module];

  // Limite generale
  const limiteGenerale = params[`limite_emprunt_${module}`] || 5;
  const limiteBloquante = params[`limite_emprunt_bloquante_${module}`] !== false;
  const currentTotal = await limiteEmpruntService.countEmpruntsEnCours(utilisateurId, module);

  result.limites.generale = {
    current: currentTotal,
    max: limiteGenerale,
    bloquante: limiteBloquante
  };

  if (currentTotal >= limiteGenerale) {
    const violation = {
      type: 'limite_generale',
      message: `Limite emprunts ${getModuleLabel(module)} atteinte (${currentTotal}/${limiteGenerale})`,
      current: currentTotal,
      limit: limiteGenerale
    };

    if (limiteBloquante) {
      result.errors.push(violation);
    } else {
      result.warnings.push(violation);
    }
  }

  // Limite nouveautes
  const limiteNouveaute = params[`limite_emprunt_nouveaute_${module}`] || 1;
  const isNouveaute = limiteEmpruntService.isNouveaute(article, module, params);

  if (isNouveaute) {
    const currentNouveautes = await limiteEmpruntService.countEmpruntsNouveautes(utilisateurId, module, params);

    result.limites.nouveautes = {
      current: currentNouveautes,
      max: limiteNouveaute,
      bloquante: limiteBloquante
    };

    if (currentNouveautes >= limiteNouveaute) {
      const violation = {
        type: 'limite_nouveaute',
        message: `Limite nouveaut\u00e9s atteinte (${currentNouveautes}/${limiteNouveaute})`,
        current: currentNouveautes,
        limit: limiteNouveaute
      };

      if (limiteBloquante) {
        result.errors.push(violation);
      } else {
        result.warnings.push(violation);
      }
    }
  }

  // Limites par genre
  const genres = getGenresFromArticle(article, config);
  const limitesGenre = await LimiteEmpruntGenre.findAll({
    where: {
      module,
      actif: true,
      [Op.or]: [
        { structure_id: structureId },
        { structure_id: null }
      ],
      genre_id: { [Op.in]: genres.map(g => g.id) }
    }
  });

  for (const limiteGenre of limitesGenre) {
    const genre = genres.find(g => g.id === limiteGenre.genre_id);
    const currentGenre = await limiteEmpruntService.countEmpruntsParGenre(utilisateurId, module, limiteGenre.genre_id);

    result.limites.genres.push({
      id: limiteGenre.genre_id,
      nom: genre?.nom || limiteGenre.genre_nom,
      current: currentGenre,
      max: limiteGenre.limite_max,
      bloquante: limiteBloquante
    });

    if (currentGenre >= limiteGenre.limite_max) {
      const violation = {
        type: 'limite_genre',
        message: `Limite "${genre?.nom || limiteGenre.genre_nom}" atteinte (${currentGenre}/${limiteGenre.limite_max})`,
        current: currentGenre,
        limit: limiteGenre.limite_max,
        genreId: limiteGenre.genre_id,
        genreNom: genre?.nom || limiteGenre.genre_nom
      };

      if (limiteBloquante) {
        result.errors.push(violation);
      } else {
        result.warnings.push(violation);
      }
    }
  }

  return result;
}

/**
 * Recupere un resume des limites actuelles pour un utilisateur
 */
async function getLimitsSummary(utilisateurId, structureId) {
  const summary = {
    modules: {}
  };

  try {
    const [structure, params] = await Promise.all([
      Structure.findByPk(structureId),
      ParametresFront.getParametres()
    ]);

    if (!structure) return summary;

    const modulesActifs = structure.modules_actifs || ['jeux', 'livres', 'films', 'disques'];

    for (const moduleCode of modulesActifs) {
      const module = TYPE_TO_MODULE[moduleCode] || `${moduleCode.slice(0, -1)}theque`;

      // Verifier si les limites sont actives
      const limiteActiveKey = `limite_emprunt_active_${module}`;
      if (!params[limiteActiveKey]) continue;

      const limiteGenerale = params[`limite_emprunt_${module}`] || 5;
      const limiteNouveaute = params[`limite_emprunt_nouveaute_${module}`] || 1;
      const limiteBloquante = params[`limite_emprunt_bloquante_${module}`] !== false;

      const currentTotal = await limiteEmpruntService.countEmpruntsEnCours(utilisateurId, module);
      const currentNouveautes = await limiteEmpruntService.countEmpruntsNouveautes(utilisateurId, module, params);

      // Limites par genre
      const limitesGenre = await LimiteEmpruntGenre.findAll({
        where: {
          module,
          actif: true,
          [Op.or]: [
            { structure_id: structureId },
            { structure_id: null }
          ]
        }
      });

      const genres = [];
      for (const limite of limitesGenre) {
        const current = await limiteEmpruntService.countEmpruntsParGenre(utilisateurId, module, limite.genre_id);
        genres.push({
          id: limite.genre_id,
          nom: limite.genre_nom,
          current,
          max: limite.limite_max
        });
      }

      summary.modules[module] = {
        label: getModuleLabel(module),
        generale: {
          current: currentTotal,
          max: limiteGenerale,
          bloquante: limiteBloquante
        },
        nouveautes: {
          current: currentNouveautes,
          max: limiteNouveaute
        },
        genres
      };
    }
  } catch (error) {
    console.error('[ScannerValidation] Erreur getLimitsSummary:', error);
  }

  return summary;
}

/**
 * Recupere l'etat complet de l'utilisateur pour le scanner
 */
async function getUserStatus(utilisateurId, structureId) {
  const status = {
    utilisateur: null,
    adhesion: null,
    cotisation: null,
    limites: null,
    empruntsEnCours: [],
    reservationsActives: []
  };

  try {
    const [utilisateur, structure] = await Promise.all([
      Utilisateur.findByPk(utilisateurId),
      Structure.findByPk(structureId)
    ]);

    if (!utilisateur || !structure) return status;

    status.utilisateur = {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email,
      statut: utilisateur.statut
    };

    // Adhesion
    if (structure.adhesion_organisation_obligatoire && structure.organisation_id) {
      status.adhesion = await checkAdhesionOrganisation(utilisateur, structure);
      status.adhesion.required = true;
    } else {
      status.adhesion = { required: false, valide: true };
    }

    // Cotisation
    if (structure.cotisation_obligatoire) {
      status.cotisation = await checkCotisation(utilisateurId, structureId);
      status.cotisation.required = true;
    } else {
      status.cotisation = { required: false, valide: true };
    }

    // Limites
    status.limites = await getLimitsSummary(utilisateurId, structureId);

    // Emprunts en cours
    const emprunts = await Emprunt.findAll({
      where: {
        utilisateur_id: utilisateurId,
        statut: 'en_cours'
      },
      include: [
        { model: Jeu, as: 'jeu', attributes: ['id', 'titre'] },
        { model: Livre, as: 'livre', attributes: ['id', 'titre'] },
        { model: Film, as: 'film', attributes: ['id', 'titre'] },
        { model: Disque, as: 'disque', attributes: ['id', 'titre'] }
      ],
      order: [['date_retour_prevue', 'ASC']]
    });

    const today = new Date();
    status.empruntsEnCours = emprunts.map(e => {
      const itemType = e.jeu_id ? 'jeu' : e.livre_id ? 'livre' : e.film_id ? 'film' : 'disque';
      const item = e[itemType];
      const retour = new Date(e.date_retour_prevue);
      const retard = daysBetween(retour, today);

      return {
        id: e.id,
        type: itemType,
        titre: item?.titre || 'Article inconnu',
        dateRetour: e.date_retour_prevue,
        retardJours: retard > 0 ? retard : 0,
        enRetard: retard > 0
      };
    });

    // Reservations actives
    const reservations = await Reservation.findAll({
      where: {
        utilisateur_id: utilisateurId,
        statut: { [Op.in]: ['en_attente', 'prete'] }
      },
      include: [
        { model: Jeu, as: 'jeu', attributes: ['id', 'titre'] },
        { model: Livre, as: 'livre', attributes: ['id', 'titre'] },
        { model: Film, as: 'film', attributes: ['id', 'titre'] },
        { model: Disque, as: 'disque', attributes: ['id', 'titre'] }
      ],
      order: [['date_creation', 'ASC']]
    });

    status.reservationsActives = reservations.map(r => {
      const itemType = r.getItemType();
      const item = r[itemType];
      return {
        id: r.id,
        type: itemType,
        titre: item?.titre || 'Article inconnu',
        statut: r.statut,
        dateExpiration: r.date_expiration,
        joursRestants: r.joursAvantExpiration()
      };
    });

  } catch (error) {
    console.error('[ScannerValidation] Erreur getUserStatus:', error);
  }

  return status;
}

// ========== Helpers ==========

function getGenresFromArticle(article, config) {
  if (!config.genreAssociation) return [];
  const genres = article[config.genreAssociation];
  if (!genres || !Array.isArray(genres)) return [];
  return genres.map(g => ({ id: g.id, nom: g.nom }));
}

function getModuleLabel(module) {
  const labels = {
    ludotheque: 'Jeux',
    bibliotheque: 'Livres',
    filmotheque: 'Films',
    discotheque: 'Disques'
  };
  return labels[module] || module;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Calcule le nombre de jours entre deux dates
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2 - d1;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Recupere les informations completes pour un retour
 * Utilise pour l'affichage fluide sans modal
 */
async function getReturnInfo(articleType, articleId, structureId) {
  const result = {
    found: false,
    emprunt: null,
    emprunteur: null,
    empruntsEnCours: [],
    reservations: [],
    articleReservePar: null,
    article: null
  };

  try {
    const module = TYPE_TO_MODULE[articleType];
    const config = MODULE_CONFIG[module];
    if (!config) {
      return result;
    }

    // Trouver l'emprunt en cours pour cet article
    const foreignKey = config.foreignKey;
    const emprunt = await Emprunt.findOne({
      where: {
        [foreignKey]: articleId,
        statut: 'en_cours'
      },
      include: [{
        model: Utilisateur,
        as: 'utilisateur',
        attributes: ['id', 'nom', 'prenom', 'email', 'statut', 'code_barre']
      }]
    });

    if (!emprunt || !emprunt.utilisateur) {
      return result;
    }

    result.found = true;
    const utilisateur = emprunt.utilisateur;

    // Charger l'article
    const article = await config.model.findByPk(articleId);
    result.article = {
      id: article.id,
      titre: article.titre,
      type: articleType,
      codeBarre: article.code_barre
    };

    // Calculer les infos de l'emprunt
    const today = new Date();
    const dateEmprunt = new Date(emprunt.date_emprunt);
    const dateRetourPrevue = new Date(emprunt.date_retour_prevue);
    const dureeJours = daysBetween(dateEmprunt, today);
    const retardJours = daysBetween(dateRetourPrevue, today);

    result.emprunt = {
      id: emprunt.id,
      dateEmprunt: emprunt.date_emprunt,
      dateRetourPrevue: emprunt.date_retour_prevue,
      dureeJours: dureeJours,
      retardJours: retardJours > 0 ? retardJours : 0,
      enRetard: retardJours > 0
    };

    // Charger la structure pour verifier cotisation/adhesion
    const structure = await Structure.findByPk(structureId);

    // Infos cotisation
    let cotisationInfo = { valide: true, required: false, statut: 'not_required' };
    if (structure && structure.cotisation_obligatoire) {
      const cotisResult = await checkCotisation(utilisateur.id, structureId);
      cotisationInfo = {
        required: true,
        valide: cotisResult.valide,
        dateExpiration: cotisResult.dateExpiration,
        joursRestants: cotisResult.joursRestants,
        statut: cotisResult.valide
          ? (cotisResult.joursRestants <= 30 ? 'warning' : 'ok')
          : 'expired'
      };
    }

    // Infos adhesion
    let adhesionInfo = { required: false, valide: true, statut: 'not_required' };
    if (structure && structure.adhesion_organisation_obligatoire && structure.organisation_id) {
      const adhesionResult = await checkAdhesionOrganisation(utilisateur, structure);
      adhesionInfo = {
        required: true,
        valide: adhesionResult.valide,
        dateExpiration: adhesionResult.dateExpiration,
        joursRestants: adhesionResult.joursRestants,
        statut: adhesionResult.valide ? 'ok' : 'expired'
      };
    }

    result.emprunteur = {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email,
      statut: utilisateur.statut,
      codeBarre: utilisateur.code_barre,
      cotisation: cotisationInfo,
      adhesion: adhesionInfo
    };

    // Autres emprunts en cours de cet utilisateur (excluant celui-ci)
    const autresEmprunts = await Emprunt.findAll({
      where: {
        utilisateur_id: utilisateur.id,
        statut: 'en_cours',
        id: { [Op.ne]: emprunt.id }
      },
      include: [
        { model: Jeu, as: 'jeu', attributes: ['id', 'titre'] },
        { model: Livre, as: 'livre', attributes: ['id', 'titre'] },
        { model: Film, as: 'film', attributes: ['id', 'titre'] },
        { model: Disque, as: 'disque', attributes: ['id', 'titre'] }
      ],
      order: [['date_retour_prevue', 'ASC']]
    });

    result.empruntsEnCours = autresEmprunts.map(e => {
      const itemType = e.jeu_id ? 'jeu' : e.livre_id ? 'livre' : e.film_id ? 'film' : 'disque';
      const item = e[itemType];
      const retour = new Date(e.date_retour_prevue);
      const retard = daysBetween(retour, today);

      return {
        id: e.id,
        titre: item?.titre || 'Article inconnu',
        type: itemType,
        dateRetour: e.date_retour_prevue,
        retardJours: retard > 0 ? retard : 0,
        enRetard: retard > 0
      };
    });

    // Reservations de cet utilisateur
    const reservationsUser = await Reservation.findAll({
      where: {
        utilisateur_id: utilisateur.id,
        statut: { [Op.in]: ['en_attente', 'prete'] }
      },
      include: [
        { model: Jeu, as: 'jeu', attributes: ['id', 'titre'] },
        { model: Livre, as: 'livre', attributes: ['id', 'titre'] },
        { model: Film, as: 'film', attributes: ['id', 'titre'] },
        { model: Disque, as: 'disque', attributes: ['id', 'titre'] }
      ],
      order: [['date_creation', 'ASC']]
    });

    result.reservations = reservationsUser.map(r => {
      const itemType = r.jeu_id ? 'jeu' : r.livre_id ? 'livre' : r.film_id ? 'film' : 'disque';
      const item = r[itemType];
      return {
        id: r.id,
        titre: item?.titre || 'Article inconnu',
        type: itemType,
        position: r.position_queue || 1,
        statut: r.statut
      };
    });

    // Verifier si l'article retourne est reserve par quelqu'un d'autre
    const reservationArticle = await Reservation.findOne({
      where: {
        [`${articleType}_id`]: articleId,
        statut: { [Op.in]: ['en_attente', 'prete'] }
      },
      include: [{
        model: Utilisateur,
        as: 'utilisateur',
        attributes: ['id', 'nom', 'prenom', 'email']
      }],
      order: [['position_queue', 'ASC'], ['date_creation', 'ASC']]
    });

    if (reservationArticle) {
      result.articleReservePar = {
        exists: true,
        reservataire: {
          id: reservationArticle.utilisateur?.id,
          nom: reservationArticle.utilisateur?.nom,
          prenom: reservationArticle.utilisateur?.prenom
        },
        reservationId: reservationArticle.id,
        statut: reservationArticle.statut
      };
    } else {
      result.articleReservePar = { exists: false };
    }

  } catch (error) {
    console.error('[ScannerValidation] Erreur getReturnInfo:', error);
  }

  return result;
}

/**
 * Recupere un resume compact d'un utilisateur pour la liste de session
 */
async function getUserSummary(utilisateurId, structureId) {
  try {
    const utilisateur = await Utilisateur.findByPk(utilisateurId);
    if (!utilisateur) return null;

    const structure = await Structure.findByPk(structureId);

    // Cotisation
    let cotisStatut = 'not_required';
    if (structure && structure.cotisation_obligatoire) {
      const cotis = await checkCotisation(utilisateurId, structureId);
      cotisStatut = cotis.valide
        ? (cotis.joursRestants <= 30 ? 'warning' : 'ok')
        : 'expired';
    }

    // Adhesion
    let adhesionStatut = 'not_required';
    if (structure && structure.adhesion_organisation_obligatoire && structure.organisation_id) {
      const adhesion = await checkAdhesionOrganisation(utilisateur, structure);
      adhesionStatut = adhesion.valide ? 'ok' : 'expired';
    }

    // Compter emprunts en cours
    const empruntsCount = await Emprunt.count({
      where: {
        utilisateur_id: utilisateurId,
        statut: 'en_cours'
      }
    });

    // Compter reservations
    const reservationsCount = await Reservation.count({
      where: {
        utilisateur_id: utilisateurId,
        statut: { [Op.in]: ['en_attente', 'prete'] }
      }
    });

    return {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      initiales: (utilisateur.prenom[0] + utilisateur.nom[0]).toUpperCase(),
      cotisationStatut: cotisStatut,
      adhesionStatut: adhesionStatut,
      empruntsCount,
      reservationsCount
    };
  } catch (error) {
    console.error('[ScannerValidation] Erreur getUserSummary:', error);
    return null;
  }
}

module.exports = {
  validateEmprunt,
  getLimitsSummary,
  getUserStatus,
  getReturnInfo,
  getUserSummary,
  checkCotisation,
  checkAdhesionOrganisation,
  checkReservation,
  TYPE_TO_MODULE,
  MODULE_CONFIG
};
