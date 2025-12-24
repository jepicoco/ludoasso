/**
 * Routes Scanner
 *
 * Endpoints pour la validation des emprunts et le statut usager
 */

const express = require('express');
const router = express.Router();
const scannerValidationService = require('../services/scannerValidationService');
const eventTriggerService = require('../services/eventTriggerService');
const { Utilisateur, Reservation, Emprunt, Jeu, Livre, Film, Disque, Structure, ParametresFront } = require('../models');
const { Op } = require('sequelize');
const { verifyToken } = require('../middleware/auth');

// Toutes les routes scanner necessitent une authentification
router.use(verifyToken);

/**
 * POST /api/scanner/validate-loan
 *
 * Valide un emprunt avant creation
 * Retourne les blocages, avertissements et informations
 */
router.post('/validate-loan', async (req, res) => {
  try {
    const { utilisateur_id, article_id, article_type, structure_id } = req.body;

    // Validation des parametres
    if (!utilisateur_id || !article_id || !article_type) {
      return res.status(400).json({
        error: 'Parametres manquants: utilisateur_id, article_id, article_type requis'
      });
    }

    // Utiliser la structure du contexte si non fournie
    const structureId = structure_id || req.structureId || 1;

    const result = await scannerValidationService.validateEmprunt({
      utilisateurId: utilisateur_id,
      articleId: article_id,
      articleType: article_type,
      structureId
    });

    res.json(result);
  } catch (error) {
    console.error('[Scanner] Erreur validate-loan:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scanner/user-status/:utilisateurId
 *
 * Recupere le statut complet d'un utilisateur pour le scanner
 * (cotisation, adhesion, limites, reservations)
 */
router.get('/user-status/:utilisateurId', async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const structureId = req.query.structure_id || req.structureId || 1;

    const status = await scannerValidationService.getUserStatus(
      parseInt(utilisateurId),
      parseInt(structureId)
    );

    res.json(status);
  } catch (error) {
    console.error('[Scanner] Erreur user-status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scanner/limits-summary/:utilisateurId
 *
 * Recupere le resume des limites d'emprunt pour un utilisateur
 */
router.get('/limits-summary/:utilisateurId', async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const structureId = req.query.structure_id || req.structureId || 1;

    const summary = await scannerValidationService.getLimitsSummary(
      parseInt(utilisateurId),
      parseInt(structureId)
    );

    res.json(summary);
  } catch (error) {
    console.error('[Scanner] Erreur limits-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scanner/return-info/:articleType/:articleId
 *
 * Recupere les informations completes pour un retour
 * (emprunteur, emprunt, autres emprunts, reservations, etc.)
 */
router.get('/return-info/:articleType/:articleId', async (req, res) => {
  try {
    const { articleType, articleId } = req.params;
    const structureId = req.query.structure_id || req.structureId || 1;

    if (!['jeu', 'livre', 'film', 'disque'].includes(articleType)) {
      return res.status(400).json({ error: 'Type d\'article invalide' });
    }

    const info = await scannerValidationService.getReturnInfo(
      articleType,
      parseInt(articleId),
      parseInt(structureId)
    );

    res.json(info);
  } catch (error) {
    console.error('[Scanner] Erreur return-info:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scanner/user-summary/:utilisateurId
 *
 * Recupere un resume compact d'un utilisateur pour la liste de session
 */
router.get('/user-summary/:utilisateurId', async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const structureId = req.query.structure_id || req.structureId || 1;

    const summary = await scannerValidationService.getUserSummary(
      parseInt(utilisateurId),
      parseInt(structureId)
    );

    if (!summary) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json(summary);
  } catch (error) {
    console.error('[Scanner] Erreur user-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scanner/send-reminder
 *
 * Envoie un rappel par email (cotisation ou adhesion)
 */
router.post('/send-reminder', async (req, res) => {
  try {
    const { utilisateur_id, type, structure_id } = req.body;

    if (!utilisateur_id || !type) {
      return res.status(400).json({
        error: 'Parametres manquants: utilisateur_id, type requis'
      });
    }

    const utilisateur = await Utilisateur.findByPk(utilisateur_id);
    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Determiner le trigger a utiliser
    let triggerCode;
    if (type === 'cotisation') {
      triggerCode = 'COTISATION_RAPPEL';
    } else if (type === 'adhesion') {
      triggerCode = 'ADHESION_RAPPEL'; // A creer si necessaire
    } else {
      return res.status(400).json({ error: 'Type de rappel invalide' });
    }

    // Envoyer le rappel via event trigger
    try {
      await eventTriggerService.trigger(triggerCode, {
        utilisateur,
        structureId: structure_id || req.structureId
      });

      res.json({
        success: true,
        message: `Rappel ${type} envoye a ${utilisateur.email}`
      });
    } catch (triggerError) {
      console.error('[Scanner] Erreur trigger rappel:', triggerError);
      res.json({
        success: false,
        message: `Impossible d'envoyer le rappel: ${triggerError.message}`
      });
    }
  } catch (error) {
    console.error('[Scanner] Erreur send-reminder:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scanner/override-reservation
 *
 * Outrepasse une reservation et l'annule pour permettre l'emprunt
 */
router.post('/override-reservation', async (req, res) => {
  try {
    const { reservation_id, notify_user } = req.body;

    if (!reservation_id) {
      return res.status(400).json({ error: 'reservation_id requis' });
    }

    const reservation = await Reservation.findByPk(reservation_id, {
      include: [{ model: Utilisateur, as: 'utilisateur' }]
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation introuvable' });
    }

    // Annuler la reservation
    reservation.statut = 'annulee';
    reservation.commentaire = (reservation.commentaire || '') +
      `\n[${new Date().toISOString()}] Annulee par outrepassement scanner`;
    await reservation.save();

    // Notifier l'usager si demande
    if (notify_user && reservation.utilisateur) {
      try {
        await eventTriggerService.trigger('RESERVATION_ANNULEE', {
          reservation,
          utilisateur: reservation.utilisateur,
          raison: 'Article emprunte par un autre usager'
        });
      } catch (notifyError) {
        console.error('[Scanner] Erreur notification annulation:', notifyError);
      }
    }

    res.json({
      success: true,
      message: 'Reservation annulee'
    });
  } catch (error) {
    console.error('[Scanner] Erreur override-reservation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scanner/create-emprunt-with-validation
 *
 * Cree un emprunt apres validation, avec gestion des outrepassements
 */
router.post('/create-emprunt-with-validation', async (req, res) => {
  try {
    const {
      utilisateur_id,
      article_id,
      article_type,
      structure_id,
      date_retour_prevue,
      override_warnings,
      cancel_reservation_id,
      send_cotisation_reminder,
      send_adhesion_reminder
    } = req.body;

    // 1. Valider l'emprunt
    const structureId = structure_id || req.structureId || 1;
    const validation = await scannerValidationService.validateEmprunt({
      utilisateurId: utilisateur_id,
      articleId: article_id,
      articleType: article_type,
      structureId
    });

    // 2. Verifier si on peut continuer
    if (!validation.canProceed && !override_warnings) {
      return res.status(400).json({
        success: false,
        validation,
        message: 'Emprunt bloque par les validations'
      });
    }

    // 3. Gerer les actions annexes

    // Annuler la reservation si demande
    if (cancel_reservation_id) {
      const reservation = await Reservation.findByPk(cancel_reservation_id);
      if (reservation) {
        reservation.statut = 'annulee';
        reservation.commentaire = (reservation.commentaire || '') +
          `\n[${new Date().toISOString()}] Annulee par emprunt direct`;
        await reservation.save();
      }
    }

    // Envoyer les rappels si demandes
    if (send_cotisation_reminder && validation.utilisateur) {
      try {
        const utilisateur = await Utilisateur.findByPk(utilisateur_id);
        await eventTriggerService.trigger('COTISATION_RAPPEL', {
          utilisateur,
          structureId
        });
      } catch (e) {
        console.error('[Scanner] Erreur rappel cotisation:', e);
      }
    }

    if (send_adhesion_reminder && validation.utilisateur) {
      try {
        const utilisateur = await Utilisateur.findByPk(utilisateur_id);
        await eventTriggerService.trigger('ADHESION_RAPPEL', {
          utilisateur,
          structureId
        });
      } catch (e) {
        console.error('[Scanner] Erreur rappel adhesion:', e);
      }
    }

    // 4. Creer l'emprunt
    const foreignKey = `${article_type}_id`;
    const empruntData = {
      utilisateur_id,
      [foreignKey]: article_id,
      date_emprunt: new Date(),
      date_retour_prevue: date_retour_prevue || calculateReturnDate(),
      statut: 'en_cours',
      structure_id: structureId
    };

    const emprunt = await Emprunt.create(empruntData);

    // 5. Si l'article etait reserve par cet usager, convertir la reservation
    if (validation.reservation?.isCurrentUser && validation.reservation?.reservationId) {
      const reservation = await Reservation.findByPk(validation.reservation.reservationId);
      if (reservation) {
        reservation.statut = 'empruntee';
        reservation.emprunt_id = emprunt.id;
        reservation.date_conversion = new Date();
        await reservation.save();
      }
    }

    // 6. Mettre a jour le statut de l'article
    const config = scannerValidationService.MODULE_CONFIG[
      scannerValidationService.TYPE_TO_MODULE[article_type]
    ];
    if (config) {
      await config.model.update(
        { statut: 'emprunte' },
        { where: { id: article_id } }
      );
    }

    res.json({
      success: true,
      emprunt: {
        id: emprunt.id,
        date_retour_prevue: emprunt.date_retour_prevue
      },
      validation,
      overridden: !validation.canProceed && override_warnings
    });

  } catch (error) {
    console.error('[Scanner] Erreur create-emprunt:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scanner/articles-en-controle
 *
 * Recupere la liste des articles en attente de controle
 */
router.get('/articles-en-controle', async (req, res) => {
  try {
    const structureId = req.query.structure_id || req.structureId || 1;
    const articleType = req.query.type; // Optionnel: filtrer par type

    const models = { jeu: Jeu, livre: Livre, film: Film, disque: Disque };
    const typesToCheck = articleType ? [articleType] : ['jeu', 'livre', 'film', 'disque'];

    const articles = [];

    for (const type of typesToCheck) {
      const model = models[type];
      if (!model) continue;

      const where = { statut: 'en_controle' };
      if (structureId && structureId !== 'all') {
        where.structure_id = structureId;
      }

      const items = await model.findAll({
        where,
        attributes: ['id', 'titre', 'code_barre', 'statut', 'etat', 'image_url'],
        order: [['updated_at', 'DESC']],
        limit: 50
      });

      items.forEach(item => {
        articles.push({
          id: item.id,
          type,
          titre: item.titre,
          code_barre: item.code_barre,
          etat: item.etat,
          image_url: item.image_url
        });
      });
    }

    res.json({ articles, total: articles.length });
  } catch (error) {
    console.error('[Scanner] Erreur articles-en-controle:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/scanner/mise-en-rayon
 *
 * Valide le controle d'un article et le remet en rayon
 * Gere les reservations en attente
 *
 * Body:
 * - article_type: 'jeu' | 'livre' | 'film' | 'disque'
 * - article_id: ID de l'article
 * - nouvel_etat: (optionnel) nouveau etat physique
 * - notes: (optionnel) notes de controle
 * - envoyer_en_reparation: (optionnel) si true, envoyer en maintenance au lieu de disponible
 */
router.post('/mise-en-rayon', async (req, res) => {
  try {
    const {
      article_type,
      article_id,
      nouvel_etat,
      notes,
      envoyer_en_reparation,
      structure_id
    } = req.body;

    if (!article_type || !article_id) {
      return res.status(400).json({
        error: 'Parametres manquants: article_type et article_id requis'
      });
    }

    const models = { jeu: Jeu, livre: Livre, film: Film, disque: Disque };
    const model = models[article_type];

    if (!model) {
      return res.status(400).json({ error: 'Type d\'article invalide' });
    }

    const article = await model.findByPk(article_id);
    if (!article) {
      return res.status(404).json({ error: 'Article introuvable' });
    }

    // Verifier que l'article est bien en controle
    if (article.statut !== 'en_controle') {
      return res.status(400).json({
        error: `L'article n'est pas en attente de controle (statut actuel: ${article.statut})`
      });
    }

    // Si envoi en reparation demande
    if (envoyer_en_reparation) {
      article.statut = 'maintenance';
      if (notes) {
        article.notes = (article.notes || '') + `\n[${new Date().toISOString()}] Controle: ${notes}`;
      }
      if (nouvel_etat) {
        article.etat = nouvel_etat;
      }
      await article.save();

      return res.json({
        success: true,
        message: 'Article envoye en reparation',
        articleStatut: 'maintenance',
        article: {
          id: article.id,
          titre: article.titre,
          statut: article.statut,
          etat: article.etat
        }
      });
    }

    // Verifier s'il y a une reservation en attente
    const nextReservation = await Reservation.getNextInQueue(article_type, article_id);

    // Mettre a jour l'etat si specifie
    if (nouvel_etat) {
      article.etat = nouvel_etat;
    }

    // Ajouter les notes si specifiees
    if (notes) {
      article.notes = (article.notes || '') + `\n[${new Date().toISOString()}] Controle: ${notes}`;
    }

    // Determiner le nouveau statut
    if (nextReservation) {
      article.statut = 'reserve';

      // Mettre a jour la reservation
      const structId = structure_id || req.structureId || 1;
      const params = await ParametresFront.getParametres();
      const moduleMap = { jeu: 'ludotheque', livre: 'bibliotheque', film: 'filmotheque', disque: 'discotheque' };
      const moduleName = moduleMap[article_type];
      const joursExpiration = params[`reservation_expiration_jours_${moduleName}`] || 15;

      const maintenant = new Date();
      nextReservation.statut = 'prete';
      nextReservation.date_notification = maintenant;
      nextReservation.date_expiration = new Date(maintenant.getTime() + joursExpiration * 24 * 60 * 60 * 1000);
      await nextReservation.save();

      // Notifier le reservataire
      try {
        await eventTriggerService.triggerReservationPrete(
          nextReservation,
          nextReservation.utilisateur,
          article
        );
      } catch (notifyError) {
        console.error('[Scanner] Erreur notification reservation prete:', notifyError);
      }
    } else {
      article.statut = 'disponible';
    }

    await article.save();

    res.json({
      success: true,
      message: nextReservation
        ? 'Article mis de cote pour reservation'
        : 'Article remis en rayon',
      articleStatut: article.statut,
      article: {
        id: article.id,
        titre: article.titre,
        statut: article.statut,
        etat: article.etat
      },
      reservation: nextReservation ? {
        id: nextReservation.id,
        utilisateur_id: nextReservation.utilisateur_id,
        date_expiration: nextReservation.date_expiration
      } : null
    });
  } catch (error) {
    console.error('[Scanner] Erreur mise-en-rayon:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scanner/article-info/:articleType/:articleId
 *
 * Recupere les informations d'un article (pour le scan en mode controle)
 */
router.get('/article-info/:articleType/:articleId', async (req, res) => {
  try {
    const { articleType, articleId } = req.params;

    const models = { jeu: Jeu, livre: Livre, film: Film, disque: Disque };
    const model = models[articleType];

    if (!model) {
      return res.status(400).json({ error: 'Type d\'article invalide' });
    }

    const article = await model.findByPk(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article introuvable' });
    }

    // Verifier s'il y a une reservation
    const nextReservation = await Reservation.getNextInQueue(articleType, articleId);

    res.json({
      article: {
        id: article.id,
        type: articleType,
        titre: article.titre,
        code_barre: article.code_barre,
        statut: article.statut,
        etat: article.etat,
        image_url: article.image_url,
        notes: article.notes
      },
      hasReservation: !!nextReservation,
      reservation: nextReservation ? {
        id: nextReservation.id,
        utilisateur_id: nextReservation.utilisateur_id,
        utilisateur: nextReservation.utilisateur ? {
          id: nextReservation.utilisateur.id,
          nom: nextReservation.utilisateur.nom,
          prenom: nextReservation.utilisateur.prenom
        } : null
      } : null,
      enControle: article.statut === 'en_controle'
    });
  } catch (error) {
    console.error('[Scanner] Erreur article-info:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/scanner/structure-settings
 *
 * Recupere les parametres de la structure pour le scanner
 */
router.get('/structure-settings', async (req, res) => {
  try {
    const structureId = req.query.structure_id || req.structureId || 1;

    const structure = await Structure.findByPk(structureId, {
      attributes: [
        'id', 'nom',
        'cotisation_obligatoire',
        'adhesion_organisation_obligatoire',
        'controle_retour_obligatoire'
      ]
    });

    if (!structure) {
      return res.json({
        cotisation_obligatoire: true,
        adhesion_organisation_obligatoire: false,
        controle_retour_obligatoire: true
      });
    }

    res.json({
      id: structure.id,
      nom: structure.nom,
      cotisation_obligatoire: structure.cotisation_obligatoire ?? true,
      adhesion_organisation_obligatoire: structure.adhesion_organisation_obligatoire ?? false,
      controle_retour_obligatoire: structure.controle_retour_obligatoire ?? true
    });
  } catch (error) {
    console.error('[Scanner] Erreur structure-settings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Calcule la date de retour par defaut (14 jours)
 */
function calculateReturnDate(days = 14) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

module.exports = router;
