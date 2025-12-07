const express = require('express');
const router = express.Router();
const { Prolongation, Emprunt, Utilisateur, Jeu, Livre, Film, Disque } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { Op } = require('sequelize');

// Middleware d'authentification admin pour toutes les routes
router.use(verifyToken);

// GET /api/prolongations - Liste des demandes de prolongation
router.get('/', async (req, res) => {
  try {
    const { statut, type, module, page = 1, limit = 20 } = req.query;

    const where = {};

    if (statut) {
      where.statut = statut;
    }

    if (type) {
      where.type = type;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: prolongations } = await Prolongation.findAndCountAll({
      where,
      include: [
        {
          model: Emprunt,
          as: 'emprunt',
          include: [
            { model: Jeu, as: 'jeu', attributes: ['id', 'nom'] },
            { model: Livre, as: 'livre', attributes: ['id', 'titre'] },
            { model: Film, as: 'film', attributes: ['id', 'titre'] },
            { model: Disque, as: 'disque', attributes: ['id', 'titre'] }
          ]
        },
        {
          model: Utilisateur,
          as: 'demandeur',
          attributes: ['id', 'nom', 'prenom', 'email', 'code_barre']
        },
        {
          model: Utilisateur,
          as: 'traitePar',
          attributes: ['id', 'nom', 'prenom']
        }
      ],
      order: [['date_demande', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Filtrer par module si demande
    let filteredProlongations = prolongations;
    if (module) {
      filteredProlongations = prolongations.filter(p => {
        const emprunt = p.emprunt;
        if (!emprunt) return false;

        switch (module) {
          case 'ludotheque': return emprunt.jeu_id !== null;
          case 'bibliotheque': return emprunt.livre_id !== null;
          case 'filmotheque': return emprunt.film_id !== null;
          case 'discotheque': return emprunt.disque_id !== null;
          default: return true;
        }
      });
    }

    // Formater les resultats
    const formatted = filteredProlongations.map(p => {
      const emprunt = p.emprunt;
      let item = null;
      let itemType = null;

      if (emprunt) {
        if (emprunt.jeu) {
          item = { id: emprunt.jeu.id, nom: emprunt.jeu.nom };
          itemType = 'jeu';
        } else if (emprunt.livre) {
          item = { id: emprunt.livre.id, nom: emprunt.livre.titre };
          itemType = 'livre';
        } else if (emprunt.film) {
          item = { id: emprunt.film.id, nom: emprunt.film.titre };
          itemType = 'film';
        } else if (emprunt.disque) {
          item = { id: emprunt.disque.id, nom: emprunt.disque.titre };
          itemType = 'disque';
        }
      }

      return {
        id: p.id,
        type: p.type,
        statut: p.statut,
        date_demande: p.date_demande,
        date_traitement: p.date_traitement,
        jours_ajoutes: p.jours_ajoutes,
        nouvelle_date_retour: p.nouvelle_date_retour,
        commentaire_admin: p.commentaire_admin,
        item_reserve: p.item_reserve,
        message_reservation_affiche: p.message_reservation_affiche,
        adherent: p.demandeur ? {
          id: p.demandeur.id,
          nom: p.demandeur.nom,
          prenom: p.demandeur.prenom,
          email: p.demandeur.email,
          code_barre: p.demandeur.code_barre
        } : null,
        emprunt: emprunt ? {
          id: emprunt.id,
          date_emprunt: emprunt.date_emprunt,
          date_retour_prevue: emprunt.date_retour_prevue,
          nb_prolongations: emprunt.nb_prolongations
        } : null,
        item,
        itemType,
        admin: p.traitePar ? {
          id: p.traitePar.id,
          nom: p.traitePar.nom,
          prenom: p.traitePar.prenom
        } : null
      };
    });

    res.json({
      prolongations: formatted,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('Erreur liste prolongations:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// GET /api/prolongations/stats - Statistiques des prolongations
router.get('/stats', async (req, res) => {
  try {
    const enAttente = await Prolongation.count({ where: { statut: 'en_attente' } });
    const validees = await Prolongation.count({ where: { statut: 'validee' } });
    const refusees = await Prolongation.count({ where: { statut: 'refusee' } });

    // Par type
    const automatiques = await Prolongation.count({ where: { type: 'automatique' } });
    const manuelles = await Prolongation.count({ where: { type: 'manuelle' } });

    res.json({
      enAttente,
      validees,
      refusees,
      total: enAttente + validees + refusees,
      parType: {
        automatiques,
        manuelles
      }
    });
  } catch (error) {
    console.error('Erreur stats prolongations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/prolongations/:id - Details d'une prolongation
router.get('/:id', async (req, res) => {
  try {
    const prolongation = await Prolongation.findByPk(req.params.id, {
      include: [
        {
          model: Emprunt,
          as: 'emprunt',
          include: [
            { model: Jeu, as: 'jeu' },
            { model: Livre, as: 'livre' },
            { model: Film, as: 'film' },
            { model: Disque, as: 'disque' }
          ]
        },
        {
          model: Utilisateur,
          as: 'demandeur',
          attributes: ['id', 'nom', 'prenom', 'email', 'code_barre', 'telephone']
        },
        {
          model: Utilisateur,
          as: 'traitePar',
          attributes: ['id', 'nom', 'prenom']
        }
      ]
    });

    if (!prolongation) {
      return res.status(404).json({ error: 'Prolongation non trouvee' });
    }

    res.json(prolongation);
  } catch (error) {
    console.error('Erreur details prolongation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/prolongations/:id/valider - Valider une demande
router.post('/:id/valider', async (req, res) => {
  try {
    const prolongation = await Prolongation.findByPk(req.params.id, {
      include: [{ model: Emprunt, as: 'emprunt' }]
    });

    if (!prolongation) {
      return res.status(404).json({ error: 'Prolongation non trouvee' });
    }

    if (prolongation.statut !== 'en_attente') {
      return res.status(400).json({ error: 'Cette demande a deja ete traitee' });
    }

    const { commentaire } = req.body;

    // Valider la prolongation
    await prolongation.valider(req.user.id, commentaire);

    // Mettre a jour l'emprunt
    const emprunt = prolongation.emprunt;
    if (emprunt) {
      emprunt.date_retour_prevue = prolongation.nouvelle_date_retour;
      emprunt.nb_prolongations = (emprunt.nb_prolongations || 0) + 1;
      await emprunt.save();
    }

    res.json({
      success: true,
      message: 'Prolongation validee',
      prolongation
    });
  } catch (error) {
    console.error('Erreur validation prolongation:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// POST /api/prolongations/:id/refuser - Refuser une demande
router.post('/:id/refuser', async (req, res) => {
  try {
    const prolongation = await Prolongation.findByPk(req.params.id);

    if (!prolongation) {
      return res.status(404).json({ error: 'Prolongation non trouvee' });
    }

    if (prolongation.statut !== 'en_attente') {
      return res.status(400).json({ error: 'Cette demande a deja ete traitee' });
    }

    const { commentaire } = req.body;

    if (!commentaire) {
      return res.status(400).json({ error: 'Un commentaire est requis pour refuser une demande' });
    }

    // Refuser la prolongation
    await prolongation.refuser(req.user.id, commentaire);

    res.json({
      success: true,
      message: 'Prolongation refusee',
      prolongation
    });
  } catch (error) {
    console.error('Erreur refus prolongation:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// DELETE /api/prolongations/:id - Supprimer une prolongation (admin uniquement)
router.delete('/:id', async (req, res) => {
  try {
    const prolongation = await Prolongation.findByPk(req.params.id);

    if (!prolongation) {
      return res.status(404).json({ error: 'Prolongation non trouvee' });
    }

    await prolongation.destroy();

    res.json({
      success: true,
      message: 'Prolongation supprimee'
    });
  } catch (error) {
    console.error('Erreur suppression prolongation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
