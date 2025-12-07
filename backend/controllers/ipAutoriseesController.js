const { IpAutorisee, ParametresFront } = require('../models');
const crypto = require('crypto');

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
 * Récupérer toutes les IPs autorisées
 */
exports.getAll = async (req, res) => {
  try {
    const ips = await IpAutorisee.findAll({
      order: [['date_creation', 'DESC']]
    });

    // Récupérer aussi le paramètre autoriser_ip_locales
    const parametres = await ParametresFront.getParametres();

    res.json({
      ips,
      autoriser_ip_locales: parametres.autoriser_ip_locales,
      ip_actuelle: getClientIp(req)
    });
  } catch (error) {
    console.error('Erreur getAll IPs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Ajouter une IP autorisée (admin)
 */
exports.create = async (req, res) => {
  try {
    const { adresse_ip, commentaire } = req.body;

    if (!adresse_ip) {
      return res.status(400).json({ message: 'Adresse IP requise' });
    }

    const ip = await IpAutorisee.ajouterIp(adresse_ip, 'admin', commentaire);
    res.status(201).json(ip);
  } catch (error) {
    console.error('Erreur create IP:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Cette IP est déjà enregistrée' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Ajouter l'IP actuelle de l'admin
 */
exports.addCurrentIp = async (req, res) => {
  try {
    const adresse_ip = getClientIp(req);
    const commentaire = req.body.commentaire || 'Ajoutée depuis l\'admin';

    const ip = await IpAutorisee.ajouterIp(adresse_ip, 'admin', commentaire);
    res.status(201).json(ip);
  } catch (error) {
    console.error('Erreur addCurrentIp:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Modifier une IP autorisée
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire, actif } = req.body;

    const ip = await IpAutorisee.findByPk(id);
    if (!ip) {
      return res.status(404).json({ message: 'IP non trouvée' });
    }

    if (commentaire !== undefined) ip.commentaire = commentaire;
    if (actif !== undefined) ip.actif = actif;

    await ip.save();
    res.json(ip);
  } catch (error) {
    console.error('Erreur update IP:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Supprimer une IP autorisée
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const ip = await IpAutorisee.findByPk(id);
    if (!ip) {
      return res.status(404).json({ message: 'IP non trouvée' });
    }

    await ip.destroy();
    res.json({ message: 'IP supprimée' });
  } catch (error) {
    console.error('Erreur delete IP:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Activer/Désactiver une IP
 */
exports.toggle = async (req, res) => {
  try {
    const { id } = req.params;

    const ip = await IpAutorisee.findByPk(id);
    if (!ip) {
      return res.status(404).json({ message: 'IP non trouvée' });
    }

    ip.actif = !ip.actif;
    await ip.save();
    res.json(ip);
  } catch (error) {
    console.error('Erreur toggle IP:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Mettre à jour le paramètre autoriser_ip_locales
 */
exports.updateAutoriserLocales = async (req, res) => {
  try {
    const { autoriser_ip_locales } = req.body;

    const parametres = await ParametresFront.getParametres();
    parametres.autoriser_ip_locales = !!autoriser_ip_locales;
    await parametres.save();

    res.json({ autoriser_ip_locales: parametres.autoriser_ip_locales });
  } catch (error) {
    console.error('Erreur updateAutoriserLocales:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================
// Endpoint Triforce (public, protégé par secret)
// ============================================

// Secret pour l'endpoint triforce (hash SHA256 de "triforce" + timestamp arrondi à 5 min)
const TRIFORCE_SECRET = 'triforce';

/**
 * Générer le hash attendu pour la validation
 */
const generateExpectedHash = () => {
  // Timestamp arrondi à 5 minutes (pour tolérance)
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000));
  const data = `${TRIFORCE_SECRET}:${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Générer aussi le hash de la période précédente (tolérance)
 */
const generatePreviousHash = () => {
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000)) - 1;
  const data = `${TRIFORCE_SECRET}:${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Endpoint triforce - ajoute l'IP du visiteur
 * POST /api/maintenance/unlock
 * Body: { hash: "sha256 de triforce:timestamp" }
 */
exports.triforceUnlock = async (req, res) => {
  try {
    const { hash } = req.body;

    if (!hash) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    // Vérifier le hash (avec tolérance période précédente)
    const expectedHash = generateExpectedHash();
    const previousHash = generatePreviousHash();

    if (hash !== expectedHash && hash !== previousHash) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Récupérer l'IP du client
    const adresse_ip = getClientIp(req);

    // Ajouter l'IP
    await IpAutorisee.ajouterIp(adresse_ip, 'triforce', 'Ajoutée via Easter Egg Triforce');

    // Récupérer la clé de maintenance pour le cookie de bypass
    const parametres = await ParametresFront.getParametres();
    const maintenanceKey = parametres.maintenance_key;

    // Définir le cookie de bypass avec la clé de maintenance
    const { setBypassCookie } = require('../middleware/maintenance');
    setBypassCookie(res, maintenanceKey);

    res.json({
      success: true,
      message: 'The Triforce has chosen you'
    });
  } catch (error) {
    console.error('Erreur triforceUnlock:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Obtenir le timestamp actuel pour le client (pour générer le hash)
 * GET /api/maintenance/timestamp
 */
exports.getTimestamp = async (req, res) => {
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000));
  res.json({ t: timestamp });
};
