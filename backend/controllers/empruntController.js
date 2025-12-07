const { Emprunt, Utilisateur, Jeu } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');
const eventTriggerService = require('../services/eventTriggerService');

/**
 * Get all emprunts with filters
 * GET /api/emprunts?statut=en_cours&adherent_id=1&jeu_id=2
 */
const getAllEmprunts = async (req, res) => {
  try {
    const { statut, adherent_id, jeu_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (statut) {
      where.statut = statut;
    }

    if (adherent_id) {
      where.adherent_id = adherent_id;
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
 */
const createEmprunt = async (req, res) => {
  try {
    const { adherent_id, jeu_id, date_retour_prevue, commentaire } = req.body;

    // Validate required fields
    if (!adherent_id || !jeu_id) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'adherent_id and jeu_id are required'
      });
    }

    // Check if utilisateur exists and is active
    const utilisateur = await Utilisateur.findByPk(adherent_id);
    if (!utilisateur) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Utilisateur not found'
      });
    }

    if (utilisateur.statut !== 'actif') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Utilisateur account is ${utilisateur.statut}. Only active members can borrow games.`
      });
    }

    // Check if jeu exists and is available
    const jeu = await Jeu.findByPk(jeu_id);
    if (!jeu) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Jeu not found'
      });
    }

    if (!jeu.estDisponible()) {
      return res.status(400).json({
        error: 'Game not available',
        message: `Game is currently ${jeu.statut}`
      });
    }

    // Calculate default return date if not provided (14 days from now)
    const dateRetourPrevue = date_retour_prevue
      ? new Date(date_retour_prevue)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Create emprunt
    const emprunt = await Emprunt.create({
      adherent_id,
      jeu_id,
      date_emprunt: new Date(),
      date_retour_prevue: dateRetourPrevue,
      statut: 'en_cours',
      commentaire
    });

    // Update game status
    await jeu.changerStatut('emprunte');

    // Reload with associations
    await emprunt.reload({
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
      ]
    });

    // Déclencher l'événement de création d'emprunt
    try {
      await eventTriggerService.triggerEmpruntCreated(emprunt, utilisateur, jeu);
// console.('Event EMPRUNT_CREATED déclenché pour emprunt:', emprunt.id);
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
 */
const retourEmprunt = async (req, res) => {
  try {
    const { id } = req.params;

    const emprunt = await Emprunt.findByPk(id, {
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
      ]
    });

    if (!emprunt) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Emprunt not found'
      });
    }

    if (emprunt.statut === 'retourne') {
      return res.status(400).json({
        error: 'Already returned',
        message: 'This game has already been returned'
      });
    }

    // Use the model's retourner method
    await emprunt.retourner();

    // Reload to get updated data
    await emprunt.reload({
      include: [
        { model: Utilisateur, as: 'utilisateur' },
        { model: Jeu, as: 'jeu' }
      ]
    });

    // Déclencher l'événement de retour d'emprunt
    try {
      await eventTriggerService.triggerEmpruntReturned(emprunt, emprunt.utilisateur, emprunt.jeu);
// console.('Event EMPRUNT_RETURNED déclenché pour emprunt:', emprunt.id);
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
 */
const deleteEmprunt = async (req, res) => {
  try {
    const { id } = req.params;

    const emprunt = await Emprunt.findByPk(id, {
      include: [{ model: Jeu, as: 'jeu' }]
    });

    if (!emprunt) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Emprunt not found'
      });
    }

    // If emprunt is still active, return the game first
    if (emprunt.statut !== 'retourne') {
      await emprunt.jeu.changerStatut('disponible');
    }

    await emprunt.destroy();

    res.json({
      message: 'Emprunt deleted successfully'
    });
  } catch (error) {
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
 */
const getOverdueEmprunts = async (req, res) => {
  try {
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

    // Update status to en_retard
    for (const emprunt of emprunts) {
      if (emprunt.statut === 'en_cours') {
        emprunt.statut = 'en_retard';
        await emprunt.save();
      }
    }

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
