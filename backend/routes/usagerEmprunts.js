/**
 * Routes de gestion des emprunts pour les usagers
 * Inclut l'historique et les demandes de prolongation
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {
  Emprunt, Prolongation, Utilisateur,
  Jeu, Livre, Film, Disque,
  ParametresFront
} = require('../models');
const { authUsager } = require('../middleware/usagerAuth');

// Toutes les routes necessitent une authentification usager
router.use(authUsager);

/**
 * Helper: Recuperer les parametres de prolongation pour un type
 */
async function getProlongationParams(itemType) {
  const params = await ParametresFront.getParametres();
  const moduleMap = {
    jeu: 'ludotheque',
    livre: 'bibliotheque',
    film: 'filmotheque',
    disque: 'discotheque'
  };
  const moduleName = moduleMap[itemType] || 'ludotheque';

  return {
    jours: params[`prolongation_jours_${moduleName}`] || 14,
    autoMax: params[`prolongation_auto_max_${moduleName}`] || 1,
    manuellePossible: params[`prolongation_manuelle_${moduleName}`] || false,
    afficherMsgReservation: params[`prolongation_msg_reservation_${moduleName}`] || true
  };
}

/**
 * Helper: Verifier si un article est reserve par quelqu'un d'autre
 */
async function checkReservation(itemType, itemId, adherentId) {
  // TODO: Implementer quand le systeme de reservation sera en place
  // Pour l'instant, retourne toujours false
  return false;
}

/**
 * @route   GET /api/usager/emprunts
 * @desc    Liste des emprunts de l'usager connecte
 * @access  Private (usager)
 * @query   ?statut=en_cours|retourne|en_retard&page=1&limit=20
 */
router.get('/', async (req, res) => {
  try {
    const { statut, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { adherent_id: req.usagerId };

    if (statut) {
      where.statut = statut;
    }

    const { count, rows } = await Emprunt.findAndCountAll({
      where,
      include: [
        {
          model: Jeu,
          as: 'jeu',
          attributes: ['id', 'titre', 'image_url', 'code_barre']
        },
        {
          model: Livre,
          as: 'livre',
          attributes: ['id', 'titre', 'image_url', 'code_barre']
        },
        {
          model: Film,
          as: 'film',
          attributes: ['id', 'titre', 'image_url', 'code_barre']
        },
        {
          model: Disque,
          as: 'disque',
          attributes: ['id', 'titre', 'image_url', 'code_barre']
        },
        {
          model: Prolongation,
          as: 'prolongations',
          attributes: ['id', 'type', 'statut', 'date_demande', 'jours_ajoutes', 'reservation_en_attente']
        }
      ],
      order: [['date_emprunt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Enrichir les emprunts avec les infos de prolongation possibles
    const empruntsEnrichis = await Promise.all(rows.map(async (emprunt) => {
      const json = emprunt.toJSON();
      const itemType = emprunt.getItemType();

      if (json.statut === 'en_cours' || json.statut === 'en_retard') {
        const prolongParams = await getProlongationParams(itemType);
        const nbProlongationsAuto = json.prolongations.filter(p =>
          p.type === 'automatique' && p.statut === 'validee'
        ).length;
        const demandeEnAttente = json.prolongations.some(p => p.statut === 'en_attente');

        json.prolongation = {
          possible: !demandeEnAttente,
          auto_restantes: Math.max(0, prolongParams.autoMax - nbProlongationsAuto),
          manuelle_possible: prolongParams.manuellePossible && nbProlongationsAuto >= prolongParams.autoMax,
          jours_accordes: prolongParams.jours,
          demande_en_attente: demandeEnAttente
        };
      }

      // Determiner l'item emprunte
      json.item = json.jeu || json.livre || json.film || json.disque;
      json.item_type = itemType;
      delete json.jeu;
      delete json.livre;
      delete json.film;
      delete json.disque;

      return json;
    }));

    res.json({
      emprunts: empruntsEnrichis,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur liste emprunts usager:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la recuperation des emprunts'
    });
  }
});

/**
 * @route   GET /api/usager/emprunts/en-cours
 * @desc    Liste des emprunts en cours uniquement
 * @access  Private (usager)
 */
router.get('/en-cours', async (req, res) => {
  try {
    const emprunts = await Emprunt.findAll({
      where: {
        adherent_id: req.usagerId,
        statut: { [Op.in]: ['en_cours', 'en_retard'] }
      },
      include: [
        { model: Jeu, as: 'jeu', attributes: ['id', 'titre', 'image_url'] },
        { model: Livre, as: 'livre', attributes: ['id', 'titre', 'image_url'] },
        { model: Film, as: 'film', attributes: ['id', 'titre', 'image_url'] },
        { model: Disque, as: 'disque', attributes: ['id', 'titre', 'image_url'] },
        {
          model: Prolongation,
          as: 'prolongations',
          where: { statut: { [Op.in]: ['validee', 'en_attente'] } },
          required: false
        }
      ],
      order: [['date_retour_prevue', 'ASC']]
    });

    const result = await Promise.all(emprunts.map(async (emprunt) => {
      const json = emprunt.toJSON();
      const itemType = emprunt.getItemType();
      const prolongParams = await getProlongationParams(itemType);

      const nbProlongationsAuto = json.prolongations.filter(p =>
        p.type === 'automatique' && p.statut === 'validee'
      ).length;

      return {
        id: json.id,
        item: json.jeu || json.livre || json.film || json.disque,
        item_type: itemType,
        date_emprunt: json.date_emprunt,
        date_retour_prevue: json.date_retour_prevue,
        date_retour_initiale: json.date_retour_initiale,
        statut: json.statut,
        nb_prolongations: json.nb_prolongations,
        jours_restants: Math.ceil((new Date(json.date_retour_prevue) - new Date()) / (1000 * 60 * 60 * 24)),
        prolongation: {
          possible: !json.prolongations.some(p => p.statut === 'en_attente'),
          auto_restantes: Math.max(0, prolongParams.autoMax - nbProlongationsAuto),
          manuelle_possible: prolongParams.manuellePossible && nbProlongationsAuto >= prolongParams.autoMax,
          jours_accordes: prolongParams.jours
        }
      };
    }));

    res.json({ emprunts: result });
  } catch (error) {
    console.error('Erreur emprunts en cours:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la recuperation des emprunts en cours'
    });
  }
});

/**
 * @route   GET /api/usager/emprunts/historique
 * @desc    Historique des emprunts retournes
 * @access  Private (usager)
 */
router.get('/historique', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Emprunt.findAndCountAll({
      where: {
        adherent_id: req.usagerId,
        statut: 'retourne'
      },
      include: [
        { model: Jeu, as: 'jeu', attributes: ['id', 'titre', 'image_url'] },
        { model: Livre, as: 'livre', attributes: ['id', 'titre', 'image_url'] },
        { model: Film, as: 'film', attributes: ['id', 'titre', 'image_url'] },
        { model: Disque, as: 'disque', attributes: ['id', 'titre', 'image_url'] }
      ],
      order: [['date_retour_effective', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const historique = rows.map(emprunt => {
      const json = emprunt.toJSON();
      return {
        id: json.id,
        item: json.jeu || json.livre || json.film || json.disque,
        item_type: emprunt.getItemType(),
        date_emprunt: json.date_emprunt,
        date_retour_prevue: json.date_retour_prevue,
        date_retour_effective: json.date_retour_effective,
        nb_prolongations: json.nb_prolongations
      };
    });

    res.json({
      historique,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur historique emprunts:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la recuperation de l\'historique'
    });
  }
});

/**
 * @route   POST /api/usager/emprunts/:id/prolonger
 * @desc    Demander une prolongation d'emprunt
 * @access  Private (usager)
 */
router.post('/:id/prolonger', async (req, res) => {
  try {
    const { id } = req.params;

    // Recuperer l'emprunt
    const emprunt = await Emprunt.findOne({
      where: {
        id,
        adherent_id: req.usagerId,
        statut: { [Op.in]: ['en_cours', 'en_retard'] }
      },
      include: [
        { model: Prolongation, as: 'prolongations' }
      ]
    });

    if (!emprunt) {
      return res.status(404).json({
        error: 'Emprunt non trouve',
        message: 'Cet emprunt n\'existe pas ou n\'est plus en cours'
      });
    }

    // Verifier qu'il n'y a pas deja une demande en attente
    const demandeEnAttente = emprunt.prolongations.some(p => p.statut === 'en_attente');
    if (demandeEnAttente) {
      return res.status(400).json({
        error: 'Demande en cours',
        message: 'Une demande de prolongation est deja en attente de validation'
      });
    }

    // Recuperer les parametres de prolongation
    const itemType = emprunt.getItemType();
    const prolongParams = await getProlongationParams(itemType);

    // Compter les prolongations automatiques validees
    const nbProlongationsAuto = emprunt.prolongations.filter(p =>
      p.type === 'automatique' && p.statut === 'validee'
    ).length;

    // Determiner le type de prolongation
    let typeProlongation;
    let statutProlongation;

    if (nbProlongationsAuto < prolongParams.autoMax) {
      // Prolongation automatique
      typeProlongation = 'automatique';
      statutProlongation = 'validee';
    } else if (prolongParams.manuellePossible) {
      // Demande manuelle
      typeProlongation = 'manuelle';
      statutProlongation = 'en_attente';
    } else {
      return res.status(400).json({
        error: 'Prolongation impossible',
        message: 'Vous avez atteint le nombre maximum de prolongations'
      });
    }

    // Verifier si l'article est reserve
    const itemId = emprunt.getItemId();
    const estReserve = await checkReservation(itemType, itemId, req.usagerId);

    // Calculer les nouvelles dates
    const ancienneDateRetour = new Date(emprunt.date_retour_prevue);
    const nouvelleDateRetour = new Date(ancienneDateRetour);
    nouvelleDateRetour.setDate(nouvelleDateRetour.getDate() + prolongParams.jours);

    // Creer la prolongation
    const prolongation = await Prolongation.create({
      emprunt_id: emprunt.id,
      adherent_id: req.usagerId,
      type: typeProlongation,
      statut: statutProlongation,
      date_demande: new Date(),
      date_traitement: statutProlongation === 'validee' ? new Date() : null,
      ancienne_date_retour: ancienneDateRetour,
      nouvelle_date_retour: nouvelleDateRetour,
      jours_ajoutes: prolongParams.jours,
      reservation_en_attente: estReserve,
      message_reservation_affiche: false
    });

    // Si prolongation auto, mettre a jour l'emprunt
    if (statutProlongation === 'validee') {
      emprunt.date_retour_prevue = nouvelleDateRetour;
      emprunt.nb_prolongations += 1;

      // Garder la date initiale si c'est la premiere prolongation
      if (!emprunt.date_retour_initiale) {
        emprunt.date_retour_initiale = ancienneDateRetour;
      }

      await emprunt.save();
    }

    // Construire la reponse
    const response = {
      message: statutProlongation === 'validee'
        ? 'Prolongation accordee'
        : 'Demande de prolongation envoyee',
      prolongation: {
        id: prolongation.id,
        type: typeProlongation,
        statut: statutProlongation,
        ancienne_date_retour: ancienneDateRetour,
        nouvelle_date_retour: nouvelleDateRetour,
        jours_ajoutes: prolongParams.jours
      }
    };

    // Ajouter le message de reservation si necessaire
    if (estReserve && prolongParams.afficherMsgReservation) {
      response.avertissement = 'Un adherent attend cet article avec impatience. Le prolongement est valide mais pensez a le ramener bientot.';
      prolongation.message_reservation_affiche = true;
      await prolongation.save();
    }

    res.json(response);
  } catch (error) {
    console.error('Erreur prolongation:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la demande de prolongation'
    });
  }
});

/**
 * @route   GET /api/usager/emprunts/:id
 * @desc    Details d'un emprunt specifique
 * @access  Private (usager)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const emprunt = await Emprunt.findOne({
      where: {
        id,
        adherent_id: req.usagerId
      },
      include: [
        { model: Jeu, as: 'jeu' },
        { model: Livre, as: 'livre' },
        { model: Film, as: 'film' },
        { model: Disque, as: 'disque' },
        {
          model: Prolongation,
          as: 'prolongations',
          order: [['date_demande', 'DESC']]
        }
      ]
    });

    if (!emprunt) {
      return res.status(404).json({
        error: 'Non trouve',
        message: 'Emprunt non trouve'
      });
    }

    const json = emprunt.toJSON();
    const itemType = emprunt.getItemType();

    // Enrichir avec les infos de prolongation
    if (json.statut !== 'retourne') {
      const prolongParams = await getProlongationParams(itemType);
      const nbProlongationsAuto = json.prolongations.filter(p =>
        p.type === 'automatique' && p.statut === 'validee'
      ).length;

      json.prolongation = {
        possible: !json.prolongations.some(p => p.statut === 'en_attente'),
        auto_restantes: Math.max(0, prolongParams.autoMax - nbProlongationsAuto),
        manuelle_possible: prolongParams.manuellePossible && nbProlongationsAuto >= prolongParams.autoMax,
        jours_accordes: prolongParams.jours
      };
    }

    json.item = json.jeu || json.livre || json.film || json.disque;
    json.item_type = itemType;
    delete json.jeu;
    delete json.livre;
    delete json.film;
    delete json.disque;

    res.json(json);
  } catch (error) {
    console.error('Erreur detail emprunt:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Erreur lors de la recuperation des details'
    });
  }
});

module.exports = router;
