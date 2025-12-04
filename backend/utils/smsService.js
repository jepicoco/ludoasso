/**
 * Service SMS - Gestion de l'envoi de SMS via différents fournisseurs
 * Supporte: SMSFactor, Brevo, Twilio, OVH, et autres (API personnalisée)
 */

const axios = require('axios');
const crypto = require('crypto');

// URLs par défaut des fournisseurs
const DEFAULT_API_URLS = {
  smsfactor: 'https://api.smsfactor.com',
  brevo: 'https://api.brevo.com/v3',
  twilio: 'https://api.twilio.com/2010-04-01',
  ovh: 'https://eu.api.ovh.com/1.0'
};

// Algorithme de chiffrement AES-256-CBC
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY || '', 'hex');

if (ENCRYPTION_KEY.length !== 32) {
  console.warn('EMAIL_ENCRYPTION_KEY must be 32 bytes (64 hex chars). SMS service may not work properly.');
}

/**
 * Chiffre un token API avec AES-256-CBC
 * @param {string} token - Token en clair
 * @returns {string} - Format: iv:encryptedData (hex)
 */
function encryptToken(token) {
  if (!token) return '';

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
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
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Format de token chiffré invalide');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Erreur lors du déchiffrement:', error);
    throw new Error('Erreur de déchiffrement du token');
  }
}

/**
 * Obtient l'URL de base de l'API pour une configuration
 * @param {Object} configuration - Instance de ConfigurationSMS
 * @returns {string} - URL de base
 */
function getApiUrl(configuration) {
  // Utiliser l'URL personnalisée si définie, sinon l'URL par défaut du provider
  if (configuration.api_url) {
    return configuration.api_url;
  }
  return DEFAULT_API_URLS[configuration.provider] || DEFAULT_API_URLS.smsfactor;
}

/**
 * Crée un client axios pour l'API SMS
 * @param {Object} configuration - Instance de ConfigurationSMS
 * @returns {axios.AxiosInstance}
 */
function createClient(configuration) {
  try {
    const token = decryptToken(configuration.api_token);
    const baseURL = getApiUrl(configuration);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Configuration des headers selon le provider
    switch (configuration.provider) {
      case 'smsfactor':
        headers['Authorization'] = `Bearer ${token}`;
        break;
      case 'brevo':
        headers['api-key'] = token;
        break;
      case 'twilio':
        // Twilio utilise Basic Auth (AccountSID:AuthToken)
        headers['Authorization'] = `Basic ${Buffer.from(token).toString('base64')}`;
        break;
      case 'ovh':
        headers['X-Ovh-Application'] = token;
        break;
      default:
        // Pour les autres providers, utiliser Bearer par défaut
        headers['Authorization'] = `Bearer ${token}`;
    }

    return axios.create({
      baseURL,
      headers,
      timeout: 30000
    });
  } catch (error) {
    console.error('Erreur lors de la création du client SMS:', error);
    throw new Error('Impossible de créer le client SMS');
  }
}

/**
 * Enregistre un log SMS dans la base de données
 * @param {Object} logData - Données du log
 * @returns {Promise<Object>} - Instance de SmsLog créée
 */
async function createSmsLog(logData) {
  try {
    const { SmsLog } = require('../models');
    return await SmsLog.create(logData);
  } catch (error) {
    console.error('Erreur lors de la création du log SMS:', error);
    return null;
  }
}

/**
 * Teste une configuration SMS
 * @param {Object} configuration - Instance de ConfigurationSMS
 * @returns {Promise<Object>} - {success: boolean, message: string, credits: number}
 */
async function testConfiguration(configuration) {
  try {
    const client = createClient(configuration);
    const baseURL = getApiUrl(configuration);

    let response;
    let credits = 0;

    // Endpoint de test selon le provider
    switch (configuration.provider) {
      case 'smsfactor':
        // SMSFactor: utiliser /credits pour vérifier le token et récupérer les crédits
        response = await client.get('/credits');
        if (response.data?.status === 1) {
          credits = parseInt(response.data?.credits) || 0;
        }
        break;
      case 'brevo':
        response = await client.get('/account');
        credits = response.data?.plan?.[0]?.credits || 0;
        break;
      case 'twilio':
        response = await client.get('/Accounts.json');
        break;
      default:
        // Pour les autres, essayer /account ou /status
        try {
          response = await client.get('/account');
        } catch {
          response = await client.get('/status');
        }
    }

    return {
      success: true,
      message: `Connexion à l'API ${configuration.provider} établie avec succès`,
      credits: credits,
      apiUrl: baseURL
    };
  } catch (error) {
    console.error('Erreur lors du test de connexion SMS:', error);

    let message = `Erreur de connexion à l'API ${configuration.provider}`;
    if (error.response) {
      message = error.response.data?.message || error.response.data?.error || `Erreur ${error.response.status}`;
    } else if (error.request) {
      message = 'Pas de réponse de l\'API';
    } else {
      message = error.message;
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
 * @returns {Promise<Object>} - {credits: number, postpaid: boolean, unlimited: boolean}
 */
async function getCredits(configuration) {
  try {
    const client = createClient(configuration);

    switch (configuration.provider) {
      case 'smsfactor':
        const response = await client.get('/credits');
        if (response.data?.status === 1) {
          return {
            credits: parseInt(response.data?.credits) || 0,
            postpaid: response.data?.postpaid === '1',
            postpaid_limit: response.data?.postpaid_limit,
            unlimited: response.data?.unlimited === true
          };
        }
        return { credits: 0 };
      case 'brevo':
        const brevoResponse = await client.get('/account');
        return {
          credits: brevoResponse.data?.plan?.[0]?.credits || 0
        };
      default:
        return { credits: 0 };
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des crédits:', error);
    throw new Error('Impossible de récupérer les crédits');
  }
}

/**
 * Formate le numéro de téléphone pour SMSFactor (sans le +)
 * @param {string} phone - Numéro au format international (+33...)
 * @returns {string} - Numéro sans le + (33...)
 */
function formatPhoneForSmsFactor(phone) {
  return phone.replace(/^\+/, '');
}

/**
 * Envoie un SMS via SMSFactor (GET avec query params)
 * @param {Object} client - Client axios
 * @param {Object} configuration - Configuration SMS
 * @param {Object} options - Options d'envoi
 * @returns {Promise<Object>} - Réponse de l'API
 */
async function sendViaSMSFactor(client, configuration, options) {
  const params = {
    text: options.text,
    to: formatPhoneForSmsFactor(options.to)
  };

  // Ajouter le sender si défini
  if (configuration.sender_name) {
    params.sender = configuration.sender_name;
  }

  // Mode simulation si sandbox
  const endpoint = configuration.sandbox ? '/send/simulate' : '/send';

  // SMSFactor utilise GET avec query params
  const response = await client.get(endpoint, { params });
  return response;
}

/**
 * Envoie un SMS via Brevo (POST avec JSON)
 * @param {Object} client - Client axios
 * @param {Object} configuration - Configuration SMS
 * @param {Object} options - Options d'envoi
 * @returns {Promise<Object>} - Réponse de l'API
 */
async function sendViaBrevo(client, configuration, options) {
  const data = {
    sender: configuration.sender_name || 'Ludotheque',
    recipient: options.to,
    content: options.text
  };
  return await client.post('/transactionalSMS/sms', data);
}

/**
 * Envoie un SMS via Twilio (POST avec form data)
 * @param {Object} client - Client axios
 * @param {Object} configuration - Configuration SMS
 * @param {Object} options - Options d'envoi
 * @returns {Promise<Object>} - Réponse de l'API
 */
async function sendViaTwilio(client, configuration, options) {
  const data = new URLSearchParams({
    To: options.to,
    From: configuration.sender_name,
    Body: options.text
  });
  return await client.post('/Messages.json', data);
}

/**
 * Envoie un SMS via un provider générique (POST avec JSON)
 * @param {Object} client - Client axios
 * @param {Object} configuration - Configuration SMS
 * @param {Object} options - Options d'envoi
 * @returns {Promise<Object>} - Réponse de l'API
 */
async function sendViaGeneric(client, configuration, options) {
  const data = {
    to: options.to,
    text: options.text,
    sender: configuration.sender_name || undefined
  };
  return await client.post('/send', data);
}

/**
 * Calcule le nombre de segments SMS
 * @param {string} text - Texte du SMS
 * @returns {number} - Nombre de segments
 */
function calculateSegments(text) {
  if (!text) return 0;
  const length = text.length;
  if (length <= 160) return 1;
  return Math.ceil(length / 153);
}

/**
 * Envoie un SMS
 * @param {number} configurationId - ID de la configuration SMS
 * @param {Object} options - Options d'envoi
 * @param {string} options.to - Numéro du destinataire (format international +33...)
 * @param {string} options.text - Texte du SMS
 * @param {number} [options.adherent_id] - ID de l'adhérent (optionnel)
 * @param {string} [options.template_code] - Code du template utilisé (optionnel)
 * @returns {Promise<Object>} - {success: boolean, ticket: string, error: string, smsLogId: number}
 */
async function sendSMS(configurationId, options) {
  let smsLog = null;

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

    // Créer le log SMS en statut "en_attente"
    smsLog = await createSmsLog({
      template_code: options.template_code || null,
      destinataire: options.to,
      destinataire_nom: options.destinataire_nom || null,
      message: options.text,
      nb_segments: calculateSegments(options.text),
      statut: 'en_attente',
      provider: configuration.provider,
      adherent_id: options.adherent_id || null,
      emprunt_id: options.emprunt_id || null,
      cotisation_id: options.cotisation_id || null,
      metadata: {
        configuration_id: configurationId,
        configuration_libelle: configuration.libelle,
        api_url: getApiUrl(configuration)
      }
    });

    // Créer le client
    const client = createClient(configuration);

    // Log pour debug
    console.log(`[SMS] Envoi via ${configuration.provider} à ${options.to}`);
    console.log(`[SMS] URL: ${getApiUrl(configuration)}`);

    // Envoyer le SMS selon le provider
    let response;
    switch (configuration.provider) {
      case 'smsfactor':
        response = await sendViaSMSFactor(client, configuration, options);
        break;
      case 'brevo':
        response = await sendViaBrevo(client, configuration, options);
        break;
      case 'twilio':
        response = await sendViaTwilio(client, configuration, options);
        break;
      default:
        response = await sendViaGeneric(client, configuration, options);
    }

    console.log(`[SMS] Réponse:`, JSON.stringify(response.data));

    // Vérifier le succès pour SMSFactor
    if (configuration.provider === 'smsfactor') {
      if (response.data?.status !== 1) {
        throw new Error(response.data?.message || 'Erreur SMSFactor inconnue');
      }
    }

    // Extraire le ticket/message_id selon le provider
    let messageId = null;
    let cost = null;
    let creditsAfter = null;

    switch (configuration.provider) {
      case 'smsfactor':
        messageId = response.data?.ticket || `sms_${Date.now()}`;
        cost = response.data?.cost;
        creditsAfter = response.data?.credits;
        break;
      case 'brevo':
        messageId = response.data?.messageId;
        break;
      case 'twilio':
        messageId = response.data?.sid;
        break;
      default:
        messageId = response.data?.ticket || response.data?.message_id || response.data?.id;
    }

    // Mettre à jour le log SMS avec le succès
    if (smsLog) {
      await smsLog.update({
        statut: 'envoye',
        message_id: messageId,
        date_envoi: new Date(),
        cout: cost,
        metadata: {
          ...smsLog.metadata,
          response: response.data,
          credits_after: creditsAfter
        }
      });
    }

    // Incrémenter le compteur
    await configuration.incrementerCompteur();

    // Actualiser les crédits après envoi réussi
    try {
      await configuration.actualiserCredits();
    } catch (creditsError) {
      console.warn('[SMS] Impossible d\'actualiser les crédits:', creditsError.message);
    }

    console.log(`[SMS] Envoyé avec succès. Ticket: ${messageId}`);

    return {
      success: true,
      ticket: messageId,
      smsLogId: smsLog?.id,
      credits: configuration.credits_restants
    };

  } catch (error) {
    console.error('[SMS] Erreur lors de l\'envoi:', error);

    let errorMessage = error.message;
    let errorCode = null;

    if (error.response?.data) {
      errorMessage = error.response.data?.message || error.response.data?.error || JSON.stringify(error.response.data);
      errorCode = error.response.status?.toString();
    }

    // Mettre à jour le log SMS avec l'erreur
    if (smsLog) {
      await smsLog.update({
        statut: 'erreur',
        erreur_code: errorCode,
        erreur_message: errorMessage
      });
    }

    return {
      success: false,
      error: errorMessage,
      smsLogId: smsLog?.id
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

    const text = template.compileSMS(data);

    return await sendSMS(configurationId, {
      to: numeroDestinataire,
      text: text,
      template_code: templateCode,
      adherent_id: data.adherent_id,
      destinataire_nom: data.destinataire_nom
    });
  } catch (error) {
    console.error('[SMS] Erreur lors de l\'envoi depuis template:', error);
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
  getApiUrl,
  testConfiguration,
  getCredits,
  sendSMS,
  sendSMSFromTemplate,
  calculateSegments,
  DEFAULT_API_URLS
};
