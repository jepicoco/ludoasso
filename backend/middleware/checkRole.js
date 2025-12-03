/**
 * Middleware pour contrôler l'accès basé sur les rôles utilisateurs
 */

// Hiérarchie des rôles
const ROLE_HIERARCHY = {
  'usager': 0,
  'benevole': 1,
  'gestionnaire': 2,
  'comptable': 3,
  'administrateur': 4
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
 * Vérifie que l'utilisateur est au moins bénévole
 * @returns {Function} Middleware Express
 */
const isBenevole = () => {
  return checkMinRole('benevole');
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

module.exports = {
  checkRole,
  checkMinRole,
  isAdmin,
  isGestionnaire,
  isBenevole,
  getRoleLevel,
  hasRoleLevel,
  ROLE_HIERARCHY
};
