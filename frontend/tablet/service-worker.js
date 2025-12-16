/**
 * Service Worker - PWA Frequentation
 * Gere le cache et le fonctionnement offline
 */

const CACHE_NAME = 'frequentation-v1';
const STATIC_ASSETS = [
    '/tablet/',
    '/tablet/index.html',
    '/tablet/setup.html',
    '/tablet/css/tablet.css',
    '/tablet/js/app.js',
    '/tablet/js/api.js',
    '/tablet/js/storage.js',
    '/tablet/js/sync.js',
    '/tablet/manifest.json'
];

// Installation - mise en cache des assets statiques
self.addEventListener('install', (event) => {
    console.log('[SW] Installation');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Mise en cache des assets statiques');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation - nettoyage des anciens caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activation');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Suppression ancien cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch - strategie cache-first pour les assets, network-first pour l'API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Requetes API - network only (gerees par IndexedDB pour l'offline)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Retourner une erreur JSON pour les requetes API offline
                    return new Response(
                        JSON.stringify({ error: 'offline', message: 'Mode hors ligne' }),
                        {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }

    // Assets statiques - cache first
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request)
                    .then((response) => {
                        // Ne pas cacher les reponses non-OK
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        // Cloner et mettre en cache
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    });
            })
    );
});

// Message handler - pour la synchronisation manuelle
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_NOW') {
        console.log('[SW] Demande de synchronisation');
        // Notifier tous les clients de synchroniser
        self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
                client.postMessage({ type: 'TRIGGER_SYNC' });
            });
        });
    }
});

// Background sync (si supporte)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-records') {
        console.log('[SW] Background sync declenche');
        event.waitUntil(
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'TRIGGER_SYNC' });
                });
            })
        );
    }
});

// Gestion des notifications push (pour futures extensions)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'Nouvelle notification',
            icon: '/tablet/icons/icon-192.png',
            badge: '/tablet/icons/icon-72.png'
        };
        event.waitUntil(
            self.registration.showNotification(data.title || 'Frequentation', options)
        );
    }
});
