const { IpAutorisee, ParametresFront } = require('../models');
const path = require('path');

/**
 * Obtenir la vraie IP du client (gestion des proxies)
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection.remoteAddress;
};

/**
 * Parser simple de cookies
 */
const parseCookies = (req) => {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookies[name] = value;
    });
  }
  return cookies;
};

/**
 * Nom du cookie de bypass maintenance
 */
const BYPASS_COOKIE_NAME = 'maintenance_bypass';

/**
 * Durée max du cookie : 3 jours en millisecondes
 */
const COOKIE_MAX_AGE = 3 * 24 * 60 * 60 * 1000;

/**
 * Middleware pour vérifier le mode maintenance
 *
 * Ce middleware vérifie :
 * 1. Si le mode maintenance est activé
 * 2. Si un cookie de bypass valide existe (clé correspondante)
 * 3. Si l'IP du visiteur est autorisée (locales ou liste blanche)
 *
 * Logique de validation du cookie :
 * - Si la clé du cookie correspond à la clé en base → bypass valide
 * - Si la clé ne correspond pas → vérifier si l'IP est toujours autorisée
 *   - Si oui → mettre à jour le cookie avec la nouvelle clé
 *   - Si non → bypass invalide, afficher page maintenance
 *
 * Usage: Appliquer sur les routes du site public (pas l'admin, pas l'API)
 */
const checkMaintenance = async (req, res, next) => {
  try {
    // Récupérer les paramètres front
    const parametres = await ParametresFront.getParametres();

    // Si le mode maintenance n'est pas activé, continuer
    if (!parametres.mode_maintenance) {
      return next();
    }

    const maintenanceKey = parametres.maintenance_key;
    const cookies = parseCookies(req);
    const cookieKey = cookies[BYPASS_COOKIE_NAME];

    // Vérifier le cookie de bypass
    if (cookieKey) {
      // La clé du cookie correspond à la clé actuelle → bypass valide
      if (cookieKey === maintenanceKey) {
        return next();
      }

      // La clé ne correspond pas (maintenance réactivée avec nouvelle clé)
      // Vérifier si l'IP est toujours autorisée pour mettre à jour le cookie
      const clientIp = getClientIp(req);
      const estAutorisee = await IpAutorisee.estAutorisee(clientIp, parametres.autoriser_ip_locales);

      if (estAutorisee && maintenanceKey) {
        // IP toujours autorisée, mettre à jour le cookie avec la nouvelle clé
        res.cookie(BYPASS_COOKIE_NAME, maintenanceKey, {
          maxAge: COOKIE_MAX_AGE,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        return next();
      }

      // IP non autorisée ou pas de clé, le bypass n'est plus valide
      // Supprimer le cookie obsolète
      res.clearCookie(BYPASS_COOKIE_NAME);
    } else {
      // Pas de cookie, vérifier si l'IP est autorisée
      const clientIp = getClientIp(req);
      const estAutorisee = await IpAutorisee.estAutorisee(clientIp, parametres.autoriser_ip_locales);

      if (estAutorisee && maintenanceKey) {
        // Créer un cookie de bypass avec la clé actuelle
        res.cookie(BYPASS_COOKIE_NAME, maintenanceKey, {
          maxAge: COOKIE_MAX_AGE,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        return next();
      }
    }

    // L'IP n'est pas autorisée, renvoyer la page de maintenance
    res.status(503).sendFile(path.join(__dirname, '../../frontend/maintenance.html'));

  } catch (error) {
    console.error('Erreur middleware maintenance:', error);
    // En cas d'erreur, laisser passer (fail-open pour ne pas bloquer le site)
    next();
  }
};

/**
 * Définir le cookie de bypass avec la clé de maintenance actuelle
 * Utilisé après un unlock triforce réussi
 * @param {Object} res - Response Express
 * @param {string} maintenanceKey - La clé de maintenance actuelle
 */
const setBypassCookie = (res, maintenanceKey) => {
  if (maintenanceKey) {
    res.cookie(BYPASS_COOKIE_NAME, maintenanceKey, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }
};

module.exports = {
  checkMaintenance,
  setBypassCookie,
  BYPASS_COOKIE_NAME,
  getClientIp
};
