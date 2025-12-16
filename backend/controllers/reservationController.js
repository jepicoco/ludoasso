/**
 * Controller pour les reservations d'articles
 *
 * Gere les operations CRUD et la logique metier des reservations :
 * - Creation avec validation des limites et gestion de la file d'attente
 * - Annulation avec notification du suivant en file
 * - Conversion en emprunt
 * - Prolongation par l'admin
 */

const { Reservation, Utilisateur, Jeu, Livre, Film, Disque, Emprunt, ParametresFront, sequelize } = require('../models');
const { Op, Transaction } = require('sequelize');
const limiteReservationService = require('../services/limiteReservationService');
const eventTriggerService = require('../services/eventTriggerService');

// Configuration des modules pour la reservation multi-collection
const RESERVATION_MODULES = {
  jeu: { model: Jeu, foreignKey: 'jeu_id', module: 'ludotheque', as: 'jeu' },
  livre: { model: Livre, foreignKey: 'livre_id', module: 'bibliotheque', as: 'livre' },
  film: { model: Film, foreignKey: 'film_id', module: 'filmotheque', as: 'film' },
  disque: { model: Disque, foreignKey: 'cd_id', module: 'discotheque', as: 'disque' }
};

/**
 * Get all reservations with filters
 * GET /api/reservations?statut=en_attente&utilisateur_id=1&module=ludotheque
 */
const getAllReservations = async (req, res) => {
  try {
    const { statut, utilisateur_id, adherent_id, module, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (statut) {
      if (Array.isArray(statut)) {
        where.statut = { [Op.in]: statut };
      } else {
        where.statut = statut;
      }
    }

    const userId = utilisateur_id || adherent_id;
    if (userId) {
      where.utilisateur_id = userId;
    }

    // Filtrer par module (ludotheque, bibliotheque, etc.)
    if (module) {
      const config = Object.values(RESERVATION_MODULES).find(c => c.module === module);
      if (config) {
        where[config.foreignKey] = { [Op.not]: null };
      }
    }

    // Configuration des includes avec recherche optionnelle
    const includes = [
      {
        model: Utilisateur,
        as: 'utilisateur',
        ...(search ? {
          where: {
            [Op.or]: [
              { nom: { [Op.like]: `%${search}%` } },
              { prenom: { [Op.like]: `%${search}%` } },
              { code_barre: { [Op.like]: `%${search}%` } }
            ]
          },
          required: false
        } : {})
      },
      {
        model: Jeu,
        as: 'jeu',
        ...(search ? {
          where: { titre: { [Op.like]: `%${search}%` } },
          required: false
        } : {})
      },
      {
        model: Livre,
        as: 'livre',
        ...(search ? {
          where: { titre: { [Op.like]: `%${search}%` } },
          required: false
        } : {})
      },
      {
        model: Film,
        as: 'film',
        ...(search ? {
          where: { titre: { [Op.like]: `%${search}%` } },
          required: false
        } : {})
      },
      {
        model: Disque,
        as: 'disque',
        ...(search ? {
          where: { titre: { [Op.like]: `%${search}%` } },
          required: false
        } : {})
      },
      { model: Emprunt, as: 'emprunt' }
    ];

    let { count, rows } = await Reservation.findAndCountAll({
      where,
      include: includes,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date_creation', 'DESC']]
    });

    // Si recherche, filtrer les resultats qui matchent
    if (search) {
      const searchLower = search.toLowerCase();
      rows = rows.filter(r => {
        const user = r.utilisateur;
        const article = r.jeu || r.livre || r.film || r.disque;

        const userMatch = user && (
          (user.nom && user.nom.toLowerCase().includes(searchLower)) ||
          (user.prenom && user.prenom.toLowerCase().includes(searchLower)) ||
          (user.code_barre && user.code_barre.toLowerCase().includes(searchLower))
        );

        const articleMatch = article && article.titre && article.titre.toLowerCase().includes(searchLower);

        return userMatch || articleMatch;
      });
      count = rows.length;
    }

    // Ajouter les informations de l'article et alias adherent
    const reservationsWithDetails = rows.map(r => {
      const data = r.toJSON();
      data.adherent = data.utilisateur;

      // Determiner le type et l'article
      data.articleType = r.getItemType();
      data.articleId = r.getItemId();
      data.article = data.jeu || data.livre || data.film || data.disque;
      data.module = r.getModule();

      return data;
    });

    // Calculer les stats par statut (independamment des filtres)
    const moduleWhere = {};
    if (module) {
      const config = Object.values(RESERVATION_MODULES).find(c => c.module === module);
      if (config) {
        moduleWhere[config.foreignKey] = { [Op.not]: null };
      }
    }

    const statsCounts = await Reservation.findAll({
      attributes: [
        'statut',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: moduleWhere,
      group: ['statut'],
      raw: true
    });

    const stats = {
      en_attente: 0,
      prete: 0,
      expiree: 0,
      empruntee: 0,
      annulee: 0
    };
    statsCounts.forEach(s => {
      stats[s.statut] = parseInt(s.count) || 0;
    });

    res.json({
      reservations: reservationsWithDetails,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      stats
    });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get reservation by ID
 * GET /api/reservations/:id
 */
const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findByPk(id, {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' },
        { model: Livre, as: 'livre' },
        { model: Film, as: 'film' },
        { model: Disque, as: 'disque' },
        { model: Emprunt, as: 'emprunt' }
      ]
    });

    if (!reservation) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Reservation not found'
      });
    }

    const data = reservation.toJSON();
    data.adherent = data.utilisateur;
    data.articleType = reservation.getItemType();
    data.articleId = reservation.getItemId();
    data.article = data.jeu || data.livre || data.film || data.disque;
    data.module = reservation.getModule();

    res.json({ reservation: data });
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get reservations by user
 * GET /api/reservations/utilisateur/:utilisateurId
 */
const getReservationsByUtilisateur = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const { statut } = req.query;

    const where = { utilisateur_id: utilisateurId };

    if (statut) {
      if (Array.isArray(statut)) {
        where.statut = { [Op.in]: statut };
      } else {
        where.statut = statut;
      }
    } else {
      // Par defaut, seulement les reservations actives
      where.statut = { [Op.in]: ['en_attente', 'prete'] };
    }

    const reservations = await Reservation.findAll({
      where,
      include: [
        { model: Jeu, as: 'jeu' },
        { model: Livre, as: 'livre' },
        { model: Film, as: 'film' },
        { model: Disque, as: 'disque' }
      ],
      order: [['date_creation', 'DESC']]
    });

    const reservationsWithDetails = reservations.map(r => {
      const data = r.toJSON();
      data.articleType = r.getItemType();
      data.articleId = r.getItemId();
      data.article = data.jeu || data.livre || data.film || data.disque;
      data.module = r.getModule();
      data.joursAvantExpiration = r.joursAvantExpiration();
      return data;
    });

    res.json({ reservations: reservationsWithDetails });
  } catch (error) {
    console.error('Get reservations by user error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Create new reservation
 * POST /api/reservations
 *
 * Body params:
 * - utilisateur_id (ou adherent_id pour retrocompat)
 * - jeu_id | livre_id | film_id | disque_id
 * - commentaire (optionnel)
 */
const createReservation = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    const {
      adherent_id, utilisateur_id,
      jeu_id, livre_id, film_id, disque_id,
      commentaire
    } = req.body;
    const userId = utilisateur_id || adherent_id;

    // Determiner quel type d'article est reserve
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
        message: 'utilisateur_id et un ID d\'article sont requis'
      });
    }

    const moduleConfig = RESERVATION_MODULES[itemType];

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
        message: `Le compte utilisateur est ${utilisateur.statut}. Seuls les membres actifs peuvent reserver.`
      });
    }

    // Verifier les limites de reservation
    const limitValidation = await limiteReservationService.validateReservationLimits(
      userId,
      moduleConfig.module,
      itemId
    );

    if (!limitValidation.allowed) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Limite atteinte',
        message: limitValidation.errors[0]?.message || 'Limite de reservation atteinte',
        limitErrors: limitValidation.errors
      });
    }

    // Verifier que l'article existe
    const ItemModel = moduleConfig.model;
    const item = await ItemModel.findByPk(itemId, { transaction });

    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: `${itemType} not found`
      });
    }

    // Calculer la position dans la file d'attente
    const position = await Reservation.getNextQueuePosition(itemType, itemId);

    // Creer la reservation
    const reservationData = {
      utilisateur_id: userId,
      [moduleConfig.foreignKey]: itemId,
      statut: 'en_attente',
      position_queue: position,
      date_creation: new Date(),
      commentaire
    };

    const reservation = await Reservation.create(reservationData, { transaction });

    // Mettre a jour le statut de l'article a "reserve" si actuellement disponible
    if (item.statut === 'disponible') {
      item.statut = 'reserve';
      await item.save({ transaction });
    }

    await transaction.commit();

    // Recharger avec les associations
    await reservation.reload({
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: ItemModel, as: moduleConfig.as }
      ]
    });

    const data = reservation.toJSON();
    data.adherent = data.utilisateur;
    data.articleType = itemType;
    data.articleId = itemId;
    data.article = data[moduleConfig.as];
    data.module = moduleConfig.module;

    res.status(201).json({
      message: 'Reservation creee',
      reservation: data
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create reservation error:', error);

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
 * Cancel reservation
 * DELETE /api/reservations/:id
 */
const cancelReservation = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    const { id } = req.params;

    const reservation = await Reservation.findByPk(id, {
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

    if (!reservation) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Reservation not found'
      });
    }

    if (reservation.statut === 'empruntee') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cette reservation a deja ete convertie en emprunt'
      });
    }

    if (reservation.statut === 'annulee') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cette reservation est deja annulee'
      });
    }

    const wasReady = reservation.statut === 'prete';
    const itemType = reservation.getItemType();
    const itemId = reservation.getItemId();
    const config = RESERVATION_MODULES[itemType];

    // Annuler la reservation
    reservation.statut = 'annulee';
    await reservation.save({ transaction });

    // Verifier s'il reste d'autres reservations actives pour cet article
    const remainingReservations = await Reservation.count({
      where: {
        [config.foreignKey]: itemId,
        statut: { [Op.in]: ['en_attente', 'prete'] },
        id: { [Op.ne]: reservation.id }
      },
      transaction
    });

    // Si plus de reservations, remettre l'article en disponible
    const item = reservation[config.as];
    if (item && item.statut === 'reserve' && remainingReservations === 0) {
      item.statut = 'disponible';
      await item.save({ transaction });
    }

    await transaction.commit();

    // Notifier le prochain en file (hors transaction)
    try {
      const nextInQueue = await Reservation.getNextInQueue(itemType, itemId);
      if (nextInQueue) {
        // Le prochain prend la position 1
        nextInQueue.position_queue = 1;
        await nextInQueue.save();
      }
    } catch (err) {
      console.error('Error updating next in queue:', err);
    }

    // Trigger notification d'annulation (hors transaction)
    try {
      const article = reservation.jeu || reservation.livre || reservation.film || reservation.disque;
      await eventTriggerService.trigger('RESERVATION_ANNULEE', {
        reservation,
        utilisateur: reservation.utilisateur,
        article
      });
    } catch (err) {
      console.error('Error triggering RESERVATION_ANNULEE:', err);
    }

    res.json({
      message: 'Reservation annulee',
      reservation: reservation.toJSON()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Cancel reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Convert reservation to loan
 * POST /api/reservations/:id/convertir
 */
const convertToEmprunt = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    const { id } = req.params;
    const { date_retour_prevue, commentaire } = req.body;

    const reservation = await Reservation.findByPk(id, {
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

    if (!reservation) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Reservation not found'
      });
    }

    if (reservation.statut !== 'prete') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Seule une reservation prete peut etre convertie en emprunt'
      });
    }

    const itemType = reservation.getItemType();
    const itemId = reservation.getItemId();
    const config = RESERVATION_MODULES[itemType];

    // Calculer la date de retour prevue (14 jours par defaut)
    const dateRetourPrevue = date_retour_prevue
      ? new Date(date_retour_prevue)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Creer l'emprunt
    const empruntData = {
      utilisateur_id: reservation.utilisateur_id,
      [config.foreignKey]: itemId,
      date_emprunt: new Date(),
      date_retour_prevue: dateRetourPrevue,
      statut: 'en_cours',
      commentaire: commentaire || reservation.commentaire
    };

    const emprunt = await Emprunt.create(empruntData, { transaction });

    // Mettre a jour l'article
    const item = reservation[config.as];
    if (item) {
      item.statut = 'emprunte';
      await item.save({ transaction });
    }

    // Mettre a jour la reservation
    reservation.statut = 'empruntee';
    reservation.date_conversion = new Date();
    reservation.emprunt_id = emprunt.id;
    await reservation.save({ transaction });

    await transaction.commit();

    // Recharger l'emprunt avec associations
    await emprunt.reload({
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: config.model, as: config.as }
      ]
    });

    const data = emprunt.toJSON();
    data.adherent = data.utilisateur;

    res.json({
      message: 'Reservation convertie en emprunt',
      emprunt: data,
      reservation: reservation.toJSON()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Convert reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Extend reservation expiration (admin only)
 * POST /api/reservations/:id/prolonger
 */
const prolongerReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { jours = 15 } = req.body;

    const reservation = await Reservation.findByPk(id, {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' },
        { model: Livre, as: 'livre' },
        { model: Film, as: 'film' },
        { model: Disque, as: 'disque' }
      ]
    });

    if (!reservation) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Reservation not found'
      });
    }

    if (reservation.statut !== 'prete' && reservation.statut !== 'expiree') {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Seule une reservation prete ou expiree peut etre prolongee'
      });
    }

    await reservation.prolonger(jours);

    // Trigger notification de prolongation
    try {
      const article = reservation.jeu || reservation.livre || reservation.film || reservation.disque;
      await eventTriggerService.trigger('RESERVATION_PROLONGEE', {
        reservation,
        utilisateur: reservation.utilisateur,
        article,
        joursAjoutes: jours
      });
    } catch (err) {
      console.error('Error triggering RESERVATION_PROLONGEE:', err);
    }

    res.json({
      message: 'Reservation prolongee',
      reservation: reservation.toJSON()
    });

  } catch (error) {
    console.error('Prolonger reservation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Validate reservation limits (without creating)
 * POST /api/reservations/valider-limites
 */
const validerLimites = async (req, res) => {
  try {
    const { utilisateur_id, adherent_id, jeu_id, livre_id, film_id, disque_id } = req.body;
    const userId = utilisateur_id || adherent_id;

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

    const config = RESERVATION_MODULES[itemType];
    const validation = await limiteReservationService.validateReservationLimits(
      userId,
      config.module,
      itemId
    );

    res.json(validation);

  } catch (error) {
    console.error('Validate limits error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get limits summary for a user
 * GET /api/reservations/limites/:utilisateurId/:module
 */
const getLimitesSummary = async (req, res) => {
  try {
    const { utilisateurId, module } = req.params;

    const summary = await limiteReservationService.getLimitsSummary(utilisateurId, module);

    if (!summary) {
      return res.status(400).json({
        error: 'Invalid module',
        message: 'Module inconnu'
      });
    }

    res.json(summary);

  } catch (error) {
    console.error('Get limits summary error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Mark reservation as ready (called when item is returned)
 * POST /api/reservations/:id/marquer-prete
 */
const marquerPrete = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    const { id } = req.params;

    const reservation = await Reservation.findByPk(id, {
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

    if (!reservation) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Reservation not found'
      });
    }

    if (reservation.statut !== 'en_attente') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Seule une reservation en attente peut etre marquee comme prete'
      });
    }

    // Recuperer le delai d'expiration du module
    const params = await ParametresFront.getParametres();
    const module = reservation.getModule();
    const joursExpiration = params[`reservation_expiration_jours_${module}`] || 15;

    // Marquer comme prete (manuellement avec la transaction)
    const maintenant = new Date();
    reservation.statut = 'prete';
    reservation.date_notification = maintenant;
    reservation.date_expiration = new Date(maintenant.getTime() + joursExpiration * 24 * 60 * 60 * 1000);
    await reservation.save({ transaction });

    // Mettre l'article en statut reserve
    const itemType = reservation.getItemType();
    const config = RESERVATION_MODULES[itemType];
    const item = reservation[config.as];
    if (item) {
      item.statut = 'reserve';
      await item.save({ transaction });
    }

    await transaction.commit();

    // Trigger notification (hors transaction)
    try {
      const article = reservation.jeu || reservation.livre || reservation.film || reservation.disque;
      await eventTriggerService.trigger('RESERVATION_PRETE', {
        reservation,
        utilisateur: reservation.utilisateur,
        article,
        dateExpiration: reservation.date_expiration
      });
    } catch (err) {
      console.error('Error triggering RESERVATION_PRETE:', err);
    }

    res.json({
      message: 'Reservation marquee comme prete',
      reservation: reservation.toJSON()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Marquer prete error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Check if an item has active reservations
 * GET /api/reservations/article/:type/:itemId
 */
const getReservationsForArticle = async (req, res) => {
  try {
    const { type, itemId } = req.params;

    const config = RESERVATION_MODULES[type];
    if (!config) {
      return res.status(400).json({
        error: 'Invalid type',
        message: 'Type d\'article invalide'
      });
    }

    const reservations = await Reservation.findAll({
      where: {
        [config.foreignKey]: itemId,
        statut: { [Op.in]: ['en_attente', 'prete'] }
      },
      include: [
        { model: Utilisateur, as: 'utilisateur' }
      ],
      order: [['position_queue', 'ASC'], ['date_creation', 'ASC']]
    });

    res.json({
      reservations: reservations.map(r => ({
        id: r.id,
        utilisateur: {
          id: r.utilisateur.id,
          nom: r.utilisateur.nom,
          prenom: r.utilisateur.prenom
        },
        statut: r.statut,
        position_queue: r.position_queue,
        date_creation: r.date_creation,
        date_expiration: r.date_expiration
      })),
      count: reservations.length,
      hasReservations: reservations.length > 0
    });

  } catch (error) {
    console.error('Get reservations for article error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Send a reminder notification to the user
 * POST /api/reservations/:id/notifier
 */
const notifierUsager = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findByPk(id, {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' },
        { model: Livre, as: 'livre' },
        { model: Film, as: 'film' },
        { model: Disque, as: 'disque' }
      ]
    });

    if (!reservation) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Reservation not found'
      });
    }

    if (reservation.statut !== 'prete') {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Seule une reservation prete peut faire l\'objet d\'un rappel'
      });
    }

    // Trigger notification
    try {
      const article = reservation.jeu || reservation.livre || reservation.film || reservation.disque;
      await eventTriggerService.trigger('RESERVATION_RAPPEL', {
        reservation,
        utilisateur: reservation.utilisateur,
        article,
        dateExpiration: reservation.date_expiration
      });
    } catch (err) {
      console.error('Error triggering RESERVATION_RAPPEL:', err);
      return res.status(500).json({
        error: 'Notification error',
        message: 'Erreur lors de l\'envoi de la notification'
      });
    }

    res.json({
      message: 'Notification envoyee',
      reservation: reservation.toJSON()
    });

  } catch (error) {
    console.error('Notifier usager error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Move reservation up or down in queue
 * POST /api/reservations/:id/deplacer
 */
const deplacerDansFile = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    const { id } = req.params;
    const { direction } = req.body;

    if (!direction || !['up', 'down'].includes(direction)) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Validation error',
        message: 'Direction requise: "up" ou "down"'
      });
    }

    const reservation = await Reservation.findByPk(id, {
      transaction,
      lock: Transaction.LOCK.UPDATE
    });

    if (!reservation) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Reservation not found'
      });
    }

    if (reservation.statut !== 'en_attente') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Seule une reservation en attente peut etre deplacee'
      });
    }

    const itemType = reservation.getItemType();
    const itemId = reservation.getItemId();
    const config = RESERVATION_MODULES[itemType];
    const currentPosition = reservation.position_queue;

    // Find the reservation to swap with
    const targetPosition = direction === 'up' ? currentPosition - 1 : currentPosition + 1;

    if (targetPosition < 1) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cette reservation est deja en premiere position'
      });
    }

    const otherReservation = await Reservation.findOne({
      where: {
        [config.foreignKey]: itemId,
        statut: 'en_attente',
        position_queue: targetPosition
      },
      transaction,
      lock: Transaction.LOCK.UPDATE
    });

    if (!otherReservation) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Impossible de deplacer dans cette direction'
      });
    }

    // Swap positions
    reservation.position_queue = targetPosition;
    otherReservation.position_queue = currentPosition;

    await reservation.save({ transaction });
    await otherReservation.save({ transaction });

    await transaction.commit();

    res.json({
      message: 'Position mise a jour',
      newPosition: targetPosition,
      reservation: reservation.toJSON()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Deplacer dans file error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

module.exports = {
  getAllReservations,
  getReservationById,
  getReservationsByUtilisateur,
  createReservation,
  cancelReservation,
  convertToEmprunt,
  prolongerReservation,
  validerLimites,
  getLimitesSummary,
  marquerPrete,
  notifierUsager,
  deplacerDansFile,
  getReservationsForArticle,
  RESERVATION_MODULES
};
