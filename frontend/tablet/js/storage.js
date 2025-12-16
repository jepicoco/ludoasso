/**
 * Storage - IndexedDB wrapper pour stockage local
 * Gere la configuration, les communes et les enregistrements en attente
 */

const DB_NAME = 'frequentation-db';
const DB_VERSION = 1;

let db = null;

/**
 * Initialise la base IndexedDB
 */
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('[Storage] Erreur ouverture DB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('[Storage] DB initialisee');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Store config
            if (!database.objectStoreNames.contains('config')) {
                database.createObjectStore('config', { keyPath: 'key' });
            }

            // Store communes (pour recherche offline)
            if (!database.objectStoreNames.contains('communes')) {
                const communesStore = database.createObjectStore('communes', { keyPath: 'id' });
                communesStore.createIndex('nom', 'nom', { unique: false });
                communesStore.createIndex('code_postal', 'code_postal', { unique: false });
            }

            // Store enregistrements en attente
            if (!database.objectStoreNames.contains('pending')) {
                const pendingStore = database.createObjectStore('pending', { keyPath: 'local_id' });
                pendingStore.createIndex('created_at', 'created_at', { unique: false });
            }

            // Store historique (derniers enregistrements synchronises)
            if (!database.objectStoreNames.contains('history')) {
                const historyStore = database.createObjectStore('history', { keyPath: 'local_id' });
                historyStore.createIndex('horodatage', 'horodatage', { unique: false });
            }

            console.log('[Storage] DB schema cree');
        };
    });
}

/**
 * Recupere une valeur de config
 */
async function getConfig(key) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['config'], 'readonly');
        const store = transaction.objectStore('config');
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result?.value || null);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Sauvegarde une valeur de config
 */
async function setConfig(key, value) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['config'], 'readwrite');
        const store = transaction.objectStore('config');
        const request = store.put({ key, value });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Supprime une valeur de config
 */
async function deleteConfig(key) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['config'], 'readwrite');
        const store = transaction.objectStore('config');
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Sauvegarde la liste des communes
 */
async function saveCommunes(communes) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['communes'], 'readwrite');
        const store = transaction.objectStore('communes');

        // Vider le store
        store.clear();

        // Ajouter les nouvelles communes
        communes.forEach(commune => {
            store.add(commune);
        });

        transaction.oncomplete = () => {
            console.log(`[Storage] ${communes.length} communes sauvegardees`);
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Recherche des communes localement
 */
async function searchCommunesLocal(query) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['communes'], 'readonly');
        const store = transaction.objectStore('communes');
        const request = store.getAll();

        request.onsuccess = () => {
            const communes = request.result || [];
            const queryLower = query.toLowerCase();

            // Filtrer par nom ou code postal
            const filtered = communes.filter(c =>
                c.nom.toLowerCase().includes(queryLower) ||
                (c.code_postal && c.code_postal.startsWith(query))
            ).slice(0, 20);

            resolve(filtered);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Recupere une commune par ID
 */
async function getCommuneById(id) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['communes'], 'readonly');
        const store = transaction.objectStore('communes');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Ajoute un enregistrement en attente de synchronisation
 */
async function addPendingRecord(record) {
    if (!db) await initDB();

    // Generer un UUID pour l'enregistrement
    record.local_id = record.local_id || generateUUID();
    record.created_at = new Date().toISOString();
    record.sync_status = 'local';

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pending'], 'readwrite');
        const store = transaction.objectStore('pending');
        const request = store.add(record);

        request.onsuccess = () => {
            console.log('[Storage] Enregistrement ajoute:', record.local_id);
            resolve(record);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Recupere tous les enregistrements en attente
 */
async function getPendingRecords() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pending'], 'readonly');
        const store = transaction.objectStore('pending');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Compte les enregistrements en attente
 */
async function getPendingCount() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pending'], 'readonly');
        const store = transaction.objectStore('pending');
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Supprime un enregistrement en attente (apres sync reussie)
 */
async function removePendingRecord(localId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pending'], 'readwrite');
        const store = transaction.objectStore('pending');
        const request = store.delete(localId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Supprime plusieurs enregistrements en attente
 */
async function removePendingRecords(localIds) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pending'], 'readwrite');
        const store = transaction.objectStore('pending');

        localIds.forEach(id => store.delete(id));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Ajoute un enregistrement a l'historique
 */
async function addToHistory(record) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['history'], 'readwrite');
        const store = transaction.objectStore('history');
        const request = store.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Recupere le dernier enregistrement de l'historique
 */
async function getLastHistoryRecord() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['history'], 'readonly');
        const store = transaction.objectStore('history');
        const index = store.index('horodatage');
        const request = index.openCursor(null, 'prev');

        request.onsuccess = () => {
            const cursor = request.result;
            resolve(cursor ? cursor.value : null);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Nettoie l'historique ancien (garde les 100 derniers)
 */
async function cleanHistory() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['history'], 'readwrite');
        const store = transaction.objectStore('history');
        const index = store.index('horodatage');
        const request = index.openCursor(null, 'prev');

        let count = 0;
        const toDelete = [];

        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                count++;
                if (count > 100) {
                    toDelete.push(cursor.primaryKey);
                }
                cursor.continue();
            } else {
                // Supprimer les anciens
                toDelete.forEach(key => store.delete(key));
                transaction.oncomplete = () => resolve(toDelete.length);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Vide toutes les donnees (reset)
 */
async function clearAllData() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['config', 'communes', 'pending', 'history'], 'readwrite');

        transaction.objectStore('config').clear();
        transaction.objectStore('communes').clear();
        transaction.objectStore('pending').clear();
        transaction.objectStore('history').clear();

        transaction.oncomplete = () => {
            console.log('[Storage] Toutes les donnees supprimees');
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Genere un UUID v4
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Exporter les fonctions
window.Storage = {
    initDB,
    getConfig,
    setConfig,
    deleteConfig,
    saveCommunes,
    searchCommunesLocal,
    getCommuneById,
    addPendingRecord,
    getPendingRecords,
    getPendingCount,
    removePendingRecord,
    removePendingRecords,
    addToHistory,
    getLastHistoryRecord,
    cleanHistory,
    clearAllData,
    generateUUID
};
