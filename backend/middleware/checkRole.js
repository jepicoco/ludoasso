/**
 * Middleware pour contrôler l'accès basé sur les rôles utilisateurs et les modules
 */

// Hiérarchie des rôles (mise à jour avec le rôle agent)
const ROLE_HIERARCHY = {
  'usager': 0,
  'benevole': 1,
  'agent': 2,
  'gestionnaire': 3,
  'comptable': 4,
  'administrateur': 5
};

// Modules disponibles
const MODULES = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

// Mapping des modules vers leurs tables/préfixes
const MODULE_MAPPING = {
  'ludotheque': { table: 'jeux', field: 'jeu_id', route: 'jeux' },
  'bibliotheque': { table: 'livres', field: 'livre_id', route: 'livres' },
  'filmotheque': { table: 'films', field: 'film_id', route: 'films' },
  'discotheque': { table: 'disques', field: 'disque_id', route: 'disques' }
};

/**
 * Vérifie que l'utilisateur a l'un des rôles autorisés
 * @param {Array<string>} allowedRoles - Liste des rôles autorisés
 * @returns {Function} Middleware Express
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
    }

    if (!req.user.role) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Rôle utilisateur non défini'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Permissions insuffisantes pour accéder à cette ressource',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Vérifie que l'utilisateur a au minimum le niveau de rôle requis
 * @param {string} minRole - Rôle minimum requis
 * @returns {Function} Middleware Express
 */
const checkMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
    }

    if (!req.user.role) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Rôle utilisateur non défini'
      });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: `Niveau minimum requis: ${minRole}`,
        required_level: requiredLevel,
        current_level: userLevel
      });
    }

    next();
  };
};

/**
 * Vérifie que l'utilisateur a accès à un module spécifique
 * Admin a toujours accès
 * NULL ou tableau vide = accès à tous les modules (permissif)
 * @param {string} module - Code du module requis
 * @returns {Function} Middleware Express
 */
const checkModuleAccess = (module) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
    }

    // Admin a toujours accès
    if (req.user.role === 'administrateur') {
      return next();
    }

    const modulesAutorises = req.user.modules_autorises;

    // NULL ou tableau vide = accès à tous les modules
    if (!modulesAutorises || modulesAutorises.length === 0) {
      return next();
    }

    // Vérifier si le module est dans la liste autorisée
    if (!modulesAutorises.includes(module)) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: `Vous n'avez pas accès au module ${module}`,
        required_module: module,
        allowed_modules: modulesAutorises
      });
    }

    next();
  };
};

/**
 * Vérifie que l'utilisateur a accès à au moins un des modules spécifiés
 * @param {Array<string>} modules - Liste des modules acceptés
 * @returns {Function} Middleware Express
 */
const checkAnyModuleAccess = (modules) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
    }

    // Admin a toujours accès
    if (req.user.role === 'administrateur') {
      return next();
    }

    const modulesAutorises = req.user.modules_autorises;

    // NULL ou tableau vide = accès à tous les modules
    if (!modulesAutorises || modulesAutorises.length === 0) {
      return next();
    }

    // Vérifier si au moins un module est autorisé
    const hasAccess = modules.some(mod => modulesAutorises.includes(mod));
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez accès à aucun des modules requis',
        required_modules: modules,
        allowed_modules: modulesAutorises
      });
    }

    next();
  };
};

/**
 * Obtenir les modules accessibles pour un utilisateur
 * @param {Object} user - Objet utilisateur
 * @returns {Array<string>|null} - Liste des modules ou null pour tous
 */
const getUserAllowedModules = (user) => {
  if (!user) return [];

  // Admin a accès à tout
  if (user.role === 'administrateur') return null;

  // NULL ou vide = accès à tout
  if (!user.modules_autorises || user.modules_autorises.length === 0) return null;

  return user.modules_autorises;
};

/**
 * Vérifie si un utilisateur a accès à un module
 * @param {Object} user - Objet utilisateur
 * @param {string} module - Code du module
 * @returns {boolean}
 */
const hasModuleAccess = (user, module) => {
  if (!user) return false;

  // Admin a accès à tout
  if (user.role === 'administrateur') return true;

  // NULL ou vide = accès à tout
  if (!user.modules_autorises || user.modules_autorises.length === 0) return true;

  return user.modules_autorises.includes(module);
};

/**
 * Vérifie que l'utilisateur est administrateur
 * @returns {Function} Middleware Express
 */
const isAdmin = () => {
  return checkRole(['administrateur']);
};

/**
 * Vérifie que l'utilisateur est au moins gestionnaire
 * @returns {Function} Middleware Express
 */
const isGestionnaire = () => {
  return checkMinRole('gestionnaire');
};

/**
 * Vérifie que l'utilisateur est au moins agent
 * @returns {Function} Middleware Express
 */
const isAgent = () => {
  return checkMinRole('agent');
};

/**
 * Vérifie que l'utilisateur est au moins bénévole
 * @returns {Function} Middleware Express
 */
const isBenevole = () => {
  return checkMinRole('benevole');
};

/**
 * Vérifie que l'utilisateur est au moins comptable
 * @returns {Function} Middleware Express
 */
const isComptable = () => {
  return checkMinRole('comptable');
};

/**
 * Obtenir le niveau hiérarchique d'un rôle
 * @param {string} role - Nom du rôle
 * @returns {number} Niveau du rôle
 */
const getRoleLevel = (role) => {
  return ROLE_HIERARCHY[role] || 0;
};

/**
 * Vérifier si un rôle a un niveau supérieur ou égal à un autre
 * @param {string} userRole - Rôle de l'utilisateur
 * @param {string} requiredRole - Rôle requis
 * @returns {boolean} True si l'utilisateur a le niveau requis
 */
const hasRoleLevel = (userRole, requiredRole) => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Obtenir le mapping d'un module vers sa table
 * @param {string} module - Code du module
 * @returns {Object|null} Mapping ou null si non trouvé
 */
const getModuleMapping = (module) => {
  return MODULE_MAPPING[module] || null;
};

/**
 * Obtenir le module correspondant à une route
 * @param {string} route - Nom de la route (ex: 'jeux', 'livres')
 * @returns {string|null} Code du module ou null
 */
const getModuleFromRoute = (route) => {
  for (const [module, mapping] of Object.entries(MODULE_MAPPING)) {
    if (mapping.route === route) return module;
  }
  return null;
};

module.exports = {
  checkRole,
  checkMinRole,
  checkModuleAccess,
  checkAnyModuleAccess,
  getUserAllowedModules,
  hasModuleAccess,
  isAdmin,
  isGestionnaire,
  isAgent,
  isBenevole,
  isComptable,
  getRoleLevel,
  hasRoleLevel,
  getModuleMapping,
  getModuleFromRoute,
  ROLE_HIERARCHY,
  MODULES,
  MODULE_MAPPING
};
