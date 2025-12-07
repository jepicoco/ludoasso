const logger = require('./logger');

/**
 * Audit Logger - Fonctions de logging pour les actions importantes du système
 */

/**
 * Log une connexion utilisateur
 * @param {Object} data - { userId, email, ip, userAgent, success }
 */
const login = (data) => {
  const { userId, email, ip, userAgent, success } = data;

  logger.info(`[AUTH_LOGIN] User login ${success ? 'successful' : 'failed'}`, {
    tag: 'AUTH_LOGIN',
    userId,
    email,
    ip,
    userAgent,
    success,
    action: 'login'
  });
};

/**
 * Log une déconnexion utilisateur
 * @param {Object} data - { userId, email, ip }
 */
const logout = (data) => {
  const { userId, email, ip } = data;

  logger.info('[AUTH_LOGOUT] User logout', {
    tag: 'AUTH_LOGOUT',
    userId,
    email,
    ip,
    action: 'logout'
  });
};

/**
 * Log une réinitialisation de mot de passe
 * @param {Object} data - { userId, email, ip, method }
 */
const passwordReset = (data) => {
  const { userId, email, ip, method } = data;

  logger.info('[AUTH_PASSWORD_RESET] Password reset', {
    tag: 'AUTH_PASSWORD_RESET',
    userId,
    email,
    ip,
    method: method || 'email',
    action: 'password_reset'
  });
};

/**
 * Log la création d'une cotisation
 * @param {Object} data - { cotisationId, adherentId, montant, userId, modePaiement }
 */
const cotisationCreated = (data) => {
  const { cotisationId, adherentId, montant, userId, modePaiement } = data;

  logger.info('[COTISATION_CREATED] New cotisation created', {
    tag: 'COTISATION_CREATED',
    cotisationId,
    adherentId,
    montant,
    userId,
    modePaiement,
    action: 'cotisation_created'
  });
};

/**
 * Log l'annulation d'une cotisation
 * @param {Object} data - { cotisationId, adherentId, montant, userId, raison }
 */
const cotisationAnnulee = (data) => {
  const { cotisationId, adherentId, montant, userId, raison } = data;

  logger.warn('[COTISATION_ANNULEE] Cotisation cancelled', {
    tag: 'COTISATION_ANNULEE',
    cotisationId,
    adherentId,
    montant,
    userId,
    raison,
    action: 'cotisation_cancelled'
  });
};

/**
 * Log l'archivage d'un adhérent
 * @param {Object} data - { adherentId, nom, prenom, userId, raison }
 */
const adherentArchived = (data) => {
  const { adherentId, nom, prenom, userId, raison } = data;

  logger.info('[ADHERENT_ARCHIVED] Member archived', {
    tag: 'ADHERENT_ARCHIVED',
    adherentId,
    nom,
    prenom,
    userId,
    raison,
    action: 'adherent_archived'
  });
};

/**
 * Log un changement de configuration
 * @param {Object} data - { configKey, oldValue, newValue, userId, module }
 */
const configChanged = (data) => {
  const { configKey, oldValue, newValue, userId, module } = data;

  logger.info('[CONFIG_CHANGED] Configuration updated', {
    tag: 'CONFIG_CHANGED',
    configKey,
    oldValue,
    newValue,
    userId,
    module: module || 'system',
    action: 'config_changed'
  });
};

/**
 * Log la création d'un emprunt
 * @param {Object} data - { empruntId, adherentId, itemType, itemId, userId }
 */
const empruntCreated = (data) => {
  const { empruntId, adherentId, itemType, itemId, userId } = data;

  logger.info('[EMPRUNT_CREATED] New loan created', {
    tag: 'EMPRUNT_CREATED',
    empruntId,
    adherentId,
    itemType,
    itemId,
    userId,
    action: 'emprunt_created'
  });
};

/**
 * Log le retour d'un emprunt
 * @param {Object} data - { empruntId, adherentId, itemType, itemId, userId, enRetard }
 */
const empruntReturned = (data) => {
  const { empruntId, adherentId, itemType, itemId, userId, enRetard } = data;

  logger.info('[EMPRUNT_RETURNED] Loan returned', {
    tag: 'EMPRUNT_RETURNED',
    empruntId,
    adherentId,
    itemType,
    itemId,
    userId,
    enRetard,
    action: 'emprunt_returned'
  });
};

/**
 * Log une prolongation d'emprunt
 * @param {Object} data - { empruntId, adherentId, itemType, userId, nouvelleDateRetour }
 */
const empruntProlonged = (data) => {
  const { empruntId, adherentId, itemType, userId, nouvelleDateRetour } = data;

  logger.info('[EMPRUNT_PROLONGED] Loan extended', {
    tag: 'EMPRUNT_PROLONGED',
    empruntId,
    adherentId,
    itemType,
    userId,
    nouvelleDateRetour,
    action: 'emprunt_prolonged'
  });
};

/**
 * Log un accès non autorisé
 * @param {Object} data - { userId, resource, ip, action }
 */
const unauthorizedAccess = (data) => {
  const { userId, resource, ip, action } = data;

  logger.warn('[UNAUTHORIZED_ACCESS] Unauthorized access attempt', {
    tag: 'UNAUTHORIZED_ACCESS',
    userId,
    resource,
    ip,
    action: action || 'access_denied'
  });
};

module.exports = {
  login,
  logout,
  passwordReset,
  cotisationCreated,
  cotisationAnnulee,
  adherentArchived,
  configChanged,
  empruntCreated,
  empruntReturned,
  empruntProlonged,
  unauthorizedAccess
};
