/**
 * API Client - Gestion des appels API avec support offline
 */

let apiConfig = null;

/**
 * Initialise le client API avec la configuration
 */
async function initAPI() {
    const apiKey = await Storage.getConfig('apiKey');
    const apiUrl = await Storage.getConfig('apiUrl');
    const questionnaireId = await Storage.getConfig('questionnaireId');

    if (apiKey && apiUrl) {
        apiConfig = { apiKey, apiUrl, questionnaireId };
        console.log('[API] Configuration chargee');
        return true;
    }

    console.log('[API] Configuration manquante');
    return false;
}

/**
 * Verifie si l'API est configuree
 */
function isConfigured() {
    return apiConfig !== null;
}

/**
 * Effectue une requete API
 */
async function apiRequest(endpoint, options = {}) {
    if (!apiConfig) {
        throw new Error('API non configuree');
    }

    const url = `${apiConfig.apiUrl}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': apiConfig.apiKey,
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erreur serveur' }));
        throw new Error(error.message || `Erreur ${response.status}`);
    }

    return response.json();
}

/**
 * Verifie la connexion au serveur
 */
async function checkConnection() {
    if (!apiConfig) return false;

    try {
        const response = await fetch(`${apiConfig.apiUrl}/api/health`, {
            method: 'GET',
            timeout: 5000
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Recupere la configuration de la tablette
 */
async function getTabletConfig() {
    return apiRequest('/api/external/frequentation/config');
}

/**
 * Recherche des communes via l'API
 */
async function searchCommunes(query) {
    return apiRequest(`/api/external/frequentation/communes/search?q=${encodeURIComponent(query)}`);
}

/**
 * Recupere toutes les communes (pour cache offline)
 */
async function getAllCommunes() {
    return apiRequest('/api/external/frequentation/communes');
}

/**
 * Envoie un enregistrement
 */
async function sendRecord(record) {
    return apiRequest('/api/external/frequentation/enregistrements', {
        method: 'POST',
        body: JSON.stringify(record)
    });
}

/**
 * Synchronise les enregistrements en attente
 */
async function syncRecords(records) {
    return apiRequest('/api/external/frequentation/sync', {
        method: 'POST',
        body: JSON.stringify({ records })
    });
}

/**
 * Configure l'API avec les parametres
 */
async function configure(config) {
    await Storage.setConfig('apiKey', config.apiKey);
    await Storage.setConfig('apiUrl', config.apiUrl);
    await Storage.setConfig('questionnaireId', config.questionnaireId);

    apiConfig = {
        apiKey: config.apiKey,
        apiUrl: config.apiUrl,
        questionnaireId: config.questionnaireId
    };

    console.log('[API] Configuration sauvegardee');
}

/**
 * Efface la configuration
 */
async function clearConfig() {
    await Storage.deleteConfig('apiKey');
    await Storage.deleteConfig('apiUrl');
    await Storage.deleteConfig('questionnaireId');
    apiConfig = null;
    console.log('[API] Configuration effacee');
}

/**
 * Recupere l'ID du questionnaire configure
 */
function getQuestionnaireId() {
    return apiConfig?.questionnaireId || null;
}

// Exporter les fonctions
window.API = {
    initAPI,
    isConfigured,
    apiRequest,
    checkConnection,
    getTabletConfig,
    searchCommunes,
    getAllCommunes,
    sendRecord,
    syncRecords,
    configure,
    clearConfig,
    getQuestionnaireId
};
