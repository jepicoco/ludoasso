/**
 * Controller pour les statistiques multi-modules avec gestion des droits
 *
 * Filtrage par module selon les droits de l'utilisateur:
 * - gestionnaire+ : voit tous les modules
 * - benevole/agent : voit uniquement ses modules autorises
 * - comptable+ : acces aux stats financieres
 */

const {
  Utilisateur, Jeu, Livre, Film, Disque, Emprunt, Cotisation, sequelize,
  EmplacementJeu, EmplacementLivre, EmplacementFilm, EmplacementDisque,
  ArticleThematique
} = require('../models');
const { Op } = require('sequelize');
const { getUserAllowedModules, hasModuleAccess, hasRoleLevel, MODULES, MODULE_MAPPING } = require('../middleware/checkRole');

/**
 * Obtenir les modules accessibles pour les stats selon l'utilisateur
 * @param {Object} user - Utilisateur connecte
 * @param {Array} requestedModules - Modules demandes (optionnel)
 * @returns {Array} Liste des modules accessibles
 */
const getAccessibleModules = (user, requestedModules = null) => {
  const allowedModules = getUserAllowedModules(user);

  // Si gestionnaire+ ou admin, tous les modules sont accessibles
  if (allowedModules === null) {
    return requestedModules || MODULES;
  }

  // Sinon, filtrer selon les modules autorises
  if (requestedModules) {
    return requestedModules.filter(m => allowedModules.includes(m));
  }

  return allowedModules;
};

/**
 * Construire la condition WHERE pour filtrer les emprunts par modules accessibles
 * @param {Array} modules - Liste des modules accessibles
 * @returns {Object} Condition Sequelize
 */
const buildModuleWhereClause = (modules) => {
  const conditions = [];

  if (modules.includes('ludotheque')) {
    conditions.push({ jeu_id: { [Op.ne]: null } });
  }
  if (modules.includes('bibliotheque')) {
    conditions.push({ livre_id: { [Op.ne]: null } });
  }
  if (modules.includes('filmotheque')) {
    conditions.push({ film_id: { [Op.ne]: null } });
  }
  if (modules.includes('discotheque')) {
    conditions.push({ cd_id: { [Op.ne]: null } });
  }

  return conditions.length > 0 ? { [Op.or]: conditions } : {};
};

/**
 * Get dashboard statistics - Multi-modules avec filtrage par droits
 * GET /api/stats/dashboard?modules=ludotheque,bibliotheque
 */
const getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    const requestedModules = req.query.modules
      ? req.query.modules.split(',').filter(m => MODULES.includes(m))
      : null;

    const accessibleModules = getAccessibleModules(user, requestedModules);

    // Stats globales utilisateurs (visible par tous)
    const utilisateursStats = await Utilisateur.findAll({
      attributes: [
        'statut',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { role: 'usager' }, // Ne compter que les usagers, pas le staff
      group: ['statut']
    });

    const totalUtilisateurs = utilisateursStats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0);
    const utilisateursActifs = utilisateursStats.find(s => s.statut === 'actif')?.dataValues.count || 0;

    // Stats par module accessible
    const modulesStats = {};

    for (const moduleCode of accessibleModules) {
      const mapping = MODULE_MAPPING[moduleCode];
      if (!mapping) continue;

      let Model, countField;
      switch (moduleCode) {
        case 'ludotheque':
          Model = Jeu;
          countField = 'jeu_id';
          break;
        case 'bibliotheque':
          Model = Livre;
          countField = 'livre_id';
          break;
        case 'filmotheque':
          Model = Film;
          countField = 'film_id';
          break;
        case 'discotheque':
          Model = Disque;
          countField = 'cd_id';
          break;
        default:
          continue;
      }

      // Stats de la collection
      const stats = await Model.findAll({
        attributes: [
          'statut',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['statut']
      });

      const total = stats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0);
      const disponibles = stats.find(s => s.statut === 'disponible')?.dataValues.count || 0;
      const empruntes = stats.find(s => s.statut === 'emprunte')?.dataValues.count || 0;

      // Emprunts pour ce module
      const empruntsEnCours = await Emprunt.count({
        where: {
          statut: 'en_cours',
          [countField]: { [Op.ne]: null }
        }
      });

      const empruntsEnRetard = await Emprunt.count({
        where: {
          statut: { [Op.in]: ['en_cours', 'en_retard'] },
          date_retour_prevue: { [Op.lt]: new Date() },
          [countField]: { [Op.ne]: null }
        }
      });

      modulesStats[moduleCode] = {
        code: moduleCode,
        libelle: getModuleLibelle(moduleCode),
        collection: {
          total,
          disponibles: parseInt(disponibles),
          empruntes: parseInt(empruntes),
          byStatus: stats.map(s => ({
            statut: s.statut,
            count: parseInt(s.dataValues.count)
          }))
        },
        emprunts: {
          enCours: empruntsEnCours,
          enRetard: empruntsEnRetard
        }
      };
    }

    // Stats globales emprunts (filtrees par modules accessibles)
    const moduleWhere = buildModuleWhereClause(accessibleModules);

    const empruntsEnCours = await Emprunt.count({
      where: { statut: 'en_cours', ...moduleWhere }
    });

    const empruntsEnRetard = await Emprunt.count({
      where: {
        statut: { [Op.in]: ['en_cours', 'en_retard'] },
        date_retour_prevue: { [Op.lt]: new Date() },
        ...moduleWhere
      }
    });

    const empruntsTotal = await Emprunt.count({ where: moduleWhere });

    // Activite recente
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const empruntsRecents = await Emprunt.count({
      where: {
        date_emprunt: { [Op.gte]: sevenDaysAgo },
        ...moduleWhere
      }
    });

    const retoursRecents = await Emprunt.count({
      where: {
        date_retour_effective: { [Op.gte]: sevenDaysAgo },
        ...moduleWhere
      }
    });

    // Donnees utilisateurs avec alias pour retrocompatibilite
    const utilisateursData = {
      total: totalUtilisateurs,
      actifs: parseInt(utilisateursActifs),
      byStatus: utilisateursStats.map(s => ({
        statut: s.statut,
        count: parseInt(s.dataValues.count)
      }))
    };

    // Calculer totaux globaux depuis les modules
    const globalCollection = {
      total: Object.values(modulesStats).reduce((sum, m) => sum + m.collection.total, 0),
      disponibles: Object.values(modulesStats).reduce((sum, m) => sum + m.collection.disponibles, 0),
      empruntes: Object.values(modulesStats).reduce((sum, m) => sum + m.collection.empruntes, 0)
    };

    res.json({
      accessibleModules,
      utilisateurs: utilisateursData,
      adherents: utilisateursData, // Alias retrocompatibilite
      global: {
        collection: globalCollection,
        emprunts: {
          total: empruntsTotal,
          enCours: empruntsEnCours,
          enRetard: empruntsEnRetard,
          tauxRetard: empruntsEnCours > 0
            ? ((empruntsEnRetard / empruntsEnCours) * 100).toFixed(2)
            : 0
        }
      },
      modules: modulesStats,
      // Retrocompatibilite: expose jeux si ludotheque accessible
      jeux: modulesStats.ludotheque?.collection || null,
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
 * Get popular items statistics - Multi-modules
 * GET /api/stats/popular-items?module=ludotheque&limit=10
 */
const getPopularItems = async (req, res) => {
  try {
    const user = req.user;
    const { module: moduleCode, limit = 10 } = req.query;

    // Si un module specifique est demande, verifier l'acces
    if (moduleCode && !hasModuleAccess(user, moduleCode)) {
      return res.status(403).json({
        error: 'Acces refuse',
        message: `Vous n'avez pas acces au module ${moduleCode}`
      });
    }

    const accessibleModules = moduleCode
      ? [moduleCode]
      : getAccessibleModules(user);

    const results = {};

    for (const mod of accessibleModules) {
      const mapping = MODULE_MAPPING[mod];
      if (!mapping) continue;

      let Model, includeAs;
      switch (mod) {
        case 'ludotheque':
          Model = Jeu;
          includeAs = 'jeu';
          break;
        case 'bibliotheque':
          Model = Livre;
          includeAs = 'livre';
          break;
        case 'filmotheque':
          Model = Film;
          includeAs = 'film';
          break;
        case 'discotheque':
          Model = Disque;
          includeAs = 'disque';
          break;
        default:
          continue;
      }

      const popularItems = await Emprunt.findAll({
        attributes: [
          mapping.field,
          [sequelize.fn('COUNT', sequelize.col(mapping.field)), 'emprunt_count']
        ],
        where: {
          [mapping.field]: { [Op.ne]: null }
        },
        include: [{
          model: Model,
          as: includeAs,
          attributes: ['id', 'titre', 'statut', 'image_url']
        }],
        group: [mapping.field],
        order: [[sequelize.literal('emprunt_count'), 'DESC']],
        limit: parseInt(limit)
      });

      results[mod] = {
        libelle: getModuleLibelle(mod),
        items: popularItems.map(item => ({
          item: item[includeAs],
          emprunts: parseInt(item.dataValues.emprunt_count)
        }))
      };
    }

    // Retrocompatibilite: si un seul module demande, retourner format simplifie
    if (moduleCode && results[moduleCode]) {
      return res.json({
        module: moduleCode,
        games: results[moduleCode].items, // Alias retrocompatibilite
        items: results[moduleCode].items
      });
    }

    res.json({ modules: results });
  } catch (error) {
    console.error('Get popular items error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get popular games statistics - Retrocompatibilite
 * GET /api/stats/popular-games?limit=10
 */
const getPopularGames = async (req, res) => {
  try {
    const user = req.user;
    const { limit = 10 } = req.query;

    // Verifier acces au module ludotheque
    if (!hasModuleAccess(user, 'ludotheque')) {
      return res.status(403).json({
        error: 'Acces refuse',
        message: 'Vous n\'avez pas acces au module ludotheque'
      });
    }

    const popularGames = await Emprunt.findAll({
      attributes: [
        'jeu_id',
        [sequelize.fn('COUNT', sequelize.col('jeu_id')), 'emprunt_count']
      ],
      where: {
        jeu_id: { [Op.ne]: null }
      },
      include: [{
        model: Jeu,
        as: 'jeu',
        attributes: ['id', 'titre', 'editeur', 'statut', 'image_url']
      }],
      group: ['jeu_id'],
      order: [[sequelize.literal('emprunt_count'), 'DESC']],
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
 * GET /api/stats/active-members?limit=10&module=ludotheque
 */
const getActiveMembers = async (req, res) => {
  try {
    const user = req.user;
    const { limit = 10, module: moduleCode } = req.query;

    const accessibleModules = moduleCode
      ? (hasModuleAccess(user, moduleCode) ? [moduleCode] : [])
      : getAccessibleModules(user);

    if (accessibleModules.length === 0) {
      return res.status(403).json({
        error: 'Acces refuse',
        message: 'Aucun module accessible'
      });
    }

    const moduleWhere = buildModuleWhereClause(accessibleModules);

    const activeMembers = await Emprunt.findAll({
      attributes: [
        'utilisateur_id',
        [sequelize.fn('COUNT', sequelize.col('utilisateur_id')), 'emprunt_count']
      ],
      where: moduleWhere,
      include: [{
        model: Utilisateur,
        as: 'utilisateur',
        attributes: ['id', 'nom', 'prenom', 'email', 'statut']
      }],
      group: ['utilisateur_id'],
      order: [[sequelize.literal('emprunt_count'), 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      members: activeMembers.map(m => ({
        utilisateur: m.utilisateur,
        adherent: m.utilisateur, // Alias retrocompatibilite
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
 * GET /api/stats/loan-duration?module=ludotheque
 */
const getLoanDurationStats = async (req, res) => {
  try {
    const user = req.user;
    const { module: moduleCode } = req.query;

    const accessibleModules = moduleCode
      ? (hasModuleAccess(user, moduleCode) ? [moduleCode] : [])
      : getAccessibleModules(user);

    if (accessibleModules.length === 0) {
      return res.status(403).json({
        error: 'Acces refuse',
        message: 'Aucun module accessible'
      });
    }

    const moduleWhere = buildModuleWhereClause(accessibleModules);

    const emprunts = await Emprunt.findAll({
      where: {
        date_retour_effective: { [Op.ne]: null },
        ...moduleWhere
      },
      attributes: ['date_emprunt', 'date_retour_effective']
    });

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

    const minDuration = emprunts.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = emprunts.length > 0 ? Math.max(...durations) : 0;

    res.json({
      totalEmprunts: emprunts.length,
      averageDuration: parseFloat(averageDuration),
      minDuration,
      maxDuration,
      unit: 'jours',
      modules: accessibleModules
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
 * GET /api/stats/monthly?months=12&module=ludotheque
 */
const getMonthlyStats = async (req, res) => {
  try {
    const user = req.user;
    const { months = 12, module: moduleCode } = req.query;

    const accessibleModules = moduleCode
      ? (hasModuleAccess(user, moduleCode) ? [moduleCode] : [])
      : getAccessibleModules(user);

    if (accessibleModules.length === 0) {
      return res.status(403).json({
        error: 'Acces refuse',
        message: 'Aucun module accessible'
      });
    }

    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(months));

    const moduleWhere = buildModuleWhereClause(accessibleModules);

    const emprunts = await Emprunt.findAll({
      where: {
        date_emprunt: { [Op.gte]: monthsAgo },
        ...moduleWhere
      },
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('date_emprunt'), '%Y-%m'), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('date_emprunt'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('date_emprunt'), '%Y-%m'), 'ASC']]
    });

    res.json({
      period: `${months} derniers mois`,
      modules: accessibleModules,
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
 * Get category/genre statistics
 * GET /api/stats/categories?module=ludotheque
 * Uses normalized junction tables for each collection
 */
const getCategoryStats = async (req, res) => {
  try {
    const user = req.user;
    const { module: moduleCode } = req.query;

    // Par defaut, stats categories pour ludotheque
    const targetModule = moduleCode || 'ludotheque';

    if (!hasModuleAccess(user, targetModule)) {
      return res.status(403).json({
        error: 'Acces refuse',
        message: `Vous n'avez pas acces au module ${targetModule}`
      });
    }

    let query;
    const fieldLabel = targetModule === 'ludotheque' ? 'categorie' : 'genre';

    // Utiliser les tables normalisees pour chaque collection
    switch (targetModule) {
      case 'ludotheque':
        // Jeu -> Categorie via jeu_categories
        query = `
          SELECT c.nom as categorie, COUNT(jc.jeu_id) as count
          FROM categories c
          LEFT JOIN jeu_categories jc ON c.id = jc.categorie_id
          WHERE c.actif = 1
          GROUP BY c.id, c.nom
          HAVING count > 0
          ORDER BY count DESC
        `;
        break;
      case 'bibliotheque':
        // Livre -> GenreLitteraire via livre_genres
        query = `
          SELECT g.nom as categorie, COUNT(lg.livre_id) as count
          FROM genres_litteraires g
          LEFT JOIN livre_genres lg ON g.id = lg.genre_id
          GROUP BY g.id, g.nom
          HAVING count > 0
          ORDER BY count DESC
        `;
        break;
      case 'filmotheque':
        // Film -> GenreFilm via film_genres
        query = `
          SELECT g.nom as categorie, COUNT(fg.film_id) as count
          FROM genres_films g
          LEFT JOIN film_genres fg ON g.id = fg.genre_id
          GROUP BY g.id, g.nom
          HAVING count > 0
          ORDER BY count DESC
        `;
        break;
      case 'discotheque':
        // Disque -> GenreMusical via disque_genres
        query = `
          SELECT g.nom as categorie, COUNT(dg.disque_id) as count
          FROM genres_musicaux g
          LEFT JOIN disque_genres dg ON g.id = dg.genre_id
          GROUP BY g.id, g.nom
          HAVING count > 0
          ORDER BY count DESC
        `;
        break;
      default:
        return res.status(400).json({
          error: 'Module invalide',
          message: `Module ${targetModule} non reconnu`
        });
    }

    const [results] = await sequelize.query(query);

    res.json({
      module: targetModule,
      field: fieldLabel,
      categories: results.map(r => ({
        categorie: r.categorie,
        count: parseInt(r.count)
      }))
    });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Get financial statistics (comptable+ only)
 * GET /api/stats/cotisations?year=2025
 */
const getCotisationsStats = async (req, res) => {
  try {
    const user = req.user;

    // Verifier acces comptable
    if (!hasRoleLevel(user.role, 'comptable')) {
      return res.status(403).json({
        error: 'Acces refuse',
        message: 'Acces reserve aux comptables et administrateurs'
      });
    }

    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const startDate = new Date(`${currentYear}-01-01`);
    const endDate = new Date(`${currentYear}-12-31`);

    // Stats cotisations
    const cotisationsStats = await Cotisation.findAll({
      attributes: [
        'statut',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('montant')), 'total']
      ],
      where: {
        date_paiement: { [Op.between]: [startDate, endDate] }
      },
      group: ['statut']
    });

    // Total CA
    const totalCA = cotisationsStats
      .filter(s => s.statut === 'en_cours' || s.statut === 'expiree')
      .reduce((sum, s) => sum + parseFloat(s.dataValues.total || 0), 0);

    // Cotisations par mois
    const cotisationsMensuelles = await Cotisation.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('date_paiement'), '%Y-%m'), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('montant')), 'total']
      ],
      where: {
        date_paiement: { [Op.between]: [startDate, endDate] }
      },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('date_paiement'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('date_paiement'), '%Y-%m'), 'ASC']]
    });

    res.json({
      year: parseInt(currentYear),
      summary: {
        totalCA: totalCA.toFixed(2),
        byStatus: cotisationsStats.map(s => ({
          statut: s.statut,
          count: parseInt(s.dataValues.count),
          total: parseFloat(s.dataValues.total || 0).toFixed(2)
        }))
      },
      monthly: cotisationsMensuelles.map(m => ({
        month: m.dataValues.month,
        count: parseInt(m.dataValues.count),
        total: parseFloat(m.dataValues.total || 0).toFixed(2)
      }))
    });
  } catch (error) {
    console.error('Get cotisations stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};

/**
 * Helper: Obtenir le libelle d'un module
 */
const getModuleLibelle = (moduleCode) => {
  const libelles = {
    'ludotheque': 'Ludotheque',
    'bibliotheque': 'Bibliotheque',
    'filmotheque': 'Filmotheque',
    'discotheque': 'Discotheque'
  };
  return libelles[moduleCode] || moduleCode;
};

/**
 * Get items that have never been borrowed (for weeding/desherbage)
 * GET /api/stats/never-borrowed?module=ludotheque&limit=10&thematique=5&emplacement=12
 */
const getNeverBorrowed = async (req, res) => {
  try {
    const { module: moduleCode = 'ludotheque', limit = 100, thematique, emplacement } = req.query;

    // Verifier l'acces au module
    if (!hasModuleAccess(req.user, moduleCode)) {
      return res.status(403).json({ error: 'Access denied to this module' });
    }

    const modelMapping = {
      'ludotheque': { model: Jeu, fk: 'jeu_id', type: 'jeu', emplacementField: 'emplacement_jeu_id' },
      'bibliotheque': { model: Livre, fk: 'livre_id', type: 'livre', emplacementField: 'emplacement_livre_id' },
      'filmotheque': { model: Film, fk: 'film_id', type: 'film', emplacementField: 'emplacement_film_id' },
      'discotheque': { model: Disque, fk: 'disque_id', type: 'disque', emplacementField: 'emplacement_disque_id' }
    };

    const config = modelMapping[moduleCode];
    if (!config) {
      return res.status(400).json({ error: 'Invalid module' });
    }

    // Construire les conditions sur id
    const idConditions = [
      { [Op.notIn]: sequelize.literal(`(SELECT DISTINCT ${config.fk} FROM emprunts WHERE ${config.fk} IS NOT NULL)`) }
    ];

    // Filtre par thematique (via sous-requete)
    if (thematique) {
      idConditions.push({
        [Op.in]: sequelize.literal(`(SELECT article_id FROM article_thematiques WHERE type_article = '${config.type}' AND thematique_id = ${parseInt(thematique)})`)
      });
    }

    // Construire la condition WHERE de base
    const where = {
      [Op.and]: idConditions.map(cond => ({ id: cond })),
      statut: 'disponible'
    };

    // Filtre par emplacement
    if (emplacement) {
      where[config.emplacementField] = parseInt(emplacement);
    }

    // Trouver les items qui n'ont jamais ete empruntes
    const items = await config.model.findAll({
      where,
      attributes: ['id', 'titre', 'date_acquisition'],
      order: [['date_acquisition', 'ASC']],
      limit: parseInt(limit)
    });

    // Compter le total
    const total = await config.model.count({ where });

    res.json({ items, total, module: moduleCode });
  } catch (error) {
    console.error('Get never borrowed error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get recent acquisitions with their borrow count (nouveautes stats)
 * GET /api/stats/nouveautes?module=ludotheque&limit=10&months=3
 */
const getNouveautesStats = async (req, res) => {
  try {
    const { module: moduleCode = 'ludotheque', limit = 10, months = 3 } = req.query;

    // Verifier l'acces au module
    if (!hasModuleAccess(req.user, moduleCode)) {
      return res.status(403).json({ error: 'Access denied to this module' });
    }

    const modelMapping = {
      'ludotheque': { model: Jeu, fk: 'jeu_id' },
      'bibliotheque': { model: Livre, fk: 'livre_id' },
      'filmotheque': { model: Film, fk: 'film_id' },
      'discotheque': { model: Disque, fk: 'disque_id' }
    };

    const config = modelMapping[moduleCode];
    if (!config) {
      return res.status(400).json({ error: 'Invalid module' });
    }

    // Date limite pour les nouveautes
    const dateLimit = new Date();
    dateLimit.setMonth(dateLimit.getMonth() - parseInt(months));

    // Trouver les items recents avec leur nombre d'emprunts
    const items = await config.model.findAll({
      where: {
        date_acquisition: { [Op.gte]: dateLimit }
      },
      attributes: [
        'id', 'titre', 'date_acquisition',
        [sequelize.literal(`(SELECT COUNT(*) FROM emprunts WHERE emprunts.${config.fk} = ${config.model.name}.id)`), 'emprunts_count']
      ],
      order: [[sequelize.literal('emprunts_count'), 'DESC']],
      limit: parseInt(limit)
    });

    res.json({ items, module: moduleCode, months: parseInt(months) });
  } catch (error) {
    console.error('Get nouveautes stats error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get publisher/editor statistics
 * GET /api/stats/editeurs?module=ludotheque&limit=10
 */
const getEditeursStats = async (req, res) => {
  try {
    const { module: moduleCode = 'ludotheque', limit = 10 } = req.query;

    // Verifier l'acces au module
    if (!hasModuleAccess(req.user, moduleCode)) {
      return res.status(403).json({ error: 'Access denied to this module' });
    }

    const modelMapping = {
      'ludotheque': Jeu,
      'bibliotheque': Livre,
      'filmotheque': Film,
      'discotheque': Disque
    };

    const Model = modelMapping[moduleCode];
    if (!Model) {
      return res.status(400).json({ error: 'Invalid module' });
    }

    // Compter par editeur
    const editeurs = await Model.findAll({
      attributes: [
        'editeur',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        editeur: { [Op.ne]: null, [Op.ne]: '' }
      },
      group: ['editeur'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    res.json({ editeurs, module: moduleCode });
  } catch (error) {
    console.error('Get editeurs stats error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getPopularItems,
  getPopularGames,
  getActiveMembers,
  getLoanDurationStats,
  getMonthlyStats,
  getCategoryStats,
  getCotisationsStats,
  getNeverBorrowed,
  getNouveautesStats,
  getEditeursStats
};
