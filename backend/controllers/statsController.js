const { Utilisateur, Jeu, Emprunt } = require('../models');
const { Op } = require('sequelize');

/**
 * Get dashboard statistics
 * GET /api/stats/dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    // Count adherents by status
    const utilisateursStats = await Utilisateur.findAll({
      attributes: [
        'statut',
        [Utilisateur.sequelize.fn('COUNT', Utilisateur.sequelize.col('id')), 'count']
      ],
      group: ['statut']
    });

    const totalUtilisateurs = utilisateursStats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0);
    const utilisateursActifs = utilisateursStats.find(s => s.statut === 'actif')?.dataValues.count || 0;

    // Count jeux by status
    const jeuxStats = await Jeu.findAll({
      attributes: [
        'statut',
        [Jeu.sequelize.fn('COUNT', Jeu.sequelize.col('id')), 'count']
      ],
      group: ['statut']
    });

    const totalJeux = jeuxStats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0);
    const jeuxDisponibles = jeuxStats.find(s => s.statut === 'disponible')?.dataValues.count || 0;
    const jeuxEmpruntes = jeuxStats.find(s => s.statut === 'emprunte')?.dataValues.count || 0;

    // Count emprunts by status
    const empruntsEnCours = await Emprunt.count({
      where: { statut: 'en_cours' }
    });

    const empruntsEnRetard = await Emprunt.count({
      where: {
        statut: { [Op.in]: ['en_cours', 'en_retard'] },
        date_retour_prevue: { [Op.lt]: new Date() }
      }
    });

    const empruntsTotal = await Emprunt.count();

    // Recent activity - emprunts created in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const empruntsRecents = await Emprunt.count({
      where: {
        date_emprunt: { [Op.gte]: sevenDaysAgo }
      }
    });

    // Recent returns - emprunts returned in last 7 days
    const retoursRecents = await Emprunt.count({
      where: {
        date_retour_effective: { [Op.gte]: sevenDaysAgo }
      }
    });

    // Données utilisateurs avec alias adherents pour rétrocompatibilité frontend
    const utilisateursData = {
      total: totalUtilisateurs,
      actifs: parseInt(utilisateursActifs),
      byStatus: utilisateursStats.map(s => ({
        statut: s.statut,
        count: parseInt(s.dataValues.count)
      }))
    };

    res.json({
      utilisateurs: utilisateursData,
      adherents: utilisateursData, // Alias pour rétrocompatibilité
      jeux: {
        total: totalJeux,
        disponibles: parseInt(jeuxDisponibles),
        empruntes: parseInt(jeuxEmpruntes),
        byStatus: jeuxStats.map(s => ({
          statut: s.statut,
          count: parseInt(s.dataValues.count)
        }))
      },
      emprunts: {
        total: empruntsTotal,
        enCours: empruntsEnCours,
        enRetard: empruntsEnRetard,
        tauxRetard: empruntsEnCours > 0
          ? ((empruntsEnRetard / empruntsEnCours) * 100).toFixed(2)
          : 0
      },
      activity: {
        empruntsRecents,
        retoursRecents,
        periode: '7 derniers jours'
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get popular games statistics
 * GET /api/stats/popular-games
 */
const getPopularGames = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularGames = await Emprunt.findAll({
      attributes: [
        'jeu_id',
        [Emprunt.sequelize.fn('COUNT', Emprunt.sequelize.col('jeu_id')), 'emprunt_count']
      ],
      include: [{
        model: Jeu,
        as: 'jeu',
        attributes: ['id', 'titre', 'editeur', 'statut', 'image_url']
      }],
      group: ['jeu_id'],
      order: [[Emprunt.sequelize.literal('emprunt_count'), 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      games: popularGames.map(g => ({
        jeu: g.jeu,
        emprunts: parseInt(g.dataValues.emprunt_count)
      }))
    });
  } catch (error) {
    console.error('Get popular games error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get active members statistics
 * GET /api/stats/active-members
 */
const getActiveMembers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const activeMembers = await Emprunt.findAll({
      attributes: [
        'utilisateur_id',
        [Emprunt.sequelize.fn('COUNT', Emprunt.sequelize.col('utilisateur_id')), 'emprunt_count']
      ],
      include: [{
        model: Utilisateur,
        as: 'utilisateur',
        attributes: ['id', 'nom', 'prenom', 'email', 'statut']
      }],
      group: ['utilisateur_id'],
      order: [[Emprunt.sequelize.literal('emprunt_count'), 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      members: activeMembers.map(m => ({
        utilisateur: m.utilisateur,
        adherent: m.utilisateur, // Alias pour rétrocompatibilité frontend
        emprunts: parseInt(m.dataValues.emprunt_count)
      }))
    });
  } catch (error) {
    console.error('Get active members error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get loan duration statistics
 * GET /api/stats/loan-duration
 */
const getLoanDurationStats = async (req, res) => {
  try {
    const emprunts = await Emprunt.findAll({
      where: {
        date_retour_effective: { [Op.ne]: null }
      },
      attributes: ['date_emprunt', 'date_retour_effective']
    });

    // Calculate average loan duration
    let totalDuration = 0;
    const durations = emprunts.map(e => {
      const start = new Date(e.date_emprunt);
      const end = new Date(e.date_retour_effective);
      const duration = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      totalDuration += duration;
      return duration;
    });

    const averageDuration = emprunts.length > 0
      ? (totalDuration / emprunts.length).toFixed(2)
      : 0;

    // Calculate min, max
    const minDuration = emprunts.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = emprunts.length > 0 ? Math.max(...durations) : 0;

    res.json({
      totalEmprunts: emprunts.length,
      averageDuration: parseFloat(averageDuration),
      minDuration,
      maxDuration,
      unit: 'jours'
    });
  } catch (error) {
    console.error('Get loan duration stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get monthly statistics
 * GET /api/stats/monthly
 */
const getMonthlyStats = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(months));

    const emprunts = await Emprunt.findAll({
      where: {
        date_emprunt: { [Op.gte]: monthsAgo }
      },
      attributes: [
        [Emprunt.sequelize.fn('DATE_FORMAT', Emprunt.sequelize.col('date_emprunt'), '%Y-%m'), 'month'],
        [Emprunt.sequelize.fn('COUNT', Emprunt.sequelize.col('id')), 'count']
      ],
      group: [Emprunt.sequelize.fn('DATE_FORMAT', Emprunt.sequelize.col('date_emprunt'), '%Y-%m')],
      order: [[Emprunt.sequelize.fn('DATE_FORMAT', Emprunt.sequelize.col('date_emprunt'), '%Y-%m'), 'ASC']]
    });

    res.json({
      period: `${months} derniers mois`,
      data: emprunts.map(e => ({
        month: e.dataValues.month,
        emprunts: parseInt(e.dataValues.count)
      }))
    });
  } catch (error) {
    console.error('Get monthly stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get category statistics
 * GET /api/stats/categories
 */
const getCategoryStats = async (req, res) => {
  try {
    // Count jeux by category
    const categoryStats = await Jeu.findAll({
      attributes: [
        'categorie',
        [Jeu.sequelize.fn('COUNT', Jeu.sequelize.col('id')), 'count']
      ],
      where: {
        categorie: { [Op.ne]: null }
      },
      group: ['categorie'],
      order: [[Jeu.sequelize.literal('count'), 'DESC']]
    });

    // Count emprunts by category
    const categoryEmprunts = await Emprunt.findAll({
      attributes: [
        [Emprunt.sequelize.col('jeu.categorie'), 'categorie'],
        [Emprunt.sequelize.fn('COUNT', Emprunt.sequelize.col('Emprunt.id')), 'emprunt_count']
      ],
      include: [{
        model: Jeu,
        as: 'jeu',
        attributes: [],
        where: {
          categorie: { [Op.ne]: null }
        }
      }],
      group: ['jeu.categorie'],
      order: [[Emprunt.sequelize.literal('emprunt_count'), 'DESC']]
    });

    res.json({
      categories: categoryStats.map(c => {
        const emprunts = categoryEmprunts.find(
          e => e.dataValues.categorie === c.categorie
        );
        return {
          categorie: c.categorie,
          jeuxCount: parseInt(c.dataValues.count),
          empruntsCount: emprunts ? parseInt(emprunts.dataValues.emprunt_count) : 0
        };
      })
    });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getPopularGames,
  getActiveMembers,
  getLoanDurationStats,
  getMonthlyStats,
  getCategoryStats
};
