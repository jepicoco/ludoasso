const { DataTypes } = require('sequelize');
const crypto = require('crypto');

// Cle de chiffrement pour les cles API
const ENCRYPTION_KEY = Buffer.from(
  (process.env.EMAIL_ENCRYPTION_KEY || '').padEnd(32, '0').slice(0, 32)
);

/**
 * Chiffre une valeur sensible (cle API)
 */
function encryptValue(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Dechiffre une valeur sensible
 */
function decryptValue(encryptedValue) {
  if (!encryptedValue || !encryptedValue.includes(':')) return null;
  try {
    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Erreur dechiffrement pairing token:', error.message);
    return null;
  }
}

/**
 * Genere un code d'appairage unique (6 chiffres)
 */
function generatePairingCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = (sequelize) => {
  const TabletPairingToken = sequelize.define('TabletPairingToken', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pairing_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      comment: 'Code court d\'appairage (6 chiffres)'
    },
    api_key_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Cle API en clair chiffree AES-256'
    },
    questionnaire_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    site_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    api_key_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference a la cle API creee'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Date d\'expiration (15 minutes apres creation)'
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date d\'utilisation (null si non utilise)'
    }
  }, {
    tableName: 'tablet_pairing_tokens',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['pairing_code'], unique: true },
      { fields: ['expires_at'] }
    ]
  });

  // ==================== METHODES STATIQUES ====================

  /**
   * Cree un nouveau token d'appairage
   * @param {string} apiKeyClear - La cle API en clair
   * @param {number} apiKeyId - L'ID de la cle API
   * @param {number} questionnaireId - L'ID du questionnaire
   * @param {number} siteId - L'ID du site (optionnel)
   * @param {number} expirationMinutes - Duree de validite en minutes (defaut: 15)
   */
  TabletPairingToken.createToken = async function(apiKeyClear, apiKeyId, questionnaireId, siteId = null, expirationMinutes = 15) {
    // Generer un code unique
    let pairingCode;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      pairingCode = generatePairingCode();
      const existing = await TabletPairingToken.findOne({ where: { pairing_code: pairingCode } });
      if (!existing) break;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Impossible de generer un code d\'appairage unique');
    }

    // Calculer l'expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

    // Chiffrer la cle API
    const encryptedKey = encryptValue(apiKeyClear);

    // Creer le token
    const token = await TabletPairingToken.create({
      pairing_code: pairingCode,
      api_key_encrypted: encryptedKey,
      questionnaire_id: questionnaireId,
      site_id: siteId,
      api_key_id: apiKeyId,
      expires_at: expiresAt
    });

    return token;
  };

  /**
   * Valide et consomme un token d'appairage
   * @param {string} pairingCode - Le code a 6 chiffres
   * @returns {Object} { valid, apiKey, questionnaireId, error }
   */
  TabletPairingToken.consumeToken = async function(pairingCode) {
    if (!pairingCode || pairingCode.length !== 6) {
      return { valid: false, error: 'Code d\'appairage invalide' };
    }

    const token = await TabletPairingToken.findOne({
      where: { pairing_code: pairingCode }
    });

    if (!token) {
      return { valid: false, error: 'Code d\'appairage inconnu' };
    }

    // Verifier si deja utilise
    if (token.used_at) {
      return { valid: false, error: 'Code d\'appairage deja utilise' };
    }

    // Verifier l'expiration
    if (new Date() > token.expires_at) {
      return { valid: false, error: 'Code d\'appairage expire' };
    }

    // Dechiffrer la cle API
    const apiKey = decryptValue(token.api_key_encrypted);
    if (!apiKey) {
      return { valid: false, error: 'Erreur de dechiffrement' };
    }

    // Marquer comme utilise
    token.used_at = new Date();
    await token.save();

    return {
      valid: true,
      apiKey,
      questionnaireId: token.questionnaire_id,
      siteId: token.site_id,
      apiKeyId: token.api_key_id
    };
  };

  /**
   * Nettoie les tokens expires ou utilises
   * @param {number} olderThanHours - Supprimer les tokens utilises depuis plus de X heures
   */
  TabletPairingToken.cleanup = async function(olderThanHours = 24) {
    const { Op } = require('sequelize');
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - olderThanHours);

    const deleted = await TabletPairingToken.destroy({
      where: {
        [Op.or]: [
          // Tokens expires
          { expires_at: { [Op.lt]: new Date() } },
          // Tokens utilises depuis plus de X heures
          { used_at: { [Op.lt]: cutoff } }
        ]
      }
    });

    return deleted;
  };

  // ==================== METHODES D'INSTANCE ====================

  /**
   * Retourne la cle API dechiffree
   */
  TabletPairingToken.prototype.getDecryptedApiKey = function() {
    return decryptValue(this.api_key_encrypted);
  };

  /**
   * Verifie si le token est valide (non expire, non utilise)
   */
  TabletPairingToken.prototype.isValid = function() {
    return !this.used_at && new Date() < this.expires_at;
  };

  /**
   * Retourne le temps restant avant expiration en secondes
   */
  TabletPairingToken.prototype.getRemainingSeconds = function() {
    const remaining = this.expires_at - new Date();
    return Math.max(0, Math.floor(remaining / 1000));
  };

  // Exporter les utilitaires
  TabletPairingToken.generatePairingCode = generatePairingCode;
  TabletPairingToken.encryptValue = encryptValue;
  TabletPairingToken.decryptValue = decryptValue;

  return TabletPairingToken;
};
