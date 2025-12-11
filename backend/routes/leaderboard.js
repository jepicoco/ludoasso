const express = require('express');
const router = express.Router();
const { LeaderboardScore } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/leaderboard
 * Recuperer le top des scores
 * Query params:
 * - limit: nombre de scores (default 10, max 100)
 * - period: 'all', 'today', 'week', 'month' (default 'all')
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const period = req.query.period || 'all';

    const where = {};

    // Filtre par periode
    if (period !== 'all') {
      const now = new Date();
      let dateFrom;

      switch (period) {
        case 'today':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      if (dateFrom) {
        where.created_at = { [Op.gte]: dateFrom };
      }
    }

    const scores = await LeaderboardScore.findAll({
      where,
      order: [['score', 'DESC'], ['created_at', 'ASC']],
      limit,
      attributes: [
        'id',
        'pseudo',
        'score',
        'temps_secondes',
        'vies_restantes',
        'niveau_vitesse',
        'friandises_attrapees',
        'created_at'
      ]
    });

    // Ajouter le rang
    const rankedScores = scores.map((score, index) => ({
      rang: index + 1,
      ...score.toJSON()
    }));

    res.json({
      success: true,
      data: rankedScores,
      meta: {
        total: rankedScores.length,
        period
      }
    });
  } catch (error) {
    console.error('Erreur recuperation leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation du leaderboard'
    });
  }
});

/**
 * POST /api/leaderboard
 * Enregistrer un nouveau score
 * Body: { pseudo, score, temps_secondes, vies_restantes, niveau_vitesse, friandises_attrapees }
 */
router.post('/', async (req, res) => {
  try {
    const {
      pseudo,
      score,
      temps_secondes,
      vies_restantes,
      niveau_vitesse,
      friandises_attrapees
    } = req.body;

    // Validation du pseudo (5 caracteres alphanumeriques max)
    if (!pseudo || typeof pseudo !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Pseudo requis'
      });
    }

    const cleanPseudo = pseudo.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

    if (cleanPseudo.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Pseudo invalide (1-5 caracteres alphanumeriques)'
      });
    }

    // Validation du score
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({
        success: false,
        message: 'Score invalide'
      });
    }

    // Recuperer IP et User-Agent
    const ip_address = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const user_agent = req.headers['user-agent'] || '';

    // Creer le score
    const newScore = await LeaderboardScore.create({
      pseudo: cleanPseudo,
      score: Math.floor(score),
      temps_secondes: Math.floor(temps_secondes || 0),
      vies_restantes: Math.floor(vies_restantes || 0),
      niveau_vitesse: Math.floor(niveau_vitesse || 1),
      friandises_attrapees: Math.floor(friandises_attrapees || 0),
      ip_address: ip_address ? ip_address.slice(0, 45) : null,
      user_agent: user_agent ? user_agent.slice(0, 500) : null,
      game_version: '1.0'
    });

    // Calculer le rang du score
    const betterScores = await LeaderboardScore.count({
      where: {
        score: { [Op.gt]: newScore.score }
      }
    });
    const rang = betterScores + 1;

    // Verifier si c'est un top 10
    const isTop10 = rang <= 10;

    res.status(201).json({
      success: true,
      data: {
        id: newScore.id,
        pseudo: newScore.pseudo,
        score: newScore.score,
        rang,
        isTop10,
        temps_secondes: newScore.temps_secondes,
        vies_restantes: newScore.vies_restantes,
        niveau_vitesse: newScore.niveau_vitesse,
        friandises_attrapees: newScore.friandises_attrapees
      },
      message: isTop10 ? 'Felicitations ! Vous etes dans le top 10 !' : 'Score enregistre !'
    });
  } catch (error) {
    console.error('Erreur enregistrement score:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Donnees invalides',
        errors: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement du score'
    });
  }
});

/**
 * GET /api/leaderboard/stats
 * Statistiques globales du jeu
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalGames,
      topScore,
      avgScore,
      totalFriandises
    ] = await Promise.all([
      LeaderboardScore.count(),
      LeaderboardScore.max('score'),
      LeaderboardScore.findOne({
        attributes: [
          [LeaderboardScore.sequelize.fn('AVG', LeaderboardScore.sequelize.col('score')), 'avg']
        ],
        raw: true
      }),
      LeaderboardScore.sum('friandises_attrapees')
    ]);

    res.json({
      success: true,
      data: {
        total_parties: totalGames || 0,
        meilleur_score: topScore || 0,
        score_moyen: Math.round(avgScore?.avg || 0),
        total_friandises: totalFriandises || 0
      }
    });
  } catch (error) {
    console.error('Erreur stats leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des statistiques'
    });
  }
});

module.exports = router;
