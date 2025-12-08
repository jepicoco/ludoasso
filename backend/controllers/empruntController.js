const { Emprunt, Utilisateur, Jeu, sequelize } = require('../models');
const { Op, Transaction } = require('sequelize');
const emailService = require('../services/emailService');
const eventTriggerService = require('../services/eventTriggerService');

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
 * Create new emprunt (loan a game)
 * POST /api/emprunts
 *
 * Utilise une transaction avec verrouillage pessimiste pour eviter
 * les race conditions sur la disponibilite du jeu.
 */
const createEmprunt = async (req, res) => {
  // Demarrer une transaction avec isolation READ COMMITTED
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    // Support adherent_id pour rétrocompatibilité frontend
    const { adherent_id, utilisateur_id, jeu_id, date_retour_prevue, commentaire } = req.body;
    const userId = utilisateur_id || adherent_id;

    // Validate required fields
    if (!userId || !jeu_id) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Validation error',
        message: 'utilisateur_id (ou adherent_id) and jeu_id are required'
      });
    }

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
        message: `Utilisateur account is ${utilisateur.statut}. Only active members can borrow games.`
      });
    }

    // Check if jeu exists with pessimistic lock (FOR UPDATE)
    // Cela bloque les autres transactions jusqu'au commit
    const jeu = await Jeu.findByPk(jeu_id, {
      transaction,
      lock: Transaction.LOCK.UPDATE
    });

    if (!jeu) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Not found',
        message: 'Jeu not found'
      });
    }

    if (!jeu.estDisponible()) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Game not available',
        message: `Game is currently ${jeu.statut}`
      });
    }

    // Calculate default return date if not provided (14 days from now)
    const dateRetourPrevue = date_retour_prevue
      ? new Date(date_retour_prevue)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Create emprunt within transaction
    const emprunt = await Emprunt.create({
      utilisateur_id: userId,
      jeu_id,
      date_emprunt: new Date(),
      date_retour_prevue: dateRetourPrevue,
      statut: 'en_cours',
      commentaire
    }, { transaction });

    // Update game status within transaction
    jeu.statut = 'emprunte';
    await jeu.save({ transaction });

    // Commit la transaction - libere le verrou
    await transaction.commit();

    // Reload with associations (hors transaction)
    await emprunt.reload({
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
      ]
    });

    // Déclencher l'événement de création d'emprunt (hors transaction)
    try {
      await eventTriggerService.triggerEmpruntCreated(emprunt, utilisateur, jeu);
    } catch (eventError) {
      console.error('Erreur déclenchement événement:', eventError);
      // Ne pas bloquer la création si l'événement échoue
    }

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = emprunt.toJSON();
    data.adherent = data.utilisateur;

    res.status(201).json({
      message: 'Emprunt created successfully',
      emprunt: data
    });
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
 * Return a game (complete emprunt)
 * POST /api/emprunts/:id/retour
 *
 * Utilise une transaction avec verrouillage pour eviter les retours doubles.
 */
const retourEmprunt = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });

  try {
    const { id } = req.params;

    // Charger l'emprunt avec verrou pessimiste
    const emprunt = await Emprunt.findByPk(id, {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
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
        message: 'This game has already been returned'
      });
    }

    // Mettre a jour l'emprunt
    emprunt.date_retour_effective = new Date();
    emprunt.statut = 'retourne';
    await emprunt.save({ transaction });

    // Mettre a jour le statut du jeu si present
    if (emprunt.jeu) {
      emprunt.jeu.statut = 'disponible';
      await emprunt.jeu.save({ transaction });
    }

    // Commit la transaction
    await transaction.commit();

    // Reload pour avoir les donnees a jour (hors transaction)
    await emprunt.reload({
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
      ]
    });

    // Déclencher l'événement de retour d'emprunt (hors transaction)
    try {
      await eventTriggerService.triggerEmpruntReturned(emprunt, emprunt.utilisateur, emprunt.jeu);
    } catch (eventError) {
      console.error('Erreur déclenchement événement:', eventError);
      // Ne pas bloquer le retour si l'événement échoue
    }

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const data = emprunt.toJSON();
    data.adherent = data.utilisateur;

    res.json({
      message: 'Game returned successfully',
      emprunt: data
    });
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
 * GET /api/emprunts/overdue
 *
 * Optimise: utilise un UPDATE groupe au lieu de N saves individuels
 */
const getOverdueEmprunts = async (req, res) => {
  try {
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
      where: {
        statut: { [Op.in]: ['en_cours', 'en_retard'] },
        date_retour_prevue: { [Op.lt]: new Date() }
      },
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
      ],
      order: [['date_retour_prevue', 'ASC']]
    });

    // Ajouter alias adherent pour rétrocompatibilité frontend
    const empruntsWithAlias = emprunts.map(e => {
      const data = e.toJSON();
      data.adherent = data.utilisateur;
      return data;
    });

    res.json({
      emprunts: empruntsWithAlias,
      total: emprunts.length
    });
  } catch (error) {
    console.error('Get overdue emprunts error:', error);
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
  updateEmprunt,
  deleteEmprunt,
  getOverdueEmprunts
};
