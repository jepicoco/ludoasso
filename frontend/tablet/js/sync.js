/**
 * Sync - Gestion de la synchronisation des enregistrements
 */

let syncInProgress = false;
let syncInterval = null;
const SYNC_INTERVAL = 30000; // 30 secondes

/**
 * Initialise le systeme de synchronisation
 */
function initSync() {
    // Ecouter les messages du Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'TRIGGER_SYNC') {
                console.log('[Sync] Declenchement par SW');
                doSync();
            }
        });
    }

    // Ecouter les changements de connexion
    window.addEventListener('online', () => {
        console.log('[Sync] Connexion retablie');
        updateConnectionStatus(true);
        doSync();
    });

    window.addEventListener('offline', () => {
        console.log('[Sync] Connexion perdue');
        updateConnectionStatus(false);
    });

    // Demarrer la synchronisation periodique
    startPeriodicSync();

    // Synchronisation initiale
    setTimeout(doSync, 2000);
}

/**
 * Demarre la synchronisation periodique
 */
function startPeriodicSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
    }

    syncInterval = setInterval(() => {
        if (navigator.onLine) {
            doSync();
        }
    }, SYNC_INTERVAL);
}

/**
 * Arrete la synchronisation periodique
 */
function stopPeriodicSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

/**
 * Effectue la synchronisation
 */
async function doSync() {
    if (syncInProgress) {
        console.log('[Sync] Synchronisation deja en cours');
        return;
    }

    if (!navigator.onLine) {
        console.log('[Sync] Hors ligne, synchronisation reportee');
        return;
    }

    if (!API.isConfigured()) {
        console.log('[Sync] API non configuree');
        return;
    }

    syncInProgress = true;
    updateSyncStatus('syncing');

    try {
        // Recuperer les enregistrements en attente
        const pendingRecords = await Storage.getPendingRecords();

        if (pendingRecords.length === 0) {
            console.log('[Sync] Aucun enregistrement en attente');
            updateSyncStatus('online');
            return;
        }

        console.log(`[Sync] ${pendingRecords.length} enregistrements a synchroniser`);

        // Envoyer en batch
        const result = await API.syncRecords(pendingRecords);

        if (result.success) {
            // Supprimer les enregistrements synchronises
            const syncedIds = result.synced || pendingRecords.map(r => r.local_id);
            await Storage.removePendingRecords(syncedIds);

            // Ajouter a l'historique
            for (const record of pendingRecords) {
                if (syncedIds.includes(record.local_id)) {
                    record.sync_status = 'synced';
                    await Storage.addToHistory(record);
                }
            }

            console.log(`[Sync] ${syncedIds.length} enregistrements synchronises`);

            // Mettre a jour l'UI
            updatePendingBadge();
        }

        updateSyncStatus('online');

    } catch (error) {
        console.error('[Sync] Erreur:', error);
        updateSyncStatus('online'); // Rester "online" meme si erreur

        // Si erreur reseau, marquer offline
        if (!navigator.onLine || error.message.includes('network') || error.message.includes('fetch')) {
            updateSyncStatus('offline');
        }
    } finally {
        syncInProgress = false;
    }
}

/**
 * Force une synchronisation immediate
 */
async function forceSyncNow() {
    await doSync();
    return await Storage.getPendingCount();
}

/**
 * Met a jour le statut de connexion dans l'UI
 */
function updateConnectionStatus(isOnline) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    if (statusDot) {
        statusDot.classList.toggle('offline', !isOnline);
    }

    if (statusText) {
        statusText.textContent = isOnline ? 'En ligne' : 'Hors ligne';
    }
}

/**
 * Met a jour le statut de synchronisation dans l'UI
 */
function updateSyncStatus(status) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    if (statusDot) {
        statusDot.classList.remove('offline', 'syncing');
        if (status === 'offline') {
            statusDot.classList.add('offline');
        } else if (status === 'syncing') {
            statusDot.classList.add('syncing');
        }
    }

    if (statusText) {
        switch (status) {
            case 'offline':
                statusText.textContent = 'Hors ligne';
                break;
            case 'syncing':
                statusText.textContent = 'Sync...';
                break;
            default:
                statusText.textContent = 'En ligne';
        }
    }
}

/**
 * Met a jour le badge des enregistrements en attente
 */
async function updatePendingBadge() {
    const count = await Storage.getPendingCount();
    const badge = document.querySelector('.pending-badge');

    if (badge) {
        badge.classList.toggle('show', count > 0);
        badge.textContent = `${count} en attente`;
    }
}

// Exporter les fonctions
window.Sync = {
    initSync,
    doSync,
    forceSyncNow,
    startPeriodicSync,
    stopPeriodicSync,
    updateConnectionStatus,
    updateSyncStatus,
    updatePendingBadge
};
