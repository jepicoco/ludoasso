/**
 * Service Email - Gestion de l'envoi d'emails via SMTP
 * Utilise nodemailer pour l'envoi et crypto pour le chiffrement des mots de passe
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Algorithme de chiffrement AES-256-CBC
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY || '', 'hex');

if (ENCRYPTION_KEY.length !== 32) {
  console.warn('⚠️  EMAIL_ENCRYPTION_KEY must be 32 bytes (64 hex chars). Email service may not work properly.');
}

/**
 * Chiffre un mot de passe avec AES-256-CBC
 * @param {string} password - Mot de passe en clair
 * @returns {string} - Format: iv:encryptedData (hex)
 */
function encryptPassword(password) {
  if (!password) return '';

  try {
    // Générer un IV aléatoire (16 bytes)
    const iv = crypto.randomBytes(16);

    // Créer le cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);

    // Chiffrer
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Retourner IV + encrypted (séparés par :)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Erreur lors du chiffrement:', error);
    throw new Error('Erreur de chiffrement du mot de passe');
  }
}

/**
 * Déchiffre un mot de passe
 * @param {string} encrypted - Format: iv:encryptedData (hex)
 * @returns {string} - Mot de passe en clair
 */
function decryptPassword(encrypted) {
  if (!encrypted) return '';

  try {
    // Séparer IV et données chiffrées
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Format de mot de passe chiffré invalide');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    // Créer le decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);

    // Déchiffrer
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Erreur lors du déchiffrement:', error);
    throw new Error('Erreur de déchiffrement du mot de passe');
  }
}

/**
 * Crée un transport nodemailer à partir d'une configuration
 * @param {Object} configuration - Instance de ConfigurationEmail
 * @returns {Promise<nodemailer.Transporter>}
 */
async function createTransport(configuration) {
  try {
    // Déchiffrer le mot de passe
    const password = decryptPassword(configuration.smtp_password);

    // Options du transport
    const transportOptions = {
      host: configuration.smtp_host,
      port: configuration.smtp_port,
      secure: configuration.smtp_secure, // true pour SSL (port 465)
      auth: {
        user: configuration.smtp_user,
        pass: password
      },
      timeout: configuration.smtp_timeout || 10000,
      requireTLS: configuration.smtp_require_tls !== false
    };

    // Créer et retourner le transport
    return nodemailer.createTransport(transportOptions);
  } catch (error) {
    console.error('Erreur lors de la création du transport:', error);
    throw new Error('Impossible de créer le transport email');
  }
}

/**
 * Teste une configuration SMTP
 * @param {Object} configuration - Instance de ConfigurationEmail
 * @returns {Promise<Object>} - {success: boolean, message: string}
 */
async function testConfiguration(configuration) {
  try {
    const transport = await createTransport(configuration);

    // Vérifier la connexion
    await transport.verify();

    return {
      success: true,
      message: 'Connexion SMTP établie avec succès'
    };
  } catch (error) {
    console.error('Erreur lors du test de connexion:', error);
    return {
      success: false,
      message: error.message || 'Erreur de connexion au serveur SMTP'
    };
  }
}

/**
 * Envoie un email
 * @param {number} configurationId - ID de la configuration email
 * @param {Object} options - Options d'envoi
 * @param {string} options.to - Destinataire
 * @param {string} options.subject - Sujet
 * @param {string} [options.html] - Corps HTML
 * @param {string} [options.text] - Corps texte
 * @param {Array} [options.attachments] - Pièces jointes
 * @returns {Promise<Object>} - {success: boolean, messageId: string, error: string}
 */
async function sendEmail(configurationId, options) {
  try {
    // Charger la configuration
    const { ConfigurationEmail } = require('../models');
    const configuration = await ConfigurationEmail.findByPk(configurationId);

    if (!configuration) {
      throw new Error('Configuration email introuvable');
    }

    if (!configuration.actif) {
      throw new Error('Configuration email désactivée');
    }

    // Créer le transport
    const transport = await createTransport(configuration);

    // Préparer le message
    const mailOptions = {
      from: configuration.nom_expediteur
        ? `"${configuration.nom_expediteur}" <${configuration.email_expediteur}>`
        : configuration.email_expediteur,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments || []
    };

    // Envoyer l'email
    const info = await transport.sendMail(mailOptions);

    console.log('✅ Email envoyé:', info.messageId);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Envoie un email en utilisant un template
 * @param {number} configurationId - ID de la configuration email
 * @param {string} templateCode - Code du template
 * @param {string} destinataire - Email du destinataire
 * @param {Object} data - Données pour les variables du template
 * @returns {Promise<Object>} - {success: boolean, messageId: string, error: string}
 */
async function sendEmailFromTemplate(configurationId, templateCode, destinataire, data) {
  try {
    // Charger le template
    const { TemplateMessage } = require('../models');
    const template = await TemplateMessage.findOne({
      where: {
        code: templateCode.toUpperCase(),
        actif: true
      }
    });

    if (!template) {
      throw new Error('Template introuvable ou inactif');
    }

    if (template.type_message !== 'email' && template.type_message !== 'both') {
      throw new Error('Template non compatible avec l\'email');
    }

    // Compiler le template
    const compiled = template.compileEmail(data);

    // Envoyer l'email
    return await sendEmail(configurationId, {
      to: destinataire,
      subject: compiled.objet,
      html: compiled.corps
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi depuis template:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  encryptPassword,
  decryptPassword,
  createTransport,
  testConfiguration,
  sendEmail,
  sendEmailFromTemplate
};
