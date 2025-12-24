const { Emprunt, Utilisateur, Jeu, Livre, Film, Disque, Reservation, Structure, sequelize } = require('../models');
const { Op, Transaction } = require('sequelize');
const emailService = require('../services/emailService');
const eventTriggerService = require('../services/eventTriggerService');
const limiteEmpruntService = require('../services/limiteEmpruntService');
const charteValidationService = require('../services/charteValidationService');

// Configuration des modules pour l'emprunt multi-collection
const EMPRUNT_MODULES = {
  jeu: { model: Jeu, foreignKey: 'jeu_id', module: 'ludotheque' },
  livre: { model: Livre, foreignKey: 'livre_id', module: 'bibliotheque' },
  film: { model: Film, foreignKey: 'film_id', module: 'filmotheque' },
  disque: { model: Disque, foreignKey: 'disque_id', module: 'discotheque' }
};

/**
 * Get all emprunts with filters
 * GET /api/emprunts?statut=en_cours&adherent_id=1&jeu_id=2
 */
const getAllEmprunts = async (req, res) => {
  try {
    // Support adherent_id pour rétrocompatibilité frontend, mais utiliser utilisateur_id
    const { statut, adherent_id, utilisateur_id, jeu_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (statut) {
      where.statut = statut;
    }

    // Utiliser utilisateur_id (ou adherent_id pour rétrocompatibilité)
    const userId = utilisateur_id || adherent_id;
    if (userId) {
      where.utilisateur_id = userId;
    }

    if (jeu_id) {
      where.jeu_id = jeu_id;
    }

    const { count, rows } = await Emprunt.findAndCountAll({
      where,
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur'
        },
        {
          model: Jeu,
          as: 'jeu'
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date_emprunt', 'DESC']]
    });

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const empruntsWithAlias = rows.map(e => {
      const data = e.toJSON();
      data.adherent = data.utilisateur;
      return data;
    });

    res.json({
      emprunts: empruntsWithAlias,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get emprunts error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get emprunt by ID
 * GET /api/emprunts/:id
 */
const getEmpruntById = async (req, res) => {
  try {
    const { id } = req.params;

    const emprunt = await Emprunt.findByPk(id, {
      include: [
        {
          model: Utilisateur,
          as: 'utilisateur'
        },
        {
          model: Jeu,
          as: 'jeu'
        }
      ]
    });

    if (!emprunt) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Emprunt not found'
      });
    }

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = emprunt.toJSON();
    data.adherent = data.utilisateur;

    res.json({ emprunt: data });
  } catch (error) {
    console.error('Get emprunt error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Create new emprunt (loan an item)
 * POST /api/emprunts
 *
 * Supporte tous les modules : jeu, livre, film, disque
 * Utilise une transaction avec verrouillage pessimiste pour eviter
 * les race conditions sur la disponibilite de l'article.
 *
 * Body params:
 * - utilisateur_id (ou adherent_id pour rétrocompat)
 * - jeu_id | livre_id | film_id | disque_id
 * - date_retour_prevue (optionnel)
 * - commentaire (optionnel)
 * - force_override (optionnel) - pour outrepasser les limites non-bloquantes
 */
const createEmprunt = async (req, res) => {
  // Demarrer une transaction avec isolation READ COMMITTED
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    // Support adherent_id pour rétrocompatibilité frontend
    const {
      adherent_id, utilisateur_id,
      jeu_id, livre_id, film_id, disque_id,
      date_retour_prevue, commentaire,
      force_override
    } = req.body;
    const userId = utilisateur_id || adherent_id;

    // Déterminer quel type d'article est emprunté
    let itemType = null;
    let itemId = null;

    if (jeu_id) { itemType = 'jeu'; itemId = jeu_id; }
    else if (livre_id) { itemType = 'livre'; itemId = livre_id; }
    else if (film_id) { itemType = 'film'; itemId = film_id; }
    else if (disque_id) { itemType = 'disque'; itemId = disque_id; }

    // Validate required fields
    if (!userId || !itemId) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Validation error',
        message: 'utilisateur_id (ou adherent_id) et un ID d\'article (jeu_id, livre_id, film_id ou disque_id) sont requis'
      });
    }

    const moduleConfig = EMPRUNT_MODULES[itemType];

    // Check if utilisateur exists and is active
    const utilisateur = await Utilisateur.findByPk(userId, { transaction });
    if (!utilisateur) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Utilisateur not found'
      });
    }

    if (utilisateur.statut !== 'actif') {
      await transaction.rollback();
      return res.status(403).json({
        error: 'Forbidden',
        message: `Le compte utilisateur est ${utilisateur.statut}. Seuls les membres actifs peuvent emprunter.`
      });
    }

    // Vérifier si l'utilisateur est bloqué pour validation de charte
    const estBloquePourCharte = await charteValidationService.estBloquePourEmprunt(userId);
    if (estBloquePourCharte) {
      await transaction.rollback();
      return res.status(403).json({
        error: 'Charte non validee',
        message: 'Vous devez valider la charte avant de pouvoir emprunter. La periode de grace est depassee.',
        charteRequired: true
      });
    }

    // Vérifier les limites d'emprunt AVANT le verrouillage
    const limitValidation = await limiteEmpruntService.validateEmpruntLimits(
      userId,
      moduleConfig.module,
      itemId,
      { skipWarnings: force_override }
    );

    // Si des limites bloquantes sont atteintes
    if (!limitValidation.allowed && limitValidation.blocking) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Limite atteinte',
        message: limitValidation.errors[0]?.message || 'Limite d\'emprunt atteinte',
        limitErrors: limitValidation.errors,
        blocking: true
      });
    }

    // Si des limites non-bloquantes sont atteintes et pas de force_override
    if (limitValidation.warnings.length > 0 && !force_override) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Limite atteinte (non bloquante)',
        message: limitValidation.warnings[0]?.message || 'Limite d\'emprunt atteinte',
        limitWarnings: limitValidation.warnings,
        blocking: false,
        canOverride: true
      });
    }

    // Check if item exists with pessimistic lock (FOR UPDATE)
    const ItemModel = moduleConfig.model;
    const item = await ItemModel.findByPk(itemId, {
      transaction,
      lock: Transaction.LOCK.UPDATE
    });

    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} not found`
      });
    }

    if (!item.estDisponible || (typeof item.estDisponible === 'function' && !item.estDisponible())) {
      // Fallback si pas de méthode estDisponible
      const isAvailable = item.statut === 'disponible';
      if (!isAvailable) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Article non disponible',
          message: `L'article est actuellement ${item.statut}`
        });
      }
    }

    // Calculate default return date if not provided (14 days from now)
    const dateRetourPrevue = date_retour_prevue
      ? new Date(date_retour_prevue)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Create emprunt within transaction
    const empruntData = {
      utilisateur_id: userId,
      [moduleConfig.foreignKey]: itemId,
      date_emprunt: new Date(),
      date_retour_prevue: dateRetourPrevue,
      statut: 'en_cours',
      commentaire
    };

    const emprunt = await Emprunt.create(empruntData, { transaction });

    // Update item status within transaction
    item.statut = 'emprunte';
    await item.save({ transaction });

    // Commit la transaction - libere le verrou
    await transaction.commit();

    // Reload with associations (hors transaction)
    const includes = [{ model: Utilisateur, as: 'utilisateur' }];

    // Ajouter l'association pour le type d'item
    if (itemType === 'jeu') includes.push({ model: Jeu, as: 'jeu' });
    else if (itemType === 'livre') includes.push({ model: Livre, as: 'livre' });
    else if (itemType === 'film') includes.push({ model: Film, as: 'film' });
    else if (itemType === 'disque') includes.push({ model: Disque, as: 'disque' });

    await emprunt.reload({ include: includes });

    // Déclencher l'événement de création d'emprunt (hors transaction)
    try {
      // Pour rétrocompat, passer jeu si c'est un jeu
      if (itemType === 'jeu') {
        await eventTriggerService.triggerEmpruntCreated(emprunt, utilisateur, item);
      }
    } catch (eventError) {
      console.error('Erreur déclenchement événement:', eventError);
      // Ne pas bloquer la création si l'événement échoue
    }

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = emprunt.toJSON();
    data.adherent = data.utilisateur;

    // Inclure les warnings si force_override a été utilisé
    const response = {
      message: 'Emprunt créé avec succès',
      emprunt: data
    };

    if (force_override && limitValidation.warnings.length > 0) {
      response.overriddenWarnings = limitValidation.warnings;
    }

    res.status(201).json(response);
  } catch (error) {
    // Rollback en cas d'erreur
    await transaction.rollback();

    console.error('Create emprunt error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Return an item (complete emprunt)
 * POST /api/emprunts/:id/retour
 *
 * Utilise une transaction avec verrouillage pour eviter les retours doubles.
 * Verifie s'il y a une reservation en attente pour l'article retourne.
 */
const retourEmprunt = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    const { id } = req.params;

    // Charger l'emprunt avec verrou pessimiste et toutes les associations d'articles
    const emprunt = await Emprunt.findByPk(id, {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' },
        { model: Livre, as: 'livre' },
        { model: Film, as: 'film' },
        { model: Disque, as: 'disque' }
      ],
      transaction,
      lock: Transaction.LOCK.UPDATE
    });

    if (!emprunt) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Emprunt not found'
      });
    }

    if (emprunt.statut === 'retourne') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Already returned',
        message: 'Cet article a deja ete retourne'
      });
    }

    // Determiner le type d'article et l'article
    let itemType = null;
    let item = null;
    let foreignKey = null;

    if (emprunt.jeu_id && emprunt.jeu) {
      itemType = 'jeu';
      item = emprunt.jeu;
      foreignKey = 'jeu_id';
    } else if (emprunt.livre_id && emprunt.livre) {
      itemType = 'livre';
      item = emprunt.livre;
      foreignKey = 'livre_id';
    } else if (emprunt.film_id && emprunt.film) {
      itemType = 'film';
      item = emprunt.film;
      foreignKey = 'film_id';
    } else if (emprunt.disque_id && emprunt.disque) {
      itemType = 'disque';
      item = emprunt.disque;
      foreignKey = 'cd_id'; // Note: foreign key for disques is cd_id in reservations
    }

    // Mettre a jour l'emprunt
    emprunt.date_retour_effective = new Date();
    emprunt.statut = 'retourne';
    await emprunt.save({ transaction });

    // Verifier s'il y a une reservation en attente pour cet article
    let nextReservation = null;
    if (itemType && item) {
      nextReservation = await Reservation.getNextInQueue(itemType, item.id);
    }

    // Verifier si le controle de retour est obligatoire pour cette structure
    let controleObligatoire = true; // Par defaut
    const structureId = emprunt.structure_id || 1;
    const structure = await Structure.findByPk(structureId, { transaction });
    if (structure && structure.controle_retour_obligatoire !== undefined) {
      controleObligatoire = structure.controle_retour_obligatoire;
    }

    // Mettre a jour le statut de l'article si present
    // Si controle obligatoire: mettre en 'en_controle' pour verification avant mise en rayon
    // Sinon: comportement normal (reserve ou disponible)
    if (item) {
      if (controleObligatoire) {
        item.statut = 'en_controle';
      } else {
        item.statut = nextReservation ? 'reserve' : 'disponible';
      }
      await item.save({ transaction });
    }

    // Commit la transaction
    await transaction.commit();

    // Reload pour avoir les donnees a jour (hors transaction)
    const includes = [{ model: Utilisateur, as: 'utilisateur' }];
    if (itemType === 'jeu') includes.push({ model: Jeu, as: 'jeu' });
    else if (itemType === 'livre') includes.push({ model: Livre, as: 'livre' });
    else if (itemType === 'film') includes.push({ model: Film, as: 'film' });
    else if (itemType === 'disque') includes.push({ model: Disque, as: 'disque' });

    await emprunt.reload({ include: includes });

    // Déclencher l'événement de retour d'emprunt (hors transaction)
    try {
      await eventTriggerService.triggerEmpruntReturned(emprunt, emprunt.utilisateur, item);
    } catch (eventError) {
      console.error('Erreur déclenchement événement:', eventError);
      // Ne pas bloquer le retour si l'événement échoue
    }

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = emprunt.toJSON();
    data.adherent = data.utilisateur;

    // Construire la reponse
    const response = {
      message: controleObligatoire
        ? 'Article retourne - En attente de controle'
        : 'Article retourne avec succes',
      emprunt: data,
      articleStatut: item ? item.statut : null,
      enControle: controleObligatoire,
      controleObligatoire
    };

    // Si une reservation est en attente, l'inclure dans la reponse
    if (nextReservation) {
      response.hasReservation = true;
      response.reservation = {
        id: nextReservation.id,
        utilisateur_id: nextReservation.utilisateur_id,
        utilisateur: nextReservation.utilisateur ? {
          id: nextReservation.utilisateur.id,
          nom: nextReservation.utilisateur.nom,
          prenom: nextReservation.utilisateur.prenom,
          email: nextReservation.utilisateur.email
        } : null,
        position_queue: nextReservation.position_queue,
        date_creation: nextReservation.date_creation
      };
      response.articleType = itemType;
      response.articleId = item.id;
      response.articleTitre = item.titre || item.nom || 'Article';
    } else {
      response.hasReservation = false;
    }

    res.json(response);
  } catch (error) {
    await transaction.rollback();
    console.error('Retour emprunt error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Traiter le retour d'un emprunt avec reservation en attente
 * POST /api/emprunts/:id/traiter-reservation
 *
 * Body: { action: 'rayon' | 'cote' }
 * - rayon: L'article est remis en rayon (disponible)
 * - cote: L'article est mis de cote pour le reservataire suivant
 */
const traiterRetourAvecReservation = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!action || !['rayon', 'cote'].includes(action)) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Validation error',
        message: 'Action requise: "rayon" ou "cote"'
      });
    }

    // Charger l'emprunt
    const emprunt = await Emprunt.findByPk(id, {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' },
        { model: Livre, as: 'livre' },
        { model: Film, as: 'film' },
        { model: Disque, as: 'disque' }
      ],
      transaction
    });

    if (!emprunt) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Emprunt not found'
      });
    }

    if (emprunt.statut !== 'retourne') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid state',
        message: 'L\'emprunt doit etre retourne avant de traiter la reservation'
      });
    }

    // Determiner le type d'article et l'article
    let itemType = null;
    let item = null;
    let ItemModel = null;

    if (emprunt.jeu_id && emprunt.jeu) {
      itemType = 'jeu';
      item = emprunt.jeu;
      ItemModel = Jeu;
    } else if (emprunt.livre_id && emprunt.livre) {
      itemType = 'livre';
      item = emprunt.livre;
      ItemModel = Livre;
    } else if (emprunt.film_id && emprunt.film) {
      itemType = 'film';
      item = emprunt.film;
      ItemModel = Film;
    } else if (emprunt.disque_id && emprunt.disque) {
      itemType = 'disque';
      item = emprunt.disque;
      ItemModel = Disque;
    }

    if (!item) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid state',
        message: 'Aucun article associe a cet emprunt'
      });
    }

    // Recuperer la prochaine reservation en attente avec verrou
    const nextReservation = await Reservation.findOne({
      where: {
        [`${itemType}_id`]: item.id,
        statut: 'en_attente'
      },
      order: [['position_queue', 'ASC'], ['date_creation', 'ASC']],
      include: [{ model: Utilisateur, as: 'utilisateur' }],
      transaction,
      lock: Transaction.LOCK.UPDATE
    });

    if (action === 'rayon') {
      // Remettre l'article en rayon - il reste disponible
      // Le verrou sur l'article
      const lockedItem = await ItemModel.findByPk(item.id, {
        transaction,
        lock: Transaction.LOCK.UPDATE
      });
      lockedItem.statut = 'disponible';
      await lockedItem.save({ transaction });

      await transaction.commit();

      res.json({
        message: 'Article remis en rayon',
        articleStatut: 'disponible',
        reservationTraitee: false
      });
    } else if (action === 'cote') {
      if (!nextReservation) {
        // Pas de reservation en attente, remettre en rayon
        const lockedItem = await ItemModel.findByPk(item.id, {
          transaction,
          lock: Transaction.LOCK.UPDATE
        });
        lockedItem.statut = 'disponible';
        await lockedItem.save({ transaction });

        await transaction.commit();

        return res.json({
          message: 'Aucune reservation en attente, article remis en rayon',
          articleStatut: 'disponible',
          reservationTraitee: false
        });
      }

      // Mettre l'article de cote (statut reserve)
      const lockedItem = await ItemModel.findByPk(item.id, {
        transaction,
        lock: Transaction.LOCK.UPDATE
      });
      lockedItem.statut = 'reserve';
      await lockedItem.save({ transaction });

      // Marquer la reservation comme prete
      const { ParametresFront } = require('../models');
      const params = await ParametresFront.getParametres();

      // Determiner le module pour les parametres d'expiration
      const moduleMap = { jeu: 'ludotheque', livre: 'bibliotheque', film: 'filmotheque', disque: 'discotheque' };
      const moduleName = moduleMap[itemType];
      const joursExpiration = params[`reservation_expiration_jours_${moduleName}`] || 15;

      const maintenant = new Date();
      nextReservation.statut = 'prete';
      nextReservation.date_notification = maintenant;
      nextReservation.date_expiration = new Date(maintenant.getTime() + joursExpiration * 24 * 60 * 60 * 1000);
      await nextReservation.save({ transaction });

      await transaction.commit();

      // Déclencher l'événement RESERVATION_PRETE (hors transaction)
      try {
        await eventTriggerService.triggerReservationPrete(
          nextReservation,
          nextReservation.utilisateur,
          lockedItem
        );
      } catch (eventError) {
        console.error('Erreur déclenchement événement RESERVATION_PRETE:', eventError);
      }

      res.json({
        message: 'Article mis de cote pour le reservataire',
        articleStatut: 'reserve',
        reservationTraitee: true,
        reservation: {
          id: nextReservation.id,
          utilisateur: nextReservation.utilisateur ? {
            id: nextReservation.utilisateur.id,
            nom: nextReservation.utilisateur.nom,
            prenom: nextReservation.utilisateur.prenom,
            email: nextReservation.utilisateur.email
          } : null,
          date_expiration: nextReservation.date_expiration
        }
      });
    }
  } catch (error) {
    await transaction.rollback();
    console.error('Traiter retour avec reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Update emprunt
 * PUT /api/emprunts/:id
 */
const updateEmprunt = async (req, res) => {
  try {
    const { id } = req.params;
    const { date_retour_prevue, commentaire, statut } = req.body;

    const emprunt = await Emprunt.findByPk(id);

    if (!emprunt) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Emprunt not found'
      });
    }

    // Update fields
    if (date_retour_prevue) emprunt.date_retour_prevue = new Date(date_retour_prevue);
    if (commentaire !== undefined) emprunt.commentaire = commentaire;
    if (statut) emprunt.statut = statut;

    await emprunt.save();

    // Reload with associations
    await emprunt.reload({
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
      ]
    });

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = emprunt.toJSON();
    data.adherent = data.utilisateur;

    res.json({
      message: 'Emprunt updated successfully',
      emprunt: data
    });
  } catch (error) {
    console.error('Update emprunt error:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Delete emprunt
 * DELETE /api/emprunts/:id
 *
 * Utilise une transaction pour garantir la coherence lors de la suppression.
 */
const deleteEmprunt = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    const { id } = req.params;

    const emprunt = await Emprunt.findByPk(id, {
      include: [{ model: Jeu, as: 'jeu' }],
      transaction,
      lock: Transaction.LOCK.UPDATE
    });

    if (!emprunt) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Emprunt not found'
      });
    }

    // If emprunt is still active, return the game first
    if (emprunt.statut !== 'retourne' && emprunt.jeu) {
      emprunt.jeu.statut = 'disponible';
      await emprunt.jeu.save({ transaction });
    }

    await emprunt.destroy({ transaction });

    await transaction.commit();

    res.json({
      message: 'Emprunt deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete emprunt error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get overdue emprunts
 * GET /api/emprunts/overdue?module=ludotheque
 *
 * Optimise: utilise un UPDATE groupe au lieu de N saves individuels
 * Supporte le filtrage par module (ludotheque, bibliotheque, filmotheque, discotheque)
 */
const getOverdueEmprunts = async (req, res) => {
  try {
    const { module: moduleCode } = req.query;

    // Mapping module -> foreign key field
    const MODULE_FK_MAPPING = {
      ludotheque: 'jeu_id',
      bibliotheque: 'livre_id',
      filmotheque: 'film_id',
      discotheque: 'cd_id'
    };

    // Construire la clause WHERE
    const where = {
      statut: { [Op.in]: ['en_cours', 'en_retard'] },
      date_retour_prevue: { [Op.lt]: new Date() }
    };

    // Filtrer par module si specifie
    if (moduleCode && MODULE_FK_MAPPING[moduleCode]) {
      where[MODULE_FK_MAPPING[moduleCode]] = { [Op.ne]: null };
    }

    // Mise a jour groupee des statuts (evite N+1 writes)
    await Emprunt.update(
      { statut: 'en_retard' },
      {
        where: {
          statut: 'en_cours',
          date_retour_prevue: { [Op.lt]: new Date() }
        }
      }
    );

    // Recuperer tous les emprunts en retard avec leurs associations
    const emprunts = await Emprunt.findAll({
      where,
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' },
        { model: Livre, as: 'livre' },
        { model: Film, as: 'film' },
        { model: Disque, as: 'disque' }
      ],
      order: [['date_retour_prevue', 'ASC']]
    });

    // Ajouter alias et informations d'article unifie
    const empruntsWithAlias = emprunts.map(e => {
      const data = e.toJSON();
      data.adherent = data.utilisateur; // Retrocompatibilite

      // Determiner le type d'article et l'article lui-meme
      if (data.jeu_id && data.jeu) {
        data.articleType = 'jeu';
        data.articleModule = 'ludotheque';
        data.article = data.jeu;
      } else if (data.livre_id && data.livre) {
        data.articleType = 'livre';
        data.articleModule = 'bibliotheque';
        data.article = data.livre;
      } else if (data.film_id && data.film) {
        data.articleType = 'film';
        data.articleModule = 'filmotheque';
        data.article = data.film;
      } else if (data.cd_id && data.disque) {
        data.articleType = 'disque';
        data.articleModule = 'discotheque';
        data.article = data.disque;
      }

      return data;
    });

    res.json({
      emprunts: empruntsWithAlias,
      total: emprunts.length,
      module: moduleCode || 'all'
    });
  } catch (error) {
    console.error('Get overdue emprunts error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get loan limits summary for a user
 * GET /api/emprunts/limites/:utilisateurId/:module
 */
const getLimitesSummary = async (req, res) => {
  try {
    const { utilisateurId, module } = req.params;

    if (!utilisateurId || !module) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'utilisateurId et module sont requis'
      });
    }

    const validModules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];
    if (!validModules.includes(module)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Module invalide. Valeurs acceptées: ' + validModules.join(', ')
      });
    }

    const summary = await limiteEmpruntService.getLimitsSummary(utilisateurId, module);

    res.json({
      utilisateurId: parseInt(utilisateurId),
      module,
      limites: summary
    });
  } catch (error) {
    console.error('Get limites summary error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Pre-validate loan limits (without creating)
 * POST /api/emprunts/valider-limites
 *
 * Body: { utilisateur_id, jeu_id | livre_id | film_id | disque_id }
 */
const validerLimites = async (req, res) => {
  try {
    const { utilisateur_id, adherent_id, jeu_id, livre_id, film_id, disque_id } = req.body;
    const userId = utilisateur_id || adherent_id;

    // Déterminer quel type d'article
    let itemType = null;
    let itemId = null;

    if (jeu_id) { itemType = 'jeu'; itemId = jeu_id; }
    else if (livre_id) { itemType = 'livre'; itemId = livre_id; }
    else if (film_id) { itemType = 'film'; itemId = film_id; }
    else if (disque_id) { itemType = 'disque'; itemId = disque_id; }

    if (!userId || !itemId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'utilisateur_id et un ID d\'article sont requis'
      });
    }

    const moduleConfig = EMPRUNT_MODULES[itemType];
    const validation = await limiteEmpruntService.validateEmpruntLimits(
      userId,
      moduleConfig.module,
      itemId
    );

    res.json({
      allowed: validation.allowed,
      blocking: validation.blocking,
      errors: validation.errors,
      warnings: validation.warnings,
      canOverride: !validation.blocking && validation.warnings.length > 0
    });
  } catch (error) {
    console.error('Valider limites error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

module.exports = {
  getAllEmprunts,
  getEmpruntById,
  createEmprunt,
  retourEmprunt,
  traiterRetourAvecReservation,
  updateEmprunt,
  deleteEmprunt,
  getOverdueEmprunts,
  getLimitesSummary,
  validerLimites
};
