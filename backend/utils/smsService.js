/**
 * Service SMS - Gestion de l'envoi de SMS via SMSFactor
 * Utilise axios pour les appels API et crypto pour le chiffrement des tokens
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration SMSFactor
const SMSFACTOR_API_BASE = 'https://api.smsfactor.com';

// Algorithme de chiffrement AES-256-CBC
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY || '', 'hex');

if (ENCRYPTION_KEY.length !== 32) {
  console.warn('⚠️  EMAIL_ENCRYPTION_KEY must be 32 bytes (64 hex chars). SMS service may not work properly.');
}

/**
 * Chiffre un token API avec AES-256-CBC
 * @param {string} token - Token en clair
 * @returns {string} - Format: iv:encryptedData (hex)
 */
function encryptToken(token) {
  if (!token) return '';

  try {
    // Générer un IV aléatoire (16 bytes)
    const iv = crypto.randomBytes(16);

    // Créer le cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);

    // Chiffrer
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Retourner IV + encrypted (séparés par :)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Erreur lors du chiffrement:', error);
    throw new Error('Erreur de chiffrement du token');
  }
}

/**
 * Déchiffre un token API
 * @param {string} encrypted - Format: iv:encryptedData (hex)
 * @returns {string} - Token en clair
 */
function decryptToken(encrypted) {
  if (!encrypted) return '';

  try {
    // Séparer IV et données chiffrées
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Format de token chiffré invalide');
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
    throw new Error('Erreur de déchiffrement du token');
  }
}

/**
 * Crée un client axios pour l'API SMSFactor
 * @param {Object} configuration - Instance de ConfigurationSMS
 * @returns {axios.AxiosInstance}
 */
function createClient(configuration) {
  try {
    // Déchiffrer le token
    const token = decryptToken(configuration.api_token);

    // Créer et retourner le client axios
    return axios.create({
      baseURL: SMSFACTOR_API_BASE,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 secondes
    });
  } catch (error) {
    console.error('Erreur lors de la création du client SMS:', error);
    throw new Error('Impossible de créer le client SMS');
  }
}

/**
 * Teste une configuration SMSFactor
 * @param {Object} configuration - Instance de ConfigurationSMS
 * @returns {Promise<Object>} - {success: boolean, message: string, credits: number}
 */
async function testConfiguration(configuration) {
  try {
    const client = createClient(configuration);

    // Appeler l'endpoint account pour vérifier le token
    const response = await client.get('/account');

    const credits = response.data?.credits || 0;

    return {
      success: true,
      message: 'Connexion à l\'API SMSFactor établie avec succès',
      credits: credits
    };
  } catch (error) {
    console.error('Erreur lors du test de connexion SMS:', error);

    let message = 'Erreur de connexion à l\'API SMSFactor';
    if (error.response) {
      // Erreur HTTP de l'API
      message = error.response.data?.message || `Erreur ${error.response.status}`;
    } else if (error.request) {
      // Pas de réponse
      message = 'Pas de réponse de l\'API SMSFactor';
    }

    return {
      success: false,
      message: message
    };
  }
}

/**
 * Récupère les crédits restants
 * @param {Object} configuration - Instance de ConfigurationSMS
 * @returns {Promise<number>} - Nombre de crédits
 */
async function getCredits(configuration) {
  try {
    const client = createClient(configuration);
    const response = await client.get('/account');
    return response.data?.credits || 0;
  } catch (error) {
    console.error('Erreur lors de la récupération des crédits:', error);
    throw new Error('Impossible de récupérer les crédits');
  }
}

/**
 * Envoie un SMS
 * @param {number} configurationId - ID de la configuration SMS
 * @param {Object} options - Options d'envoi
 * @param {string} options.to - Numéro du destinataire (format international +33...)
 * @param {string} options.text - Texte du SMS
 * @returns {Promise<Object>} - {success: boolean, ticket: string, error: string}
 */
async function sendSMS(configurationId, options) {
  try {
    // Charger la configuration
    const { ConfigurationSMS } = require('../models');
    const configuration = await ConfigurationSMS.findByPk(configurationId);

    if (!configuration) {
      throw new Error('Configuration SMS introuvable');
    }

    if (!configuration.actif) {
      throw new Error('Configuration SMS désactivée');
    }

    // Valider le numéro (format international)
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(options.to)) {
      throw new Error('Numéro de téléphone invalide (format requis: +33...)');
    }

    // Créer le client
    const client = createClient(configuration);

    // Préparer les données
    const smsData = {
      to: options.to,
      text: options.text
    };

    // Ajouter le nom d'expéditeur si défini
    if (configuration.sender_name) {
      smsData.sender = configuration.sender_name;
    }

    // Ajouter les options
    if (configuration.gsm7) {
      smsData.gsm7 = true;
    }

    if (configuration.sandbox) {
      smsData.sandbox = 1;
    }

    // Envoyer le SMS
    const response = await client.post('/send', smsData);

    console.log('✅ SMS envoyé:', response.data?.ticket);

    // Incrémenter le compteur
    await configuration.incrementerCompteur();

    return {
      success: true,
      ticket: response.data?.ticket || null
    };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du SMS:', error);

    let errorMessage = error.message;
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Envoie un SMS en utilisant un template
 * @param {number} configurationId - ID de la configuration SMS
 * @param {string} templateCode - Code du template
 * @param {string} numeroDestinataire - Numéro du destinataire
 * @param {Object} data - Données pour les variables du template
 * @returns {Promise<Object>} - {success: boolean, ticket: string, error: string}
 */
async function sendSMSFromTemplate(configurationId, templateCode, numeroDestinataire, data) {
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

    if (template.type_message !== 'sms' && template.type_message !== 'both') {
      throw new Error('Template non compatible avec le SMS');
    }

    // Compiler le template
    const text = template.compileSMS(data);

    // Envoyer le SMS
    return await sendSMS(configurationId, {
      to: numeroDestinataire,
      text: text
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi SMS depuis template:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  encryptToken,
  decryptToken,
  createClient,
  testConfiguration,
  getCredits,
  sendSMS,
  sendSMSFromTemplate
};
